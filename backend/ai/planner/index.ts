import { IAIContextPayload } from '../context/index.js';
import { IResearchGoal } from '../types.js';

export interface IExperimentPlan {
  planId: string;
  recommendedPlugin: string;
  physicalModels: string[];
  suggestedParameters: Record<string, unknown>;
  voltageSweepConfig: {
    start: number;
    stop: number;
    step: number;
  };
  meshResolution: string;
  rationale: string;
}

export class ExperimentPlanner {
  public planExperiment(goal: string, context?: IAIContextPayload): IExperimentPlan {
    const isQuantum = goal.toLowerCase().includes('dft') || goal.toLowerCase().includes('quantum') || goal.toLowerCase().includes('atomic');
    const isThermal = goal.toLowerCase().includes('thermal') || goal.toLowerCase().includes('heat') || goal.toLowerCase().includes('comsol');

    let plugin = 'sentaurus-tcad';
    let models = ['Drift-Diffusion', 'Quantum Potential Correction', 'High-Field Saturation', 'Shockley-Read-Hall Recombination'];
    let params: Record<string, unknown> = {
      GateWorkFunction_eV: 4.62,
      EOT_nm: 0.7,
      ChannelDoping_cm3: 1e16,
      Vdd_V: 0.7,
      MeshDensity: 250,
    };

    if (isQuantum) {
      plugin = 'quantum-atk';
      models = ['PBE-GGA Functional', 'NEGF Quantum Transport', 'Extended Huckel Tight-Binding'];
      params = {
        kPointMesh: '1x1x100',
        EnergyCutoff_Ha: 120,
        Broadening_eV: 1e-4,
      };
    } else if (isThermal) {
      plugin = 'comsol-multiphysics';
      models = ['Joule Heating', 'Fourier Heat Conduction', 'Temperature-Dependent Mobility'];
      params = {
        AmbientTemp_K: 300,
        HeatTransferCoeff_W_m2K: 25,
        MeshElementSize_um: 0.1,
      };
    }

    return {
      planId: `plan-${Math.random().toString(36).substring(7)}`,
      recommendedPlugin: plugin,
      physicalModels: models,
      suggestedParameters: params,
      voltageSweepConfig: {
        start: -0.2,
        stop: 0.8,
        step: 0.02,
      },
      meshResolution: 'Adaptive fine mesh near oxide interfaces (0.1 nm spacing)',
      rationale: `Physics-based plan tailored for goal "${goal}". Strictly prepared for execution by Simulation Engine.`,
    };
  }
}

export class ResearchPlanner {
  public createResearchPlan(goal: IResearchGoal): {
    planId: string;
    goal: IResearchGoal;
    recommendedAlgorithm: string;
    maxIterations: number;
    initialParameters: Record<string, number | string>;
    strategyDescription: string;
  } {
    const initialParameters: Record<string, number | string> = {};

    for (const [key, range] of Object.entries(goal.allowedParameterRanges)) {
      if (range.min !== undefined && range.max !== undefined) {
        initialParameters[key] = parseFloat(((range.min + range.max) / 2).toFixed(4));
      }
    }

    return {
      planId: `plan-${goal.goalId}`,
      goal,
      recommendedAlgorithm: goal.optimizerAlgorithm || 'BayesianOptimization',
      maxIterations: goal.maxExperiments,
      initialParameters,
      strategyDescription: `Autonomous optimization plan executing ${goal.optimizerAlgorithm || 'BayesianOptimization'} over parameter space with up to ${goal.maxExperiments} simulation iterations.`,
    };
  }
}

export const experimentPlanner = new ExperimentPlanner();
export const researchPlanner = new ResearchPlanner();
