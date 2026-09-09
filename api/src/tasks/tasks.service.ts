import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  NotificationType,
  Prisma,
  TaskStatus,
} from '@prisma/client';

import { ActivityService } from '../common/activity.service';
import { NotificationsService } from '../common/notifications.service';
import { EventsService } from '../events/events.service';
import { PrismaService } from '../prisma/prisma.service';
import { LabelsService } from '../workspaces/labels.service';
import { BulkDeleteTaskDto } from './dto/bulk-delete-task.dto';
import { BulkUpdateTaskDto } from './dto/bulk-update-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryMyTaskDto } from './dto/query-my-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
    private readonly labelsService: LabelsService,
    private readonly eventsService: EventsService,
  ) {}

  async create(projectId: string, currentUserId: string, dto: CreateTaskDto) {
    const project = await this.assertProjectMembership(
      projectId,
      currentUserId,
    );
    await this.assertValidAssignee(project.workspaceId, dto.assigneeId);

    if (dto.labelIds?.length) {
      await this.labelsService.assertLabelsInWorkspace(
        project.workspaceId,
        dto.labelIds,
      );
    }

    const status = dto.status ?? TaskStatus.TODO;
    const position = await this.nextPosition(projectId, status);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status,
        priority: dto.priority,
        position,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assigneeId: dto.assigneeId,
        projectId,
        createdById: currentUserId,
        ...(dto.labelIds?.length
          ? {
              labels: {
                create: dto.labelIds.map((labelId) => ({ labelId })),
              },
            }
          : {}),
      },
      include: this.taskDetails,
    });

    await this.activityService.log({
      type: ActivityType.TASK_CREATED,
      workspaceId: project.workspaceId,
      projectId,
      taskId: task.id,
      userId: currentUserId,
      metadata: { title: task.title, status: task.status },
    });

    if (task.assigneeId && task.assigneeId !== currentUserId) {
      await this.notificationsService.create(
        task.assigneeId,
        NotificationType.TASK_ASSIGNED,
        'Task assigned to you',
        `You were assigned "${task.title}"`,
        { taskId: task.id, projectId },
      );
    }

    await this.broadcastProjectEvent(
      project.workspaceId,
      projectId,
      currentUserId,
      'task_created',
    );

    return task;
  }

  async findAll(
    projectId: string,
    currentUserId: string,
    query: QueryTaskDto = {},
  ) {
    await this.assertProjectMembership(projectId, currentUserId);

    const where: Prisma.TaskWhereInput = {
      projectId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.assigneeId ? { assigneeId: query.assigneeId } : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }],
        include: this.taskDetails,
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async findOne(projectId: string, taskId: string, currentUserId: string) {
    await this.assertProjectMembership(projectId, currentUserId);

    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
      include: this.taskDetails,
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    return task;
  }

  async findMyTasks(userId: string, query: QueryMyTaskDto = {}) {
    const memberships = await this.prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    });
    const workspaceIds = memberships.map((m) => m.workspaceId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const where: Prisma.TaskWhereInput = {
      assigneeId: userId,
      project: {
        workspaceId: query.workspaceId
          ? query.workspaceId
          : { in: workspaceIds },
        ...(query.projectId ? { id: query.projectId } : {}),
      },
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...(query.overdue
        ? {
            dueDate: { lt: today },
            status: { not: TaskStatus.DONE },
          }
        : {}),
      ...(query.dueToday
        ? {
            dueDate: { gte: today, lt: tomorrow },
          }
        : {}),
      ...(query.search
        ? {
            OR: [
              { title: { contains: query.search, mode: 'insensitive' } },
              { description: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }],
        include: {
          ...this.taskDetails,
          project: {
            select: {
              id: true,
              name: true,
              workspace: { select: { id: true, name: true } },
            },
          },
        },
        skip,
        take: limit,
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async update(
    projectId: string,
    taskId: string,
    currentUserId: string,
    dto: UpdateTaskDto,
  ) {
    const project = await this.assertProjectMembership(
      projectId,
      currentUserId,
    );
    const existing = await this.getTaskInProject(projectId, taskId);

    if (dto.assigneeId !== undefined) {
      await this.assertValidAssignee(project.workspaceId, dto.assigneeId);
    }

    if (dto.labelIds !== undefined) {
      await this.labelsService.assertLabelsInWorkspace(
        project.workspaceId,
        dto.labelIds,
      );
    }

    const { labelIds, ...updateFields } = dto;

    const task = await this.prisma.$transaction(async (tx) => {
      if (labelIds !== undefined) {
        await tx.taskLabel.deleteMany({ where: { taskId } });
        if (labelIds.length) {
          await tx.taskLabel.createMany({
            data: labelIds.map((labelId) => ({ taskId, labelId })),
          });
        }
      }

      return tx.task.update({
        where: { id: taskId },
        data: {
          ...updateFields,
          dueDate:
            dto.dueDate === undefined
              ? undefined
              : dto.dueDate === null
                ? null
                : new Date(dto.dueDate),
        },
        include: this.taskDetails,
      });
    });

    if (dto.status && dto.status !== existing.status) {
      await this.activityService.log({
        type: ActivityType.TASK_STATUS_CHANGED,
        workspaceId: project.workspaceId,
        projectId,
        taskId,
        userId: currentUserId,
        metadata: {
          title: task.title,
          from: existing.status,
          to: dto.status,
        },
      });
    } else {
      await this.activityService.log({
        type: ActivityType.TASK_UPDATED,
        workspaceId: project.workspaceId,
        projectId,
        taskId,
        userId: currentUserId,
        metadata: { title: task.title },
      });
    }

    if (
      dto.assigneeId &&
      dto.assigneeId !== existing.assigneeId &&
      dto.assigneeId !== currentUserId
    ) {
      await this.activityService.log({
        type: ActivityType.TASK_ASSIGNED,
        workspaceId: project.workspaceId,
        projectId,
        taskId,
        userId: currentUserId,
        metadata: { title: task.title, assigneeId: dto.assigneeId },
      });

      await this.notificationsService.create(
        dto.assigneeId,
        NotificationType.TASK_ASSIGNED,
        'Task assigned to you',
        `You were assigned "${task.title}"`,
        { taskId, projectId },
      );
    }

    await this.broadcastProjectEvent(
      project.workspaceId,
      projectId,
      currentUserId,
      'task_updated',
    );

    return task;
  }

  async bulkUpdate(
    projectId: string,
    currentUserId: string,
    dto: BulkUpdateTaskDto,
  ) {
    const project = await this.assertProjectMembership(
      projectId,
      currentUserId,
    );

    const tasks = await this.prisma.task.findMany({
      where: { id: { in: dto.ids }, projectId },
    });

    if (tasks.length !== dto.ids.length) {
      throw new NotFoundException('One or more tasks not found in this project.');
    }

    const { ids, ...updateFields } = dto;

    if (updateFields.assigneeId !== undefined) {
      await this.assertValidAssignee(
        project.workspaceId,
        updateFields.assigneeId,
      );
    }

    const data = {
      ...updateFields,
      dueDate:
        updateFields.dueDate === undefined
          ? undefined
          : updateFields.dueDate === null
            ? null
            : new Date(updateFields.dueDate),
    };

    await this.prisma.task.updateMany({
      where: { id: { in: ids }, projectId },
      data,
    });

    return this.prisma.task.findMany({
      where: { id: { in: ids } },
      include: this.taskDetails,
      orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async bulkDelete(
    projectId: string,
    currentUserId: string,
    dto: BulkDeleteTaskDto,
  ) {
    const project = await this.assertProjectMembership(
      projectId,
      currentUserId,
    );

    const tasks = await this.prisma.task.findMany({
      where: { id: { in: dto.ids }, projectId },
    });

    if (tasks.length !== dto.ids.length) {
      throw new NotFoundException('One or more tasks not found in this project.');
    }

    for (const task of tasks) {
      await this.activityService.log({
        type: ActivityType.TASK_DELETED,
        workspaceId: project.workspaceId,
        projectId,
        taskId: task.id,
        userId: currentUserId,
        metadata: { title: task.title },
      });
    }

    await this.prisma.task.deleteMany({
      where: { id: { in: dto.ids }, projectId },
    });

    return { success: true, deleted: dto.ids.length };
  }

  async reorderTasks(
    projectId: string,
    currentUserId: string,
    dto: ReorderTasksDto,
  ) {
    await this.assertProjectMembership(projectId, currentUserId);

    const taskIds = dto.items.map((item) => item.id);
    const tasks = await this.prisma.task.findMany({
      where: { id: { in: taskIds }, projectId },
      select: { id: true },
    });

    if (tasks.length !== taskIds.length) {
      throw new NotFoundException('One or more tasks not found in this project.');
    }

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.task.update({
          where: { id: item.id },
          data: { status: item.status, position: item.position },
        }),
      ),
    );

    return this.prisma.task.findMany({
      where: { projectId },
      include: this.taskDetails,
      orderBy: [{ position: 'asc' }, { updatedAt: 'desc' }],
    });
  }

  async exportCsv(projectId: string, currentUserId: string) {
    await this.assertProjectMembership(projectId, currentUserId);

    const tasks = await this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: { select: { name: true, email: true } },
        createdBy: { select: { name: true } },
        labels: { include: { label: { select: { name: true } } } },
      },
      orderBy: [{ status: 'asc' }, { position: 'asc' }],
    });

    const headers = [
      'id',
      'title',
      'description',
      'status',
      'priority',
      'dueDate',
      'position',
      'assignee',
      'createdBy',
      'labels',
      'createdAt',
      'updatedAt',
    ];

    const rows = tasks.map((task) =>
      [
        task.id,
        task.title,
        task.description ?? '',
        task.status,
        task.priority,
        task.dueDate?.toISOString() ?? '',
        task.position,
        task.assignee?.name ?? '',
        task.createdBy.name,
        task.labels.map((tl) => tl.label.name).join('; '),
        task.createdAt.toISOString(),
        task.updatedAt.toISOString(),
      ]
        .map((value) => this.escapeCsv(String(value)))
        .join(','),
    );

    return [headers.join(','), ...rows].join('\n');
  }

  async remove(projectId: string, taskId: string, currentUserId: string) {
    const project = await this.assertProjectMembership(
      projectId,
      currentUserId,
    );
    const existing = await this.getTaskInProject(projectId, taskId);

    await this.activityService.log({
      type: ActivityType.TASK_DELETED,
      workspaceId: project.workspaceId,
      projectId,
      taskId,
      userId: currentUserId,
      metadata: { title: existing.title },
    });

    await this.prisma.task.delete({ where: { id: taskId } });

    await this.broadcastProjectEvent(
      project.workspaceId,
      projectId,
      currentUserId,
      'task_deleted',
    );
  }

  private readonly taskDetails = {
    createdBy: { select: { id: true, name: true, email: true } },
    assignee: { select: { id: true, name: true, email: true } },
    subtasks: { orderBy: [{ position: 'asc' as const }, { createdAt: 'asc' as const }] },
    labels: { include: { label: true } },
    _count: { select: { comments: true } },
  };

  private async nextPosition(projectId: string, status: TaskStatus) {
    const maxPosition = await this.prisma.task.aggregate({
      where: { projectId, status },
      _max: { position: true },
    });

    return (maxPosition._max.position ?? -1) + 1;
  }

  private escapeCsv(value: string) {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }

    return value;
  }

  private async assertProjectMembership(projectId: string, userId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, workspaceId: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId: project.workspaceId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace.');
    }

    return project;
  }

  private async getTaskInProject(projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    return task;
  }

  private async broadcastProjectEvent(
    workspaceId: string,
    projectId: string,
    excludeUserId: string,
    type: 'task_created' | 'task_updated' | 'task_deleted',
  ) {
    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: { userId: true },
    });

    const userIds = members
      .map((m) => m.userId)
      .filter((id) => id !== excludeUserId);

    this.eventsService.emitToUsers(userIds, {
      type,
      projectId,
      workspaceId,
    });
  }

  private async assertValidAssignee(
    workspaceId: string,
    assigneeId?: string | null,
  ) {
    if (!assigneeId) {
      return;
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId, userId: assigneeId } },
    });

    if (!membership) {
      throw new ForbiddenException(
        'Assignee must be a member of this workspace.',
      );
    }
  }
}
