export interface AppConfig {
  env: string;
  port: number;
  serviceName: string;
  version: string;
  ai: {
    // Optional default provider id (AI_PROVIDER). When an experiment doesn't
    // pin one, the platform uses this, or the first configured provider.
    defaultProvider?: string;
    maxTokens: number;
    providers: {
      gemini: { apiKey?: string; model: string };
      deepseek: { apiKey?: string; model: string };
      openai: { apiKey?: string; model: string };
      grok: { apiKey?: string; model: string };
      claude: { apiKey?: string; model: string };
      ollama: { model: string; baseURL: string; enabled: boolean };
    };
  };
  simulation: {
    defaultHostMachine: string;
    defaultCpuUsage: number;
    defaultMemoryUsageGb: number;
  };
}

// Read the provider config from the current environment. Called at import and
// again by the registry's reload() after keys are changed at runtime, so newly
// set keys take effect without a restart.
export function readAiProvidersFromEnv(): AppConfig['ai']['providers'] {
  return {
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    },
    grok: {
      apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
      model: process.env.GROK_MODEL || 'grok-2-latest',
    },
    claude: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      model: process.env.ANTHROPIC_MODEL || 'claude-opus-5',
    },
    // Local LLM via Ollama (OpenAI-compatible endpoint). No API key — it is
    // "configured" once the user names a model to run (OLLAMA_MODEL), so a
    // machine without Ollama simply leaves it absent.
    ollama: {
      model: process.env.OLLAMA_MODEL || 'llama3.1',
      baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
      enabled: Boolean(process.env.OLLAMA_MODEL || process.env.OLLAMA_ENABLED),
    },
  };
}

export const config: AppConfig = {
  env: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 3000,
  serviceName: 'AI Research Platform (ARP)',
  version: '0.1.0',
  ai: {
    // Any subset of the five providers can be configured. A provider is only
    // available when its API key is present; with none set, the AI features
    // return a clearly-labeled built-in fallback (not real AI output).
    defaultProvider: process.env.AI_PROVIDER,
    maxTokens: Number(process.env.AI_MAX_TOKENS || process.env.ANTHROPIC_MAX_TOKENS) || 16000,
    providers: readAiProvidersFromEnv(),
  },
  simulation: {
    // Neutral defaults — no fabricated telemetry. The job manager stamps the
    // real host and 0 (= not measured) for CPU/RAM.
    defaultHostMachine: 'local',
    defaultCpuUsage: 0,
    defaultMemoryUsageGb: 0,
  },
};

// The .env variable that enables each provider (ids don't all match the name).
export const PROVIDER_ENV_KEYS: Record<string, string> = {
  gemini: 'GEMINI_API_KEY',
  deepseek: 'DEEPSEEK_API_KEY',
  openai: 'OPENAI_API_KEY',
  grok: 'XAI_API_KEY',
  claude: 'ANTHROPIC_API_KEY',
};

export const SYSTEM_CONSTANTS = {
  DEFAULT_EXPERIMENT_GOAL: 'Optimize Multiphysics Semiconductor Simulation Domain',
  DEFAULT_TARGET_METRIC: 'Ion (ON Current)',
  SUPPORTED_OS_LIST: ['Linux x86_64', 'Windows Server 2022'],
  SCHEDULER_WATCHDOG_MS: 10000,
  DEFAULT_PRIORITY_LEVEL: 5,
  MAX_RETRY_COUNT: 3,
} as const;
