import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../common/activity.service';
import { InvitesService } from '../notifications/invites.service';
import { WorkspacesService } from './workspaces.service';

describe('WorkspacesService', () => {
  let service: WorkspacesService;
  const transactionClient = {
    workspace: { create: jest.fn() },
    workspaceMember: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn(),
    workspaceMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    user: { findUnique: jest.fn() },
    workspace: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), delete: jest.fn() },
    workspaceInvite: { findUnique: jest.fn() },
  };
  const activityService = { log: jest.fn().mockResolvedValue({}) };
  const invitesService = {
    createInvite: jest.fn().mockResolvedValue({ token: 'invite-token' }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      (callback: (tx: typeof transactionClient) => unknown) =>
        callback(transactionClient),
    );
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkspacesService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
        { provide: InvitesService, useValue: invitesService },
      ],
    }).compile();
    service = module.get<WorkspacesService>(WorkspacesService);
  });

  it('creates a workspace and an owner membership atomically', async () => {
    transactionClient.workspace.create.mockResolvedValue({
      id: 'workspace-1',
      name: 'Engineering',
    });
    transactionClient.workspaceMember.create.mockResolvedValue({
      id: 'membership-1',
    });

    await expect(service.create('user-1', 'Engineering')).resolves.toEqual({
      id: 'workspace-1',
      name: 'Engineering',
    });
    expect(transactionClient.workspaceMember.create).toHaveBeenCalledWith({
      data: { workspaceId: 'workspace-1', userId: 'user-1', role: 'OWNER' },
    });
  });

  it('lists workspaces for a user with summary data', async () => {
    prisma.workspace.findMany.mockResolvedValue([]);
    await expect(service.findAllForUser('user-1')).resolves.toEqual([]);
    expect(prisma.workspace.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { members: { some: { userId: 'user-1' } } },
      }),
    );
  });

  it('lists members for a workspace the user belongs to', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WorkspaceRole.MEMBER,
    });
    prisma.workspaceMember.findMany.mockResolvedValue([]);

    await expect(service.findMembers('workspace-1', 'user-1')).resolves.toEqual(
      [],
    );
    expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: 'workspace-1' } }),
    );
  });

  it('rejects member listing for users outside the workspace', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue(null);

    await expect(
      service.findMembers('workspace-1', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each([
    [undefined, WorkspaceRole.MEMBER, 'not a member'],
    [WorkspaceRole.MEMBER, WorkspaceRole.MEMBER, 'cannot invite'],
    [WorkspaceRole.ADMIN, WorkspaceRole.ADMIN, 'cannot grant admin'],
    [WorkspaceRole.OWNER, WorkspaceRole.OWNER, 'cannot grant owner'],
  ])(
    'rejects invalid invitation permissions: %s / %s',
    async (currentRole, requestedRole) => {
      prisma.workspaceMember.findUnique.mockResolvedValue(
        currentRole ? { role: currentRole } : null,
      );
      await expect(
        service.addMember('workspace-1', 'user-1', {
          email: 'new@example.com',
          role: requestedRole,
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    },
  );

  it('sends an email invite when the user is not registered', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.workspaceInvite.findUnique.mockResolvedValue(null);

    await expect(
      service.addMember('workspace-1', 'user-1', {
        email: 'missing@example.com',
        role: WorkspaceRole.MEMBER,
      }),
    ).resolves.toEqual({
      inviteSent: true,
      email: 'missing@example.com',
    });
    expect(invitesService.createInvite).toHaveBeenCalled();
  });

  it('rejects invitations for users already in the workspace', async () => {
    prisma.workspaceMember.findUnique
      .mockResolvedValueOnce({ role: WorkspaceRole.OWNER })
      .mockResolvedValueOnce({ id: 'existing-membership' });
    prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
    await expect(
      service.addMember('workspace-1', 'user-1', {
        email: 'member@example.com',
        role: WorkspaceRole.MEMBER,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('creates a membership for an eligible invited user', async () => {
    prisma.workspaceMember.findUnique
      .mockResolvedValueOnce({ role: WorkspaceRole.OWNER })
      .mockResolvedValueOnce(null);
    prisma.user.findUnique.mockResolvedValue({ id: 'user-2' });
    prisma.workspaceMember.create.mockResolvedValue({ id: 'membership-2' });

    await expect(
      service.addMember('workspace-1', 'user-1', {
        email: 'new@example.com',
        role: WorkspaceRole.ADMIN,
      }),
    ).resolves.toEqual({ id: 'membership-2' });
    expect(prisma.workspaceMember.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          workspaceId: 'workspace-1',
          userId: 'user-2',
          role: WorkspaceRole.ADMIN,
        },
      }),
    );
  });
});
