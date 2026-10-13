import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { getPlan, PLANS, PLAN_ORDER } from '../data/plans.js'

export default function SettingsPanel({ onClose, onOpenUpgrade }) {
  const { state, plan, creditsRemaining, api } = useApp()
  const [tab, setTab] = useState('account')
  const TABS = [
    ['account', 'Account'],
    ['plan', 'Plan & billing'],
    ['devices', 'Devices & permissions'],
    ['data', 'Data'],
  ]

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Settings" onClick={onClose}>
      <div className="modal settings" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" aria-label="Close" onClick={onClose}>✕</button>
        <h2>Settings</h2>
        <div className="settings-tabs" role="tablist">
          {TABS.map(([id, label]) => (
            <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'on' : ''} onClick={() => setTab(id)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 'account' && (
          <div className="tab-body">
            <div className="field"><label>Name</label><span>{state.user?.name}</span></div>
            <div className="field"><label>Email</label><span>{state.user?.email}</span></div>
            <div className="field"><label>Member since</label><span>{new Date(state.user?.joinedAt).toLocaleDateString()}</span></div>
            <div className="field"><label>Credits this period</label><span>{creditsRemaining.toLocaleString()} of {plan.creditsMonthly.toLocaleString()} remaining ({state.creditsUsed.toLocaleString()} used)</span></div>
            <button className="btn ghost danger" onClick={api.signOut}>Sign out</button>
          </div>
        )}

        {tab === 'plan' && (
          <div className="tab-body">
            <div className="current-plan">
              <strong>{plan.name}</strong> · ${plan.monthlyPrice}/mo base · {state.billingCycle === 'annual' ? 'Annual billing (20% off)' : 'Monthly billing'}
            </div>
            <label className="switch-row">
              Billing cycle
              <select value={state.billingCycle} onChange={(e) => api.setCycle(e.target.value)}>
                <option value="monthly">Monthly</option>
                <option value="annual">Annual (save 20%)</option>
              </select>
            </label>
            <label className="switch-row">
              Plan (managed via pricing)
              <select value={state.plan} onChange={(e) => api.setPlan(e.target.value)}>
                {PLAN_ORDER.map((id) => <option key={id} value={id}>{PLANS[id].name} — ${PLANS[id].monthlyPrice}/mo</option>)}
              </select>
            </label>
            <p className="muted small">Changing plans resets your credit counter to the new allowance. Use the pricing screen for checkout flows.</p>
            <button className="btn primary" onClick={onOpenUpgrade}>Open plans & pricing</button>
          </div>
        )}

        {tab === 'devices' && (
          <div className="tab-body">
            {!plan.computerAgent && (
              <p className="gate-note">Computer-control agents are available on Pro ($50/mo) and Max ($105/mo). Your companion devices stay paired but agents remain locked until upgrade.</p>
            )}
            {state.devices.length === 0 ? (
              <p className="muted">No desktop companion paired yet. Pair one from the Agents tab when a computer-control agent needs it.</p>
            ) : (
              state.devices.map((d) => (
                <div key={d.id} className="device-card">
                  <div><strong>{d.name}</strong><br /><span className="muted small">Paired {new Date(d.pairedAt).toLocaleString()}</span></div>
                  <div className="perm-list">
                    {Object.entries(state.permissions[d.id] || {}).length === 0 && <span className="muted small">No scopes granted.</span>}
                    {Object.entries(state.permissions[d.id] || {}).map(([scope, on]) => (
                      <span key={scope} className={'chip ' + (on ? 'ok' : 'off')}>{on ? '✓' : '✗'} {scope}</span>
                    ))}
                  </div>
                  <button className="btn ghost sm danger" onClick={() => api.unpairDevice(d.id)}>Unpair device (revokes all scopes)</button>
                </div>
              ))
            )}
          </div>
        )}

        {tab === 'data' && (
          <div className="tab-body">
            <p>Conversations, generated images, code results and feedback are stored on this device and tied to their chats. Deleting a conversation removes its results.</p>
            <div className="field"><label>Conversations</label><span>{state.conversations.length}</span></div>
            <div className="field"><label>Audit entries</label><span>{state.audit.length}</span></div>
            <button
              className="btn ghost danger"
              onClick={() => { if (confirm('Clear all Mellow data on this device? Chats and results will be deleted.')) api.resetData() }}
            >
              Clear local data
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
