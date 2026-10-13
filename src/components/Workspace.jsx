import React, { useEffect, useRef, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { MODELS, canUseModel, canUseTool, COSTS } from '../data/plans.js'
import { getModel } from '../lib/mockAI.js'
import MarkdownLite from './MarkdownLite.jsx'

const TOOLS = [
  { id: 'chat', label: 'Chat', icon: '💬' },
  { id: 'image', label: 'Image', icon: '🖼' },
  { id: 'code', label: 'Code', icon: '⌨' },
  { id: 'feedback', label: 'Feedback', icon: '🔍' },
]

export default function Workspace({ onOpenUpgrade, onMenu }) {
  const { state, plan, creditsRemaining, api } = useApp()
  const conv = state.conversations.find((c) => c.id === state.activeConversationId) || null
  const [tool, setTool] = useState('chat')
  const [modelId, setModelId] = useState(conv?.model || 'mellow-lite')
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const endRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (conv) setModelId(conv.model)
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [conv?.id, conv?.messages.length])

  useEffect(() => { if (notice) { const t = setTimeout(() => setNotice(''), 4000); return () => clearTimeout(t) } }, [notice])

  const activeModel = getModel(modelId)
  const cost = tool === 'chat' ? activeModel.costPerMsg : COSTS[tool]

  function pickTool(t) {
    if (!canUseTool(plan.id, t)) {
      setNotice(`${labelFor(t)} requires a paid plan — see Upgrade options.`)
      onOpenUpgrade()
      return
    }
    setTool(t)
    inputRef.current?.focus()
  }

  function labelFor(t) { return TOOLS.find((x) => x.id === t)?.label || t }

  function chooseModel(id) {
    if (!canUseModel(plan.id, id)) {
      setNotice(`${getModel(id).name} is not included in your ${plan.name} plan.`)
      onOpenUpgrade()
      return
    }
    setModelId(id)
    if (conv) api.setModel(conv.id, id)
  }

  async function submit() {
    const prompt = text.trim()
    if (!prompt || busy) return
    if (creditsRemaining < cost) {
      setNotice(`Not enough credits for this request (${cost} needed, ${creditsRemaining} left).`)
      onOpenUpgrade()
      return
    }
    setText('')
    setBusy(true)
    let targetConv = conv
    if (!targetConv) {
      api.newChat(modelId)
      // new conversation id unknown synchronously; wait one tick via store lookup below
      await new Promise((r) => setTimeout(r, 0))
      targetConv = true // send() falls back to active conversation after state update
    }
    await api.send({ tool, prompt, modelId })
    setBusy(false)
  }

  function onKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() }
  }

  return (
    <main className="workspace">
      <header className="topbar">
        <button className="icon-btn menu-btn" aria-label="Open navigation" onClick={onMenu}>☰</button>
        <div className="top-title">
          <strong>{conv ? conv.title : 'Mellow Workspace'}</strong>
          <span className="crumbs">{plan.name} · {activeModel.name}</span>
        </div>
        <div className="credits-chip" title="Credits remaining this period">
          <span className="dot" /> {creditsRemaining.toLocaleString()} / {plan.creditsMonthly.toLocaleString()} credits
        </div>
      </header>

      <section className="thread" aria-live="polite">
        {!conv || conv.messages.length === 0 ? (
          <EmptyState tool={tool} onPick={(p) => { setText(p); inputRef.current?.focus() }} />
        ) : (
          <div className="messages">
            {conv.messages.map((m) => (
              <Message key={m.id} message={m} userName={state.user?.name} />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </section>

      <footer className="composer-area">
        {notice && <div className="notice" role="status">{notice}</div>}
        <div className="composer">
          <div className="composer-tools" role="toolbar" aria-label="Tools">
            {TOOLS.map((t) => {
              const locked = !canUseTool(plan.id, t.id)
              return (
                <button
                  key={t.id}
                  className={'tool-pill' + (tool === t.id ? ' on' : '') + (locked ? ' locked' : '')}
                  onClick={() => pickTool(t.id)}
                  aria-pressed={tool === t.id}
                  title={locked ? `${t.label} requires an upgrade` : t.label}
                >
                  <span aria-hidden="true">{t.icon}</span> {t.label}{locked && ' 🔒'}
                </button>
              )
            })}
            <div className="model-picker-wrap">
              <select
                className="model-picker"
                value={modelId}
                onChange={(e) => chooseModel(e.target.value)}
                aria-label="Select model"
              >
                {MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}{canUseModel(plan.id, m.id) ? '' : ' (upgrade)'} · {m.costPerMsg} cr/msg
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="composer-row">
            <textarea
              ref={inputRef}
              rows={1}
              placeholder={
                tool === 'image' ? 'Describe the image you want…' :
                tool === 'code' ? 'Describe the code you need…' :
                tool === 'feedback' ? 'Paste text or a question to review…' :
                'Message Mellow…'
              }
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={onKeyDown}
              aria-label="Message"
            />
            <button className="btn primary send" onClick={submit} disabled={busy || !text.trim()} aria-label="Send">
              {busy ? <span className="spinner" aria-hidden="true" /> : '➤'}
            </button>
          </div>
          <p className="cost-hint">This request uses <strong>{cost} credits</strong> · {activeModel.name} ({activeModel.provider}) · Enter to send, Shift+Enter for newline</p>
        </div>
      </footer>
    </main>
  )
}

function EmptyState({ tool, onPick }) {
  const suggestions = {
    chat: ['Explain quantum tunneling like I’m 12', 'Draft a friendly project status update', 'Plan a 3-day Kyoto itinerary'],
    image: ['A serene mountain lake at sunrise, watercolor', 'Isometric cozy home office, soft palette', 'Abstract gradient poster, calm tones'],
    code: ['React hook for debounced input', 'Python script to rename photos by date', 'SQL query for monthly retention'],
    feedback: ['Review my cover letter paragraph', 'Critique this product landing page copy', 'Give feedback on my workout plan'],
  }
  return (
    <div className="empty-state">
      <span className="brand-mark big" aria-hidden="true">◍</span>
      <h2>{tool === 'chat' ? 'How can I help today?' : `Create with ${tool}`}</h2>
      <p>Mellow keeps chats, images, code and feedback in one workspace. Pick a starting point or type below.</p>
      <div className="suggestions">
        {(suggestions[tool] || suggestions.chat).map((s) => (
          <button key={s} onClick={() => onPick(s)}>{s}</button>
        ))}
      </div>
    </div>
  )
}

function Message({ message, userName }) {
  const isUser = message.role === 'user'
  return (
    <div className={'msg ' + (isUser ? 'user' : 'ai')}>
      <div className="avatar" aria-hidden="true">{isUser ? (userName?.[0] || 'Y') : '◍'}</div>
      <div className="msg-body">
        <div className="msg-meta">
          {isUser ? 'You' : `Mellow${message.meta?.modelId ? ' · ' + getModel(message.meta.modelId).name : ''}`}
          {!isUser && message.meta?.cost != null && <span className="cost-tag">−{message.meta.cost} cr</span>}
          {!isUser && message.tool !== 'chat' && <span className="tool-tag">{message.tool}</span>}
        </div>
        {message.pending ? (
          <div className="gen-state" role="status">
            <span className="pulse-dots" aria-hidden="true"><i /><i /><i /></span>
            {message.tool === 'image' ? 'Generating image…' : message.tool === 'code' ? 'Writing code…' : message.tool === 'feedback' ? 'Analyzing…' : 'Thinking…'}
          </div>
        ) : (
          <>
            {message.content && (isUser ? <p className="user-text">{message.content}</p> : <MarkdownLite text={message.content} />)}
            {message.artifact && <Artifact art={message.artifact} />}
          </>
        )}
      </div>
    </div>
  )
}

function Artifact({ art }) {
  const [copied, setCopied] = useState(false)
  if (art.kind === 'image') {
    return (
      <figure className="artifact image-art">
        <img src={art.dataUrl} alt="Generated image" width={art.width} height={art.height} />
        <figcaption>
          Generated in-workspace · <a href={art.dataUrl} download="mellow-image.svg">Download SVG</a>
        </figcaption>
      </figure>
    )
  }
  if (art.kind === 'code') {
    return (
      <div className="artifact code-art">
        <div className="code-head">
          <span>{art.language}</span>
          <button onClick={() => { navigator.clipboard?.writeText(art.code); setCopied(true); setTimeout(() => setCopied(false), 1500) }}>
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
        <pre><code>{art.code}</code></pre>
      </div>
    )
  }
  if (art.kind === 'feedback') {
    return (
      <div className="artifact feedback-art">
        <div className="fb-score">Score <strong>{art.score}/10</strong></div>
        <p>{art.summary}</p>
        <h4>What works</h4>
        <ul>{art.strengths.map((s) => <li key={s}>{s}</li>)}</ul>
        <h4>Suggested improvements</h4>
        <ul>{art.improvements.map((im) => <li key={im.area}><strong>{im.area}:</strong> {im.note}</li>)}</ul>
      </div>
    )
  }
  return null
}
