import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHello() {
    await this.prisma.$queryRaw`SELECT NOW()`;

    return {
      status: 'ok',
      service: 'TaskFlow API',
      timestamp: new Date().toISOString(),
    };
  }
}
