import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtGuard } from './jwt/jwt.guard';
import {
  clearAuthCookie,
  parseExpiresIn,
  setAuthCookie,
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
    const expiresIn = this.config.get<string>('JWT_EXPIRES_IN', '15m');

    setAuthCookie(res, result.accessToken, parseExpiresIn(expiresIn));

    return { user: result.user };
  }

  @UseGuards(JwtGuard)
  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    clearAuthCookie(res);
    return { success: true };
  }

  @UseGuards(JwtGuard)
  @Get('me')
  me(@Req() request: Request & { user: { id: string; email: string } }) {
    return request.user;
  }
}
