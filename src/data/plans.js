// Mellow plan tiers, model catalog, agent catalog & entitlement helpers.
// Model providers/API credentials are configurable implementation dependencies:
// swap `providers` entries + backend keys without touching UI code.

export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    monthlyPrice: 0,
    tagline: 'Core chat workspace to get you started.',
    creditsMonthly: 120,
    models: ['mellow-lite'],
    tools: { chat: true, image: false, code: false, feedback: false },
    imageQuota: 0,
    codeQuota: 0,
    feedbackQuota: 0,
    agents: ['assistant-beginner'],
    computerAgent: false,
    historyDays: 30,
  },
  plus: {
    id: 'plus',
    name: 'Mellow Plus',
    monthlyPrice: 15,
    tagline: 'Stronger everyday model, images and coding.',
    creditsMonthly: 600,
    models: ['mellow-lite', 'mellow-pro'],
    tools: { chat: true, image: true, code: true, feedback: true },
    imageQuota: 40,
    codeQuota: 80,
    feedbackQuota: 40,
    agents: ['assistant-beginner', 'code-helper'],
    computerAgent: false,
    historyDays: null, // unlimited
  },
  advanced: {
    id: 'advanced',
    name: 'Mellow Advanced',
    monthlyPrice: 20,
    tagline: 'Top-tier reasoning and bigger credit allowance.',
    creditsMonthly: 1000,
    models: ['mellow-lite', 'mellow-pro', 'mellow-ultra'],
    tools: { chat: true, image: true, code: true, feedback: true },
    imageQuota: 80,
    codeQuota: 160,
    feedbackQuota: 80,
    agents: ['assistant-beginner', 'code-helper', 'research-agent'],
    computerAgent: false,
    historyDays: null,
  },
  pro: {
    id: 'pro',
    name: 'Mellow Pro',
    monthlyPrice: 50,
    tagline: 'Computer-control agent with desktop companion.',
    creditsMonthly: 2600,
    models: ['mellow-lite', 'mellow-pro', 'mellow-ultra', 'mellow-coder'],
    tools: { chat: true, image: true, code: true, feedback: true },
    imageQuota: 200,
    codeQuota: 400,
    feedbackQuota: 200,
    agents: ['assistant-beginner', 'code-helper', 'research-agent', 'computer-operator'],
    computerAgent: true,
    historyDays: null,
  },
  max: {
    id: 'max',
    name: 'Mellow Max',
    monthlyPrice: 105,
    tagline: 'Everything unlocked, maximum credits & priority runs.',
    creditsMonthly: 6000,
    models: ['mellow-lite', 'mellow-pro', 'mellow-ultra', 'mellow-coder', 'mellow-vision'],
    tools: { chat: true, image: true, code: true, feedback: true },
    imageQuota: 500,
    codeQuota: 1000,
    feedbackQuota: 500,
    agents: ['assistant-beginner', 'code-helper', 'research-agent', 'computer-operator', 'autonomous-runner'],
    computerAgent: true,
    historyDays: null,
  },
}

export const PLAN_ORDER = ['free', 'plus', 'advanced', 'pro', 'max']

export const ANNUAL_DISCOUNT = 0.2 // 20% off equivalent monthly total

export function annualMonthlyEquivalent(plan) {
  return +(plan.monthlyPrice * (1 - ANNUAL_DISCOUNT)).toFixed(2)
}

export function annualTotal(plan) {
  return +(plan.monthlyPrice * 12 * (1 - ANNUAL_DISCOUNT)).toFixed(2)
}

export const MODELS = [
  { id: 'mellow-lite', name: 'Mellow Lite', provider: 'openai', desc: 'Fast, efficient everyday answers.', costPerMsg: 2 },
  { id: 'mellow-pro', name: 'Mellow Pro', provider: 'anthropic', desc: 'Balanced quality for writing & analysis.', costPerMsg: 5 },
  { id: 'mellow-ultra', name: 'Mellow Ultra', provider: 'openai', desc: 'Frontier reasoning for complex work.', costPerMsg: 10 },
  { id: 'mellow-coder', name: 'Mellow Coder', provider: 'deepseek', desc: 'Specialized long-context coding model.', costPerMsg: 8 },
  { id: 'mellow-vision', name: 'Mellow Vision', provider: 'google', desc: 'Multimodal understanding, top tier only.', costPerMsg: 12 },
]

export const AGENTS = [
  {
    id: 'assistant-beginner',
    name: 'Mellow Assistant (Beginner)',
    minPlan: 'free',
    computer: false,
    desc: 'Guided in-browser agent that drafts, summarizes and searches your conversation history. Safe defaults, no computer access.',
    permissions: ['Read conversation history'],
  },
  {
    id: 'code-helper',
    name: 'Code Helper Agent',
    minPlan: 'plus',
    computer: false,
    desc: 'Generates, explains and refactors code snippets inside the workspace sandbox. No local file access.',
    permissions: ['Run code in browser sandbox'],
  },
  {
    id: 'research-agent',
    name: 'Research Agent',
    minPlan: 'advanced',
    computer: false,
    desc: 'Multi-step research with structured citations gathered by our cloud workers.',
    permissions: ['Cloud web fetch'],
  },
  {
    id: 'computer-operator',
    name: 'Computer Operator',
    minPlan: 'pro',
    computer: true,
    desc: 'Controls files and approved apps on your desktop through the Mellow Desktop Companion. Requires install, permission grants and per-run approval.',
    permissions: ['Read selected folders', 'Write to selected folders', 'Open approved apps'],
  },
  {
    id: 'autonomous-runner',
    name: 'Autonomous Runner',
    minPlan: 'max',
    computer: true,
    desc: 'Long-horizon computer agent with queued task plans. Still requires companion install, scoped permissions and run approval for every session.',
    permissions: ['Read selected folders', 'Write to selected folders', 'Open approved apps', 'Schedule background tasks'],
  },
]

export function getPlan(id) {
  return PLANS[id] || PLANS.free
}

export function canUseModel(planId, modelId) {
  return getPlan(planId).models.includes(modelId)
}

export function canUseTool(planId, tool) {
  return !!getPlan(planId).tools[tool]
}

export function agentUnlocked(planId, agentId) {
  const plan = getPlan(planId)
  const agent = AGENTS.find((a) => a.id === agentId)
  if (!agent) return false
  return plan.agents.includes(agentId)
}

export const COSTS = { image: 12, code: 8, feedback: 6 }
