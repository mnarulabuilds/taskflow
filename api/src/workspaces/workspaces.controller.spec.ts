import { WorkspaceRole } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';

import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { LabelsService } from './labels.service';
import { ActivityService } from '../common/activity.service';

describe('WorkspacesController', () => {
  let controller: WorkspacesController;
  const service = {
    create: jest.fn(),
    findAllForUser: jest.fn(),
    findMembers: jest.fn(),
    addMember: jest.fn(),
  };
  const user = { id: 'user-1', email: 'ada@example.com' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorkspacesController],
      providers: [
        { provide: WorkspacesService, useValue: service },
        { provide: LabelsService, useValue: {} },
        { provide: ActivityService, useValue: { findForWorkspace: jest.fn() } },
      ],
    }).compile();
    controller = module.get<WorkspacesController>(WorkspacesController);
  });

  it('forwards workspace creation with the current user id', async () => {
    service.create.mockResolvedValue({ id: 'workspace-1' });
    await expect(
      controller.create({ name: 'Engineering' }, user),
    ).resolves.toEqual({ id: 'workspace-1' });
    expect(service.create).toHaveBeenCalledWith(user.id, 'Engineering');
  });

  it('lists the current user workspaces', async () => {
    service.findAllForUser.mockResolvedValue([]);
    await expect(controller.findAll(user)).resolves.toEqual([]);
    expect(service.findAllForUser).toHaveBeenCalledWith(user.id);
  });

  it('lists workspace members', async () => {
    service.findMembers.mockResolvedValue([]);
    await expect(controller.findMembers('workspace-1', user)).resolves.toEqual(
      [],
    );
    expect(service.findMembers).toHaveBeenCalledWith('workspace-1', user.id);
  });

  it('forwards member invitations', async () => {
    const dto = { email: 'grace@example.com', role: WorkspaceRole.MEMBER };
    service.addMember.mockResolvedValue({ id: 'membership-1' });
    await expect(
      controller.addMember('workspace-1', user, dto),
    ).resolves.toEqual({ id: 'membership-1' });
    expect(service.addMember).toHaveBeenCalledWith('workspace-1', user.id, dto);
  });
});
