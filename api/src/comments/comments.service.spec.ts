import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { ActivityService } from '../common/activity.service';
import { NotificationsService } from '../common/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommentsService } from './comments.service';

describe('CommentsService', () => {
  let service: CommentsService;
  const prisma = {
    task: { findFirst: jest.fn() },
    workspaceMember: { findUnique: jest.fn() },
    taskComment: { findMany: jest.fn(), create: jest.fn() },
  };
  const activityService = { log: jest.fn() };
  const notificationsService = { create: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: activityService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();
    service = module.get<CommentsService>(CommentsService);
  });

  it('creates a comment and notifies the assignee', async () => {
    prisma.task.findFirst.mockResolvedValue({
      id: 'task-1',
      title: 'Write docs',
      assigneeId: 'user-2',
      project: { workspaceId: 'workspace-1' },
    });
    prisma.workspaceMember.findUnique.mockResolvedValue({ id: 'membership-1' });
    prisma.taskComment.create.mockResolvedValue({
      id: 'comment-1',
      content: 'Looks good',
      author: { id: 'user-1', name: 'Ada', email: 'ada@example.com' },
    });

    await expect(
      service.create('project-1', 'task-1', 'user-1', { content: 'Looks good' }),
    ).resolves.toMatchObject({ id: 'comment-1' });

    expect(notificationsService.create).toHaveBeenCalled();
    expect(activityService.log).toHaveBeenCalled();
  });

  it('rejects comments from non-members', async () => {
    prisma.task.findFirst.mockResolvedValue({
      id: 'task-1',
      project: { workspaceId: 'workspace-1' },
    });
    prisma.workspaceMember.findUnique.mockResolvedValue(null);

    await expect(
      service.create('project-1', 'task-1', 'user-1', { content: 'Nope' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects comments on missing tasks', async () => {
    prisma.task.findFirst.mockResolvedValue(null);

    await expect(
      service.create('project-1', 'missing', 'user-1', { content: 'Nope' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
