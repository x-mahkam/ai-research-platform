import fs from 'fs';
import path from 'path';
import { ISimulationResult, ISimulationMetrics, ISimulationCurve } from '../ResultModel.js';
import { IRawPluginOutput } from '../types.js';
import { metricExtractor } from '../MetricExtractor.js';
import { curveExtractor } from '../CurveExtractor.js';
import { LoggerService } from '../../logging/logger.js';
import { workspaceManager } from '../../workspace/manager/index.js';

const logger = new LoggerService('ResultCollector');

export class ResultCollector {
  public collectFromPluginExecution(
    pluginId: string,
    rawResult: unknown,
    rawFormat: string = 'JSON'
  ): IRawPluginOutput {
    logger.info(`Collecting raw output payload from plugin execution [${pluginId}]`);
    return {
      pluginId,
      rawFormat,
      rawData: rawResult,
    };
  }

  public collectFromFile(pluginId: string, filePath: string, fileContent: string, format: string): IRawPluginOutput {
    logger.info(`Collecting raw output from file [${filePath}] for plugin [${pluginId}]`);
    return {
      pluginId,
      rawFormat: format,
      rawData: fileContent,
      filePath,
    };
  }

  /**
   * Collects and parses output files from a workspace directory for a given experiment & run.
   */
  public async collectFromWorkspace(
    experimentId: string,
    runId: string,
    simulator: string = 'Synopsys Sentaurus',
    pluginId: string = 'sentaurus-tcad'
  ): Promise<ISimulationResult> {
    const timestamp = new Date().toISOString();
    const resultId = `res-${experimentId}-${runId}`;

    const warnings: string[] = [];
    const errors: string[] = [];

    let rootPath = '';
    let outputPath = '';
    let logsPath = '';

    try {
      if (workspaceManager.workspaceExists(experimentId, runId)) {
        const ws = workspaceManager.getWorkspace(experimentId, runId);
        rootPath = ws.paths.root;
        outputPath = ws.paths.output;
        logsPath = ws.paths.logs;
      } else {
        rootPath = path.join(process.cwd(), 'workspaces', `experiment-${experimentId}`, `run-${runId}`);
        outputPath = path.join(rootPath, 'output');
        logsPath = path.join(rootPath, 'logs');
      }
    } catch (err: any) {
      errors.push(`Workspace access error: ${err.message}`);
    }

    if (!outputPath || !fs.existsSync(outputPath)) {
      errors.push(`Missing workspace output directory at: ${outputPath || 'unknown'}`);
      return this.buildErrorResult(resultId, experimentId, runId, simulator, pluginId, timestamp, warnings, errors);
    }

    // Read files in workspace/output/
    let outputFiles: string[] = [];
    try {
      outputFiles = fs.readdirSync(outputPath);
    } catch (err: any) {
      errors.push(`Failed to list files in output directory: ${err.message}`);
    }

    if (outputFiles.length === 0) {
      warnings.push('Output directory is empty. Waiting for simulator output files.');
    }

    // Find .plt, .log, .tdr, .par, .cmd files
    const pltFiles = outputFiles.filter((f) => f.endsWith('.plt'));
    const logFiles = outputFiles.filter((f) => f.endsWith('.log'));
    const tdrFiles = outputFiles.filter((f) => f.endsWith('.tdr'));
    const parFiles = outputFiles.filter((f) => f.endsWith('.par'));
    const cmdFiles = outputFiles.filter((f) => f.endsWith('.cmd'));

    let curves: ISimulationCurve[] = [];
    let metrics: ISimulationMetrics = { customMetrics: {} };

    // 1. Parse .plt files
    for (const pltFile of pltFiles) {
      const pltFullPath = path.join(outputPath, pltFile);
      try {
        const rawPlt = fs.readFileSync(pltFullPath, 'utf-8');
        if (!rawPlt.trim()) {
          warnings.push(`File ${pltFile} is empty or incomplete.`);
          continue;
        }

        const extractedCurves = curveExtractor.extractCurvesFromPlt(rawPlt);
        curves.push(...extractedCurves);

        const extractedMetrics = metricExtractor.extractPhysicsMetrics(extractedCurves);
        metrics = { ...metrics, ...extractedMetrics };
      } catch (err: any) {
        errors.push(`Corrupted or unparseable .plt file [${pltFile}]: ${err.message}`);
      }
    }

    // 2. Parse .log files
    let logContent = '';
    for (const logFile of logFiles) {
      const logFullPath = path.join(outputPath, logFile);
      try {
        const content = fs.readFileSync(logFullPath, 'utf-8');
        logContent += content + '\n';

        const extractedLogMetrics = metricExtractor.extractLogMetrics(content);
        metrics = { ...metrics, ...extractedLogMetrics };
      } catch (err: any) {
        warnings.push(`Failed to parse log file [${logFile}]: ${err.message}`);
      }
    }

    // Also check logs/ execution.log if present
    if (logsPath && fs.existsSync(path.join(logsPath, 'execution.log'))) {
      try {
        const execLog = fs.readFileSync(path.join(logsPath, 'execution.log'), 'utf-8');
        const execMetrics = metricExtractor.extractLogMetrics(execLog);
        metrics = { ...metrics, ...execMetrics };
      } catch {
        // Ignore
      }
    }

    // Check execution.json in output/ or root if available
    let executionInfo: ISimulationResult['execution'] = {
      status: errors.length > 0 ? 'Failed' : 'Completed',
      exitCode: 0,
      durationMs: 0,
    };

    const execJsonPath = path.join(outputPath, 'execution.json');
    if (fs.existsSync(execJsonPath)) {
      try {
        const rawJson = fs.readFileSync(execJsonPath, 'utf-8');
        const parsedExec = JSON.parse(rawJson);
        executionInfo = {
          status: parsedExec.status || 'Completed',
          exitCode: parsedExec.exitCode !== undefined ? parsedExec.exitCode : 0,
          durationMs: parsedExec.durationMs || 0,
          cpuTimeMs: parsedExec.cpuTimeMs,
          memoryUsageBytes: parsedExec.memoryUsageBytes,
          stdout: parsedExec.stdout,
          stderr: parsedExec.stderr,
        };
      } catch {
        // Ignore JSON error
      }
    }

    const metadata: ISimulationResult['metadata'] = {
      simulator,
      pluginId,
      meshFile: tdrFiles.length > 0 ? tdrFiles[0] : undefined,
      parameterFile: parFiles.length > 0 ? parFiles[0] : undefined,
      commandFile: cmdFiles.length > 0 ? cmdFiles[0] : undefined,
      pltFile: pltFiles.length > 0 ? pltFiles[0] : undefined,
      logFile: logFiles.length > 0 ? logFiles[0] : undefined,
      customMetadata: {
        totalOutputFiles: outputFiles.length,
        outputFiles,
      },
    };

    logger.info(`Collected result for experiment ${experimentId}/${runId}: ${curves.length} curves, ${Object.keys(metrics).length} metrics`);

    return {
      id: resultId,
      experimentId,
      runId,
      simulator,
      pluginId,
      timestamp,
      metrics,
      curves,
      metadata,
      execution: executionInfo,
      warnings,
      errors,
    };
  }

  private buildErrorResult(
    resultId: string,
    experimentId: string,
    runId: string,
    simulator: string,
    pluginId: string,
    timestamp: string,
    warnings: string[],
    errors: string[]
  ): ISimulationResult {
    return {
      id: resultId,
      experimentId,
      runId,
      simulator,
      pluginId,
      timestamp,
      metrics: { customMetrics: {} },
      curves: [],
      metadata: { simulator, pluginId, customMetadata: {} },
      execution: { status: 'Failed', exitCode: -1, durationMs: 0 },
      warnings,
      errors,
    };
  }
}

export const resultCollector = new ResultCollector();
