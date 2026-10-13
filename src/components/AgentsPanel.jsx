import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { AGENTS, agentUnlocked, getPlan, PLANS } from '../data/plans.js'

const PLAN_RANK = ['free', 'plus', 'advanced', 'pro', 'max']

export default function AgentsPanel({ onOpenUpgrade }) {
  const { state, plan, creditsRemaining, api } = useApp()
  const [selectedId, setSelectedId] = useState('assistant-beginner')
  const [task, setTask] = useState('')
  const [runState, setRunState] = useState('idle') // idle | planning | awaiting_approval | running | done | denied
  const [steps, setSteps] = useState([])
  const [progress, setProgress] = useState(0)
  const timers = useRef([])

  const agent = AGENTS.find((a) => a.id === selectedId)
  const unlocked = agentUnlocked(plan.id, selectedId)
  const requiredPlan = getPlan(agent?.minPlan || 'free')
  const device = state.devices[0] || null
  const installed = !!state.installs[selectedId]?.installed
  const needsComputer = agent?.computer
  const permsGranted = device ? Object.values(state.permissions[device.id] || {}).filter(Boolean).length : 0
  const allPerms = needsComputer && device && installed && permsGranted >= (agent?.permissions.length || 0)

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  function selectAgent(id) {
    setSelectedId(id)
    resetRun()
  }

  function resetRun() {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setRunState('idle')
    setSteps([])
    setProgress(0)
  }

  function buildSteps() {
    if (!agent) return []
    if (needsComputer) {
      return [
        `Connect to desktop companion (${device?.name || 'no device'})`,
        'Scan the target folder for relevant files',
        'Draft output document locally',
        'Request write access confirmation',
        'Save result and report summary',
      ]
    }
    return [
      'Parse task and define subtasks',
      'Gather context from workspace history',
      'Generate draft result',
      'Self-review against constraints',
      'Deliver final answer',
    ]
  }

  function startPlanning() {
    if (!task.trim()) return
    if (!unlocked) { onOpenUpgrade(); return }
    if (creditsRemaining < 20) return setRunState('denied')
    setSteps(buildSteps())
    setRunState(needsComputer ? 'awaiting_approval' : 'running')
    if (!needsComputer) beginRun()
  }

  function approveRun() {
    api.audit({ agent: agent.name, action: 'run-approved', detail: task.slice(0, 80), status: 'approved' })
    setRunState('running')
    beginRun()
  }

  function denyRun() {
    api.audit({ agent: agent.name, action: 'run-denied', detail: task.slice(0, 80), status: 'denied' })
    setRunState('idle')
  }

  function beginRun() {
    api.audit({ agent: agent.name, action: 'run-started', detail: task.slice(0, 80), status: 'running' })
    steps.forEach((_, i) => {
      const t = setTimeout(() => {
        setProgress(Math.round(((i + 1) / steps.length) * 100))
        if (i === steps.length - 1) {
          api.spend(20)
          api.audit({ agent: agent.name, action: 'run-completed', detail: task.slice(0, 80), status: 'completed' })
          setRunState('done')
        }
      }, 900 * (i + 1))
      timers.current.push(t)
    })
  }

  function pairDevice() {
    const os = navigator.platform || 'Desktop OS'
    api.pairDevice(`${os} · ${new Date().toLocaleDateString()}`, os)
    api.audit({ agent: 'Mellow Desktop Companion', action: 'device-paired', detail: 'Companion installed & paired', status: 'ok' })
  }

  function togglePerm(scope) {
    if (!device) return
    const cur = state.permissions[device.id]?.[scope] || false
    api.setPermission(device.id, scope, !cur)
    api.audit({ agent: agent.name, action: cur ? 'permission-revoked' : 'permission-granted', detail: scope, status: cur ? 'revoked' : 'granted' })
  }

  return (
    <div className="agents-panel">
      <header className="panel-head">
        <h2>Agents</h2>
        <p className="muted">Guided assistants, up to full computer control — always with your approval.</p>
      </header>

      <div className="agent-grid">
        <div className="agent-list" role="listbox" aria-label="Available agents">
          {AGENTS.map((a) => {
            const u = agentUnlocked(plan.id, a.id)
            return (
              <button
                key={a.id}
                role="option"
                aria-selected={selectedId === a.id}
                className={'agent-item' + (selectedId === a.id ? ' active' : '') + (u ? '' : ' locked')}
                onClick={() => selectAgent(a.id)}
              >
                <span className="agent-name">{a.computer ? '🖥️' : '🤖'} {a.name}</span>
                <span className="agent-badges">
                  {a.computer && <span className="badge warn">Requires desktop companion</span>}
                  {!u && <span className="badge lock">Needs {getPlan(a.minPlan).name}</span>}
                </span>
              </button>
            )
          })}
        </div>

        <div className="agent-detail">
          {!unlocked ? (
            <div className="gate-card">
              <h3>{agent.name} is on {requiredPlan.name}</h3>
              <p>{agent.desc}</p>
              <p className="muted">Your current plan ({plan.name}) doesn’t include this agent. Upgrade from {requiredPlan.monthlyPrice}$ / month to unlock it.</p>
              <button className="btn primary" onClick={onOpenUpgrade}>See upgrade options</button>
            </div>
          ) : (
            <>
              <div className="agent-info">
                <h3>{agent.name}</h3>
                <p>{agent.desc}</p>
                <ul className="perm-preview">{agent.permissions.map((p) => <li key={p}>Scope: {p}</li>)}</ul>
              </div>

              {needsComputer && (
                <div className="companion-card">
                  <h4>Desktop companion setup</h4>
                  <p className="muted small">Computer-control agents cannot run in the browser alone. Install the Mellow Desktop Companion, pair it, then grant scopes explicitly.</p>
                  <ol className="setup-steps">
                    <li className={device ? 'done' : ''}>
                      {device ? `Paired device: ${device.name}` : 'No companion paired'}
                      {!device && <button className="btn ghost sm" onClick={pairDevice}>Install & pair companion</button>}
                      {device && <button className="btn ghost sm danger" onClick={() => api.unpairDevice(device.id)}>Unpair</button>}
                    </li>
                    <li className={installed ? 'done' : ''}>
                      Agent executable installed on device
                      {!installed && device && <button className="btn ghost sm" onClick={() => { api.installAgent(selectedId); api.audit({ agent: agent.name, action: 'companion-installed', detail: 'Agent executable installed', status: 'ok' }) }}>Install agent</button>}
                      {!device && <span className="muted small"> (pair device first)</span>}
                    </li>
                    <li className={allPerms ? 'done' : ''}>
                      Permission scopes
                      {device && installed && (
                        <div className="perm-toggles">
                          {agent.permissions.map((p) => (
                            <label key={p} className="toggle">
                              <input type="checkbox" checked={!!state.permissions[device.id]?.[p]} onChange={() => togglePerm(p)} />
                              {p}
                            </label>
                          ))}
                        </div>
                      )}
                    </li>
                  </ol>
                </div>
              )}

              <div className="task-box">
                <label htmlFor="agent-task">Task for {agent.name}</label>
                <textarea
                  id="agent-task"
                  rows={3}
                  placeholder={agent.computer ? 'e.g. Organize my Downloads folder by file type into dated subfolders' : 'e.g. Summarize my last five chats into an action list'}
                  value={task}
                  onChange={(e) => setTask(e.target.value)}
                  disabled={runState === 'running' || runState === 'awaiting_approval'}
                />
                {(runState === 'idle' || runState === 'done') && (
                  <button className="btn primary" onClick={startPlanning} disabled={!task.trim()}>
                    {agent.computer ? 'Prepare run (requires approval)' : 'Start run'} · 20 credits
                  </button>
                )}
                {runState === 'denied' && <p className="form-error">Not enough credits for an agent run (20 needed).</p>}
              </div>

              {runState === 'awaiting_approval' && (
                <div className="approval-card" role="alertdialog" aria-label="Approve agent run">
                  <h4>⚠ Review & approve this computer run</h4>
                  <p><strong>Task:</strong> “{task}”</p>
                  <p><strong>Requested scopes:</strong> {agent.permissions.join(', ')}</p>
                  <p className="muted small">The agent can only act within approved scopes on {device?.name}. Every action is recorded in the audit log below.</p>
                  {!allPerms && <p className="form-error">Grant all permission scopes above before approving.</p>}
                  <div className="row">
                    <button className="btn primary" onClick={approveRun} disabled={!allPerms}>Approve run</button>
                    <button className="btn ghost" onClick={denyRun}>Cancel</button>
                  </div>
                </div>
              )}

              {(runState === 'running' || runState === 'done') && (
                <div className="run-progress">
                  <div className="progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
                    <div className="progress-fill" style={{ width: progress + '%' }} />
                  </div>
                  <ol className="step-list">
                    {steps.map((s, i) => (
                      <li key={s} className={progress >= ((i + 1) / steps.length) * 100 ? 'done' : progress > (i / steps.length) * 100 ? 'current' : ''}>
                        {s}
                      </li>
                    ))}
                  </ol>
                  {runState === 'done' && (
                    <p className="done-note">✓ Run completed. Result delivered to your workspace; −20 credits applied.</p>
                  )}
                </div>
              )}

              <section className="audit">
                <h4>Audit history</h4>
                {state.audit.length === 0 ? (
                  <p className="muted small">No agent activity yet.</p>
                ) : (
                  <table>
                    <thead><tr><th>Time</th><th>Agent</th><th>Action</th><th>Detail</th><th>Status</th></tr></thead>
                    <tbody>
                      {state.audit.slice(0, 12).map((a, i) => (
                        <tr key={i}>
                          <td>{new Date(a.ts).toLocaleTimeString()}</td>
                          <td>{a.agent}</td>
                          <td>{a.action}</td>
                          <td className="detail-cell">{a.detail}</td>
                          <td><span className={'status s-' + a.status}>{a.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
