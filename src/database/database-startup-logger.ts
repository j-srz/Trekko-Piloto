import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseStartupLogger implements OnApplicationBootstrap {
  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: PinoLogger,
  ) {}

  onApplicationBootstrap(): void {
    this.logger.info(
      { initialized: this.dataSource.isInitialized, synchronize: false },
      'TypeORM datasource initialized',
    );
  }
}
