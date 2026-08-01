import { describe, it, expect } from 'vitest';
import { ComsolScriptRunner, ScriptRunnerDeps } from '../../backend/comsol/ComsolScriptRunner.js';
import type { IComsolProcessOutput } from '../../backend/comsol/ComsolProcess.js';

function okOutput(overrides: Partial<IComsolProcessOutput> = {}): IComsolProcessOutput {
  return {
    exitCode: 0,
    stdout: 'ok',
    stderr: '',
    executionTimeMs: 1,
    startTime: 't0',
    endTime: 't1',
    isTimeout: false,
    isKilled: false,
    ...overrides,
  };
}

function makeDeps(over: Partial<ScriptRunnerDeps> = {}): { deps: ScriptRunnerDeps; calls: Array<{ exe: string; args: string[] }> } {
  const calls: Array<{ exe: string; args: string[] }> = [];
  const deps: ScriptRunnerDeps = {
    runProc: async (o) => {
      calls.push({ exe: o.executablePath, args: o.args });
      return okOutput();
    },
    locateBatch: () => '/comsol/bin/comsolbatch',
    resolveCompanion: (n) => `/comsol/bin/${n}`,
    exists: () => true,
    ...over,
  };
  return { deps, calls };
}

describe('ComsolScriptRunner', () => {
  it('compiles then runs, passing the right executables and flags', async () => {
    const { deps, calls } = makeDeps();
    const runner = new ComsolScriptRunner(deps);
    const res = await runner.run({
      javaFilePath: '/ws/Model.java',
      workspacePath: '/ws',
      outputModelPath: '/ws/output/rebuilt.mph',
    });
    expect(res.success).toBe(true);
    expect(res.outputModelPath).toBe('/ws/output/rebuilt.mph');
    // First call is the compiler on the .java; second runs the .class via batch.
    expect(calls[0].exe).toBe('/comsol/bin/comsolcompile');
    expect(calls[0].args).toEqual(['/ws/Model.java']);
    expect(calls[1].exe).toBe('/comsol/bin/comsolbatch');
    expect(calls[1].args).toEqual(['-inputfile', '/ws/Model.class', '-outputfile', '/ws/output/rebuilt.mph']);
  });

  it('rejects a non-.java script', async () => {
    const { deps } = makeDeps();
    const res = await new ComsolScriptRunner(deps).run({
      javaFilePath: '/ws/model.mph',
      workspacePath: '/ws',
      outputModelPath: '/ws/out.mph',
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/\.java/);
  });

  it('fails clearly when comsolcompile is missing', async () => {
    const { deps } = makeDeps({ resolveCompanion: () => null });
    const res = await new ComsolScriptRunner(deps).run({
      javaFilePath: '/ws/Model.java',
      workspacePath: '/ws',
      outputModelPath: '/ws/out.mph',
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/comsolcompile/);
  });

  it('surfaces a compilation failure and does not attempt to run', async () => {
    const calls: string[] = [];
    const { deps } = makeDeps({
      runProc: async (o) => {
        calls.push(o.executablePath);
        return okOutput({ exitCode: 1, stderr: 'syntax error' });
      },
    });
    const res = await new ComsolScriptRunner(deps).run({
      javaFilePath: '/ws/Model.java',
      workspacePath: '/ws',
      outputModelPath: '/ws/out.mph',
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/compilation failed/i);
    expect(res.compileLog).toMatch(/syntax error/);
    expect(calls).toHaveLength(1); // never ran the batch step
  });

  it('fails when the run produces no output model', async () => {
    // Compile "succeeds" (class exists) but the output .mph never appears.
    const { deps } = makeDeps({
      exists: (p) => p.endsWith('.java') || p.endsWith('.class'),
    });
    const res = await new ComsolScriptRunner(deps).run({
      javaFilePath: '/ws/Model.java',
      workspacePath: '/ws',
      outputModelPath: '/ws/out.mph',
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/no output model/i);
  });
});
