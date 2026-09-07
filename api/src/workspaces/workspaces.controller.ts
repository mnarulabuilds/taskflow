import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/jwt/jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ActivityService } from '../common/activity.service';

import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';

@Controller('workspaces')
@UseGuards(JwtGuard)
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly activityService: ActivityService,
  ) {}

  @Post()
  create(@Body() dto: CreateWorkspaceDto, @CurrentUser() user: AuthUser) {
    return this.workspacesService.create(user.id, dto.name);
  }

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.workspacesService.findAllForUser(user.id);
  }

  @Get(':workspaceId')
  findOne(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workspacesService.findOne(workspaceId, user.id);
  }

  @Patch(':workspaceId')
  update(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateWorkspaceDto,
  ) {
    return this.workspacesService.update(workspaceId, user.id, dto.name);
  }

  @Delete(':workspaceId')
  remove(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workspacesService.remove(workspaceId, user.id);
  }

  @Get(':workspaceId/members')
  findMembers(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workspacesService.findMembers(workspaceId, user.id);
  }

  @Post(':workspaceId/members')
  addMember(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: AddMemberDto,
  ) {
    return this.workspacesService.addMember(workspaceId, user.id, dto);
  }

  @Get(':workspaceId/activity')
  findActivity(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workspacesService.findOne(workspaceId, user.id).then(() =>
      this.activityService.findForWorkspace(workspaceId),
    );
  }
}
