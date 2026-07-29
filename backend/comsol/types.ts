export interface ComsolExecutionMetadata {
  executablePath: string;
  startTime: string;
  endTime: string;
  stdoutSizeBytes: number;
  stderrSizeBytes: number;
  environment: Record<string, string>;
  commandLine: string[];
}

export interface SimulationResult {
  status: 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TIMEOUT' | 'LICENSE_ERROR';
  executionTimeMs: number;
  inputModel: string;
  outputModel: string;
  logFile: string;
  exitCode: number;
  metadata: ComsolExecutionMetadata;
}

export interface ComsolJobOptions {
  batchArgs?: string[];
  env?: Record<string, string>;
  timeoutMs?: number;
}
