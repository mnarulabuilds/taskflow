import { Injectable, MessageEvent } from '@nestjs/common';
import { Observable, Subject, merge, interval, map } from 'rxjs';

export interface AppEvent {
  type: 'task_updated' | 'task_created' | 'task_deleted' | 'notification';
  projectId?: string;
  workspaceId?: string;
}

@Injectable()
export class EventsService {
  private readonly userStreams = new Map<string, Subject<AppEvent>>();

  streamForUser(userId: string): Observable<MessageEvent> {
    const subject = this.getOrCreateStream(userId);

    const heartbeat = interval(30_000).pipe(
      map(() => ({ data: { type: 'ping' } })),
    );

    const events = subject.pipe(map((event) => ({ data: event })));

    return merge(heartbeat, events);
  }

  emitToUsers(userIds: string[], event: AppEvent) {
    for (const userId of userIds) {
      this.getOrCreateStream(userId).next(event);
    }
  }

  private getOrCreateStream(userId: string) {
    let stream = this.userStreams.get(userId);
    if (!stream) {
      stream = new Subject<AppEvent>();
      this.userStreams.set(userId, stream);
    }
    return stream;
  }
}
