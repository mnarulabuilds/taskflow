import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ActivityType,
  WorkspaceMember,
  WorkspaceRole,
} from '@prisma/client';

import { ActivityService } from '../common/activity.service';
import { InvitesService } from '../notifications/invites.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly invitesService: InvitesService,
  ) {}

  async create(ownerId: string, name: string) {
    const workspace = await this.prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: { name, ownerId },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: created.id,
          userId: ownerId,
          role: WorkspaceRole.OWNER,
        },
      });

      return created;
    });

    await this.activityService.log({
      type: ActivityType.WORKSPACE_CREATED,
      workspaceId: workspace.id,
      userId: ownerId,
      metadata: { name },
    });

    return workspace;
  }

  async findOne(workspaceId: string, currentUserId: string) {
    await this.assertMembership(workspaceId, currentUserId);

    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { projects: true, members: true },
        },
      },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found.');
    }

    return workspace;
  }

  async update(workspaceId: string, currentUserId: string, name: string) {
    const member = await this.assertAdmin(workspaceId, currentUserId);

    if (member.role === WorkspaceRole.MEMBER) {
      throw new ForbiddenException('You do not have permission to edit this workspace.');
    }

    const workspace = await this.prisma.workspace.update({
      where: { id: workspaceId },
      data: { name },
    });

    await this.activityService.log({
      type: ActivityType.WORKSPACE_UPDATED,
      workspaceId,
      userId: currentUserId,
      metadata: { name },
    });

    return workspace;
  }

  async remove(workspaceId: string, currentUserId: string) {
    const member = await this.assertAdmin(workspaceId, currentUserId);

    if (member.role !== WorkspaceRole.OWNER) {
      throw new ForbiddenException('Only the workspace owner can delete it.');
    }

    await this.activityService.log({
      type: ActivityType.WORKSPACE_DELETED,
      workspaceId,
      userId: currentUserId,
      metadata: {},
    });

    await this.prisma.workspace.delete({ where: { id: workspaceId } });

    return { success: true };
  }

  async findMembers(workspaceId: string, currentUserId: string) {
    await this.assertMembership(workspaceId, currentUserId);

    return this.prisma.workspaceMember.findMany({
      where: { workspaceId },
      select: {
        id: true,
        role: true,
        createdAt: true,
        user: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        _count: {
          select: { projects: true, members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async addMember(
    workspaceId: string,
    currentUserId: string,
    dto: AddMemberDto,
  ): Promise<WorkspaceMember | { inviteSent: true; email: string }> {
    const currentMember = await this.assertAdmin(workspaceId, currentUserId);

    if (currentMember.role === WorkspaceRole.MEMBER) {
      throw new ForbiddenException(
        'You do not have permission to invite members.',
      );
    }

    if (
      dto.role === WorkspaceRole.OWNER ||
      (currentMember.role === WorkspaceRole.ADMIN &&
        dto.role === WorkspaceRole.ADMIN)
    ) {
      throw new ForbiddenException(
        'You do not have permission to assign this role.',
      );
    }

    const email = dto.email.toLowerCase();
    const invitedUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!invitedUser) {
      const existingInvite = await this.prisma.workspaceInvite.findUnique({
        where: {
          workspaceId_email: { workspaceId, email },
        },
      });

      if (existingInvite?.status === 'PENDING') {
        throw new ConflictException('An invite is already pending for this email.');
      }

      await this.invitesService.createInvite(
        workspaceId,
        currentUserId,
        email,
        dto.role,
      );

      return { inviteSent: true, email };
    }

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: invitedUser.id,
        },
      },
    });

    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this workspace.',
      );
    }

    const membership = await this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: invitedUser.id,
        role: dto.role,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    await this.activityService.log({
      type: ActivityType.MEMBER_JOINED,
      workspaceId,
      userId: currentUserId,
      metadata: { email, role: dto.role },
    });

    return membership;
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

    return membership;
  }

  private async assertAdmin(workspaceId: string, userId: string) {
    return this.assertMembership(workspaceId, userId);
  }
}
