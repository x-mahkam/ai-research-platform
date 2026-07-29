export type ExecutionStatus =
  | 'Queued'
  | 'Preparing'
  | 'Running'
  | 'Completed'
  | 'Failed'
  | 'Cancelled'
  | 'Timeout'
  | 'License Error'
  | 'Executable Missing';

export type SupportedSoftware =
  | 'Synopsys Sentaurus'
  | 'QuantumATK'
  | 'COMSOL'
  | 'Lumerical'
  | 'Silvaco Atlas'
  | 'MATLAB'
  | 'HFSS'
  | 'OpenFOAM'
  | 'Generic';

export type TargetType =
  | 'Local'
  | 'SSH'
  | 'SLURM'
  | 'PBS'
  | 'Docker'
  | 'Kubernetes'
  | 'Cloud';

export type NodeState =
  | 'Online'
  | 'Offline'
  | 'Busy'
  | 'Idle'
  | 'Maintenance'
  | 'Unreachable';

export type DistributedJobType =
  | 'Single'
  | 'Batch'
  | 'ParameterSweep'
  | 'MonteCarlo'
  | 'Optimization';

export interface IExecutionRequest {
  executablePath: string;
  arguments?: string[];
  workingDirectory: string;
  environmentVariables?: Record<string, string>;
  timeoutMs?: number;
  pluginName?: string;
  experimentId?: string;
  runId?: string;
  softwareType?: SupportedSoftware;
  requiredCores?: number;
  requiredMemoryMb?: number;
  requiredGpuCount?: number;
  requiredLicenses?: Record<string, number>;
}

export interface IExecutionResult {
  exitCode: number | null;
  startTime: string;
  endTime: string;
  durationMs: number;
  cpuTimeMs?: number;
  memoryUsageBytes?: number;
  stdout: string;
  stderr: string;
  status: ExecutionStatus;
  errorMessage?: string;
  pid?: number;
  executedOnNodeId?: string;
}

export interface IExecutionContext {
  requestId: string;
  request: IExecutionRequest;
  status: ExecutionStatus;
  startTime?: Date;
  endTime?: Date;
  process?: IExecutionProcess;
}

export interface IExecutionProcess {
  pid: number | undefined;
  cancel: () => void;
  kill: (signal?: NodeJS.Signals) => void;
  promise: Promise<IExecutionResult>;
}

export interface INodeSpecs {
  totalCores: number;
  availableCores: number;
  cpuUsagePercent: number;
  totalMemoryMb: number;
  availableMemoryMb: number;
  memoryUsagePercent: number;
  gpuCount: number;
  gpuModel: string;
  vramMb: number;
  gpuUsagePercent: number;
  os: 'Linux' | 'Windows' | 'macOS' | 'ClusterOS';
  diskTotalGb: number;
  diskAvailableGb: number;
}

export interface IDistributedJob {
  id: string;
  request: IExecutionRequest;
  jobType: DistributedJobType;
  batchId?: string;
  priority: number;
  status: ExecutionStatus;
  assignedNodeId?: string;
  result?: IExecutionResult;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  hash: string;
}

