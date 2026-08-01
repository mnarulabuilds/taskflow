import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { WorkspaceRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
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

  it('lists memberships with workspace summary data', async () => {
    prisma.workspaceMember.findMany.mockResolvedValue([]);
    await expect(service.findAllForUser('user-1')).resolves.toEqual([]);
    expect(prisma.workspaceMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user-1' } }),
    );
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

  it('rejects an invitation when the email has no registered user', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue({
      role: WorkspaceRole.OWNER,
    });
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.addMember('workspace-1', 'user-1', {
        email: 'missing@example.com',
        role: WorkspaceRole.MEMBER,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
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
