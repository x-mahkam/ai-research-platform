import { GoogleGenAI } from '@google/genai';
import { config } from '../../configuration/index.js';
import { LoggerService } from '../../logging/logger.js';
import { SYSTEM_PROMPT_CORE } from '../prompts/index.js';
import { agentManager } from '../agents/index.js';
import { aiMemoryStore } from '../memory/index.js';
import { aiContextAggregator } from '../context/index.js';
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
  private getClient(): GoogleGenAI | null {
    if (!config.gemini.apiKey) {
      logger.warn('GEMINI_API_KEY is not set. Physics AI Research Fallback active.');
      return null;
    }
    return new GoogleGenAI({
      apiKey: config.gemini.apiKey,
      httpOptions: {
        headers: {
          'User-Agent': config.gemini.userAgent,
        },
      },
    });
  }

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

    // 4. Generate response via Gemini API or Physics Engine fallback
    const aiClient = this.getClient();
    let textResponse = '';

    if (aiClient) {
      try {
        const contents = `User Request: ${prompt}

Context Aggregation:
${JSON.stringify(context, null, 2)}

Active AI Sub-Agent Results:
- Experiment Plan: ${JSON.stringify(experimentPlan || 'N/A')}
- Analysis Report: ${JSON.stringify(analysisReport || 'N/A')}
- Optimization Prediction: ${JSON.stringify(optimizationPrediction || 'N/A')}

Provide a rigorous, formatted Markdown response explaining the physics, recommending parameters, and summarizing actionable insights.`;

        const response = await aiClient.models.generateContent({
          model: config.gemini.modelName,
          contents,
          config: {
            systemInstruction: SYSTEM_PROMPT_CORE,
            temperature: config.gemini.temperature,
          },
        });

        textResponse = response.text || 'Unable to generate analysis output from AI Engine.';
      } catch (err: any) {
        logger.error('Error contacting Gemini API in AI Engine Orchestrator', { error: err.message });
        textResponse = this.generatePhysicsFallbackResponse(
          prompt,
          context,
          suggestedParameters,
          `The AI model call failed: ${err.message}`
        );
      }
    } else {
      textResponse = this.generatePhysicsFallbackResponse(
        prompt,
        context,
        suggestedParameters,
        'GEMINI_API_KEY is not set on the server.'
      );
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
> To enable real AI analysis, set \`GEMINI_API_KEY\` in your \`.env\` (get a free key at
> https://aistudio.google.com/apikey). You can also pin a model with \`GEMINI_MODEL\`
> (default: \`gemini-2.5-flash\`). Then restart the server.

---

**Request:** "${prompt}"
**Simulator context:** \`${context?.pluginId || 'n/a'}\`

**Deterministic parameter suggestions (rule-based, not AI):**
${paramBlock}`;
  }
}

export const aiEngineOrchestrator = new AIEngineOrchestrator();
