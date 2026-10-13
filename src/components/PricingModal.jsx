import React, { useState } from 'react'
import { useApp } from '../context/AppContext.jsx'
import { PLANS, PLAN_ORDER, annualMonthlyEquivalent, annualTotal, ANNUAL_DISCOUNT } from '../data/plans.js'

export default function PricingModal({ onClose }) {
  const { state, plan, api } = useApp()
  const [cycle, setCycle] = useState(state.billingCycle)
  const [confirm, setConfirm] = useState(null) // planId pending payment
  const [done, setDone] = useState(null)

  function priceOf(p) {
    return cycle === 'annual' ? annualMonthlyEquivalent(p) : p.monthlyPrice
  }

  function startCheckout(id) {
    if (id === state.plan && cycle === state.billingCycle) return
    setConfirm(id)
  }

  function pay() {
    const p = PLANS[confirm]
    setConfirm(null)
    api.setPlan(p.id)
    api.setCycle(cycle)
    setDone(p.id)
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Plans & pricing" onClick={onClose}>
      <div className="modal pricing" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" aria-label="Close" onClick={onClose}>✕</button>
        <h2>Plans & pricing</h2>
        <p className="muted">Upgrade instantly — models, credits and agents unlock right away.</p>

        <div className="cycle-toggle" role="radiogroup" aria-label="Billing cycle">
          <button role="radio" aria-checked={cycle === 'monthly'} className={cycle === 'monthly' ? 'on' : ''} onClick={() => setCycle('monthly')}>Monthly</button>
          <button role="radio" aria-checked={cycle === 'annual'} className={cycle === 'annual' ? 'on' : ''} onClick={() => setCycle('annual')}>
            Annual <span className="save-badge">Save {ANNUAL_DISCOUNT * 100}%</span>
          </button>
        </div>

        <div className="plan-cards">
          {PLAN_ORDER.map((id) => {
            const p = PLANS[id]
            const current = id === state.plan && cycle === state.billingCycle
            return (
              <div key={id} className={'plan-card' + (id === 'advanced' ? ' featured' : '')}>
                {id === 'advanced' && <span className="popular">Most popular</span>}
                <h3>{p.name}</h3>
                <p className="price">
                  <strong>${priceOf(p)}</strong>
                  <span>/mo{cycle === 'annual' ? ', billed annually' : ''}</span>
                </p>
                {cycle === 'annual' && p.monthlyPrice > 0 && (
                  <p className="muted small">${annualTotal(p)} total per year (20% off ${p.monthlyPrice * 12})</p>
                )}
                <p className="tagline">{p.tagline}</p>
                <ul>
                  <li><strong>{p.creditsMonthly.toLocaleString()}</strong> credits / month</li>
                  <li><strong>{p.models.length}</strong> model{p.models.length !== 1 ? 's' : ''}{p.models.includes('mellow-ultra') ? ' incl. Ultra reasoning' : ''}</li>
                  <li>{p.tools.image ? 'Image generation' : 'No image generation'} · {p.tools.code ? 'Code tools' : 'No code tools'}</li>
                  <li>{p.agents.length} agent{p.agents.length !== 1 ? 's' : ''}{p.computerAgent ? ' incl. computer control*' : ''}</li>
                  <li>{p.historyDays ? `${p.historyDays}-day history` : 'Unlimited history'}</li>
                </ul>
                {current ? (
                  <button className="btn ghost" disabled>Current plan</button>
                ) : (
                  <button className={'btn ' + (id === 'free' ? 'ghost' : 'primary')} onClick={() => startCheckout(id)}>
                    {id === 'free' ? 'Switch to Free' : `Upgrade for $${priceOf(p)}/mo`}
                  </button>
                )}
              </div>
            )
          })}
        </div>
        <p className="fineprint">* Computer-control agents require the separate Mellow Desktop Companion app; they are not browser-only features. Prices in USD. Cancel anytime.</p>

        {confirm && (
          <div className="checkout-sheet" role="alertdialog" aria-label="Confirm subscription">
            <h3>Confirm {PLANS[confirm].name}</h3>
            <p>
              ${priceOf(PLANS[confirm])}/mo {cycle === 'annual' ? `billed as $${annualTotal(PLANS[confirm])} once per year` : 'billed monthly'}. Entitlements apply immediately after payment.
            </p>
            <div className="row">
              <button className="btn primary" onClick={pay}>Pay & activate (demo)</button>
              <button className="btn ghost" onClick={() => setConfirm(null)}>Cancel</button>
            </div>
            <p className="muted small">Demo checkout — no real charge. Production integrates your billing provider (e.g. Stripe) here.</p>
          </div>
        )}

        {done && (
          <div className="success-sheet" role="status">
            <h3>✓ You’re on {PLANS[done].name}</h3>
            <p>{PLANS[done].creditsMonthly.toLocaleString()} credits available · {PLANS[done].models.length} models · {PLANS[done].agents.length} agents unlocked.</p>
            <button className="btn primary" onClick={() => { setDone(null); onClose() }}>Back to workspace</button>
          </div>
        )}
      </div>
    </div>
  )
}
