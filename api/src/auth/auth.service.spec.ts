import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { UsersService } from '../users/users.service';
import { AuthService } from './auth.service';
import { RefreshTokenService } from './refresh-token.service';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

describe('AuthService', () => {
  let service: AuthService;
  const usersService = { findByEmail: jest.fn() };
  const jwtService = { signAsync: jest.fn() };
  const refreshTokenService = {
    create: jest.fn(),
    rotate: jest.fn(),
    revoke: jest.fn(),
    revokeAllForUser: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: RefreshTokenService, useValue: refreshTokenService },
      ],
    }).compile();
    service = module.get<AuthService>(AuthService);
  });

  it('returns tokens for valid credentials', async () => {
    const user = { id: 'user-1', email: 'ada@example.com', password: 'hash' };
    usersService.findByEmail.mockResolvedValue(user);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('signed-token');
    refreshTokenService.create.mockResolvedValue('refresh-token');

    await expect(
      service.login({ email: user.email, password: 'password123' }),
    ).resolves.toEqual({
      accessToken: 'signed-token',
      refreshToken: 'refresh-token',
      user: { id: user.id, email: user.email },
    });
  });

  it('rotates refresh tokens', async () => {
    refreshTokenService.rotate.mockResolvedValue({
      user: { id: 'user-1', email: 'ada@example.com' },
      refreshToken: 'next-refresh',
    });
    jwtService.signAsync.mockResolvedValue('next-access');

    await expect(service.refresh('old-refresh')).resolves.toEqual({
      accessToken: 'next-access',
      refreshToken: 'next-refresh',
      user: { id: 'user-1', email: 'ada@example.com' },
    });
  });

  it('rejects invalid refresh tokens', async () => {
    refreshTokenService.rotate.mockResolvedValue(null);
    await expect(service.refresh('bad-token')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
