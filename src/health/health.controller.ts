import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import type { Response } from 'express';
import { PinoLogger } from 'nestjs-pino';
import { ClockService } from '../common/services/clock.service.js';
import { StorageService } from '../storage/storage.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    private readonly storage: StorageService,
    private readonly clock: ClockService,
    private readonly logger: PinoLogger,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Liveness probe; does not depend on external services',
  })
  @ApiResponse({ status: 200, description: 'Process is alive' })
  getHealth() {
    return {
      status: 'ok',
      timestamp: this.clock.nowIso(),
    };
  }

  @Get('ready')
  @ApiOperation({
    summary: 'Readiness probe for PostgreSQL and object storage',
  })
  @ApiResponse({ status: 200, description: 'Dependencies are ready' })
  @ApiResponse({
    status: 503,
    description: 'A required dependency is unavailable',
  })
  async getReadiness(@Res({ passthrough: true }) response: Response) {
    const [database, storage] = await Promise.all([
      this.checkDatabase(),
      this.checkStorage(),
    ]);
    const ready = database === 'up' && storage === 'up';
    response.status(ready ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE);

    return {
      status: ready ? 'ok' : 'error',
      checks: { database, storage },
      timestamp: this.clock.nowIso(),
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch {
      this.logger.warn({ dependency: 'database' }, 'Readiness check failed');
      return 'down';
    }
  }

  private async checkStorage(): Promise<'up' | 'down'> {
    try {
      await this.storage.checkHealth();
      return 'up';
    } catch {
      this.logger.warn({ dependency: 'storage' }, 'Readiness check failed');
      return 'down';
    }
  }
}
