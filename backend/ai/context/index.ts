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
  /** Surface the solver log tail from a unified result's diagnostics. */
  private attachSolverLog(payload: IAIContextPayload, res: unknown): void {
    const diag = (res as { diagnostics?: Record<string, unknown> })?.diagnostics;
    const solverLog = diag?.solverLog;
    if (typeof solverLog === 'string' && solverLog.trim()) {
      payload.rawLogsSnippet = solverLog.split(/\r?\n/).slice(-120);
    }
  }

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

          // The experiment record carries the unified results of its last run
          // (metrics + solver diagnostics). Use it so the AI has real data even
          // when the caller passes only an experimentId and no jobId.
          const expResults = (exp as { results?: unknown }).results;
          if (expResults && typeof expResults === 'object' && Object.keys(expResults).length) {
            payload.unifiedResults = expResults;
            this.attachSolverLog(payload, expResults);
          } else {
            // Fall back to the latest stored result for this experiment.
            try {
              const byExp = resultManager.getResultsByExperiment(experimentId);
              const latest = byExp && byExp.length ? byExp[byExp.length - 1] : undefined;
              if (latest) {
                payload.unifiedResults = latest;
                if (!payload.jobId) payload.jobId = latest.jobId;
                this.attachSolverLog(payload, latest);
              }
            } catch {
              // ignore
            }
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

        // A specific jobId overrides the experiment-level result with the
        // exact run the caller asked about.
        const res = resultManager.getResultsByJob(jobId);
        if (res) {
          payload.unifiedResults = res;
          this.attachSolverLog(payload, res);
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
