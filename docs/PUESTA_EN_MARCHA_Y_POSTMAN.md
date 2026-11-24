# Trekko: puesta en marcha y pruebas con Postman

Guía para iniciar `trekko-api` y `trekko-mobile` en Windows, probar la app en un teléfono de la misma red Wi-Fi y recorrer la API desde Postman.

## 1. Requisitos

- Node.js 20.x y npm.
- Docker Desktop iniciado con el motor Linux disponible.
- Expo Go instalado en el teléfono.
- PC y teléfono conectados a la misma red Wi-Fi.

Los comandos de esta guía usan PowerShell. Mantén una terminal abierta para el backend y otra para Expo.

## 2. Iniciar el backend

En una terminal PowerShell:

```powershell
cd C:\ruta\a\Trekko\trekko-api
npm ci
```

La configuración local se lee de `.env`. Si no existe, créala desde la plantilla:

```powershell
Copy-Item .env.example .env
```

Con los valores predeterminados del Compose, configura `DATABASE_URL` en `.env` para que use `localhost` cuando ejecutes el seed desde Windows:

```dotenv
DATABASE_URL=postgres://trekko:trekko@localhost:5432/trekko
```

Si cambiaste usuario, contraseña o nombre de base en `docker-compose.yml`/`.env`, usa esos mismos valores aquí. No uses `db` en esta URL cuando ejecutes el seed en el host: `db` solo resuelve dentro de la red de Docker.

Si `docker compose` muestra `failed to connect to the docker API` o `dockerDesktopLinuxEngine`, abre Docker Desktop y espera a que indique que el motor está iniciado. Los avisos de `npm ci` sobre scripts de paquetes no significan que el backend haya fallado.

Inicia Postgres/PostGIS, MinIO y la API:

```powershell
docker compose up -d --build
```

Espera a que estén saludables y consulta:

```powershell
docker compose ps
curl.exe http://localhost:3000/health
curl.exe http://localhost:3000/health/ready
```

La API aplica las migraciones al arrancar. Para poblar o actualizar los POIs y rutas de muestra, ejecuta una vez desde la carpeta `trekko-api`:

```powershell
npm run seed:catalog
```

Comprueba que hay catálogo:

```powershell
curl.exe "http://localhost:3000/api/v1/municipios"
curl.exe "http://localhost:3000/api/v1/pois?limit=5"
curl.exe "http://localhost:3000/api/v1/routes?limit=5"
```

El seed incluye Aguascalientes y sus cuatro Pueblos Mágicos. Horarios y precios son referencias de demostración; confírmalos antes de una visita.

## 3. Probar en el teléfono con Expo Go

Obtén la dirección IPv4 de la PC conectada al Wi-Fi:

```powershell
ipconfig
```

Busca **Dirección IPv4** dentro del adaptador Wi-Fi activo (por ejemplo, `192.168.1.25`). No uses `localhost`, la dirección `exp://...` ni el puerto `8081` como URL de API.

En otra terminal PowerShell. No cierres esta terminal mientras uses la app:

```powershell
cd C:\ruta\a\Trekko\trekko-mobile
npm ci
Set-Content .env.local "EXPO_PUBLIC_API_URL=http://172.20.10.4:3000/api/v1"
npx expo start --lan --clear
```

Revisa `ipconfig` y sustituye `172.20.10.4` por la IPv4 actual del adaptador Wi-Fi si cambió. No uses `localhost`, la dirección `exp://...` ni el puerto `8081` como URL de API. `.env.local` debe quedar así, sin diagonal al final:

```dotenv
EXPO_PUBLIC_API_URL=http://172.20.10.4:3000/api/v1
```

Al iniciar Expo, escanea con Expo Go el QR que imprime la terminal. Mantén abiertas las dos terminales y la PC despierta. `exp://...` y el puerto `8081` son solo para Expo/Metro; el backend está en el puerto `3000`.

Si Expo Go pide la URL manualmente en la red actual, escribe `exp://172.20.10.4:8081` (usa la IPv4 actual si cambió). La URL de API sigue siendo `http://172.20.10.4:3000/api/v1`.

Para comprobar desde el navegador del teléfono que el backend es accesible, abre `http://172.20.10.4:3000/health`; sustituye la IP si cambió. Debe responder `{"status":"ok",...}`.

Si no conecta:

1. Confirma que PC y teléfono estén en la misma Wi-Fi y que la VPN esté desconectada.
2. Prueba en el navegador del teléfono `http://IP_LOCAL_DE_TU_PC:3000/health`.
3. Revisa que `.env.local` use la IPv4 de la PC y el puerto `3000`; reinicia Expo después de cambiarla.
4. Comprueba que Docker publique `3000:3000` con `docker compose ps`.
5. Si el puerto 8081 ya está ocupado, detén el proceso anterior de Expo antes de volver a ejecutar el comando. No confundas ese puerto de Metro con el puerto 3000 del backend.
6. Si la pantalla dice **Perfil sin conexión**, compara la IP del teléfono con `.env.local`: reemplaza la IP vieja, detén Expo con `Ctrl+C` y vuelve a arrancar con `npx expo start --lan --clear`. La variable `EXPO_PUBLIC_API_URL` se incorpora al iniciar Expo; recargar solo la pantalla no actualiza la IP.

## 4. Configurar Postman

La documentación interactiva también está disponible mientras la API corre:

- **Swagger UI (lista visual de todas las rutas del backend):** `http://localhost:3000/api/docs`
- OpenAPI JSON: `http://localhost:3000/api/docs/openapi.json`

Abre Swagger en el navegador de la computadora para consultar las rutas del **backend** y sus contratos. No uses la web de Expo para esta tarea: el frontend se prueba en Expo Go en el teléfono.

Crea un environment de Postman con estas variables:

| Variable | Valor inicial |
|---|---|
| `baseUrl` | `http://localhost:3000/api/v1` |
| `email` | Un correo de prueba único, por ejemplo `prueba-trekko-01@example.com` |
| `password` | Una contraseña de prueba de 8 a 72 caracteres |
| `accessToken` | (vacío; se guarda al registrar o iniciar sesión) |
| `refreshToken` | (vacío; se guarda al registrar o iniciar sesión) |
| `municipioId` | `00000000-0000-4000-8000-000000000002` (Calvillo) |
| `poiId` | (vacío; cópialo de una respuesta de POIs) |
| `rutaId` | `20000000-0000-4000-8000-000000000002` (ruta de Calvillo) |
| `lat` | `21.8464` |
| `lng` | `-102.7186` |
| `fecha` | Una fecha futura con formato `AAAA-MM-DD` |

Para probar desde Postman en la misma PC, usa `localhost`. Para ejecutar Postman en otro dispositivo, cambia `baseUrl` a `http://IP_LOCAL_DE_TU_PC:3000/api/v1`.

En cada request con JSON usa el header:

```http
Content-Type: application/json
Accept: application/json
```

En las requests protegidas agrega:

```http
Authorization: Bearer {{accessToken}}
```

Las siguientes requests están en el orden recomendado.

## 5. Salud del backend

### `GET {{baseUrl}}/../health`

En Postman usa la URL completa `http://localhost:3000/health`. No lleva autenticación.

### `GET {{baseUrl}}/../health/ready`

En Postman usa `http://localhost:3000/health/ready`. Debe indicar que la base de datos y el almacenamiento están disponibles.

## 6. Cuenta y autenticación

### Registrar cuenta

`POST {{baseUrl}}/auth/register`

```json
{
  "nombre": "Prueba Trekko",
  "correo": "{{email}}",
  "password": "{{password}}"
}
```

Respuesta esperada: `201 Created`, con `accessToken`, `refreshToken` y `user`. En la pestaña **Scripts > Post-response** puedes guardar los tokens automáticamente:

```javascript
if (pm.response.code === 201) {
  const body = pm.response.json();
  pm.environment.set("accessToken", body.accessToken);
  pm.environment.set("refreshToken", body.refreshToken);
}
```

El correo debe ser nuevo para cada registro; si ya existe, usa otro valor en `email`. No se envía `aceptaTerminos`.

### Iniciar sesión

`POST {{baseUrl}}/auth/login`

```json
{
  "correo": "{{email}}",
  "password": "{{password}}"
}
```

Respuesta esperada: `200 OK`. Para guardar los tokens también al iniciar sesión:

```javascript
if (pm.response.code === 200) {
  const body = pm.response.json();
  pm.environment.set("accessToken", body.accessToken);
  pm.environment.set("refreshToken", body.refreshToken);
}
```

### Consultar mi cuenta

`GET {{baseUrl}}/auth/me`

Requiere `Authorization: Bearer {{accessToken}}`.

### Renovar tokens

`POST {{baseUrl}}/auth/refresh`

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

Respuesta esperada: `200 OK`. El refresh token es de un solo uso; guarda los nuevos tokens de la respuesta antes de volver a llamar a refresh:

```javascript
if (pm.response.code === 200) {
  const body = pm.response.json();
  pm.environment.set("accessToken", body.accessToken);
  pm.environment.set("refreshToken", body.refreshToken);
}
```

### Cerrar sesión

`POST {{baseUrl}}/auth/logout?all=false`

Requiere `Authorization: Bearer {{accessToken}}`.

```json
{
  "refreshToken": "{{refreshToken}}"
}
```

Respuesta esperada: `204 No Content`. Para revocar todas las sesiones de la familia usa `?all=true`.

## 7. Municipios, POIs y rutas

### Listar municipios

`GET {{baseUrl}}/municipios`

No requiere autenticación. Devuelve los IDs de Aguascalientes, Calvillo, Real de Asientos, San José de Gracia y Pabellón de Hidalgo.

### Listar y filtrar POIs

`GET {{baseUrl}}/pois?municipioId={{municipioId}}&page=1&limit=20`

Parámetros opcionales disponibles:

| Parámetro | Ejemplo | Uso |
|---|---|---|
| `q` | `museo` | Busca por texto |
| `categoria[]` | `cultural` | Categoría; puede repetirse |
| `municipioId` | `{{municipioId}}` | Filtra municipio |
| `costoMin` / `costoMax` | `0` / `100` | Rango de costo |
| `abiertoAhora` | `true` | Filtra por horario actual |
| `ordenar` | `distancia`, `calificacion` o `costo` | Orden |
| `lat` / `lng` | `{{lat}}` / `{{lng}}` | Centro de distancia/orden |
| `page` / `limit` | `1` / `20` | Paginación; `limit` máximo 100 |

En Postman agrega `categoria[]` en la pestaña **Params** (la URL codificada equivale a `categoria%5B%5D=cultural`).

### Buscar POIs cercanos

`GET {{baseUrl}}/pois/nearby?lat={{lat}}&lng={{lng}}&radioM=5000&page=1&limit=20`

Prueba los filtros opcionales descritos para la lista. `lat` y `lng` son obligatorios; `radioM` admite de 1 a 50000 metros.

### Consultar un POI

Primero copia el `id` de un elemento de `GET /pois` a la variable `poiId`; después:

`GET {{baseUrl}}/pois/{{poiId}}`

### Listar rutas publicadas

`GET {{baseUrl}}/routes?municipioId={{municipioId}}&page=1&limit=20`

Filtros opcionales: `tipo` (`original` o `comunitaria`), `municipioId`, `costoMin`, `costoMax`, `duracionMin`, `duracionMax`, `page` y `limit`.

### Consultar detalle de ruta

`GET {{baseUrl}}/routes/{{rutaId}}`

El detalle incluye sus POIs en orden. Los IDs de ruta seed son:

| Municipio | `rutaId` |
|---|---|
| Aguascalientes | `20000000-0000-4000-8000-000000000001` |
| Calvillo | `20000000-0000-4000-8000-000000000002` |
| Real de Asientos | `20000000-0000-4000-8000-000000000003` |
| San José de Gracia | `20000000-0000-4000-8000-000000000004` |
| Pabellón de Hidalgo | `20000000-0000-4000-8000-000000000005` |

## 8. Generar un itinerario

`POST {{baseUrl}}/routes/generate`

Requiere `Authorization: Bearer {{accessToken}}` de un usuario con rol `explorador` (el rol predeterminado al registrarse).

```json
{
  "municipioId": "{{municipioId}}",
  "fecha": "{{fecha}}",
  "horaInicio": "09:00",
  "horaFin": "17:00",
  "personas": 2,
  "ritmo": "normal",
  "presupuestoMax": 1000
}
```

La respuesta contiene `items`, `costoTotal`, `costoEstimado`, `costoPorPersona`, `duracionTotalMin`, `advertencias` y `desglose`. Si quieres usar duración en vez de hora final, reemplaza `horaFin` por `duracionMaxMin`, por ejemplo `360`. Envía exactamente uno de `municipioId` o `centro`, y exactamente uno de `horaFin` o `duracionMaxMin`.

Ejemplo alternativo con centro geográfico:

```json
{
  "centro": {
    "lat": 21.8464,
    "lng": -102.7186,
    "radioM": 5000
  },
  "fecha": "{{fecha}}",
  "horaInicio": "09:00",
  "duracionMaxMin": 360,
  "personas": 2,
  "ritmo": "relajado",
  "categorias": ["cultural", "naturaleza"]
}
```

## 9. Códigos de error comunes

Las respuestas de error usan el formato RFC 7807 (`application/problem+json`) con `status`, `code`, `detail`, `instance` y `requestId`.

- `400`: payload o filtros inválidos. El backend rechaza propiedades no declaradas; revisa nombres, tipos y campos adicionales.
- `401`: token ausente/expirado o credenciales incorrectas.
- `403`: la cuenta no tiene el permiso o rol requerido.
- `404`: recurso inexistente.
- `409`: correo ya registrado.
- `423`: cuenta temporalmente bloqueada tras fallos de login.
- `429`: límite de solicitudes excedido. Registro/login admiten 5 solicitudes por minuto; el límite global es 120 solicitudes por minuto por ruta e IP.

## 10. Endpoints disponibles

| Método | Ruta | Autenticación |
|---|---|---|
| `GET` | `/health` | No |
| `GET` | `/health/ready` | No |
| `POST` | `/api/v1/auth/register` | No |
| `POST` | `/api/v1/auth/login` | No |
| `POST` | `/api/v1/auth/refresh` | No |
| `POST` | `/api/v1/auth/logout` | Sí |
| `GET` | `/api/v1/auth/me` | Sí |
| `GET` | `/api/v1/municipios` | No |
| `GET` | `/api/v1/pois` | No |
| `GET` | `/api/v1/pois/nearby` | No |
| `GET` | `/api/v1/pois/{id}` | No |
| `GET` | `/api/v1/routes` | No |
| `POST` | `/api/v1/routes/generate` | Sí (`explorador`) |
| `GET` | `/api/v1/routes/{id}` | No |

Para crear/cargar POIs y rutas de demostración se usa `npm run seed:catalog`; no hay endpoints públicos de escritura de POIs o rutas.
