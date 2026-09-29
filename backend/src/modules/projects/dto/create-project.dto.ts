import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { ProjectStatus } from '../../../common/enums';

export class CreateProjectDto {
  @ApiProperty({ example: 'Naravich Main Website' })
  @IsString()
  @MaxLength(160)
  name: string;

  @ApiProperty({ example: 'naravich-main' })
  @IsString()
  @MaxLength(120)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'www.example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(253)
  domain?: string;

  @ApiPropertyOptional({ enum: ProjectStatus, default: ProjectStatus.ACTIVE })
  @IsOptional()
  @IsEnum(ProjectStatus)
  status?: ProjectStatus;

  @ApiPropertyOptional({
    example: '107374182400',
    description: 'Quota in bytes',
  })
  @IsOptional()
  @IsNumberString({ no_symbols: true })
  quotaBytes?: string;

  @ApiPropertyOptional({ example: ['jpeg', 'png', 'webp'] })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  allowedFormats?: string[];

  @ApiPropertyOptional({ default: 25000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100000)
  maxInputBytes?: number;

  @ApiPropertyOptional({ default: 5000000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100000)
  @Max(5000000)
  maxOutputBytes?: number;

  @ApiPropertyOptional({ default: 82 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(30)
  @Max(100)
  startingQuality?: number;

  @ApiPropertyOptional({ default: 4096 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(320)
  @Max(20000)
  maxWidth?: number;

  @ApiPropertyOptional({ default: 4096 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(320)
  @Max(20000)
  maxHeight?: number;
}
