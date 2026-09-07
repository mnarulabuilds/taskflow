import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { RefreshTokenService } from './refresh-token.service';

describe('RefreshTokenService', () => {
  let service: RefreshTokenService;
  const prisma = {
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RefreshTokenService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<RefreshTokenService>(RefreshTokenService);
  });

  it('creates a hashed refresh token', async () => {
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-1' });

    const rawToken = await service.create('user-1');

    expect(rawToken).toHaveLength(64);
    expect(prisma.refreshToken.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        tokenHash: expect.any(String),
      }),
    });
  });

  it('validates a non-expired token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 86_400_000),
      user: { id: 'user-1', email: 'ada@example.com' },
    });

    const rawToken = await service.create('user-1');
    prisma.refreshToken.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 86_400_000),
      user: { id: 'user-1', email: 'ada@example.com' },
    });

    await expect(service.validate(rawToken)).resolves.toMatchObject({
      id: 'user-1',
    });
  });

  it('revokes expired tokens on validation', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() - 1_000),
      user: { id: 'user-1', email: 'ada@example.com' },
    });

    await expect(service.validate('expired-token')).resolves.toBeNull();
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
  });

  it('rotates a valid token', async () => {
    prisma.refreshToken.findUnique.mockResolvedValue({
      expiresAt: new Date(Date.now() + 86_400_000),
      user: { id: 'user-1', email: 'ada@example.com' },
    });
    prisma.refreshToken.create.mockResolvedValue({ id: 'rt-2' });

    const result = await service.rotate('valid-token');

    expect(result).toMatchObject({
      user: { id: 'user-1' },
      refreshToken: expect.any(String),
    });
    expect(prisma.refreshToken.deleteMany).toHaveBeenCalled();
  });

  it('revokes all tokens for a user', async () => {
    await service.revokeAllForUser('user-1');

    expect(prisma.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
  });
});
