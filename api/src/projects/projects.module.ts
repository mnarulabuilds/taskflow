import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';
import { ProjectDetailController } from './project-detail.controller';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';

@Module({
  imports: [PrismaModule, WorkspacesModule],
  controllers: [ProjectsController, ProjectDetailController],
  providers: [ProjectsService],
})
export class ProjectsModule {}
