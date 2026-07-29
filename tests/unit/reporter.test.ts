import { describe, it, expect } from 'vitest';
import { ResearchReporter } from '../../backend/ai/reporter/index.js';

const reporter = new ResearchReporter();

describe('ResearchReporter honesty', () => {
  it('does NOT fabricate figures of merit when there are no results', () => {
    const report = reporter.generateReport({
      experiment: { id: 'exp-x', title: 'No Results Yet' },
    });
    const md = report.markdownContent;
    // The old behavior injected these hardcoded "Verified" numbers.
    expect(md).not.toContain('1.45 mA');
    expect(md).not.toContain('63.5 mV/dec');
    expect(md).not.toMatch(/\|\s*Verified\s*\|/);
    // It should state honestly that no results exist.
    expect(md).toMatch(/No simulation results/i);
  });

  it('renders real metrics when the experiment has results', () => {
    const report = reporter.generateReport({
      experiment: {
        id: 'exp-y',
        title: 'With Results',
        results: { metrics: { 'Ion (ON Current)': '1.24 mA/um' } },
      },
    });
    expect(report.markdownContent).toContain('1.24 mA/um');
    expect(report.markdownContent).toContain('Ion (ON Current)');
  });
});
