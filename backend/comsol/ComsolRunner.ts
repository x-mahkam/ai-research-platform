import fs from 'fs';
import path from 'path';
import { ComsolJob } from './ComsolJob.js';
import { ComsolLocator } from './ComsolLocator.js';
import { ComsolProcess } from './ComsolProcess.js';
import { SimulationResult } from './types.js';
import {
  ComsolNotFoundError,
  ComsolExecutionError,
  ComsolLicenseError,
  WorkspaceError,
  TimeoutError,
} from './errors.js';
import { workspaceManager } from '../workspace/manager/index.js';
import { extractFromLog, collectExportedTables } from './ComsolResultExtractor.js';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('ComsolRunner');

export class ComsolRunner {
  public async executeJob(job: ComsolJob): Promise<SimulationResult> {
    logger.info(`Beginning COMSOL simulation execution for Job [${job.jobId}], Experiment [${job.experimentId}]`);

    // 1. Verify / Locate COMSOL Executable
    let executablePath: string;
    try {
      executablePath = ComsolLocator.locate();
    } catch (err) {
      if (err instanceof ComsolNotFoundError) {
        throw err;
      }
      throw new ComsolNotFoundError(`Failed to locate COMSOL executable: ${(err as Error).message}`);
    }

    // 2. Prepare & Verify Workspace Structure
    const { workspacePath, inputModelPath, outputModelPath, experimentId, runId } = job;
    
    if (!fs.existsSync(workspacePath)) {
      try {
        fs.mkdirSync(workspacePath, { recursive: true });
      } catch (err: any) {
        throw new WorkspaceError(`Unable to create workspace directory at "${workspacePath}": ${err.message}`);
      }
    }

    const inputDir = path.join(workspacePath, 'input');
    const outputDir = path.join(workspacePath, 'output');
    const logsDir = path.join(workspacePath, 'logs');
    const reportsDir = path.join(workspacePath, 'reports');

    for (const dir of [inputDir, outputDir, logsDir, reportsDir]) {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
        } catch (err: any) {
          throw new WorkspaceError(`Failed to prepare workspace directory "${dir}": ${err.message}`);
        }
      }
    }

    // 3. Verify Input Model File Exists
    if (!fs.existsSync(inputModelPath)) {
      throw new WorkspaceError(
        `Input COMSOL model file (.mph) not found at "${inputModelPath}". Execution cannot proceed without a valid input model.`
      );
    }

    // 4. Run COMSOL Process via comsolbatch
    const comsolProcess = new ComsolProcess();
    const batchArgs = job.getBatchArguments();

    let processOutput;
    try {
      processOutput = await comsolProcess.run({
        executablePath,
        args: batchArgs,
        cwd: workspacePath,
        env: job.options.env,
        timeoutMs: job.options.timeoutMs || 3600000,
      });
    } catch (err) {
      if (err instanceof TimeoutError) {
        throw err;
      }
      throw new ComsolExecutionError(`COMSOL execution failed unexpectedly: ${(err as Error).message}`);
    }

    const { exitCode, stdout, stderr, executionTimeMs, startTime, endTime } = processOutput;

    // 5. Write Execution Logs to Workspace
    const stdoutLogPath = path.join(logsDir, 'comsol_stdout.log');
    const stderrLogPath = path.join(logsDir, 'comsol_stderr.log');
    const executionLogPath = path.join(logsDir, 'execution.log');

    try {
      fs.writeFileSync(stdoutLogPath, stdout, 'utf-8');
      fs.writeFileSync(stderrLogPath, stderr, 'utf-8');

      const logSummary =
        `[${startTime}] COMSOL batch execution started\n` +
        `Executable: ${executablePath}\n` +
        `Arguments: ${batchArgs.join(' ')}\n` +
        `Exit Code: ${exitCode}\n` +
        `Duration: ${executionTimeMs} ms\n` +
        `[${endTime}] COMSOL batch execution finished\n`;

      fs.writeFileSync(executionLogPath, logSummary, 'utf-8');

      if (workspaceManager.workspaceExists(experimentId, runId)) {
        workspaceManager.appendExecutionLog(
          experimentId,
          runId,
          `COMSOL batch executed with exit code ${exitCode} in ${executionTimeMs}ms.`
        );
      }
    } catch (err: any) {
      logger.warn(`Failed to write execution log files: ${err.message}`);
    }

    // 6. Check for License Errors in Output Logs
    const combinedLogText = `${stdout}\n${stderr}`.toLowerCase();
    if (
      combinedLogText.includes('license error') ||
      combinedLogText.includes('flexlm error') ||
      combinedLogText.includes('could not obtain license') ||
      combinedLogText.includes('no license for feature') ||
      combinedLogText.includes('license server') ||
      combinedLogText.includes('license checkout failed')
    ) {
      throw new ComsolLicenseError(
        `COMSOL license checkout failed during execution. Details: ${stderr || stdout || 'License error detected in process logs.'}`
      );
    }

    // 7. Validate Exit Code and Output Model Creation
    if (exitCode !== 0) {
      throw new ComsolExecutionError(
        `COMSOL process completed with non-zero exit code (${exitCode}). Check log file at "${executionLogPath}" for details.`,
        exitCode,
        stdout,
        stderr
      );
    }

    if (!fs.existsSync(outputModelPath)) {
      throw new ComsolExecutionError(
        `COMSOL execution completed with exit code 0, but output model file was not generated at expected path: "${outputModelPath}".`,
        exitCode,
        stdout,
        stderr
      );
    }

    logger.info(`COMSOL execution completed successfully. Output model verified at "${outputModelPath}".`);

    // 8. Extract solver data from the batch log so the AI layer receives the
    //    actual computed physics — convergence, DOF, solution time, computed
    //    values, warnings — instead of just file locations.
    const extracted = extractFromLog(stdout, stderr);
    const exportedTables = collectExportedTables(workspacePath);

    // 9. Construct & Return SimulationResult (file locations + parsed solver data)
    const result: SimulationResult = {
      status: 'COMPLETED',
      executionTimeMs,
      inputModel: inputModelPath,
      outputModel: outputModelPath,
      logFile: executionLogPath,
      exitCode,
      metadata: {
        executablePath,
        startTime,
        endTime,
        stdoutSizeBytes: Buffer.byteLength(stdout, 'utf-8'),
        stderrSizeBytes: Buffer.byteLength(stderr, 'utf-8'),
        environment: job.options.env || {},
        commandLine: [executablePath, ...batchArgs],
      },
      metrics: {
        'Execution time (ms)': executionTimeMs,
        ...extracted.metrics,
      },
      computedValues: extracted.computedValues,
      warnings: extracted.warnings,
      errors: extracted.errors,
      converged: extracted.converged,
      solverLog: extracted.logTail,
      exportedTables,
    };

    return result;
  }
}

export const comsolRunner = new ComsolRunner();
