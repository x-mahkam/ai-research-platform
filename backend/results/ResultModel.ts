export interface ISimulationCurve {
  id: string;
  name: string;
  type: 'Id-Vg' | 'Id-Vd' | 'Ig-Vg' | 'C-V' | 'Transient' | 'Generic';
  xAxisName: string;
  xAxisUnit: string;
  yAxisName: string;
  yAxisUnit: string;
  xValues: number[];
  yValues: number[];
}

export interface ISimulationMetrics {
  thresholdVoltageVth?: number; // V
  subthresholdSwingSS?: number; // mV/dec
  ionCurrent?: number; // A or A/um
  ioffCurrent?: number; // A or A/um
  ionIoffRatio?: number;
  transconductanceGm?: number; // S or S/um
  dibl?: number; // mV/V
  drainCurrentMax?: number; // A
  gateCurrentMax?: number; // A
  leakageCurrent?: number; // A
  meshNodeCount?: number;
  newtonIterationCount?: number;
  cpuTimeSeconds?: number;
  peakMemoryMB?: number;
  customMetrics: Record<string, string | number>;
}

export interface ISimulationMetadata {
  simulator: string;
  pluginId: string;
  version?: string;
  meshFile?: string;
  parameterFile?: string;
  commandFile?: string;
  pltFile?: string;
  logFile?: string;
  customMetadata: Record<string, unknown>;
}

export interface ISimulationExecutionInfo {
  status: 'Completed' | 'Failed' | 'Timeout' | 'License Error' | 'Executable Missing' | 'Corrupted';
  exitCode: number | null;
  durationMs: number;
  cpuTimeMs?: number;
  memoryUsageBytes?: number;
  stdout?: string;
  stderr?: string;
  logLinesCount?: number;
}

export interface ISimulationResult {
  id: string;
  experimentId: string;
  runId: string;
  simulator: string;
  pluginId: string;
  timestamp: string;
  metrics: ISimulationMetrics;
  curves: ISimulationCurve[];
  metadata: ISimulationMetadata;
  execution: ISimulationExecutionInfo;
  warnings: string[];
  errors: string[];
}
