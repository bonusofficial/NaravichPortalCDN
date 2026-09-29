import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UploadLog } from './entities/upload-log.entity';
import { UploadLogsController } from './upload-logs.controller';
import { UploadLogsService } from './upload-logs.service';

@Module({
  imports: [TypeOrmModule.forFeature([UploadLog]), AuthModule],
  controllers: [UploadLogsController],
  providers: [UploadLogsService],
  exports: [UploadLogsService],
})
export class UploadLogsModule {}
