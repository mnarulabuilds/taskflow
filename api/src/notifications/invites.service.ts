import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActivityType, NotificationType, WorkspaceRole } from '@prisma/client';

import { ActivityService } from '../common/activity.service';
import { NotificationsService } from '../common/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activityService: ActivityService,
    private readonly notificationsService: NotificationsService,
  ) {}

  findPendingForUser(userId: string) {
    return this.prisma.user.findUnique({ where: { id: userId } }).then((user) => {
      if (!user) {
        return [];
      }

      return this.prisma.workspaceInvite.findMany({
        where: {
          email: user.email,
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        include: {
          workspace: { select: { id: true, name: true } },
          invitedBy: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  async accept(token: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
    });

    if (!invite || invite.status !== 'PENDING') {
      throw new NotFoundException('Invite not found or already used.');
    }

    if (invite.expiresAt < new Date()) {
      throw new ConflictException('Invite has expired.');
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('This invite is for a different email.');
    }

    const existingMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: invite.workspaceId,
          userId,
        },
      },
    });

    if (existingMember) {
      await this.prisma.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });
      throw new ConflictException('You are already a member of this workspace.');
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      await tx.workspaceInvite.update({
        where: { id: invite.id },
        data: { status: 'ACCEPTED' },
      });

      return tx.workspaceMember.create({
        data: {
          workspaceId: invite.workspaceId,
          userId,
          role: invite.role,
        },
        include: {
          workspace: { select: { id: true, name: true } },
        },
      });
    });

    await this.activityService.log({
      type: ActivityType.MEMBER_JOINED,
      workspaceId: invite.workspaceId,
      userId,
      metadata: { email: user.email, role: invite.role },
    });

    return membership;
  }

  async decline(token: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found.');
    }

    const invite = await this.prisma.workspaceInvite.findUnique({
      where: { token },
    });

    if (!invite || invite.status !== 'PENDING') {
      throw new NotFoundException('Invite not found or already used.');
    }

    if (invite.email.toLowerCase() !== user.email.toLowerCase()) {
      throw new ForbiddenException('This invite is for a different email.');
    }

    await this.prisma.workspaceInvite.update({
      where: { id: invite.id },
      data: { status: 'DECLINED' },
    });

    return { success: true };
  }

  async createInvite(
    workspaceId: string,
    invitedById: string,
    email: string,
    role: WorkspaceRole,
  ) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invite = await this.prisma.workspaceInvite.create({
      data: {
        workspaceId,
        email: email.toLowerCase(),
        role,
        invitedById,
        expiresAt,
      },
      include: {
        workspace: { select: { id: true, name: true } },
      },
    });

    await this.activityService.log({
      type: ActivityType.MEMBER_INVITED,
      workspaceId,
      userId: invitedById,
      metadata: { email, role },
    });

    const invitedUser = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (invitedUser) {
      await this.notificationsService.create(
        invitedUser.id,
        NotificationType.WORKSPACE_INVITE,
        'Workspace invitation',
        `You were invited to join "${invite.workspace.name}"`,
        { inviteToken: invite.token, workspaceId },
      );
    }

    return invite;
  }
}
