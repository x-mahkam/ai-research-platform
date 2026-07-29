import { describe, it, expect } from 'vitest';
import { assertSafeId, validateRunSimulationDTO } from '../../backend/api/dto/simulationDTO.js';
import { ValidationError } from '../../backend/shared/errors.js';
import { generateId } from '../../backend/shared/utils.js';

describe('assertSafeId', () => {
  it('accepts plain ids', () => {
    expect(assertSafeId('exp-001', 'experimentId')).toBe('exp-001');
    expect(assertSafeId('sim-job-1785_abc', 'jobId')).toBe('sim-job-1785_abc');
  });

  it('rejects path traversal sequences', () => {
    expect(() => assertSafeId('../../etc/passwd', 'experimentId')).toThrow(ValidationError);
    expect(() => assertSafeId('..', 'experimentId')).toThrow(ValidationError);
    expect(() => assertSafeId('a/b', 'experimentId')).toThrow(ValidationError);
    expect(() => assertSafeId('a\\b', 'experimentId')).toThrow(ValidationError);
  });

  it('rejects non-string and empty values', () => {
    expect(() => assertSafeId(undefined, 'experimentId')).toThrow(ValidationError);
    expect(() => assertSafeId({}, 'experimentId')).toThrow(ValidationError);
    expect(() => assertSafeId('', 'experimentId')).toThrow(ValidationError);
  });
});

describe('validateRunSimulationDTO', () => {
  it('requires an experimentId', () => {
    expect(() => validateRunSimulationDTO({})).toThrow(ValidationError);
  });

  it('rejects a traversal experimentId', () => {
    expect(() => validateRunSimulationDTO({ experimentId: '../../tmp/pwn' })).toThrow(ValidationError);
  });

  it('returns a clean experimentId', () => {
    expect(validateRunSimulationDTO({ experimentId: 'exp-123' })).toEqual({ experimentId: 'exp-123' });
  });
});

describe('generateId', () => {
  it('is prefixed and collision-resistant within the same millisecond', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 1000; i++) ids.add(generateId('exp'));
    expect(ids.size).toBe(1000);
    for (const id of ids) expect(id.startsWith('exp-')).toBe(true);
  });
});
