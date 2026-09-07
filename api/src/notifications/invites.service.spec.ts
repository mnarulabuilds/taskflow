import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceRole } from '@prisma/client';

import { ActivityService } from '../common/activity.service';
import { NotificationsService } from '../common/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { InvitesService } from './invites.service';

describe('InvitesService', () => {
  let service: InvitesService;
  const prisma = {
    user: { findUnique: jest.fn() },
    workspaceInvite: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    workspaceMember: { findUnique: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };
  const activityService = { log: jest.fn() };
  const notificationsService = { create: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();
    service = module.get<InvitesService>(InvitesService);
  });

  it('returns pending invites for the user email', async () => {
    prisma.user.findUnique.mockResolvedValue({ email: 'ada@example.com' });
    prisma.workspaceInvite.findMany.mockResolvedValue([{ id: 'invite-1' }]);

    await expect(service.findPendingForUser('user-1')).resolves.toHaveLength(1);

    expect(prisma.workspaceInvite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ email: 'ada@example.com', status: 'PENDING' }),
      }),
    );
  });

  it('accepts a valid invite', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'ada@example.com' });
    prisma.workspaceInvite.findUnique.mockResolvedValue({
      id: 'invite-1',
      token: 'token-1',
      status: 'PENDING',
      email: 'ada@example.com',
      workspaceId: 'workspace-1',
      role: WorkspaceRole.MEMBER,
      expiresAt: new Date(Date.now() + 86_400_000),
    });
    prisma.workspaceMember.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (fn) =>
      fn({
        workspaceInvite: { update: jest.fn() },
        workspaceMember: {
          create: jest.fn().mockResolvedValue({
            workspaceId: 'workspace-1',
            userId: 'user-1',
            workspace: { id: 'workspace-1', name: 'Acme' },
          }),
        },
      }),
    );

    await expect(service.accept('token-1', 'user-1')).resolves.toMatchObject({
      workspaceId: 'workspace-1',
    });

    expect(activityService.log).toHaveBeenCalled();
  });

  it('rejects expired invites', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'ada@example.com' });
    prisma.workspaceInvite.findUnique.mockResolvedValue({
      id: 'invite-1',
      status: 'PENDING',
      email: 'ada@example.com',
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(service.accept('token-1', 'user-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rejects invites for a different email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'other@example.com' });
    prisma.workspaceInvite.findUnique.mockResolvedValue({
      id: 'invite-1',
      status: 'PENDING',
      email: 'ada@example.com',
      expiresAt: new Date(Date.now() + 86_400_000),
    });

    await expect(service.accept('token-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects missing invites', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-1', email: 'ada@example.com' });
    prisma.workspaceInvite.findUnique.mockResolvedValue(null);

    await expect(service.accept('missing', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('creates an invite and notifies registered users', async () => {
    prisma.workspaceInvite.create.mockResolvedValue({
      id: 'invite-1',
      token: 'token-1',
      workspace: { id: 'workspace-1', name: 'Acme' },
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });

    await service.createInvite(
      'workspace-1',
      'user-1',
      'Ada@example.com',
      WorkspaceRole.MEMBER,
    );

    expect(prisma.workspaceInvite.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'ada@example.com' }),
      }),
    );
    expect(notificationsService.create).toHaveBeenCalled();
    expect(activityService.log).toHaveBeenCalled();
  });
});
