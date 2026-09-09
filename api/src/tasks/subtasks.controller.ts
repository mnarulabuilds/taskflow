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

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateSubtaskDto } from './dto/create-subtask.dto';
import { UpdateSubtaskDto } from './dto/update-subtask.dto';
import { SubtasksService } from './subtasks.service';

@Controller('projects/:projectId/tasks/:taskId/subtasks')
@UseGuards(JwtGuard)
export class SubtasksController {
  constructor(private readonly subtasksService: SubtasksService) {}

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.subtasksService.findAll(projectId, taskId, user.id);
  }

  @Post()
  create(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateSubtaskDto,
  ) {
    return this.subtasksService.create(projectId, taskId, user.id, dto);
  }

  @Patch(':subtaskId')
  update(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('subtaskId') subtaskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateSubtaskDto,
  ) {
    return this.subtasksService.update(
      projectId,
      taskId,
      subtaskId,
      user.id,
      dto,
    );
  }

  @Delete(':subtaskId')
  remove(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @Param('subtaskId') subtaskId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.subtasksService.remove(projectId, taskId, subtaskId, user.id);
  }
}
