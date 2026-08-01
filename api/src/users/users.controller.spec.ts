import { Test, TestingModule } from '@nestjs/testing';

import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  const usersService = { create: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();
    controller = module.get<UsersController>(UsersController);
  });

  it('delegates user registration to UsersService', async () => {
    const dto = {
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password123',
    };
    usersService.create.mockResolvedValue({
      id: 'user-1',
      name: dto.name,
      email: dto.email,
    });

    await expect(controller.create(dto)).resolves.toMatchObject({
      id: 'user-1',
    });
    expect(usersService.create).toHaveBeenCalledWith(dto);
  });
});
