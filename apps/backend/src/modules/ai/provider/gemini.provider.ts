import { AiProviderInterface, GenerateOptions, GenerateResult, ModelInfo } from './ai-provider.interface';

export class GeminiProvider implements AiProviderInterface {
  readonly name = 'gemini';

  async generateText(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    const text = `[Gemini stub] Generated response for: ${prompt.slice(0, 50)}...`;
    return {
      text,
      tokensIn: this.countTokens(prompt),
      tokensOut: this.countTokens(text),
      model: options?.model ?? 'gemini-1.5-flash',
      provider: this.name,
      latencyMs: 900,
    };
  }

  async generateStructured<T extends Record<string, unknown>>(
    prompt: string,
    schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] },
    options?: GenerateOptions,
  ): Promise<{ data: T; result: GenerateResult }> {
    const data = {} as T;
    for (const key of Object.keys(schema.properties)) {
      (data as any)[key] = null;
    }
    const result = await this.generateText(prompt, options);
    return { data, result };
  }

  countTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  getModelInfo(): ModelInfo {
    return {
      name: 'gemini-1.5-flash',
      provider: this.name,
      maxTokens: 1000000,
      supportsStreaming: false,
      supportsStructured: true,
    };
  }
}
