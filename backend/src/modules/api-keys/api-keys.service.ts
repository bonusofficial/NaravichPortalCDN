import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHmac, randomBytes } from 'node:crypto';
import { Repository } from 'typeorm';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { ApiKeyStatus } from '../../common/enums';
import { paginate } from '../../common/utils/pagination';
import { isValidIpRule } from '../../common/utils/ip';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { ProjectsService } from '../projects/projects.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiKey } from './entities/api-key.entity';

interface ApiKeyContext {
  actorUserId: string;
  ip?: string | null;
}

@Injectable()
export class ApiKeysService {
  private readonly pepper: string;

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeys: Repository<ApiKey>,
    private readonly projectsService: ProjectsService,
    private readonly auditLogs: AuditLogsService,
    config: ConfigService,
  ) {
    this.pepper = config.getOrThrow<string>('API_KEY_PEPPER');
  }

  hashSecret(secret: string): string {
    return createHmac('sha256', this.pepper).update(secret).digest('hex');
  }

  async findAll(
    query: PageQueryDto,
    projectId?: string,
    status?: ApiKeyStatus,
  ) {
    const builder = this.apiKeys
      .createQueryBuilder('apiKey')
      .leftJoinAndSelect('apiKey.project', 'project')
      .leftJoinAndSelect('apiKey.createdBy', 'createdBy')
      .orderBy('apiKey.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (projectId)
      builder.andWhere('apiKey.projectId = :projectId', { projectId });
    if (status) builder.andWhere('apiKey.status = :status', { status });

    const [data, total] = await builder.getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async create(dto: CreateApiKeyDto, context: ApiKeyContext) {
    await this.projectsService.findOne(dto.projectId);
    if (dto.ipAllowlist?.some((rule) => !isValidIpRule(rule))) {
      throw new BadRequestException(
        'IP allowlist contains an invalid IP address or CIDR',
      );
    }
    const publicId = randomBytes(8).toString('hex');
    const secret = randomBytes(32).toString('base64url');
    const environment = dto.environment ?? 'live';
    const token = `ncdn_${environment}_${publicId}.${secret}`;

    const apiKey = await this.apiKeys.save(
      this.apiKeys.create({
        projectId: dto.projectId,
        name: dto.name,
        publicId,
        secretHash: this.hashSecret(secret),
        prefix: `ncdn_${environment}_${publicId}`,
        scopes: dto.scopes ?? ['image:upload'],
        status: ApiKeyStatus.ACTIVE,
        rateLimitPerMinute: dto.rateLimitPerMinute ?? 60,
        ipAllowlist: dto.ipAllowlist?.length ? dto.ipAllowlist : null,
        expiresAt: dto.expiresAt ?? null,
        createdById: context.actorUserId,
      }),
    );

    await this.auditLogs.record({
      actorUserId: context.actorUserId,
      action: 'api_key.created',
      resourceType: 'api_key',
      resourceId: apiKey.id,
      ip: context.ip,
      metadata: {
        projectId: dto.projectId,
        name: dto.name,
        prefix: apiKey.prefix,
      },
    });

    return {
      apiKey: this.toPublicApiKey(apiKey),
      token,
      warning:
        'This key is shown once. Store it securely; it cannot be retrieved later.',
    };
  }

  async revoke(id: string, context: ApiKeyContext): Promise<ApiKey> {
    const apiKey = await this.apiKeys.findOne({ where: { id } });
    if (!apiKey) throw new NotFoundException('API key not found');
    apiKey.status = ApiKeyStatus.REVOKED;
    const saved = await this.apiKeys.save(apiKey);
    await this.auditLogs.record({
      actorUserId: context.actorUserId,
      action: 'api_key.revoked',
      resourceType: 'api_key',
      resourceId: id,
      ip: context.ip,
      metadata: { prefix: apiKey.prefix },
    });
    return saved;
  }

  async rotate(id: string, graceHours: number, context: ApiKeyContext) {
    const apiKey = await this.apiKeys
      .createQueryBuilder('apiKey')
      .addSelect('apiKey.secretHash')
      .where('apiKey.id = :id', { id })
      .getOne();
    if (!apiKey) throw new NotFoundException('API key not found');
    const secret = randomBytes(32).toString('base64url');
    const environment = apiKey.prefix.startsWith('ncdn_test_')
      ? 'test'
      : 'live';
    const token = `ncdn_${environment}_${apiKey.publicId}.${secret}`;
    apiKey.previousSecretHash = graceHours > 0 ? apiKey.secretHash : null;
    apiKey.previousSecretExpiresAt =
      graceHours > 0 ? new Date(Date.now() + graceHours * 3_600_000) : null;
    apiKey.secretHash = this.hashSecret(secret);
    apiKey.status = ApiKeyStatus.ACTIVE;
    await this.apiKeys.save(apiKey);
    await this.auditLogs.record({
      actorUserId: context.actorUserId,
      action: 'api_key.rotated',
      resourceType: 'api_key',
      resourceId: id,
      ip: context.ip,
      metadata: { prefix: apiKey.prefix, graceHours },
    });
    return {
      apiKey: this.toPublicApiKey(apiKey),
      token,
      warning:
        graceHours > 0
          ? `This rotated key is shown once. The previous secret remains valid for ${graceHours} hours.`
          : 'This rotated key is shown once. The previous secret is invalid immediately.',
    };
  }

  private toPublicApiKey(apiKey: ApiKey) {
    return {
      id: apiKey.id,
      projectId: apiKey.projectId,
      name: apiKey.name,
      publicId: apiKey.publicId,
      prefix: apiKey.prefix,
      scopes: apiKey.scopes,
      status: apiKey.status,
      rateLimitPerMinute: apiKey.rateLimitPerMinute,
      ipAllowlist: apiKey.ipAllowlist,
      expiresAt: apiKey.expiresAt,
      lastUsedAt: apiKey.lastUsedAt,
      createdById: apiKey.createdById,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
      graceEndsAt: apiKey.previousSecretExpiresAt,
    };
  }
}
