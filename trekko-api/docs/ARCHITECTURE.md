# Trekko backend architecture

## H0 foundation

The H0 backend is a strict TypeScript NestJS application on Node.js 20. PostgreSQL 16/PostGIS is accessed through TypeORM with `synchronize: false` and startup migrations. The reversible bootstrap migration installs PostGIS, citext, and pg_trgm.

Configuration is parsed once by Zod during Nest configuration initialization. The application refuses to start without valid database, JWT, encryption-key, and S3-compatible storage settings. `.env.example` lists the complete environment contract.

## Runtime surfaces

- `GET /health` is a liveness probe and does not depend on external services.
- `GET /health/ready` checks PostgreSQL and the configured MinIO/S3 bucket.
- Swagger UI and OpenAPI JSON are served at `/api/docs` and `/api/docs/openapi.json`.
- NestJS Pino emits request-correlated logs with `x-request-id`; authorization headers, passwords, and token fields are redacted.
- `AllExceptionsFilter` returns RFC 7807 problem details and omits internal exception messages from 5xx responses.

## Structure

- `src/config`: Zod environment validation and typed app, database, security, and storage settings.
- `src/common`: clock, cryptographic primitives, Pino options, and the global exception filter.
- `src/health`: liveness and dependency readiness endpoints.
- `src/storage`: S3-compatible client and storage readiness check.
- `src/database`: TypeORM configuration, migration, and startup logging.
- `test/integration` and `test/e2e`: Testcontainers/PostGIS migration and HTTP smoke coverage.

## Local development

Copy `.env.example` to `.env` for direct local starts, or use `docker compose up -d --build` for the API, PostGIS, and MinIO stack. Compose supplies local-only development defaults so it can start without an `.env` file.

Run `npm run typecheck`, `npm run test`, `npm run test:int`, `npm run test:e2e`, and `npm run test:cov` before submitting changes. Testcontainers requires a working Docker daemon.
