import { TaskStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class ReorderTaskItemDto {
  @IsString()
  id: string;

  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsInt()
  @Min(0)
  position: number;
}

export class ReorderTasksDto {
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => ReorderTaskItemDto)
  items: ReorderTaskItemDto[];
}
