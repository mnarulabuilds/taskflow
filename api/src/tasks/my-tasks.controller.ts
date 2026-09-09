import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { QueryMyTaskDto } from './dto/query-my-task.dto';
import { TasksService } from './tasks.service';

@Controller('tasks/my')
@UseGuards(JwtGuard)
export class MyTasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  findMyTasks(@CurrentUser() user: AuthUser, @Query() query: QueryMyTaskDto) {
    return this.tasksService.findMyTasks(user.id, query);
  }
}
