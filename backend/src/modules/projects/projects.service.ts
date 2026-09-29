import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { ProjectStatus } from '../../common/enums';
import { paginate } from '../../common/utils/pagination';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { Project } from './entities/project.entity';

interface ProjectContext {
  actorUserId: string;
  ip?: string | null;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectRepository(Project)
    private readonly projects: Repository<Project>,
    private readonly auditLogs: AuditLogsService,
  ) {}

  async findAll(query: PageQueryDto, search?: string, status?: ProjectStatus) {
    const builder = this.projects
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.createdBy', 'createdBy')
      .orderBy('project.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    if (search) {
      builder.andWhere(
        '(project.name LIKE :search OR project.slug LIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }
    if (status) {
      builder.andWhere('project.status = :status', { status });
    }

    const [data, total] = await builder.getManyAndCount();
    return paginate(data, total, query.page, query.limit);
  }

  async findOne(id: string): Promise<Project> {
    const project = await this.projects.findOne({
      where: { id },
      relations: { createdBy: true },
    });
    if (!project) {
      throw new NotFoundException('Project not found');
    }
    return project;
  }

  async create(
    dto: CreateProjectDto,
    context: ProjectContext,
  ): Promise<Project> {
    if (await this.projects.exists({ where: { slug: dto.slug } })) {
      throw new ConflictException('Project slug is already in use');
    }

    const project = await this.projects.save(
      this.projects.create({
        ...dto,
        description: dto.description ?? null,
        domain: dto.domain ?? null,
        status: dto.status ?? ProjectStatus.ACTIVE,
        quotaBytes: dto.quotaBytes ?? '107374182400',
        allowedFormats: dto.allowedFormats ?? ['jpeg', 'png', 'webp'],
        maxInputBytes: dto.maxInputBytes ?? 25000000,
        maxOutputBytes: dto.maxOutputBytes ?? 5000000,
        startingQuality: dto.startingQuality ?? 82,
        maxWidth: dto.maxWidth ?? 4096,
        maxHeight: dto.maxHeight ?? 4096,
        createdById: context.actorUserId,
      }),
    );

    await this.auditLogs.record({
      actorUserId: context.actorUserId,
      action: 'project.created',
      resourceType: 'project',
      resourceId: project.id,
      ip: context.ip,
      metadata: { name: project.name, slug: project.slug },
    });
    return project;
  }

  async update(
    id: string,
    dto: UpdateProjectDto,
    context: ProjectContext,
  ): Promise<Project> {
    const project = await this.findOne(id);
    if (dto.slug && dto.slug !== project.slug) {
      if (await this.projects.exists({ where: { slug: dto.slug } })) {
        throw new ConflictException('Project slug is already in use');
      }
    }

    Object.assign(project, dto);
    const updated = await this.projects.save(project);
    await this.auditLogs.record({
      actorUserId: context.actorUserId,
      action: 'project.updated',
      resourceType: 'project',
      resourceId: updated.id,
      ip: context.ip,
      metadata: { fields: Object.keys(dto) },
    });
    return updated;
  }
}
