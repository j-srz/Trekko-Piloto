# BACK-06 — Sincronización offline (`POST /sync`)

**Fase:** 1 (base) · extendida en Fase 2 · **Depende de:** BACK-04, DB-04 · **Spec origen:** §3.6.4 (Figura 9), §3.12, RF-07, RF-14, RNF-02, RNF-10

## 1. Objetivo
Un único endpoint idempotente que recibe operaciones hechas sin conexión, las despacha a **handlers registrados por cada módulo** y responde un resultado por operación. En Fase 1 solo maneja itinerarios.

## 2. Prerrequisitos
`ItinerariosService` operativo (BACK-04); tabla `sync_operacion` (DB-04). Leer `contratos/CONTRATO_WS_SYNC_TOTP.md` §1.

## 3. Archivos permitidos
`apps/api/src/common/sync/**`, `apps/api/src/modules/rutas/sync/itinerario.sync-handler.ts`, `apps/api/test/sync.e2e-spec.ts`.

## 4. Estructura exacta

```
common/sync/
├─ sync.module.ts
├─ sync.controller.ts            # POST /sync
├─ sync.service.ts               # orquesta: idempotencia + transacción por operación
├─ sync-registry.ts              # mapa tipo → handler (descubierto por decorador)
├─ sync-handler.decorator.ts     # @SyncHandler('tipo')
├─ sync-handler.interface.ts     # { ejecutar(usuarioId, datos, ctx): Promise<ResultadoSync> }
├─ dto/sync-request.dto.ts
└─ repositories/sync-operacion.repository.ts
```

## 5. Tareas

1. **DTO:** `operaciones` array 1–100; cada una `{ opId (uuid v4), tipo (string ≤ 60), datos (objeto), ocurridoEn (ISO, no más de 5 min en el futuro) }`. Cuerpo máximo 1 MB.
2. **Registro de handlers:** `@SyncHandler('itinerario.guardar')` sobre una clase `Injectable`; `SyncRegistry` los descubre en el arranque (`DiscoveryService`). Dos handlers con el mismo tipo → el arranque falla.
3. **`SyncService.procesar(usuarioId, operaciones)`:** para cada operación, **en orden**:
   1. Si `opId` ya existe en `sync_operacion` (mismo usuario) → resultado `duplicada` con el `resultado`/`estado` original; **no** reejecuta. Si existe de **otro** usuario → `rechazada: DATOS_INVALIDOS`.
   2. Tipo desconocido → `rechazada: TIPO_DESCONOCIDO` (se registra).
   3. Abrir transacción → ejecutar handler → insertar en `sync_operacion` (`ok` o `rechazada`+motivo) → commit. Excepción inesperada → rollback de **esa** operación y `rechazada: ERROR_INTERNO` (sin detalles); continuar con las demás.
4. **Handlers F1** (en `modules/rutas/sync/`): `itinerario.guardar` y `itinerario.eliminar` llaman a `ItinerariosService` (misma validación que el REST; `opId` se propaga como `op_id` del itinerario).
5. **Respuesta:** `{ resultados: [{ opId, estado, motivo?, resultado? }] }` — 200 aunque haya rechazos individuales.
6. **Throttle** específico (p. ej. 30 req/min por usuario).
7. **Pruebas:**
   - 3 operaciones válidas → 3 `ok`.
   - **Reenvío del mismo lote** → `duplicada` ×3, sin filas nuevas de itinerario.
   - Lote mixto (1 válida, 1 tipo desconocido, 1 con datos inválidos) → solo la válida persiste.
   - `opId` de otro usuario → rechazada.
   - 101 operaciones → 400.
   - Un handler que lanza error no afecta a las siguientes.
   - Concurrencia: dos requests simultáneos con el mismo `opId` → una `ok` y la otra `duplicada`/conflicto controlado (PK en `sync_operacion`).

## 6. Reglas obligatorias
- Cada operación en su propia transacción; el servicio de sync **no** conoce la lógica de negocio.
- Los módulos de Fase 2 se registran añadiendo handlers, **sin modificar** `SyncService`.
- El tiempo de negocio se toma de `ocurridoEn`, nunca de la hora de recepción.

## 7. Criterios de aceptación
- [ ] Todas las pruebas de la tarea 7 pasan.
- [ ] Reenvío idempotente demostrado.
- [ ] Añadir un handler nuevo no requiere tocar `common/sync`.
- [ ] `lint:arch` verde.

## 8. Prohibido
Procesar el lote en una sola transacción · usar `Date.now()` para decidir ventanas de negocio · reejecutar operaciones duplicadas.
