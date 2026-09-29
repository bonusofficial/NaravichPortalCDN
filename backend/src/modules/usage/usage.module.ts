import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Asset } from '../assets/entities/asset.entity';
import { UploadLog } from '../upload-logs/entities/upload-log.entity';
import { UsageController } from './usage.controller';
import { UsageService } from './usage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Asset, UploadLog]), AuthModule],
  controllers: [UsageController],
  providers: [UsageService],
})
export class UsageModule {}
