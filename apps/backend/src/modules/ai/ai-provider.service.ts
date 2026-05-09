import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiProviderInterface, GenerateOptions, GenerateResult } from './provider/ai-provider.interface';
import { OpenAiProvider } from './provider/openai.provider';
import { AnthropicProvider } from './provider/anthropic.provider';
import { GeminiProvider } from './provider/gemini.provider';
import { LocalProvider } from './provider/local.provider';
import { EngagementConfigService } from '@/modules/engagement/engagement-config.service';
import { AiUsageService } from './ai-usage.service';

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);
  private readonly registry = new Map<string, AiProviderInterface>();

  constructor(
    private readonly configService: ConfigService,
    private readonly engagementConfig: EngagementConfigService,
    private readonly usageService: AiUsageService,
  ) {
    // Register all providers
    this.register('openai', new OpenAiProvider());
    this.register('anthropic', new AnthropicProvider());
    this.register('gemini', new GeminiProvider());
    this.register('local', new LocalProvider());
  }

  register(name: string, provider: AiProviderInterface): void {
    this.registry.set(name, provider);
    this.logger.log(`Registered AI provider: ${name}`);
  }

  async getProvider(schoolId: string): Promise<AiProviderInterface> {
    const config = await this.engagementConfig.getAll(schoolId);
    const providerName = (config as any).ai_provider ?? 'openai';
    const provider = this.registry.get(providerName);
    if (!provider) {
      throw new NotFoundException(`AI provider '${providerName}' topilmadi`);
    }
    return provider;
  }

  async generateText(
    schoolId: string,
    userId: string,
    feature: string,
    prompt: string,
    options?: GenerateOptions,
  ): Promise<GenerateResult> {
    const provider = await this.getProvider(schoolId);
    const startTime = Date.now();

    try {
      const result = await this.withRetry(() => provider.generateText(prompt, options));
      const latencyMs = Date.now() - startTime;

      await this.usageService.logUsage({
        schoolId,
        userId,
        feature,
        provider: provider.name,
        model: result.model,
        tokensIn: result.tokensIn,
        tokensOut: result.tokensOut,
        latencyMs,
        costUsd: this.estimateCost(result.tokensIn, result.tokensOut, provider.name),
        status: 'success',
      });

      return { ...result, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      await this.usageService.logUsage({
        schoolId,
        userId,
        feature,
        provider: provider.name,
        model: options?.model ?? provider.getModelInfo().name,
        tokensIn: 0,
        tokensOut: 0,
        latencyMs,
        costUsd: 0,
        status: 'error',
        metadata: { error: (error as Error).message },
      });
      throw error;
    }
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = this.configService.get<number>('AI_MAX_RETRIES', 3),
  ): Promise<T> {
    let lastError: Error | undefined;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          this.logger.warn(`AI call failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    throw lastError;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private estimateCost(tokensIn: number, tokensOut: number, provider: string): number {
    // Rough cost estimates per 1K tokens (USD)
    const rates: Record<string, { in: number; out: number }> = {
      openai: { in: 0.0015, out: 0.002 },
      anthropic: { in: 0.003, out: 0.015 },
      gemini: { in: 0.0005, out: 0.0015 },
      local: { in: 0, out: 0 },
    };
    const rate = rates[provider] ?? rates.openai;
    return (tokensIn / 1000) * rate.in + (tokensOut / 1000) * rate.out;
  }
}
