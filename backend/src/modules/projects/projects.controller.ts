import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { ProjectStatus, UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AdminAuthenticatedRequest } from '../../common/interfaces/authenticated-request';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projects')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  findAll(
    @Query() query: PageQueryDto,
    @Query('search') search?: string,
    @Query('status') status?: ProjectStatus,
  ) {
    return this.projectsService.findAll(query, search, status);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  create(
    @Body() dto: CreateProjectDto,
    @Req() request: AdminAuthenticatedRequest,
  ) {
    return this.projectsService.create(dto, {
      actorUserId: request.user.sub,
      ip: request.ip,
    });
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @Req() request: AdminAuthenticatedRequest,
  ) {
    return this.projectsService.update(id, dto, {
      actorUserId: request.user.sub,
      ip: request.ip,
    });
  }
}
