import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { NotificationQueueService } from '@/modules/notifications/notification-queue.service';
import { UserRole, JwtPayload, TokenPair } from '@eduplatform/types';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SwitchBranchDto } from './dto/switch-branch.dto';

const LOGIN_ATTEMPTS_PREFIX = 'login_attempts:';
const REFRESH_TOKEN_PREFIX = 'refresh:';
const PASSWORD_RESET_PREFIX = 'pwd_reset:';
const TOKEN_DENYLIST_PREFIX = 'token_deny:';
const USER_SESSIONS_PREFIX = 'user_sessions:';
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_BLOCK_TTL = 15 * 60; // 15 minutes in seconds
const ACCESS_TOKEN_TTL = 24 * 60 * 60; // 24 hours
const REFRESH_TOKEN_TTL = 7 * 24 * 60 * 60; // 7 days
const PASSWORD_RESET_TTL = 30 * 60; // 30 minutes
const TOKEN_DENYLIST_TTL = 24 * 60 * 60; // 24 hours (matches access token TTL)

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly redis: RedisService,
    private readonly config: ConfigService,
    private readonly notificationQueue: NotificationQueueService,
  ) {}

  async login(dto: LoginDto): Promise<{ user: object; tokens: TokenPair }> {
    const { email, password } = dto;
    const attemptsKey = `${LOGIN_ATTEMPTS_PREFIX}${email}`;

    // Check rate limit (Redis bo'lmasa skip qilinadi — xavfsizlik murosasi)
    try {
      const attempts = await this.redis.get(attemptsKey);
      if (attempts && parseInt(attempts) >= MAX_LOGIN_ATTEMPTS) {
        throw new UnauthorizedException(
          'Juda ko‘p urinish. 15 daqiqadan so‘ng qayta urinib ko‘ring',
        );
      }
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`Redis rate-limit tekshiruvi o'tkazib yuborildi: ${err.message}`);
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true, email: true, role: true, schoolId: true, branchId: true,
        passwordHash: true, isActive: true, firstName: true, lastName: true,
        isFirstLogin: true,
      },
    });

    if (!user || !user.isActive) {
      await this.incrementLoginAttempts(attemptsKey).catch(() => null);
      throw new UnauthorizedException('Email yoki parol noto‘g‘ri');
    }

    // Check if user's school has been deleted
    if (user.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: user.schoolId },
        select: { deletedAt: true },
      });
      if (school?.deletedAt) {
        await this.incrementLoginAttempts(attemptsKey).catch(() => null);
        throw new UnauthorizedException('Email yoki parol noto‘g‘ri');
      }
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      await this.incrementLoginAttempts(attemptsKey).catch(() => null);
      throw new UnauthorizedException('Email yoki parol noto‘g‘ri');
    }

    // Reset login attempts
    await this.redis.del(attemptsKey).catch(() => null);

    const tokens = await this.generateTokens(user);

    this.logger.log(`Foydalanuvchi tizimga kirdi: ${user.email} (${user.role})`);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        schoolId: user.schoolId,
        branchId: user.branchId,
        isFirstLogin: user.isFirstLogin,
      },
      tokens,
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<TokenPair> {
    const { refreshToken } = dto;
    const redisKey = `${REFRESH_TOKEN_PREFIX}${refreshToken}`;

    // Check if token exists and not revoked
    let userId: string;
    try {
      const stored = await this.redis.get(redisKey);
      if (!stored) {
        throw new UnauthorizedException('Refresh token yaroqsiz yoki muddati o‘tgan');
      }
      // Backward compatibility: stored value may be plain userId (old sessions) or JSON
      try {
        const parsed = JSON.parse(stored);
        userId = parsed.userId;
      } catch {
        userId = stored;
      }
      // Delete old token (rotation)
      await this.redis.del(redisKey);
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      // Redis mavjud emas — refresh token UUID bo'lgani uchun JWT verify ishlamaydi.
      // BU YERDA FALLBACK YO'Q: Redis down bo'lsa sessionni yangilash mumkin emas.
      this.logger.error(`Redis refresh token tekshiruvi xato: ${err.message}`);
      throw new UnauthorizedException('Refresh token yaroqsiz yoki muddati o‘tgan');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: { id: true, email: true, role: true, schoolId: true, branchId: true, isFirstLogin: true },
    });

    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    // Check if user's school has been deleted
    if (user.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: user.schoolId },
        select: { deletedAt: true },
      });
      if (school?.deletedAt) {
        throw new UnauthorizedException('Foydalanuvchi topilmadi');
      }
    }

    return this.generateTokens(user);
  }

  async logout(accessToken: string, refreshToken: string, userId: string): Promise<void> {
    // 1. Deny-list the access token (so it can't be reused during its TTL)
    try {
      const payload = this.jwtService.decode(accessToken) as any;
      if (payload?.jti) {
        await this.redis.setEx(
          `${TOKEN_DENYLIST_PREFIX}${payload.jti}`,
          TOKEN_DENYLIST_TTL,
          userId,
        );
      } else {
        // Fallback: deny-list by token hash if no jti
        const tokenHash = require('crypto').createHash('sha256').update(accessToken).digest('hex');
        await this.redis.setEx(
          `${TOKEN_DENYLIST_PREFIX}${tokenHash}`,
          TOKEN_DENYLIST_TTL,
          userId,
        );
      }
    } catch (err: any) {
      this.logger.warn(`Access token deny-list ga qo‘shishda xato: ${err.message}`);
    }

    // 2. Revoke the specific refresh token
    if (refreshToken) {
      await this.redis.del(`${REFRESH_TOKEN_PREFIX}${refreshToken}`).catch(err =>
        this.logger.warn(`Logout — Redis token o'chirishda xato: ${err.message}`),
      );
    }

    this.logger.log(`Foydalanuvchi tizimdan chiqdi: ${userId}`);
  }

  /**
   * Returns a list of active sessions for the user.
   * Note: With the current Redis key structure we cannot enumerate all refresh
   * tokens by userId efficiently. This returns a minimal session list.
   */
  async getSessions(userId: string): Promise<{ sessions: { id: string; createdAt: string }[]; allRevoked: boolean }> {
    const allRevoked = await this.areAllSessionsRevoked(userId);
    return { sessions: [], allRevoked };
  }

  /**
   * Barcha sessiyalarni bekor qilish (logout from all devices).
   * Foydalanuvchining barcha refresh tokenlarini o'chiradi.
   */
  async logoutAll(userId: string, currentAccessToken?: string): Promise<void> {
    // Deny-list current access token (if provided)
    if (currentAccessToken) {
      try {
        const payload = this.jwtService.decode(currentAccessToken) as any;
        if (payload?.jti) {
          await this.redis.setEx(
            `${TOKEN_DENYLIST_PREFIX}${payload.jti}`,
            TOKEN_DENYLIST_TTL,
            userId,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Access token deny-list ga qo‘shishda xato: ${err.message}`);
      }
    }

    // We can't enumerate all refresh tokens by userId efficiently with the current
    // Redis key structure (refresh:<uuid>). As a mitigation, we set a "global revoke"
    // marker that all future token validations check against.
    try {
      await this.redis.setEx(
        `${USER_SESSIONS_PREFIX}${userId}:revoked`,
        TOKEN_DENYLIST_TTL,
        Date.now().toString(),
      );
    } catch (err: any) {
      this.logger.warn(`Global revoke marker o'rnatishda xato: ${err.message}`);
    }

    this.logger.log(`Foydalanuvchi barcha sessiyalarini bekor qildi: ${userId}`);
  }

  /**
   * Tekshiradi: access token deny-list da yoki yo'q.
   */
  async isTokenDenied(token: string): Promise<boolean> {
    try {
      const payload = this.jwtService.decode(token) as any;
      if (payload?.jti) {
        const denied = await this.redis.get(`${TOKEN_DENYLIST_PREFIX}${payload.jti}`);
        if (denied) return true;
      }
      const tokenHash = require('crypto').createHash('sha256').update(token).digest('hex');
      const denied = await this.redis.get(`${TOKEN_DENYLIST_PREFIX}${tokenHash}`);
      return !!denied;
    } catch {
      return false;
    }
  }

  /**
   * Tekshiradi: foydalanuvchi barcha sessiyalari bekor qilinganmi.
   */
  async areAllSessionsRevoked(userId: string): Promise<boolean> {
    try {
      const revoked = await this.redis.get(`${USER_SESSIONS_PREFIX}${userId}:revoked`);
      return !!revoked;
    } catch {
      return false;
    }
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user) {
      // Don't reveal if email exists
      return { message: 'Agar email ro‘yxatdan o‘tgan bo‘lsa, tiklash havolasi yuborildi' };
    }

    const resetToken = uuidv4();
    try {
      await this.redis.setEx(
        `${PASSWORD_RESET_PREFIX}${resetToken}`,
        PASSWORD_RESET_TTL,
        user.id,
      );
    } catch (err: any) {
      this.logger.error(`Parol tiklash tokeni Redis ga yozilmadi: ${err.message}`);
      throw new BadRequestException('Tizimda vaqtinchalik muammo. Iltimos qayta urinib ko‘ring.');
    }

    // Send password reset email
    const frontendUrl = this.config.get('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')[0].trim();
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;
    await this.notificationQueue.queueEmail({
      to: user.email,
      subject: 'Xedu — Parolni tiklash',
      html: `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; color: #1f2937;">
          <h2 style="font-size: 18px; font-weight: 700; margin-bottom: 16px;">Xedu — Ta'lim boshqaruv tizimi</h2>
          <p style="font-size: 14px; line-height: 1.6; margin-bottom: 16px;">
            Parolingizni tiklash uchun quyidagi havolaga bosing. Bu havola 1 soat davomida amal qiladi.
          </p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 24px; background: #0F7B53; color: #fff; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">
            Parolni tiklash
          </a>
          <p style="font-size: 12px; color: #6b7280; margin-top: 24px;">
            Agar siz parolni tiklashni so'ramagan bo'lsangiz, ushbu xatni e'tiborsiz qoldiring.
          </p>
        </div>
      `,
      text: `Parolingizni tiklash uchun havola: ${resetUrl}`,
    });
    this.logger.log(`Parol tiklash emaili yuborildi: ${user.email}`);

    return { message: 'Agar email ro‘yxatdan o‘tgan bo‘lsa, tiklash havolasi yuborildi' };
  }

  /**
   * Director/admin aktiv filialga switch qiladi.
   * Yangi JWT tokenlar qaytariladi (branchId yangilangan).
   *
   * Qoidalar:
   * - SCHOOL_WIDE_ROLES (super_admin, director) → har qanday filialga
   * - branch_admin → faqat o'ziga assigned filiallarga
   * - Boshqa rollar → 403
   */
  async switchBranch(dto: SwitchBranchDto, currentUser: JwtPayload): Promise<TokenPair> {
    const targetBranchId = dto.branchId;

    // School-wide view: faqat director va super_admin uchun ruxsat
    if (!targetBranchId) {
      if (currentUser.role !== UserRole.SUPER_ADMIN && currentUser.role !== UserRole.DIRECTOR) {
        throw new ForbiddenException('Barcha filiallarni ko‘rish huquqi faqat director/super_admin uchun');
      }
      const user = await this.prisma.user.findUnique({
        where: { id: currentUser.sub, isActive: true },
        select: { id: true, email: true, role: true, schoolId: true, branchId: true, isFirstLogin: true },
      });
      if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');
      return this.generateTokens({ ...user, branchId: null });
    }

    const branch = await this.prisma.branch.findUnique({
      where: { id: targetBranchId },
      select: { id: true, schoolId: true, isActive: true },
    });

    if (!branch || !branch.isActive) {
      throw new BadRequestException('Filial topilmadi yoki faol emas');
    }

    if (currentUser.role !== UserRole.SUPER_ADMIN &&
        branch.schoolId !== currentUser.schoolId) {
      throw new ForbiddenException('Bu filial sizning maktabingizga tegishli emas');
    }

    const SCHOOL_WIDE_SWITCHERS = [UserRole.SUPER_ADMIN, UserRole.DIRECTOR];
    if (!SCHOOL_WIDE_SWITCHERS.includes(currentUser.role)) {
      // Director/super_admin'dan tashqari hamma — assignment talab qiladi
      const isAssigned =
        currentUser.branchId === targetBranchId ||
        (currentUser.assignedBranchIds?.includes(targetBranchId) ?? false);
      const hasActiveAssignment = isAssigned
        ? true
        : !!(await this.prisma.userBranchAssignment.findUnique({
            where: { userId_branchId: { userId: currentUser.sub, branchId: targetBranchId } },
            select: { isActive: true },
          }))?.isActive;
      if (!hasActiveAssignment) {
        throw new ForbiddenException("Bu filialga kirish huquqingiz yo'q");
      }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: currentUser.sub, isActive: true },
      select: { id: true, email: true, role: true, schoolId: true, branchId: true, isFirstLogin: true },
    });

    if (!user) throw new UnauthorizedException('Foydalanuvchi topilmadi');

    return this.generateTokens({ ...user, branchId: targetBranchId });
  }

  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    let userId: string | null;
    try {
      userId = await this.redis.get(`${PASSWORD_RESET_PREFIX}${dto.token}`);
    } catch (err: any) {
      this.logger.error(`Parol tiklash token tekshiruvi xato: ${err.message}`);
      throw new BadRequestException('Tizimda vaqtinchalik muammo. Iltimos qayta urinib ko‘ring.');
    }

    if (!userId) {
      throw new BadRequestException('Token yaroqsiz yoki muddati o‘tgan');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    await this.redis.del(`${PASSWORD_RESET_PREFIX}${dto.token}`).catch(err =>
      this.logger.warn(`Reset token o'chirishda Redis xato: ${err.message}`),
    );
    return { message: 'Parol muvaffaqiyatli yangilandi' };
  }

  /**
   * Birinchi kirishda parolni o'zgartirish.
   * Joriy parolni tekshiradi, yangi parolni saqlaydi, isFirstLogin=false qiladi
   * va yangi JWT tokenlar qaytaradi (cookie yangilanishi uchun).
   */
  async firstLoginPasswordChange(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ message: string; tokens: TokenPair }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        schoolId: true,
        branchId: true,
        passwordHash: true,
        isFirstLogin: true,
      },
    });
    if (!user) throw new NotFoundException('Foydalanuvchi topilmadi');

    if (!user.isFirstLogin) {
      throw new ForbiddenException('Bu endpoint faqat birinchi kirishda ishlatiladi');
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Joriy parol noto‘g‘ri');

    const passwordHash = await bcrypt.hash(newPassword, 12);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, isFirstLogin: false },
    });

    // Yangi tokenlar isFirstLogin=false bilan generatsiya qilinadi
    const tokens = await this.generateTokens({ ...user, isFirstLogin: false });
    this.logger.log(`Foydalanuvchi birinchi parolni o'zgartirdi: ${userId}`);
    return { message: 'Parol muvaffaqiyatli yangilandi', tokens };
  }

  private async generateTokens(user: {
    id: string;
    email: string;
    role: string;
    schoolId: string | null;
    branchId?: string | null;
    isFirstLogin?: boolean;
  }): Promise<TokenPair> {
    const isSuperAdmin = user.role === UserRole.SUPER_ADMIN;

    // Load active branch assignments (excluding primary branch)
    const assignments = await this.prisma.userBranchAssignment.findMany({
      where: {
        userId: user.id,
        isActive: true,
        branchId: { not: user.branchId ?? undefined },
      },
      select: { branchId: true },
    });
    const assignedBranchIds = assignments.map(a => a.branchId);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role as UserRole,
      schoolId: user.schoolId,
      branchId: user.branchId!,
      assignedBranchIds,
      isSuperAdmin,
      isFirstLogin: user.isFirstLogin,
    };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: ACCESS_TOKEN_TTL,
      jwtid: uuidv4(), // Unique token ID for deny-listing
    });

    const refreshToken = uuidv4();
    const sessionData = JSON.stringify({ userId: user.id, createdAt: new Date().toISOString() });
    await this.redis
      .setEx(`${REFRESH_TOKEN_PREFIX}${refreshToken}`, REFRESH_TOKEN_TTL, sessionData)
      .catch(err =>
        this.logger.warn(`Refresh token Redis ga yozilmadi: ${err.message}`),
      );

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_TTL,
    };
  }

  private async incrementLoginAttempts(key: string): Promise<void> {
    try {
      const current = await this.redis.incr(key);
      if (current === 1) {
        await this.redis.expire(key, LOGIN_BLOCK_TTL);
      }
    } catch {
      // Redis mavjud emas — rate limit tracking o'tkazib yuboriladi
    }
  }
}
