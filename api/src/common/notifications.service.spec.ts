import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  let service: NotificationsService;
  const prisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();
    service = module.get<NotificationsService>(NotificationsService);
  });

  it('creates a notification', async () => {
    prisma.notification.create.mockResolvedValue({ id: 'n-1' });

    await expect(
      service.create(
        'user-1',
        NotificationType.TASK_ASSIGNED,
        'Task assigned',
        'You were assigned a task',
        { taskId: 'task-1' },
      ),
    ).resolves.toMatchObject({ id: 'n-1' });

    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: NotificationType.TASK_ASSIGNED,
        title: 'Task assigned',
      }),
    });
  });

  it('finds unread notifications only when requested', async () => {
    prisma.notification.findMany.mockResolvedValue([]);

    await service.findForUser('user-1', true);

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', read: false },
      }),
    );
  });

  it('marks a notification read for the owner', async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: 'n-1' });
    prisma.notification.update.mockResolvedValue({ id: 'n-1', read: true });

    await expect(service.markRead('n-1', 'user-1')).resolves.toMatchObject({
      read: true,
    });
  });

  it('returns null when marking another users notification', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(service.markRead('n-1', 'user-2')).resolves.toBeNull();
    expect(prisma.notification.update).not.toHaveBeenCalled();
  });

  it('marks all notifications read', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });

    await service.markAllRead('user-1');

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', read: false },
      data: { read: true },
    });
  });
});
