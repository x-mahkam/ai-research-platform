import { describe, it, expect } from 'vitest';
import { OllamaProvider } from '../../backend/ai/providers/OllamaProvider.js';

describe('OllamaProvider', () => {
  it('is configured only when enabled (opt-in, no API key)', () => {
    expect(new OllamaProvider('llama3.1', 'http://localhost:11434/v1', true).isConfigured()).toBe(true);
    expect(new OllamaProvider('llama3.1', 'http://localhost:11434/v1', false).isConfigured()).toBe(false);
  });

  it('carries a stable id/label and the chosen model', () => {
    const p = new OllamaProvider('qwen2.5', 'http://localhost:11434/v1', true);
    expect(p.id).toBe('ollama');
    expect(p.label).toMatch(/ollama/i);
    expect(p.model).toBe('qwen2.5');
  });
});
