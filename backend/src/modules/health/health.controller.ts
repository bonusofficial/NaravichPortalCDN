import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { StorageService } from '../storage/storage.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
  ) {}

  @Get()
  async get() {
    await this.dataSource.query('SELECT 1');
    const disk = await this.storage.health();
    return {
      status: disk.acceptsUploads ? 'ok' : 'degraded',
      service: 'naravich-cdn-backend',
      database: 'up',
      storage: { status: disk.state, ...disk },
      timestamp: new Date().toISOString(),
    };
  }
}
