import { IARPUnifiedResults } from '../types.js';

export interface IResultViewModel {
  title: string;
  subtitle: string;
  metricsTable: Array<{ key: string; value: string | number }>;
  charts: Array<{
    id: string;
    title: string;
    xAxisLabel: string;
    yAxisLabel: string;
    dataPointsCount: number;
    series: Array<{ x: number; y: number }>;
  }>;
  summary: string;
}

export class ResultViewer {
  public prepareViewModel(results: IARPUnifiedResults): IResultViewModel {
    const metricsTable = Object.entries(results.metrics).map(([key, value]) => ({
      key,
      value,
    }));

    const charts = results.curves.map((curve) => ({
      id: curve.id,
      title: curve.title,
      xAxisLabel: curve.xAxisLabel,
      yAxisLabel: curve.yAxisLabel,
      dataPointsCount: curve.data.length,
      series: curve.data.map((p) => ({ x: p.x, y: p.y })),
    }));

    return {
      title: `Simulation Results (${results.pluginId})`,
      subtitle: `Experiment ID: ${results.experimentId} | Job ID: ${results.jobId}`,
      metricsTable,
      charts,
      summary: results.summary,
    };
  }

  public exportToCSV(results: IARPUnifiedResults): string {
    const lines: string[] = ['=== ARP SIMULATION METRICS ===', 'Metric,Value'];

    for (const [key, val] of Object.entries(results.metrics)) {
      lines.push(`"${key}","${val}"`);
    }

    for (const curve of results.curves) {
      lines.push('');
      lines.push(`=== CURVE: ${curve.title} ===`);
      lines.push(`"${curve.xAxisLabel}","${curve.yAxisLabel}"`);
      for (const p of curve.data) {
        lines.push(`${p.x},${p.y}`);
      }
    }

    return lines.join('\n');
  }
}

export const resultViewer = new ResultViewer();
