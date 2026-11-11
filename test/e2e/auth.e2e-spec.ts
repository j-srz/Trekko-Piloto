import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { GenericContainer, Wait } from 'testcontainers';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { DataSource } from 'typeorm';
import type { NextFunction, Request, Response } from 'express';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/configure-app.js';
import { StorageService } from '../../src/storage/storage.service.js';

describe('AUTH (e2e)', () => {
  let app: INestApplication<App>;
  let container: Awaited<ReturnType<GenericContainer['start']>>;
  let jwt: JwtService;
  let clientIp = 1;

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
    app.getHttpAdapter().getInstance().set('trust proxy', true);
    app.use((_request: Request, _response: Response, next: NextFunction) => {
      _request.headers['x-forwarded-for'] = `192.0.2.${clientIp++}`;
      next();
    });
    await app.init();
    jwt = app.get(JwtService);
  }, 120000);

  afterAll(async () => {
    await app?.close();
    await container?.stop();
  });

  it('registers, logs in, and returns the authenticated user without sensitive fields', async () => {
    const register = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Explorador',
        correo: 'auth-flow@example.test',
        password: 'strongpass1',
      })
      .expect(201);
    expect(register.body.user.roles).toEqual(['explorador']);
    expect(register.body.user).not.toHaveProperty('hash_password');
    expect(register.body.refreshToken).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo: 'auth-flow@example.test', password: 'incorrect1' })
      .expect(401);

    const login = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo: 'AUTH-FLOW@example.test', password: 'strongpass1' })
      .expect(200);
    expect(login.body).toHaveProperty('accessToken');
    expect(login.body.user.correo).toBe('auth-flow@example.test');

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${login.body.accessToken}`)
      .expect(200);
    expect(me.body).toMatchObject({
      id: register.body.user.id,
      nombre: 'Explorador',
      roles: ['explorador'],
    });
    expect(me.body).not.toHaveProperty('hash_password');
  });

  it('rejects mass assignment and invalid or expired JWTs', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Injected',
        correo: 'mass-assignment@example.test',
        password: 'strongpass1',
        rol: 'admin',
      })
      .expect(400);

    const invalid = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', 'Bearer invalid.token.value')
      .expect(401);
    expect(invalid.body.code).toBe('UNAUTHORIZED');

    const expiredToken = await jwt.signAsync(
      {
        sub: '00000000-0000-4000-8000-000000000001',
        roles: ['explorador'],
        modoActivo: 'explorador',
      },
      { expiresIn: '-1s' },
    );
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });

  it('rotates refresh tokens and revokes their family after reuse', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Refresh',
        correo: 'refresh@example.test',
        password: 'strongpass1',
      })
      .expect(201);

    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: created.body.refreshToken })
      .expect(200);
    expect(rotated.body.refreshToken).not.toBe(created.body.refreshToken);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: created.body.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: rotated.body.refreshToken })
      .expect(401);
  });

  it('logs out a refresh token', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Logout',
        correo: 'logout@example.test',
        password: 'strongpass1',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('authorization', `Bearer ${created.body.accessToken}`)
      .send({ refreshToken: created.body.refreshToken })
      .expect(204);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: created.body.refreshToken })
      .expect(401);
  });

  it('locks an account after the configured failed-attempt threshold', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Locked',
        correo: 'locked@example.test',
        password: 'strongpass1',
      })
      .expect(201);
    await app.get(DataSource).query(
      `UPDATE usuario SET intentos_fallidos = 4
       WHERE correo = $1`,
      ['locked@example.test'],
    );
    const [attempts] = (await app.get(DataSource).query(
      `SELECT intentos_fallidos FROM usuario WHERE correo = $1`,
      ['locked@example.test'],
    )) as Array<{ intentos_fallidos: number }>;
    expect(Number(attempts.intentos_fallidos)).toBe(4);

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo: 'locked@example.test', password: 'incorrect1' })
      .expect(401);
    const failedLogin = (await app.get(DataSource).query(
      `SELECT intentos_fallidos, bloqueado_login_hasta
       FROM usuario WHERE correo = $1`,
      ['locked@example.test'],
    )) as Array<{ intentos_fallidos: number; bloqueado_login_hasta: Date | null }>;
    expect(Number(failedLogin[0].intentos_fallidos)).toBe(5);
    expect(failedLogin[0].bloqueado_login_hasta).not.toBeNull();
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ correo: 'locked@example.test', password: 'strongpass1' })
      .expect(423);
  });

  it("prevents logout from revoking another user's refresh token", async () => {
    const first = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Owner',
        correo: 'owner@example.test',
        password: 'strongpass1',
      })
      .expect(201);
    const second = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        nombre: 'Other',
        correo: 'other@example.test',
        password: 'strongpass1',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('authorization', `Bearer ${first.body.accessToken}`)
      .send({ refreshToken: second.body.refreshToken })
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: second.body.refreshToken })
      .expect(200);
  });
});
