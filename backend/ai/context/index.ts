import { experimentRepository } from '../../repositories/experimentRepository.js';
import { simulationRepository } from '../../repositories/simulationRepository.js';
import { workspaceManager } from '../../workspace/index.js';
import { resultManager } from '../../results/index.js';
import { pluginRegistry } from '../../plugins/index.js';

export interface IAIContextPayload {
  experimentId?: string;
  jobId?: string;
  experimentTitle?: string;
  pluginId?: string;
  pluginCapabilities?: string[];
  parameters?: Record<string, unknown>;
  unifiedResults?: unknown;
  workspaceMetrics?: unknown;
  simulationStatus?: string;
  rawLogsSnippet?: string[];
}

export class AIContextAggregator {
  public async buildContext(experimentId?: string, jobId?: string): Promise<IAIContextPayload> {
    const payload: IAIContextPayload = {};

    if (experimentId) {
      try {
        const exp = experimentRepository.findById(experimentId);
        if (exp) {
          payload.experimentId = exp.id;
          payload.experimentTitle = exp.title;
          payload.simulationStatus = exp.status;
          payload.pluginId = exp.pluginId;

          if (Array.isArray(exp.parameters)) {
            const paramMap: Record<string, unknown> = {};
            for (const p of exp.parameters) {
              paramMap[p.name || p.key] = p.value;
            }
            payload.parameters = paramMap;
          }
        }
      } catch {
        // ignore
      }
    }

    if (jobId) {
      try {
        const job = simulationRepository.findById(jobId);
        if (job) {
          payload.jobId = job.id;
          payload.pluginId = job.pluginId;
          payload.simulationStatus = job.status;
        }

        const res = resultManager.getResultsByJob(jobId);
        if (res) {
          payload.unifiedResults = res;
        }
      } catch {
        // ignore
      }
    }

    if (payload.experimentId && payload.jobId) {
      try {
        const metrics = workspaceManager.getStorageMetrics(payload.experimentId, payload.jobId);
        payload.workspaceMetrics = metrics;
      } catch {
        // ignore
      }
    }

    if (payload.pluginId && pluginRegistry.has(payload.pluginId)) {
      try {
        const p = pluginRegistry.get(payload.pluginId);
        payload.pluginCapabilities = p.metadata.capabilities;
      } catch {
        // ignore
      }
    }

    return payload;
  }
}

export const aiContextAggregator = new AIContextAggregator();
