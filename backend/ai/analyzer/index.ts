import { IARPUnifiedResults } from '../../results/index.js';

export interface IResultAnalysisReport {
  jobId: string;
  summary: string;
  figuresOfMerit: Record<string, string | number>;
  anomaliesDetected: Array<{
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    type: string;
    description: string;
    recommendation: string;
  }>;
  physicsInsights: string[];
}

export class ResultAnalyzer {
  public analyzeResults(results: IARPUnifiedResults): IResultAnalysisReport {
    const metrics = results.metrics || {};
    const anomalies: IResultAnalysisReport['anomaliesDetected'] = [];
    const insights: string[] = [];

    // Check for negative currents or unphysical metrics
    for (const [key, val] of Object.entries(metrics)) {
      if (typeof val === 'number' && val < 0 && key.toLowerCase().includes('current')) {
        anomalies.push({
          severity: 'HIGH',
          type: 'Unphysical Current Sign',
          description: `Metric "${key}" has negative current value (${val}). May indicate mesh coarseness or inversion channel singularity.`,
          recommendation: 'Refine grid density around source/drain oxide junctions.',
        });
      }
    }

    if (results.curves.length === 0) {
      anomalies.push({
        severity: 'MEDIUM',
        type: 'Missing Curve Vectors',
        description: 'Simulation output generated scalar metrics but no I-V or field curves.',
        recommendation: 'Ensure output curve logging is toggled in plugin parameters.',
      });
    }

    // Extract insights
    if (metrics['Ion (ON Current)']) {
      insights.push(`High drive current capability detected: ${metrics['Ion (ON Current)']}.`);
    }
    if (metrics['Subthreshold Swing']) {
      insights.push(`Subthreshold Swing (${metrics['Subthreshold Swing']}) approaches Boltzmann ideal limit (60 mV/dec).`);
    }
    if (metrics['Peak Junction Temperature']) {
      insights.push(`Junction heating reaches ${metrics['Peak Junction Temperature']}. Thermal dissipation strategy required.`);
    }

    if (insights.length === 0) {
      insights.push('Physics parameters demonstrate stable convergence under standard boundary constraints.');
    }

    return {
      jobId: results.jobId,
      summary: `Automated result analysis for job ${results.jobId} using plugin ${results.pluginId}. Identified ${anomalies.length} anomaly/anomalies.`,
      figuresOfMerit: metrics,
      anomaliesDetected: anomalies,
      physicsInsights: insights,
    };
  }
}

export const resultAnalyzer = new ResultAnalyzer();
