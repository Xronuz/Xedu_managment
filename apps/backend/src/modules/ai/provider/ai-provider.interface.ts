export interface GenerateOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  systemPrompt?: string;
}

export interface GenerateResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
  model: string;
  provider: string;
  latencyMs: number;
}

export interface ModelInfo {
  name: string;
  provider: string;
  maxTokens: number;
  supportsStreaming: boolean;
  supportsStructured: boolean;
}

export interface AiProviderInterface {
  readonly name: string;

  generateText(prompt: string, options?: GenerateOptions): Promise<GenerateResult>;

  generateStructured<T extends Record<string, unknown>>(
    prompt: string,
    schema: { type: 'object'; properties: Record<string, unknown>; required?: string[] },
    options?: GenerateOptions,
  ): Promise<{ data: T; result: GenerateResult }>;

  countTokens(text: string): number;

  getModelInfo(): ModelInfo;
}
