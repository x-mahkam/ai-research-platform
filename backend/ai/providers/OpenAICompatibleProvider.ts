import OpenAI from 'openai';
import { AIProvider, AIGenerateParams } from './types.js';

/**
 * One provider implementation for every OpenAI-compatible chat API. OpenAI,
 * DeepSeek, xAI (Grok) and Google Gemini all speak the same `chat.completions`
 * dialect — they differ only by base URL and model id — so a single class
 * parameterized by those covers four of the five providers.
 */
export class OpenAICompatibleProvider implements AIProvider {
  constructor(
    public readonly id: string,
    public readonly label: string,
    public readonly model: string,
    private readonly apiKey: string | undefined,
    private readonly baseURL: string | undefined
  ) {}

  public isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  public async generate({ system, prompt, maxTokens }: AIGenerateParams): Promise<string> {
    const client = new OpenAI({ apiKey: this.apiKey, baseURL: this.baseURL });
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
