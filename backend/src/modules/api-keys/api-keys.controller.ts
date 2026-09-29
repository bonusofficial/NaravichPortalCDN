import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { ApiKeyStatus, UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AdminAuthenticatedRequest } from '../../common/interfaces/authenticated-request';
import { ApiKeysService } from './api-keys.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { RotateApiKeyDto } from './dto/rotate-api-key.dto';

@ApiTags('API keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Get()
  findAll(
    @Query() query: PageQueryDto,
    @Query('projectId') projectId?: string,
    @Query('status') status?: ApiKeyStatus,
  ) {
    return this.apiKeysService.findAll(query, projectId, status);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  create(
    @Body() dto: CreateApiKeyDto,
    @Req() request: AdminAuthenticatedRequest,
  ) {
    return this.apiKeysService.create(dto, {
      actorUserId: request.user.sub,
      ip: request.ip,
    });
  }

  @Post(':id/revoke')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  revoke(@Param('id') id: string, @Req() request: AdminAuthenticatedRequest) {
    return this.apiKeysService.revoke(id, {
      actorUserId: request.user.sub,
      ip: request.ip,
    });
  }

  @Post(':id/rotate')
  @Roles(UserRole.ADMIN, UserRole.OPERATOR)
  rotate(
    @Param('id') id: string,
    @Body() dto: RotateApiKeyDto,
    @Req() request: AdminAuthenticatedRequest,
  ) {
    return this.apiKeysService.rotate(id, dto.graceHours, {
      actorUserId: request.user.sub,
      ip: request.ip,
    });
  }
}
