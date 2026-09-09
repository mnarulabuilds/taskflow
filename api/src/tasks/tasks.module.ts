import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { MyTasksController } from './my-tasks.controller';
import { SubtasksController } from './subtasks.controller';
import { SubtasksService } from './subtasks.service';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [TasksController, MyTasksController, SubtasksController],
  providers: [TasksService, SubtasksService],
})
export class TasksModule {}
