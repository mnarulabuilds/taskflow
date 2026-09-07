import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { ActivityService } from './activity.service';
import { NotificationsService } from './notifications.service';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [ActivityService, NotificationsService],
  exports: [ActivityService, NotificationsService],
})
export class CommonModule {}
