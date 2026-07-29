import { SimulationJob } from '../../shared/types.js';
import { ISimulationJobRequest } from '../types.js';
import { simulationRepository } from '../../repositories/simulationRepository.js';
import { experimentRepository } from '../../repositories/experimentRepository.js';
import { pluginRepository } from '../../repositories/pluginRepository.js';
import { ValidationError, NotFoundError } from '../../shared/errors.js';
import { config } from '../../configuration/index.js';
import { generateId, getCurrentTimestamp, formatLogTimestamp } from '../../shared/utils.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('JobManager');

export class SimulationJobManager {
  public createJob(request: ISimulationJobRequest): SimulationJob {
    if (!request.experimentId) {
      throw new ValidationError('experimentId is required to create a simulation job.');
    }

    const experiment = experimentRepository.findById(request.experimentId);
    if (!experiment) {
      throw new NotFoundError(`Experiment with ID ${request.experimentId} not found.`);
    }

    const plugin = pluginRepository.findById(experiment.pluginId);
    const pluginName = plugin?.name || 'TCAD Simulator Engine';

    const newJob: SimulationJob = {
      id: generateId('sim-job'),
      experimentId: experiment.id,
      experimentTitle: experiment.title,
      pluginId: experiment.pluginId,
      pluginName,
      status: 'Queued',
      progress: 0,
      startTime: getCurrentTimestamp(),
      cpuUsage: config.simulation.defaultCpuUsage,
      memoryUsage: config.simulation.defaultMemoryUsageGb,
      hostMachine: config.simulation.defaultHostMachine,
      logs: [
        `[${formatLogTimestamp()}] Job created for experiment "${experiment.title}"`,
        `[${formatLogTimestamp()}] Initializing generic simulation pipeline context...`,
      ],
    };

    simulationRepository.create(newJob);
    logger.info(`Simulation job created: ${newJob.id} for experiment ${experiment.id}`);
    return newJob;
  }

  public validateJob(jobId: string): { isValid: boolean; errors: string[] } {
    const job = simulationRepository.findById(jobId);
    if (!job) {
      return { isValid: false, errors: [`Job ${jobId} does not exist.`] };
    }

    const experiment = experimentRepository.findById(job.experimentId);
    if (!experiment) {
      return { isValid: false, errors: [`Associated experiment ${job.experimentId} not found.`] };
    }

    const errors: string[] = [];
    if (!job.pluginId) {
      errors.push('Plugin ID missing on job.');
    }

    const isValid = errors.length === 0;
    if (isValid) {
      simulationRepository.appendLog(jobId, `[${formatLogTimestamp()}] Job payload and experiment schema validated successfully.`);
    } else {
      simulationRepository.appendLog(jobId, `[${formatLogTimestamp()}] Job validation failed: ${errors.join(', ')}`);
    }

    return { isValid, errors };
  }

  public storeMetadata(jobId: string, metadata: Record<string, unknown>): void {
    const job = simulationRepository.findById(jobId);
    if (!job) return;

    simulationRepository.appendLog(
      jobId,
      `[${formatLogTimestamp()}] Metadata stored. Execution summary: ${JSON.stringify(metadata)}`
    );
    logger.info(`Stored metadata for job ${jobId}`);
  }

  public getJob(jobId: string): SimulationJob | undefined {
    return simulationRepository.findById(jobId);
  }
}

export const simulationJobManager = new SimulationJobManager();
