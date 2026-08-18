import { describe, it, expect } from 'vitest';
import { AIRouter, taskFromPrompt, TASK_PREFERENCES } from '../../backend/ai/router/index.js';
import type { AIProvider } from '../../backend/ai/providers/types.js';

function fakeProvider(id: string, behavior: 'ok' | 'fail', text = `out-${id}`): AIProvider {
  return {
    id,
    label: id,
    model: `${id}-model`,
    isConfigured: () => true,
    generate: async () => {
      if (behavior === 'fail') throw new Error(`${id} boom`);
      return text;
    },
  };
}

/** Minimal registry stub exposing just listConfigured. */
function registryOf(providers: AIProvider[]) {
  return { listConfigured: () => providers } as any;
}

describe('taskFromPrompt', () => {
  it('classifies common research prompts', () => {
    expect(taskFromPrompt('Write the COMSOL Java script')).toBe('coding');
    expect(taskFromPrompt('Analyze the I-V results and convergence')).toBe('analysis');
    expect(taskFromPrompt('Plan the sweep range')).toBe('planning');
    expect(taskFromPrompt('Generate a publication report')).toBe('report');
    expect(taskFromPrompt('hello there')).toBe('general');
  });
});

describe('AIRouter.buildChain', () => {
  it('puts requested first, then task order, then the rest — deduped', () => {
    const providers = ['gemini', 'claude', 'openai'].map((id) => fakeProvider(id, 'ok'));
    const router = new AIRouter(registryOf(providers));
    const chain = router.buildChain({ requested: ['openai'], task: 'analysis' });
    // openai pinned first; then analysis pref (claude before gemini); dedup.
    expect(chain.map((p) => p.id)).toEqual(['openai', 'claude', 'gemini']);
  });

  it('orders purely by task when nothing is pinned', () => {
    const providers = ['gemini', 'deepseek', 'claude'].map((id) => fakeProvider(id, 'ok'));
    const router = new AIRouter(registryOf(providers));
    const chain = router.buildChain({ task: 'quick' });
    // quick prefers gemini/deepseek before claude.
    expect(chain[0].id).toBe('gemini');
    expect(chain.map((p) => p.id)).toContain('deepseek');
    expect(chain[chain.length - 1].id).toBe('claude');
  });
});

describe('AIRouter.generateWithFallback', () => {
  it('returns the first provider that succeeds', async () => {
    const providers = [fakeProvider('claude', 'ok', 'hi from claude')];
    const router = new AIRouter(registryOf(providers));
    const r = await router.generateWithFallback({ system: '', prompt: 'x', maxTokens: 10 });
    expect(r.text).toBe('hi from claude');
    expect(r.providerId).toBe('claude');
  });

  it('falls back to the next provider when the first errors', async () => {
    const providers = [fakeProvider('gemini', 'fail'), fakeProvider('claude', 'ok', 'rescued')];
    const router = new AIRouter(registryOf(providers));
    const r = await router.generateWithFallback({ system: '', prompt: 'x', maxTokens: 10 }, { requested: ['gemini'] });
    expect(r.text).toBe('rescued');
    expect(r.providerId).toBe('claude');
    expect(r.attempts).toEqual([
      { id: 'gemini', ok: false, error: 'gemini boom' },
      { id: 'claude', ok: true },
    ]);
  });

  it('throws a combined error when every provider fails', async () => {
    const providers = [fakeProvider('gemini', 'fail'), fakeProvider('openai', 'fail')];
    const router = new AIRouter(registryOf(providers));
    await expect(
      router.generateWithFallback({ system: '', prompt: 'x', maxTokens: 10 })
    ).rejects.toThrow(/gemini boom.*openai boom/);
  });

  it('throws when nothing is configured', async () => {
    const router = new AIRouter(registryOf([]));
    await expect(router.generateWithFallback({ system: '', prompt: 'x', maxTokens: 10 })).rejects.toThrow(/No AI provider/);
  });
});

describe('TASK_PREFERENCES', () => {
  it('covers every task with a non-empty order', () => {
    for (const key of Object.keys(TASK_PREFERENCES)) {
      expect(TASK_PREFERENCES[key as keyof typeof TASK_PREFERENCES].length).toBeGreaterThan(0);
    }
  });
});
