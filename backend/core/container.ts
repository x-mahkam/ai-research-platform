import path from 'path';
import { persistentDbEngine, PersistentDatabaseEngine } from '../database/engine.js';
import { transactionManager, TransactionManager } from '../transactions/index.js';
import { migrationManager, MigrationManager } from '../migrations/index.js';

import { projectRepository, ProjectRepository } from '../repositories/projectRepository.js';
import { experimentRepository, ExperimentRepository } from '../repositories/experimentRepository.js';
import { simulationRepository, SimulationRepository } from '../repositories/simulationRepository.js';
import { pluginRepository, PluginRepository } from '../repositories/pluginRepository.js';
import { reportRepository, ReportRepository } from '../repositories/reportRepository.js';
import { jobRepository, JobRepository } from '../repositories/jobRepository.js';
import { resultRepository, ResultRepository } from '../repositories/resultRepository.js';
import { userRepository, UserRepository } from '../repositories/userRepository.js';
import { notificationRepository, NotificationRepository } from '../repositories/notificationRepository.js';
import { aiSessionRepository, AISessionRepository } from '../repositories/aiSessionRepository.js';
import { knowledgeBaseRepository, KnowledgeBaseRepository } from '../repositories/knowledgeBaseRepository.js';

export class DIContainer {
  private static instance: DIContainer;

  // Database & System Infra
  public readonly dbEngine: PersistentDatabaseEngine = persistentDbEngine;
  public readonly transactionManager: TransactionManager = transactionManager;
  public readonly migrationManager: MigrationManager = migrationManager;

  // Repositories
  public readonly projectRepository: ProjectRepository = projectRepository;
  public readonly experimentRepository: ExperimentRepository = experimentRepository;
  public readonly simulationRepository: SimulationRepository = simulationRepository;
  public readonly pluginRepository: PluginRepository = pluginRepository;
  public readonly reportRepository: ReportRepository = reportRepository;
  public readonly jobRepository: JobRepository = jobRepository;
  public readonly resultRepository: ResultRepository = resultRepository;
  public readonly userRepository: UserRepository = userRepository;
  public readonly notificationRepository: NotificationRepository = notificationRepository;
  public readonly aiSessionRepository: AISessionRepository = aiSessionRepository;
  public readonly knowledgeBaseRepository: KnowledgeBaseRepository = knowledgeBaseRepository;

  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  public async initialize(): Promise<void> {
    // Connect to the store and load data into memory before anything reads it.
    // Seeds from the committed JSON baseline on a fresh (empty) database.
    await this.dbEngine.init({ seedJsonPath: path.join(process.cwd(), 'storage', 'database.json') });

    // Run schema migrations on container initialization
    await this.migrationManager.runPendingMigrations();

    // Reconcile runs interrupted by a previous shutdown. Execution is driven by
    // an in-memory async pipeline, so any job/experiment persisted as non-
    // terminal (Running/Queued/Paused) after a restart is orphaned — its driver
    // is gone. Mark them Failed so the UI doesn't show a perpetual "Running".
    this.reconcileInterruptedRuns();
  }

  private reconcileInterruptedRuns(): void {
    const NON_TERMINAL = new Set(['Running', 'Queued', 'Paused', 'Executing']);
    const reason = 'Interrupted by a server restart before completion.';
    let jobsFixed = 0;
    for (const job of this.simulationRepository.findAll()) {
      if (NON_TERMINAL.has(job.status as string)) {
        this.simulationRepository.update(job.id, { status: 'Failed', error: job.error || reason });
        jobsFixed++;
      }
    }
    let expsFixed = 0;
    for (const exp of this.experimentRepository.findAll()) {
      if (NON_TERMINAL.has(exp.status as string)) {
        this.experimentRepository.update(exp.id, { status: 'Failed' });
        expsFixed++;
      }
    }
    if (jobsFixed || expsFixed) {
      // eslint-disable-next-line no-console
      console.warn(`[startup] Reconciled ${jobsFixed} interrupted job(s) and ${expsFixed} experiment(s) to Failed.`);
    }
  }
}

export const container = DIContainer.getInstance();
