import { describe, it, expect } from 'vitest';
import { validateAIChatDTO } from '../../backend/api/dto/aiDTO.js';

describe('validateAIChatDTO', () => {
  it('requires a non-empty prompt', () => {
    expect(() => validateAIChatDTO({})).toThrow(/prompt/i);
    expect(() => validateAIChatDTO({ prompt: '' })).toThrow(/prompt/i);
  });

  it('forwards experimentId and jobId so the server can load real results', () => {
    // Regression guard: these were silently dropped, leaving the AI with an
    // empty context ({}) even after a completed simulation.
    const dto = validateAIChatDTO({
      prompt: 'Analyze the results',
      experimentId: 'exp-123',
      jobId: 'job-456',
    });
    expect(dto.experimentId).toBe('exp-123');
    expect(dto.jobId).toBe('job-456');
  });

  it('ignores non-string ids', () => {
    const dto = validateAIChatDTO({ prompt: 'hi', experimentId: 42, jobId: {} });
    expect(dto.experimentId).toBeUndefined();
    expect(dto.jobId).toBeUndefined();
  });

  it('keeps only string provider ids', () => {
    const dto = validateAIChatDTO({ prompt: 'hi', providers: ['claude', 7, null, 'gemini'] });
    expect(dto.providers).toEqual(['claude', 'gemini']);
  });
});
