import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class UpdateSettingsDto {
  @ApiProperty({ type: 'object', additionalProperties: true })
  @IsObject()
  values: Record<string, unknown>;
}
