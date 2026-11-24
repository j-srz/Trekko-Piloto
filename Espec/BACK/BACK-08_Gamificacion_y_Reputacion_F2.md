# BACK-08 — Módulo Gamificación y reputación (Fase 2)

**Fase:** 2 · **Depende de:** DB-05, BACK-06 · **Spec origen:** §3.5.2, §3.7.2, §5.1, §5.3 (Tabla 43), §5.4 (Tablas 45–46), RF-15, RF-17 · **CU:** 10

## 1. Objetivo
Check-ins verificados con antifraude, reseñas por criterios, `CalculadorReputacion`, puntos con límites diarios, insignias, mapa personal, ranking y canje de recompensas con QR de un solo uso. Promueve a **Creador** por actividad verificada.

## 2. Prerrequisitos
QA-01 de F1 aprobado; DB-05 migrada; `/sync` operativo.

## 3. Archivos permitidos
`apps/api/src/modules/gamificacion/**`, `apps/api/test/gamificacion.e2e-spec.ts`, `packages/contracts/**`.

## 4. Estructura exacta

```
modules/gamificacion/
├─ index.ts                       # exporta GamificacionService (otorgarPuntos), eventos
├─ gamificacion.module.ts
├─ controllers/{checkins.controller.ts, resenas.controller.ts, mapa-personal.controller.ts, canjes.controller.ts, recompensas.controller.ts}
├─ dto/…
├─ services/{checkin.service.ts, antifraude.service.ts, resena.service.ts, calculador-reputacion.ts, puntos.service.ts, insignias.service.ts, canje.service.ts, promocion-creador.service.ts}
├─ repositories/{checkin.repository.ts, resena.repository.ts, puntos.repository.ts, insignia.repository.ts, canje.repository.ts, recompensa.repository.ts}
├─ entities/…
├─ sync/{checkin.sync-handler.ts, resena.sync-handler.ts}
├─ config/puntos.config.ts        # tabla de puntos y topes (D-13)
└─ events/{checkin-registrado.event.ts, resena-creada.event.ts, social-llegada.listener.ts}
```

## 5. Tareas

1. **Check-in (`POST /checkins`, E-30 y handler `checkin.registrar`).** Reglas de `AntifraudeService`, **todas** obligatorias:
   - Distancia al POI `ST_Distance` ≤ **100 m** (método `gps`) → si no, `UBICACION_LEJANA`.
   - `precisionM` reportada ≤ 50 m → si no, `PRECISION_INSUFICIENTE`.
   - **Desplazamiento imposible:** velocidad implícita entre este check-in y el anterior del usuario > 150 km/h → `DESPLAZAMIENTO_IMPOSIBLE`.
   - **Un check-in por POI por usuario por día** (otro → `LIMITE_DIARIO`).
   - Idempotencia: `op_id` único.
   - La hora usada es `ocurridoEn`, no la de recepción.
   Al aceptar: inserta `check_in`, otorga puntos (tarea 4), emite `gamificacion.checkin.registrado` tras el commit.
2. **`CalculadorReputacion`** (clase pura y probada):
```ts
puntuacionVisible(R, v, C, m = 10) = (v*R + m*C) / (v + m)
pesoSegunReputacion(reputacion /*0..5*/) = 1 + 0.5 * (reputacion / 5)          // D-15
promedioPonderado(resenas) = Σ(peso_i * calificacion_i) / Σ peso_i
```
   `C` = promedio global de calificaciones de todos los POIs (consulta agregada en `resena.repository`). **Pruebas obligatorias** con la Tabla 43 (C=4.0, m=10): A (R=5.0,v=2) → **4.17**; B (R=4.5,v=40) → **4.40**; C (R=2.0,v=3) → **3.54** (redondeo a 2 decimales).
3. **Reseñas (`POST /resenas`, E-31 y handler `resena.crear`).** Solo si el `checkInId` es del usuario, verificado y sin reseña previa (`uq_resena_check_in`); criterios 1–5 (`precio`, `servicio`, `accesibilidad`, `facilidadLlegada`); `calificacion = round(avg(precio, servicio, accesibilidad))` (D-08, **`facilidadLlegada` no entra**); fotos ≤ 4 (claves de objeto ya subidas al almacén, validadas por prefijo `resenas/<usuarioId>/`); `peso` con `pesoSegunReputacion`. Tras guardar: recalcula `R`, `v` del POI y emite `gamificacion.resena.creada` con `{poiId, numResenas, calificacionPromedio, puntuacionVisible}` (el módulo `catalogo` lo persiste).
4. **Puntos (`PuntosService`, tabla `puntos_movimiento`):** valores de `config/puntos.config.ts` (D-13): check-in 10, reseña sin foto 10, reseña con foto 20, publicar ruta 30 (evento `rutas.ruta.publicada`), uso de ruta 5 (evento `rutas.ruta.usada`), municipio nuevo 50 (primer check-in del usuario en ese municipio). **Tope diario 100** (sin contar `municipio_nuevo`). Idempotencia por `uq_puntos_referencia`. Actualiza `usuario.puntos` en la misma transacción **a través de un método público de `auth`** (`AuthService.ajustarPuntos`, agregado a su `index.ts` en este paso).
5. **Insignias (`InsigniasService`):** evaluador por tipo de `requisito` (las 6 de DB-05). Se ejecuta al escuchar `checkin.registrado`, `resena.creada` y `viaje.finalizado`. Inserta en `usuario_insignia` (PK evita duplicados) y devuelve las nuevas.
6. **Promoción a Creador (`PromocionCreadorService`):** al escuchar check-ins/reseñas, si el usuario acumula **≥ 5 check-ins verificados y ≥ 3 reseñas** y no tiene el rol → `AuthService.otorgarRol(usuarioId,'creador')`. También retira el rol por sanción vigente (`auth.sancion.aplicada`).
7. **Mapa personal y ranking:** `GET /mapa-personal` (municipios y POIs visitados, % de exploración por municipio), `GET /insignias/mias`, `GET /ranking` (top por puntos del mes, alias sin datos sensibles).
8. **Recompensas y canjes:** `GET /recompensas` (activas y vigentes). `POST /canjes {recompensaId}` en **una transacción** con `SELECT … FOR UPDATE` sobre `usuario`: valida puntos suficientes, vigencia y **tope mensual por usuario**; descuenta puntos (movimiento negativo), crea `canje` con `codigo` aleatorio de 128 bits (se devuelve en claro **una sola vez**; se guarda su sha256 en `codigo_hash`), `expira_en` = 30 días. `POST /canjes/validar {codigo}`: solo el anfitrión dueño del negocio de la recompensa (o admin); en transacción marca `usado` y **rechaza reuso con 409 `CANJE_USADO`**.
9. **Listener `social.llegada.confirmada`:** crea `check_in` con `metodo='codigo_grupo'` (la regla de 100 m se sustituye por la verificación del servidor de social; `distancia_m` viene del evento).
10. **Pruebas:** reglas de antifraude una por una; Tabla 43; reseña doble → 409; reseña sin check-in → 400/403; tope diario; canje con puntos insuficientes (400), tope mensual (409), **dos validaciones simultáneas del mismo QR → una sola `ok`**; promoción a Creador exactamente al 5.º check-in y 3.ª reseña; el código de canje nunca aparece en BD en claro.

## 6. Reglas obligatorias
- Una reseña **no existe** sin check-in verificado.
- `gamificacion` no escribe en `poi` ni `usuario` directamente: usa eventos / métodos públicos de `catalogo` y `auth`.
- Ninguna ubicación exacta de usuarios en logs.

## 7. Criterios de aceptación
- [ ] Pruebas de la tarea 10 verdes (incluida Tabla 43 exacta).
- [ ] E-30…E-33 en Swagger conforme a contrato.
- [ ] Mismo `op_id` reenviado por `/sync` no duplica check-in ni puntos.
- [ ] `lint:arch` verde.

## 8. Prohibido
Calificar `facilidadLlegada` dentro de la calificación general · puntos sin libro (`puntos_movimiento`) · QR reutilizable.
EOF
cat > BACK-09_Social_y_Grupos_F2.md <<'EOF'
# BACK-09 — Módulo Social: grupos, secreto/TOTP y calificación entre pares (Fase 2)

**Fase:** 2 · **Depende de:** DB-06, BACK-08 · **Spec origen:** §3.5.3, §3.6.4, §3.8.2 (Tabla 24), §3.12, §5.1 (comunidades recurrentes), §5.3 (karma), RF-10, RF-11, RF-16, RNF-10 · **CU:** 06, 07

## 1. Objetivo
Publicar y administrar Grupos Públicos con cupo transaccional, generar y entregar el secreto de grupo, calcular TOTP, calificación entre viajeros (karma) y grupos recurrentes.

## 2. Prerrequisitos
DB-06 migrada. Leer `contratos/CONTRATO_WS_SYNC_TOTP.md` §3 y §6.

## 3. Archivos permitidos
`apps/api/src/modules/social/**` (excepto `gateway/` y `viaje/`, que son de BACK-10), `apps/api/test/social-grupos.e2e-spec.ts`.

## 4. Estructura exacta

```
modules/social/
├─ index.ts                       # exporta SocialService (esMiembroActivo, obtenerGrupo), eventos
├─ social.module.ts
├─ controllers/{grupos.controller.ts, calificaciones.controller.ts, karma.controller.ts}
├─ dto/{crear-grupo.dto.ts, grupo.dto.ts, grupo-listado.query.dto.ts, crear-calificacion-par.dto.ts}
├─ services/{grupos.service.ts, secreto-grupo.service.ts, totp.service.ts, recurrencia.service.ts, calificacion-par.service.ts, karma.service.ts}
├─ repositories/{grupo.repository.ts, grupo-miembro.repository.ts, calificacion-par.repository.ts}
├─ entities/…
├─ sync/…                          # (BACK-10)
├─ gateway/ y viaje/               # (BACK-10)
└─ events/…
```

## 5. Tareas

1. **`SecretoGrupoService`:** genera 20 bytes aleatorios; cifra/descifra con **AES-256-GCM** (`GRUPO_SECRET_KEY`, IV aleatorio por registro, formato `iv‖tag‖ciphertext`); nunca loguea ni serializa el secreto en claro salvo en `GET /grupos/:id/secreto`.
2. **`TotpService`:** RFC 6238 (HMAC-SHA1, 6 dígitos, paso 180 s). `generar(secreto, t)` y `validar(secreto, codigo, t, ventana=1)` con comparación en tiempo constante. **Pruebas con vectores de RFC 6238** (los de SHA-1, adaptando el paso) y una prueba cruzada documentada para que el cliente use los mismos.
3. **`POST /grupos` (E-34):** precondiciones — ruta `publicada`; el usuario **sin sanción vigente** (consulta a `AuthService.tieneSancionVigente`); `fecha` futura; `cupo` ≥ 2; horarios de los POIs compatibles con `fecha`. Si `puntoEncuentro` no está a ≤ 150 m de un POI con `punto_seguro=true` → respuesta 201 con `advertencias: ['PUNTO_ENCUENTRO_NO_SEGURO']` y la lista de sugerencias (`CatalogoService` expone `puntosSegurosCercanos`) (A1 del CU-06). Crea `grupo` (organizador = `grupo_miembro` activo, `miembros_count=1`), genera secreto, **y deja programado el `viaje_activo`** con sus `evento_viaje` copiados de `ruta_poi` (mismo `SocialService`, una sola transacción).
4. **`POST /grupos/:id/unirse` (E-36) — idempotente y con control de cupo:**
```
BEGIN;
SELECT … FROM grupo WHERE id=$1 FOR UPDATE;           -- bloquea la fila
si el usuario ya es miembro activo        → 200 { estado: 'ya_era_miembro' }
si usuario con sanción vigente            → 403 CUENTA_SUSPENDIDA
si estado no en (abierto)                 → 409 ESTADO_INVALIDO
si miembros_count >= cupo                 → 409 CUPO_LLENO
INSERT grupo_miembro (…) ON CONFLICT (grupo_id,usuario_id) DO UPDATE SET estado='activo' WHERE grupo_miembro.estado <> 'activo';
UPDATE grupo SET miembros_count = miembros_count + 1, estado = (CASE WHEN miembros_count + 1 = cupo THEN 'lleno' ELSE estado END);
COMMIT;
```
5. **Salir / cancelar (E-37):** `salir` (miembro; el organizador no puede salir, debe cancelar o transferir — solo cancelar en esta fase), decrementa `miembros_count` y reabre si estaba `lleno`; `DELETE /grupos/:id` (organizador; no si el viaje está `activo`/`en_votacion`) → `cancelado` + notificación (BACK-10).
6. **Listados:** `GET /grupos` (abiertos, filtros `municipioId`, `desde`, `rutaId`, `cupoDisponible`), `GET /grupos/:id`, `GET /grupos/mios`. Nunca devuelven `secreto_grupo`.
7. **`GET /grupos/:id/secreto` (E-38):** solo miembros activos; devuelve el secreto en **base32**; con `Cache-Control: no-store`; rate limit estricto.
8. **Recurrentes:** `RecurrenciaService.siguienteOcurrencia(grupo)` calcula la próxima `fecha` según `recurrencia` (zona horaria `America/Mexico_City`); al finalizar un viaje (evento `social.viaje.finalizado`), el grupo vuelve a `abierto` con la nueva fecha y se programa un nuevo `viaje_activo` (el índice `uq_viaje_activo_vigente` lo permite).
9. **Calificación entre pares (E-41):** `POST /viajes/:id/calificaciones` solo si el viaje está `resenado` y ambos fueron miembros con asistencia; una por pareja (único); no a uno mismo. **`GET /usuarios/:id/karma`** devuelve **solo agregados** (salidas completadas, promedios por criterio, etiquetas más frecuentes); **nunca** quién calificó qué. Actualiza `usuario.reputacion` vía `AuthService.ajustarReputacion`. Reglas anti-venganza: solo salidas completadas; las calificaciones que se desvían > 2 puntos de la media del grupo y tienen un reporte asociado se marcan para revisión (no se promedian hasta resolverse).
10. **Escucha `auth.sancion.aplicada`:** expulsa (`estado='expulsado'`) de grupos aún no iniciados cuando la sanción es suspensión/bloqueo.
11. **Pruebas:** TOTP (vectores); cifrado ida y vuelta del secreto; **20 `unirse` simultáneos a un grupo con 1 lugar libre → exactamente 1 éxito, el resto `CUPO_LLENO`**; `unirse` repetido → 200 `ya_era_miembro` sin duplicar; usuario sancionado no puede crear ni unirse; el secreto no aparece en ninguna respuesta salvo E-38 y solo a miembros; karma no revela evaluadores; grupo recurrente se reabre tras finalizar.

## 6. Reglas obligatorias
- Control de cupo **solo** dentro de la transacción con bloqueo de fila.
- `secreto_grupo` siempre cifrado en reposo.
- Respuestas de karma siempre agregadas.

## 7. Criterios de aceptación
- [ ] Prueba de concurrencia de cupo pasa 20 ejecuciones seguidas.
- [ ] Vectores RFC 6238 y prueba cruzada documentada.
- [ ] E-34…E-38 y E-41 en Swagger conforme a contrato.
- [ ] `lint:arch` verde.

## 8. Prohibido
Contar cupo con `COUNT(*)` fuera de transacción · exponer `secreto_grupo` en DTOs de listado · publicar quién calificó a quién.
EOF