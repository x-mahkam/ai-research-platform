import {
  Project,
  Experiment,
  SimulationJob,
  SimulatorPlugin,
  GeneratedReport,
  ModelFile,
} from '../shared/types.js';

export interface BaseEntity {
  id: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProjectEntity extends Project {}

export interface ModelEntity extends ModelFile {}

export interface ExperimentEntity extends Experiment {}

export interface SimulationEntity extends BaseEntity {
  experimentId: string;
  pluginId: string;
  status: string;
  progress: number;
  durationSeconds?: number;
  cpuUsage?: number;
  memoryUsage?: number;
  cpuUsagePercent?: number;
  memoryUsageMB?: number;
}

export interface JobEntity extends SimulationJob {
  type?: string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedNode?: string;
  parameters?: Record<string, unknown>;
}

export interface PluginEntity extends SimulatorPlugin {}

export interface ResultEntity extends BaseEntity {
  experimentId: string;
  jobId: string;
  pluginId: string;
  metrics: Record<string, string | number>;
  curves: Array<{
    id: string;
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    data: Array<{ x: number; y: number }>;
  }>;
  summary: string;
}

export interface ReportEntity extends GeneratedReport {}

export interface UserEntity extends BaseEntity {
  email: string;
  name: string;
  role: 'ADMIN' | 'RESEARCHER' | 'VIEWER';
  avatarUrl?: string;
}

export interface NotificationEntity extends BaseEntity {
  userId?: string;
  title: string;
  message: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
  read: boolean;
  timestamp: string;
}

export interface AISessionEntity extends BaseEntity {
  sessionId: string;
  userId?: string;
  history: Array<{ role: string; content: string; timestamp: string }>;
  lastActive: string;
}

export interface KnowledgeBaseEntity extends BaseEntity {
  category: 'TCAD' | 'Quantum' | 'Multiphysics' | 'Photonic';
  title: string;
  equations: string[];
  description: string;
  typicalParameters: Record<string, string>;
  commonAnomalies: string[];
}
