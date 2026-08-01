import { ForbiddenException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    workspaceId: string,
    currentUserId: string,
    dto: CreateProjectDto,
  ) {
    await this.assertMembership(workspaceId, currentUserId);

    return this.prisma.project.create({
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
  }

  async findAll(workspaceId: string, currentUserId: string) {
    await this.assertMembership(workspaceId, currentUserId);

    return this.prisma.project.findMany({
      where: { workspaceId },
      orderBy: { updatedAt: 'desc' },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  private async assertMembership(workspaceId: string, userId: string) {
    const membership = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace.');
    }
  }
}
