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
    // Run schema migrations on container initialization
    await this.migrationManager.runPendingMigrations();
  }
}

export const container = DIContainer.getInstance();
