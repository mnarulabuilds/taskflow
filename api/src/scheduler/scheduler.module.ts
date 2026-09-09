import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { DueSoonScheduler } from './due-soon.scheduler';

@Module({
  imports: [PrismaModule],
  providers: [DueSoonScheduler],
})
export class SchedulerModule {}
