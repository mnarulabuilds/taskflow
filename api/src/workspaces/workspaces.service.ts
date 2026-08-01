import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddMemberDto } from './dto/add-member.dto';
import { WorkspaceMember, WorkspaceRole } from '@prisma/client';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) { }

  create(ownerId: string, name: string) {
    return this.prisma.$transaction(async (tx) => {
      const workspace = await tx.workspace.create({
        data: {
          name,
          ownerId,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: ownerId,
          role: 'OWNER',
        },
      });

      return workspace;
    });
  }

  findAllForUser(userId: string) {
    return this.prisma.workspace.findMany({
      where: {
        members: {
          some: {
            userId,
          },
        },
      },
      select: {
        id: true,
        name: true,
        ownerId: true,
        createdAt: true,
        _count: {
          select: {
            projects: true,
            members: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async addMember(
    workspaceId: string,
    currentUserId: string,
    dto: AddMemberDto,
  ): Promise<WorkspaceMember> {
    // 1. Verify current user is a member of the workspace
    const currentMember = await this.prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId,
          userId: currentUserId,
        },
      },
    });

    if (!currentMember) {
      throw new ForbiddenException('You are not a member of this workspace.');
    }

    // 2. Check permissions
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

    // 3. Find the invited user
    const invitedUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (!invitedUser) {
      throw new NotFoundException('User not found.');
    }

    // 4. Check if already a member
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

    // 5. Create membership
    return this.prisma.workspaceMember.create({
      data: {
        workspaceId,
        userId: invitedUser.id,
        role: dto.role,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}
