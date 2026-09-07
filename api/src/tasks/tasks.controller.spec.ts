import { Test, TestingModule } from '@nestjs/testing';

import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

describe('TasksController', () => {
  let controller: TasksController;
  const service = {
    create: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };
  const user = { id: 'user-1', email: 'ada@example.com' };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TasksController],
      providers: [{ provide: TasksService, useValue: service }],
    }).compile();
    controller = module.get<TasksController>(TasksController);
  });

  it.each([
    [
      'create',
      () => controller.create('project-1', user, { title: 'Write tests' }),
      'create',
      ['project-1', user.id, { title: 'Write tests' }],
    ],
    [
      'find all',
      () => controller.findAll('project-1', user, {}),
      'findAll',
      ['project-1', user.id, {}],
    ],
    [
      'update',
      () =>
        controller.update('project-1', 'task-1', user, { title: 'Updated' }),
      'update',
      ['project-1', 'task-1', user.id, { title: 'Updated' }],
    ],
    [
      'delete',
      () => controller.remove('project-1', 'task-1', user),
      'remove',
      ['project-1', 'task-1', user.id],
    ],
  ] as const)(
    'delegates task %s requests',
    async (_name, request, method, args) => {
      service[method].mockResolvedValue({ id: 'task-1' });
      await request();
      expect(service[method]).toHaveBeenCalledWith(...args);
    },
  );
});
