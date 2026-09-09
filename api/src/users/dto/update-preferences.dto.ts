import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  @MaxLength(20)
  theme?: string;

  @IsOptional()
  @IsBoolean()
  notifyTaskAssigned?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyTaskComment?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyDueSoon?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyInvite?: boolean;

  @IsOptional()
  @IsBoolean()
  notifyMention?: boolean;

  @IsOptional()
  @IsBoolean()
  onboardingCompleted?: boolean;
}
