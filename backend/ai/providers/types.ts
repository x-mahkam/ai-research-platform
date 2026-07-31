/**
 * A pluggable AI language-model provider. The platform can have several
 * configured at once (Gemini, DeepSeek, OpenAI, Grok, Claude); each experiment
 * picks which one(s) to use. A provider is only "available" when its API key is
 * present — no key means it silently drops out of the selectable list rather
 * than failing at call time.
 */
export interface AIGenerateParams {
  system: string;
  prompt: string;
  maxTokens: number;
}

export interface AIProvider {
  /** Stable id used in config, the API, and per-experiment selection. */
  readonly id: string;
  /** Human-readable name shown in the UI. */
  readonly label: string;
  /** The model id this provider will call (for display / debugging). */
  readonly model: string;
  /** True when an API key is configured for this provider. */
  isConfigured(): boolean;
  /** Call the model and return its text answer. Throws on API failure. */
  generate(params: AIGenerateParams): Promise<string>;
}

export interface AIProviderMeta {
  id: string;
  label: string;
  model: string;
  configured: boolean;
}
