import { AiProviderInterface, GenerateOptions, GenerateResult, ModelInfo } from './ai-provider.interface';

export class OpenAiProvider implements AiProviderInterface {
  readonly name = 'openai';

  async generateText(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    // Stub: returns deterministic mock response
    // TODO: Wire to openai SDK when API key is available
    const text = `[OpenAI stub] Generated response for: ${prompt.slice(0, 50)}...`;
    return {
      text,
      tokensIn: this.countTokens(prompt),
      tokensOut: this.countTokens(text),
      model: options?.model ?? 'gpt-4o-mini',
      provider: this.name,
      latencyMs: 1200,
    };
  }

  async generateStructured<T extends Record<string, unknown>>(
    prompt: string,
    schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] },
    options?: GenerateOptions,
  ): Promise<{ data: T; result: GenerateResult }> {
    // Stub: returns empty object matching schema shape
    const data = {} as T;
    for (const key of Object.keys(schema.properties)) {
      (data as any)[key] = null;
    }
    const result = await this.generateText(prompt, options);
    return { data, result };
  }

  countTokens(text: string): number {
    // Rough estimate: ~4 chars per token
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      name: 'gpt-4o-mini',
      provider: this.name,
      maxTokens: 128000,
      supportsStreaming: true,
      supportsStructured: true,
    };
  }
}
