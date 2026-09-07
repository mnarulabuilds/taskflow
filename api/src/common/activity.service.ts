import { Injectable } from '@nestjs/common';
import { ActivityType, Prisma } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';

interface LogActivityInput {
  type: ActivityType;
  workspaceId: string;
  userId: string;
  projectId?: string;
  taskId?: string;
  metadata?: Prisma.InputJsonValue;
}

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  log(input: LogActivityInput) {
    return this.prisma.activity.create({
      data: input,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
  }

  findForWorkspace(workspaceId: string, limit = 30) {
    return this.prisma.activity.findMany({
      where: { workspaceId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  findForProject(projectId: string, limit = 30) {
    return this.prisma.activity.findMany({
      where: { projectId },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
