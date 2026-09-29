import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PageQueryDto } from '../../common/dto/page-query.dto';
import { UploadOutcome } from '../../common/enums';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { UploadLogsService } from './upload-logs.service';

@ApiTags('Upload logs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('upload-logs')
export class UploadLogsController {
  constructor(private readonly uploadLogsService: UploadLogsService) {}

  @Get()
  findAll(
    @Query() query: PageQueryDto,
    @Query('projectId') projectId?: string,
    @Query('outcome') outcome?: UploadOutcome,
    @Query('requestId') requestId?: string,
  ) {
    return this.uploadLogsService.findAll(query, {
      projectId,
      outcome,
      requestId,
    });
  }
}
