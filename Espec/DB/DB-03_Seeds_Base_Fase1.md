# DB-03 — Seeds base de Fase 1

**Fase:** 1 · **Depende de:** DB-02 · **Spec origen:** §1.1, §1.4 (Tabla 2), §2.1, §3.9.2, §6.5 · **Hito:** H2

## 1. Objetivo
Cargar datos mínimos para desarrollar y probar: municipios, categorías, usuario `admin`, usuario del sistema (autor de Trekko Originals) y POIs **demo** (marcados como no verificados). Los ≥ 300 POIs reales se cargarán después por CLI (BACK-05).

## 2. Prerrequisitos
DB-02 migrada. Variables `ADMIN_SEED_CORREO` y `ADMIN_SEED_PASSWORD` definidas en `.env` local (no en el repositorio).

## 3. Archivos permitidos
`apps/api/src/database/seeds/{index.ts,municipios.ts,categorias.ts,usuarios.ts,ppois-demo.ts}` (sin espacio en el nombre real: `pois-demo.ts`), script `seed:dev` en `apps/api/package.json`.

## 4. Datos

**Municipios** (`clave`, `nombre`, `es_pueblo_magico`): `aguascalientes` (capital, false), `calvillo` (true), `real-de-asientos` (true), `san-jose-de-gracia` (true), `pabellon-de-hidalgo` (true).
Los `centroide` se cargan desde un CSV `seeds/data/municipios.csv` **provisto por el equipo**. Si el archivo no existe, el agente **se detiene y lo solicita** (no inventa coordenadas).

**Categorías** (`slug`, `nombre`, `tipo_gasto`): `restaurante` (Restaurantes, comida) · `hospedaje` (Hospedaje, hospedaje) · `artesania` (Artesanías, compra) · `atractivo` (Atractivos y cultura, acceso) · `aventura` (Aventura, actividad) · `guia` (Guías, actividad).

**Usuarios**
- `admin`: correo y contraseña desde variables de entorno; `roles = {explorador, admin}`, `modo_activo = admin`; hash con bcrypt costo 12; `acepto_aviso_en = now()`.
- `sistema`: correo `sistema@trekko.local`, sin login posible (`proveedor_auth='local'` con hash de un valor aleatorio descartado); es el `autor_id` de Trekko Originals.

**POIs demo**: 12 registros ficticios claramente marcados (`nombre` con prefijo `[DEMO]`, `verificado_en_campo=false`), 2–3 por municipio, con horarios variados (incluye uno cerrado en domingo y uno 24 h), costos 0–400 MXN, contactos con números de prueba `+520000000000`.

## 5. Tareas
1. Seeds idempotentes (`INSERT … ON CONFLICT DO NOTHING/UPDATE`) — correr dos veces no duplica.
2. Comando `pnpm --filter api seed:dev` que **se niega a ejecutarse** si `NODE_ENV=production`.
3. Test que verifica 5 municipios, 6 categorías, 1 admin, 1 sistema y 12 POIs tras ejecutar el seed dos veces.

## 6. Criterios de aceptación
- [ ] Seed idempotente y bloqueado en producción.
- [ ] Ninguna contraseña ni coordenada inventada en el repositorio.
- [ ] `[DEMO]` visible en todos los POIs de prueba.

## 7. Prohibido
Seeds con credenciales reales · POIs sin marca demo · ejecutar seeds en producción.
