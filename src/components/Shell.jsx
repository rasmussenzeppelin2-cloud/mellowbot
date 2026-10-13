import React, { useEffect, useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import AuthScreen from './AuthScreen.jsx'
import Sidebar from './Sidebar.jsx'
import Workspace from './Workspace.jsx'
import AgentsPanel from './AgentsPanel.jsx'
import PricingModal from './PricingModal.jsx'
import SettingsPanel from './SettingsPanel.jsx'

export default function Shell() {
  const { state } = useApp()
  const [view, setView] = useState('chat') // chat | agents
  const [pricingOpen, setPricingOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [navOpen, setNavOpen] = useState(false)
  const [installPrompt, setInstallPrompt] = useState(null)

  // PWA: capture installability
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallPrompt(e) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  async function install() {
    if (!installPrompt) return
    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }

  if (!state.user) return <AuthScreen />

  return (
    <div className="shell">
      <div className={'nav-scrim' + (navOpen ? ' show' : '')} onClick={() => setNavOpen(false)} aria-hidden="true" />
      <div className="sidebar-wrap desktop">
        <Sidebar onOpenUpgrade={() => setPricingOpen(true)} onOpenSettings={() => setSettingsOpen(true)} />
      </div>
      {navOpen && (
        <div className="sidebar-wrap mobile">
          <Sidebar onOpenUpgrade={() => { setPricingOpen(true); setNavOpen(false) }} onOpenSettings={() => { setSettingsOpen(true); setNavOpen(false) }} onCloseMobile={() => setNavOpen(false)} />
        </div>
      )}

      <div className="main-col">
        <nav className="view-tabs" aria-label="Primary views">
          <button className={view === 'chat' ? 'on' : ''} onClick={() => setView('chat')}>💬 Chat workspace</button>
          <button className={view === 'agents' ? 'on' : ''} onClick={() => setView('agents')}>🤖 Agents</button>
          <div className="spacer" />
          {installPrompt && (
            <button className="btn ghost sm install-btn" onClick={install}>⊕ Install app</button>
          )}
          <button className="avatar-btn" title={state.user.name} aria-label="Account & settings" onClick={() => setSettingsOpen(true)}>
            {state.user.name?.[0] || 'Y'}
          </button>
        </nav>
        {view === 'chat' ? (
          <Workspace onOpenUpgrade={() => setPricingOpen(true)} onMenu={() => setNavOpen(true)} />
        ) : (
          <div className="agents-wrap"><AgentsPanel onOpenUpgrade={() => setPricingOpen(true)} /></div>
        )}
      </div>

      {pricingOpen && <PricingModal onClose={() => setPricingOpen(false)} />}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} onOpenUpgrade={() => { setSettingsOpen(false); setPricingOpen(true) }} />}
    </div>
  )
}
