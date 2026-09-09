import { Controller, MessageEvent, Sse, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { EventsService } from './events.service';

@Controller('events')
@UseGuards(JwtGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Sse('stream')
  stream(@CurrentUser() user: AuthUser): Observable<MessageEvent> {
    return this.eventsService.streamForUser(user.id);
  }
}
