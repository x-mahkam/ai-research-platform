import { IExperimentRecord } from '../types.js';

export interface DomainKnowledgeTopic {
  id: string;
  category: 'TCAD' | 'Quantum' | 'Multiphysics' | 'Photonic';
  title: string;
  equations: string[];
  description: string;
  typicalParameters: Record<string, string>;
  commonAnomalies: string[];
}

export interface IPhysicalObservation {
  observationId: string;
  experimentId: string;
  runId: string;
  observationText: string;
  category: 'CONVERGENCE' | 'ELECTROSTATICS' | 'QUANTUM' | 'THERMAL' | 'ANOMALY';
  timestamp: string;
}

export class PhysicsKnowledgeBase {
  private topics: Map<string, DomainKnowledgeTopic> = new Map();

  constructor() {
    this.initKnowledge();
  }

  private initKnowledge(): void {
    this.topics.set('tcad-mosfet', {
      id: 'tcad-mosfet',
      category: 'TCAD',
      title: 'Nanowire/Nanosheet FET Physics',
      equations: [
        'SS = \\frac{kT}{q} \\ln(10) \\left(1 + \\frac{C_{dep}}{C_{ox}}\\right)',
        'I_{on} \\propto \\mu_{eff} C_{ox} \\frac{W}{L} (V_{gs} - V_{th})^2',
      ],
      description: 'Electrostatics and quantum confinement effects in ultra-scaled silicon and 2D channel transistors.',
      typicalParameters: {
        WorkFunction_eV: '4.4 - 4.8 eV',
        EOT_nm: '0.5 - 0.9 nm',
        ChannelDoping_cm3: '1e15 - 1e18 cm^-3',
        SourceDrainDoping_cm3: '1e20 - 2e20 cm^-3',
      },
      commonAnomalies: [
        'Unphysical negative drain current caused by coarse mesh near oxide-semiconductor junction',
        'Newton-Raphson non-convergence due to abrupt doping profile step',
        'Gate leakage singularity when oxide thickness < 0.4 nm without direct tunneling model',
      ],
    });

    this.topics.set('quantum-dft', {
      id: 'quantum-dft',
      category: 'Quantum',
      title: 'Density Functional Theory (DFT) & NEGF Quantum Transport',
      equations: [
        'T(E) = \\text{Tr}\\left[ \\Gamma_L G^R \\Gamma_R G^A \\right]',
        'I = \\frac{2e}{h} \\int T(E) \\left[ f_L(E) - f_R(E) \\right] dE',
      ],
      description: 'Non-equilibrium Green function formalism for atomic-scale electron transport in nanoscale junctions.',
      typicalParameters: {
        kPointMesh: '1x1x100 for 1D transport, 7x7x1 for 2D sheets',
        EnergyGridCutoff_Ha: '100 - 150 Ha',
        Broadening_eV: '1e-4 eV',
      },
      commonAnomalies: [
        'Transmission T(E) exceeding total channel modes due to k-point undersampling',
        'SCF density matrix divergence near Fermi level resonance',
      ],
    });

    this.topics.set('comsol-multiphysics', {
      id: 'comsol-multiphysics',
      category: 'Multiphysics',
      title: 'Coupled Electro-Thermal Joulean Heating & Thermal Dissipation',
      equations: [
        '\\nabla \\cdot (-k \\nabla T) = Q_{joule} = \\mathbf{J} \\cdot \\mathbf{E}',
        '\\sigma = \\sigma_0 / (1 + \\alpha (T - T_0))',
      ],
      description: 'Finite element thermo-electric coupling in high-power semiconductor packaging and chip interconnects.',
      typicalParameters: {
        ThermalConductivity_W_mK: 'Silicon: 148, SiO2: 1.4, Copper: 400',
        HeatTransferCoeff_W_m2K: 'Convective cooling: 10 - 100',
      },
      commonAnomalies: [
        'Thermal runaway divergence when temperature dependence of conductivity is negative without damping',
        'Artificial thermal boundary layer singular gradient',
      ],
    });
  }

  public getTopic(id: string): DomainKnowledgeTopic | undefined {
    return this.topics.get(id);
  }

  public searchKnowledge(keyword: string): DomainKnowledgeTopic[] {
    const term = keyword.toLowerCase();
    const results: DomainKnowledgeTopic[] = [];
    for (const topic of this.topics.values()) {
      if (
        topic.title.toLowerCase().includes(term) ||
        topic.description.toLowerCase().includes(term) ||
        topic.category.toLowerCase().includes(term)
      ) {
        results.push(topic);
      }
    }
    return results;
  }

  public getAllTopics(): DomainKnowledgeTopic[] {
    return Array.from(this.topics.values());
  }
}

export const physicsKnowledgeBase = new PhysicsKnowledgeBase();

/**
 * Knowledge Manager: Stores past experiments, successful parameters, failed parameters,
 * optimization trajectories, and physical observations.
 */
export class KnowledgeManager {
  private experimentHistory: Map<string, IExperimentRecord[]> = new Map();
  private successfulParameters: Map<string, Record<string, number | string>[]> = new Map();
  private failedParameters: Map<string, Record<string, number | string>[]> = new Map();
  private optimizationHistory: Map<
    string,
    Array<{ step: number; params: Record<string, number | string>; metrics: Record<string, number | string> }>
  > = new Map();
  private physicalObservations: Map<string, IPhysicalObservation[]> = new Map();

  public recordExperiment(experimentId: string, record: IExperimentRecord): void {
    const list = this.experimentHistory.get(experimentId) || [];
    list.push(record);
    this.experimentHistory.set(experimentId, list);

    if (record.evaluation.isGoalReached || record.evaluation.convergenceTrend === 'IMPROVING') {
      const succ = this.successfulParameters.get(experimentId) || [];
      succ.push(record.parameters);
      this.successfulParameters.set(experimentId, succ);
    } else if (record.evaluation.constraintViolations.length > 0 || record.result.execution.status === 'Failed') {
      const fail = this.failedParameters.get(experimentId) || [];
      fail.push(record.parameters);
      this.failedParameters.set(experimentId, fail);
    }

    // Optimization history step
    const optList = this.optimizationHistory.get(experimentId) || [];
    optList.push({
      step: list.length,
      params: record.parameters,
      metrics: (record.result.metrics as any) || {},
    });
    this.optimizationHistory.set(experimentId, optList);

    // Extract physical observations
    this.extractObservation(experimentId, record);
  }

  private extractObservation(experimentId: string, record: IExperimentRecord): void {
    const obsList = this.physicalObservations.get(experimentId) || [];
    const metrics = record.result.metrics;

    if (metrics.thresholdVoltageVth !== undefined) {
      obsList.push({
        observationId: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        experimentId,
        runId: record.runId,
        observationText: `Extracted threshold voltage Vth = ${metrics.thresholdVoltageVth} V.`,
        category: 'ELECTROSTATICS',
        timestamp: new Date().toISOString(),
      });
    }

    if (metrics.subthresholdSwingSS !== undefined) {
      obsList.push({
        observationId: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        experimentId,
        runId: record.runId,
        observationText: `Subthreshold Swing SS = ${metrics.subthresholdSwingSS} mV/dec.`,
        category: 'ELECTROSTATICS',
        timestamp: new Date().toISOString(),
      });
    }

    if (record.result.execution.status === 'License Error' || record.result.execution.status === 'Failed') {
      obsList.push({
        observationId: `obs-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        experimentId,
        runId: record.runId,
        observationText: `Execution failed or license error encountered: ${record.result.execution.status}`,
        category: 'ANOMALY',
        timestamp: new Date().toISOString(),
      });
    }

    this.physicalObservations.set(experimentId, obsList);
  }

  public getExperimentHistory(experimentId: string): IExperimentRecord[] {
    return this.experimentHistory.get(experimentId) || [];
  }

  public getSuccessfulParameters(experimentId: string): Record<string, number | string>[] {
    return this.successfulParameters.get(experimentId) || [];
  }

  public getFailedParameters(experimentId: string): Record<string, number | string>[] {
    return this.failedParameters.get(experimentId) || [];
  }

  public getOptimizationHistory(experimentId: string) {
    return this.optimizationHistory.get(experimentId) || [];
  }

  public getPhysicalObservations(experimentId: string): IPhysicalObservation[] {
    return this.physicalObservations.get(experimentId) || [];
  }
}

export const knowledgeManager = new KnowledgeManager();
