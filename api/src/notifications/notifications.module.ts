import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { InvitesController, NotificationsController } from './notifications.controller';
import { InvitesService } from './invites.service';

@Module({
  imports: [PrismaModule],
  controllers: [NotificationsController, InvitesController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class NotificationsModule {}
