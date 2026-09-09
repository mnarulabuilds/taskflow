import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';

@Injectable()
export class SubtasksService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(projectId: string, taskId: string, currentUserId: string) {
    await this.assertTaskAccess(projectId, taskId, currentUserId);

    return this.prisma.taskSubtask.findMany({
      where: { taskId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(
    projectId: string,
    taskId: string,
    currentUserId: string,
    dto: CreateSubtaskDto,
  ) {
    await this.assertTaskAccess(projectId, taskId, currentUserId);

    let position = dto.position;
    if (position === undefined) {
      const maxPosition = await this.prisma.taskSubtask.aggregate({
        where: { taskId },
        _max: { position: true },
      });
      position = (maxPosition._max.position ?? -1) + 1;
    }

    return this.prisma.taskSubtask.create({
      data: {
        title: dto.title,
        completed: dto.completed ?? false,
        position,
        taskId,
      },
    });
  }

  async update(
    projectId: string,
    taskId: string,
    subtaskId: string,
    currentUserId: string,
    dto: UpdateSubtaskDto,
  ) {
    await this.assertTaskAccess(projectId, taskId, currentUserId);
    await this.getSubtaskInTask(taskId, subtaskId);

    return this.prisma.taskSubtask.update({
      where: { id: subtaskId },
      data: dto,
    });
  }

  async remove(
    projectId: string,
    taskId: string,
    subtaskId: string,
    currentUserId: string,
  ) {
    await this.assertTaskAccess(projectId, taskId, currentUserId);
    await this.getSubtaskInTask(taskId, subtaskId);

    await this.prisma.taskSubtask.delete({ where: { id: subtaskId } });

    return { success: true };
  }

  private async getSubtaskInTask(taskId: string, subtaskId: string) {
    const subtask = await this.prisma.taskSubtask.findFirst({
      where: { id: subtaskId, taskId },
    });

    if (!subtask) {
      throw new NotFoundException('Subtask not found.');
    }

    return subtask;
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
