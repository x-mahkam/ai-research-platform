import { TargetType } from './types.js';

export interface ILocalTargetConfig {
  type: 'Local';
  workingDirectory?: string;
}

export interface ISSHTargetConfig {
  type: 'SSH';
  host: string;
  port: number;
  username: string;
  privateKeyPath?: string;
  password?: string;
  remoteWorkingDirectory: string;
}

export interface ISlurmTargetConfig {
  type: 'SLURM';
  masterHost: string;
  partition: string;
  sbatchPath: string;
  account?: string;
  nodeCount: number;
  timeLimit: string;
  remoteWorkingDirectory: string;
}

export interface IPbsTargetConfig {
  type: 'PBS';
  masterHost: string;
  queue: string;
  qsubPath: string;
  nodeCount: number;
  walltime: string;
  remoteWorkingDirectory: string;
}

export interface IDockerTargetConfig {
  type: 'Docker';
  dockerHost?: string;
  image: string;
  containerArgs?: string[];
  volumeMounts?: Array<{ hostPath: string; containerPath: string }>;
}

export interface IKubernetesTargetConfig {
  type: 'Kubernetes';
  namespace: string;
  kubeconfigPath?: string;
  image: string;
  cpuLimit?: string;
  memoryLimit?: string;
}

export interface ICloudTargetConfig {
  type: 'Cloud';
  provider: 'GCP' | 'AWS' | 'Azure';
  region: string;
  instanceType: string;
  credentialsSecretRef?: string;
}

export type AnyTargetConfig =
  | ILocalTargetConfig
  | ISSHTargetConfig
  | ISlurmTargetConfig
  | IPbsTargetConfig
  | IDockerTargetConfig
  | IKubernetesTargetConfig
  | ICloudTargetConfig;

export class ExecutionTarget {
  public readonly targetType: TargetType;
  public readonly config: AnyTargetConfig;

  constructor(targetType: TargetType, config: AnyTargetConfig) {
    this.targetType = targetType;
    this.config = config;
  }

  public validate(): { valid: boolean; errors?: string[] } {
    const errors: string[] = [];

    switch (this.targetType) {
      case 'SSH': {
        const c = this.config as ISSHTargetConfig;
        if (!c.host) errors.push('SSH target requires host');
        if (!c.username) errors.push('SSH target requires username');
        break;
      }
      case 'SLURM': {
        const c = this.config as ISlurmTargetConfig;
        if (!c.partition) errors.push('SLURM target requires partition');
        break;
      }
      case 'PBS': {
        const c = this.config as IPbsTargetConfig;
        if (!c.queue) errors.push('PBS target requires queue');
        break;
      }
      case 'Docker': {
        const c = this.config as IDockerTargetConfig;
        if (!c.image) errors.push('Docker target requires container image');
        break;
      }
      case 'Kubernetes': {
        const c = this.config as IKubernetesTargetConfig;
        if (!c.image) errors.push('Kubernetes target requires container image');
        break;
      }
      case 'Cloud': {
        const c = this.config as ICloudTargetConfig;
        if (!c.provider) errors.push('Cloud target requires provider');
        break;
      }
      case 'Local':
      default:
        break;
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}
