# Trekko API

NestJS H0 backend foundation for Trekko, using Node.js 20, PostgreSQL 16/PostGIS, TypeORM migrations, Pino, and Swagger.

Business endpoints use the `/api/v1` prefix. Health checks remain at `/health` and `/health/ready`.

## Start locally

Use Docker Compose to start the API, PostGIS, and MinIO with health checks and initialized buckets:

```powershell
docker compose up -d --build
curl.exe http://localhost:3000/health
curl.exe http://localhost:3000/health/ready
```

For running the API outside Compose, copy `.env.example` to `.env`, update the credentials, and start PostGIS and MinIO separately. Zod validates all required settings at startup; the encryption key must decode from base64 to exactly 32 bytes.

The liveness endpoint is `/health`; readiness is `/health/ready`. OpenAPI is available at `/api/docs` and `/api/docs/openapi.json`.
With the stack running, `npm run openapi:export` writes the current contract to `docs/openapi.json`.
To regenerate the checked-in OpenAPI contract without a running API, use `npm run openapi:generate`.

## Seed data

After starting the database, run `npm run seed:catalog` to apply migrations and idempotently seed four municipalities, 40 fictional POIs, and four Trekko Original routes.

## Quality checks

```powershell
npm run lint
npm run typecheck
npm run test
npm run test:int
npm run test:e2e
npm run test:cov
npm run build
```

The integration and e2e suites launch isolated PostGIS containers through Testcontainers and require Docker. Unit coverage enforces at least 85% lines and 80% branches.

## Database migrations

Migrations run automatically during application startup. To run or revert explicitly against the configured `DATABASE_URL`, use `npm run migration:run` and `npm run migration:revert`.

## Local development security

Compose defaults are intended only for local development. Replace all credentials with managed secrets in deployed environments. The storage readiness check calls the configured bucket, and application logs redact authorization headers, passwords, and token fields.
