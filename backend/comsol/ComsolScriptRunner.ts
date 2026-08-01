import fs from 'fs';
import path from 'path';
import { ComsolProcess, IComsolProcessRunOptions, IComsolProcessOutput } from './ComsolProcess.js';
import { ComsolLocator } from './ComsolLocator.js';
import { LoggerService } from '../logging/logger.js';

const logger = new LoggerService('ComsolScriptRunner');

export interface ScriptRunInput {
  /** Absolute path to the COMSOL Java model file (…/Model.java). */
  javaFilePath: string;
  /** Working directory (compiled .class and outputs land here). */
  workspacePath: string;
  /** Where the rebuilt model should be written. */
  outputModelPath: string;
  timeoutMs?: number;
}

export interface ScriptRunResult {
  success: boolean;
  outputModelPath?: string;
  classPath?: string;
  compileLog: string;
  runLog: string;
  error?: string;
}

/** Injectable seams so the pipeline is unit-testable without a real COMSOL. */
export interface ScriptRunnerDeps {
  runProc: (opts: IComsolProcessRunOptions) => Promise<IComsolProcessOutput>;
  locateBatch: () => string;
  resolveCompanion: (name: string) => string | null;
  exists: (p: string) => boolean;
}

const defaultDeps: ScriptRunnerDeps = {
  runProc: (opts) => new ComsolProcess().run(opts),
  locateBatch: () => ComsolLocator.locate(),
  resolveCompanion: (name) => ComsolLocator.resolveCompanion(name),
  exists: (p) => fs.existsSync(p),
};

/**
 * Compiles a COMSOL Java model file with `comsolcompile`, then runs the
 * resulting class with `comsolbatch` to (re)build and solve a model, producing
 * an output .mph. This is the LiveLink path that lets the platform apply
 * structural model changes a raw .mph edit cannot.
 *
 * COMSOL CLI specifics vary slightly by install; every command and its full
 * stdout/stderr is captured and returned so failures are diagnosable rather
 * than silent.
 */
export class ComsolScriptRunner {
  constructor(private deps: ScriptRunnerDeps = defaultDeps) {}

  public async run(input: ScriptRunInput): Promise<ScriptRunResult> {
    const { javaFilePath, workspacePath, outputModelPath, timeoutMs = 3_600_000 } = input;

    if (!/\.java$/i.test(javaFilePath)) {
      return { success: false, compileLog: '', runLog: '', error: 'Model script must be a .java file.' };
    }
    if (!this.deps.exists(javaFilePath)) {
      return { success: false, compileLog: '', runLog: '', error: `Java model file not found: ${javaFilePath}` };
    }

    let batchPath: string;
    try {
      batchPath = this.deps.locateBatch();
    } catch (err) {
      return { success: false, compileLog: '', runLog: '', error: (err as Error).message };
    }

    const compiler = this.deps.resolveCompanion('comsolcompile');
    if (!compiler) {
      return {
        success: false,
        compileLog: '',
        runLog: '',
        error:
          'comsolcompile was not found next to comsolbatch. It ships with COMSOL; ' +
          'verify your COMSOL installation and the configured path in Settings.',
      };
    }

    // 1. Compile the Java model file → .class
    logger.info(`Compiling COMSOL model: ${compiler} ${javaFilePath}`);
    const compile = await this.deps.runProc({
      executablePath: compiler,
      args: [javaFilePath],
      cwd: workspacePath,
      timeoutMs,
    });
    const compileLog = `${compile.stdout}\n${compile.stderr}`.trim();
    const classPath = javaFilePath.replace(/\.java$/i, '.class');
    if (compile.exitCode !== 0 || !this.deps.exists(classPath)) {
      return {
        success: false,
        classPath,
        compileLog,
        runLog: '',
        error: `Model compilation failed (exit code ${compile.exitCode}). See compile log.`,
      };
    }

    // 2. Run the compiled class → output .mph
    logger.info(`Running compiled COMSOL model: ${batchPath} -inputfile ${classPath}`);
    const run = await this.deps.runProc({
      executablePath: batchPath,
      args: ['-inputfile', classPath, '-outputfile', outputModelPath],
      cwd: workspacePath,
      timeoutMs,
    });
    const runLog = `${run.stdout}\n${run.stderr}`.trim();
    const produced = this.deps.exists(outputModelPath);
    if (run.exitCode !== 0 || !produced) {
      return {
        success: false,
        classPath,
        compileLog,
        runLog,
        error: `Model build/run failed (exit code ${run.exitCode})${
          !produced ? ', no output model was produced' : ''
        }. See run log.`,
      };
    }

    logger.info(`COMSOL model rebuilt at ${outputModelPath}`);
    return { success: true, outputModelPath, classPath, compileLog, runLog };
  }
}

export const comsolScriptRunner = new ComsolScriptRunner();

/** Convenience: resolve where the rebuilt model should be written for a workspace. */
export function defaultRebuiltModelPath(workspacePath: string): string {
  return path.join(workspacePath, 'output', 'rebuilt_model.mph');
}
