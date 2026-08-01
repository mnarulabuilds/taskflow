import { Test, TestingModule } from '@nestjs/testing';

import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

describe('ProjectsController', () => {
  let controller: ProjectsController;
  const service = { create: jest.fn(), findAll: jest.fn() };
  const user = { id: 'user-1', email: 'ada@example.com' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProjectsController],
      providers: [{ provide: ProjectsService, useValue: service }],
    }).compile();
    controller = module.get<ProjectsController>(ProjectsController);
  });

  it('creates projects within a workspace for the current user', async () => {
    const dto = { name: 'Launch', description: 'Ship it' };
    service.create.mockResolvedValue({ id: 'project-1' });
    await expect(controller.create('workspace-1', user, dto)).resolves.toEqual({
      id: 'project-1',
    });
    expect(service.create).toHaveBeenCalledWith('workspace-1', user.id, dto);
  });

  it('lists projects for a workspace and current user', async () => {
    service.findAll.mockResolvedValue([]);
    await expect(controller.findAll('workspace-1', user)).resolves.toEqual([]);
    expect(service.findAll).toHaveBeenCalledWith('workspace-1', user.id);
  });
});
