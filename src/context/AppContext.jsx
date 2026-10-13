import React, { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { loadState, saveState, uid } from '../lib/storage.js'
import { getPlan, COSTS } from '../data/plans.js'
import { generateChatReply, generateImage, generateCode, generateFeedback, getModel } from '../lib/mockAI.js'

const Ctx = createContext(null)

// Conversation ids are generated here so callers can address a new chat synchronously.

function reducer(state, action) {
  switch (action.type) {
    case 'SIGN_IN':
      return { ...state, user: action.user, periodStart: state.periodStart || new Date().toISOString() }
    case 'SIGN_OUT':
      return { ...state, user: null, activeConversationId: null }
    case 'RESET_DATA': {
      localStorage.removeItem('mellow.state.v1')
      const fresh = loadState()
      return { ...fresh, user: state.user }
    }
    case 'SET_PLAN':
      return { ...state, plan: action.plan, creditsUsed: 0 }
    case 'SET_CYCLE':
      return { ...state, billingCycle: action.cycle }
    case 'NEW_CHAT': {
      const conv = { id: action.id || uid('c_'), title: 'New chat', createdAt: new Date().toISOString(), model: action.model || 'mellow-lite', messages: [], artifacts: [] }
      return { ...state, conversations: [conv, ...state.conversations], activeConversationId: conv.id }
    }
    case 'SELECT_CHAT':
      return { ...state, activeConversationId: action.id }
    case 'DELETE_CHAT': {
      const conversations = state.conversations.filter((c) => c.id !== action.id)
      const activeConversationId = state.activeConversationId === action.id ? (conversations[0]?.id ?? null) : state.activeConversationId
      return { ...state, conversations, activeConversationId }
    }
    case 'RENAME_CHAT':
      return { ...state, conversations: state.conversations.map((c) => (c.id === action.id ? { ...c, title: action.title } : c)) }
    case 'SET_MODEL':
      return { ...state, conversations: state.conversations.map((c) => (c.id === action.id ? { ...c, model: action.model } : c)) }
    case 'ADD_MESSAGE': {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.convId
            ? {
                ...c,
                title: c.messages.length === 0 && action.message.role === 'user' ? deriveTitle(action.message.content) : c.title,
                messages: [...c.messages, action.message],
              }
            : c
        ),
      }
    }
    case 'UPDATE_MESSAGE': {
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.convId
            ? { ...c, messages: c.messages.map((m) => (m.id === action.msgId ? { ...m, ...action.patch } : m)) }
            : c
        ),
      }
    }
    case 'SPEND_CREDITS':
      return { ...state, creditsUsed: state.creditsUsed + action.amount }
    case 'REFUND_CREDITS':
      return { ...state, creditsUsed: Math.max(0, state.creditsUsed - action.amount) }
    case 'PAIR_DEVICE': {
      const dev = { id: uid('d_'), name: action.name, os: action.os, pairedAt: new Date().toISOString(), status: 'paired' }
      return { ...state, devices: [...state.devices, dev], permissions: { ...state.permissions, [dev.id]: {} } }
    }
    case 'UNPAIR_DEVICE': {
      const { [action.id]: _drop, ...perms } = state.permissions
      return { ...state, devices: state.devices.filter((d) => d.id !== action.id), permissions: perms }
    }
    case 'SET_PERMISSION':
      return { ...state, permissions: { ...state.permissions, [action.deviceId]: { ...(state.permissions[action.deviceId] || {}), [action.scope]: action.granted } } }
    case 'INSTALL_AGENT':
      return { ...state, installs: { ...state.installs, [action.agentId]: { installed: true, at: new Date().toISOString() } } }
    case 'AUDIT':
      return { ...state, audit: [{ ts: new Date().toISOString(), ...action.entry }, ...state.audit].slice(0, 200) }
    default:
      return state
  }
}

function deriveTitle(text) {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > 42 ? t.slice(0, 42) + '…' : t
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    saveState(state)
  }, [state])

  const plan = getPlan(state.plan)
  const creditsRemaining = Math.max(0, plan.creditsMonthly - state.creditsUsed)

  const api = useMemo(() => {
    const activeConv = state.conversations.find((c) => c.id === state.activeConversationId) || null

    function spend(cost) {
      if (cost > creditsRemaining) return false
      dispatch({ type: 'SPEND_CREDITS', amount: cost })
      return true
    }

    async function send({ tool = 'chat', prompt, modelId, convId }) {
      const targetConv = convId || activeConv?.id
      if (!targetConv) return { error: 'No conversation selected.' }
      const cost = tool === 'chat' ? getModel(modelId).costPerMsg : COSTS[tool]
      if (!spend(cost)) return { error: 'not_enough_credits' }

      const msgId = uid('m_')
      dispatch({ type: 'ADD_MESSAGE', convId: targetConv, message: { id: uid('m_'), role: 'user', content: prompt, tool } })
      dispatch({
        type: 'ADD_MESSAGE',
        convId: targetConv,
        message: { id: msgId, role: 'assistant', content: '', tool, pending: true, meta: { cost, modelId } },
      })
      try {
        let patch = {}
        if (tool === 'chat') {
          const text = await generateChatReply({ prompt, modelId, history: activeConv?.messages })
          patch = { content: text, pending: false }
        } else if (tool === 'image') {
          const img = await generateImage({ prompt })
          patch = { content: `Generated image for “${prompt.slice(0, 60)}”.`, pending: false, artifact: { kind: 'image', ...img } }
        } else if (tool === 'code') {
          const code = await generateCode({ prompt })
          patch = { content: code.explanation, pending: false, artifact: { kind: 'code', ...code } }
        } else if (tool === 'feedback') {
          const fb = await generateFeedback({ prompt })
          patch = { content: '', pending: false, artifact: { kind: 'feedback', ...fb } }
        }
        dispatch({ type: 'UPDATE_MESSAGE', convId: targetConv, msgId, patch })
        return { ok: true }
      } catch (e) {
        dispatch({ type: 'UPDATE_MESSAGE', convId: targetConv, msgId, patch: { pending: false, error: String(e) } })
        dispatch({ type: 'REFUND_CREDITS', amount: cost })
        return { error: 'generation_failed' }
      }
    }

    return {
      // auth
      signIn: (user) => dispatch({ type: 'SIGN_IN', user }),
      signOut: () => dispatch({ type: 'SIGN_OUT' }),
      resetData: () => dispatch({ type: 'RESET_DATA' }),
      // billing
      setPlan: (p) => dispatch({ type: 'SET_PLAN', plan: p }),
      setCycle: (c) => dispatch({ type: 'SET_CYCLE', cycle: c }),
      // chats
      newChat: (model) => dispatch({ type: 'NEW_CHAT', model }),
      selectChat: (id) => dispatch({ type: 'SELECT_CHAT', id }),
      deleteChat: (id) => dispatch({ type: 'DELETE_CHAT', id }),
      renameChat: (id, title) => dispatch({ type: 'RENAME_CHAT', id, title }),
      setModel: (id, model) => dispatch({ type: 'SET_MODEL', id, model }),
      send,
      spend,
      // devices / agents
      pairDevice: (name, os) => dispatch({ type: 'PAIR_DEVICE', name, os }),
      unpairDevice: (id) => dispatch({ type: 'UNPAIR_DEVICE', id }),
      setPermission: (deviceId, scope, granted) => dispatch({ type: 'SET_PERMISSION', deviceId, scope, granted }),
      installAgent: (agentId) => dispatch({ type: 'INSTALL_AGENT', agentId }),
      audit: (entry) => dispatch({ type: 'AUDIT', entry }),
    }
  }, [state, creditsRemaining, activeConvSelector(state)])

  const value = { state, plan, creditsRemaining, api }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

function activeConvSelector(state) {
  return state.activeConversationId
}

export function useApp() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside AppProvider')
  return v
}
