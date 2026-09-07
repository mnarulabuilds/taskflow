import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenService } from './refresh-token.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly refreshTokenService: RefreshTokenService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.validateCredentials(loginDto);
    const accessToken = await this.signAccessToken(user.id, user.email);
    const refreshToken = await this.refreshTokenService.create(user.id);

    return {
      accessToken,
      refreshToken,
      user: { id: user.id, email: user.email },
    };
  }

  async refresh(refreshToken: string) {
    const rotated = await this.refreshTokenService.rotate(refreshToken);

    if (!rotated) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const accessToken = await this.signAccessToken(
      rotated.user.id,
      rotated.user.email,
    );

    return {
      accessToken,
      refreshToken: rotated.refreshToken,
      user: rotated.user,
    };
  }

  async logout(refreshToken?: string, userId?: string) {
    if (refreshToken) {
      await this.refreshTokenService.revoke(refreshToken);
    }

    if (userId) {
      await this.refreshTokenService.revokeAllForUser(userId);
    }
  }

  private async validateCredentials(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !(await bcrypt.compare(loginDto.password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return user;
  }

  private signAccessToken(userId: string, email: string) {
    return this.jwtService.signAsync({ sub: userId, email });
  }
}
