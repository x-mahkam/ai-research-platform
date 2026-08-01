import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApiApp } from '../../backend/app.js';

// End-to-end regression guard for the scheduler recursion that once froze the
// server: running a simulation must complete a single job and leave the API
// responsive (no runaway job creation, no blocked event loop).

let app: Express;

beforeAll(async () => {
  app = await createApiApp();
});

async function pollUntil<T>(fn: () => Promise<T>, predicate: (v: T) => boolean, timeoutMs = 12000): Promise<T> {
  const start = Date.now();
  let last: T;
  do {
    last = await fn();
    if (predicate(last)) return last;
    await new Promise((r) => setTimeout(r, 300));
  } while (Date.now() - start < timeoutMs);
  return last;
}

describe('simulation run (integration)', () => {
  it('health endpoint responds', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  it('runs a single simulation to completion and keeps the server responsive', async () => {
    // A seeded project (proj-001) exists via migrations; give it a model file.
    await request(app)
      .post('/api/projects/proj-001/models')
      .send({
        fileName: 'ci-test.cmd',
        content: '# ci deck',
        simulator: 'Synopsys Sentaurus TCAD',
        physicsModule: 'Hydrodynamic',
      });

    const expRes = await request(app)
      .post('/api/experiments')
      .send({ projectId: 'proj-001', title: 'ci-integration-run' });
    expect(expRes.status).toBe(201);
    const experimentId = expRes.body.id as string;

    const jobsBefore = (await request(app).get('/api/simulations')).body.length;

    const runRes = await request(app)
      .post('/api/simulations/run')
      .send({ experimentId });
    expect(runRes.status).toBe(201);

    // The job should reach a terminal state (not stay stuck on "Running").
    const jobs = await pollUntil(
      async () => (await request(app).get('/api/simulations')).body as any[],
      (list) => list.some((j) => j.experimentId === experimentId && j.status === 'Completed')
    );
    const job = jobs.find((j) => j.experimentId === experimentId);
    expect(job?.status).toBe('Completed');
    expect(job?.progress).toBe(100);

    // Exactly one job was created for this run — no recursion / runaway.
    const jobsForExp = jobs.filter((j) => j.experimentId === experimentId);
    expect(jobsForExp.length).toBe(1);
    // Total job count grew by exactly one.
    expect(jobs.length).toBe(jobsBefore + 1);

    // The server is still responsive after execution.
    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
  });

  it('rejects a path-traversal experimentId on run', async () => {
    const res = await request(app)
      .post('/api/simulations/run')
      .send({ experimentId: '../../tmp/pwn' });
    expect(res.status).toBe(400);
  });

  it('persists parameterOverrides on the created job so the solver receives them', async () => {
    const expRes = await request(app)
      .post('/api/experiments')
      .send({ projectId: 'proj-001', title: 'ci-param-overrides' });
    const experimentId = expRes.body.id as string;

    const runRes = await request(app)
      .post('/api/simulations/run')
      .send({ experimentId, parameterOverrides: { V_bias: '0.7[V]', T_amb: 300 } });
    expect(runRes.status).toBe(201);
    expect(runRes.body.parameters?.parameterOverrides).toEqual({ V_bias: '0.7[V]', T_amb: 300 });
  });

  it('rejects a parameterOverrides value containing a comma', async () => {
    const expRes = await request(app)
      .post('/api/experiments')
      .send({ projectId: 'proj-001', title: 'ci-bad-override' });
    const res = await request(app)
      .post('/api/simulations/run')
      .send({ experimentId: expRes.body.id, parameterOverrides: { V: '0.1,0.2' } });
    expect(res.status).toBe(400);
  });
});
