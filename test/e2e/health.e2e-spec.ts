import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenericContainer, Wait } from 'testcontainers';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { StorageService } from '../../src/storage/storage.service.js';

describe('H0 API smoke (e2e)', () => {
  let app: INestApplication<App>;
  let container: Awaited<ReturnType<GenericContainer['start']>>;

  beforeAll(async () => {
    container = await new GenericContainer('postgis/postgis:16-3.5')
      .withEnvironment({
        POSTGRES_USER: 'trekko',
        POSTGRES_PASSWORD: 'trekko',
        POSTGRES_DB: 'trekko',
      })
      .withExposedPorts(5432)
      .withWaitStrategy(
        Wait.forLogMessage('database system is ready to accept connections', 2),
      )
      .start();
    process.env.DATABASE_URL = `postgres://trekko:trekko@${container.getHost()}:${container.getMappedPort(5432)}/trekko`;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(StorageService)
      .useValue({
        checkHealth: async (): Promise<void> => undefined,
      } satisfies Pick<StorageService, 'checkHealth'>)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  it('serves liveness and readiness with a request ID', async () => {
    const liveness = await request(app.getHttpServer())
      .get('/health')
      .set('x-request-id', 'h0-smoke-1')
      .expect(200);
    expect(liveness.body).toMatchObject({ status: 'ok' });
    expect(liveness.headers['x-request-id']).toBe('h0-smoke-1');

    const readiness = await request(app.getHttpServer())
      .get('/health/ready')
      .expect(200);
    expect(readiness.body).toMatchObject({
      status: 'ok',
      checks: { database: 'up', storage: 'up' },
    });
  });

  it('exposes OpenAPI documentation at /api/docs', async () => {
    await request(app.getHttpServer()).get('/api/docs/').expect(200);
    const document = await request(app.getHttpServer())
      .get('/api/docs/openapi.json')
      .expect(200);

    expect(document.body.paths).toHaveProperty('/health');
    expect(document.body.paths).toHaveProperty('/health/ready');
  });
});
