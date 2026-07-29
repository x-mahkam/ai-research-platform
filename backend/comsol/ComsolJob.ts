import path from 'path';
import { ComsolJobOptions } from './types.js';

export interface IComsolJobParams {
  jobId: string;
  experimentId: string;
  runId: string;
  inputModelPath: string;
  outputModelPath?: string;
  workspacePath: string;
  parameters?: Record<string, unknown>;
  options?: ComsolJobOptions;
}

export class ComsolJob {
  public readonly jobId: string;
  public readonly experimentId: string;
  public readonly runId: string;
  public readonly inputModelPath: string;
  public readonly outputModelPath: string;
  public readonly workspacePath: string;
  public readonly parameters: Record<string, unknown>;
  public readonly options: ComsolJobOptions;
  public readonly createdAt: string;

  constructor(params: IComsolJobParams) {
    this.jobId = params.jobId;
    this.experimentId = params.experimentId;
    this.runId = params.runId;
    this.inputModelPath = params.inputModelPath;
    this.workspacePath = params.workspacePath;
    this.parameters = params.parameters || {};
    this.options = params.options || {};
    this.createdAt = new Date().toISOString();

    // Default output model path to <workspace>/output/result.mph if not explicitly specified
    this.outputModelPath =
      params.outputModelPath || path.join(this.workspacePath, 'output', 'result.mph');
  }

  public getBatchArguments(): string[] {
    const args = [
      '-inputfile',
      this.inputModelPath,
      '-outputfile',
      this.outputModelPath,
    ];

    if (this.options.batchArgs && this.options.batchArgs.length > 0) {
      args.push(...this.options.batchArgs);
    }

    return args;
  }
}
