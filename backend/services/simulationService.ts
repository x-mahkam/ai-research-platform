import { simulationRepository, ISimulationRepository } from '../repositories/simulationRepository.js';
import { simulationEngineOrchestrator, SimulationEngineOrchestrator } from '../simulation/index.js';
import { scheduler, Scheduler, QueuePolicyMode } from '../scheduler/index.js';
import { SimulationJob } from '../shared/types.js';
import { NotFoundError } from '../shared/errors.js';

export class SimulationService {
  constructor(
    private repo: ISimulationRepository = simulationRepository,
    private engine: SimulationEngineOrchestrator = simulationEngineOrchestrator,
    private sched: Scheduler = scheduler
  ) {}

  public getAllJobs(): SimulationJob[] {
    return this.repo.findAll();
  }

  public getJobById(id: string): SimulationJob {
    const job = this.repo.findById(id);
    if (!job) {
      throw new NotFoundError(`Simulation job with ID ${id} not found.`);
    }
    return job;
  }

  public runSimulation(experimentId: string): Promise<SimulationJob> {
    const job = this.sched.submitJob({ experimentId });
    return Promise.resolve(this.getJobById(job.id));
  }

  public executeJobAction(id: string, action: 'pause' | 'resume' | 'cancel' | 'retry'): SimulationJob {
    if (action === 'pause') {
      this.repo.update(id, { status: 'Paused' });
    } else if (action === 'resume') {
      this.repo.update(id, { status: 'Running' });
      this.sched.tick();
    } else if (action === 'cancel') {
      this.sched.cancelJob(id);
    } else if (action === 'retry') {
      this.sched.retryJob(id);
    }
    return this.getJobById(id);
  }

  public getSchedulerState() {
    return this.sched.getSchedulerState();
  }

  public pauseQueue() {
    this.sched.pauseQueue();
    return this.sched.getSchedulerState();
  }

  public resumeQueue() {
    this.sched.resumeQueue();
    return this.sched.getSchedulerState();
  }

  public setQueuePolicy(mode: QueuePolicyMode) {
    this.sched.setPolicyMode(mode);
    return this.sched.getSchedulerState();
  }

  public setConcurrency(concurrency: number) {
    this.sched.setConcurrency(concurrency);
    return this.sched.getSchedulerState();
  }

  public triggerWorkerRecovery() {
    this.sched.recoverStaleWorkers();
    return this.sched.getSchedulerState();
  }
}

export const simulationService = new SimulationService();
