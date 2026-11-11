import { jest } from '@jest/globals';
import { HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { DataSource } from 'typeorm';
import { ClockService } from '../common/services/clock.service.js';
import { StorageService } from '../storage/storage.service.js';
import { PinoLogger } from 'nestjs-pino';
import { HealthController } from './health.controller.js';

describe('HealthController', () => {
  const dataSource = { query: jest.fn() } as unknown as DataSource;
  const storage = { checkHealth: jest.fn() } as unknown as StorageService;
  const clock = { nowIso: () => '2026-11-10T12:00:00.000Z' } as ClockService;
  const logger = { warn: jest.fn() } as unknown as PinoLogger;
  const controller = new HealthController(dataSource, storage, clock, logger);

  beforeEach(() => {
    jest.mocked(dataSource.query).mockResolvedValue([{ '?column?': 1 }]);
    jest.mocked(storage.checkHealth).mockResolvedValue();
  });

  it('returns liveness without checking dependencies', () => {
    expect(controller.getHealth()).toEqual({
      status: 'ok',
      timestamp: '2026-11-10T12:00:00.000Z',
    });
    expect(dataSource.query).not.toHaveBeenCalled();
    expect(storage.checkHealth).not.toHaveBeenCalled();
  });

  it('reports readiness when PostgreSQL and storage are available', async () => {
    const response = { status: jest.fn() } as unknown as Response;

    await expect(controller.getReadiness(response)).resolves.toMatchObject({
      status: 'ok',
      checks: { database: 'up', storage: 'up' },
    });
    expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
  });

  it('reports an unavailable dependency and sets HTTP 503', async () => {
    jest
      .mocked(storage.checkHealth)
      .mockRejectedValue(new Error('storage offline'));
    const response = { status: jest.fn() } as unknown as Response;

    await expect(controller.getReadiness(response)).resolves.toMatchObject({
      status: 'error',
      checks: { database: 'up', storage: 'down' },
    });
    expect(response.status).toHaveBeenCalledWith(
      HttpStatus.SERVICE_UNAVAILABLE,
    );
    expect(logger.warn).toHaveBeenCalledWith(
      { dependency: 'storage' },
      'Readiness check failed',
    );
  });

  it('reports a database failure independently of storage', async () => {
    jest
      .mocked(dataSource.query)
      .mockRejectedValue(new Error('database offline'));
    const response = { status: jest.fn() } as unknown as Response;

    await expect(controller.getReadiness(response)).resolves.toMatchObject({
      status: 'error',
      checks: { database: 'down', storage: 'up' },
    });
  });
});
