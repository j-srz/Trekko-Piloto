import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenericContainer, Wait } from 'testcontainers';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { seedCatalog } from '../../src/database/seeds/catalog.seed.js';
import { StorageService } from '../../src/storage/storage.service.js';

describe('POIS (e2e)', () => {
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
    const dataSource = app.get(DataSource);
    await seedCatalog(dataSource);
    await seedCatalog(dataSource);
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  it('lists four municipalities and seeds exactly forty fictional POIs idempotently', async () => {
    const municipalities = await request(app.getHttpServer())
      .get('/api/v1/municipios')
      .expect(200);
    expect(municipalities.body).toHaveLength(4);
    expect(
      municipalities.body.find(
        (municipality: { nombre: string }) => municipality.nombre === 'Calvillo',
      ).esPuebloMagico,
    ).toBe(true);

    const rows = (await app.get(DataSource).query(
      `SELECT count(*)::int AS total FROM poi`,
    )) as Array<{ total: number }>;
    expect(Number(rows[0].total)).toBe(40);
  });

  it('filters and paginates POIs with validated parameterized filters', async () => {
    const municipality = await request(app.getHttpServer())
      .get('/api/v1/municipios')
      .expect(200);
    const agu = municipality.body.find(
      (item: { nombre: string }) => item.nombre === 'Aguascalientes',
    );
    const filtered = await request(app.getHttpServer())
      .get('/api/v1/pois')
      .query({
        municipioId: agu.id,
        'categoria[]': 'restaurante',
        costoMax: 300,
        page: 1,
        limit: 1,
      })
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);
    expect(filtered.body.meta).toMatchObject({
      page: 1,
      limit: 1,
      total: 2,
      totalPages: 2,
    });

    const injection = await request(app.getHttpServer())
      .get('/api/v1/pois')
      .query({ q: "' OR 1=1 --" })
      .expect(200);
    expect(injection.body.meta.total).toBe(0);
  });

  it('uses parameterized PostGIS nearby search and returns generated contact links', async () => {
    const nearby = await request(app.getHttpServer())
      .get('/api/v1/pois/nearby')
      .query({ lat: 21.8853, lng: -102.2916, radioM: 5000, limit: 2 })
      .expect(200);
    expect(nearby.body.data).toHaveLength(2);
    expect(nearby.body.data[0].distanciaM).toBeLessThanOrEqual(
      nearby.body.data[1].distanciaM,
    );
    expect(nearby.body.data[0]).toHaveProperty('destacado');

    const poiId = nearby.body.data[0].id;
    const detail = await request(app.getHttpServer())
      .get(`/api/v1/pois/${poiId}`)
      .expect(200);
    expect(detail.body.contacto.whatsappUrl).toMatch(/^https:\/\/wa\.me\/\d+$/);
    expect(detail.body.contacto.telefonoUrl).toMatch(/^tel:\+\d+$/);
  });

  it('rejects invalid filters and malformed POI identifiers', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/pois/nearby')
      .query({ lat: 91, lng: -102 })
      .expect(400);
    await request(app.getHttpServer())
      .get('/api/v1/pois/not-a-uuid')
      .expect(400);
  });
});
