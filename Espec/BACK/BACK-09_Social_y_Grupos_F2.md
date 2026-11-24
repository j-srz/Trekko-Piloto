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
