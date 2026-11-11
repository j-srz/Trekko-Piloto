import { jest } from '@jest/globals';
import { PinoLogger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { DatabaseStartupLogger } from './database-startup-logger.js';

describe('DatabaseStartupLogger', () => {
  it('records the TypeORM connection state and invariant settings', () => {
    const dataSource = { isInitialized: true } as DataSource;
    const logger = { info: jest.fn() } as unknown as PinoLogger;

    new DatabaseStartupLogger(dataSource, logger).onApplicationBootstrap();

    expect(logger.info).toHaveBeenCalledWith(
      { initialized: true, synchronize: false },
      'TypeORM datasource initialized',
    );
  });
});
