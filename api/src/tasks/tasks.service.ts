import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, currentUserId: string, dto: CreateTaskDto) {
    const project = await this.assertProjectMembership(
      projectId,
      currentUserId,
    );
    await this.assertValidAssignee(project.workspaceId, dto.assigneeId);

    return this.prisma.task.create({
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
  }

  async findAll(projectId: string, currentUserId: string) {
    await this.assertProjectMembership(projectId, currentUserId);

    return this.prisma.task.findMany({
      where: { projectId },
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
    await this.assertTaskInProject(projectId, taskId);

    if (dto.assigneeId !== undefined) {
      await this.assertValidAssignee(project.workspaceId, dto.assigneeId);
    }

    return this.prisma.task.update({
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
  }

  async remove(projectId: string, taskId: string, currentUserId: string) {
    await this.assertProjectMembership(projectId, currentUserId);
    await this.assertTaskInProject(projectId, taskId);

    await this.prisma.task.delete({ where: { id: taskId } });
  }

  private readonly taskDetails = {
    createdBy: { select: { id: true, name: true, email: true } },
    assignee: { select: { id: true, name: true, email: true } },
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

  private async assertTaskInProject(projectId: string, taskId: string) {
    const task = await this.prisma.task.findFirst({
      where: { id: taskId, projectId },
      select: { id: true },
    });

    if (!task) {
      throw new NotFoundException('Task not found.');
    }
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
