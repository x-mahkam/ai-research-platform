import {
  Project,
  Experiment,
  SimulationJob,
  SimulatorPlugin,
  OptimizationJob,
  GeneratedReport,
} from '../types';

export const DEFAULT_PLUGINS: SimulatorPlugin[] = [
  {
    id: 'sentaurus-tcad',
    name: 'Synopsys Sentaurus TCAD',
    vendor: 'Synopsys Inc.',
    version: '2024.03',
    status: 'Active',
    description:
      'Premier 2D/3D Semiconductor Device & Process Simulator for sub-5nm transistors, power electronics, and photonics.',
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
    sampleScript: `Device "Nanosheet_FET" {
  Electrode {
    { Name="drain"   Voltage=0.0 }
    { Name="source"  Voltage=0.0 }
    { Name="gate"    Voltage=0.0 }
    { Name="substrate" Voltage=0.0 }
  }
  Physics {
    Hydrodynamic(eTemperature)
    Mobility( HighFieldSat Enormal )
    Recombination( SRH Auger )
    QuantumPotential
  }
}
Solve {
  NewCurrentPrefix="IdVg_"
  Quasistationary( Goal { Name="gate" Voltage=0.8 } ) {
    Solve { Coupled { Poisson Electron Hole eTemperature } }
  }
}`,
  },
  {
    id: 'quantumatk',
    name: 'QuantumATK Atomic-Scale Simulator',
    vendor: 'Synopsys QuantumATK',
    version: '2023.12',
    status: 'Active',
    description:
      'Atomic-scale modeling platform combining Density Functional Theory (DFT) and Non-Equilibrium Green Functions (NEGF).',
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
    description:
      'Finite element analysis and multiphysics engineering modeling software.',
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
    description:
      'Photonic component and photonic integrated circuit design simulation suite based on FDTD Maxwell solver.',
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
    description:
      '2D/3D device simulator for semiconductor technologies including Si, SiC, GaN, and organic semiconductors.',
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

export const DEFAULT_PROJECTS: Project[] = [
  {
    id: 'proj-001',
    title: 'Semiconductor Device Quantum Transport',
    scientificField: 'Semiconductor',
    simulator: 'Synopsys Sentaurus TCAD',
    physicsModule: 'GAA / Hydrodynamic',
    researchGoal: 'Analyze multi-channel silicon nanosheet quantum transport and thermal hot-spot dissipation.',
    description:
      'Comprehensive TCAD modeling of multi-channel Silicon Nanosheet FETs targeting quantum confinement effects and hydrodynamic thermal transport.',
    principalInvestigator: 'Dr. Jasur Alimov',
    owner: 'Dr. Jasur Alimov',
    domain: 'Semiconductor',
    tags: ['Nanosheet', 'Sentaurus', 'TCAD'],
    status: 'Active',
    members: ['Dr. Jasur Alimov', 'Dr. Sarah Lin'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favorite: true,
    experimentCount: 3,
    defaultModelId: 'mod-001',
  },
  {
    id: 'proj-002',
    title: 'GaN High-Electron-Mobility Transistor (HEMT) Breakdown',
    scientificField: 'Semiconductor',
    simulator: 'Silvaco Atlas',
    physicsModule: 'Drift-Diffusion',
    researchGoal: 'Power electronic GaN-on-Si HEMT electric field distribution and avalanche breakdown voltage optimization.',
    description:
      'Power electronic GaN-on-Si HEMT electric field distribution and avalanche breakdown voltage optimization.',
    principalInvestigator: 'Dr. Sarah Lin',
    owner: 'Dr. Sarah Lin',
    domain: 'Semiconductor',
    tags: ['GaN', 'HEMT', 'Silvaco', 'Breakdown'],
    status: 'Active',
    members: ['Dr. Sarah Lin'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    favorite: false,
    experimentCount: 1,
  },
];

export const DEFAULT_EXPERIMENTS: Experiment[] = [
  {
    id: 'exp-001',
    projectId: 'proj-001',
    title: '3nm Nanosheet I-V Transfer Sweep (Vg = -0.2V to 0.8V)',
    description:
      'Sweeping gate bias to measure subthreshold swing (SS) and drain-induced barrier lowering (DIBL) under quantum potential corrections.',
    pluginId: 'sentaurus-tcad',
    status: 'Completed',
    version: 1,
    parameters: [
      { key: 'Gate_Length_nm', name: 'Gate Length', value: 12, unit: 'nm', description: 'Gate Channel Length' },
      { key: 'Nanosheet_Thickness_nm', name: 'Nanosheet Thickness', value: 5, unit: 'nm', description: 'Silicon Channel Thickness' },
      { key: 'EOT_nm', name: 'EOT', value: 0.65, unit: 'nm', description: 'Equivalent Oxide Thickness' },
      { key: 'WorkFunction_eV', name: 'Work Function', value: 4.58, unit: 'eV', description: 'Metal Gate Work Function' },
      { key: 'Vds_V', name: 'Vds', value: 0.75, unit: 'V', description: 'Drain Voltage' },
    ],
    notes: [
      {
        id: 'n1',
        author: 'Dr. Jasur Alimov',
        content: 'Quantum potential mesh density increased near dielectric interface.',
        createdAt: new Date().toISOString(),
        version: 1,
      },
    ],
    attachments: [
      {
        id: 'a1',
        name: 'IdVg_Sweep_Nanosheet.plt',
        size: '142 KB',
        type: 'text/plain',
        uploadedAt: new Date().toISOString(),
      },
    ],
    results: {
      metrics: {
        'Ion (uA/um)': 1240,
        'Ioff (pA/um)': 8.2,
        'Subthreshold Swing (mV/dec)': 63.8,
        'DIBL (mV/V)': 24.5,
        'Transconductance gm (mS/um)': 1.85,
      },
      curves: [
        {
          id: 'c1',
          title: 'Id-Vg Characteristics',
          xAxisLabel: 'Gate Voltage Vg (V)',
          yAxisLabel: 'Drain Current Id (A/um)',
          data: [
            { x: -0.2, y: 1e-12 },
            { x: 0.0, y: 1e-11 },
            { x: 0.2, y: 1e-8 },
            { x: 0.4, y: 1e-5 },
            { x: 0.6, y: 8e-4 },
            { x: 0.8, y: 1.24e-3 },
          ],
        },
      ],
      outputFiles: [{ name: 'IdVg_Sweep_Nanosheet.plt', size: '142 KB', type: 'PLT' }],
    },
    tags: ['Sentaurus', 'IdVg', '3nm'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: 'Dr. Jasur Alimov',
  },
];

export const DEFAULT_SIMULATIONS: SimulationJob[] = [
  {
    id: 'sim-job-001',
    experimentId: 'exp-001',
    experimentTitle: '3nm Nanosheet I-V Transfer Sweep (Vg = -0.2V to 0.8V)',
    pluginId: 'sentaurus-tcad',
    pluginName: 'Synopsys Sentaurus TCAD',
    status: 'Completed',
    progress: 100,
    startTime: new Date().toISOString(),
    cpuUsage: 94,
    memoryUsage: 14.2,
    hostMachine: 'node-compute-01.arp.local',
    logs: [
      `[${new Date().toLocaleTimeString()}] Sentaurus TCAD Solver process launched on 16 threads.`,
      `[${new Date().toLocaleTimeString()}] Grid mesh loaded into memory. Solving Poisson-Schrödinger hydrodynamic system...`,
      `[${new Date().toLocaleTimeString()}] Convergence reached at step 14. Exporting .plt data file.`,
    ],
  },
];

export const DEFAULT_OPTIMIZATIONS: OptimizationJob[] = [
  {
    id: 'opt-001',
    experimentId: 'exp-001',
    title: 'Bayesian FOM Optimization for 3nm Nanosheet Ion/Ioff',
    targetMetric: 'Max Ion/Ioff ratio (Target > 1e7)',
    algorithm: 'Bayesian Optimization',
    objective: 'maximize',
    parametersToOptimize: [
      { key: 'Gate_Length_nm', min: 10, max: 20, current: 12 },
      { key: 'WorkFunction_eV', min: 4.4, max: 4.8, current: 4.58 },
    ],
    status: 'Running',
    currentIteration: 8,
    maxIterations: 20,
    bestValue: 1.48e7,
    bestParameters: { Gate_Length_nm: 12.4, WorkFunction_eV: 4.61, EOT_nm: 0.65 },
    history: [
      { iteration: 1, parameters: { Gate_Length_nm: 10, WorkFunction_eV: 4.5 }, objectiveValue: 8.2e6, isParetoOptimal: false },
      { iteration: 2, parameters: { Gate_Length_nm: 11, WorkFunction_eV: 4.55 }, objectiveValue: 1.1e7, isParetoOptimal: false },
      { iteration: 3, parameters: { Gate_Length_nm: 12, WorkFunction_eV: 4.58 }, objectiveValue: 1.25e7, isParetoOptimal: false },
      { iteration: 8, parameters: { Gate_Length_nm: 12.4, WorkFunction_eV: 4.61 }, objectiveValue: 1.48e7, isParetoOptimal: true },
    ],
  },
];

export const DEFAULT_REPORTS: GeneratedReport[] = [
  {
    id: 'rep-001',
    experimentId: 'exp-001',
    experimentTitle: '3nm Nanosheet I-V Transfer Sweep',
    projectName: 'Semiconductor Device Quantum Transport',
    title: 'Scientific Report: Semiconductor FET Transport Analysis',
    author: 'AI Scientist Agent (Gemini 2.5 Pro)',
    createdAt: new Date().toISOString(),
    version: '1.0',
    markdownContent: `# Scientific Report: Semiconductor FET Transport Analysis

## 1. Executive Summary
TCAD simulations were performed for a multi-channel Silicon Field-Effect Transistor (FET) utilizing the Synopsys Sentaurus TCAD solver suite.

## 2. Key Device Parameters & Metrics
- **Gate Length ($L_g$):** 12 nm
- **Nanosheet Thickness ($T_{ns}$):** 5 nm
- **Equivalent Oxide Thickness ($EOT$):** 0.65 nm
- **Subthreshold Swing ($SS$):** 63.8 mV/dec
- **$I_{on}/I_{off}$ Ratio:** $1.51 \\times 10^8$

## 3. Physical Observations
The hydrodynamic transport model reveals strong quantum confinement within the 5nm silicon body. Velocity overshoot occurs at the drain junction leading to enhanced drive current $I_{on} = 1240 \\,\\mu\\text{A/\\mu m}$.
`,
  },
];
