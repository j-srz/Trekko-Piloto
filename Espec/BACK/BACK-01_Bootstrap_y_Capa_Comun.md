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
EOF
cat > BACK-02_Modulo_Auth_y_Perfiles.md <<'EOF'
# BACK-02 — Módulo Autenticación y perfiles

**Fase:** 1 · **Depende de:** BACK-01, DB-02 · **Spec origen:** §3.7 (Tabla 19), §3.8.3 (registro y login), §5.1, RF-01, RF-02, RNF-03 · **CU:** 01, 02

## 1. Objetivo
Registro, login, refresh con rotación y detección de reutilización, logout, perfil y cambio de modo activo; guards reales.

## 2. Prerrequisitos
`GET /health` OK; tablas `usuario` y `refresh_token` migradas.

## 3. Archivos permitidos
`apps/api/src/modules/auth/**`, `apps/api/src/common/guards/**`, `apps/api/test/auth.e2e-spec.ts`, `packages/contracts/**` (solo agregar tipos de auth).

## 4. Estructura exacta

```
modules/auth/
├─ index.ts                        # exporta AuthService (métodos públicos), UsuarioPublicoDto, eventos
├─ auth.module.ts
├─ controllers/{auth.controller.ts, perfil.controller.ts}
├─ dto/{register.dto.ts, login.dto.ts, refresh.dto.ts, actualizar-perfil.dto.ts, cambiar-modo.dto.ts}
├─ services/{auth.service.ts, token.service.ts, usuarios.service.ts}
├─ repositories/{usuario.repository.ts, refresh-token.repository.ts}
├─ entities/{usuario.entity.ts, refresh-token.entity.ts}
├─ strategies/jwt.strategy.ts
└─ events/usuario-registrado.event.ts
```
(`reporte`, `sancion`, `verificacion_identidad` se agregan en BACK-11.)

## 5. Tareas

1. **Entidades y repositories** para `usuario` y `refresh_token` según DB-02. `hash_password` con `select:false`.
2. **`TokenService`:** access JWT (`HS256`, 15 min, claims `{sub, roles, modo}`); refresh = 32 bytes aleatorios (base64url), guardado como **sha256**; familia por sesión.
3. **`POST /auth/register`** (`@Publico()`): DTO — `nombre` 2–80, `correo` válido y normalizado a minúsculas, `password` 8–72 **bytes** (bcrypt corta en 72), `aceptaAviso: true` obligatorio. Verifica correo libre; hash bcrypt `BCRYPT_COST` (12). Si el correo existe → **409 `CORREO_EN_USO` con mensaje genérico**. Devuelve usuario + tokens (201). Emite `auth.usuario.registrado`.
4. **`POST /auth/login`:** busca por correo; si no existe, compara contra un **hash ficticio** (mismo costo) para igualar tiempos; error siempre `401 CREDENCIALES_INVALIDAS` genérico. Cuenta `suspendida`/`bloqueada` → 403 `CUENTA_SUSPENDIDA`. **Throttle propio:** `LOGIN_THROTTLE_LIMIT` por minuto por IP+correo.
5. **`POST /auth/refresh`:** valida hash, no expirado, no usado, no revocado → marca `usado_en`, crea nuevo token en la misma familia, emite nuevo access. **Si el token ya estaba usado → revocar toda la familia** (`revocado_en`) y responder 401 (detección de robo).
6. **`POST /auth/logout`:** revoca la familia del refresh recibido (idempotente).
7. **`JwtStrategy` + `JwtAuthGuard` real** (global). `RolesGuard` ya existe: probar la jerarquía.
8. **Perfil:** `GET /perfil`, `PATCH /perfil` (solo `nombre`), `POST /perfil/modo` (solo si el rol está en `roles`; actualiza `modo_activo`).
9. **Método público** `AuthService.otorgarRol(usuarioId, rol)` y `retirarRol(...)` (los usarán gamificación y anfitriones por `index.ts`; en F1 solo `admin` los usa vía anfitriones). Nunca permite otorgar `admin` por API pública.
10. **Opcional (D-10) — Google Sign-In:** `POST /auth/google` verifica el ID token **con la librería oficial de Google** (sin hacer peticiones a URLs dadas por el usuario); crea/vincula cuenta. Solo si el humano lo autoriza; si no, omitir.
11. **Pruebas** (unit + e2e), obligatorias:
    - registro feliz; correo repetido (409 genérico); contraseña de 7 caracteres y de 73 bytes (400).
    - login correcto; credenciales inválidas **con el mismo mensaje y código** para correo inexistente vs. contraseña mala.
    - 6 intentos de login en un minuto → 429.
    - access expirado → 401 `TOKEN_EXPIRADO`.
    - **refresh reutilizado** → familia revocada y el refresh "nuevo" deja de funcionar.
    - `POST /perfil/modo` a un rol no poseído → 403.
    - Ninguna respuesta contiene `hashPassword`.

## 6. Reglas obligatorias
- bcrypt costo ≥ 10; nunca registrar contraseñas, tokens ni hashes en logs.
- Mensajes de auth genéricos (no revelar qué dato falló).
- Todo acceso a BD vía `repositories/`.

## 7. Criterios de aceptación
- [ ] Todos los tests de la tarea 11 pasan.
- [ ] Swagger documenta E-01…E-07 con los esquemas de `CONTRATO_API_REST §4.1`.
- [ ] `lint:arch` verde.
- [ ] Verificado manualmente: respuesta de login nunca incluye hash.
- [ ] Tiempo de login con correo inexistente ≈ con correo existente (±20 %).

## 8. Prohibido
Tokens de refresh en JWT · guardar el refresh en claro · endpoints para asignar `admin` · devolver `hash_password`.
EOF
cat > BACK-03_Modulo_Catalogo_POIs.md <<'EOF'
# BACK-03 — Módulo Catálogo y POIs

**Fase:** 1 · **Depende de:** BACK-02, DB-03 · **Spec origen:** §3.3, §3.6.2, §3.4 (Tabla 15), RF-03, RF-04, RNF-01 · **CU:** 03

## 1. Objetivo
Directorio geolocalizado: búsqueda por cercanía y filtros, ficha con contacto directo, listado delta para caché local, catálogos de categorías y municipios, y la lógica de `destacado` por eventos de suscripción.

## 2. Prerrequisitos
Login funciona (BACK-02); seed con POIs demo (DB-03).

## 3. Archivos permitidos
`apps/api/src/modules/catalogo/**`, `apps/api/test/catalogo.e2e-spec.ts`, `packages/contracts/**` (tipos de POI).

## 4. Estructura exacta

```
modules/catalogo/
├─ index.ts                              # exporta CatalogoService (público): obtenerPoisPorIds, alternativasCercanas, existenPoisActivos, actualizarPuntuacion
├─ catalogo.module.ts
├─ controllers/{poi.controller.ts, catalogo-referencias.controller.ts}
├─ dto/{poi-cercanos.query.dto.ts, poi-listado.query.dto.ts, poi-resumen.dto.ts, poi-detalle.dto.ts}
├─ services/{catalogo.service.ts, horario.service.ts, enlaces-contacto.service.ts}
├─ repositories/{poi.repository.ts, categoria.repository.ts, municipio.repository.ts}
├─ entities/{poi.entity.ts, categoria.entity.ts, municipio.entity.ts}
└─ events/suscripcion.listener.ts
```

## 5. Tareas

1. **Entidades y repositories.** Todas las consultas parametrizadas. La consulta de cercanía **debe** ser equivalente a:

```sql
SELECT p.*, ST_Distance(p.ubicacion::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography) AS distancia_m
FROM poi p
WHERE p.activo = true
  AND ST_DWithin(p.ubicacion::geography, ST_SetSRID(ST_MakePoint($1,$2),4326)::geography, $3)   -- $1=lng, $2=lat, $3=radio en metros
  AND ($4::text[] IS NULL OR p.categoria_id IN (SELECT id FROM categoria WHERE slug = ANY($4)))
  AND ($5::numeric IS NULL OR p.costo_promedio <= $5)
  AND ($6::smallint IS NULL OR p.municipio_id = $6)
ORDER BY distancia_m ASC   -- o destacado DESC, distancia_m ASC si orden=destacado
LIMIT $7 OFFSET $8;
```
   Prohibido concatenar strings. Para `orden` usar un `switch` con lista blanca, nunca interpolar.
2. **`HorarioService.estaAbierto(horario, fechaHora)`**: función pura (formato de `CONTRATO_API_REST §4.2`): revisa `excepciones[fecha]` primero, luego el día de la semana; intervalos `[abre, cierra)`; `24:00` válido; maneja intervalos que cruzan medianoche **solo si** `cierra < abre` (se interpreta como día siguiente). Devuelve `null` si `horario` está vacío (desconocido).
3. **`EnlacesContactoService`:** a partir de `contacto.whatsapp` (E.164) construye `https://wa.me/<digitos>` y de `contacto.telefono` construye `tel:+…`. Nunca confía en URLs del cliente.
4. **`GET /pois/cercanos` (E-08):** DTO `lat` (-90..90), `lng` (-180..180), `radioM` (def. 5000, 100–50000), `categoria` (slugs separados por coma, validados contra la lista), `costoMax`, `municipioId`, `abiertoEn` (ISO; filtra con `HorarioService` tras la consulta), `orden`, `page`, `limit`. Respuesta paginada de `PoiResumen`.
5. **`GET /pois/:id` (E-09):** `PoiDetalle` con `resenas: { total: 0, items: [] }` en F1 y `negocio` resumido. UUID inválido → 404 (no 500).
6. **`GET /pois` (E-10):** filtros `municipioId`, `categoria`, `costoMax`, `q` (búsqueda por `ILIKE`/trigram parametrizada), `actualizadoDesde`. Con `actualizadoDesde` incluye POIs `activo=false` y ordena por `updated_at ASC` para paginar de forma estable.
7. **`GET /categorias` y `GET /municipios` (E-11).**
8. **`CatalogoService` público** (para otros módulos): `obtenerPoisPorIds(ids)`, `existenPoisActivos(ids)`, `alternativasCercanas(poiId, {categoriaId?, radioM, limite})`, `actualizarPuntuacion(poiId, {numResenas, calificacionPromedio, puntuacionVisible})`.
9. **`suscripcion.listener.ts`:** escucha `anfitriones.suscripcion.activada`/`.vencida` y actualiza `poi.destacado` de los POIs del `negocio_id` (única vía para cambiar `destacado`).
10. **Rendimiento (RNF-01):** test que con 5 000 POIs sintéticos `GET /pois/cercanos` responde < 1 s (p95 local) y `EXPLAIN` usa `idx_poi_ubicacion_geog`.
11. **Pruebas:** `HorarioService` (domingo cerrado, 24 h, excepción de feriado, cruce de medianoche, vacío→null); cercanía (orden, radio, filtros combinados); inyección (`categoria=x'; DROP TABLE poi;--` → 400 o sin efecto); `lat` fuera de rango → 400; `limit=1000` → 400; listado delta con inactivos.

## 6. Reglas obligatorias
- Solo `repositories/` ejecuta SQL. `destacado` solo lo cambia el listener.
- Las fichas no exponen `negocio.propietario_id` ni datos de usuarios.
- El módulo **no** lee tablas de otros módulos (no hace JOIN a `suscripcion`).

## 7. Criterios de aceptación
- [ ] E-08…E-11 conformes a `CONTRATO_API_REST §4.2` (Swagger incluido).
- [ ] Prueba de rendimiento y de índice pasan.
- [ ] Pruebas de inyección y validación pasan.
- [ ] `lint:arch` verde.

## 8. Prohibido
JOIN a tablas de otros módulos · construir SQL por concatenación · devolver el listado sin paginar.
EOF