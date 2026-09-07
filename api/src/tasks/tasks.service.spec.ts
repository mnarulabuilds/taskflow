import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../common/activity.service';
import { NotificationsService } from '../common/notifications.service';
import { TasksService } from './tasks.service';

describe('TasksService', () => {
  let service: TasksService;
  const prisma = {
    project: { findUnique: jest.fn() },
    workspaceMember: { findUnique: jest.fn() },
    task: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  };

  const allowProjectAccess = () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      workspaceId: 'workspace-1',
    });
    prisma.workspaceMember.findUnique.mockResolvedValue({ id: 'membership-1' });
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: { log: jest.fn() } },
        { provide: NotificationsService, useValue: { create: jest.fn() } },
      ],
    }).compile();
    service = module.get<TasksService>(TasksService);
  });

  it('creates a task, converting its due date and including task users', async () => {
    allowProjectAccess();
    prisma.task.create.mockResolvedValue({ id: 'task-1' });
    const dto = {
      title: 'Write release notes',
      dueDate: '2026-08-10T00:00:00.000Z',
    };
    await expect(service.create('project-1', 'user-1', dto)).resolves.toEqual({
      id: 'task-1',
    });
    expect(prisma.task.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          title: dto.title,
          description: undefined,
          status: undefined,
          priority: undefined,
          projectId: 'project-1',
          createdById: 'user-1',
          assigneeId: undefined,
          dueDate: new Date(dto.dueDate),
        },
      }),
    );
  });

  it('lists tasks only after checking project membership', async () => {
    allowProjectAccess();
    prisma.task.findMany.mockResolvedValue([]);
    await expect(service.findAll('project-1', 'user-1', {})).resolves.toEqual([]);
    expect(prisma.task.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { projectId: 'project-1' } }),
    );
  });

  it('rejects a missing project', async () => {
    prisma.project.findUnique.mockResolvedValue(null);
    await expect(service.findAll('project-1', 'user-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('rejects a user outside the workspace', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      workspaceId: 'workspace-1',
    });
    prisma.workspaceMember.findUnique.mockResolvedValue(null);
    await expect(service.findAll('project-1', 'user-1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.task.findMany).not.toHaveBeenCalled();
  });

  it('rejects assigning a task to a user outside the workspace', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      workspaceId: 'workspace-1',
    });
    prisma.workspaceMember.findUnique
      .mockResolvedValueOnce({ id: 'membership-1' })
      .mockResolvedValueOnce(null);
    await expect(
      service.create('project-1', 'user-1', {
        title: 'Write release notes',
        assigneeId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.task.create).not.toHaveBeenCalled();
  });

  it('updates a task within the requested project and supports unassigning it', async () => {
    allowProjectAccess();
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1', status: 'TODO', title: 'Task', assigneeId: null });
    prisma.task.update.mockResolvedValue({ id: 'task-1', assigneeId: null });
    await expect(
      service.update('project-1', 'task-1', 'user-1', {
        assigneeId: null,
        dueDate: null,
      }),
    ).resolves.toEqual({ id: 'task-1', assigneeId: null });
    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { assigneeId: null, dueDate: null },
      }),
    );
  });

  it('converts an updated due date into a Date', async () => {
    allowProjectAccess();
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1', status: 'TODO', title: 'Task', assigneeId: null });
    prisma.task.update.mockResolvedValue({ id: 'task-1' });
    const dueDate = '2026-08-15T00:00:00.000Z';

    await service.update('project-1', 'task-1', 'user-1', { dueDate });

    expect(prisma.task.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { dueDate: new Date(dueDate) },
      }),
    );
  });

  it('rejects update and deletion of a task outside the requested project', async () => {
    allowProjectAccess();
    prisma.task.findFirst.mockResolvedValue(null);
    await expect(
      service.update('project-1', 'task-1', 'user-1', { title: 'Updated' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.remove('project-1', 'task-1', 'user-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.task.update).not.toHaveBeenCalled();
    expect(prisma.task.delete).not.toHaveBeenCalled();
  });

  it('deletes a task after confirming project access and ownership', async () => {
    allowProjectAccess();
    prisma.task.findFirst.mockResolvedValue({ id: 'task-1', status: 'TODO', title: 'Task', assigneeId: null });
    await service.remove('project-1', 'task-1', 'user-1');
    expect(prisma.task.delete).toHaveBeenCalledWith({
      where: { id: 'task-1' },
    });
  });
});
