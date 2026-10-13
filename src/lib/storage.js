// Persistence layer: localStorage-backed store shared across the app.
const KEY = 'mellow.state.v1'

const initialState = {
  user: null, // { name, email, joinedAt }
  plan: 'free',
  billingCycle: 'monthly', // 'monthly' | 'annual'
  creditsUsed: 0,
  periodStart: null,
  conversations: [], // {id,title,createdAt,model,messages:[{role,content,tool?,meta?}],artifacts:[...]}
  activeConversationId: null,
  devices: [], // {id,name,os,pairedAt,status}
  permissions: {}, // deviceId -> {folders:true,apps:false,...}
  audit: [], // {ts,agent,action,detail,status}
  installs: {}, // agentId -> {installed:boolean}
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(initialState)
    return { ...structuredClone(initialState), ...JSON.parse(raw) }
  } catch {
    return structuredClone(initialState)
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch (e) {
    console.warn('Mellow: could not persist state', e)
  }
}

export function clearState() {
  localStorage.removeItem(KEY)
}

export function uid(prefix = '') {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}
