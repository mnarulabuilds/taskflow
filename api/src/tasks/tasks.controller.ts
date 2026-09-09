import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { BulkDeleteTaskDto } from './dto/bulk-delete-task.dto';
import { BulkUpdateTaskDto } from './dto/bulk-update-task.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksService } from './tasks.service';

@Controller('projects/:projectId/tasks')
@UseGuards(JwtGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasksService.create(projectId, user.id, dto);
  }

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Query() query: QueryTaskDto,
  ) {
    return this.tasksService.findAll(projectId, user.id, query);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="tasks.csv"')
  exportCsv(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.exportCsv(projectId, user.id);
  }

  @Post('bulk')
  bulkUpdate(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkUpdateTaskDto,
  ) {
    return this.tasksService.bulkUpdate(projectId, user.id, dto);
  }

  @Delete('bulk')
  bulkDelete(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: BulkDeleteTaskDto,
  ) {
    return this.tasksService.bulkDelete(projectId, user.id, dto);
  }

  @Patch('reorder')
  reorder(
    @Param('projectId') projectId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: ReorderTasksDto,
  ) {
    return this.tasksService.reorderTasks(projectId, user.id, dto);
  }

  @Get(':taskId')
  findOne(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.findOne(projectId, taskId, user.id);
  }

  @Patch(':taskId')
  update(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasksService.update(projectId, taskId, user.id, dto);
  }

  @Delete(':taskId')
  remove(
    @Param('projectId') projectId: string,
    @Param('taskId') taskId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.tasksService.remove(projectId, taskId, user.id);
  }
}
