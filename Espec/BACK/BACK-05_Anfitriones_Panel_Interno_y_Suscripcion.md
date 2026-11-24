# BACK-05 — Módulo Portal de anfitriones: panel interno y suscripción (Fase 1)

**Fase:** 1 · **Depende de:** BACK-03 · **Spec origen:** §1.5, §3.3 (Tabla 14), §6.3 (Tablas 49–50), RF-08, D-09, D-11 · **CU:** 11 (alta)

## 1. Objetivo
Que **el equipo** dé de alta negocios y POIs, importe POIs por CSV, genere enlaces de pago de la suscripción Premium ($200 MXN/mes), reciba la confirmación de pago y mantenga el posicionamiento destacado. Sin portal self-service (Fase 2).

## 2. Prerrequisitos
BACK-03 aprobado; usuario `admin` sembrado.

## 3. Archivos permitidos
`apps/api/src/modules/anfitriones/**`, `apps/api/src/modules/catalogo/controllers/admin-poi.controller.ts` y `catalogo/services/admin-catalogo.service.ts` (endpoints A-02), `apps/api/src/cli/**`, `apps/api/test/anfitriones.e2e-spec.ts`.

## 4. Estructura exacta

```
modules/anfitriones/
├─ index.ts                       # exporta AnfitrionesService (obtenerPlan, esPropietario) y eventos
├─ anfitriones.module.ts
├─ controllers/{admin-negocios.controller.ts, negocios.controller.ts, pagos-webhook.controller.ts}
├─ dto/{crear-negocio.dto.ts, actualizar-negocio.dto.ts, crear-suscripcion.dto.ts}
├─ services/{negocios.service.ts, suscripciones.service.ts, suscripcion-vencimiento.job.ts}
├─ pasarela/{pasarela-pago.port.ts, mercadopago.adapter.ts, stub.adapter.ts, pasarela.factory.ts}
├─ repositories/{negocio.repository.ts, suscripcion.repository.ts}
├─ entities/{negocio.entity.ts, suscripcion.entity.ts}
└─ events/{suscripcion-activada.event.ts, suscripcion-vencida.event.ts}
apps/api/src/cli/import-pois.command.ts
```

## 5. Tareas

1. **Negocios (A-01):** `POST /admin/negocios` y `PATCH /admin/negocios/:id` (`@Roles('admin')`). Datos: nombre, categoría, contacto (`telefono`, `whatsapp` E.164 validado). Todo cambio se registra en la bitácora (log estructurado con `adminId`).
2. **POIs administrables (A-02)** en `catalogo`: `POST/PATCH/DELETE /admin/pois` (baja lógica `activo=false`). Validaciones: coordenadas dentro del bounding box del estado de Aguascalientes (configurable), `horario` con el esquema de `CONTRATO_API_REST §4.2`, `negocio_id` existente. El `destacado` **no** se acepta en el DTO.
3. **Importador CSV** `pnpm --filter api cli:import-pois <archivo.csv> [--dry-run]`: columnas `nombre,categoria_slug,municipio_clave,lat,lng,costo_promedio,duracion_visita_min,horario_json,telefono,whatsapp,direccion,descripcion`. Valida fila por fila, reporta errores con número de línea, inserta en transacción, idempotente por `(nombre, municipio, ubicación)`. `--dry-run` no escribe.
4. **Puerto de pasarela:**
```ts
interface PasarelaPagoPort {
  crearEnlacePago(input: { suscripcionId: string; montoMxn: number; descripcion: string; correoNegocio?: string }): Promise<{ url: string; referencia: string }>;
  verificarWebhook(headers: Record<string,string>, rawBody: Buffer): { valido: boolean; referencia?: string; estadoPago?: 'aprobado'|'rechazado'|'pendiente' };
}
```
   Adaptador por defecto Mercado Pago (D-11) y `StubAdapter` para desarrollo/pruebas. `pasarela.factory.ts` elige por `PASARELA`. Las llamadas salientes usan **solo hosts fijos del proveedor** (sin URLs del usuario — A10).
5. **Suscripciones (A-03/A-04):**
   - `POST /admin/negocios/:id/suscripciones` crea registro `estado=pendiente`, `plan=premium`, monto 200, genera `enlace_pago` y `referencia_pasarela`.
   - `POST /admin/suscripciones/:id/activar` (confirmación manual, p. ej. pago por transferencia): `estado=activa`, `vigencia_inicio=hoy`, `vigencia_fin=+1 mes`; en **una transacción**; emite `anfitriones.suscripcion.activada` tras el commit. `…/cancelar` análogo.
   - **Una sola activa por negocio** (índice `uq_suscripcion_activa_por_negocio`): intento duplicado → 409.
6. **Webhook `POST /pagos/webhook` (E-22):** `@Publico()` pero **verifica la firma** (`PASARELA_WEBHOOK_SECRET`) con comparación en tiempo constante sobre el cuerpo crudo; idempotente por `referencia_pasarela`; pago aprobado → misma activación que la tarea 5. Firma inválida → 401 sin detalles; cuerpo enorme (> 100 KB) → 400.
7. **Job diario** (`@nestjs/schedule`, `suscripcion-vencimiento.job.ts`): marca `vencida` las suscripciones con `vigencia_fin < hoy` y emite `anfitriones.suscripcion.vencida`.
8. **`PATCH /negocios/:id` (E-21):** `@Roles('anfitrion')` + verificación de **propiedad** (`propietario_id = usuario actual`); campos limitados a contacto y nombre. Otro usuario → 403/404. (El portal completo es Fase 2.)
9. **Pruebas:** alta de negocio y POI por admin (y 403 para un explorador); importador con CSV bueno y con filas malas; activación manual → el POI queda `destacado` (por evento, vía `catalogo`); vencimiento quita `destacado`; webhook con firma válida/ inválida/ repetido; doble suscripción activa → 409; `PATCH /negocios/:id` por no-dueño → rechazo.

## 6. Reglas obligatorias
- Ningún endpoint `/admin/*` sin `@Roles('admin')`.
- `anfitriones` **no** escribe en `poi`; solo emite eventos (la actualización de `destacado` la hace `catalogo`).
- El webhook nunca confía en el cuerpo sin verificar firma.
- Sin UI web (D-09): la operación del equipo es por Swagger + CLI.

## 7. Criterios de aceptación
- [ ] A-01…A-04, E-21, E-22 conformes a contrato y en Swagger.
- [ ] CLI procesa un CSV de 300 filas en una sola transacción y reporta errores por línea.
- [ ] Activar/vencer suscripción cambia `destacado` solo vía evento.
- [ ] Firma de webhook inválida nunca activa nada.
- [ ] `lint:arch` verde.

## 8. Prohibido
Escribir `poi.destacado` desde este módulo · procesar pagos entre viajeros y prestadores (la pasarela solo cobra la suscripción) · guardar datos de tarjeta.
