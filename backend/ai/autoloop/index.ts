import { simulationRepository } from '../../repositories/simulationRepository.js';
import { experimentRepository } from '../../repositories/experimentRepository.js';
import { resultManager } from '../../results/index.js';
import { simulationEngineOrchestrator } from '../../simulation/engine/index.js';
import { aiEngine } from '../../core/aiEngine.js';
import { LoggerService } from '../../logging/logger.js';
import { generateId, getCurrentTimestamp } from '../../shared/utils.js';

const logger = new LoggerService('AutonomousLoop');

export interface AutoLoopPoint {
  value: string | number;
  jobId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  objective?: number | null;
  metrics?: Record<string, string | number>;
  error?: string;
}

export interface AutonomousRun {
  id: string;
  experimentId: string;
  parameter: string;
  objectiveMetric?: string;
  goal?: string;
  providers?: string[];
  status: 'running' | 'concluding' | 'completed' | 'failed' | 'stopped';
  points: AutoLoopPoint[];
  currentIndex: number;
  conclusion?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StartAutoLoopInput {
  experimentId: string;
  parameter: string;
  values: Array<string | number>;
  objectiveMetric?: string;
  goal?: string;
  providers?: string[];
}

/**
 * Dependencies the loop needs, injected so the orchestration can be unit-tested
 * without a real solver or AI provider.
 */
export interface AutoLoopDeps {
  /** Launch one run at a parameter value and resolve when it reaches a terminal state. */
  runPoint: (
    experimentId: string,
    parameter: string,
    value: string | number
  ) => Promise<{ jobId: string; ok: boolean; metrics?: Record<string, string | number>; error?: string }>;
  /** Produce a natural-language conclusion from the completed run. */
  conclude: (run: AutonomousRun) => Promise<string>;
}

const MAX_POINTS = 40;
const POLL_INTERVAL_MS = 1000;
const DEFAULT_JOB_TIMEOUT_MS = 3_600_000; // matches the solver's own hard cap

/** Poll a job to a terminal state, returning its final record. */
async function waitForJob(jobId: string, timeoutMs = DEFAULT_JOB_TIMEOUT_MS): Promise<{ status: string } | undefined> {
  const start = Date.now();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const job = simulationRepository.findById(jobId);
    const status = job?.status;
    if (status === 'Completed' || status === 'Failed' || status === 'Cancelled') {
      return { status };
    }
    if (Date.now() - start > timeoutMs) {
      return { status: status || 'Timeout' };
    }
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
  }
}

/** Pick the objective value from a metrics map: exact/substring match, else first numeric. */
export function pickObjective(
  metrics: Record<string, string | number> | undefined,
  objectiveMetric?: string
): number | null {
  if (!metrics) return null;
  const toNum = (v: unknown): number | null => {
    const n = typeof v === 'number' ? v : parseFloat(String(v));
    return Number.isFinite(n) ? n : null;
  };
  if (objectiveMetric) {
    const wanted = objectiveMetric.toLowerCase();
    const exact = Object.keys(metrics).find((k) => k.toLowerCase() === wanted);
    if (exact) return toNum(metrics[exact]);
    const sub = Object.keys(metrics).find((k) => k.toLowerCase().includes(wanted));
    if (sub) return toNum(metrics[sub]);
  }
  for (const v of Object.values(metrics)) {
    const n = toNum(v);
    if (n !== null) return n;
  }
  return null;
}

/** The default runner: drive a real engine run and read its unified metrics. */
async function defaultRunPoint(
  experimentId: string,
  parameter: string,
  value: string | number
): Promise<{ jobId: string; ok: boolean; metrics?: Record<string, string | number>; error?: string }> {
  const job = await simulationEngineOrchestrator.submitAndExecute({
    experimentId,
    parameters: { parameterOverrides: { [parameter]: value } },
  });
  const final = await waitForJob(job.id);
  if (final?.status !== 'Completed') {
    const rec = simulationRepository.findById(job.id);
    return { jobId: job.id, ok: false, error: rec?.error || `Run ended with status ${final?.status}` };
  }
  const res = resultManager.getResultsByJob(job.id);
  const metrics = (res?.metrics as Record<string, string | number>) || {};
  return { jobId: job.id, ok: true, metrics };
}

/** The default conclusion: ask the configured AI provider(s) to summarize the sweep. */
async function defaultConclude(run: AutonomousRun): Promise<string> {
  const table = run.points
    .map((p) => `${run.parameter}=${p.value}: ${p.status}${p.objective != null ? ` → ${p.objective}` : ''}${p.error ? ` (${p.error})` : ''}`)
    .join('\n');
  const prompt = `An autonomous parameter sweep just finished for parameter "${run.parameter}"${
    run.objectiveMetric ? ` tracking "${run.objectiveMetric}"` : ''
  }.${run.goal ? ` Goal: ${run.goal}.` : ''}\n\nResults per point:\n${table}\n\nWrite a concise scientific conclusion: the trend, the best operating point, any failed points, and the recommended next step.`;
  try {
    const res = await aiEngine.generateChatResponse({
      prompt,
      experimentId: run.experimentId,
      providers: run.providers,
    });
    return res.text;
  } catch (err) {
    // Honest fallback: no provider / provider failed — return the raw table.
    return `Autonomous sweep of ${run.parameter} completed.\n\n${table}\n\n(AI conclusion unavailable: ${(err as Error).message})`;
  }
}

export class AutonomousLoopService {
  private runs = new Map<string, AutonomousRun>();
  private stopFlags = new Set<string>();

  constructor(private deps: AutoLoopDeps = { runPoint: defaultRunPoint, conclude: defaultConclude }) {}

  public start(input: StartAutoLoopInput): AutonomousRun {
    const exp = experimentRepository.findById(input.experimentId);
    if (!exp) {
      throw new Error(`Experiment "${input.experimentId}" not found.`);
    }
    if (!input.parameter || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(input.parameter)) {
      throw new Error('A valid COMSOL parameter name is required.');
    }
    const values = (input.values || []).filter((v) => v !== undefined && v !== null);
    if (!values.length) {
      throw new Error('At least one parameter value is required to sweep.');
    }
    if (values.length > MAX_POINTS) {
      throw new Error(`A sweep supports at most ${MAX_POINTS} points (got ${values.length}).`);
    }

    const now = getCurrentTimestamp();
    const run: AutonomousRun = {
      id: generateId('auto'),
      experimentId: input.experimentId,
      parameter: input.parameter,
      objectiveMetric: input.objectiveMetric,
      goal: input.goal,
      providers: input.providers,
      status: 'running',
      points: values.map((value) => ({ value, status: 'pending' })),
      currentIndex: 0,
      createdAt: now,
      updatedAt: now,
    };
    this.runs.set(run.id, run);
    // Fire and forget; the UI polls getStatus.
    void this.execute(run.id);
    return run;
  }

  public getStatus(runId: string): AutonomousRun | undefined {
    return this.runs.get(runId);
  }

  public stop(runId: string): AutonomousRun | undefined {
    const run = this.runs.get(runId);
    if (run && (run.status === 'running' || run.status === 'concluding')) {
      this.stopFlags.add(runId);
    }
    return run;
  }

  private touch(run: AutonomousRun): void {
    run.updatedAt = getCurrentTimestamp();
    this.runs.set(run.id, run);
  }

  private async execute(runId: string): Promise<void> {
    const run = this.runs.get(runId);
    if (!run) return;
    try {
      for (let i = 0; i < run.points.length; i++) {
        if (this.stopFlags.has(runId)) {
          run.status = 'stopped';
          this.touch(run);
          return;
        }
        run.currentIndex = i;
        const point = run.points[i];
        point.status = 'running';
        this.touch(run);

        try {
          const r = await this.deps.runPoint(run.experimentId, run.parameter, point.value);
          point.jobId = r.jobId;
          if (r.ok) {
            point.status = 'completed';
            point.metrics = r.metrics;
            point.objective = pickObjective(r.metrics, run.objectiveMetric);
          } else {
            point.status = 'failed';
            point.error = r.error;
          }
        } catch (err) {
          point.status = 'failed';
          point.error = (err as Error).message;
        }
        this.touch(run);
      }

      run.status = 'concluding';
      this.touch(run);
      run.conclusion = await this.deps.conclude(run);
      run.status = 'completed';
      this.touch(run);
      logger.info(`Autonomous run ${runId} completed over ${run.points.length} points.`);
    } catch (err) {
      run.status = 'failed';
      run.error = (err as Error).message;
      this.touch(run);
      logger.error(`Autonomous run ${runId} failed: ${(err as Error).message}`);
    } finally {
      this.stopFlags.delete(runId);
    }
  }
}

export const autonomousLoopService = new AutonomousLoopService();
