import React, { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function Sidebar({ onOpenUpgrade, onOpenSettings, onCloseMobile }) {
  const { state, api } = useApp()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return state.conversations
    return state.conversations.filter(
      (c) => c.title.toLowerCase().includes(q) || c.messages.some((m) => (m.content || '').toLowerCase().includes(q))
    )
  }, [query, state.conversations])

  const groups = useMemo(() => {
    const now = Date.now()
    const day = 86400000
    const g = { Today: [], 'Past 7 days': [], 'Older': [] }
    for (const c of filtered) {
      const age = now - new Date(c.createdAt).getTime()
      if (age < day) g.Today.push(c)
      else if (age < 7 * day) g['Past 7 days'].push(c)
      else g.Older.push(c)
    }
    return g
  }, [filtered])

  return (
    <aside className="sidebar" aria-label="Conversation navigation">
      <div className="sidebar-head">
        <button className="new-chat" onClick={() => { api.newChat(); onCloseMobile?.() }}>
          <span aria-hidden="true">✚</span> New chat
        </button>
        <input
          className="search"
          placeholder="Search conversations"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search conversations"
        />
      </div>

      <nav className="chat-list">
        {state.conversations.length === 0 && (
          <div className="empty-mini">No conversations yet.<br />Start one to see history here.</div>
        )}
        {state.conversations.length > 0 && filtered.length === 0 && (
          <div className="empty-mini">Nothing matches “{query}”.</div>
        )}
        {Object.entries(groups).map(([label, items]) =>
          items.length ? (
            <div key={label} className="chat-group">
              <p className="group-label">{label}</p>
              {items.map((c) => (
                <div
                  key={c.id}
                  className={'chat-item' + (c.id === state.activeConversationId ? ' active' : '')}
                  role="button"
                  tabIndex={0}
                  onClick={() => { api.selectChat(c.id); onCloseMobile?.() }}
                  onKeyDown={(e) => e.key === 'Enter' && (api.selectChat(c.id), onCloseMobile?.())}
                >
                  <span className="chat-title">{c.title}</span>
                  <button
                    className="chat-del"
                    aria-label={`Delete ${c.title}`}
                    onClick={(e) => { e.stopPropagation(); api.deleteChat(c.id) }}
                  >✕</button>
                </div>
              ))}
            </div>
          ) : null
        )}
      </nav>

      <div className="sidebar-foot">
        <button className="foot-btn" onClick={() => { onOpenUpgrade(); onCloseMobile?.() }}>
          <span aria-hidden="true">✦</span> Upgrade plan
        </button>
        <button className="foot-btn" onClick={() => { onOpenSettings(); onCloseMobile?.() }}>
          <span aria-hidden="true">⚙</span> Settings
        </button>
      </div>
    </aside>
  )
}
