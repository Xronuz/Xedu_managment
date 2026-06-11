import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';

const CACHE_PREFIX = 'school_modules_disabled:';
const CACHE_TTL = 60; // soniya — toggle'da darhol invalidatsiya ham qilinadi

/**
 * Maktab modullari holatining yagona manbasi.
 *
 * Semantika (default-allow): SchoolModule jadvalida yozuv YO'Q yoki
 * isEnabled=true bo'lsa — modul ishlaydi. Faqat aniq isEnabled=false
 * yozuvi modulni bloklaydi. Bu mavjud maktablarni buzmaydi (ko'pchiligida
 * faqat core modullar uchun yozuv bor).
 */
@Injectable()
export class ModuleFlagsService {
  private readonly logger = new Logger(ModuleFlagsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  /** Maktab uchun o'chirilgan modullar ro'yxati (Redis kesh, 60s TTL) */
  async getDisabledModules(schoolId: string): Promise<string[]> {
    const key = `${CACHE_PREFIX}${schoolId}`;
    try {
      const cached = await this.redis.get(key);
      if (cached !== null) return JSON.parse(cached);
    } catch {
      // Redis ishlamasa to'g'ridan-to'g'ri DB'dan o'qiymiz
    }

    const rows = await this.prisma.schoolModule.findMany({
      where: { schoolId, isEnabled: false },
      select: { moduleName: true },
    });
    const disabled = rows.map((r) => r.moduleName as string);

    try {
      await this.redis.setEx(key, CACHE_TTL, JSON.stringify(disabled));
    } catch (err: any) {
      this.logger.warn(`Modul keshi yozilmadi: ${err.message}`);
    }
    return disabled;
  }

  async isModuleDisabled(schoolId: string, moduleName: string): Promise<boolean> {
    const disabled = await this.getDisabledModules(schoolId);
    return disabled.includes(moduleName);
  }

  /** Toggle'dan keyin chaqiriladi — kesh darhol yangilanishi uchun */
  async invalidate(schoolId: string): Promise<void> {
    try {
      await this.redis.del(`${CACHE_PREFIX}${schoolId}`);
    } catch (err: any) {
      this.logger.warn(`Modul keshi o'chirilmadi: ${err.message}`);
    }
  }
}
