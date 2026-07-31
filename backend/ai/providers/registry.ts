import { config } from '../../configuration/index.js';
import { LoggerService } from '../../logging/logger.js';
import { AIProvider, AIProviderMeta } from './types.js';
import { OpenAICompatibleProvider } from './OpenAICompatibleProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';

const logger = new LoggerService('AIProviderRegistry');

// OpenAI-compatible base URLs. OpenAI itself uses the SDK default (undefined).
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';
const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';
const GROK_BASE_URL = 'https://api.x.ai/v1';

/**
 * Builds and owns the set of AI providers. Providers are constructed from
 * config (all five always exist as objects); `isConfigured()` reflects whether
 * a key is present. Selection resolution filters requested ids down to the ones
 * that are actually usable, with a sensible default when nothing is pinned.
 */
export class AIProviderRegistry {
  private readonly providers: AIProvider[];

  constructor() {
    const p = config.ai.providers;
    this.providers = [
      new OpenAICompatibleProvider('gemini', 'Google Gemini', p.gemini.model, p.gemini.apiKey, GEMINI_BASE_URL),
      new OpenAICompatibleProvider('deepseek', 'DeepSeek', p.deepseek.model, p.deepseek.apiKey, DEEPSEEK_BASE_URL),
      new OpenAICompatibleProvider('openai', 'ChatGPT (OpenAI)', p.openai.model, p.openai.apiKey, undefined),
      new OpenAICompatibleProvider('grok', 'Grok (xAI)', p.grok.model, p.grok.apiKey, GROK_BASE_URL),
      new AnthropicProvider(p.claude.model, p.claude.apiKey),
    ];
  }

  public listAll(): AIProvider[] {
    return this.providers;
  }

  public listConfigured(): AIProvider[] {
    return this.providers.filter((provider) => provider.isConfigured());
  }

  public get(id: string): AIProvider | undefined {
    return this.providers.find((provider) => provider.id === id);
  }

  /** Provider descriptors for the UI/API. Never exposes keys. */
  public meta(): AIProviderMeta[] {
    return this.providers.map((provider) => ({
      id: provider.id,
      label: provider.label,
      model: provider.model,
      configured: provider.isConfigured(),
    }));
  }

  /** The default configured provider: AI_PROVIDER if usable, else the first configured. */
  public defaultProvider(): AIProvider | undefined {
    const preferred = config.ai.defaultProvider;
    if (preferred) {
      const match = this.get(preferred);
      if (match?.isConfigured()) return match;
    }
    return this.listConfigured()[0];
  }

  /**
   * Turn a per-experiment selection into the concrete providers to call.
   * - Requested ids are filtered to those that are configured (keeps order).
   * - If the request yields nothing usable, fall back to the single default
   *   provider (so callers without a selection still work).
   * - Returns [] only when no provider is configured at all.
   */
  public resolveSelection(requested?: string[]): AIProvider[] {
    if (Array.isArray(requested) && requested.length > 0) {
      const resolved = requested
        .map((id) => this.get(id))
        .filter((provider): provider is AIProvider => Boolean(provider) && provider!.isConfigured());
      if (resolved.length > 0) return resolved;
    }
    const fallback = this.defaultProvider();
    return fallback ? [fallback] : [];
  }

  /** Logs which providers are active at startup — the "did I set my keys?" check. */
  public logStartupStatus(): void {
    const configured = this.listConfigured();
    if (configured.length === 0) {
      logger.warn(
        'No AI provider configured. AI features will return a built-in fallback. ' +
          'Set at least one of GEMINI_API_KEY / DEEPSEEK_API_KEY / OPENAI_API_KEY / XAI_API_KEY / ANTHROPIC_API_KEY.'
      );
      return;
    }
    const summary = this.providers
      .map((provider) => `${provider.label}: ${provider.isConfigured() ? `✓ (${provider.model})` : '—'}`)
      .join(' | ');
    logger.info(`AI providers — ${summary}`);
    const def = this.defaultProvider();
    if (def) logger.info(`Default AI provider: ${def.label}`);
  }
}

export const aiProviderRegistry = new AIProviderRegistry();
