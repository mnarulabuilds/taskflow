import { Controller, Get, Param, UseGuards } from '@nestjs/common';

import { JwtGuard } from '../auth/jwt/jwt.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthUser } from '../auth/types/auth-user.type';

import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(JwtGuard)
export class ProjectDetailController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get(':projectId')
  findOne(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.projectsService.findOne(projectId, user.id);
  }
}
