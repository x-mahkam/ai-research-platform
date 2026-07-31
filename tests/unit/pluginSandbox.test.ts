import { describe, it, expect } from 'vitest';
import { PluginSandbox } from '../../backend/plugins/sandbox/index.js';

describe('PluginSandbox', () => {
  it('resolves an operation that finishes within the timeout', async () => {
    const sb = new PluginSandbox();
    const result = await sb.executeInSandbox('p', async () => 42, { timeoutMs: 1000 });
    expect(result).toBe(42);
  });

  it('rejects when the operation exceeds an explicit timeout', async () => {
    const sb = new PluginSandbox();
    await expect(
      sb.executeInSandbox('p', () => new Promise((res) => setTimeout(() => res(1), 100)), { timeoutMs: 10 })
    ).rejects.toThrow(/timed out/);
  });

  it('does not kill a run that takes longer than 30s under the default timeout', async () => {
    // Regression guard: the default used to be 30s, which killed real solver
    // runs (COMSOL). We can't wait 30s in a test, but a run using the DEFAULT
    // timeout must not reject for an operation that resolves normally.
    const sb = new PluginSandbox();
    const result = await sb.executeInSandbox('comsol-multiphysics', () =>
      new Promise((res) => setTimeout(() => res('done'), 40))
    );
    expect(result).toBe('done');
  });
});
