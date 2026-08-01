import { Test, TestingModule } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = { login: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();
    controller = module.get<AuthController>(AuthController);
  });

  it('delegates login to AuthService', async () => {
    const dto = { email: 'ada@example.com', password: 'password123' };
    authService.login.mockResolvedValue({ accessToken: 'token' });

    await expect(controller.login(dto)).resolves.toEqual({
      accessToken: 'token',
    });
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('returns the authenticated user for /auth/me', () => {
    const user = { id: 'user-1', email: 'ada@example.com' };
    expect(controller.me({ user } as Request & { user: typeof user })).toEqual(
      user,
    );
  });
});
