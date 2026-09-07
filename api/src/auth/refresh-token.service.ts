import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RefreshTokenService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, expiresInDays = 7) {
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = this.hash(rawToken);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    await this.prisma.refreshToken.create({
      data: { tokenHash, userId, expiresAt },
    });

    return rawToken;
  }

  async validate(rawToken: string) {
    const token = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: this.hash(rawToken) },
      include: { user: { select: { id: true, email: true } } },
    });

    if (!token || token.expiresAt < new Date()) {
      if (token) {
        await this.revoke(rawToken);
      }
      return null;
    }

    return token.user;
  }

  async rotate(rawToken: string) {
    const user = await this.validate(rawToken);
    if (!user) {
      return null;
    }

    await this.revoke(rawToken);
    const nextToken = await this.create(user.id);
    return { user, refreshToken: nextToken };
  }

  async revoke(rawToken: string) {
    await this.prisma.refreshToken.deleteMany({
      where: { tokenHash: this.hash(rawToken) },
    });
  }

  async revokeAllForUser(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
  }

  private hash(rawToken: string) {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
