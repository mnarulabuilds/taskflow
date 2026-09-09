import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class BulkDeleteTaskDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  ids: string[];
}
