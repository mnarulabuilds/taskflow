import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({ compare: jest.fn(), hash: jest.fn() }));

describe('UsersService', () => {
  let service: UsersService;
  const prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = module.get<UsersService>(UsersService);
  });

  it('creates a user with a hashed password and omits it from the response', async () => {
    const dto = {
      name: 'Ada',
      email: 'ada@example.com',
      password: 'password123',
    };
    const createdAt = new Date('2026-08-01T00:00:00.000Z');
    prisma.user.findUnique.mockResolvedValue(null);
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');
    prisma.user.create.mockResolvedValue({
      id: 'user-1',
      ...dto,
      password: 'hashed-password',
      createdAt,
    });

    await expect(service.create(dto)).resolves.toEqual({
      id: 'user-1',
      name: dto.name,
      email: dto.email,
      createdAt,
    });
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        ...dto,
        password: 'hashed-password',
        preferences: { create: {} },
      },
    });
  });

  it('rejects duplicate emails before hashing a password', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });

    await expect(
      service.create({
        name: 'Ada',
        email: 'ada@example.com',
        password: 'password123',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(bcrypt.hash).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('looks up users by email', async () => {
    const user = { id: 'user-1', email: 'ada@example.com' };
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findByEmail(user.email)).resolves.toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: user.email },
    });
  });
});
