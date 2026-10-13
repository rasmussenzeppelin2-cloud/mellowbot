import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'

export default function AuthScreen() {
  const { api } = useApp()
  const [mode, setMode] = useState('signin')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  function submit(e) {
    e.preventDefault()
    if (!email.includes('@')) return setErr('Enter a valid email address.')
    if (password.length < 6) return setErr('Password must be at least 6 characters.')
    const displayName = mode === 'signup' ? name.trim() || email.split('@')[0] : name.trim() || email.split('@')[0]
    api.signIn({ name: displayName, email, joinedAt: new Date().toISOString() })
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">◍</span>
          <h1>Mellow</h1>
        </div>
        <p className="auth-sub">Your calm AI workspace — chat, images, code, feedback and agents in one place.</p>

        <div className="auth-tabs" role="tablist">
          <button role="tab" aria-selected={mode === 'signin'} className={mode === 'signin' ? 'on' : ''} onClick={() => setMode('signin')}>Sign in</button>
          <button role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'on' : ''} onClick={() => setMode('signup')}>Create account</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'signup' && (
            <label>
              Name
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ada Lovelace" autoComplete="name" />
            </label>
          )}
          <label>
            Email
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
          <label>
            Password
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
          </label>
          {err && <p className="form-error" role="alert">{err}</p>}
          <button type="submit" className="btn primary lg">
            {mode === 'signin' ? 'Sign in to Mellow' : 'Create free account'}
          </button>
          <p className="auth-note">Demo authentication — data is stored locally on this device. You start on the Free plan with 120 credits/month.</p>
        </form>
      </div>
    </div>
  )
}
