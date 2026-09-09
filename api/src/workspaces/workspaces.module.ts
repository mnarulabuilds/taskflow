import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { LabelsService } from './labels.service';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [WorkspacesController],
  providers: [WorkspacesService, LabelsService],
  exports: [WorkspacesService, LabelsService],
})
export class WorkspacesModule {}
