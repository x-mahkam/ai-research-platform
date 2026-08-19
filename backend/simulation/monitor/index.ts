import { simulationRepository } from '../../repositories/simulationRepository.js';
import { LoggerService } from '../../logging/logger.js';
import { formatLogTimestamp } from '../../shared/utils.js';

const logger = new LoggerService('SimulationMonitor');

export interface ITelemetrySnapshot {
  jobId: string;
  timestamp: string;
  cpuUsagePct: number;
  memoryUsageGb: number;
  progressPct: number;
}

export class SimulationMonitor {
  private activeMonitors: Map<string, NodeJS.Timeout> = new Map();
  private telemetryHistory: Map<string, ITelemetrySnapshot[]> = new Map();

  public startMonitoring(jobId: string, onUpdate?: (snapshot: ITelemetrySnapshot) => void): void {
    if (this.activeMonitors.has(jobId)) return;

    logger.info(`Started live telemetry monitoring for job ${jobId}`);
    simulationRepository.appendLog(jobId, `[${formatLogTimestamp()}] Live telemetry monitoring probe attached.`);

    const interval = setInterval(() => {
      const job = simulationRepository.findById(jobId);
      if (!job || job.status === 'Completed' || job.status === 'Failed' || job.status === 'Cancelled') {
        this.stopMonitoring(jobId);
        return;
      }

      const snapshot: ITelemetrySnapshot = {
        jobId,
        timestamp: new Date().toISOString(),
        cpuUsagePct: Math.min(100, Math.max(0, job.cpuUsage || 0)),
        memoryUsageGb: Math.min(64, Math.max(0, job.memoryUsage || 0)),
        progressPct: job.progress,
      };

      const history = this.telemetryHistory.get(jobId) || [];
      history.push(snapshot);
      // Bound per-job history (a snapshot every 2s would grow without limit).
      if (history.length > 300) history.splice(0, history.length - 300);
      this.telemetryHistory.set(jobId, history);

      if (onUpdate) onUpdate(snapshot);
    }, 2000);

    this.activeMonitors.set(jobId, interval);
  }

  public recordLogLine(jobId: string, logLine: string): void {
    simulationRepository.appendLog(jobId, logLine);
  }

  public stopMonitoring(jobId: string): void {
    const timer = this.activeMonitors.get(jobId);
    if (timer) {
      clearInterval(timer);
      this.activeMonitors.delete(jobId);
      // Release the accumulated snapshots for this finished job.
      this.telemetryHistory.delete(jobId);
      logger.info(`Stopped telemetry monitoring for job ${jobId}`);
      simulationRepository.appendLog(jobId, `[${formatLogTimestamp()}] Telemetry monitoring probe detached.`);
    }
  }

  public getTelemetry(jobId: string): ITelemetrySnapshot[] {
    return this.telemetryHistory.get(jobId) || [];
  }
}

export const simulationMonitor = new SimulationMonitor();
