import { describe, it, expect } from 'vitest';
import { researchReporter } from '../../backend/ai/reporter/index.js';

describe('ResearchReporter honesty', () => {
  it('data-only report contains no fabricated physics claims or numbers', () => {
    const r = researchReporter.generateReport({
      experiment: { id: 'e1', title: 'FinFET', results: { metrics: { Tmax: '372 K' } } },
      projectName: 'P',
    });
    const md = r.markdownContent;
    // The old canned report invented these — they must be gone.
    expect(md).not.toMatch(/4\.65 eV/);
    expect(md).not.toMatch(/0\.2 nm/);
    expect(md).not.toMatch(/12 K/);
    expect(md).not.toMatch(/Drift-Diffusion & Hydrodynamic/);
    expect(md).not.toMatch(/Band-to-Band Tunneling/);
    // Real metric is shown; authorship is honest (no AI provider here).
    expect(md).toContain('Tmax');
    expect(r.author).toMatch(/no AI provider/i);
  });

  it('uses and attributes a real AI body when provided', () => {
    const r = researchReporter.generateReport({
      experiment: { id: 'e1', title: 'X' },
      aiMarkdown: '## Analysis\nReal AI text.',
      aiProvider: 'claude',
    });
    expect(r.markdownContent).toContain('Real AI text.');
    expect(r.author).toBe('AI (claude)');
  });
});
