import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/jwt/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';
import { ActivityService } from '../common/activity.service';

import { ProjectsService } from './projects.service';
import { UpdateProjectDto } from './dto/update-project.dto';

@Controller('projects')
@UseGuards(JwtGuard)
export class ProjectDetailController {
  constructor(
    private readonly projectsService: ProjectsService,
    private readonly activityService: ActivityService,
  ) {}

  @Get(':projectId')
  findOne(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.findOne(projectId, user.id);
  }

  @Patch(':projectId')
  update(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProjectDto,
  ) {
    return this.projectsService.update(projectId, user.id, dto);
  }

  @Delete(':projectId')
  remove(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.remove(projectId, user.id);
  }

  @Get(':projectId/activity')
  findActivity(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.findOne(projectId, user.id).then(() =>
      this.activityService.findForProject(projectId),
    );
  }
}
