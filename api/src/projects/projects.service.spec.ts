import { Test, TestingModule } from '@nestjs/testing';
import { ProjectsService } from './projects.service';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

describe('ProjectsService', () => {
  let service: ProjectsService;
  const prisma = {
    workspaceMember: { findUnique: jest.fn() },
    project: { findMany: jest.fn(), create: jest.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ProjectsService>(ProjectsService);
  });

  it('rejects listing projects for a user outside the workspace', async () => {
    prisma.workspaceMember.findUnique.mockResolvedValue(null);

    await expect(
      service.findAll('workspace-1', 'user-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.project.findMany).not.toHaveBeenCalled();
  });
});
