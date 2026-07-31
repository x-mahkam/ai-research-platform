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
  /** Flat solver metrics parsed from the batch log (DOF, solution time, computed globals). */
  metrics?: Record<string, string | number>;
  /** Named computed values extracted from the solver log. */
  computedValues?: Array<{ name: string; value: string; unit?: string }>;
  /** Solver warnings surfaced from the log. */
  warnings?: string[];
  /** Solver errors surfaced from the log. */
  errors?: string[];
  /** Whether the solver reported convergence (null if undetermined). */
  converged?: boolean | null;
  /** Tail of the raw solver log, so the AI can read the actual output. */
  solverLog?: string;
  /** Bounded previews of any result tables COMSOL exported to the workspace. */
  exportedTables?: Array<{ file: string; preview: string }>;
}

export interface ComsolJobOptions {
  batchArgs?: string[];
  env?: Record<string, string>;
  timeoutMs?: number;
}
