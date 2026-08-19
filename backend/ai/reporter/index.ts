import { GeneratedReport } from '../../shared/types.js';
import { generateId, getCurrentTimestamp } from '../../shared/utils.js';

export interface IReportInputData {
  experiment: any;
  projectName?: string;
  analysisReport?: any;
  /** Report body written by a real AI provider, if one was available. */
  aiMarkdown?: string;
  /** Which provider authored aiMarkdown (for honest attribution). */
  aiProvider?: string;
}

/**
 * Builds a scientific report from an experiment. When a real AI provider wrote
 * the body (aiMarkdown) we use it and attribute it honestly. Otherwise we emit
 * a data-only report containing ONLY what the run actually produced — real
 * metrics, real solver diagnostics, real parameters — and never fabricated
 * physics claims or numeric recommendations.
 */
export class ResearchReporter {
  public generateReport(input: IReportInputData): GeneratedReport {
    const { experiment, projectName, analysisReport, aiMarkdown, aiProvider } = input;
    const expTitle = experiment?.title || 'Simulation Experiment';
    const projName = projectName || 'AI Research Platform';
    const author = aiProvider ? `AI (${aiProvider})` : 'ARP (no AI provider configured)';

    const markdownContent = aiMarkdown?.trim()
      ? this.wrapAiReport(aiMarkdown.trim(), expTitle, projName, aiProvider)
      : this.dataOnlyReport(experiment, expTitle, projName, analysisReport);

    return {
      id: generateId('rep'),
      experimentId: experiment?.id || 'exp-unknown',
      experimentTitle: expTitle,
      projectName: projName,
      title: `${expTitle} - Scientific Research Report`,
      author,
      createdAt: getCurrentTimestamp(),
      version: '1.0',
      markdownContent,
    };
  }

  private header(expTitle: string, projName: string, author: string): string {
    return `# Scientific Research Report
**Experiment:** ${expTitle}
**Project:** ${projName}
**Author:** ${author}
**Timestamp:** ${getCurrentTimestamp()}

---
`;
  }

  private wrapAiReport(ai: string, expTitle: string, projName: string, provider?: string): string {
    return `${this.header(expTitle, projName, `AI (${provider || 'unknown'})`)}
${ai}
`;
  }

  /** Honest, data-only report — no invented models, numbers, or recommendations. */
  private dataOnlyReport(experiment: any, expTitle: string, projName: string, analysisReport: any): string {
    const metrics: Record<string, unknown> | null =
      experiment?.results?.metrics || analysisReport?.figuresOfMerit || null;

    const metricsSection = metrics && Object.keys(metrics).length
      ? `| Metric | Value |
| :--- | :--- |
${Object.entries(metrics)
  .map(([k, v]) => `| **${k}** | \`${v}\` |`)
  .join('\n')}`
      : `> No simulation results are available for this experiment yet. Figures of merit will appear here after a real simulator run completes and its output is parsed. This platform never substitutes synthetic values for missing simulation data.`;

    const diag = experiment?.results?.diagnostics as Record<string, unknown> | undefined;
    const diagSection = diag
      ? `\n## Solver Diagnostics\n${[
          typeof diag.converged === 'boolean' ? `- Converged: ${diag.converged}` : '',
          Array.isArray(diag.warnings) && diag.warnings.length
            ? `- Warnings: ${(diag.warnings as string[]).slice(0, 10).join('; ')}`
            : '',
          Array.isArray(diag.errors) && diag.errors.length
            ? `- Errors: ${(diag.errors as string[]).slice(0, 10).join('; ')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n')}\n`
      : '';

    const params = Array.isArray(experiment?.parameters) && experiment.parameters.length
      ? `\n## Parameters\n| Name | Value | Unit |\n| :--- | :--- | :--- |\n${experiment.parameters
          .map((p: any) => `| ${p.name || p.key} | \`${p.value}\` | ${p.unit || ''} |`)
          .join('\n')}\n`
      : '';

    return `${this.header(expTitle, projName, 'ARP (no AI provider configured)')}
> No AI provider is configured, so this is a data-only report generated directly from the run. Configure a provider (or enable local Ollama) for a written scientific analysis.

## Key Figures of Merit
${metricsSection}
${diagSection}${params}
---
*Data-only report. No values here are synthesized — only what the simulator produced is shown.*
`;
  }
}

export const researchReporter = new ResearchReporter();
