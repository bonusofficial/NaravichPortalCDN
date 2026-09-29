import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsDate,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateApiKeyDto {
  @ApiProperty({ example: 'Production website' })
  @IsString()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({ enum: ['live', 'test'], default: 'live' })
  @IsOptional()
  @IsIn(['live', 'test'])
  environment?: 'live' | 'test';

  @ApiProperty()
  @IsUUID()
  projectId: string;

  @ApiPropertyOptional({ example: ['image:upload'] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  scopes?: string[];

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  rateLimitPerMinute?: number;

  @ApiPropertyOptional({ type: [String], example: ['203.0.113.10'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipAllowlist?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  expiresAt?: Date;
}
