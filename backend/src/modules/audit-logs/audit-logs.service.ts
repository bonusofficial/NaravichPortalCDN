import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { paginate } from '../../common/utils/pagination';
import { AuditLog } from './entities/audit-log.entity';

export interface RecordAuditInput {
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ip?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogs: Repository<AuditLog>,
  ) {}

  async record(input: RecordAuditInput): Promise<void> {
    await this.auditLogs.save(
      this.auditLogs.create({
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        ip: input.ip ?? null,
        metadata: input.metadata ?? null,
      }),
    );
  }

  async findAll(query: PageQueryDto, action?: string) {
    const builder = this.auditLogs
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.actorUser', 'actorUser')
      .orderBy('audit.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (action) {
      builder.andWhere('audit.action = :action', { action });
    }

    const [data, total] = await builder.getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }
}
