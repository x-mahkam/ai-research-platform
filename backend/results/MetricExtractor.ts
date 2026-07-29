import { ISimulationCurve, ISimulationMetrics } from './ResultModel.js';

export class MetricExtractor {
  /**
   * Extracts electrical & semiconductor physics metrics from curve numerical data
   */
  public extractPhysicsMetrics(curves: ISimulationCurve[]): Partial<ISimulationMetrics> {
    const metrics: Partial<ISimulationMetrics> = {
      customMetrics: {},
    };

    for (const curve of curves) {
      if (curve.xValues.length === 0 || curve.yValues.length === 0) continue;

      const count = Math.min(curve.xValues.length, curve.yValues.length);
      const x = curve.xValues.slice(0, count);
      const y = curve.yValues.slice(0, count);

      // Identify curve type if generic
      const curveName = (curve.name + ' ' + curve.yAxisName + ' ' + curve.xAxisName).toLowerCase();
      const isIdVg = curve.type === 'Id-Vg' || curveName.includes('gate') || curveName.includes('v_g');

      if (isIdVg) {
        // Max (Ion) and Min (Ioff)
        const absY = y.map((v) => Math.abs(v));
        const maxVal = Math.max(...absY);
        const minVal = Math.min(...absY);

        metrics.ionCurrent = maxVal;
        metrics.ioffCurrent = minVal;
        metrics.drainCurrentMax = maxVal;

        if (minVal > 0) {
          metrics.ionIoffRatio = maxVal / minVal;
        }

        // Transconductance gm = max(dId / dVg)
        let maxGm = 0;
        for (let i = 1; i < count; i++) {
          const dx = x[i] - x[i - 1];
          const dy = y[i] - y[i - 1];
          if (Math.abs(dx) > 1e-9) {
            const gm = Math.abs(dy / dx);
            if (gm > maxGm) maxGm = gm;
          }
        }
        if (maxGm > 0) metrics.transconductanceGm = maxGm;

        // Subthreshold Swing SS = min( dVg / d(log10(Id)) ) * 1000  (mV/dec)
        let minSS = Infinity;
        for (let i = 1; i < count; i++) {
          const dx = Math.abs(x[i] - x[i - 1]);
          const absY1 = Math.abs(y[i - 1]);
          const absY2 = Math.abs(y[i]);

          if (absY1 > 0 && absY2 > 0) {
            const dyLog = Math.abs(Math.log10(absY2) - Math.log10(absY1));
            if (dx > 0 && dyLog > 1e-4) {
              const ss = (dx / dyLog) * 1000; // mV/dec
              if (ss >= 40 && ss <= 500 && ss < minSS) {
                minSS = ss;
              }
            }
          }
        }
        if (minSS !== Infinity) {
          metrics.subthresholdSwingSS = parseFloat(minSS.toFixed(2));
        }

        // Threshold Voltage Vth via Constant Current method (e.g. 1e-7 A/um)
        const targetI = 1e-7;
        for (let i = 0; i < count - 1; i++) {
          const y1 = Math.abs(y[i]);
          const y2 = Math.abs(y[i + 1]);
          if ((y1 <= targetI && y2 >= targetI) || (y1 >= targetI && y2 <= targetI)) {
            const fraction = Math.abs(y2 - y1) > 0 ? (targetI - y1) / (y2 - y1) : 0;
            const vth = x[i] + fraction * (x[i + 1] - x[i]);
            metrics.thresholdVoltageVth = parseFloat(vth.toFixed(4));
            break;
          }
        }
      }

      if (curveName.includes('leakage') || curveName.includes('i_off')) {
        metrics.leakageCurrent = Math.min(...y.map((v) => Math.abs(v)));
      }

      if (curveName.includes('gate') && curveName.includes('current')) {
        metrics.gateCurrentMax = Math.max(...y.map((v) => Math.abs(v)));
      }
    }

    return metrics;
  }

  /**
   * Extracts performance metrics from log text output
   */
  public extractLogMetrics(logContent: string): Partial<ISimulationMetrics> {
    const metrics: Partial<ISimulationMetrics> = {
      customMetrics: {},
    };

    // Mesh Nodes
    const meshMatch =
      logContent.match(/Mesh Nodes:\s*(\d+)/i) ||
      logContent.match(/Total Nodes:\s*(\d+)/i) ||
      logContent.match(/Grid Points:\s*(\d+)/i);
    if (meshMatch) {
      metrics.meshNodeCount = parseInt(meshMatch[1], 10);
    }

    // Newton Iterations
    const newtonMatch =
      logContent.match(/Newton Iterations:\s*(\d+)/i) ||
      logContent.match(/Iteration Count:\s*(\d+)/i) ||
      logContent.match(/Total Iterations:\s*(\d+)/i);
    if (newtonMatch) {
      metrics.newtonIterationCount = parseInt(newtonMatch[1], 10);
    }

    // CPU Time
    const cpuMatch =
      logContent.match(/Cpu Time:\s*([\d.]+)\s*s/i) ||
      logContent.match(/CPU time:\s*([\d.]+)\s*s/i) ||
      logContent.match(/Elapsed:\s*([\d.]+)\s*s/i);
    if (cpuMatch) {
      metrics.cpuTimeSeconds = parseFloat(cpuMatch[1]);
    }

    // Peak Memory
    const memMatch =
      logContent.match(/Memory:\s*([\d.]+)\s*MB/i) ||
      logContent.match(/Peak Memory:\s*([\d.]+)\s*MB/i) ||
      logContent.match(/Memory used:\s*([\d.]+)\s*MB/i);
    if (memMatch) {
      metrics.peakMemoryMB = parseFloat(memMatch[1]);
    }

    return metrics;
  }
}

export const metricExtractor = new MetricExtractor();
