import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '@eduplatform/types';
import { RedisService } from '@/common/redis/redis.service';
import { createHash } from 'crypto';

const TOKEN_DENYLIST_PREFIX = 'token_deny:';
const USER_SESSIONS_PREFIX = 'user_sessions:';
const WS_JOIN_LIMIT = 10; // max room joins per minute
const wsJoinCounts = new Map<string, number[]>(); // socketId -> timestamps

@WebSocketGateway({
  cors: {
    origin: (origin, callback) => {
      const allowed = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()) ?? ['http://localhost:3000'];
      if (!origin || allowed.includes(origin) || allowed.includes('*')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'), false);
      }
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
  namespace: '/',
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly redis: RedisService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace('Bearer ', '');

      if (token) {
        const payload = this.jwtService.verify<JwtPayload>(token, {
          secret: this.config.get('JWT_SECRET'),
        });

        // Check deny-list (token revoked after logout)
        const isDenied = await this.isTokenDenied(token);
        if (isDenied) {
          this.logger.warn(`Denied token socket connection: ${client.id}`);
          client.disconnect(true);
          return;
        }

        // Check global session revocation (logout-all)
        const allRevoked = await this.areAllSessionsRevoked(payload.sub);
        if (allRevoked) {
          this.logger.warn(`Revoked session socket connection: ${client.id}`);
          client.disconnect(true);
          return;
        }

        client.data.user = payload;

        const rooms: string[] = [`user:${payload.sub}`];

        if (payload.schoolId) {
          rooms.push(`school:${payload.schoolId}`);
        }

        if (payload.branchId) {
          rooms.push(`branch:${payload.branchId}`);
        }

        await Promise.all(rooms.map((r) => client.join(r)));
        this.logger.log(
          `Connected: ${payload.email} → [${rooms.join(', ')}] (${client.id})`,
        );
      } else {
        // Public display mode — join display room only
        const schoolSlug = client.handshake.query?.schoolSlug as string;
        if (schoolSlug) {
          await client.join(`display:${schoolSlug}`);
          this.logger.log(`Display client connected: ${schoolSlug} (${client.id})`);
        }
      }
    } catch {
      this.logger.warn(`Unauthenticated socket connection: ${client.id}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    wsJoinCounts.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
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

  private checkRateLimit(socketId: string): boolean {
    const now = Date.now();
    const window = 60_000; // 1 minute
    const timestamps = wsJoinCounts.get(socketId) ?? [];
    const recent = timestamps.filter(t => now - t < window);
    if (recent.length >= WS_JOIN_LIMIT) return false;
    recent.push(now);
    wsJoinCounts.set(socketId, recent);
    return true;
  }

  // ─── Subscribe messages (manual room join) ───────────────────────────────

  @SubscribeMessage('join:school')
  async handleJoinSchool(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { schoolId: string },
  ) {
    const user = client.data.user as JwtPayload | undefined;
    if (!user || user.schoolId !== data.schoolId) {
      return { event: 'error', message: 'Ruxsat yo\'q' };
    }
    if (!this.checkRateLimit(client.id)) {
      return { event: 'error', message: 'Juda ko\'p urinish' };
    }
    await client.join(`school:${data.schoolId}`);
    return { event: 'joined', room: `school:${data.schoolId}` };
  }

  @SubscribeMessage('join:branch')
  async handleJoinBranch(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { branchId: string },
  ) {
    const user = client.data.user as JwtPayload | undefined;
    const allowedBranches = [
      user?.branchId,
      ...(user?.assignedBranchIds ?? []),
    ].filter(Boolean);
    if (!user || !allowedBranches.includes(data.branchId)) {
      return { event: 'error', message: 'Ruxsat yo\'q' };
    }
    if (!this.checkRateLimit(client.id)) {
      return { event: 'error', message: 'Juda ko\'p urinish' };
    }
    await client.join(`branch:${data.branchId}`);
    return { event: 'joined', room: `branch:${data.branchId}` };
  }

  @SubscribeMessage('join:display')
  async handleJoinDisplay(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { schoolSlug: string },
  ) {
    await client.join(`display:${data.schoolSlug}`);
    return { event: 'joined', room: `display:${data.schoolSlug}` };
  }

  // ─── Server-side emit helpers ────────────────────────────────────────────

  emitToSchool(schoolId: string, event: string, data: unknown, roles?: string[]) {
    if (roles && roles.length > 0) {
      // Role-aware filtering: emit only to users matching roles
      // This requires maintaining a role-based room index (e.g., school:{id}:role:{role})
      // For now, emit to school room and let frontend filter
      this.server.to(`school:${schoolId}`).emit(event, { ...data as any, _targetRoles: roles });
    } else {
      this.server.to(`school:${schoolId}`).emit(event, data);
    }
  }

  emitToBranch(branchId: string, event: string, data: unknown) {
    this.server.to(`branch:${branchId}`).emit(event, data);
  }

  emitToDisplay(schoolSlug: string, event: string, data: unknown) {
    this.server.to(`display:${schoolSlug}`).emit(event, data);
  }

  /** Shaxsiy xabar — user:{userId} xonasiga yuborish */
  emitToUser(userId: string, event: string, data: unknown) {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  // ─── Domain events ───────────────────────────────────────────────────────

  emitScheduleUpdate(schoolId: string, data: unknown) {
    this.emitToSchool(schoolId, 'schedule:live', data);
  }

  emitNotification(schoolId: string, data: unknown) {
    this.emitToSchool(schoolId, 'notification:new', data);
  }

  emitAttendanceUpdate(schoolId: string, data: unknown) {
    this.emitToSchool(schoolId, 'attendance:updated', data);
  }

  emitPaymentReceived(schoolId: string, data: unknown) {
    this.emitToSchool(schoolId, 'payment:received', data);
  }

  /**
   * G'azna yopildi — faqat shu filial + School Admin xabar oladi.
   * School Admin `school:{schoolId}` xonasida ham turadi, shuning uchun
   * ikkala emit ham kerak emas: branch xonasiga yuborganda School Admin
   * ham oladi faqat u `branch:{branchId}` xonasiga qo'shilgan bo'lsa.
   * Ishonchli yo'l: branch → school (cross-posting) orqali yuborish.
   */
  emitShiftClosed(
    branchId: string,
    schoolId: string,
    data: { branchName: string; closedAt: string; totalIn: number; totalOut: number; balance: number },
  ) {
    // Filial xodimlari (kassir, filial menejer)
    this.emitToBranch(branchId, 'treasury:shift_closed', data);
    // School Admin va Director — maktab xonasiga ham yuborish
    this.emitToSchool(schoolId, 'treasury:shift_closed', { ...data, branchId });
  }

  emitLeadAssigned(branchId: string, assigneeUserId: string, data: unknown) {
    this.emitToBranch(branchId, 'crm:lead_assigned', data);
    this.emitToUser(assigneeUserId, 'crm:lead_assigned', data);
  }

  /** Shaxsiy xabar: yangi xabar keldi */
  emitDirectMessage(toUserId: string, data: unknown) {
    this.emitToUser(toUserId, 'message:new', data);
  }

  /** Shaxsiy bildirishnoma */
  emitPersonalNotification(userId: string, data: unknown) {
    this.emitToUser(userId, 'notification:personal', data);
  }
}
