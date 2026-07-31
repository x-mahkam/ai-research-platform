import { describe, it, expect } from 'vitest';
import { extractFromLog } from '../../backend/comsol/ComsolResultExtractor.js';

const SAMPLE_STDOUT = `
COMSOL Multiphysics 6.3 (Build: 290) batch run
Opening file: model.mph
Running: Study 1
Compiling equations: Stationary
Number of degrees of freedom solved for: 128,540
Nonlinear solver
  Iteration 1: error 3.2e-1
  Iteration 2: error 4.1e-3
Solution converged.
Solution time: 42.6 s
Physical memory: 1834 MB
Global evaluation:
  Tmax = 372.4 K
  Average velocity = 0.015 m/s
Warning: Inverted mesh element detected near boundary 5.
Saving file: result.mph
`;

describe('ComsolResultExtractor.extractFromLog', () => {
  it('extracts degrees of freedom, solution time and memory', () => {
    const r = extractFromLog(SAMPLE_STDOUT, '');
    expect(r.metrics['Degrees of freedom']).toBe(128540);
    expect(r.metrics['Solver solution time (s)']).toBeCloseTo(42.6, 1);
    expect(r.metrics['Peak memory']).toBe('1834 MB');
  });

  it('detects convergence and records the verdict', () => {
    const r = extractFromLog(SAMPLE_STDOUT, '');
    expect(r.converged).toBe(true);
    expect(r.metrics['Converged']).toBe('yes');
  });

  it('flags non-convergence', () => {
    const r = extractFromLog('Nonlinear solver did not converge after 25 iterations.', '');
    expect(r.converged).toBe(false);
  });

  it('captures computed global values with units', () => {
    const r = extractFromLog(SAMPLE_STDOUT, '');
    const names = r.computedValues.map((v) => v.name);
    expect(names).toContain('Tmax');
    const tmax = r.computedValues.find((v) => v.name === 'Tmax');
    expect(tmax?.value).toBe('372.4');
    expect(tmax?.unit).toBe('K');
  });

  it('collects warnings and errors', () => {
    const r = extractFromLog(SAMPLE_STDOUT, 'Error: license feature COMSOL not found');
    expect(r.warnings.some((w) => /inverted mesh/i.test(w))).toBe(true);
    expect(r.errors.some((e) => /license feature/i.test(e))).toBe(true);
  });

  it('returns a non-empty log tail and never throws on empty input', () => {
    const r = extractFromLog(SAMPLE_STDOUT, '');
    expect(r.logTail.length).toBeGreaterThan(0);
    const empty = extractFromLog('', '');
    expect(empty.converged).toBeNull();
    expect(empty.warnings).toEqual([]);
    expect(empty.computedValues).toEqual([]);
  });
});
