import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';
import { WorkspacesService } from './workspaces.service';

@Injectable()
export class LabelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async findAll(workspaceId: string, currentUserId: string) {
    await this.workspacesService.assertMembership(workspaceId, currentUserId);

    return this.prisma.label.findMany({
      where: { workspaceId },
      orderBy: { name: 'asc' },
    });
  }

  async create(
    workspaceId: string,
    currentUserId: string,
    dto: CreateLabelDto,
  ) {
    await this.workspacesService.assertCanEditProject(
      workspaceId,
      currentUserId,
    );

    try {
      return await this.prisma.label.create({
        data: {
          name: dto.name,
          color: dto.color,
          workspaceId,
        },
      });
    } catch {
      throw new ConflictException('A label with this name already exists.');
    }
  }

  async update(
    workspaceId: string,
    labelId: string,
    currentUserId: string,
    dto: UpdateLabelDto,
  ) {
    await this.workspacesService.assertCanEditProject(
      workspaceId,
      currentUserId,
    );
    await this.getLabelInWorkspace(workspaceId, labelId);

    try {
      return await this.prisma.label.update({
        where: { id: labelId },
        data: dto,
      });
    } catch {
      throw new ConflictException('A label with this name already exists.');
    }
  }

  async remove(workspaceId: string, labelId: string, currentUserId: string) {
    await this.workspacesService.assertCanEditProject(
      workspaceId,
      currentUserId,
    );
    await this.getLabelInWorkspace(workspaceId, labelId);

    await this.prisma.label.delete({ where: { id: labelId } });

    return { success: true };
  }

  async assertLabelsInWorkspace(workspaceId: string, labelIds: string[]) {
    if (!labelIds.length) {
      return;
    }

    const labels = await this.prisma.label.findMany({
      where: { id: { in: labelIds }, workspaceId },
      select: { id: true },
    });

    if (labels.length !== labelIds.length) {
      throw new ForbiddenException(
        'One or more labels do not belong to this workspace.',
      );
    }
  }

  private async getLabelInWorkspace(workspaceId: string, labelId: string) {
    const label = await this.prisma.label.findFirst({
      where: { id: labelId, workspaceId },
    });

    if (!label) {
      throw new NotFoundException('Label not found.');
    }

    return label;
  }
}
