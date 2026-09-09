import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtGuard } from '../auth/jwt/jwt.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { AddFavoriteDto } from './dto/add-favorite.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePasswordDto } from './dto/update-password.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get('me/profile')
  @UseGuards(JwtGuard)
  getProfile(@CurrentUser() user: AuthUser) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('me/profile')
  @UseGuards(JwtGuard)
  updateProfile(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('me/password')
  @UseGuards(JwtGuard)
  updatePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePasswordDto,
  ) {
    return this.usersService.updatePassword(user.id, dto);
  }

  @Get('me/preferences')
  @UseGuards(JwtGuard)
  getPreferences(@CurrentUser() user: AuthUser) {
    return this.usersService.getPreferences(user.id);
  }

  @Patch('me/preferences')
  @UseGuards(JwtGuard)
  updatePreferences(
    @CurrentUser() user: AuthUser,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.usersService.updatePreferences(user.id, dto);
  }

  @Get('me/favorites')
  @UseGuards(JwtGuard)
  getFavorites(@CurrentUser() user: AuthUser) {
    return this.usersService.getFavorites(user.id);
  }

  @Post('me/favorites')
  @UseGuards(JwtGuard)
  addFavorite(
    @CurrentUser() user: AuthUser,
    @Body() dto: AddFavoriteDto,
  ) {
    return this.usersService.addFavorite(user.id, dto.projectId);
  }

  @Delete('me/favorites/:projectId')
  @UseGuards(JwtGuard)
  removeFavorite(
    @CurrentUser() user: AuthUser,
    @Param('projectId') projectId: string,
  ) {
    return this.usersService.removeFavorite(user.id, projectId);
  }
}
