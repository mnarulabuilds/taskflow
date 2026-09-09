import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType } from '@prisma/client';

import { NotificationsService } from '../common/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DueSoonScheduler {
  private readonly logger = new Logger(DueSoonScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async notifyDueSoonTasks() {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const tasks = await this.prisma.task.findMany({
      where: {
        assigneeId: { not: null },
        status: { not: 'DONE' },
        dueDate: {
          gte: now,
          lte: in24Hours,
        },
      },
      include: {
        assignee: {
          select: {
            id: true,
            preferences: { select: { notifyDueSoon: true } },
          },
        },
        project: { select: { id: true, name: true } },
      },
    });

    for (const task of tasks) {
      if (!task.assigneeId || !task.assignee) {
        continue;
      }

      if (task.assignee.preferences?.notifyDueSoon === false) {
        continue;
      }

      const existing = await this.prisma.notification.findFirst({
        where: {
          userId: task.assigneeId,
          type: NotificationType.TASK_DUE_SOON,
          createdAt: { gte: now },
          metadata: {
            path: ['taskId'],
            equals: task.id,
          },
        },
      });

      if (existing) {
        continue;
      }

      await this.notificationsService.create(
        task.assigneeId,
        NotificationType.TASK_DUE_SOON,
        'Task due soon',
        `"${task.title}" in ${task.project.name} is due within 24 hours`,
        { taskId: task.id, projectId: task.projectId },
      );
    }

    this.logger.log(`Processed ${tasks.length} tasks due within 24 hours`);
  }
}
