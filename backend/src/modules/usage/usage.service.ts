import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from '../assets/entities/asset.entity';
import { UploadLog } from '../upload-logs/entities/upload-log.entity';

@Injectable()
export class UsageService {
  constructor(
    @InjectRepository(Asset)
    private readonly assets: Repository<Asset>,
    @InjectRepository(UploadLog)
    private readonly uploadLogs: Repository<UploadLog>,
  ) {}

  async get(days: number) {
    const safeDays = Math.min(Math.max(days, 1), 365);
    const since = new Date(Date.now() - safeDays * 24 * 60 * 60 * 1000);
    const projectSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [daily, assetDaily, projects, projectUploads] = await Promise.all([
      this.uploadLogs
        .createQueryBuilder('log')
        .select('DATE(log.createdAt)', 'date')
        .addSelect('log.projectId', 'projectId')
        .addSelect('COUNT(*)', 'requests')
        .addSelect(
          "SUM(CASE WHEN log.outcome = 'success' THEN 1 ELSE 0 END)",
          'success',
        )
        .addSelect(
          "SUM(CASE WHEN log.outcome = 'failed' AND log.httpStatus < 500 THEN 1 ELSE 0 END)",
          'rejected',
        )
        .addSelect(
          "SUM(CASE WHEN log.outcome = 'failed' AND log.httpStatus >= 500 THEN 1 ELSE 0 END)",
          'failed',
        )
        .addSelect('COALESCE(SUM(log.inputBytes), 0)', 'inputBytes')
        .addSelect('COALESCE(SUM(log.outputBytes), 0)', 'outputBytes')
        .addSelect('COALESCE(AVG(log.durationMs), 0)', 'averageDurationMs')
        .addSelect('COALESCE(MAX(log.durationMs), 0)', 'maxDurationMs')
        .where('log.createdAt >= :since', { since })
        .groupBy('DATE(log.createdAt), log.projectId')
        .orderBy('DATE(log.createdAt)', 'ASC')
        .getRawMany<{
          date: string;
          projectId: string | null;
          requests: string;
          success: string;
          rejected: string;
          failed: string;
          inputBytes: string;
          outputBytes: string;
          averageDurationMs: string;
          maxDurationMs: string;
        }>(),
      this.assets
        .createQueryBuilder('asset')
        .select('DATE(asset.createdAt)', 'date')
        .addSelect('asset.projectId', 'projectId')
        .addSelect('COUNT(*)', 'assets')
        .addSelect(
          'COALESCE(SUM(asset.outputBytes + CASE WHEN asset.originalObjectKey IS NULL THEN 0 ELSE asset.originalBytes END), 0)',
          'storageBytes',
        )
        .where('asset.createdAt >= :since', { since })
        .groupBy('DATE(asset.createdAt), asset.projectId')
        .orderBy('DATE(asset.createdAt)', 'ASC')
        .getRawMany<{
          date: string;
          projectId: string;
          assets: string;
          storageBytes: string;
        }>(),
      this.assets
        .createQueryBuilder('asset')
        .innerJoin('asset.project', 'project')
        .select('project.id', 'projectId')
        .addSelect('project.name', 'projectName')
        .addSelect('project.slug', 'projectSlug')
        .addSelect('project.quotaBytes', 'quotaBytes')
        .addSelect('COUNT(asset.id)', 'assets')
        .addSelect(
          'COALESCE(SUM(asset.outputBytes + CASE WHEN asset.originalObjectKey IS NULL THEN 0 ELSE asset.originalBytes END), 0)',
          'storageBytes',
        )
        .groupBy('project.id')
        .addGroupBy('project.name')
        .addGroupBy('project.slug')
        .addGroupBy('project.quotaBytes')
        .orderBy('storageBytes', 'DESC')
        .getRawMany<{
          projectId: string;
          projectName: string;
          projectSlug: string;
          quotaBytes: string;
          assets: string;
          storageBytes: string;
        }>(),
      this.uploadLogs
        .createQueryBuilder('log')
        .select('log.projectId', 'projectId')
        .addSelect('COUNT(*)', 'requests30d')
        .addSelect(
          "SUM(CASE WHEN log.outcome = 'failed' THEN 1 ELSE 0 END)",
          'failed30d',
        )
        .where('log.createdAt >= :projectSince', { projectSince })
        .andWhere('log.projectId IS NOT NULL')
        .groupBy('log.projectId')
        .getRawMany<{
          projectId: string;
          requests30d: string;
          failed30d: string;
        }>(),
    ]);

    const uploadsByProject = new Map(
      projectUploads.map((item) => [item.projectId, item]),
    );

    return {
      generatedAt: new Date().toISOString(),
      days: safeDays,
      daily,
      assetDaily,
      projects: projects.map((project) => ({
        ...project,
        requests30d:
          uploadsByProject.get(project.projectId)?.requests30d ?? '0',
        failed30d: uploadsByProject.get(project.projectId)?.failed30d ?? '0',
      })),
    };
  }
}
