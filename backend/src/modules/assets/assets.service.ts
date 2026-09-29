import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomUUID } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { Repository } from 'typeorm';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { AssetStatus, UploadOutcome } from '../../common/enums';
import { paginate } from '../../common/utils/pagination';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { Project } from '../projects/entities/project.entity';
import { SettingsService } from '../settings/settings.service';
import { StorageService } from '../storage/storage.service';
import { UploadLogsService } from '../upload-logs/upload-logs.service';
import { Asset } from './entities/asset.entity';
import { ImageProcessorService } from './image-processor.service';

interface UploadContext {
  project: Project;
  apiKey?: ApiKey | null;
  sourceIp?: string | null;
}

interface DeleteContext {
  actorUserId: string;
  ip?: string | null;
}

@Injectable()
export class AssetsService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(Asset)
    private readonly assets: Repository<Asset>,
    private readonly imageProcessor: ImageProcessorService,
    private readonly storage: StorageService,
    private readonly uploadLogs: UploadLogsService,
    private readonly auditLogs: AuditLogsService,
    private readonly settings: SettingsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.purgeExpiredTrash().catch(() => undefined);
    this.cleanupTimer = setInterval(
      () => void this.purgeExpiredTrash().catch(() => undefined),
      60 * 60 * 1000,
    );
    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) clearInterval(this.cleanupTimer);
  }

  async upload(file: Express.Multer.File, context: UploadContext) {
    const startedAt = Date.now();
    const requestId = randomUUID();
    let objectKey: string | null = null;
    let originalObjectKey: string | null = null;

    try {
      const disk = await this.storage.health();
      if (!disk.acceptsUploads) {
        throw new HttpException(
          {
            code: 'DISK_CAPACITY_CRITICAL',
            message: `Storage disk is ${disk.usedPercent}% full; uploads are paused at ${disk.stopUploadPercent}%`,
          },
          HttpStatus.INSUFFICIENT_STORAGE,
        );
      }

      if (file.size > context.project.maxInputBytes) {
        throw new HttpException(
          {
            code: 'PROJECT_INPUT_LIMIT_EXCEEDED',
            message: `File exceeds this project's ${context.project.maxInputBytes}-byte input limit`,
          },
          HttpStatus.PAYLOAD_TOO_LARGE,
        );
      }

      const storageSettings = await this.settings.getSection('storage', {
        retainOriginals: true,
      });
      const processingSettings = await this.settings.getSection('processing', {
        minQuality: 46,
        qualityStep: 8,
        stripMetadata: true,
      });
      const usedResult = await this.assets
        .createQueryBuilder('asset')
        .select(
          'COALESCE(SUM(asset.outputBytes + CASE WHEN asset.originalObjectKey IS NULL THEN 0 ELSE asset.originalBytes END), 0)',
          'usedBytes',
        )
        .where('asset.projectId = :projectId', {
          projectId: context.project.id,
        })
        .andWhere('asset.deletedAt IS NULL')
        .getRawOne<{ usedBytes: string }>();
      const usedBytes = BigInt(usedResult?.usedBytes ?? '0');
      if (
        usedBytes +
          BigInt(context.project.maxOutputBytes) +
          BigInt(storageSettings.retainOriginals ? file.size : 0) >
        BigInt(context.project.quotaBytes)
      ) {
        throw new HttpException(
          {
            code: 'PROJECT_QUOTA_EXCEEDED',
            message: 'Project storage quota is exhausted',
          },
          HttpStatus.INSUFFICIENT_STORAGE,
        );
      }

      const processed = await this.imageProcessor.process(file.path, {
        allowedFormats: context.project.allowedFormats,
        maxOutputBytes: context.project.maxOutputBytes,
        maxWidth: context.project.maxWidth,
        maxHeight: context.project.maxHeight,
        startingQuality: context.project.startingQuality,
        minQuality: processingSettings.minQuality,
        qualityStep: processingSettings.qualityStep,
      });

      const assetId = randomUUID();
      objectKey = this.storage.buildObjectKey(context.project.slug, assetId);
      if (storageSettings.retainOriginals) {
        originalObjectKey = this.storage.buildOriginalObjectKey(
          context.project.slug,
          assetId,
          processed.inputFormat === 'jpeg' ? 'jpg' : processed.inputFormat,
        );
        await this.storage.copyFrom(originalObjectKey, file.path);
      }
      await this.storage.write(objectKey, processed.data);

      const asset = await this.assets.save(
        this.assets.create({
          id: assetId,
          projectId: context.project.id,
          objectKey,
          publicUrl: this.storage.publicUrl(objectKey),
          originalObjectKey,
          originalName: file.originalname.slice(0, 255),
          inputMime: processed.inputMime,
          outputMime: 'image/webp',
          originalBytes: String(file.size),
          outputBytes: String(processed.size),
          originalWidth: processed.originalWidth,
          originalHeight: processed.originalHeight,
          width: processed.width,
          height: processed.height,
          quality: processed.quality,
          processingAttempts: processed.attempts,
          checksumSha256: createHash('sha256')
            .update(processed.data)
            .digest('hex'),
          requestId,
          status: AssetStatus.READY,
        }),
      );

      await this.uploadLogs.record({
        requestId,
        projectId: context.project.id,
        apiKeyId: context.apiKey?.id ?? null,
        outcome: UploadOutcome.SUCCESS,
        httpStatus: HttpStatus.CREATED,
        sourceIp: context.sourceIp ?? null,
        inputBytes: String(file.size),
        outputBytes: String(processed.size),
        durationMs: Date.now() - startedAt,
        errorCode: null,
        errorMessage: null,
        objectKey,
      });

      return {
        id: asset.id,
        requestId,
        status: asset.status,
        url: asset.publicUrl,
        objectKey: asset.objectKey,
        mimeType: asset.outputMime,
        width: asset.width,
        height: asset.height,
        originalBytes: Number(asset.originalBytes),
        outputBytes: Number(asset.outputBytes),
        originalWidth: asset.originalWidth,
        originalHeight: asset.originalHeight,
        checksumSha256: asset.checksumSha256,
        originalRetained: Boolean(asset.originalObjectKey),
        savedPercent:
          file.size === 0
            ? 0
            : Number(
                (((file.size - processed.size) / file.size) * 100).toFixed(2),
              ),
        processing: {
          format: 'webp',
          quality: processed.quality,
          attempts: processed.attempts,
        },
      };
    } catch (error: unknown) {
      if (objectKey) {
        await this.storage.remove(objectKey).catch(() => undefined);
      }
      if (originalObjectKey) {
        await this.storage.remove(originalObjectKey).catch(() => undefined);
      }
      const status =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
      const response =
        error instanceof HttpException ? error.getResponse() : undefined;
      const code =
        typeof response === 'object' && response && 'code' in response
          ? String(response.code)
          : 'IMAGE_UPLOAD_FAILED';
      const message =
        error instanceof Error ? error.message : 'Image upload failed';

      await this.uploadLogs
        .record({
          requestId,
          projectId: context.project.id,
          apiKeyId: context.apiKey?.id ?? null,
          outcome: UploadOutcome.FAILED,
          httpStatus: status,
          sourceIp: context.sourceIp ?? null,
          inputBytes: String(file.size),
          outputBytes: null,
          durationMs: Date.now() - startedAt,
          errorCode: code,
          errorMessage: message,
          objectKey: null,
        })
        .catch(() => undefined);
      throw error;
    } finally {
      await unlink(file.path).catch(() => undefined);
    }
  }

  async findAll(
    query: PageQueryDto,
    filters: { projectId?: string; search?: string; status?: AssetStatus },
  ) {
    const builder = this.assets
      .createQueryBuilder('asset')
      .leftJoinAndSelect('asset.project', 'project')
      .orderBy('asset.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (filters.projectId) {
      builder.andWhere('asset.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }
    if (filters.search) {
      builder.andWhere(
        '(asset.originalName LIKE :search OR asset.objectKey LIKE :search)',
        {
          search: `%${filters.search}%`,
        },
      );
    }
    if (filters.status) {
      builder.andWhere('asset.status = :status', { status: filters.status });
    }

    const [data, total] = await builder.getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string): Promise<Asset> {
    const asset = await this.assets.findOne({
      where: { id },
      relations: { project: true },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async trashSummary(): Promise<{ objects: number; bytes: number }> {
    const result = await this.assets
      .createQueryBuilder('asset')
      .withDeleted()
      .select('COUNT(*)', 'objects')
      .addSelect(
        'COALESCE(SUM(asset.outputBytes + CASE WHEN asset.originalObjectKey IS NULL THEN 0 ELSE asset.originalBytes END), 0)',
        'bytes',
      )
      .where('asset.deletedAt IS NOT NULL')
      .getRawOne<{ objects: string; bytes: string }>();
    return {
      objects: Number(result?.objects ?? 0),
      bytes: Number(result?.bytes ?? 0),
    };
  }

  async restore(id: string, context: DeleteContext): Promise<Asset> {
    const asset = await this.assets
      .createQueryBuilder('asset')
      .withDeleted()
      .leftJoinAndSelect('asset.project', 'project')
      .where('asset.id = :id', { id })
      .getOne();
    if (!asset || !asset.deletedAt)
      throw new NotFoundException('Deleted asset not found');

    let originalRestored = false;
    let outputRestored = false;
    let restored: Asset;
    try {
      if (asset.originalObjectKey) {
        await this.storage.restoreFromTrash(
          asset.originalObjectKey,
          asset.deletedAt,
        );
        originalRestored = true;
      }
      await this.storage.restoreFromTrash(asset.objectKey, asset.deletedAt);
      outputRestored = true;
      asset.status = AssetStatus.READY;
      restored = await this.assets.recover(asset);
    } catch (error) {
      if (outputRestored) {
        await this.storage
          .moveToTrash(asset.objectKey, asset.deletedAt)
          .catch(() => undefined);
      }
      if (originalRestored && asset.originalObjectKey) {
        await this.storage
          .moveToTrash(asset.originalObjectKey, asset.deletedAt)
          .catch(() => undefined);
      }
      throw error;
    }
    await this.auditLogs.record({
      actorUserId: context.actorUserId,
      action: 'asset.restored',
      resourceType: 'asset',
      resourceId: id,
      ip: context.ip,
      metadata: { objectKey: asset.objectKey, projectId: asset.projectId },
    });
    return restored;
  }

  async purgeTrash(
    context: DeleteContext,
  ): Promise<{ objects: number; bytes: number }> {
    const summary = await this.trashSummary();
    await this.storage.purgeTrash();
    await this.assets
      .createQueryBuilder()
      .delete()
      .from(Asset)
      .where('deleted_at IS NOT NULL')
      .execute();
    await this.auditLogs.record({
      actorUserId: context.actorUserId,
      action: 'trash.purged',
      resourceType: 'asset',
      ip: context.ip,
      metadata: summary,
    });
    return summary;
  }

  private async purgeExpiredTrash(): Promise<void> {
    const { trashRetentionDays } = await this.settings.getSection('storage', {
      trashRetentionDays: 30,
    });
    const cutoff = new Date(Date.now() - trashRetentionDays * 86_400_000);
    const expired = await this.assets
      .createQueryBuilder('asset')
      .withDeleted()
      .where('asset.deletedAt IS NOT NULL')
      .andWhere('asset.deletedAt < :cutoff', { cutoff })
      .getMany();

    for (const asset of expired) {
      if (asset.deletedAt) {
        await this.storage.removeFromTrash(asset.objectKey, asset.deletedAt);
        if (asset.originalObjectKey) {
          await this.storage.removeFromTrash(
            asset.originalObjectKey,
            asset.deletedAt,
          );
        }
        await this.assets.delete(asset.id);
      }
    }
  }

  async delete(id: string, context: DeleteContext): Promise<{ deleted: true }> {
    const asset = await this.findOne(id);
    const deletedAt = new Date();
    let outputMoved = false;
    let originalMoved = false;
    try {
      await this.storage.moveToTrash(asset.objectKey, deletedAt);
      outputMoved = true;
      if (asset.originalObjectKey) {
        await this.storage.moveToTrash(asset.originalObjectKey, deletedAt);
        originalMoved = true;
      }
      asset.status = AssetStatus.DELETED;
      await this.assets.softRemove(asset);
    } catch (error) {
      if (originalMoved && asset.originalObjectKey) {
        await this.storage
          .restoreFromTrash(asset.originalObjectKey, deletedAt)
          .catch(() => undefined);
      }
      if (outputMoved) {
        await this.storage
          .restoreFromTrash(asset.objectKey, deletedAt)
          .catch(() => undefined);
      }
      throw error;
    }
    await this.auditLogs.record({
      actorUserId: context.actorUserId,
      action: 'asset.deleted',
      resourceType: 'asset',
      resourceId: id,
      ip: context.ip,
      metadata: { objectKey: asset.objectKey, projectId: asset.projectId },
    });
    return { deleted: true };
  }

  async reprocess(id: string, context: DeleteContext): Promise<Asset> {
    const asset = await this.findOne(id);
    if (!asset.originalObjectKey) {
      throw new BadRequestException('This asset has no retained original');
    }
    const processed = await this.imageProcessor.process(
      this.storage.pathFor(asset.originalObjectKey),
      {
        allowedFormats: asset.project.allowedFormats,
        maxOutputBytes: asset.project.maxOutputBytes,
        maxWidth: asset.project.maxWidth,
        maxHeight: asset.project.maxHeight,
        startingQuality: asset.project.startingQuality,
        ...(await this.settings.getSection('processing', {
          minQuality: 46,
          qualityStep: 8,
          stripMetadata: true,
        })),
      },
    );
    await this.storage.write(asset.objectKey, processed.data);
    Object.assign(asset, {
      inputMime: processed.inputMime,
      outputBytes: String(processed.size),
      originalWidth: processed.originalWidth,
      originalHeight: processed.originalHeight,
      width: processed.width,
      height: processed.height,
      quality: processed.quality,
      processingAttempts: processed.attempts,
      checksumSha256: createHash('sha256').update(processed.data).digest('hex'),
      status: AssetStatus.READY,
    });
    const saved = await this.assets.save(asset);
    await this.auditLogs.record({
      actorUserId: context.actorUserId,
      action: 'asset.reprocessed',
      resourceType: 'asset',
      resourceId: id,
      ip: context.ip,
      metadata: { objectKey: asset.objectKey, projectId: asset.projectId },
    });
    return saved;
  }
}
