import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, NotificationType, Prisma } from '@prisma/client';

import { ActivityService } from '../common/activity.service';
import { NotificationsService } from '../common/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(projectId: string, currentUserId: string, dto: CreateTaskDto) {
    const project = await this.assertProjectMembership(
      projectId,
      currentUserId,
    );
    await this.assertValidAssignee(project.workspaceId, dto.assigneeId);

    const task = await this.prisma.task.create({
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status,
        priority: dto.priority,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
        assigneeId: dto.assigneeId,
        projectId,
        createdById: currentUserId,
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

    return this.prisma.task.findMany({
      where,
      orderBy: [{ status: 'asc' }, { updatedAt: 'desc' }],
      include: this.taskDetails,
    });
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

    const task = await this.prisma.task.update({
      where: { id: taskId },
      data: {
        ...dto,
        dueDate:
          dto.dueDate === undefined
            ? undefined
            : dto.dueDate === null
              ? null
              : new Date(dto.dueDate),
      },
      include: this.taskDetails,
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

    return task;
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
  }

  private readonly taskDetails = {
    createdBy: { select: { id: true, name: true, email: true } },
    assignee: { select: { id: true, name: true, email: true } },
    _count: { select: { comments: true } },
  };

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
