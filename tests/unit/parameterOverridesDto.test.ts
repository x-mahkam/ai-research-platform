import { describe, it, expect } from 'vitest';
import { validateParameterOverrides, validateRunSimulationDTO } from '../../backend/api/dto/simulationDTO.js';

describe('validateParameterOverrides', () => {
  it('returns undefined when absent', () => {
    expect(validateParameterOverrides(undefined)).toBeUndefined();
    expect(validateParameterOverrides(null)).toBeUndefined();
    expect(validateParameterOverrides({})).toBeUndefined();
  });

  it('accepts identifier names with numeric or unit-bearing string values', () => {
    const out = validateParameterOverrides({ V_bias: '0.7[V]', T_amb: 300 });
    expect(out).toEqual({ V_bias: '0.7[V]', T_amb: 300 });
  });

  it('rejects a value containing a comma (a range/list would break -plist alignment)', () => {
    // Each run overrides a parameter to a single operating point; the loop
    // sweeps by launching many single-value runs, never a comma-separated list.
    expect(() => validateParameterOverrides({ V: '0.1,0.2' })).toThrow(/Invalid value/);
    expect(() => validateParameterOverrides({ V: 'range(0,0.1,1)' })).toThrow(/Invalid value/);
  });

  it('rejects invalid parameter names', () => {
    expect(() => validateParameterOverrides({ '1bad': 1 })).toThrow(/Invalid parameter name/);
    expect(() => validateParameterOverrides({ 'a b': 1 })).toThrow(/Invalid parameter name/);
  });

  it('rejects non-finite numbers and non-scalar values', () => {
    expect(() => validateParameterOverrides({ x: Infinity })).toThrow(/non-finite/);
    expect(() => validateParameterOverrides({ x: { nested: 1 } as unknown as number })).toThrow(/number or string/);
  });

  it('caps the number of parameters', () => {
    const many: Record<string, number> = {};
    for (let i = 0; i < 40; i++) many[`p${i}`] = i;
    expect(() => validateParameterOverrides(many)).toThrow(/at most 32/);
  });

  it('flows through the run DTO alongside experimentId', () => {
    const dto = validateRunSimulationDTO({ experimentId: 'exp-1', parameterOverrides: { V_bias: 1 } });
    expect(dto.experimentId).toBe('exp-1');
    expect(dto.parameterOverrides).toEqual({ V_bias: 1 });
  });
});
