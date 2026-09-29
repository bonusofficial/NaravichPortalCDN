import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiSecurity,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { AssetStatus, UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type {
  AdminAuthenticatedRequest,
  ApiKeyAuthenticatedRequest,
} from '../../common/interfaces/authenticated-request';
import { ApiKeyGuard } from '../api-keys/api-key.guard';
import { ProjectsService } from '../projects/projects.service';
import { AssetsService } from './assets.service';

@ApiTags('Images')
@Controller()
export class AssetsController {
  constructor(
    private readonly assetsService: AssetsService,
    private readonly projectsService: ProjectsService,
  ) {}

  @Post('images')
  @ApiSecurity('api-key')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @UseGuards(ApiKeyGuard)
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() request: ApiKeyAuthenticatedRequest,
  ) {
    if (!file)
      throw new BadRequestException(
        'A multipart file field named "file" is required',
      );
    return this.assetsService.upload(file, {
      project: request.project,
      apiKey: request.apiKey,
      sourceIp: request.ip,
    });
  }

  @Post('dashboard/images')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['projectId', 'file'],
      properties: {
        projectId: { type: 'string', format: 'uuid' },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  @UseInterceptors(FileInterceptor('file'))
  async uploadFromDashboard(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body('projectId') projectId: string | undefined,
    @Req() request: AdminAuthenticatedRequest,
  ) {
    if (!file)
      throw new BadRequestException(
        'A multipart file field named "file" is required',
      );
    if (!projectId) throw new BadRequestException('projectId is required');
    const project = await this.projectsService.findOne(projectId);
    return this.assetsService.upload(file, {
      project,
      apiKey: null,
      sourceIp: request.ip,
    });
  }

  @Get('assets')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findAll(
    @Query() query: PageQueryDto,
    @Query('projectId') projectId?: string,
    @Query('search') search?: string,
    @Query('status') status?: AssetStatus,
  ) {
    return this.assetsService.findAll(query, { projectId, search, status });
  }

  @Get('assets/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Get('assets/trash/summary')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  trashSummary() {
    return this.assetsService.trashSummary();
  }

  @Post('assets/:id/restore')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  restore(@Param('id') id: string, @Req() request: AdminAuthenticatedRequest) {
    return this.assetsService.restore(id, {
      actorUserId: request.user.sub,
      ip: request.ip,
    });
  }

  @Post('assets/:id/reprocess')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  reprocess(
    @Param('id') id: string,
    @Req() request: AdminAuthenticatedRequest,
  ) {
    return this.assetsService.reprocess(id, {
      actorUserId: request.user.sub,
      ip: request.ip,
    });
  }

  @Post('assets/trash/purge')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  purgeTrash(@Req() request: AdminAuthenticatedRequest) {
    return this.assetsService.purgeTrash({
      actorUserId: request.user.sub,
      ip: request.ip,
    });
  }

  @Delete('assets/:id')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  delete(@Param('id') id: string, @Req() request: AdminAuthenticatedRequest) {
    return this.assetsService.delete(id, {
      actorUserId: request.user.sub,
      ip: request.ip,
    });
  }
}
