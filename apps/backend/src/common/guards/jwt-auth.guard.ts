import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '@eduplatform/types';
import { createHash } from 'crypto';

const TOKEN_DENYLIST_PREFIX = 'token_deny:';
const USER_SESSIONS_PREFIX = 'user_sessions:';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Autentifikatsiya talab etiladi');
    }

    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow('JWT_SECRET'),
      });

      // Check deny-list (token revoked after logout)
      const isDenied = await this.isTokenDenied(token);
      if (isDenied) {
        throw new UnauthorizedException('Token bekor qilingan');
      }

      // Check global session revocation (logout-all)
      const allRevoked = await this.areAllSessionsRevoked(payload.sub);
      if (allRevoked) {
        throw new UnauthorizedException('Barcha sessiyalar bekor qilingan');
      }

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub, isActive: true },
        select: { id: true },
      });
      if (!user) {
        throw new UnauthorizedException('Foydalanuvchi topilmadi yoki bloklangan');
      }

      request['user'] = payload;
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token yaroqsiz');
    }

    return true;
  }

  private extractToken(request: any): string | null {
    // 1. Bearer header (backward compatible)
    const [type, token] = request.headers?.authorization?.split(' ') ?? [];
    if (type === 'Bearer') return token;

    // 2. Cookie fallback (httpOnly cookie-based auth)
    const cookieHeader = request.headers?.cookie as string | undefined;
    if (cookieHeader) {
      const match = cookieHeader.match(/access_token=([^;]+)/);
      if (match) return decodeURIComponent(match[1]);
    }

    return null;
  }

  private async isTokenDenied(token: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (decoded?.jti) {
        const denied = await this.redis.get(`${TOKEN_DENYLIST_PREFIX}${decoded.jti}`);
        if (denied) return true;
      }
      const tokenHash = createHash('sha256').update(token).digest('hex');
      const denied = await this.redis.get(`${TOKEN_DENYLIST_PREFIX}${tokenHash}`);
      return !!denied;
    } catch {
      return false;
    }
  }

  private async areAllSessionsRevoked(userId: string): Promise<boolean> {
    try {
      const revoked = await this.redis.get(`${USER_SESSIONS_PREFIX}${userId}:revoked`);
      return !!revoked;
    } catch {
      return false;
    }
  }
}
