import {
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { NotificationsService } from '../common/notifications.service';
import { InvitesService } from './invites.service';

@Controller('notifications')
@UseGuards(JwtGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthUser) {
    return this.notificationsService.findForUser(user.id);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() user: AuthUser) {
    return this.notificationsService.unreadCount(user.id);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id);
  }

  @Patch(':notificationId/read')
  markRead(
    @Param('notificationId') notificationId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.notificationsService.markRead(notificationId, user.id);
  }
}

@Controller('invites')
@UseGuards(JwtGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Get('pending')
  findPending(@CurrentUser() user: AuthUser) {
    return this.invitesService.findPendingForUser(user.id);
  }

  @Post(':token/accept')
  accept(@Param('token') token: string, @CurrentUser() user: AuthUser) {
    return this.invitesService.accept(token, user.id);
  }

  @Post(':token/decline')
  decline(@Param('token') token: string, @CurrentUser() user: AuthUser) {
    return this.invitesService.decline(token, user.id);
  }
}
