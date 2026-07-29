import { AnyTargetConfig, ExecutionTarget } from './ExecutionTarget.js';
import { INodeSpecs, NodeState, SupportedSoftware, TargetType } from './types.js';

export interface IExecutionNodeInit {
  id: string;
  name: string;
  targetType: TargetType;
  targetConfig: AnyTargetConfig;
  specs: Partial<INodeSpecs>;
  simulatorVersions?: Record<string, string>;
  installedPlugins?: string[];
  availableLicenses?: Record<string, number>;
  maxConcurrentJobs?: number;
  tags?: string[];
}

export class ExecutionNode {
  public readonly id: string;
  public readonly name: string;
  public readonly target: ExecutionTarget;
  public state: NodeState = 'Online';

  public specs: INodeSpecs;
  public simulatorVersions: Record<string, string>;
  public installedPlugins: string[];
  public availableLicenses: Record<string, number>;
  public maxConcurrentJobs: number;
  public runningJobIds: Set<string> = new Set();
  public queueLength: number = 0;
  public lastHeartbeat: string;
  public tags: string[];

  constructor(init: IExecutionNodeInit) {
    this.id = init.id;
    this.name = init.name;
    this.target = new ExecutionTarget(init.targetType, init.targetConfig);
    this.tags = init.tags || [];

    this.specs = {
      totalCores: init.specs.totalCores ?? 16,
      availableCores: init.specs.availableCores ?? 16,
      cpuUsagePercent: init.specs.cpuUsagePercent ?? 10,
      totalMemoryMb: init.specs.totalMemoryMb ?? 65536,
      availableMemoryMb: init.specs.availableMemoryMb ?? 65536,
      memoryUsagePercent: init.specs.memoryUsagePercent ?? 15,
      gpuCount: init.specs.gpuCount ?? 0,
      gpuModel: init.specs.gpuModel ?? 'N/A',
      vramMb: init.specs.vramMb ?? 0,
      gpuUsagePercent: init.specs.gpuUsagePercent ?? 0,
      os: init.specs.os ?? 'Linux',
      diskTotalGb: init.specs.diskTotalGb ?? 1000,
      diskAvailableGb: init.specs.diskAvailableGb ?? 800,
    };

    this.simulatorVersions = init.simulatorVersions || {
      'Synopsys Sentaurus': '2023.12',
      QuantumATK: '2024.03',
      COMSOL: '6.2',
      Lumerical: '2023.2',
      'Silvaco Atlas': '5.28.1.R',
      MATLAB: 'R2023b',
      HFSS: '2023.2',
      OpenFOAM: 'v2312',
      Generic: '1.0.0',
    };

    this.installedPlugins = init.installedPlugins || [
      'sentaurus-tcad',
      'quantumatk-dft',
      'comsol-multiphysics',
      'lumerical-fdtd',
      'generic-multiphysics',
    ];

    this.availableLicenses = init.availableLicenses || {
      synopsys_sentaurus: 10,
      quantumatk: 10,
      comsol: 10,
      lumerical: 10,
      silvaco: 10,
      matlab: 10,
      ansys_hfss: 10,
    };

    this.maxConcurrentJobs = init.maxConcurrentJobs ?? 8;
    this.lastHeartbeat = new Date().toISOString();
  }

  public canAcceptJob(
    requiredCores = 1,
    requiredMemoryMb = 1024,
    requiredGpuCount = 0,
    softwareType?: SupportedSoftware,
    pluginId?: string,
    requiredLicenses?: Record<string, number>
  ): boolean {
    if (this.state === 'Offline' || this.state === 'Maintenance' || this.state === 'Unreachable') {
      return false;
    }

    if (this.runningJobIds.size >= this.maxConcurrentJobs) {
      return false;
    }

    if (this.specs.availableCores < requiredCores) {
      return false;
    }

    if (this.specs.availableMemoryMb < requiredMemoryMb) {
      return false;
    }

    if (requiredGpuCount > 0 && this.specs.gpuCount < requiredGpuCount) {
      return false;
    }

    if (softwareType && softwareType !== 'Generic' && !this.simulatorVersions[softwareType]) {
      return false;
    }

    if (pluginId && !this.installedPlugins.includes(pluginId)) {
      return false;
    }

    if (requiredLicenses) {
      for (const [licenseKey, neededCount] of Object.entries(requiredLicenses)) {
        const available = this.availableLicenses[licenseKey] || 0;
        if (available < neededCount) {
          return false;
        }
      }
    }

    return true;
  }

  public assignJob(jobId: string, coresUsed = 1, memoryMbUsed = 1024): void {
    this.runningJobIds.add(jobId);
    this.specs.availableCores = Math.max(0, this.specs.availableCores - coresUsed);
    this.specs.availableMemoryMb = Math.max(0, this.specs.availableMemoryMb - memoryMbUsed);
    this.specs.cpuUsagePercent = Math.min(
      100,
      Math.round(((this.specs.totalCores - this.specs.availableCores) / this.specs.totalCores) * 100)
    );

    if (this.runningJobIds.size >= this.maxConcurrentJobs) {
      this.state = 'Busy';
    } else {
      this.state = 'Online';
    }
  }

  public releaseJob(jobId: string, coresFreed = 1, memoryMbFreed = 1024): void {
    this.runningJobIds.delete(jobId);
    this.specs.availableCores = Math.min(this.specs.totalCores, this.specs.availableCores + coresFreed);
    this.specs.availableMemoryMb = Math.min(
      this.specs.totalMemoryMb,
      this.specs.availableMemoryMb + memoryMbFreed
    );
    this.specs.cpuUsagePercent = Math.max(
      0,
      Math.round(((this.specs.totalCores - this.specs.availableCores) / this.specs.totalCores) * 100)
    );

    if (this.state === 'Busy' && this.runningJobIds.size < this.maxConcurrentJobs) {
      this.state = 'Online';
    }
  }

  public updateHeartbeat(): void {
    this.lastHeartbeat = new Date().toISOString();
  }

  public getSummary() {
    return {
      id: this.id,
      name: this.name,
      targetType: this.target.targetType,
      state: this.state,
      runningJobs: this.runningJobIds.size,
      maxConcurrentJobs: this.maxConcurrentJobs,
      cpuUsage: `${this.specs.cpuUsagePercent}% (${this.specs.availableCores}/${this.specs.totalCores} cores free)`,
      memoryUsage: `${Math.round((1 - this.specs.availableMemoryMb / this.specs.totalMemoryMb) * 100)}% free`,
      gpu: `${this.specs.gpuCount}x ${this.specs.gpuModel}`,
      os: this.specs.os,
      lastHeartbeat: this.lastHeartbeat,
    };
  }
}
