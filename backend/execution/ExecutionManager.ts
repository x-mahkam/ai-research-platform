import { LoggerService } from '../logging/logger.js';
import { executionDispatcher, ExecutionDispatcher } from './ExecutionDispatcher.js';
import { ExecutionNode, IExecutionNodeInit } from './ExecutionNode.js';
import { executionQueue, ExecutionQueue } from './ExecutionQueue.js';
import { jobDistributor, JobDistributor } from './JobDistributor.js';
import { nodeHealthMonitor, NodeHealthMonitor } from './NodeHealthMonitor.js';
import { nodeRegistry, NodeRegistry } from './NodeRegistry.js';
import { resourceScheduler, ResourceScheduler } from './ResourceScheduler.js';
import { IDistributedJob, IExecutionRequest, IExecutionResult } from './types.js';

const logger = new LoggerService('ExecutionManager');

export class ExecutionManager {
  private registry: NodeRegistry;
  private healthMonitor: NodeHealthMonitor;
  private scheduler: ResourceScheduler;
  private queue: ExecutionQueue;
  private dispatcher: ExecutionDispatcher;
  private distributor: JobDistributor;

  constructor(
    registry: NodeRegistry = nodeRegistry,
    healthMonitor: NodeHealthMonitor = nodeHealthMonitor,
    scheduler: ResourceScheduler = resourceScheduler,
    queue: ExecutionQueue = executionQueue,
    dispatcher: ExecutionDispatcher = executionDispatcher,
    distributor: JobDistributor = jobDistributor
  ) {
    this.registry = registry;
    this.healthMonitor = healthMonitor;
    this.scheduler = scheduler;
    this.queue = queue;
    this.dispatcher = dispatcher;
    this.distributor = distributor;

    // Start health monitoring and dispatch loops
    this.healthMonitor.startMonitoring(15000);
    this.dispatcher.startDispatcher(300);
  }

  /**
   * Submit a single simulation job to the distributed engine.
   */
  public async submitJob(request: IExecutionRequest, priority = 5): Promise<IDistributedJob> {
    logger.info(`ExecutionManager receiving single job submission (${request.executablePath})`);
    return this.distributor.distributeSingle(request, priority);
  }

  /**
   * Submit a batch of simulation jobs.
   */
  public async submitBatch(requests: IExecutionRequest[], priority = 5): Promise<IDistributedJob[]> {
    logger.info(`ExecutionManager receiving batch submission (${requests.length} jobs)`);
    return this.distributor.distributeBatch(requests, priority);
  }

  /**
   * Submit a multidimensional parameter sweep.
   */
  public async submitParameterSweep(
    baseRequest: IExecutionRequest,
    sweepParameters: Record<string, number[] | string[]>,
    priority = 5
  ): Promise<IDistributedJob[]> {
    logger.info(`ExecutionManager receiving parameter sweep submission`);
    return this.distributor.distributeParameterSweep(baseRequest, sweepParameters, priority);
  }

  /**
   * Submit Monte Carlo statistical runs.
   */
  public async submitMonteCarlo(
    baseRequest: IExecutionRequest,
    sampleCount: number,
    distributionMap: Record<string, { mean: number; stdDev: number }>,
    priority = 5
  ): Promise<IDistributedJob[]> {
    logger.info(`ExecutionManager receiving Monte Carlo submission (${sampleCount} runs)`);
    return this.distributor.distributeMonteCarlo(baseRequest, sampleCount, distributionMap, priority);
  }

  /**
   * Submit optimization evaluation candidate batch.
   */
  public async submitOptimization(
    baseRequest: IExecutionRequest,
    candidates: Array<Record<string, number | string>>,
    priority = 3
  ): Promise<IDistributedJob[]> {
    logger.info(`ExecutionManager receiving optimization batch (${candidates.length} candidates)`);
    return this.distributor.distributeOptimization(baseRequest, candidates, priority);
  }

  /**
   * Retrieves status for a given job ID.
   */
  public getJobStatus(jobId: string): IDistributedJob | undefined {
    return this.queue.getJob(jobId);
  }

  /**
   * Cancels a queued or running job.
   */
  public async cancelJob(jobId: string): Promise<boolean> {
    logger.info(`ExecutionManager cancelling Job [${jobId}]`);
    return this.queue.cancel(jobId);
  }

  /**
   * Retrieves list of all registered execution nodes.
   */
  public getNodes(): ExecutionNode[] {
    return this.registry.getAllNodes();
  }

  /**
   * Registers a new execution node dynamically.
   */
  public registerNode(init: IExecutionNodeInit): ExecutionNode {
    const node = new ExecutionNode(init);
    this.registry.registerNode(node);
    return node;
  }

  /**
   * Handles node failure recovery: moves running jobs off failed node and reassigns them to healthy nodes.
   */
  public async handleNodeFailure(nodeId: string): Promise<void> {
    const node = this.registry.getNode(nodeId);
    if (!node) return;

    logger.warn(`Node failure detected on [${nodeId}]. Initiating job recovery and re-assignment...`);
    this.registry.updateNodeState(nodeId, 'Unreachable');

    const runningJobs = Array.from(node.runningJobIds);
    for (const jobId of runningJobs) {
      node.releaseJob(jobId, 1, 1024);
      logger.warn(`Moving Job [${jobId}] from failed node [${nodeId}] back to queue for reassignment.`);
      this.queue.requeue(jobId, `Execution node ${nodeId} failed or became unreachable`);
    }

    // Force queue processing cycle to reassign moved jobs immediately
    await this.dispatcher.processQueue();
  }

  /**
   * Graceful shutdown of execution loops.
   */
  public stop(): void {
    this.healthMonitor.stopMonitoring();
    this.dispatcher.stopDispatcher();
    logger.info('ExecutionManager shut down cleanly.');
  }
}

export const executionManager = new ExecutionManager();
