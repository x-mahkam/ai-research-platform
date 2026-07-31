export type ProjectStatus = 'Draft' | 'Active' | 'Completed' | 'Archived';

export interface Project {
  id: string;
  title: string;
  scientificField: string;
  simulator: string;
  physicsModule: string;
  researchGoal: string;
  description: string;
  principalInvestigator: string;
  tags: string[];
  status: ProjectStatus;
  members: string[];
  createdAt: string;
  updatedAt: string;
  favorite?: boolean;
  experimentCount?: number;
  defaultModelId?: string;
  models?: ModelFile[];

  // Backwards compatibility aliases
  owner?: string;
  domain?: string;
}

export interface ModelFile {
  id: string;
  projectId: string;
  fileName: string;
  fileType: string;
  simulator: string;
  physicsModule: string;
  absolutePath: string;
  fileSize: number;
  checksum: string;
  version: string;
  owner: string;
  createdAt: string;
  updatedAt: string;
  content?: string;
  description?: string;
  isDefault?: boolean;
}

export type ExperimentStatus =
  | 'Draft'
  | 'Ready'
  | 'Queued'
  | 'Running'
  | 'Paused'
  | 'Completed'
  | 'Failed'
  | 'Cancelled'
  | 'Archived';

export interface SimulationParameter {
  key: string;
  name: string;
  value: number | string;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  group?: string;
  description?: string;
}

export interface CurvePoint {
  x: number;
  y: number;
  [key: string]: number;
}

export interface SimulationResults {
  metrics: Record<string, number | string>;
  curves: {
    id: string;
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    data: CurvePoint[];
  }[];
  mesh2D?: {
    width: number;
    height: number;
    nodes: { x: number; y: number; potential: number; doping: number; electronConc: number }[];
  };
  outputFiles?: { name: string; size: string; type: string }[];
}

export interface ExperimentAttachment {
  id: string;
  name: string;
  size: string;
  type: string;
  uploadedAt: string;
  url?: string;
}

export interface ExperimentNote {
  id: string;
  author: string;
  content: string;
  createdAt: string;
  version: number;
}

// A single parameter the AI proposes to vary in an experiment run.
export interface ProposedParameter {
  key: string;
  name: string;
  baseline: number | string;
  min?: number;
  max?: number;
  unit?: string;
  rationale?: string;
}

// The AI's proposed experiment setup, shown to the user to review/edit and
// confirm before the simulation runs. `isAi` is false when this came from the
// deterministic fallback (no AI provider configured) rather than a real model.
export interface ExperimentSetupProposal {
  summary: string;
  parameters: ProposedParameter[];
  targetMetrics: string[];
  method: string;
  estimatedRuns: number;
  notes?: string;
  provider: string;
  isAi: boolean;
}

export interface Experiment {
  id: string;
  projectId: string;
  title: string;
  description: string;
  pluginId: string;
  status: ExperimentStatus;
  version: number;
  parentId?: string;
  parameters: SimulationParameter[];
  results?: SimulationResults;
  notes: ExperimentNote[];
  attachments: ExperimentAttachment[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;

  // Model File Linkage & Execution Workspace
  modelId?: string;
  modelFileName?: string;
  simulator?: string;
  physicsModule?: string;
  researchGoal?: string;
  workspacePath?: string;

  // AI provider(s) pinned to this experiment. One id → single model; several →
  // ensemble (all queried, answers combined). Chosen at creation, kept for the
  // life of the experiment.
  aiProviders?: string[];
}

export interface SimulationJob {
  id: string;
  experimentId: string;
  experimentTitle: string;
  pluginId: string;
  pluginName: string;
  status: ExperimentStatus;
  progress: number; // 0 - 100
  startTime?: string;
  endTime?: string;
  durationSeconds?: number;
  exitCode?: number;
  cpuUsage: number;
  memoryUsage: number;
  hostMachine: string;
  logs: string[];
  error?: string;
}

export interface PluginCapabilities {
  supports2DMesh: boolean;
  supports3D: boolean;
  supportsParallel: boolean;
  supportsOptimization: boolean;
  supportsPauseResume: boolean;
  supportedFileTypes: string[];
}

export interface SimulatorPlugin {
  id: string;
  name: string;
  simulatorName?: string;
  vendor: string;
  version: string;
  status: 'Active' | 'Inactive' | 'Unvalidated' | 'Error';
  description: string;
  licenseStatus: 'Valid' | 'Expiring Soon' | 'Missing' | 'N/A';
  supportedOS: string[];
  capabilities: PluginCapabilities;
  commands?: string[];
  sampleScript?: string;
  physicsModules?: string[];
  scientificFields?: string[];
  executable?: string;
  licenseType?: string;
}

export type OptimizationAlgorithm = 'Bayesian Optimization' | 'Genetic Algorithm' | 'Grid Search' | 'Random Search';

export interface OptimizationIteration {
  iteration: number;
  parameters: Record<string, number>;
  objectiveValue: number;
  isParetoOptimal?: boolean;
}

export interface OptimizationJob {
  id: string;
  experimentId: string;
  title: string;
  algorithm: OptimizationAlgorithm;
  targetMetric: string; // e.g. "Max Ion/Ioff ratio", "Min Breakdown Voltage"
  objective: 'maximize' | 'minimize';
  parametersToOptimize: {
    key: string;
    min: number;
    max: number;
    current: number;
  }[];
  maxIterations: number;
  currentIteration: number;
  bestValue: number | null;
  bestParameters: Record<string, number> | null;
  status: 'Idle' | 'Running' | 'Completed' | 'Failed';
  history: OptimizationIteration[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  reasoning?: string;
  suggestedParameters?: Record<string, number | string>;
  timestamp: string;
}

export interface GeneratedReport {
  id: string;
  experimentId: string;
  experimentTitle: string;
  projectName: string;
  title: string;
  markdownContent: string;
  author: string;
  createdAt: string;
  version: string;
}
