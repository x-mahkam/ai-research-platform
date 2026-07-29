export interface AppConfig {
  env: string;
  port: number;
  serviceName: string;
  version: string;
  gemini: {
    apiKey?: string;
    modelName: string;
    userAgent: string;
    temperature: number;
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
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    modelName: 'gemini-3.6-flash',
    userAgent: 'aistudio-build',
    temperature: 0.2,
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
