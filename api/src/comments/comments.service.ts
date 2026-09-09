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

    await this.notifyMentions(
      dto.content,
      task.project.workspaceId,
      currentUserId,
      task.title,
      taskId,
      projectId,
      comment.id,
    );

    return comment;
  }

  private async notifyMentions(
    content: string,
    workspaceId: string,
    authorId: string,
    taskTitle: string,
    taskId: string,
    projectId: string,
    commentId: string,
  ) {
    const mentions = this.parseMentions(content);
    if (!mentions.length) {
      return;
    }

    const members = await this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            preferences: { select: { notifyMention: true } },
          },
        },
      },
    });

    const author = members.find((m) => m.userId === authorId)?.user;

    for (const member of members) {
      if (member.userId === authorId) {
        continue;
      }

      const matched = mentions.some((mention) => {
        const normalized = mention.toLowerCase();
        return (
          member.user.name.toLowerCase() === normalized ||
          member.user.email.toLowerCase() === normalized
        );
      });

      if (!matched) {
        continue;
      }

      if (member.user.preferences?.notifyMention === false) {
        continue;
      }

      await this.notificationsService.create(
        member.userId,
        NotificationType.TASK_MENTION,
        'You were mentioned in a comment',
        `${author?.name ?? 'Someone'} mentioned you on "${taskTitle}"`,
        { taskId, projectId, commentId },
      );
    }
  }

  private parseMentions(content: string): string[] {
    const mentions = new Set<string>();

    const emailRegex = /@([\w.+-]+@[\w.-]+\.\w+)/g;
    let match: RegExpExecArray | null;
    while ((match = emailRegex.exec(content)) !== null) {
      mentions.add(match[1]);
    }

    const stripped = content.replace(emailRegex, '');
    const usernameRegex = /@([\w.-]+)/g;
    while ((match = usernameRegex.exec(stripped)) !== null) {
      mentions.add(match[1]);
    }

    return Array.from(mentions);
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
