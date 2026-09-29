import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { UploadOutcome } from '../../common/enums';
import { paginate } from '../../common/utils/pagination';
import { UploadLog } from './entities/upload-log.entity';

export type CreateUploadLogInput = Omit<
  UploadLog,
  'id' | 'project' | 'apiKey' | 'createdAt'
>;

@Injectable()
export class UploadLogsService {
  constructor(
    @InjectRepository(UploadLog)
    private readonly uploadLogs: Repository<UploadLog>,
  ) {}

  async record(input: CreateUploadLogInput): Promise<void> {
    await this.uploadLogs.save(this.uploadLogs.create(input));
  }

  async findAll(
    query: PageQueryDto,
    filters: {
      projectId?: string;
      outcome?: UploadOutcome;
      requestId?: string;
    },
  ) {
    const builder = this.uploadLogs
      .createQueryBuilder('uploadLog')
      .leftJoinAndSelect('uploadLog.project', 'project')
      .leftJoinAndSelect('uploadLog.apiKey', 'apiKey')
      .orderBy('uploadLog.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (filters.projectId) {
      builder.andWhere('uploadLog.projectId = :projectId', {
        projectId: filters.projectId,
      });
    }
    if (filters.outcome) {
      builder.andWhere('uploadLog.outcome = :outcome', {
        outcome: filters.outcome,
      });
    }
    if (filters.requestId) {
      builder.andWhere('uploadLog.requestId = :requestId', {
        requestId: filters.requestId,
      });
    }

    const [data, total] = await builder.getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }
}
