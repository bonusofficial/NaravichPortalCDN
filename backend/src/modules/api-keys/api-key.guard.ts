import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'node:crypto';
import { Repository } from 'typeorm';
import { ApiKeyStatus, ProjectStatus } from '../../common/enums';
import type { ApiKeyAuthenticatedRequest } from '../../common/interfaces/authenticated-request';
import { ipMatchesAny } from '../../common/utils/ip';
import { ApiKeysService } from './api-keys.service';
import { ApiKey } from './entities/api-key.entity';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly rateBuckets = new Map<
    string,
    { count: number; resetAt: number }
  >();

  constructor(
    @InjectRepository(ApiKey)
    private readonly apiKeys: Repository<ApiKey>,
    private readonly apiKeysService: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<ApiKeyAuthenticatedRequest>();
    const bearer = request.headers.authorization?.startsWith('Bearer ')
      ? request.headers.authorization.slice('Bearer '.length).trim()
      : undefined;
    const headerKey = request.headers['x-api-key'];
    const token =
      bearer ?? (typeof headerKey === 'string' ? headerKey : undefined);
    const match = token?.match(
      /^ncdn_(?:live|test)_([a-f0-9]{16})\.([A-Za-z0-9_-]{32,})$/,
    );

    if (!match) throw new UnauthorizedException('Invalid API key format');
    const [, publicId, secret] = match;
    const apiKey = await this.apiKeys
      .createQueryBuilder('apiKey')
      .addSelect('apiKey.secretHash')
      .addSelect('apiKey.previousSecretHash')
      .leftJoinAndSelect('apiKey.project', 'project')
      .where('apiKey.publicId = :publicId', { publicId })
      .getOne();

    if (!apiKey || apiKey.status !== ApiKeyStatus.ACTIVE) {
      throw new UnauthorizedException('API key is inactive');
    }
    if (apiKey.expiresAt && apiKey.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('API key has expired');
    }
    if (apiKey.project.status !== ProjectStatus.ACTIVE) {
      throw new UnauthorizedException('Project is disabled');
    }
    if (!apiKey.scopes.includes('image:upload')) {
      throw new UnauthorizedException('API key lacks image:upload scope');
    }

    const actual = Buffer.from(this.apiKeysService.hashSecret(secret), 'hex');
    const matches = (hash: string | null | undefined) => {
      if (!hash) return false;
      const expected = Buffer.from(hash, 'hex');
      return (
        expected.length === actual.length && timingSafeEqual(expected, actual)
      );
    };
    const previousValid = Boolean(
      apiKey.previousSecretExpiresAt &&
      apiKey.previousSecretExpiresAt.getTime() > Date.now(),
    );
    if (
      !matches(apiKey.secretHash) &&
      !(previousValid && matches(apiKey.previousSecretHash))
    ) {
      throw new UnauthorizedException('Invalid API key');
    }

    const sourceIp = (request.ip ?? request.socket.remoteAddress ?? '').replace(
      /^::ffff:/,
      '',
    );
    if (
      apiKey.ipAllowlist?.length &&
      !ipMatchesAny(sourceIp, apiKey.ipAllowlist)
    ) {
      throw new UnauthorizedException(
        'Source IP is not allowed for this API key',
      );
    }

    this.checkRateLimit(apiKey);

    apiKey.lastUsedAt = new Date();
    await this.apiKeys.save(apiKey);
    request.apiKey = apiKey;
    request.project = apiKey.project;
    return true;
  }

  private checkRateLimit(apiKey: ApiKey): void {
    const now = Date.now();
    const current = this.rateBuckets.get(apiKey.publicId);
    const bucket =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + 60_000 }
        : current;

    if (bucket.count >= apiKey.rateLimitPerMinute) {
      throw new HttpException(
        {
          code: 'API_KEY_RATE_LIMITED',
          message: 'API key request limit exceeded',
          retryAfterSeconds: Math.max(
            1,
            Math.ceil((bucket.resetAt - now) / 1000),
          ),
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    bucket.count += 1;
    this.rateBuckets.set(apiKey.publicId, bucket);
  }
}
