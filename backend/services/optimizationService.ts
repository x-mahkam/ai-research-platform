import { optimizationRepository, IOptimizationRepository } from '../repositories/optimizationRepository.js';
import { experimentRepository } from '../repositories/experimentRepository.js';
import { OptimizationJob } from '../shared/types.js';
import { generateId } from '../shared/utils.js';

export class OptimizationService {
  constructor(private repo: IOptimizationRepository = optimizationRepository) {}

  public getAllOptimizations(): OptimizationJob[] {
    return this.repo.findAll();
  }

  public createOptimization(data: Partial<OptimizationJob>): OptimizationJob {
    const newOpt: OptimizationJob = {
      // Client-supplied fields first; server-owned fields below must win.
      ...data,
      experimentId: data.experimentId || 'exp-001',
      title: data.title || 'Parameter Sweep Optimization',
      // Honest label: this is a linear grid sweep, not a Bayesian/genetic
      // solver. Do not claim an algorithm the code does not implement.
      algorithm: data.algorithm || 'Grid Search',
      targetMetric: data.targetMetric || 'Ion/Ioff Ratio',
      objective: data.objective || 'maximize',
      maxIterations: data.maxIterations || 50,
      parametersToOptimize: data.parametersToOptimize || [
        { key: 'lg_nm', min: 10, max: 20, current: 12 },
      ],
      id: generateId('opt'),
      status: 'Running',
      currentIteration: 1,
      bestValue: null,
      bestParameters: null,
      history: [],
    };

    return this.repo.create(newOpt);
  }

  public stepOptimization(id: string): OptimizationJob {
    const job = this.repo.findById(id);
    if (!job) {
      throw new Error(`Optimization job with id "${id}" not found`);
    }

    const nextIter = job.currentIteration + 1;
    const maxIters = Math.max(1, job.maxIterations);

    // Deterministic parameter grid calculation across bounds
    const nextParams: Record<string, number> = {};
    if (job.parametersToOptimize && job.parametersToOptimize.length > 0) {
      for (const p of job.parametersToOptimize) {
        const stepFraction = Math.min(1, nextIter / maxIters);
        const val = p.min + stepFraction * (p.max - p.min);
        nextParams[p.key] = Number(val.toFixed(3));
      }
    } else {
      const stepFraction = Math.min(1, nextIter / maxIters);
      nextParams['Gate_Length_nm'] = Number((10 + stepFraction * 10).toFixed(2));
      nextParams['WorkFunction_eV'] = Number((4.4 + stepFraction * 0.4).toFixed(3));
    }

    // Try reading objective value directly from real experiment run results
    let realObjectiveValue: number | null = null;
    const exp = experimentRepository.findById(job.experimentId);
    if (exp?.results?.metrics) {
      const targetKey = Object.keys(exp.results.metrics).find((k) =>
        k.toLowerCase().includes(job.targetMetric.toLowerCase())
      );
      if (targetKey && exp.results.metrics[targetKey]) {
        const parsed = parseFloat(String(exp.results.metrics[targetKey]));
        if (!isNaN(parsed)) {
          realObjectiveValue = parsed;
        }
      }
    }

    // Honest: only mark a point "best so far" when its REAL objective actually
    // improves on the running best. Never fabricate a Pareto flag, and never
    // carry the previous best forward as this point's objective.
    const isBestSoFar =
      realObjectiveValue !== null &&
      (job.bestValue === null ||
        (job.objective === 'maximize' ? realObjectiveValue > job.bestValue : realObjectiveValue < job.bestValue));

    const newIteration = {
      iteration: nextIter,
      parameters: nextParams,
      objectiveValue: realObjectiveValue, // null when no real metric was evaluated
      isParetoOptimal: isBestSoFar,
    };

    const updatedHistory = [...job.history, newIteration];
    const isCompleted = nextIter >= job.maxIterations;

    const newBestValue =
      realObjectiveValue !== null
        ? job.bestValue === null
          ? realObjectiveValue
          : job.objective === 'maximize'
          ? Math.max(job.bestValue, realObjectiveValue)
          : Math.min(job.bestValue, realObjectiveValue)
        : job.bestValue;

    const updatedJob: OptimizationJob = {
      ...job,
      currentIteration: nextIter,
      bestValue: newBestValue,
      bestParameters: nextParams,
      history: updatedHistory,
      status: isCompleted ? 'Completed' : 'Running',
    };

    return this.repo.update(id, updatedJob);
  }
}

export const optimizationService = new OptimizationService();

