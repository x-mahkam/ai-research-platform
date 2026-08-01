import { describe, it, expect } from 'vitest';
import {
  extractParametersFromMphBuffer,
  extractParametersFromMph,
} from '../../backend/comsol/ComsolModelParameters.js';

describe('extractParametersFromMphBuffer', () => {
  it('recovers name/value/unit from COMSOL-style "value[unit]" storage', () => {
    // Simulate how parameters appear amid binary bytes (nulls as separators).
    const blob = Buffer.from(
      `\x00\x00V_app\x00\x00\x000.7[V]\x00\x00garbage\x01\x02T_amb\x00300[K]\x00`,
      'latin1'
    );
    const params = extractParametersFromMphBuffer(blob);
    const byName = Object.fromEntries(params.map((p) => [p.name, p]));
    expect(byName.V_app.value).toBe(0.7);
    expect(byName.V_app.unit).toBe('V');
    expect(byName.T_amb.value).toBe(300);
    expect(byName.T_amb.unit).toBe('K');
    expect(params.every((p) => p.group === 'Model Parameters')).toBe(true);
  });

  it('returns nothing when there is no unit-bracketed value (avoids fabrication)', () => {
    const blob = Buffer.from('random binary 12345 no comsol params here', 'latin1');
    expect(extractParametersFromMphBuffer(blob)).toEqual([]);
  });

  it('skips COMSOL internal tag names like comp1/mesh1', () => {
    const blob = Buffer.from('comp1\x00300[K]\x00mesh1\x000.5[mm]\x00Lg\x0020[nm]', 'latin1');
    const names = extractParametersFromMphBuffer(blob).map((p) => p.name);
    expect(names).not.toContain('comp1');
    expect(names).not.toContain('mesh1');
    expect(names).toContain('Lg');
  });

  it('dedupes repeated parameter names', () => {
    const blob = Buffer.from('V_app\x000.1[V]\x00V_app\x000.9[V]', 'latin1');
    const params = extractParametersFromMphBuffer(blob);
    expect(params.filter((p) => p.name === 'V_app')).toHaveLength(1);
    expect(params[0].value).toBe(0.1); // first occurrence wins
  });
});

describe('extractParametersFromMph (file)', () => {
  it('returns [] for a missing or empty path without throwing', () => {
    expect(extractParametersFromMph('/no/such/file.mph')).toEqual([]);
    expect(extractParametersFromMph('')).toEqual([]);
  });
});
