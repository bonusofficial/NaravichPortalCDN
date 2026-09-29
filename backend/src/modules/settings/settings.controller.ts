import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { AdminAuthenticatedRequest } from '../../common/interfaces/authenticated-request';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';

@ApiTags('Settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get()
  get() {
    return this.settings.get();
  }

  @Patch(':section')
  @Roles(UserRole.ADMIN)
  update(
    @Param('section') section: string,
    @Body() dto: UpdateSettingsDto,
    @Req() request: AdminAuthenticatedRequest,
  ) {
    return this.settings.update(section, dto.values, {
      actorUserId: request.user.sub,
      ip: request.ip,
    });
  }
}
