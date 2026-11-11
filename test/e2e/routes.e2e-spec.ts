import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { GenericContainer, Wait } from 'testcontainers';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'node:crypto';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { seedCatalog } from '../../src/database/seeds/catalog.seed.js';
import { seedOriginalRoutes } from '../../src/database/seeds/routes.seed.js';
import { StorageService } from '../../src/storage/storage.service.js';

describe('ROUTES (e2e)', () => {
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
    await seedOriginalRoutes(dataSource);
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  it('lists and returns published Trekko Originals with POIs in order', async () => {
    const list = await request(app.getHttpServer())
      .get('/api/v1/routes')
      .query({ tipo: 'original', page: 1, limit: 10 })
      .expect(200);
    expect(list.body.data).toHaveLength(4);
    expect(list.body.meta.total).toBe(4);
    expect(list.body.data[0].autor).toEqual({ id: null, nombre: 'Trekko' });

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/routes/${list.body.data[0].id}`)
      .expect(200);
    expect(detail.body.pois).toHaveLength(4);
    expect(detail.body.pois.map((poi: { orden: number }) => poi.orden)).toEqual([
      1, 2, 3, 4,
    ]);

    const municipalityFiltered = await request(app.getHttpServer())
      .get('/api/v1/routes')
      .query({
        municipioId: '00000000-0000-4000-8000-000000000001',
        costoMax: 300,
      })
      .expect(200);
    expect(municipalityFiltered.body.meta.total).toBe(1);
  });

  it('requires an authenticated explorer and generates deterministic proposals', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/routes/generate')
      .send({})
      .expect(401);

    const account = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Route Explorer',
        correo: 'route-explorer@example.test',
        password: 'strongpass1',
      })
      .expect(201);
    const adminToken = await app.get(JwtService).signAsync(
      {
        sub: account.body.user.id,
        roles: ['admin'],
        modoActivo: 'explorador',
      },
      { jwtid: randomUUID() },
    );
    await request(app.getHttpServer())
      .post('/api/v1/routes/generate')
      .set('authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(403);
    const input = {
      municipioId: '00000000-0000-4000-8000-000000000001',
      fecha: '2026-11-09',
      horaInicio: '09:00',
      horaFin: '14:30',
      presupuestoMax: 500,
      personas: 2,
      categorias: ['restaurante', 'cultural', 'naturaleza'],
      ritmo: 'normal',
    };
    const first = await request(app.getHttpServer())
      .post('/api/v1/routes/generate')
      .set('authorization', `Bearer ${account.body.accessToken}`)
      .send(input)
      .expect(200);
    const second = await request(app.getHttpServer())
      .post('/api/v1/routes/generate')
      .set('authorization', `Bearer ${account.body.accessToken}`)
      .send(input)
      .expect(200);

    expect(first.body).toEqual(second.body);
    expect(first.body.items.length).toBeGreaterThan(0);
    expect(first.body.costoTotal).toBeLessThanOrEqual(input.presupuestoMax);
    expect(first.body.costoPorPersona).toBe(
      Math.round((first.body.costoTotal / input.personas) * 100) / 100,
    );
    expect(first.body).toHaveProperty('desglose.transporte');
    const routeCount = (await app.get(DataSource).query(
      `SELECT count(*)::int AS total FROM ruta`,
    )) as Array<{ total: number }>;
    expect(Number(routeCount[0].total)).toBe(4);
  });

  it('rejects invalid date, timing, and route identifiers', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/routes/not-a-uuid')
      .expect(400);

    const account = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Invalid Planner',
        correo: 'invalid-planner@example.test',
        password: 'strongpass1',
      })
      .expect(201);
    await request(app.getHttpServer())
      .post('/api/v1/routes/generate')
      .set('authorization', `Bearer ${account.body.accessToken}`)
      .send({
        municipioId: '00000000-0000-4000-8000-000000000001',
        fecha: '2026-02-31',
        horaInicio: '09:00',
        horaFin: '10:00',
        personas: 1,
        ritmo: 'normal',
      })
      .expect(400);
  });
});
