import { describe, it, expect, beforeAll } from 'vitest';
import { AutonomousLoopService, pickObjective, AutoLoopDeps } from '../../backend/ai/autoloop/index.js';
import { experimentRepository } from '../../backend/repositories/experimentRepository.js';

// The service validates the experiment exists; seed one real experiment id.
let experimentId: string;

beforeAll(() => {
  experimentId = 'auto-loop-exp-1';
  experimentRepository.create({
    id: experimentId,
    projectId: 'proj-001',
    title: 'auto-loop-unit',
    pluginId: 'comsol-multiphysics',
    status: 'Draft',
  } as any);
});

async function waitFor(fn: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!fn()) {
    if (Date.now() - start > timeoutMs) throw new Error('timeout waiting for condition');
    await new Promise((r) => setTimeout(r, 20));
  }
}

describe('pickObjective', () => {
  it('prefers an exact metric match, then substring, then first numeric', () => {
    expect(pickObjective({ Tmax: 372.4, DOF: 561 }, 'Tmax')).toBe(372.4);
    expect(pickObjective({ 'Max temperature': '400 K' }, 'temperature')).toBe(400);
    expect(pickObjective({ label: 'x', n: '12.5' })).toBe(12.5);
    expect(pickObjective(undefined)).toBeNull();
    expect(pickObjective({ label: 'none' })).toBeNull();
  });
});

describe('AutonomousLoopService', () => {
  it('runs every point sequentially, records objectives, and concludes', async () => {
    const seen: Array<string | number> = [];
    const deps: AutoLoopDeps = {
      runPoint: async (_exp, param, value) => {
        seen.push(value);
        return { jobId: `job-${value}`, ok: true, metrics: { [param]: value as number, Current: Number(value) * 2 } };
      },
      conclude: async (run) => `done:${run.points.length}`,
    };
    const svc = new AutonomousLoopService(deps);
    const run = svc.start({ experimentId, parameter: 'V_app', values: [0.1, 0.2, 0.3], objectiveMetric: 'Current' });

    await waitFor(() => svc.getStatus(run.id)?.status === 'completed');
    const final = svc.getStatus(run.id)!;

    expect(seen).toEqual([0.1, 0.2, 0.3]); // sequential, in order
    expect(final.points.map((p) => p.status)).toEqual(['completed', 'completed', 'completed']);
    expect(final.points.map((p) => p.objective)).toEqual([0.2, 0.4, 0.6]);
    expect(final.conclusion).toBe('done:3');
  });

  it('marks a failed point but continues the sweep', async () => {
    const deps: AutoLoopDeps = {
      runPoint: async (_exp, _param, value) =>
        value === 0.2
          ? { jobId: 'job-x', ok: false, error: 'solver diverged' }
          : { jobId: `job-${value}`, ok: true, metrics: { Current: 1 } },
      conclude: async () => 'ok',
    };
    const svc = new AutonomousLoopService(deps);
    const run = svc.start({ experimentId, parameter: 'V_app', values: [0.1, 0.2, 0.3] });

    await waitFor(() => svc.getStatus(run.id)?.status === 'completed');
    const final = svc.getStatus(run.id)!;
    expect(final.points.map((p) => p.status)).toEqual(['completed', 'failed', 'completed']);
    expect(final.points[1].error).toBe('solver diverged');
  });

  it('rejects an empty value list and a bad parameter name', () => {
    const svc = new AutonomousLoopService({ runPoint: async () => ({ jobId: 'j', ok: true }), conclude: async () => '' });
    expect(() => svc.start({ experimentId, parameter: 'V_app', values: [] })).toThrow(/at least one/i);
    expect(() => svc.start({ experimentId, parameter: '1bad', values: [1] })).toThrow(/valid COMSOL parameter/i);
  });

  it('rejects an unknown experiment', () => {
    const svc = new AutonomousLoopService({ runPoint: async () => ({ jobId: 'j', ok: true }), conclude: async () => '' });
    expect(() => svc.start({ experimentId: 'nope-xyz', parameter: 'V_app', values: [1] })).toThrow(/not found/i);
  });
});
