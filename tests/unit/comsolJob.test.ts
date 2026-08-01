import { describe, it, expect } from 'vitest';
import { ComsolJob } from '../../backend/comsol/ComsolJob.js';

const base = {
  jobId: 'job-1',
  experimentId: 'exp-1',
  runId: 'run-1',
  inputModelPath: '/ws/input/model.mph',
  outputModelPath: '/ws/output/result.mph',
  workspacePath: '/ws',
};

describe('ComsolJob.getBatchArguments', () => {
  it('always passes input and output files', () => {
    const job = new ComsolJob(base);
    expect(job.getBatchArguments()).toEqual([
      '-inputfile',
      '/ws/input/model.mph',
      '-outputfile',
      '/ws/output/result.mph',
    ]);
  });

  it('emits -pname/-plist for parameter overrides as parallel lists', () => {
    const job = new ComsolJob({
      ...base,
      parameterOverrides: { V_bias: '0.7[V]', T_amb: 300 },
    });
    const args = job.getBatchArguments();
    const pnameIdx = args.indexOf('-pname');
    const plistIdx = args.indexOf('-plist');
    expect(pnameIdx).toBeGreaterThan(-1);
    expect(args[pnameIdx + 1]).toBe('V_bias,T_amb');
    expect(args[plistIdx + 1]).toBe('0.7[V],300');
  });

  it('omits -pname/-plist when there are no overrides', () => {
    const job = new ComsolJob(base);
    expect(job.getBatchArguments()).not.toContain('-pname');
  });

  it('keeps explicit batchArgs after the override flags', () => {
    const job = new ComsolJob({
      ...base,
      parameterOverrides: { V_bias: 1 },
      options: { batchArgs: ['-np', '4'] },
    });
    const args = job.getBatchArguments();
    expect(args.slice(-2)).toEqual(['-np', '4']);
    expect(args).toContain('-pname');
  });
});
