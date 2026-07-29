import { IExperimentRecord, IComparisonResult } from '../types.js';

export class ExperimentComparator {
  public compareRuns(
    currentRun: IExperimentRecord,
    previousRuns: IExperimentRecord[]
  ): IComparisonResult {
    if (previousRuns.length === 0) {
      return {
        currentRunId: currentRun.runId,
        improvedMetrics: [],
        worsenedMetrics: [],
        unchangedMetrics: [],
        overallTrend: 'IMPROVING',
        convergenceSpeed: 0,
      };
    }

    const previousRun = previousRuns[previousRuns.length - 1];
    const curMetrics = currentRun.result.metrics;
    const prevMetrics = previousRun.result.metrics;

    const curDist = currentRun.evaluation.distanceToTarget;
    const prevDist = previousRun.evaluation.distanceToTarget;

    const improvedMetrics: string[] = [];
    const worsenedMetrics: string[] = [];
    const unchangedMetrics: string[] = [];

    let totalCurDist = 0;
    let totalPrevDist = 0;

    for (const [key, curVal] of Object.entries(curDist)) {
      const prevVal = prevDist[key];
      totalCurDist += curVal;

      if (prevVal === undefined) {
        improvedMetrics.push(key);
      } else {
        totalPrevDist += prevVal;
        const diff = prevVal - curVal;
        if (diff > 0.001) {
          improvedMetrics.push(key);
        } else if (diff < -0.001) {
          worsenedMetrics.push(key);
        } else {
          unchangedMetrics.push(key);
        }
      }
    }

    // Determine overall trend
    let overallTrend: IComparisonResult['overallTrend'] = 'STAGNANT';
    const netImprovement = totalPrevDist - totalCurDist;

    if (netImprovement > 0.001) {
      overallTrend = 'IMPROVING';
    } else if (netImprovement < -0.001) {
      overallTrend = 'REGRESSING';
    }

    // Convergence Speed = percentage change in total distance to target
    const convergenceSpeed =
      totalPrevDist > 0 ? parseFloat((((totalPrevDist - totalCurDist) / totalPrevDist) * 100).toFixed(2)) : 0;

    return {
      currentRunId: currentRun.runId,
      previousRunId: previousRun.runId,
      improvedMetrics,
      worsenedMetrics,
      unchangedMetrics,
      overallTrend,
      convergenceSpeed,
    };
  }
}

export const experimentComparator = new ExperimentComparator();
