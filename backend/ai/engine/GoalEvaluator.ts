import { ISimulationResult } from '../../results/ResultModel.js';
import { IResearchGoal, IGoalEvaluation } from '../types.js';

export class GoalEvaluator {
  public evaluateGoal(
    goal: IResearchGoal,
    result: ISimulationResult,
    previousEvaluations: IGoalEvaluation[] = []
  ): IGoalEvaluation {
    const metrics = result.metrics || { customMetrics: {} };
    const distanceToTarget: Record<string, number> = {};
    const constraintViolations: string[] = [];
    let unsatisfiedCount = 0;

    // 1. Target Threshold Voltage (Vth)
    if (goal.targetThresholdVoltage !== undefined) {
      const actualVth = metrics.thresholdVoltageVth;
      if (actualVth !== undefined) {
        const dist = Math.abs(actualVth - goal.targetThresholdVoltage);
        distanceToTarget['thresholdVoltageVth'] = dist;
        if (dist > 0.02) {
          unsatisfiedCount++;
        }
      } else {
        constraintViolations.push('Threshold voltage (Vth) metric not available in simulation result.');
        unsatisfiedCount++;
      }
    }

    // 2. Target Ion (ON Current)
    if (goal.targetIon !== undefined) {
      const actualIon = metrics.ionCurrent;
      if (actualIon !== undefined) {
        const dist = Math.abs(actualIon - goal.targetIon) / goal.targetIon;
        distanceToTarget['ionCurrent'] = dist;
        if (dist > 0.05) {
          unsatisfiedCount++;
        }
      } else {
        constraintViolations.push('Ion (ON Current) metric not available in simulation result.');
        unsatisfiedCount++;
      }
    }

    // 3. Maximum Ioff (OFF Leakage Current)
    if (goal.maxIoff !== undefined) {
      const actualIoff = metrics.ioffCurrent;
      if (actualIoff !== undefined) {
        const excess = actualIoff - goal.maxIoff;
        distanceToTarget['ioffCurrent'] = excess > 0 ? excess / goal.maxIoff : 0;
        if (actualIoff > goal.maxIoff) {
          constraintViolations.push(
            `OFF-state current Ioff (${actualIoff.toExponential(3)} A) exceeds maximum limit (${goal.maxIoff.toExponential(3)} A).`
          );
          unsatisfiedCount++;
        }
      } else {
        constraintViolations.push('Ioff (OFF Current) metric not available in simulation result.');
        unsatisfiedCount++;
      }
    }

    // 4. Target Subthreshold Swing (SS)
    if (goal.targetSubthresholdSwing !== undefined) {
      const actualSS = metrics.subthresholdSwingSS;
      if (actualSS !== undefined) {
        const dist = Math.abs(actualSS - goal.targetSubthresholdSwing);
        distanceToTarget['subthresholdSwingSS'] = dist;
        if (dist > 5) {
          unsatisfiedCount++;
        }
      } else {
        constraintViolations.push('Subthreshold Swing (SS) metric not available in simulation result.');
        unsatisfiedCount++;
      }
    }

    // 5. Target DIBL
    if (goal.targetDibl !== undefined) {
      const actualDibl = metrics.dibl;
      if (actualDibl !== undefined) {
        const dist = Math.abs(actualDibl - goal.targetDibl);
        distanceToTarget['dibl'] = dist;
        if (dist > 10) {
          unsatisfiedCount++;
        }
      }
    }

    // 6. Max Power
    if (goal.maxPower !== undefined) {
      const customPower = metrics.customMetrics['power'] || metrics.customMetrics['power_W'];
      if (typeof customPower === 'number' && customPower > goal.maxPower) {
        constraintViolations.push(`Power dissipation (${customPower} W) exceeds safety limit (${goal.maxPower} W).`);
        unsatisfiedCount++;
      }
    }

    // 7. Max Temperature
    if (goal.maxTemperature !== undefined) {
      const customTemp = metrics.customMetrics['temperature'] || metrics.customMetrics['junctionTemp_K'];
      if (typeof customTemp === 'number' && customTemp > goal.maxTemperature) {
        constraintViolations.push(`Junction temperature (${customTemp} K) exceeds thermal limit (${goal.maxTemperature} K).`);
        unsatisfiedCount++;
      }
    }

    // 8. Custom Targets
    if (goal.customTargets) {
      for (const [k, targetVal] of Object.entries(goal.customTargets)) {
        const actualVal = metrics.customMetrics[k];
        if (typeof actualVal === 'number') {
          const dist = Math.abs(actualVal - targetVal);
          distanceToTarget[k] = dist;
          if (dist / Math.max(1e-9, Math.abs(targetVal)) > 0.05) {
            unsatisfiedCount++;
          }
        }
      }
    }

    // Determine Goal Reached
    const isGoalReached = unsatisfiedCount === 0 && constraintViolations.length === 0;

    // Determine Convergence Trend
    let convergenceTrend: IGoalEvaluation['convergenceTrend'] = 'INITIAL';
    if (previousEvaluations.length > 0) {
      const prevEval = previousEvaluations[previousEvaluations.length - 1];
      const prevTotalDist = Object.values(prevEval.distanceToTarget).reduce((a, b) => a + b, 0);
      const currentTotalDist = Object.values(distanceToTarget).reduce((a, b) => a + b, 0);

      const diff = prevTotalDist - currentTotalDist;
      if (Math.abs(diff) < 0.001) {
        convergenceTrend = 'STAGNANT';
      } else if (diff > 0) {
        convergenceTrend = 'IMPROVING';
      } else {
        convergenceTrend = 'REGRESSING';
      }
    }

    const summary = isGoalReached
      ? `All target physical metrics achieved for goal "${goal.name}".`
      : `Goal "${goal.name}" pending: ${unsatisfiedCount} metric constraints remaining. Trend: ${convergenceTrend}.`;

    return {
      goalId: goal.goalId,
      isGoalReached,
      distanceToTarget,
      constraintViolations,
      convergenceTrend,
      summary,
    };
  }
}

export const goalEvaluator = new GoalEvaluator();
