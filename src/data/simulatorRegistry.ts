import { SimulatorPlugin } from '../types';

export const SCIENTIFIC_FIELDS = [
  'Semiconductor',
  'Photonics',
  'Quantum Materials',
  'Heat Transfer',
  'Fluid Dynamics',
  'Electromagnetics',
  'Structural Mechanics',
  'RF & Microwave',
  'Optics',
  'Nanotechnology',
  'Multiphysics',
  'Materials Science',
  'Chemistry',
  'Custom',
] as const;

export type ScientificField = (typeof SCIENTIFIC_FIELDS)[number];

export interface SimulatorDefinition {
  id: string;
  name: string;
  scientificFields: string[];
  physicsModules: string[];
  executable?: string;
  licenseType?: string;
  vendor?: string;
  version?: string;
  supportedFileTypes?: string[];
}

export const DEFAULT_SIMULATORS: SimulatorDefinition[] = [
  {
    id: 'comsol-multiphysics',
    name: 'COMSOL Multiphysics',
    vendor: 'COMSOL AB',
    scientificFields: [
      'Multiphysics',
      'Heat Transfer',
      'Fluid Dynamics',
      'Electromagnetics',
      'Structural Mechanics',
      'Chemistry',
      'Semiconductor',
      'Photonics',
    ],
    physicsModules: [
      'Heat Transfer',
      'Semiconductor Module',
      'AC/DC',
      'Structural Mechanics',
      'CFD',
      'RF',
      'MEMS',
      'Chemical Reaction Engineering',
      'Microfluidics',
      'Optimization',
    ],
    executable: 'comsolbatch',
    licenseType: 'FLEXlm / Named User',
    supportedFileTypes: ['.mph', '.nas', '.vtu', '.txt', '.log'],
  },
  {
    id: 'sentaurus-tcad',
    name: 'Synopsys Sentaurus TCAD',
    vendor: 'Synopsys Inc.',
    scientificFields: ['Semiconductor', 'Nanotechnology', 'Materials Science'],
    physicsModules: [
      'MOSFET',
      'FinFET',
      'GAA',
      'TFET',
      'HEMT',
      'BJT',
      'CMOS',
      'Hydrodynamic',
    ],
    executable: 'sdevice',
    licenseType: 'Synopsys SCL',
    supportedFileTypes: ['.cmd', '.tdr', '.grd', '.plt', '.log'],
  },
  {
    id: 'quantum-atk',
    name: 'QuantumATK',
    vendor: 'Synopsys / QuantumWise',
    scientificFields: ['Quantum Materials', 'Nanotechnology', 'Materials Science', 'Semiconductor'],
    physicsModules: [
      'DFT',
      'NEGF',
      'Device Simulation',
      'Band Structure',
      'Molecular Dynamics',
    ],
    executable: 'atkpython',
    licenseType: 'Synopsys License Manager',
    supportedFileTypes: ['.py', '.hdf5', '.cif', '.xyz', '.log'],
  },
  {
    id: 'lumerical-fdtd',
    name: 'Ansys Lumerical',
    vendor: 'Ansys Lumerical Inc.',
    scientificFields: ['Photonics', 'Optics', 'Semiconductor', 'Nanotechnology'],
    physicsModules: [
      'FDTD',
      'MODE',
      'CHARGE',
      'HEAT',
      'INTERCONNECT',
    ],
    executable: 'fdtd-solutions',
    licenseType: 'Ansys Licensing',
    supportedFileTypes: ['.fsp', '.lms', '.lsf'],
  },
  {
    id: 'silvaco-atlas',
    name: 'Silvaco Atlas',
    vendor: 'Silvaco Inc.',
    scientificFields: ['Semiconductor', 'Photonics', 'Materials Science'],
    physicsModules: [
      'Drift-Diffusion',
      'Energy Balance',
      'Organic/Polymer',
      'Optoelectronic',
    ],
    executable: 'atlas',
    licenseType: 'Silvaco License Server',
    supportedFileTypes: ['.in', '.str', '.log'],
  },
  {
    id: 'matlab-simulink',
    name: 'MATLAB',
    vendor: 'MathWorks Inc.',
    scientificFields: ['Multiphysics', 'Custom', 'Heat Transfer', 'Fluid Dynamics', 'Electromagnetics'],
    physicsModules: [
      'Control Systems',
      'Signal Processing',
      'Optimization',
      'PDE Toolbox',
      'Simscape',
    ],
    executable: 'matlab',
    licenseType: 'MathWorks Network License',
    supportedFileTypes: ['.m', '.slx', '.mat'],
  },
  {
    id: 'openfoam-cfd',
    name: 'OpenFOAM',
    vendor: 'OpenCFD Ltd / ESI Group',
    scientificFields: ['Fluid Dynamics', 'Heat Transfer', 'Multiphysics'],
    physicsModules: [
      'Incompressible Flow',
      'Compressible Flow',
      'Multiphase Flow',
      'Combustion',
      'Heat Transfer',
    ],
    executable: 'simpleFoam',
    licenseType: 'Open Source (GPLv3)',
    supportedFileTypes: ['.foam', 'blockMeshDict', 'controlDict'],
  },
  {
    id: 'ansys-hfss',
    name: 'HFSS',
    vendor: 'Ansys Inc.',
    scientificFields: ['RF & Microwave', 'Electromagnetics', 'Photonics'],
    physicsModules: [
      'Driven Modal',
      'Driven Terminal',
      'Eigenmode',
      'Transient',
    ],
    executable: 'ansysedt',
    licenseType: 'Ansys Licensing',
    supportedFileTypes: ['.aedt', '.s2p', '.s4p'],
  },
];

/**
 * Dynamically resolves all registered simulators by merging static registry
 * with runtime plugins from the backend plugin registry API.
 */
export function getAvailableSimulators(apiPlugins?: SimulatorPlugin[]): SimulatorDefinition[] {
  const map = new Map<string, SimulatorDefinition>();

  // Initialize with built-in defaults
  for (const sim of DEFAULT_SIMULATORS) {
    map.set(sim.name, sim);
  }

  // Merge runtime plugins
  if (apiPlugins && apiPlugins.length > 0) {
    for (const plugin of apiPlugins) {
      const simName = plugin.simulatorName || plugin.name;
      const existing = map.get(simName);

      if (existing) {
        map.set(simName, {
          ...existing,
          vendor: plugin.vendor || existing.vendor,
          version: plugin.version || existing.version,
          executable: plugin.executable || existing.executable,
          licenseType: plugin.licenseType || existing.licenseType,
          physicsModules: plugin.physicsModules?.length ? plugin.physicsModules : existing.physicsModules,
          scientificFields: plugin.scientificFields?.length ? plugin.scientificFields : existing.scientificFields,
        });
      } else {
        map.set(simName, {
          id: plugin.id,
          name: simName,
          vendor: plugin.vendor,
          version: plugin.version,
          scientificFields: plugin.scientificFields || ['Multiphysics'],
          physicsModules: plugin.physicsModules || ['General / Solver'],
          executable: plugin.executable,
          licenseType: plugin.licenseType,
          supportedFileTypes: plugin.capabilities.supportedFileTypes,
        });
      }
    }
  }

  return Array.from(map.values());
}

/**
 * Returns available physics modules for a selected simulator name.
 */
export function getPhysicsModulesForSimulator(
  simulatorName: string,
  apiPlugins?: SimulatorPlugin[]
): string[] {
  const simulators = getAvailableSimulators(apiPlugins);
  const found = simulators.find(
    (s) => s.name.toLowerCase() === simulatorName.toLowerCase() || s.id.toLowerCase() === simulatorName.toLowerCase()
  );

  if (found && found.physicsModules.length > 0) {
    return found.physicsModules;
  }

  return ['General / Custom Module'];
}
