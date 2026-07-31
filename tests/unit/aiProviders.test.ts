import { describe, it, expect, beforeAll } from 'vitest';
import type { AIProviderRegistry } from '../../backend/ai/providers/registry.js';

// The registry reads provider API keys from the environment at construction.
// Set a controlled subset BEFORE importing config/registry (dynamic import in
// beforeAll), so the assertions don't depend on the developer's real .env.
let registry: AIProviderRegistry;

beforeAll(async () => {
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.ANTHROPIC_API_KEY = 'test-claude-key';
  process.env.AI_PROVIDER = 'claude';
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.GROK_API_KEY;

  const mod = await import('../../backend/ai/providers/registry.js');
  registry = new mod.AIProviderRegistry();
});

describe('AIProviderRegistry', () => {
  it('exposes all five providers regardless of configuration', () => {
    const ids = registry.listAll().map((p) => p.id).sort();
    expect(ids).toEqual(['claude', 'deepseek', 'gemini', 'grok', 'openai']);
  });

  it('marks only providers with a key as configured', () => {
    const meta = Object.fromEntries(registry.meta().map((m) => [m.id, m.configured]));
    expect(meta.gemini).toBe(true);
    expect(meta.claude).toBe(true);
    expect(meta.deepseek).toBe(false);
    expect(meta.openai).toBe(false);
    expect(meta.grok).toBe(false);
  });

  it('never leaks API keys through meta()', () => {
    const serialized = JSON.stringify(registry.meta());
    expect(serialized).not.toContain('test-gemini-key');
    expect(serialized).not.toContain('test-claude-key');
  });

  it('lists exactly the configured providers', () => {
    expect(registry.listConfigured().map((p) => p.id).sort()).toEqual(['claude', 'gemini']);
  });

  it('drops unconfigured providers from a requested selection', () => {
    const resolved = registry.resolveSelection(['gemini', 'deepseek']).map((p) => p.id);
    expect(resolved).toEqual(['gemini']); // deepseek has no key -> filtered out
  });

  it('falls back to the default provider when the selection is all-unconfigured', () => {
    const resolved = registry.resolveSelection(['openai', 'grok']).map((p) => p.id);
    expect(resolved).toEqual(['claude']); // AI_PROVIDER=claude
  });

  it('falls back to the default provider when no selection is given', () => {
    expect(registry.resolveSelection().map((p) => p.id)).toEqual(['claude']);
    expect(registry.resolveSelection([]).map((p) => p.id)).toEqual(['claude']);
  });

  it('keeps a multi-provider selection intact (ensemble)', () => {
    const resolved = registry.resolveSelection(['gemini', 'claude']).map((p) => p.id);
    expect(resolved).toEqual(['gemini', 'claude']);
  });

  it('honors AI_PROVIDER as the default', () => {
    expect(registry.defaultProvider()?.id).toBe('claude');
  });
});
