import { config } from '../../configuration/index.js';
import { LoggerService } from '../../logging/logger.js';
import { SYSTEM_PROMPT_CORE } from '../prompts/index.js';
import { agentManager } from '../agents/index.js';
import { aiMemoryStore } from '../memory/index.js';
import { aiContextAggregator } from '../context/index.js';
import { aiProviderRegistry } from '../providers/index.js';
import { AIProvider } from '../providers/types.js';
import { GeneratedReport } from '../../shared/types.js';

export * from './AIResearchEngine.js';
export * from './GoalEvaluator.js';
export * from './ParameterGenerator.js';
export * from './ExperimentComparator.js';

const logger = new LoggerService('AIEngineOrchestrator');

export interface AIEngineRequestPayload {
  prompt: string;
  sessionId?: string;
  experimentId?: string;
  jobId?: string;
  targetMetric?: string;
  comparisonExperimentIds?: string[];
  /**
   * Which AI provider(s) to use for this request (e.g. ['gemini','claude']).
   * Empty/omitted → the platform's default provider. More than one → the
   * providers run in parallel and their answers are combined.
   */
  providers?: string[];
}

export interface AIEngineResponsePayload {
  text: string;
  reasoningSteps?: string[];
  suggestedParameters?: Record<string, unknown>;
  experimentPlan?: unknown;
  analysisReport?: unknown;
  optimizationPrediction?: unknown;
  anomalies?: unknown[];
}

export class AIEngineOrchestrator {
  public async processRequest(payload: AIEngineRequestPayload): Promise<AIEngineResponsePayload> {
    const { prompt, sessionId = 'default-session', experimentId, jobId, targetMetric } = payload;
    logger.info(`AI Engine processing request in session ${sessionId} for prompt: "${prompt.slice(0, 50)}..."`);

    // 1. Build context
    const context = await aiContextAggregator.buildContext(experimentId, jobId);

    // 2. Chain of thought reasoning via Explainer Agent
    const explainerRes = await agentManager.runExplainerAgent(prompt, context);
    const reasoningSteps = explainerRes.reasoning.steps.map((s) => `[Stage ${s.stepNumber}: ${s.phase}] ${s.thought}`);

    // 3. Determine request intent and run specialized agent
    const promptLower = prompt.toLowerCase();
    let experimentPlan: unknown;
    let analysisReport: unknown;
    let optimizationPrediction: unknown;
    let suggestedParameters: Record<string, unknown> | undefined;

    if (promptLower.includes('plan') || promptLower.includes('recommend') || promptLower.includes('parameter')) {
      const planRes = await agentManager.runPlannerAgent(prompt, context);
      experimentPlan = planRes.plan;
      suggestedParameters = planRes.plan.suggestedParameters;
    }

    if (promptLower.includes('analyze') || promptLower.includes('anomaly') || context.unifiedResults) {
      if (context.unifiedResults) {
        const anaRes = await agentManager.runAnalyzerAgent(context.unifiedResults);
        analysisReport = anaRes.analysis;
      }
    }

    if (promptLower.includes('optimize') || targetMetric) {
      const optRes = await agentManager.runOptimizerAgent(targetMetric || 'Ion (ON Current)', context.parameters || {});
      optimizationPrediction = optRes.prediction;
      suggestedParameters = { ...suggestedParameters, ...optRes.prediction.suggestedNextStep };
    }

    // 4. Generate response via the selected AI provider(s), or Physics fallback
    const contents = `User Request: ${prompt}

Context Aggregation:
${JSON.stringify(context, null, 2)}

Active AI Sub-Agent Results:
- Experiment Plan: ${JSON.stringify(experimentPlan || 'N/A')}
- Analysis Report: ${JSON.stringify(analysisReport || 'N/A')}
- Optimization Prediction: ${JSON.stringify(optimizationPrediction || 'N/A')}

Provide a rigorous, formatted Markdown response explaining the physics, recommending parameters, and summarizing actionable insights.`;

    const selected = aiProviderRegistry.resolveSelection(payload.providers);
    let textResponse = '';

    if (selected.length === 0) {
      textResponse = this.generatePhysicsFallbackResponse(
        prompt,
        context,
        suggestedParameters,
        'No AI provider is configured on the server.'
      );
    } else if (selected.length === 1) {
      textResponse = await this.runSingleProvider(selected[0], contents, prompt, context, suggestedParameters);
    } else {
      textResponse = await this.runEnsemble(selected, contents, prompt, context, suggestedParameters);
    }

    // 5. Save in Memory
    aiMemoryStore.addEntry(sessionId, {
      sessionId,
      role: 'assistant',
      content: textResponse,
      reasoningChain: reasoningSteps,
      suggestedParameters,
    });

    return {
      text: textResponse,
      reasoningSteps,
      suggestedParameters,
      experimentPlan,
      analysisReport,
      optimizationPrediction,
    };
  }

  public async generateScientificReport(input: { experiment: any; projectName?: string }): Promise<GeneratedReport> {
    logger.info(`AI Engine generating scientific report for experiment ${input.experiment?.id}`);
    const repRes = await agentManager.runReporterAgent(input);
    return repRes.report;
  }

  /** Single-provider path: call the model, fall back honestly on failure. */
  private async runSingleProvider(
    provider: AIProvider,
    contents: string,
    prompt: string,
    context: any,
    suggestedParameters?: Record<string, unknown>
  ): Promise<string> {
    try {
      logger.info(`AI Engine calling provider "${provider.id}" (${provider.model})`);
      const text = await provider.generate({
        system: SYSTEM_PROMPT_CORE,
        prompt: contents,
        maxTokens: config.ai.maxTokens,
      });
      return text || 'Unable to generate analysis output from AI Engine.';
    } catch (err: any) {
      logger.error(`Error contacting AI provider "${provider.id}"`, { error: err.message });
      return this.generatePhysicsFallbackResponse(
        prompt,
        context,
        suggestedParameters,
        `The ${provider.label} call failed: ${err.message}`
      );
    }
  }

  /**
   * Ensemble path: query every selected provider in parallel, show each answer
   * labeled, then append a combined conclusion. Providers that error are noted
   * rather than dropped silently. The combined conclusion is itself written by
   * one of the models (the first that succeeded) and is clearly labeled as such.
   */
  private async runEnsemble(
    providers: AIProvider[],
    contents: string,
    prompt: string,
    context: any,
    suggestedParameters?: Record<string, unknown>
  ): Promise<string> {
    logger.info(`AI Engine ensemble across: ${providers.map((p) => p.id).join(', ')}`);

    const results = await Promise.all(
      providers.map(async (provider) => {
        try {
          const text = await provider.generate({
            system: SYSTEM_PROMPT_CORE,
            prompt: contents,
            maxTokens: config.ai.maxTokens,
          });
          return { provider, text: text || '_(empty response)_', ok: true as const };
        } catch (err: any) {
          logger.error(`Ensemble member "${provider.id}" failed`, { error: err.message });
          return { provider, text: `⚠️ ${provider.label} did not respond: ${err.message}`, ok: false as const };
        }
      })
    );

    const succeeded = results.filter((r) => r.ok);

    // Every provider failed → honest fallback, not a fabricated summary.
    if (succeeded.length === 0) {
      return this.generatePhysicsFallbackResponse(
        prompt,
        context,
        suggestedParameters,
        `All selected AI providers failed (${providers.map((p) => p.label).join(', ')}).`
      );
    }

    const individualSections = results
      .map((r) => `### ${r.ok ? '' : '⚠️ '}${r.provider.label} \`${r.provider.model}\`\n\n${r.text}`)
      .join('\n\n---\n\n');

    const combined = await this.synthesizeCombined(succeeded);

    const header =
      `> 🧠 **Ensemble mode** — ${succeeded.length}/${providers.length} AI model(s) answered independently: ` +
      `${succeeded.map((r) => r.provider.label).join(', ')}.`;

    return `${header}\n\n## Combined conclusion\n\n${combined}\n\n---\n\n## Individual AI responses\n\n${individualSections}`;
  }

  /**
   * Ask one model (the first that succeeded) to reconcile all answers into a
   * single conclusion: consensus, disagreements, final recommendation. If that
   * synthesis call fails, degrade to a plainly-labeled non-AI note rather than
   * inventing a consensus.
   */
  private async synthesizeCombined(
    succeeded: Array<{ provider: AIProvider; text: string }>
  ): Promise<string> {
    if (succeeded.length === 1) {
      return succeeded[0].text;
    }

    const synthesizer = succeeded[0].provider;
    const answersBlock = succeeded
      .map((r, i) => `AI #${i + 1} (${r.provider.label}):\n${r.text}`)
      .join('\n\n=====\n\n');

    const synthPrompt = `Several independent AI models answered the same scientific request. Reconcile their answers into ONE conclusion.

${answersBlock}

Write a concise Markdown synthesis with:
1. **Consensus** — points the models agree on.
2. **Disagreements** — where they differ, and which is more physically sound.
3. **Final recommendation** — the single best answer/parameters to act on.`;

    try {
      const text = await synthesizer.generate({
        system: SYSTEM_PROMPT_CORE,
        prompt: synthPrompt,
        maxTokens: config.ai.maxTokens,
      });
      if (text) {
        return `${text}\n\n_— synthesized by ${synthesizer.label} from ${succeeded.length} AI responses._`;
      }
    } catch (err: any) {
      logger.error('Ensemble synthesis call failed', { error: err.message });
    }

    return `> ⚠️ _Automatic synthesis was unavailable, so no AI-combined conclusion was produced. Compare the ${succeeded.length} individual responses below._`;
  }

  private generatePhysicsFallbackResponse(
    prompt: string,
    context: any,
    suggestedParameters?: Record<string, unknown>,
    reason?: string
  ): string {
    const paramBlock =
      suggestedParameters && Object.keys(suggestedParameters).length > 0
        ? Object.entries(suggestedParameters)
            .map(([k, v]) => `- **${k}:** \`${v}\``)
            .join('\n')
        : '_No parameter suggestions available._';

    // Be explicit that this is NOT an LLM response — otherwise a canned template
    // reads as real AI analysis.
    return `> ⚠️ **AI language model is not active — this is a built-in fallback, not an AI-generated answer.**
> Reason: ${reason || 'The AI model call did not succeed.'}
>
> To enable real AI analysis, set at least one provider API key in your \`.env\`
> and restart the server:
> - \`GEMINI_API_KEY\` — Google Gemini (free tier: https://aistudio.google.com/apikey)
> - \`DEEPSEEK_API_KEY\` — DeepSeek (https://platform.deepseek.com)
> - \`OPENAI_API_KEY\` — ChatGPT / OpenAI (https://platform.openai.com/api-keys)
> - \`XAI_API_KEY\` — Grok / xAI (https://console.x.ai)
> - \`ANTHROPIC_API_KEY\` — Claude (https://console.anthropic.com/settings/keys)

---

**Request:** "${prompt}"
**Simulator context:** \`${context?.pluginId || 'n/a'}\`

**Deterministic parameter suggestions (rule-based, not AI):**
${paramBlock}`;
  }
}

export const aiEngineOrchestrator = new AIEngineOrchestrator();
