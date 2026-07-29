export interface PluginAuthor {
  name: string;
  email?: string;
  organization?: string;
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: PluginAuthor;
  category: 'TCAD' | 'Quantum' | 'Photonic' | 'Multiphysics' | 'General';
  supportedFormats: string[];
  capabilities: string[];
  minSdkVersion: string;
  license?: string;
  website?: string;
  icon?: string;
  // Universal scientific platform extensions
  simulatorName?: string;
  physicsModules?: string[];
  scientificFields?: string[];
  executable?: string;
  licenseType?: string;
}

export interface PluginHealthStatus {
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  uptimeSeconds: number;
  lastChecked: string;
  memoryUsageMb?: number;
  metrics?: Record<string, unknown>;
  details?: string;
}

export interface IPlugin {
  metadata(): Promise<PluginMetadata>;
  initialize(config?: Record<string, unknown>): Promise<void>;
  validate(parameters: Record<string, unknown>): Promise<{ valid: boolean; errors?: string[] }>;
  prepare(context: Record<string, unknown>): Promise<void>;
  execute(context: Record<string, unknown>): Promise<Record<string, unknown>>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  terminate(): Promise<void>;
  collectResults(): Promise<Record<string, unknown>>;
  cleanup(): Promise<void>;
  health(): Promise<PluginHealthStatus>;
}

export abstract class BasePlugin implements IPlugin {
  protected isInitialized: boolean = false;
  protected isRunning: boolean = false;
  protected isPaused: boolean = false;
  protected startTime: number = 0;
  protected lastResults: Record<string, unknown> = {};

  public abstract metadata(): Promise<PluginMetadata>;

  public async initialize(config?: Record<string, unknown>): Promise<void> {
    this.isInitialized = true;
    this.startTime = Date.now();
  }

  public async validate(parameters: Record<string, unknown>): Promise<{ valid: boolean; errors?: string[] }> {
    return { valid: true };
  }

  public async prepare(context: Record<string, unknown>): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
  }

  public abstract execute(context: Record<string, unknown>): Promise<Record<string, unknown>>;

  public async pause(): Promise<void> {
    this.isPaused = true;
  }

  public async resume(): Promise<void> {
    this.isPaused = false;
  }

  public async terminate(): Promise<void> {
    this.isRunning = false;
    this.isPaused = false;
  }

  public async collectResults(): Promise<Record<string, unknown>> {
    return this.lastResults;
  }

  public async cleanup(): Promise<void> {
    this.isInitialized = false;
    this.isRunning = false;
    this.isPaused = false;
  }

  public async health(): Promise<PluginHealthStatus> {
    return {
      status: this.isInitialized ? 'HEALTHY' : 'UNHEALTHY',
      uptimeSeconds: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
      lastChecked: new Date().toISOString(),
      details: this.isPaused ? 'Plugin execution paused' : 'Plugin operating normally',
    };
  }
}
