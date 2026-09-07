import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType } from '@prisma/client';

import { ActivityService } from '../common/activity.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
  ) {}

  async create(
    workspaceId: string,
    currentUserId: string,
    dto: CreateProjectDto,
  ) {
    await this.assertMembership(workspaceId, currentUserId);

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        workspaceId,
        createdById: currentUserId,
      },
      include: {
        workspace: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });

    await this.activityService.log({
      type: ActivityType.PROJECT_CREATED,
      workspaceId,
      projectId: project.id,
      userId: currentUserId,
      metadata: { name: project.name },
    });

    return project;
  }

  async findOne(projectId: string, currentUserId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        id: true,
        name: true,
        description: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        workspace: { select: { id: true, name: true } },
        _count: { select: { tasks: true } },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found.');
    }

    await this.assertMembership(project.workspaceId, currentUserId);
    return project;
  }

  async findAll(workspaceId: string, currentUserId: string) {
    await this.assertMembership(workspaceId, currentUserId);

    return this.prisma.project.findMany({
      where: { workspaceId },
      select: {
        id: true,
        name: true,
        description: true,
        workspaceId: true,
        createdById: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { tasks: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    projectId: string,
    currentUserId: string,
    dto: UpdateProjectDto,
  ) {
    const project = await this.findOne(projectId, currentUserId);

    const updated = await this.prisma.project.update({
      where: { id: projectId },
      data: dto,
      select: {
        id: true,
        name: true,
        description: true,
        workspaceId: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { tasks: true } },
      },
    });

    await this.activityService.log({
      type: ActivityType.PROJECT_UPDATED,
      workspaceId: project.workspaceId,
      projectId,
      userId: currentUserId,
      metadata: { name: updated.name },
    });

    return updated;
  }

  async remove(projectId: string, currentUserId: string) {
    const project = await this.findOne(projectId, currentUserId);

    await this.activityService.log({
      type: ActivityType.PROJECT_DELETED,
      workspaceId: project.workspaceId,
      projectId,
      userId: currentUserId,
      metadata: { name: project.name },
    });

    await this.prisma.project.delete({ where: { id: projectId } });

    return { success: true };
  }

  private async assertMembership(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: { workspaceId, userId },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace.');
    }
  }
}
