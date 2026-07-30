import { ISimulationJobRequest, ISimulationExecutionContext } from '../types.js';
import { SimulationJob } from '../../shared/types.js';
import { simulationLifecycleManager } from '../lifecycle/index.ts';
import { simulationJobManager } from '../job-manager/index.ts';
import { simulationScheduler } from '../scheduler/index.ts';
import { workerManager } from '../worker-manager/index.ts';
import { simulationExecutionManager } from '../execution/index.ts';
import { simulationMonitor } from '../monitor/index.ts';
import { simulationStatusTracker } from '../status/index.ts';
import { simulationHistoryRepository } from '../history/index.ts';
import { workspaceManager } from '../../workspace/index.js';
import { resultManager } from '../../results/index.js';
import { notificationService } from '../../notifications/notificationService.js';
import { experimentRepository } from '../../repositories/experimentRepository.js';
import { simulationRepository } from '../../repositories/simulationRepository.js';
import { modelRepository } from '../../repositories/modelRepository.js';
import { resolvePluginId } from '../pluginResolver.js';
import { LoggerService } from '../../logging/logger.js';
import { generateId, getCurrentTimestamp, formatLogTimestamp } from '../../shared/utils.js';

const logger = new LoggerService('SimulationEngineOrchestrator');

export class SimulationEngineOrchestrator {
  /**
   * Executes the full enterprise simulation pipeline passing through all 10 mandated stages:
   * Create Job -> Create Isolated Workspace -> Validate -> Queue -> Worker Assignment -> Execution -> Monitoring -> Collect Results -> Store Metadata -> Notify User -> Complete
   */
  public async submitAndExecute(request: ISimulationJobRequest): Promise<SimulationJob> {
    // STAGE 1: Create Job & Create Isolated Workspace
    logger.info(`[Pipeline Stage 1] Creating Job for experiment ${request.experimentId}`);
    const job = simulationJobManager.createJob(request);
    simulationLifecycleManager.initializeJobState(job.id);

    // Build isolated workspace: workspace/experiment-id/run-id/{input,output,logs,temp,reports}
    const workspace = await workspaceManager.createWorkspace(request.experimentId, job.id);
    workspaceManager.appendExecutionLog(
      request.experimentId,
      job.id,
      `[${formatLogTimestamp()}] Workspace initialized at ${workspace.paths.root}`
    );

    // STAGE 2: Validate
    logger.info(`[Pipeline Stage 2] Validating Job ${job.id}`);
    simulationLifecycleManager.transitionTo(job.id, 'VALIDATED', 'Validation in progress');
    const validation = simulationJobManager.validateJob(job.id);
    if (!validation.isValid) {
      simulationLifecycleManager.transitionTo(job.id, 'FAILED', `Validation failed: ${validation.errors.join(', ')}`);
      workspaceManager.setWorkspaceStatus(request.experimentId, job.id, 'CORRUPTED');
      throw new Error(`Job Validation Error: ${validation.errors.join(', ')}`);
    }

    // STAGE 3: Queue
    logger.info(`[Pipeline Stage 3] Queueing Job ${job.id}`);
    simulationLifecycleManager.transitionTo(job.id, 'QUEUED', 'Enqueued for scheduling');
    // NB: the engine owns this job's execution and its simulationRepository
    // status end-to-end. It must NOT also hand the job to the enterprise
    // scheduler — the scheduler's dispatch would concurrently rewrite the job's
    // status back to "Running" after the engine already marked it "Completed",
    // leaving it stuck. The scheduler remains available for its own queue APIs.
    experimentRepository.update(job.experimentId, { status: 'Queued' });

    // Asynchronously kick off dispatch pipeline
    this.processPipelineAsync(job.id, request.experimentId);

    return job;
  }

  private async processPipelineAsync(jobId: string, experimentId: string): Promise<void> {
    try {
      // STAGE 4: Worker Assignment. Execute the job we were given directly —
      // using the scheduler's "next queued" here races when several jobs are
      // queued and could execute the wrong one.
      const dequeuedJobId = jobId;
      logger.info(`[Pipeline Stage 4] Worker Assignment for Job ${dequeuedJobId}`);
      
      simulationLifecycleManager.transitionTo(dequeuedJobId, 'ASSIGNED', 'Assigning worker node');
      const worker = workerManager.assignWorker(dequeuedJobId);

      // STAGE 5: Execution Initialization
      logger.info(`[Pipeline Stage 5] Executing Job ${dequeuedJobId} on worker ${worker.id}`);
      simulationLifecycleManager.transitionTo(dequeuedJobId, 'EXECUTING', `Executing on node ${worker.hostname}`);
      simulationRepository.update(dequeuedJobId, { status: 'Running', progress: 15 });
      experimentRepository.update(experimentId, { status: 'Running' });
      workspaceManager.setWorkspaceStatus(experimentId, dequeuedJobId, 'ACTIVE');

      // STAGE 6: Monitoring
      logger.info(`[Pipeline Stage 6] Attaching Telemetry Monitoring for Job ${dequeuedJobId}`);
      simulationLifecycleManager.transitionTo(dequeuedJobId, 'MONITORING', 'Live telemetry active');
      simulationMonitor.startMonitoring(dequeuedJobId);

      const job = simulationRepository.findById(dequeuedJobId);
      let workspacePath = '';
      try {
        const ws = workspaceManager.getWorkspace(experimentId, dequeuedJobId);
        workspacePath = ws.paths.root;
      } catch {
        // Fallback if key missing
      }

      const jobParams = (job?.parameters as Record<string, unknown>) || {};

      // Resolve the experiment's model so we can (a) route to the real solver
      // plugin by simulator, and (b) hand the solver the actual model file path.
      const experiment = experimentRepository.findById(experimentId);
      const model = experiment?.modelId ? modelRepository.findById(experiment.modelId) : undefined;
      const simulatorName = model?.simulator || experiment?.simulator;

      const resolvedPluginId =
        resolvePluginId(job?.pluginId, simulatorName) ||
        job?.pluginId ||
        (jobParams.solverPluginId as string) ||
        'sentaurus-tcad';

      // The solver reads the model from an absolute path when provided (e.g. the
      // user's own COMSOL .mph on disk); otherwise it falls back to a file in
      // the run workspace input/ folder.
      const inputModelPath = (jobParams.inputModelPath as string) || model?.absolutePath;

      const executionContext: ISimulationExecutionContext = {
        jobId: dequeuedJobId,
        workerId: worker.id,
        experimentId,
        pluginId: resolvedPluginId,
        parameters: inputModelPath ? { ...jobParams, inputModelPath } : jobParams,
        workspacePath,
        startTime: getCurrentTimestamp(),
      };

      // Trigger Execution via Adapter interface
      simulationStatusTracker.updateJobProgress(dequeuedJobId, 45);
      const executionResult = await simulationExecutionManager.runExecution(executionContext);

      // STAGE 7: Collect Results & Write Artifacts to Isolated Workspace
      logger.info(`[Pipeline Stage 7] Collecting Simulation Results for Job ${dequeuedJobId}`);
      simulationLifecycleManager.transitionTo(dequeuedJobId, 'COLLECTING', 'Gathering metrics and curve vectors');
      simulationStatusTracker.updateJobProgress(dequeuedJobId, 85);

      if (executionResult.results) {
        // Convert raw results to Unified ARP Format via ResultManager
        const unifiedResults = await resultManager.processAndStoreRawResult(
          job?.pluginId || 'plugin-generic',
          executionResult.results,
          {
            experimentId,
            jobId: dequeuedJobId,
            pluginId: job?.pluginId || 'plugin-generic',
          },
          'JSON'
        );

        experimentRepository.update(experimentId, {
          results: unifiedResults as any,
          status: 'Completed',
        });

        // Save result artifacts directly into isolated workspace output & reports folders
        workspaceManager.writeOutputFile(
          experimentId,
          dequeuedJobId,
          'simulation_results.json',
          JSON.stringify(unifiedResults, null, 2)
        );
        workspaceManager.writeReportFile(
          experimentId,
          dequeuedJobId,
          'summary_report.json',
          JSON.stringify({
            jobId: dequeuedJobId,
            experimentId,
            unifiedResultId: unifiedResults.id,
            metrics: unifiedResults.metrics,
            durationSeconds: executionResult.durationSeconds,
            generatedAt: getCurrentTimestamp(),
          }, null, 2)
        );
      }

      // STAGE 8: Store Metadata
      logger.info(`[Pipeline Stage 8] Storing Metadata for Job ${dequeuedJobId}`);
      simulationLifecycleManager.transitionTo(dequeuedJobId, 'METADATA_STORED', 'Writing metadata audit log');
      
      const endTime = getCurrentTimestamp();
      simulationJobManager.storeMetadata(dequeuedJobId, {
        durationSeconds: executionResult.durationSeconds,
        exitCode: executionResult.exitCode,
        workerHost: worker.hostname,
        collectedMetricsCount: Object.keys(executionResult.results?.metrics || {}).length,
      });

      simulationRepository.update(dequeuedJobId, {
        status: 'Completed',
        progress: 100,
        endTime,
        durationSeconds: executionResult.durationSeconds,
        exitCode: executionResult.exitCode,
      });

      // Snapshot workspace version & cleanup temp folder
      await workspaceManager.snapshotVersion(experimentId, dequeuedJobId, 'Execution Complete Snapshot');
      await workspaceManager.cleanupTemp(experimentId, dequeuedJobId);
      workspaceManager.setWorkspaceStatus(experimentId, dequeuedJobId, 'READY');

      // Record in persistent history repository
      simulationHistoryRepository.recordHistory({
        id: generateId('hist'),
        jobId: dequeuedJobId,
        experimentId,
        status: 'COMPLETED',
        startTime: executionContext.startTime,
        endTime,
        workerId: worker.id,
        durationSeconds: executionResult.durationSeconds,
        exitCode: executionResult.exitCode,
        metricsSummary: executionResult.results?.metrics,
      });

      // Cleanup worker and monitoring probe
      workerManager.releaseWorker(worker.id, dequeuedJobId);
      simulationMonitor.stopMonitoring(dequeuedJobId);

      // STAGE 9: Notify User
      logger.info(`[Pipeline Stage 9] Sending Completion Notification for Job ${dequeuedJobId}`);
      notificationService.sendNotification(
        'Simulation Pipeline Completed',
        `Job ${dequeuedJobId} successfully completed through all 9 pipeline stages on ${worker.hostname}.`,
        'success'
      );

      // Final Completion Transition
      simulationLifecycleManager.transitionTo(dequeuedJobId, 'COMPLETED', 'Simulation pipeline completed successfully');
      simulationRepository.appendLog(
        dequeuedJobId,
        `[${formatLogTimestamp()}] Simulation pipeline finished. All artifacts stored and notified.`
      );

    } catch (err: any) {
      logger.error(`Pipeline failure on job ${jobId}`, { error: err.message });
      simulationLifecycleManager.transitionTo(jobId, 'FAILED', err.message);
      simulationRepository.update(jobId, { status: 'Failed', error: err.message });
      experimentRepository.update(experimentId, { status: 'Failed' });
      workspaceManager.setWorkspaceStatus(experimentId, jobId, 'CORRUPTED');
      notificationService.sendNotification(
        'Simulation Pipeline Failed',
        `Job ${jobId} failed during execution: ${err.message}`,
        'error'
      );
    }
  }
}

export const simulationEngineOrchestrator = new SimulationEngineOrchestrator();

// The engine drives execution itself via processPipelineAsync (Stages 4-8).
// Do NOT wire the scheduler's execution handler back to submitAndExecute:
// submitAndExecute enqueues into the scheduler, and the scheduler tick would
// call the handler, which would submitAndExecute again — an unbounded loop that
// spawns a new job every cycle and floods the event loop with synchronous
// filesystem writes until the server stops responding. The scheduler is used
// for queue/worker bookkeeping only; the engine is the single execution driver.
simulationScheduler; // ensure initialization
