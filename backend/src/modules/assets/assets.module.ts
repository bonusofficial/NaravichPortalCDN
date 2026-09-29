import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { diskStorage } from 'multer';
import { ApiKeysModule } from '../api-keys/api-keys.module';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { AuthModule } from '../auth/auth.module';
import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { ProjectsModule } from '../projects/projects.module';
import { SettingsModule } from '../settings/settings.module';
import { StorageModule } from '../storage/storage.module';
import { UploadLogsModule } from '../upload-logs/upload-logs.module';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { Asset } from './entities/asset.entity';
import { ImageProcessorService } from './image-processor.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Asset, ApiKey]),
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const destination = resolve(
          config.get<string>('TEMP_ROOT', './storage/.tmp'),
          'incoming',
        );
        mkdirSync(destination, { recursive: true });
        return {
          storage: diskStorage({
            destination,
            filename: (_request, _file, callback) =>
              callback(null, `${randomUUID()}.upload`),
          }),
          limits: {
            files: 1,
            fileSize: Number(config.get<string>('MAX_INPUT_BYTES', '25000000')),
          },
        };
      },
    }),
    AuthModule,
    ApiKeysModule,
    AuditLogsModule,
    ProjectsModule,
    SettingsModule,
    StorageModule,
    UploadLogsModule,
  ],
  controllers: [AssetsController],
  providers: [AssetsService, ImageProcessorService],
  exports: [AssetsService],
})
export class AssetsModule {}
