import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApiKeyStatus,
  AssetStatus,
  ProjectStatus,
  UploadOutcome,
} from '../../common/enums';
import { ApiKey } from '../api-keys/entities/api-key.entity';
import { Asset } from '../assets/entities/asset.entity';
import { Project } from '../projects/entities/project.entity';
import { StorageService } from '../storage/storage.service';
import { UploadLog } from '../upload-logs/entities/upload-log.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    @InjectRepository(ApiKey)
    private readonly apiKeys: Repository<ApiKey>,
    @InjectRepository(Asset)
    private readonly assets: Repository<Asset>,
    @InjectRepository(UploadLog)
    private readonly uploadLogs: Repository<UploadLog>,
    private readonly storage: StorageService,
  ) {}

  async summary() {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [
      activeProjects,
      activeApiKeys,
      totalAssets,
      byteResult,
      uploads,
      recentAssets,
      disk,
    ] = await Promise.all([
      this.projects.count({ where: { status: ProjectStatus.ACTIVE } }),
      this.apiKeys.count({ where: { status: ApiKeyStatus.ACTIVE } }),
      this.assets.count({ where: { status: AssetStatus.READY } }),
      this.assets
        .createQueryBuilder('asset')
        .select(
          'COALESCE(SUM(asset.outputBytes + CASE WHEN asset.originalObjectKey IS NULL THEN 0 ELSE asset.originalBytes END), 0)',
          'storageBytes',
        )
        .getRawOne<{ storageBytes: string }>(),
      this.uploadLogs
        .createQueryBuilder('uploadLog')
        .select('uploadLog.outcome', 'outcome')
        .addSelect('COUNT(*)', 'count')
        .where('uploadLog.createdAt >= :since', { since })
        .groupBy('uploadLog.outcome')
        .getRawMany<{ outcome: UploadOutcome; count: string }>(),
      this.assets.find({
        relations: { project: true },
        order: { createdAt: 'DESC' },
        take: 10,
      }),
      this.storage.health(),
    ]);

    const successCount = Number(
      uploads.find((item) => item.outcome === UploadOutcome.SUCCESS)?.count ??
        0,
    );
    const failedCount = Number(
      uploads.find((item) => item.outcome === UploadOutcome.FAILED)?.count ?? 0,
    );
    const uploadTotal = successCount + failedCount;

    return {
      activeProjects,
      activeApiKeys,
      totalAssets,
      storageBytes: byteResult?.storageBytes ?? '0',
      uploadsLast30Days: {
        total: uploadTotal,
        success: successCount,
        failed: failedCount,
        successRate: uploadTotal
          ? Number(((successCount / uploadTotal) * 100).toFixed(2))
          : 100,
      },
      disk,
      recentAssets,
    };
  }
}
