# BACK-01 — Bootstrap de NestJS y capa común

**Fase:** 1 · **Depende de:** DB-01 · **Spec origen:** §3.1, §3.3, §3.5.4, §3.6.3, §3.7, RNF-03, RNF-07, RNF-08 · **Hito:** H1

## 1. Objetivo
Dejar `apps/api` funcionando con la estructura exacta de `01 §2`, la capa común (guards, filtros, DTO de paginación, config validada), Swagger, health check, pruebas y las **reglas de frontera de módulos verificadas en CI**. Sin lógica de negocio.

## 2. Prerrequisitos
`pnpm --filter api db:migrate` funciona (DB-01). Node y pnpm fijados.

## 3. Archivos permitidos
Todo bajo `apps/api/` (excepto `src/modules/*/` salvo los `index.ts` vacíos y `*.module.ts` esqueleto), `packages/contracts/`, `.dependency-cruiser.cjs`, `.github/workflows/ci.yml` (solo lint/test/build).

## 4. Tareas

1. **Crear proyecto Nest** (TypeScript `strict: true`, `noImplicitAny`). Paquetes: `@nestjs/config`, `@nestjs/typeorm`, `typeorm`, `pg`, `class-validator`, `class-transformer`, `helmet`, `@nestjs/throttler`, `@nestjs/swagger`, `@nestjs/event-emitter`, `@nestjs/schedule`, `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `nestjs-pino`, `zod`, `jest`, `supertest`. Versiones **fijadas exactas**.
2. **Esqueleto de módulos.** Crear los 7 módulos de `01 §2` (carpetas internas de `01 §2.1` vacías, con `index.ts` vacío y `<modulo>.module.ts` mínimo). Los módulos de Fase 2 (`gamificacion`, `social`, `analitica`) quedan **solo con la carpeta y un `.gitkeep`**.
3. **Config validada.** `config/env.schema.ts` (zod) con **todas** las variables de `01 §5` que apliquen a Fase 1; el arranque falla con mensaje claro si falta una requerida. `config/configuration.ts` tipado.
4. **`main.ts`:** `helmet()`, CORS desde `CORS_ORIGINS` (lista; nunca `*` en producción), `ValidationPipe({whitelist:true, forbidNonWhitelisted:true, transform:true})`, prefijo global **ninguno**, `trust proxy` configurado para Nginx, apagado ordenado (`enableShutdownHooks`).
5. **Common:**
   - `JwtAuthGuard` (global por defecto; decorador `@Publico()` lo omite) — **implementación de la estrategia en BACK-02**; aquí solo el esqueleto y el decorador.
   - `RolesGuard` + `@Roles(...)` con jerarquía de `01 §4`.
   - `@UsuarioActual()`.
   - `HttpExceptionFilter`: formato de error de `CONTRATO_API_REST §1`; **nunca** devuelve stack ni mensajes de BD; incluye `requestId`.
   - Interceptor `request-id` y logging con Pino (redacción de `authorization`, `password`, `refreshToken`).
   - `PaginacionDto` (`page`, `limit` con tope 50) y helper `respuestaPaginada()`.
   - `utils/dinero.ts` (centavos), `utils/fechas.ts`, `utils/geo.ts` (haversine, `puntoDesde(lat,lng)` con **lng primero**).
6. **Throttler global** (`THROTTLE_*`), respuesta 429 con `DEMASIADAS_PETICIONES`.
7. **TypeORM:** `TypeOrmModule.forRootAsync` con `synchronize:false`, `autoLoadEntities:true`, `logging` solo errores.
8. **Swagger** en `/docs` (deshabilitado en `NODE_ENV=production` salvo `SWAGGER_ENABLED=true`); `GET /health` (`@Publico()`) que verifica conexión a BD.
9. **Frontera de módulos** — `.dependency-cruiser.cjs` con reglas:
   - `no-cross-module-internals`: prohibido importar `modules/<a>/(repositories|entities|dto|services|controllers)/…` desde `modules/<b>/…` (solo `modules/<a>/index.ts`).
   - `sql-only-in-repositories`: prohibido importar `typeorm` (`QueryRunner`, `DataSource`, `EntityManager`, `Repository`) en `controllers/` y `services/`.
   - `contracts-no-logic`: `packages/contracts` no importa de `apps/*`.
   Script `pnpm --filter api lint:arch` y paso obligatorio en CI.
10. **`packages/contracts`:** enums `Rol`, `EstadoRuta`, `TipoRuta`, `PlanSuscripcion`, `EstadoSuscripcion` y los tipos de `CONTRATO_API_REST` (§4) exportados. Solo tipos/enums/constantes.
11. **Pruebas base:** unitaria del filtro de errores; e2e de `/health`, del 400 de validación (campo desconocido rechazado) y del 429.
12. **CI mínima** (`ci.yml`): instalar, `lint`, `lint:arch`, `test`, `build`.

## 5. Reglas obligatorias
- Ningún módulo importa a otro salvo por `index.ts`. Ningún SQL fuera de `repositories/`.
- Respuestas de error nunca incluyen `stack`, nombres de tabla ni mensajes del driver.
- Sin lógica de negocio en este paso.

## 6. Criterios de aceptación
- [ ] `pnpm --filter api start:dev` arranca; `GET /health` → 200.
- [ ] Arranque sin una variable obligatoria falla con mensaje claro.
- [ ] `POST` con campo extra → 400 `DATOS_INVALIDOS`.
- [ ] `lint:arch` falla si se introduce a propósito un import prohibido (probado y revertido).
- [ ] Estructura de carpetas idéntica a `01 §2` (los 7 módulos presentes).
- [ ] CI verde.

## 7. Prohibido
`app.enableCors()` abierto · `synchronize:true` · endpoints de negocio · dependencias no listadas sin registrarlas en `docs/DECISIONES.md`.
