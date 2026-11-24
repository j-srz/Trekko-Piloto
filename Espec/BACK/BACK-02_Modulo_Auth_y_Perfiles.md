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
