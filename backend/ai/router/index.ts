import { AIProvider, AIGenerateParams } from '../providers/types.js';
import { aiProviderRegistry, AIProviderRegistry } from '../providers/index.js';
import { LoggerService } from '../../logging/logger.js';

const logger = new LoggerService('AIRouter');

/**
 * The kind of research work a call is doing. Used to bias which model is tried
 * first ("auto" routing) — e.g. deep scientific analysis prefers Claude, a
 * quick lookup prefers a fast/cheap model.
 */
export type ResearchTask = 'analysis' | 'planning' | 'coding' | 'report' | 'quick' | 'general';

/**
 * Per-task preferred provider order (by id). Only configured providers are
 * actually used; anything a task doesn't list still participates as a later
 * fallback so a request never dead-ends while another model is available.
 */
export const TASK_PREFERENCES: Record<ResearchTask, string[]> = {
  analysis: ['claude', 'openai', 'gemini', 'deepseek', 'grok', 'ollama'],
  planning: ['claude', 'openai', 'gemini', 'deepseek', 'grok', 'ollama'],
  coding: ['claude', 'openai', 'deepseek', 'gemini', 'grok', 'ollama'],
  report: ['claude', 'openai', 'gemini', 'deepseek', 'grok', 'ollama'],
  quick: ['ollama', 'gemini', 'deepseek', 'openai', 'grok', 'claude'],
  general: ['claude', 'openai', 'gemini', 'deepseek', 'grok', 'ollama'],
};

export interface RouteAttempt {
  id: string;
  ok: boolean;
  error?: string;
}

export interface RouteResult {
  text: string;
  providerId: string;
  attempts: RouteAttempt[];
}

export interface RouteOptions {
  /** Explicit provider ids to prefer first (e.g. the experiment's pinned model). */
  requested?: string[];
  /** Task hint used to order remaining providers when no explicit pin wins. */
  task?: ResearchTask;
}

/** Infer a routing task from a free-text prompt. */
export function taskFromPrompt(prompt: string): ResearchTask {
  const p = (prompt || '').toLowerCase();
  if (/\b(java|script|code|comsolcompile|livelink)\b/.test(p)) return 'coding';
  if (/\b(report|publication|manuscript|write.?up)\b/.test(p)) return 'report';
  if (/\b(plan|recommend|design the|setup|sweep range)\b/.test(p)) return 'planning';
  if (/\b(analy|anomal|converg|result|figure of merit|i-?v)\b/.test(p)) return 'analysis';
  return 'general';
}

/**
 * Chooses which provider handles a call and transparently falls back to the
 * next configured provider when one errors (rate limit, bad key, timeout).
 * This is the "AI Gateway / Router" idea: the rest of the platform asks to
 * generate; the router decides who and retries elsewhere on failure.
 */
export class AIRouter {
  constructor(private registry: AIProviderRegistry = aiProviderRegistry) {}

  /**
   * Ordered list of configured providers to try: explicit `requested` ids first
   * (in order), then the task-preferred order, then any remaining configured
   * providers — deduped. Only configured providers appear.
   */
  public buildChain(opts: RouteOptions = {}): AIProvider[] {
    const configured = this.registry.listConfigured();
    const byId = new Map(configured.map((p) => [p.id, p]));
    const order: string[] = [];
    const push = (id: string) => {
      if (byId.has(id) && !order.includes(id)) order.push(id);
    };
    (opts.requested || []).forEach(push);
    if (opts.task) (TASK_PREFERENCES[opts.task] || []).forEach(push);
    configured.forEach((p) => push(p.id));
    return order.map((id) => byId.get(id)!).filter(Boolean);
  }

  /**
   * Try providers in order and return the first success. Records every attempt.
   * Throws only when the whole chain fails (or nothing is configured), so the
   * caller can surface an honest error / physics fallback.
   */
  public async generateWithFallback(params: AIGenerateParams, opts: RouteOptions = {}): Promise<RouteResult> {
    const chain = this.buildChain(opts);
    if (chain.length === 0) throw new Error('No AI provider is configured.');
    const attempts: RouteAttempt[] = [];
    for (const provider of chain) {
      try {
        const text = await provider.generate(params);
        attempts.push({ id: provider.id, ok: true });
        if (attempts.length > 1) {
          logger.info(`Router fell back to "${provider.id}" after ${attempts.length - 1} failure(s).`);
        }
        return { text: text || '', providerId: provider.id, attempts };
      } catch (err) {
        const message = (err as Error).message;
        attempts.push({ id: provider.id, ok: false, error: message });
        logger.warn(`Provider "${provider.id}" failed; trying next. (${message})`);
      }
    }
    throw new Error(
      `All ${chain.length} AI provider(s) failed: ${attempts.map((a) => `${a.id}: ${a.error}`).join('; ')}`
    );
  }
}

export const aiRouter = new AIRouter();
