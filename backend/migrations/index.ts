import { persistentDbEngine, PersistentDatabaseEngine } from '../database/engine.js';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('MigrationRunner');

export interface IMigration {
  version: number;
  name: string;
  up(db: PersistentDatabaseEngine): Promise<void>;
}

const INITIAL_PLUGINS = [
  {
    id: 'sentaurus-tcad',
    name: 'Synopsys Sentaurus TCAD',
    vendor: 'Synopsys Inc.',
    version: '2024.03',
    status: 'Active',
    description: 'Premier 2D/3D Semiconductor Device & Process Simulator for sub-5nm transistors, power electronics, and photonics.',
    licenseStatus: 'Valid',
    supportedOS: ['Linux RedHat 8/9', 'Windows Server 2022'],
    capabilities: {
      supports2DMesh: true,
      supports3D: true,
      supportsParallel: true,
      supportsOptimization: true,
      supportsPauseResume: true,
      supportedFileTypes: ['.cmd', '.tdr', '.plt', '.grd', '.par', '.msh'],
    },
  },
  {
    id: 'quantumatk',
    name: 'QuantumATK Atomic-Scale Simulator',
    vendor: 'Synopsys QuantumATK',
    version: '2023.12',
    status: 'Active',
    description: 'Atomic-scale modeling platform combining Density Functional Theory (DFT) and Non-Equilibrium Green Functions (NEGF).',
    licenseStatus: 'Valid',
    supportedOS: ['Linux Ubuntu/RedHat', 'Windows 11'],
    capabilities: {
      supports2DMesh: true,
      supports3D: true,
      supportsParallel: true,
      supportsOptimization: true,
      supportsPauseResume: false,
      supportedFileTypes: ['.py', '.nc', '.hdf5', '.xyz'],
    },
  },
  {
    id: 'comsol',
    name: 'COMSOL Multiphysics',
    vendor: 'COMSOL AB',
    version: '6.2',
    status: 'Active',
    description: 'Finite element analysis and multiphysics engineering modeling software.',
    licenseStatus: 'Valid',
    supportedOS: ['Windows 11/10', 'Linux x86_64'],
    capabilities: {
      supports2DMesh: true,
      supports3D: true,
      supportsParallel: true,
      supportsOptimization: true,
      supportsPauseResume: true,
      supportedFileTypes: ['.mph', '.m', '.java'],
    },
  },
  {
    id: 'lumerical',
    name: 'Ansys Lumerical FDTD',
    vendor: 'Ansys Inc.',
    version: '2024 R1',
    status: 'Active',
    description: 'Photonic component and photonic integrated circuit design simulation suite based on FDTD Maxwell solver.',
    licenseStatus: 'Valid',
    supportedOS: ['Windows 11', 'Linux RHEL'],
    capabilities: {
      supports2DMesh: true,
      supports3D: true,
      supportsParallel: true,
      supportsOptimization: true,
      supportsPauseResume: false,
      supportedFileTypes: ['.fsp', '.lsf'],
    },
  },
  {
    id: 'silvaco-atlas',
    name: 'Silvaco Atlas TCAD',
    vendor: 'Silvaco Inc.',
    version: '5.32.0.R',
    status: 'Active',
    description: '2D/3D device simulator for semiconductor technologies including Si, SiC, GaN, and organic semiconductors.',
    licenseStatus: 'Valid',
    supportedOS: ['Linux RHEL', 'Windows 10'],
    capabilities: {
      supports2DMesh: true,
      supports3D: true,
      supportsParallel: true,
      supportsOptimization: false,
      supportsPauseResume: false,
      supportedFileTypes: ['.in', '.str', '.log'],
    },
  },
];

const INITIAL_PROJECTS = [
  {
    id: 'proj-001',
    title: 'Semiconductor Device Quantum Transport',
    scientificField: 'Semiconductor',
    simulator: 'Synopsys Sentaurus TCAD',
    physicsModule: 'GAA / Hydrodynamic',
    researchGoal: 'Comprehensive TCAD transport optimization for silicon nanosheets.',
    description: 'Comprehensive TCAD modeling of multi-channel Silicon Nanosheet FETs.',
    principalInvestigator: 'Dr. Jasur Alimov',
    owner: 'Dr. Jasur Alimov',
    domain: 'Semiconductor',
    tags: ['Nanosheet', 'Sentaurus', 'TCAD'],
    status: 'Active',
    members: ['Dr. Jasur Alimov'],
    createdAt: '2026-06-10T09:00:00Z',
    updatedAt: '2026-07-27T10:30:00Z',
    favorite: true,
    experimentCount: 0,
    defaultModelId: 'mod-001',
  },
];

const INITIAL_MODELS = [
  {
    id: 'mod-001',
    projectId: 'proj-001',
    fileName: 'Nanosheet_Transport.cmd',
    fileType: '.cmd',
    simulator: 'Synopsys Sentaurus TCAD',
    physicsModule: 'GAA / Hydrodynamic',
    absolutePath: '/workspaces/projects/proj-001/models/Nanosheet_Transport.cmd',
    fileSize: 245760,
    checksum: 'sha256-e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    version: '2024.03',
    owner: 'Dr. Jasur Alimov',
    isDefault: true,
    createdAt: '2026-06-10T10:00:00Z',
    updatedAt: '2026-07-27T10:30:00Z',
    content: 'Device SentaurusTCAD {\n  Grid = "Nanosheet3nm.grd"\n  Physics = Hydrodynamic\n  Plot (eDensity hDensity eTemperature Potential)\n}',
    description: '3nm Multi-channel Nanosheet FET transport input command file',
  },
  {
    id: 'mod-002',
    projectId: 'proj-001',
    fileName: 'Nanosheet_Thermal_Hotspot.mph',
    fileType: '.mph',
    simulator: 'COMSOL Multiphysics',
    physicsModule: 'Heat Transfer',
    absolutePath: '/workspaces/projects/proj-001/models/Nanosheet_Thermal_Hotspot.mph',
    fileSize: 1843200,
    checksum: 'sha256-a1b2c3d4e5f67890123456789abcdef0123456789abcdef0123456789abcdef0',
    version: '6.2',
    owner: 'Dr. Jasur Alimov',
    createdAt: '2026-06-12T11:00:00Z',
    updatedAt: '2026-07-27T10:30:00Z',
    content: 'COMSOL MPH binary model file for 3D joule heating dissipation',
    description: 'COMSOL Multiphysics 3D thermal dissipation FEM model',
  },
];

export const migrationV1InitialSchema: IMigration = {
  version: 1,
  name: 'v1_initial_schema_and_seed',
  async up(db: PersistentDatabaseEngine): Promise<void> {
    logger.info('Running Migration v1: Seeding initial collections...');

    // Seed Projects
    const existingProjects = db.find('projects');
    if (existingProjects.length === 0) {
      for (const p of INITIAL_PROJECTS) {
        db.insert('projects', p as any);
      }
      logger.info(`Seeded ${INITIAL_PROJECTS.length} initial projects.`);
    }

    // Seed Models
    const existingModels = db.find('models');
    if (existingModels.length === 0) {
      for (const m of INITIAL_MODELS) {
        db.insert('models', m as any);
      }
      logger.info(`Seeded ${INITIAL_MODELS.length} initial model files.`);
    }

    // Seed Experiments
    const existingExperiments = db.find('experiments');
    if (existingExperiments.length === 0) {
      logger.info('Experiments collection initialized.');
    }

    // Seed Simulation Jobs
    const existingJobs = db.find('jobs');
    if (existingJobs.length === 0) {
      logger.info('Jobs collection initialized.');
    }

    // Seed Plugins
    const existingPlugins = db.find('plugins');
    if (existingPlugins.length === 0) {
      for (const pl of INITIAL_PLUGINS) {
        db.insert('plugins', pl as any);
      }
      logger.info(`Seeded ${INITIAL_PLUGINS.length} initial plugins.`);
    }

    // Seed Reports
    const existingReports = db.find('reports');
    if (existingReports.length === 0) {
      logger.info('Reports collection initialized.');
    }

    // Seed Users
    const existingUsers = db.find('users');
    if (existingUsers.length === 0) {
      db.insert('users', {
        id: 'usr-default-admin',
        name: 'Dr. Sarah Lin',
        email: 'xmahkam1990@gmail.com',
        role: 'ADMIN',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
      });
      logger.info('Seeded default admin user.');
    }

    // Seed Knowledge Base
    const existingKb = db.find('knowledgeBase');
    if (existingKb.length === 0) {
      db.insert('knowledgeBase', {
        id: 'kb-tcad-nanosheet',
        category: 'TCAD',
        title: 'Multi-Channel FET Transport Physics',
        equations: ['SS = (kT/q) * ln(10) * (1 + Cdep/Cox)'],
        description: 'Quantum electrostatic confinement and high field velocity overshoot in silicon channels.',
        typicalParameters: { EOT_nm: '0.65', WorkFunction_eV: '4.62' },
        commonAnomalies: ['Unphysical current spikes due to sharp mesh interfaces'],
      });
      logger.info('Seeded initial knowledge base records.');
    }
  },
};

export class MigrationManager {
  private migrations: IMigration[] = [migrationV1InitialSchema];

  constructor(private db: PersistentDatabaseEngine = persistentDbEngine) {}

  public async runPendingMigrations(): Promise<void> {
    const applied = this.db.getCollection('migrations');

    for (const m of this.migrations) {
      const key = `v${m.version}`;
      if (!applied[key]) {
        logger.info(`Executing migration [v${m.version}] - ${m.name}`);
        await m.up(this.db);
        this.db.insert('migrations', {
          id: key,
          version: m.version,
          name: m.name,
          appliedAt: new Date().toISOString(),
        });
      }
    }
  }
}

export const migrationManager = new MigrationManager();
