import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
  };
  const configService = {
    get: jest.fn((key: string, fallback?: string) => fallback),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('delegates login to AuthService and returns the user', async () => {
    const dto = { email: 'ada@example.com', password: 'password123' };
    const user = { id: 'user-1', email: dto.email };
    authService.login.mockResolvedValue({
      accessToken: 'token',
      refreshToken: 'refresh',
      user,
    });

    const response = {
      cookie: jest.fn(),
    } as unknown as Response;

    await expect(controller.login(dto, response)).resolves.toEqual({ user });
    expect(response.cookie).toHaveBeenCalled();
  });

  it('refreshes tokens from the refresh cookie', async () => {
    authService.refresh.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      user: { id: 'user-1', email: 'ada@example.com' },
    });

    const response = { cookie: jest.fn() } as unknown as Response;

    await expect(
      controller.refresh(
        { cookies: { refreshToken: 'refresh-token' } } as never,
        response,
      ),
    ).resolves.toEqual({ user: { id: 'user-1', email: 'ada@example.com' } });
  });
});
