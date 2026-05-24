import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { PrismaService } from '@/common/prisma/prisma.service';
import { RedisService } from '@/common/redis/redis.service';
import { NotificationQueueService } from '@/modules/notifications/notification-queue.service';
import { UserRole } from '@eduplatform/types';

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockUser = {
  id: 'user-uuid-1',
  email: 'admin@test.uz',
  firstName: 'Ali',
  lastName: 'Valiyev',
  role: UserRole.DIRECTOR,
  schoolId: 'school-uuid-1',
  branchId: 'branch-uuid-1',
  passwordHash: '',   // filled in beforeAll
  isActive: true,
  isFirstLogin: true,
};

const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
  school: {
    findUnique: jest.fn(() => Promise.resolve({ deletedAt: null })),
  },
  userBranchAssignment: {
    findMany: jest.fn(() => Promise.resolve([])),
  },
};

const redisStore: Record<string, string> = {};
const mockRedis = {
  get: jest.fn((key: string) => Promise.resolve(redisStore[key] ?? null)),
  set: jest.fn((key: string, value: string) => { redisStore[key] = value; return Promise.resolve(); }),
  setEx: jest.fn((key: string, _ttl: number, value: string) => { redisStore[key] = value; return Promise.resolve(); }),
  del: jest.fn((key: string) => { delete redisStore[key]; return Promise.resolve(); }),
  incr: jest.fn((key: string) => {
    const cur = parseInt(redisStore[key] ?? '0') + 1;
    redisStore[key] = String(cur);
    return Promise.resolve(cur);
  }),
  expire: jest.fn(() => Promise.resolve()),
};

const mockJwt = {
  sign: jest.fn(() => 'mock-access-token'),
};

const mockConfig = {
  get: jest.fn((key: string, defaultValue?: string) => {
    if (key === 'JWT_SECRET') return 'test-secret';
    if (key === 'ALLOWED_ORIGINS') return 'http://localhost:3000';
    return defaultValue;
  }),
};

const mockNotificationQueue = {
  queueEmail: jest.fn(() => Promise.resolve()),
};

// ── Test Suite ─────────────────────────────────────────────────────────────

describe('AuthService', () => {
  let service: AuthService;

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('Password123!', 10);
  });

  beforeEach(async () => {
    // Clear redis store between tests
    Object.keys(redisStore).forEach(k => delete redisStore[k]);
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService,  useValue: mockPrisma },
        { provide: RedisService,   useValue: mockRedis },
        { provide: JwtService,     useValue: mockJwt },
        { provide: ConfigService,  useValue: mockConfig },
        { provide: NotificationQueueService, useValue: mockNotificationQueue },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ── login ────────────────────────────────────────────────────────────────

  describe('login()', () => {
    it('returns user + tokens on valid credentials', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.login({ email: mockUser.email, password: 'Password123!' });

      expect(result.user).toMatchObject({
        id: mockUser.id,
        email: mockUser.email,
        role: mockUser.role,
      });
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(result.tokens.refreshToken).toBeDefined();
      // Login attempts cleared
      expect(mockRedis.del).toHaveBeenCalled();
    });

    it('throws UnauthorizedException on wrong password', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        service.login({ email: mockUser.email, password: 'WrongPass!' }),
      ).rejects.toThrow(UnauthorizedException);

      // Login attempt incremented
      expect(mockRedis.incr).toHaveBeenCalled();
    });

    it('throws UnauthorizedException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.login({ email: 'notfound@test.uz', password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when user is inactive', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, isActive: false });

      await expect(
        service.login({ email: mockUser.email, password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('blocks login after 5 failed attempts', async () => {
      // Pre-fill 5 attempts in redis
      redisStore[`login_attempts:${mockUser.email}`] = '5';

      await expect(
        service.login({ email: mockUser.email, password: 'any' }),
      ).rejects.toThrow(UnauthorizedException);

      // Should not even query DB
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── refresh ──────────────────────────────────────────────────────────────

  describe('refresh()', () => {
    it('returns new token pair on valid refresh token', async () => {
      const fakeRefresh = 'valid-refresh-token';
      redisStore[`refresh:${fakeRefresh}`] = mockUser.id;
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: mockUser.id, email: mockUser.email,
        role: mockUser.role, schoolId: mockUser.schoolId,
      });

      const tokens = await service.refresh({ refreshToken: fakeRefresh });

      expect(tokens.accessToken).toBe('mock-access-token');
      // Old token deleted (rotation)
      expect(redisStore[`refresh:${fakeRefresh}`]).toBeUndefined();
    });

    it('throws UnauthorizedException on unknown/expired refresh token', async () => {
      await expect(
        service.refresh({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── logout ───────────────────────────────────────────────────────────────

  describe('logout()', () => {
    it('deletes refresh token from redis and deny-lists access token', async () => {
      const rt = 'token-to-revoke';
      const at = 'access-token-deny';
      redisStore[`refresh:${rt}`] = mockUser.id;

      await service.logout(at, rt, mockUser.id);

      expect(redisStore[`refresh:${rt}`]).toBeUndefined();
    });
  });

  // ── forgotPassword ───────────────────────────────────────────────────────

  describe('forgotPassword()', () => {
    it('returns generic message even if email not found (no leak)', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      const result = await service.forgotPassword({ email: 'ghost@test.uz' });

      expect(result.message).toContain('ro‘yxatdan o‘tgan bo‘lsa');
      // No token created
      expect(mockRedis.setEx).not.toHaveBeenCalled();
    });

    it('creates reset token in redis when user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      const result = await service.forgotPassword({ email: mockUser.email });

      expect(result.message).toContain('ro‘yxatdan o‘tgan bo‘lsa');
      expect(mockRedis.setEx).toHaveBeenCalledWith(
        expect.stringMatching(/^pwd_reset:/),
        expect.any(Number),
        mockUser.id,
      );
    });
  });

  // ── resetPassword ─────────────────────────────────────────────────────────

  describe('resetPassword()', () => {
    it('updates password when token is valid', async () => {
      const token = 'valid-reset-token';
      redisStore[`pwd_reset:${token}`] = mockUser.id;
      mockPrisma.user.update.mockResolvedValueOnce(mockUser);

      const result = await service.resetPassword({ token, password: 'NewPass456!' });

      expect(result.message).toContain('muvaffaqiyatli');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({ passwordHash: expect.any(String) }),
      });
      // Token deleted
      expect(redisStore[`pwd_reset:${token}`]).toBeUndefined();
    });

    it('throws BadRequestException on invalid token', async () => {
      await expect(
        service.resetPassword({ token: 'invalid-token', password: 'any' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── firstLoginPasswordChange ───────────────────────────────────────────────

  describe('firstLoginPasswordChange()', () => {
    it('returns tokens and updates password + isFirstLogin on success', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.user.update.mockResolvedValueOnce({ ...mockUser, isFirstLogin: false });

      const result = await service.firstLoginPasswordChange(
        mockUser.id,
        'Password123!',
        'NewSecurePass123!',
      );

      expect(result.message).toContain('muvaffaqiyatli');
      expect(result.tokens).toBeDefined();
      expect(result.tokens.accessToken).toBe('mock-access-token');
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: expect.objectContaining({
          passwordHash: expect.any(String),
          isFirstLogin: false,
        }),
      });
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.firstLoginPasswordChange(mockUser.id, 'any', 'any'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException when isFirstLogin is false', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce({ ...mockUser, isFirstLogin: false });

      await expect(
        service.firstLoginPasswordChange(mockUser.id, 'Password123!', 'NewPass123!'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws UnauthorizedException on wrong current password', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);

      await expect(
        service.firstLoginPasswordChange(mockUser.id, 'WrongPass!', 'NewPass123!'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('new password works and old password fails after change', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.user.update.mockResolvedValueOnce({ ...mockUser, isFirstLogin: false });

      // First login password change
      const result = await service.firstLoginPasswordChange(
        mockUser.id,
        'Password123!',
        'NewSecurePass123!',
      );
      expect(result.tokens).toBeDefined();

      // Simulate DB update reflected in subsequent login
      const updatedUser = { ...mockUser, passwordHash: await bcrypt.hash('NewSecurePass123!', 10), isFirstLogin: false };
      mockPrisma.user.findUnique.mockResolvedValueOnce(updatedUser);

      // New password login succeeds
      const loginResult = await service.login({ email: mockUser.email, password: 'NewSecurePass123!' });
      expect((loginResult.user as any).isFirstLogin).toBe(false);

      // Old password login fails
      mockPrisma.user.findUnique.mockResolvedValueOnce(updatedUser);
      await expect(
        service.login({ email: mockUser.email, password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rolls back password change when token generation fails', async () => {
      mockPrisma.user.findUnique.mockResolvedValueOnce(mockUser);
      mockPrisma.user.update.mockResolvedValueOnce({ ...mockUser, isFirstLogin: false });
      // Simulate token generation failure
      mockJwt.sign.mockImplementationOnce(() => { throw new Error('JWT signing failed'); });

      await expect(
        service.firstLoginPasswordChange(mockUser.id, 'Password123!', 'NewSecurePass123!'),
      ).rejects.toThrow(BadRequestException);

      // Verify rollback: passwordHash and isFirstLogin restored
      expect(mockPrisma.user.update).toHaveBeenLastCalledWith({
        where: { id: mockUser.id },
        data: {
          passwordHash: mockUser.passwordHash,
          isFirstLogin: true,
        },
      });
    });
  });

  // ── refresh (isFirstLogin preservation) ────────────────────────────────────

  describe('refresh()', () => {
    it('returns new token pair on valid refresh token', async () => {
      const fakeRefresh = 'valid-refresh-token';
      redisStore[`refresh:${fakeRefresh}`] = mockUser.id;
      mockPrisma.user.findUnique.mockResolvedValueOnce({
        id: mockUser.id, email: mockUser.email,
        role: mockUser.role, schoolId: mockUser.schoolId,
        branchId: mockUser.branchId, isFirstLogin: true,
      });

      const tokens = await service.refresh({ refreshToken: fakeRefresh });

      expect(tokens.accessToken).toBe('mock-access-token');
      // Old token deleted (rotation)
      expect(redisStore[`refresh:${fakeRefresh}`]).toBeUndefined();
      // generateTokens called with isFirstLogin preserved
      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({ isFirstLogin: true }),
        expect.any(Object),
      );
    });

    it('throws UnauthorizedException on unknown/expired refresh token', async () => {
      await expect(
        service.refresh({ refreshToken: 'expired-token' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
