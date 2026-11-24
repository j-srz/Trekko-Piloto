# BACK-11 — Moderación, verificación de identidad, portal self-service y analítica (Fase 2)

**Fase:** 2 · **Depende de:** DB-07, BACK-10 · **Spec origen:** §2.6, §3.3, §3.7.3, §5.1, §5.2, §5.3 (Tabla 44), §6.3 (Tabla 49), RF-18, RF-19, RF-20, RF-21 · **CU:** 11, 12

## 1. Objetivo
Cerrar la Fase 2: reportes con sanciones progresivas, Perfil Verificado, portal self-service del anfitrión (reclamo, promociones, estadísticas por plan) e indicadores anonimizados para entidades institucionales.

## 2. Prerrequisitos
DB-07 migrada; almacén de objetos S3-compatible disponible; BACK-10 aprobado.

## 3. Archivos permitidos
`apps/api/src/modules/auth/**` (reportes, sanciones, verificación), `apps/api/src/modules/anfitriones/**` (portal), `apps/api/src/modules/analitica/**`, `apps/api/src/common/storage/**` (cliente de almacén), `apps/api/test/{moderacion,portal,analitica}.e2e-spec.ts`.

## 4. Estructura nueva

```
modules/auth/{controllers/{reportes.controller.ts, verificacion.controller.ts, admin-moderacion.controller.ts}, services/{reportes.service.ts, sanciones.service.ts, verificacion.service.ts, purga-verificacion.job.ts}, repositories/{reporte,sancion,verificacion-identidad}.repository.ts, entities/…}
modules/anfitriones/{controllers/{portal-negocios.controller.ts, promociones.controller.ts, estadisticas.controller.ts}, services/{reclamo-negocio.service.ts, promociones.service.ts, estadisticas.service.ts}, repositories/{promocion,poi-evento}.repository.ts}
modules/analitica/{index.ts, analitica.module.ts, controllers/analitica.controller.ts, services/indicadores.service.ts, repositories/indicadores.repository.ts}
common/storage/{storage.port.ts, s3.adapter.ts}
```

## 5. Tareas

1. **Reportes (`POST /reportes`, E-43):** DTO (`reportadoId`, `grupoId?`, `viajeId?`, `motivo`, `gravedad`, `descripcion` ≤ 1000); no a uno mismo; un reporte abierto por `(reportante, reportado, viaje)`; rate limit.
2. **Sanciones progresivas (`SancionesService`, Tabla 44):** al **validar** un reporte (`POST /admin/reportes/:id/validar`, admin): 1.º validado de conducta leve → `advertencia`; 2.º → `suspension` 7 días; 3.º → `suspension` 30 días + marca para revisión de perfil; gravedad `grave` (acoso, violencia) → `bloqueo` inmediato (`usuario.estado='bloqueada'`, **conserva registros**). Valores en `config/sanciones.config.ts` (editable). Emite `auth.sancion.aplicada`. Al vencer una suspensión, el job diario restaura `estado='activa'`.
3. **Verificación de identidad (E-44):** `POST /verificacion` recibe `tipoDocumento` y devuelve una **URL prefirmada de subida** (PUT, caducidad 5 min) hacia una clave `identidad/<usuarioId>/<uuid>` con **cifrado del lado del servidor del almacén**; registra `verificacion_identidad` con `fecha_purga = ahora + 30 días`. Admin resuelve (`/admin/verificaciones/:id/resolver`): `aprobada` → `perfil_verificado=true`. **`purga-verificacion.job.ts`** (diario): borra el objeto del almacén, pone `objeto_clave=NULL`, `estado='purgada'` al llegar `fecha_purga`. La imagen **nunca** pasa por el api ni se loguea.
4. **Reclamo de negocio (E-45):** `POST /negocios/:id/reclamar` envía un **código de 6 dígitos al WhatsApp registrado de la ficha** (vía puerto `MensajeriaPort`; en dev, stub que lo escribe en log local), válido 10 min, 5 intentos máx.; `…/confirmar {codigo}` → `negocio.propietario_id` y `verificado=true` y `AuthService.otorgarRol(usuarioId,'anfitrion')`. Un negocio ya verificado no se puede reclamar (409). `GET /negocios/mios`.
5. **Promociones (E-46):** CRUD limitado al dueño y **solo con plan Premium activo** (`AnfitrionesService.obtenerPlan`); fechas coherentes; máx. 3 activas.
6. **Estadísticas (E-47):** vistas, contactos (WhatsApp/llamada), guardados y reseñas desde `poi_evento`/`gamificacion`; plan **gratuito = básicas** (totales del mes), **Premium = completas** (series por día, comparación con el mes anterior). Registro de eventos: `catalogo` emite o escribe `poi_evento` mediante un método público de `anfitriones` (`registrarEventoPoi`), sin PII.
7. **Analítica (E-48):** `@Roles('institucional')`; consulta **solo** las vistas `vw_analitica_*`; parámetros `municipioId`, `desde`, `hasta` (máx. 12 meses); respuesta agregada; **celdas con < 5 usuarios distintos no se devuelven** (ya garantizado por la vista; test de regresión). Sin ningún identificador de persona.
8. **Colectivo verificado:** campo/flag administrativo (`admin`) para insignia comunitaria (§5.1); solo bandera, sin lógica adicional.
9. **Pruebas:** escala de sanciones paso a paso (advertencia → 7 d → 30 d) y bloqueo inmediato por gravedad; usuario suspendido no puede unirse/crear grupos; purga elimina el objeto y limpia `objeto_clave`; reclamo con código correcto/incorrecto/vencido; no se puede reclamar un negocio ajeno verificado; promoción sin Premium → 403; estadísticas básicas vs. completas; analítica con 4 usuarios en una celda → no aparece; con 5 → aparece; un explorador llamando a analítica → 403.

## 6. Reglas obligatorias
- Imágenes de identidad: cifradas, conservadas lo mínimo, sin pasar por logs.
- Analítica nunca devuelve datos individuales.
- Bloqueos conservan registros para requerimientos legales.

## 7. Criterios de aceptación
- [ ] Todas las pruebas de la tarea 9 pasan.
- [ ] E-43…E-48, A-10, A-11 en Swagger conforme a contrato.
- [ ] Revisión OWASP repetida para los endpoints nuevos (reporte en `qa/`).
- [ ] `lint:arch` verde.

## 8. Prohibido
Guardar documentos de identidad en la BD o en logs · consultas de analítica sobre tablas base · aplicar sanciones sin validación de un admin (salvo la regla explícita de gravedad, que también pasa por validación).
