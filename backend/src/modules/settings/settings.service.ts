import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { SystemSetting } from './entities/system-setting.entity';

const EDITABLE = {
  general: ['workspaceName', 'timeZone', 'supportEmail', 'notFoundResponse'],
  storage: ['trashRetentionDays', 'pathPattern', 'retainOriginals'],
  processing: ['minQuality', 'qualityStep', 'stripMetadata'],
  security: ['defaultKeyExpiryDays', 'defaultRateLimit'],
} as const;

type Section = keyof typeof EDITABLE;

const isIntegerWithin = (value: unknown, min: number, max: number) =>
  Number.isInteger(value) && Number(value) >= min && Number(value) <= max;

function validate(section: Section, values: Record<string, unknown>): void {
  const invalid = (message: string): never => {
    throw new BadRequestException(message);
  };

  if (section === 'general') {
    if (
      values.workspaceName !== undefined &&
      (typeof values.workspaceName !== 'string' ||
        values.workspaceName.trim().length < 3 ||
        values.workspaceName.length > 120)
    )
      invalid('workspaceName must contain 3 to 120 characters');
    if (
      values.timeZone !== undefined &&
      (typeof values.timeZone !== 'string' ||
        !['Asia/Bangkok', 'Asia/Singapore', 'UTC'].includes(values.timeZone))
    )
      invalid('Unsupported timeZone');
    if (
      values.supportEmail !== undefined &&
      (typeof values.supportEmail !== 'string' ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.supportEmail))
    )
      invalid('supportEmail must be a valid email address');
    if (
      values.notFoundResponse !== undefined &&
      (typeof values.notFoundResponse !== 'string' ||
        !['empty', 'branded'].includes(values.notFoundResponse))
    )
      invalid('notFoundResponse must be empty or branded');
  }

  if (section === 'storage') {
    if (
      values.trashRetentionDays !== undefined &&
      !isIntegerWithin(values.trashRetentionDays, 1, 365)
    )
      invalid('trashRetentionDays must be between 1 and 365');
    if (
      values.pathPattern !== undefined &&
      (typeof values.pathPattern !== 'string' ||
        values.pathPattern.length < 3 ||
        values.pathPattern.length > 200)
    )
      invalid('pathPattern must contain 3 to 200 characters');
    if (
      values.retainOriginals !== undefined &&
      typeof values.retainOriginals !== 'boolean'
    )
      invalid('retainOriginals must be a boolean');
  }

  if (section === 'processing') {
    if (
      values.minQuality !== undefined &&
      !isIntegerWithin(values.minQuality, 30, 95)
    )
      invalid('minQuality must be between 30 and 95');
    if (
      values.qualityStep !== undefined &&
      !isIntegerWithin(values.qualityStep, 1, 20)
    )
      invalid('qualityStep must be between 1 and 20');
    if (
      values.stripMetadata !== undefined &&
      typeof values.stripMetadata !== 'boolean'
    )
      invalid('stripMetadata must be a boolean');
  }

  if (section === 'security') {
    if (
      values.defaultKeyExpiryDays !== undefined &&
      !isIntegerWithin(values.defaultKeyExpiryDays, 1, 3650)
    )
      invalid('defaultKeyExpiryDays must be between 1 and 3650');
    if (
      values.defaultRateLimit !== undefined &&
      !isIntegerWithin(values.defaultRateLimit, 1, 10000)
    )
      invalid('defaultRateLimit must be between 1 and 10000');
  }
}

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(SystemSetting)
    private readonly settings: Repository<SystemSetting>,
    private readonly config: ConfigService,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async get() {
    const rows = await this.settings.find();
    const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return {
      storage: {
        root: this.config.get<string>('STORAGE_ROOT', './storage'),
        temp: this.config.get<string>('TEMP_ROOT', './storage/.tmp'),
        publicBaseUrl: this.config.get<string>(
          'PUBLIC_ASSET_BASE_URL',
          'http://localhost:3000/files',
        ),
      },
      processing: {
        maxInputBytes: Number(
          this.config.get<string>('MAX_INPUT_BYTES', '25000000'),
        ),
        maxOutputBytes: Number(
          this.config.get<string>('MAX_OUTPUT_BYTES', '5000000'),
        ),
        maxInputPixels: Number(
          this.config.get<string>('MAX_INPUT_PIXELS', '40000000'),
        ),
        maxImageDimension: Number(
          this.config.get<string>('MAX_IMAGE_DIMENSION', '4096'),
        ),
        startingWebpQuality: Number(
          this.config.get<string>('STARTING_WEBP_QUALITY', '82'),
        ),
        concurrency: Number(
          this.config.get<string>('PROCESSING_CONCURRENCY', '2'),
        ),
      },
      capacity: {
        warningPercent: Number(
          this.config.get<string>('DISK_WARNING_PERCENT', '70'),
        ),
        stopUploadPercent: Number(
          this.config.get<string>('DISK_STOP_UPLOAD_PERCENT', '88'),
        ),
      },
      saved,
    };
  }

  async getSection<T extends Record<string, unknown>>(
    section: Section,
    defaults: T,
  ): Promise<T> {
    const row = await this.settings.findOne({ where: { key: section } });
    return { ...defaults, ...(row?.value ?? {}) };
  }

  async update(
    section: string,
    values: Record<string, unknown>,
    context: { actorUserId: string; ip?: string | null },
  ) {
    if (!(section in EDITABLE))
      throw new BadRequestException('This settings section is read-only');
    const keys = EDITABLE[section as Section] as readonly string[];
    const filtered = Object.fromEntries(
      Object.entries(values).filter(([key]) => keys.includes(key)),
    );
    if (!Object.keys(filtered).length)
      throw new BadRequestException('No editable settings were provided');
    validate(section as Section, filtered);
    const existing = await this.settings.findOne({ where: { key: section } });
    await this.settings.save(
      this.settings.create({
        key: section,
        value: { ...(existing?.value ?? {}), ...filtered },
        updatedById: context.actorUserId,
      }),
    );
    await this.auditLogs.record({
      actorUserId: context.actorUserId,
      action: 'settings.updated',
      resourceType: 'settings',
      resourceId: section,
      ip: context.ip,
      metadata: { fields: Object.keys(filtered) },
    });
    return this.get();
  }
}
