import { SimulationJob, SimulationResults, ExperimentStatus } from '../shared/types.js';

export type SimulationLifecycleState =
  | 'CREATED'
  | 'VALIDATED'
  | 'QUEUED'
  | 'ASSIGNED'
  | 'EXECUTING'
  | 'MONITORING'
  | 'COLLECTING'
  | 'METADATA_STORED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'PAUSED';

export interface ISimulationJobRequest {
  experimentId: string;
  parameters?: Record<string, unknown>;
  priority?: number;
  userId?: string;
  solverPluginId?: string;
}

export interface IWorkerNode {
  id: string;
  hostname: string;
  status: 'IDLE' | 'BUSY' | 'OFFLINE';
  maxConcurrentJobs: number;
  activeJobs: string[];
  cpuUsagePct: number;
  memoryUsageGb: number;
  lastHeartbeat: string;
}

export interface ISimulationExecutionContext {
  jobId: string;
  workerId: string;
  experimentId: string;
  pluginId: string;
  parameters: Record<string, unknown>;
  workspacePath?: string;
  startTime: string;
}

export interface ISimulationExecutionResult {
  jobId: string;
  success: boolean;
  exitCode: number;
  results?: SimulationResults;
  logs: string[];
  durationSeconds: number;
  error?: string;
}

export interface ISimulationAdapter {
  adapterName: string;
  validateParameters(parameters: Record<string, unknown>): { valid: boolean; errors?: string[] };
  execute(context: ISimulationExecutionContext): Promise<ISimulationExecutionResult>;
}

export interface ISimulationHistoryRecord {
  id: string;
  jobId: string;
  experimentId: string;
  status: SimulationLifecycleState;
  startTime: string;
  endTime?: string;
  workerId?: string;
  durationSeconds?: number;
  exitCode?: number;
  metricsSummary?: Record<string, unknown>;
}
