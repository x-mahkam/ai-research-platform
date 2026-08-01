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
  /**
   * COMSOL Global Parameter values to override at run time (name → value).
   * Passed to comsolbatch as -pname/-plist so a single model file can be
   * re-run at different operating points — the basis of an autonomous sweep.
   * Values may carry units, e.g. { V_bias: '0.7[V]', T_amb: 300 }.
   */
  parameterOverrides?: Record<string, string | number>;
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
  public readonly parameterOverrides: Record<string, string | number>;
  public readonly options: ComsolJobOptions;
  public readonly createdAt: string;

  constructor(params: IComsolJobParams) {
    this.jobId = params.jobId;
    this.experimentId = params.experimentId;
    this.runId = params.runId;
    this.inputModelPath = params.inputModelPath;
    this.workspacePath = params.workspacePath;
    this.parameters = params.parameters || {};
    this.parameterOverrides = params.parameterOverrides || {};
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

    // Override COMSOL Global Parameters at run time. comsolbatch takes the
    // names and values as two parallel comma-separated lists.
    const names = Object.keys(this.parameterOverrides);
    if (names.length > 0) {
      const values = names.map((n) => String(this.parameterOverrides[n]));
      args.push('-pname', names.join(','), '-plist', values.join(','));
    }

    if (this.options.batchArgs && this.options.batchArgs.length > 0) {
      args.push(...this.options.batchArgs);
    }

    return args;
  }
}
