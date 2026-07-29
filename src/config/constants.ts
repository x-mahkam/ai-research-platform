export const API_ENDPOINTS = {
  PROJECTS: '/api/projects',
  EXPERIMENTS: '/api/experiments',
  SIMULATIONS: '/api/simulations',
  OPTIMIZATIONS: '/api/optimizations',
  AI_CHAT: '/api/ai/chat',
  AI_REPORT: '/api/ai/report',
  AI_PLAN: '/api/ai/plan',
  AI_ANALYZE: '/api/ai/analyze',
  AI_OPTIMIZE: '/api/ai/optimize',
  PLUGINS: '/api/plugins',
  HEALTH: '/api/health',
} as const;

export const DEFAULT_CONFIG = {
  PROJECT_ID: 'proj-001',
  EXPERIMENT_ID: 'exp-001',
  PLUGIN_ID: 'sentaurus-tcad',
  RETRY_LIMIT: 3,
  WATCHDOG_INTERVAL_MS: 10000,
} as const;
