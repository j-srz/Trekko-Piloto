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
