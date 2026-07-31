import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIGenerateParams } from './types.js';

/**
 * Claude (Anthropic) provider. Anthropic has its own SDK and message shape
 * (top-level `system`, no system role in `messages`), so it can't share the
 * OpenAI-compatible class. Streamed to avoid request timeouts on long answers.
 */
export class AnthropicProvider implements AIProvider {
  public readonly id = 'claude';
  public readonly label = 'Claude (Anthropic)';

  constructor(
    public readonly model: string,
    private readonly apiKey: string | undefined
  ) {}

  public isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  public async generate({ system, prompt, maxTokens }: AIGenerateParams): Promise<string> {
    const client = new Anthropic({ apiKey: this.apiKey });
    const stream = client.messages.stream({
      model: this.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    });
    const message = await stream.finalMessage();
    return message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
  }
}
