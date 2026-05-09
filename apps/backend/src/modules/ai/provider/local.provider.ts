import { AiProviderInterface, GenerateOptions, GenerateResult, ModelInfo } from './ai-provider.interface';

export class LocalProvider implements AiProviderInterface {
  readonly name = 'local';

  async generateText(prompt: string, options?: GenerateOptions): Promise<GenerateResult> {
    const text = `[Local stub] Generated response for: ${prompt.slice(0, 50)}...`;
    return {
      text,
      tokensIn: this.countTokens(prompt),
      tokensOut: this.countTokens(text),
      model: options?.model ?? 'llama3.1',
      provider: this.name,
      latencyMs: 3000,
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
    return Math.ceil(text.length / 3);
  }

  getModelInfo(): ModelInfo {
    return {
      name: 'llama3.1',
      provider: this.name,
      maxTokens: 128000,
      supportsStreaming: true,
      supportsStructured: false,
    };
  }
}
