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
import { LabelsService } from './labels.service';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { AddMemberDto } from './dto/add-member.dto';
import { UpdateWorkspaceDto } from './dto/update-workspace.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { CreateLabelDto } from './dto/create-label.dto';
import { UpdateLabelDto } from './dto/update-label.dto';

@Controller('workspaces')
@UseGuards(JwtGuard)
export class WorkspacesController {
  constructor(
    private readonly workspacesService: WorkspacesService,
    private readonly labelsService: LabelsService,
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

  @Patch(':workspaceId/members/:memberId')
  updateMemberRole(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.workspacesService.updateMemberRole(
      workspaceId,
      memberId,
      user.id,
      dto.role,
    );
  }

  @Delete(':workspaceId/members/:memberId')
  removeMember(
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.workspacesService.removeMember(
      workspaceId,
      memberId,
      user.id,
    );
  }

  @Get(':workspaceId/labels')
  findLabels(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.labelsService.findAll(workspaceId, user.id);
  }

  @Post(':workspaceId/labels')
  createLabel(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateLabelDto,
  ) {
    return this.labelsService.create(workspaceId, user.id, dto);
  }

  @Patch(':workspaceId/labels/:labelId')
  updateLabel(
    @Param('workspaceId') workspaceId: string,
    @Param('labelId') labelId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateLabelDto,
  ) {
    return this.labelsService.update(workspaceId, labelId, user.id, dto);
  }

  @Delete(':workspaceId/labels/:labelId')
  removeLabel(
    @Param('workspaceId') workspaceId: string,
    @Param('labelId') labelId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.labelsService.remove(workspaceId, labelId, user.id);
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
