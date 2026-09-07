import { ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../prisma/prisma.service';
import { ActivityService } from '../common/activity.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  let service: ProjectsService;
  const prisma = {
    workspaceMember: { findUnique: jest.fn() },
    project: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ActivityService, useValue: { log: jest.fn() } },
      ],
    }).compile();
    service = module.get<ProjectsService>(ProjectsService);
  });

  it('creates a project for a workspace member', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue({ id: 'membership-1' });
    prisma.project.create.mockResolvedValue({ id: 'project-1' });
    const dto = { name: 'Launch', description: 'Ship it' };

    await expect(service.create('workspace-1', 'user-1', dto)).resolves.toEqual(
      { id: 'project-1' },
    );
    expect(prisma.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { ...dto, workspaceId: 'workspace-1', createdById: 'user-1' },
      }),
    );
  });

  it('returns a project for a workspace member', async () => {
    prisma.project.findUnique.mockResolvedValue({
      id: 'project-1',
      workspaceId: 'workspace-1',
    });
    prisma.workspaceMember.findUnique.mockResolvedValue({ id: 'membership-1' });

    await expect(service.findOne('project-1', 'user-1')).resolves.toEqual(
      expect.objectContaining({
        id: 'project-1',
        workspaceId: 'workspace-1',
      }),
    );
  });

  it('lists projects for a workspace member', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue({ id: 'membership-1' });
    prisma.project.findMany.mockResolvedValue([]);
    await expect(service.findAll('workspace-1', 'user-1')).resolves.toEqual([]);
    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { workspaceId: 'workspace-1' } }),
    );
  });

  it.each(['create', 'findAll'] as const)(
    'rejects %s for a user outside the workspace',
    async (operation) => {
      prisma.workspaceMember.findUnique.mockResolvedValue(null);
      const result =
        operation === 'create'
          ? service.create('workspace-1', 'user-1', { name: 'Launch' })
          : service.findAll('workspace-1', 'user-1');
      await expect(result).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.project.create).not.toHaveBeenCalled();
      expect(prisma.project.findMany).not.toHaveBeenCalled();
    },
  );
});
