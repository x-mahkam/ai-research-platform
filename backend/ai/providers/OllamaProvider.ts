import OpenAI from 'openai';
import { AIProvider, AIGenerateParams } from './types.js';

/**
 * A local LLM served by Ollama (https://ollama.com). Ollama exposes an
 * OpenAI-compatible endpoint (default http://localhost:11434/v1), so we reuse
 * the OpenAI SDK with a placeholder key — Ollama ignores auth. Unlike the cloud
 * providers, "configured" is a user opt-in (OLLAMA_MODEL set), not a key: it
 * lets the platform run fully offline / for free on cheap tasks, and gives the
 * router a last-resort local fallback when every cloud provider fails.
 */
export class OllamaProvider implements AIProvider {
  public readonly id = 'ollama';
  public readonly label = 'Local (Ollama)';

  constructor(
    public readonly model: string,
    private readonly baseURL: string,
    private readonly enabled: boolean
  ) {}

  public isConfigured(): boolean {
    return this.enabled;
  }

  public async generate({ system, prompt, maxTokens }: AIGenerateParams): Promise<string> {
    // Ollama needs a non-empty apiKey string for the SDK but does not check it.
    const client = new OpenAI({ apiKey: 'ollama', baseURL: this.baseURL });
    const response = await client.chat.completions.create({
      model: this.model,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
    });
    return response.choices[0]?.message?.content?.trim() || '';
  }
}
