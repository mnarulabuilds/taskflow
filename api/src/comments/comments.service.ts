import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, NotificationType } from '@prisma/client';

import { ActivityService } from '../common/activity.service';
import { NotificationsService } from '../common/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async findAll(projectId: string, taskId: string, currentUserId: string) {
    await this.assertTaskAccess(projectId, taskId, currentUserId);

    return this.prisma.taskComment.findMany({
      where: { taskId },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(
    projectId: string,
    taskId: string,
    currentUserId: string,
    dto: CreateCommentDto,
  ) {
    const task = await this.assertTaskAccess(projectId, taskId, currentUserId);

    const comment = await this.prisma.taskComment.create({
      data: {
        content: dto.content.trim(),
        taskId,
        authorId: currentUserId,
      },
      include: {
        author: { select: { id: true, name: true, email: true } },
      },
    });

    await this.activityService.log({
      type: ActivityType.COMMENT_ADDED,
      workspaceId: task.project.workspaceId,
      projectId,
      taskId,
      userId: currentUserId,
      metadata: {
        taskTitle: task.title,
        commentPreview: dto.content.trim().slice(0, 120),
      },
    });

    if (task.assigneeId && task.assigneeId !== currentUserId) {
      await this.notificationsService.create(
        task.assigneeId,
        NotificationType.TASK_COMMENT,
        'New comment on your task',
        `${comment.author.name} commented on "${task.title}"`,
        { taskId, projectId, commentId: comment.id },
      );
    }

    return comment;
  }

  private async assertTaskAccess(
    projectId: string,
    taskId: string,
    userId: string,
  ) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
      include: {
        project: { select: { workspaceId: true } },
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: task.project.workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace.');
    }

    return task;
  }
}
