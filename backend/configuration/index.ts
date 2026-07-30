export interface AppConfig {
  env: string;
  port: number;
  serviceName: string;
  version: string;
  anthropic: {
    apiKey?: string;
    modelName: string;
    maxTokens: number;
  };
  simulation: {
    defaultHostMachine: string;
    defaultCpuUsage: number;
    defaultMemoryUsageGb: number;
  };
}

export const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  serviceName: 'AI Research Platform (ARP)',
  version: '0.1.0',
  anthropic: {
    // Reads ANTHROPIC_API_KEY from the environment. Without it, the AI features
    // return a clearly-labeled built-in fallback (not real AI output).
    apiKey: process.env.ANTHROPIC_API_KEY,
    // Default to Claude Opus — the most capable model, well suited to the
    // physics/scientific reasoning this platform does. Override via ANTHROPIC_MODEL.
    modelName: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
    maxTokens: Number(process.env.ANTHROPIC_MAX_TOKENS) || 16000,
  },
  simulation: {
    defaultHostMachine: 'node-compute-02.arp.local',
    defaultCpuUsage: 78.2,
    defaultMemoryUsageGb: 8.5,
  },
};

export const SYSTEM_CONSTANTS = {
  DEFAULT_EXPERIMENT_GOAL: 'Optimize Multiphysics Semiconductor Simulation Domain',
  DEFAULT_TARGET_METRIC: 'Ion (ON Current)',
  SUPPORTED_OS_LIST: ['Linux x86_64', 'Windows Server 2022'],
  SCHEDULER_WATCHDOG_MS: 10000,
  DEFAULT_PRIORITY_LEVEL: 5,
  MAX_RETRY_COUNT: 3,
} as const;
