import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from './jwt/jwt.guard';
import {
  clearAuthCookies,
  parseExpiresIn,
  REFRESH_COOKIE,
  setAccessCookie,
  setRefreshCookie,
} from './auth-cookie.util';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(loginDto);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);

    return { user: result.user };
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = request.cookies?.[REFRESH_COOKIE];

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const result = await this.authService.refresh(refreshToken);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);

    return { user: result.user };
  }

  @UseGuards(JwtGuard)
  @Post('logout')
  async logout(
    @Req() request: Request & { user?: { id: string } },
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(
      request.cookies?.[REFRESH_COOKIE],
      request.user?.id,
    );
    clearAuthCookies(res);
    return { success: true };
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@Req() request: Request & { user: { id: string; email: string } }) {
    return request.user;
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const accessExpiresIn = this.config.get<string>('JWT_EXPIRES_IN', '15m');
    const refreshExpiresIn = this.config.get<string>(
      'JWT_REFRESH_EXPIRES_IN',
      '7d',
    );

    setAccessCookie(res, accessToken, parseExpiresIn(accessExpiresIn));
    setRefreshCookie(res, refreshToken, parseExpiresIn(refreshExpiresIn));
  }
}
