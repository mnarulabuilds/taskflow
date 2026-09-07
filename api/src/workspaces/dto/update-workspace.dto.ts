import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateWorkspaceDto {
  @IsString()
  @MinLength(2)
  name: string;
}
