import { execFile, ChildProcess } from 'child_process';
import { LoggerService } from '../logging/logger.js';
import { TimeoutError } from './errors.js';

const logger = new LoggerService('ComsolProcess');

export interface IComsolProcessRunOptions {
  executablePath: string;
  args: string[];
  cwd: string;
  env?: Record<string, string>;
  timeoutMs?: number;
}

export interface IComsolProcessOutput {
  exitCode: number;
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  startTime: string;
  endTime: string;
  isTimeout: boolean;
  isKilled: boolean;
  pid?: number;
}

export class ComsolProcess {
  private childProcess: ChildProcess | null = null;
  private isKilled: boolean = false;
  private isTimeout: boolean = false;

  public async run(options: IComsolProcessRunOptions): Promise<IComsolProcessOutput> {
    const { executablePath, args, cwd, env, timeoutMs = 3600000 } = options;
    const startTime = new Date();
    const startIso = startTime.toISOString();

    logger.info(`Launching COMSOL batch execution: execFile("${executablePath}", [${args.join(', ')}]) in "${cwd}"`);

    const mergedEnv = {
      ...process.env,
      ...env,
    };

    let timerHandle: NodeJS.Timeout | null = null;

    return new Promise<IComsolProcessOutput>((resolve, reject) => {
      let stdoutBuffer = '';
      let stderrBuffer = '';

      // Strictly use execFile() - NEVER use exec()
      this.childProcess = execFile(
        executablePath,
        args,
        {
          cwd,
          env: mergedEnv,
          maxBuffer: 100 * 1024 * 1024, // 100MB buffer for large finite element logs
          shell: false, // Ensure no shell injection or exec overhead
        },
        (error, stdout, stderr) => {
          if (timerHandle) clearTimeout(timerHandle);

          const endTime = new Date();
          const executionTimeMs = endTime.getTime() - startTime.getTime();
          stdoutBuffer = stdout || stdoutBuffer;
          stderrBuffer = stderr || stderrBuffer;

          const exitCode = error ? (typeof error.code === 'number' ? error.code : 1) : 0;

          if (this.isTimeout) {
            reject(new TimeoutError(`COMSOL execution timed out after ${timeoutMs}ms.`, timeoutMs));
            return;
          }

          resolve({
            exitCode,
            stdout: stdoutBuffer,
            stderr: stderrBuffer,
            executionTimeMs,
            startTime: startIso,
            endTime: endTime.toISOString(),
            isTimeout: this.isTimeout,
            isKilled: this.isKilled,
            pid: this.childProcess?.pid,
          });
        }
      );

      // Timeout Monitor
      timerHandle = setTimeout(() => {
        this.isTimeout = true;
        logger.warn(`COMSOL process (PID: ${this.childProcess?.pid}) exceeded timeout limit of ${timeoutMs}ms. Killing process...`);
        this.kill('SIGTERM');
        setTimeout(() => {
          if (this.childProcess && !this.childProcess.killed) {
            this.kill('SIGKILL');
          }
        }, 5000);
      }, timeoutMs);
    });
  }

  public kill(signal: NodeJS.Signals = 'SIGKILL'): void {
    this.isKilled = true;
    if (this.childProcess && !this.childProcess.killed) {
      this.childProcess.kill(signal);
      logger.info(`Sent ${signal} signal to COMSOL process PID: ${this.childProcess.pid}`);
    }
  }

  public getPid(): number | undefined {
    return this.childProcess?.pid;
  }
}
