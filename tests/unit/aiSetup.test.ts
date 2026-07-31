import { describe, it, expect, beforeAll } from 'vitest';

// With no AI provider configured, generateExperimentSetup must return the
// honest, rule-based fallback (never claim to be AI, never make a network call).
// Clear provider env BEFORE importing the engine so its config sees no keys.
let orchestrator: typeof import('../../backend/ai/engine/index.js')['aiEngineOrchestrator'];

beforeAll(async () => {
  delete process.env.GEMINI_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.XAI_API_KEY;
  delete process.env.GROK_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.AI_PROVIDER;

  const mod = await import('../../backend/ai/engine/index.js');
  orchestrator = mod.aiEngineOrchestrator;
});

describe('generateExperimentSetup', () => {
  it('returns a rule-based, clearly-labeled fallback when no provider is configured', async () => {
    const setup = await orchestrator.generateExperimentSetup({
      objective: 'Minimize subthreshold leakage in a FinFET',
      simulator: 'Synopsys Sentaurus TCAD',
    });

    expect(setup.isAi).toBe(false);
    expect(setup.provider).toBe('fallback');
    expect(Array.isArray(setup.parameters)).toBe(true);
    expect(setup.parameters.length).toBeGreaterThan(0);
    expect(setup.estimatedRuns).toBeGreaterThan(0);
    expect(typeof setup.summary).toBe('string');
    // Every parameter carries the fields the UI table needs.
    for (const p of setup.parameters) {
      expect(p.key).toBeTruthy();
      expect(p.name).toBeTruthy();
      expect(p.baseline !== undefined).toBe(true);
    }
  });
});
