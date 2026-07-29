import crypto from 'crypto';
import { LoggerService } from '../logging/logger.js';
import { executionQueue, ExecutionQueue } from './ExecutionQueue.js';
import { DistributedJobType, IDistributedJob, IExecutionRequest } from './types.js';

const logger = new LoggerService('JobDistributor');

export class JobDistributor {
  private queue: ExecutionQueue;

  constructor(queue: ExecutionQueue = executionQueue) {
    this.queue = queue;
  }

  /**
   * Generates a deterministic hash for a job to prevent job duplication.
   */
  private generateJobHash(request: IExecutionRequest, index = 0): string {
    const payload = JSON.stringify({
      exec: request.executablePath,
      args: request.arguments,
      dir: request.workingDirectory,
      env: request.environmentVariables,
      index,
    });
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  /**
   * Distributes a single simulation request.
   */
  public distributeSingle(request: IExecutionRequest, priority = 5): IDistributedJob {
    const jobId = `job-single-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const hash = this.generateJobHash(request);

    const job: IDistributedJob = {
      id: jobId,
      request,
      jobType: 'Single',
      priority,
      status: 'Queued',
      retryCount: 0,
      maxRetries: 3,
      createdAt: new Date().toISOString(),
      hash,
    };

    this.queue.enqueue(job);
    logger.info(`JobDistributor created Single Job [${jobId}]`);
    return job;
  }

  /**
   * Distributes a batch of simulation requests.
   */
  public distributeBatch(
    requests: IExecutionRequest[],
    priority = 5,
    batchId = `batch-${Date.now()}`
  ): IDistributedJob[] {
    logger.info(`JobDistributor creating batch [${batchId}] with ${requests.length} jobs`);

    const jobs: IDistributedJob[] = requests.map((req, idx) => {
      const jobId = `job-${batchId}-${idx + 1}`;
      const hash = this.generateJobHash(req, idx);

      return {
        id: jobId,
        request: req,
        jobType: 'Batch',
        batchId,
        priority,
        status: 'Queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        hash,
      };
    });

    this.queue.enqueueBatch(jobs);
    return jobs;
  }

  /**
   * Generates and distributes a parameter sweep across multidimensional parameter ranges.
   */
  public distributeParameterSweep(
    baseRequest: IExecutionRequest,
    sweepParameters: Record<string, number[] | string[]>,
    priority = 5
  ): IDistributedJob[] {
    const keys = Object.keys(sweepParameters);
    if (keys.length === 0) {
      return [this.distributeSingle(baseRequest, priority)];
    }

    // Generate Cartesian Product of parameter combinations
    const combinations: Array<Record<string, number | string>> = [];

    function generateCartesian(depth: number, current: Record<string, number | string>) {
      if (depth === keys.length) {
        combinations.push({ ...current });
        return;
      }
      const key = keys[depth];
      const values = sweepParameters[key];
      for (const val of values) {
        current[key] = val;
        generateCartesian(depth + 1, current);
      }
    }

    generateCartesian(0, {});

    const batchId = `sweep-${Date.now()}`;
    logger.info(
      `JobDistributor generating Parameter Sweep [${batchId}] (${combinations.length} combinations)`
    );

    const requests: IExecutionRequest[] = combinations.map((combo) => {
      // Build argument string overrides or environment variables for sweep
      const argOverrides = Object.entries(combo).map(([k, v]) => `--param:${k}=${v}`);
      return {
        ...baseRequest,
        arguments: [...(baseRequest.arguments || []), ...argOverrides],
        environmentVariables: {
          ...(baseRequest.environmentVariables || {}),
          ...Object.fromEntries(Object.entries(combo).map(([k, v]) => [k, String(v)])),
        },
      };
    });

    const jobs: IDistributedJob[] = requests.map((req, idx) => {
      const jobId = `job-${batchId}-${idx + 1}`;
      const hash = this.generateJobHash(req, idx);

      return {
        id: jobId,
        request: req,
        jobType: 'ParameterSweep',
        batchId,
        priority,
        status: 'Queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        hash,
      };
    });

    this.queue.enqueueBatch(jobs);
    return jobs;
  }

  /**
   * Generates and distributes Monte Carlo statistical simulation runs.
   */
  public distributeMonteCarlo(
    baseRequest: IExecutionRequest,
    sampleCount: number,
    distributionMap: Record<string, { mean: number; stdDev: number }>,
    priority = 5
  ): IDistributedJob[] {
    const batchId = `mc-${Date.now()}`;
    logger.info(
      `JobDistributor generating Monte Carlo simulation [${batchId}] (${sampleCount} runs)`
    );

    const requests: IExecutionRequest[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const sampledParams: Record<string, number> = {};
      for (const [paramName, dist] of Object.entries(distributionMap)) {
        // Box-Muller Gaussian random variable generator
        const u1 = Math.random();
        const u2 = Math.random();
        const z0 = Math.sqrt(-2.0 * Math.log(u1 || 0.0001)) * Math.cos(2.0 * Math.PI * u2);
        sampledParams[paramName] = dist.mean + z0 * dist.stdDev;
      }

      const argOverrides = Object.entries(sampledParams).map(
        ([k, v]) => `--mc:${k}=${v.toFixed(6)}`
      );

      requests.push({
        ...baseRequest,
        arguments: [...(baseRequest.arguments || []), ...argOverrides],
        environmentVariables: {
          ...(baseRequest.environmentVariables || {}),
          ...Object.fromEntries(
            Object.entries(sampledParams).map(([k, v]) => [k, String(v.toFixed(6))])
          ),
        },
      });
    }

    const jobs: IDistributedJob[] = requests.map((req, idx) => {
      const jobId = `job-${batchId}-${idx + 1}`;
      const hash = this.generateJobHash(req, idx);

      return {
        id: jobId,
        request: req,
        jobType: 'MonteCarlo',
        batchId,
        priority,
        status: 'Queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        hash,
      };
    });

    this.queue.enqueueBatch(jobs);
    return jobs;
  }

  /**
   * Distributes optimization candidate evaluations.
   */
  public distributeOptimization(
    baseRequest: IExecutionRequest,
    candidateParameterSets: Array<Record<string, number | string>>,
    priority = 3
  ): IDistributedJob[] {
    const batchId = `opt-${Date.now()}`;
    logger.info(
      `JobDistributor generating Optimization Batch [${batchId}] (${candidateParameterSets.length} candidates)`
    );

    const requests: IExecutionRequest[] = candidateParameterSets.map((params) => {
      const argOverrides = Object.entries(params).map(([k, v]) => `--opt:${k}=${v}`);
      return {
        ...baseRequest,
        arguments: [...(baseRequest.arguments || []), ...argOverrides],
        environmentVariables: {
          ...(baseRequest.environmentVariables || {}),
          ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
        },
      };
    });

    const jobs: IDistributedJob[] = requests.map((req, idx) => {
      const jobId = `job-${batchId}-${idx + 1}`;
      const hash = this.generateJobHash(req, idx);

      return {
        id: jobId,
        request: req,
        jobType: 'Optimization',
        batchId,
        priority,
        status: 'Queued',
        retryCount: 0,
        maxRetries: 3,
        createdAt: new Date().toISOString(),
        hash,
      };
    });

    this.queue.enqueueBatch(jobs);
    return jobs;
  }
}

export const jobDistributor = new JobDistributor();
