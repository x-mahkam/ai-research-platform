import { describe, it, expect, beforeAll } from 'vitest';

// The registry must re-read provider keys from the environment on reload(),
// so keys set at runtime (via the in-app settings) take effect without a
// restart. This exercises reload() only — it does NOT write any .env file.
let RegistryCtor: typeof import('../../backend/ai/providers/registry.js')['AIProviderRegistry'];

beforeAll(async () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.GROK_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  const mod = await import('../../backend/ai/providers/registry.js');
  RegistryCtor = mod.AIProviderRegistry;
});

describe('AIProviderRegistry.reload', () => {
  it('picks up a key set after construction', () => {
    const reg = new RegistryCtor();
    expect(reg.meta().find((m) => m.id === 'gemini')?.configured).toBe(false);

    process.env.GEMINI_API_KEY = 'runtime-test-key';
    reg.reload();
    expect(reg.meta().find((m) => m.id === 'gemini')?.configured).toBe(true);
    expect(reg.listConfigured().map((p) => p.id)).toContain('gemini');

    delete process.env.GEMINI_API_KEY;
    reg.reload();
    expect(reg.meta().find((m) => m.id === 'gemini')?.configured).toBe(false);
  });
});
