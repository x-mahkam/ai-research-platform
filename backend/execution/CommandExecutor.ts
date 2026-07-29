import { execFile, ChildProcess } from 'child_process';
import fs from 'fs';
import path from 'path';
import {
  IExecutionRequest,
  IExecutionResult,
  IExecutionContext,
  ExecutionStatus,
} from './types.js';
import { executionMonitor } from './ExecutionMonitor.js';
import { workspaceManager } from '../workspace/manager/index.js';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('CommandExecutor');

export class CommandExecutor {
  public async execute(request: IExecutionRequest): Promise<IExecutionResult> {
    const requestId = `exec-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const startTime = new Date();
    const startIso = startTime.toISOString();

    const context: IExecutionContext = {
      requestId,
      request,
      status: 'Preparing',
      startTime,
    };
    executionMonitor.registerContext(context);

    // 1. Validate Working Directory
    if (!fs.existsSync(request.workingDirectory)) {
      try {
        fs.mkdirSync(request.workingDirectory, { recursive: true });
      } catch (err: any) {
        const errorResult: IExecutionResult = {
          exitCode: -1,
          startTime: startIso,
          endTime: new Date().toISOString(),
          durationMs: 0,
          stdout: '',
          stderr: `Failed to prepare working directory "${request.workingDirectory}": ${err.message}`,
          status: 'Failed',
          errorMessage: `Working directory failure: ${err.message}`,
        };
        this.writeWorkspaceLogs(request, errorResult);
        executionMonitor.recordCompletion(requestId, errorResult);
        return errorResult;
      }
    }

    // 2. Validate Executable Path Existence
    const execPath = request.executablePath;
    const isAbsolute = path.isAbsolute(execPath);
    let executableExists = false;

    if (isAbsolute) {
      executableExists = fs.existsSync(execPath);
    } else {
      // Check in PATH environment variable
      const pathEnv = process.env.PATH || '';
      const pathDirs = pathEnv.split(path.delimiter);
      executableExists = pathDirs.some((dir) => fs.existsSync(path.join(dir, execPath)));
    }

    if (!executableExists) {
      logger.warn(`Executable "${execPath}" not found on host workstation system.`);
      const missingResult: IExecutionResult = {
        exitCode: 127,
        startTime: startIso,
        endTime: new Date().toISOString(),
        durationMs: 0,
        stdout: '',
        stderr: `Waiting for real simulator integration. Executable "${execPath}" is missing or not installed on host workstation.`,
        status: 'Executable Missing',
        errorMessage: `Waiting for real simulator integration. Executable "${execPath}" not found.`,
      };
      this.writeWorkspaceLogs(request, missingResult);
      executionMonitor.recordCompletion(requestId, missingResult);
      return missingResult;
    }

    // 3. Prepare Environment & Child Process
    executionMonitor.updateStatus(requestId, 'Running');

    const env = {
      ...process.env,
      ...request.environmentVariables,
    };

    let childProc: ChildProcess | null = null;
    let isCancelled = false;
    let isTimeout = false;
    let timerHandle: NodeJS.Timeout | null = null;

    return new Promise<IExecutionResult>((resolve) => {
      const args = request.arguments || [];
      const timeoutMs = request.timeoutMs || 3600000; // 1 hour default

      logger.info(`Starting execution [${requestId}]: execFile("${execPath}", [${args.join(', ')}]) in "${request.workingDirectory}"`);

      let stdoutAccumulator = '';
      let stderrAccumulator = '';

      childProc = execFile(
        execPath,
        args,
        {
          cwd: request.workingDirectory,
          env,
          maxBuffer: 50 * 1024 * 1024, // 50MB stdout/stderr buffer
          shell: false,
        },
        (error, stdout, stderr) => {
          if (timerHandle) clearTimeout(timerHandle);

          const endTime = new Date();
          const durationMs = endTime.getTime() - startTime.getTime();
          stdoutAccumulator = stdout || stdoutAccumulator;
          stderrAccumulator = stderr || stderrAccumulator;

          let status: ExecutionStatus = 'Completed';
          let errorMessage: string | undefined;

          // Check cancellation
          if (isCancelled) {
            status = 'Cancelled';
            errorMessage = 'Process execution was explicitly cancelled by user or system.';
          } else if (isTimeout) {
            status = 'Timeout';
            errorMessage = `Execution timed out after ${timeoutMs}ms.`;
          } else if (error) {
            status = 'Failed';
            errorMessage = error.message;

            // License Error Detection
            const combinedLogs = `${stdoutAccumulator}\n${stderrAccumulator}`.toLowerCase();
            if (
              combinedLogs.includes('license') ||
              combinedLogs.includes('lm_license_file') ||
              combinedLogs.includes('flexlm') ||
              combinedLogs.includes('no license for feature') ||
              combinedLogs.includes('license checkout failed') ||
              combinedLogs.includes('licensing error')
            ) {
              status = 'License Error';
              errorMessage = `Simulator license error detected: ${error.message}`;
            }
          }

          const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;

          const finalResult: IExecutionResult = {
            exitCode,
            startTime: startIso,
            endTime: endTime.toISOString(),
            durationMs,
            stdout: stdoutAccumulator,
            stderr: stderrAccumulator,
            status,
            errorMessage,
            pid: childProc?.pid,
          };

          this.writeWorkspaceLogs(request, finalResult);
          executionMonitor.recordCompletion(requestId, finalResult);
          resolve(finalResult);
        }
      );

      // Timeout handler
      timerHandle = setTimeout(() => {
        isTimeout = true;
        if (childProc && !childProc.killed) {
          logger.warn(`Process [${requestId}] exceeded timeout of ${timeoutMs}ms. Killing process PID: ${childProc.pid}`);
          childProc.kill('SIGTERM');
          setTimeout(() => {
            if (childProc && !childProc.killed) {
              childProc.kill('SIGKILL');
            }
          }, 5000);
        }
      }, timeoutMs);

      // Register process handles with monitor for cancellation support
      context.process = {
        pid: childProc.pid,
        cancel: () => {
          isCancelled = true;
          if (childProc && !childProc.killed) {
            childProc.kill('SIGTERM');
          }
        },
        kill: (signal = 'SIGKILL') => {
          if (childProc && !childProc.killed) {
            childProc.kill(signal);
          }
        },
        promise: Promise.resolve({} as any), // populated by parent
      };
    });
  }

  public cancel(requestId: string): boolean {
    return executionMonitor.cancelExecution(requestId);
  }

  public killProcess(requestId: string, signal?: NodeJS.Signals): void {
    const ctx = executionMonitor.getContext(requestId);
    if (ctx && ctx.process) {
      ctx.process.kill(signal);
    }
  }

  public async restart(request: IExecutionRequest): Promise<IExecutionResult> {
    logger.info(`Restarting execution for plugin ${request.pluginName || 'generic'}`);
    return this.execute(request);
  }

  public async retry(request: IExecutionRequest, maxRetries = 3): Promise<IExecutionResult> {
    let attempts = 0;
    let lastResult: IExecutionResult;

    do {
      attempts++;
      logger.info(`Execution attempt ${attempts}/${maxRetries}...`);
      lastResult = await this.execute(request);
      if (lastResult.status === 'Completed') {
        return lastResult;
      }
    } while (attempts < maxRetries && lastResult.status !== 'Executable Missing');

    return lastResult;
  }

  private writeWorkspaceLogs(request: IExecutionRequest, result: IExecutionResult): void {
    const { experimentId, runId, workingDirectory } = request;

    // If workspace experimentId and runId provided, use WorkspaceManager logging
    if (experimentId && runId && workspaceManager.workspaceExists(experimentId, runId)) {
      try {
        workspaceManager.writeOutputFile(experimentId, runId, 'stdout.log', result.stdout || '');
        workspaceManager.writeOutputFile(experimentId, runId, 'stderr.log', result.stderr || '');
        workspaceManager.writeOutputFile(
          experimentId,
          runId,
          'execution.json',
          JSON.stringify(result, null, 2)
        );
        workspaceManager.appendExecutionLog(
          experimentId,
          runId,
          `Execution finished with status [${result.status}], Exit Code: ${result.exitCode}, Duration: ${result.durationMs}ms`
        );
        return;
      } catch (err: any) {
        logger.warn(`Failed to write logs via WorkspaceManager: ${err.message}`);
      }
    }

    // Direct filesystem fallback in workingDirectory
    try {
      const logsDir = path.join(workingDirectory, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(logsDir, 'stdout.log'), result.stdout || '', 'utf-8');
      fs.writeFileSync(path.join(logsDir, 'stderr.log'), result.stderr || '', 'utf-8');
      fs.writeFileSync(path.join(logsDir, 'execution.json'), JSON.stringify(result, null, 2), 'utf-8');
    } catch (err: any) {
      logger.warn(`Failed to write fallback log files: ${err.message}`);
    }
  }
}

export const commandExecutor = new CommandExecutor();
