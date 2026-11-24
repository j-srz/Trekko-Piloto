# Trekko — Paquete de especificaciones para construcción con agentes de IA

> **Fuente de verdad:** `Trekko_Especificaciones.md` (la spec original).
> **Precedencia en caso de conflicto:** spec original → `contratos/` → `01_REGLAS_GLOBALES_Y_ESTRUCTURA.md` → archivo del paso → criterio del agente (nunca).
> Este paquete NO reemplaza la spec: la convierte en pasos ejecutables, ordenados y verificables.

## 1. Cómo se usa

1. Se le da **un solo paso** a un agente (un archivo `db/`, `back/` o `front/`), junto con los archivos de contexto fijos (§5).
2. El agente ejecuta únicamente ese paso, verifica su checklist y actualiza `PROGRESO.md`.
3. Un humano revisa, hace merge y recién entonces se lanza el siguiente paso.
4. Nunca se lanzan dos pasos que modifiquen los mismos archivos en paralelo.

## 2. Árbol del paquete

```
trekko-specs/
├─ 00_LEEME_INDICE_Y_PROTOCOLO.md      ← este archivo
├─ 01_REGLAS_GLOBALES_Y_ESTRUCTURA.md  ← estructura de repo, nombres, convenciones, decisiones
├─ PROGRESO.md                         ← tablero de avance (plantilla)
├─ contratos/
│  ├─ CONTRATO_API_REST.md             ← endpoints, payloads, errores (back y front lo comparten)
│  └─ CONTRATO_WS_SYNC_TOTP.md         ← WebSocket, /sync, TOTP, máquina de estados
├─ db/    DB-01 … DB-07
├─ back/  BACK-01 … BACK-11
├─ front/ FRONT-01 … FRONT-11
└─ qa/    QA-01_Pruebas_Seguridad_y_Aceptacion.md
```

## 3. Orden de ejecución y dependencias

| Paso | Título | Fase | Depende de | Hito |
|---|---|---|---|---|
| DB-01 | Entorno, extensiones, enums, utilidades | 1 | — | H1 |
| BACK-01 | Bootstrap NestJS y capa común | 1 | DB-01 | H1 |
| FRONT-01 | Bootstrap Expo, estructura y tema | 1 | — | H1 |
| DB-02 | Usuarios, catálogo, negocios, POIs | 1 | DB-01 | H2 |
| DB-03 | Seeds base (municipios, categorías, admin, POIs demo) | 1 | DB-02 | H2 |
| BACK-02 | Auth y perfiles | 1 | BACK-01, DB-02 | H2 |
| BACK-03 | Catálogo y POIs | 1 | BACK-02, DB-03 | H2 |
| BACK-05 | Anfitriones: panel interno y suscripción | 1 | BACK-03 | H2 |
| BACK-07 | Seguridad transversal, Docker, CI/CD, respaldos | 1 | BACK-02, 03, 05 | H2 |
| FRONT-02 | Capa de datos: API, sesión, WatermelonDB, sync | 1 | FRONT-01 | H2 |
| FRONT-03 | Pantallas de autenticación | 1 | FRONT-02, BACK-02 | H2 |
| FRONT-04 | Inicio, directorio y ficha de POI | 1 | FRONT-03, BACK-03 | H2 |
| FRONT-05 | Mapa | 1 | FRONT-04 | H2 |
| DB-04 | Rutas, itinerarios, sync_operacion, seed Originals | 1 | DB-03 | H3 |
| BACK-04 | Rutas e itinerarios (generador) | 1 | BACK-03, DB-04 | H3 |
| BACK-06 | Sync offline (`POST /sync`) | 1 | BACK-04 | H3 |
| FRONT-06 | Itinerarios y modo offline | 1 | FRONT-05, BACK-04, BACK-06 | H3 |
| FRONT-07 | Pulido Fase 1: accesibilidad, robustez, build EAS | 1 | FRONT-06 | H4 |
| QA-01 | Pruebas de seguridad y aceptación | 1 | todos F1 | H2/H3/H4 |
| DB-05 | Reputación y gamificación | 2 | DB-04 | — |
| DB-06 | Social, grupos, Viaje Activo | 2 | DB-05 | — |
| DB-07 | Moderación, verificación, promociones, analítica | 2 | DB-06 | — |
| BACK-08 | Gamificación y reputación | 2 | DB-05, BACK-06 | — |
| BACK-09 | Social y grupos | 2 | DB-06, BACK-08 | — |
| BACK-10 | Gateway y Viaje Activo | 2 | BACK-09 | — |
| BACK-11 | Moderación, verificación, portal self-service, analítica | 2 | DB-07, BACK-10 | — |
| FRONT-08 | Perfil, check-in, reseñas, mapa personal | 2 | BACK-08 | — |
| FRONT-09 | Grupos y rutas comunitarias | 2 | BACK-09 | — |
| FRONT-10 | Viaje Activo | 2 | FRONT-09, BACK-10 | — |
| FRONT-11 | Verificación, reportes, modos y portal anfitrión | 2 | BACK-11 | — |

**Regla de fases:** no se inicia ningún paso de Fase 2 hasta que QA-01 de Fase 1 esté aprobado.

## 4. Protocolo obligatorio del agente

| # | Regla |
|---|---|
| R1 | Ejecuta **solo** el paso asignado. Si descubres trabajo extra, anótalo en `docs/DECISIONES.md` sección "Pendientes"; no lo hagas. |
| R2 | Respeta las **rutas y nombres exactos** del paso y de `01_REGLAS_GLOBALES…`. Si necesitas un archivo que no está listado, justifícalo en `docs/DECISIONES.md` antes de crearlo. |
| R3 | Solo toca los archivos de la sección **"Archivos permitidos"** del paso. |
| R4 | Si algo contradice la spec original o falta un dato: **detente y pregunta**. No inventes valores, endpoints, columnas ni dependencias. |
| R5 | Verifica **antes de empezar** los prerrequisitos del paso (comandos incluidos). Si fallan, no continúes. |
| R6 | Cada tarea numerada termina en **un commit** (Conventional Commits, §ver 01). |
| R7 | Ningún paso se da por terminado sin: lint ✔, tests ✔, build ✔, checklist de aceptación 100 % marcada y `PROGRESO.md` actualizado. |
| R8 | Nunca debilitar un control de seguridad ni una regla de estructura para "hacer pasar" un test. |
| R9 | Las pruebas se escriben junto con el código del paso, no después. |
| R10 | Entrega siempre el **reporte de cierre** (§6). |

## 5. Contexto fijo que se adjunta a cada paso

1. `00_LEEME_INDICE_Y_PROTOCOLO.md` (§4 y §6)
2. `01_REGLAS_GLOBALES_Y_ESTRUCTURA.md`
3. El/los contratos relevantes de `contratos/`
4. El archivo del paso
5. Cuando el agente lo necesite: `Trekko_Especificaciones.md` (solo las secciones citadas en "Spec origen")

### Prompt de inicio de paso (copiar y pegar)

```text
Eres un agente de ingeniería en el proyecto Trekko. Sigue el protocolo del archivo 00 (§4).
Contexto adjunto: 00, 01, contratos relevantes y el archivo del paso <ID>.
Tarea: ejecuta ÚNICAMENTE el paso <ID>, en el orden de sus tareas, un commit por tarea.
Restricciones: no cambies estructura, nombres ni rutas; no toques archivos fuera de "Archivos permitidos";
si hay contradicción o dato faltante, DETENTE y pregunta.
Al finalizar entrega el reporte de cierre (§6 del archivo 00) y actualiza PROGRESO.md.
```

### Prompt de revisión (después de cada paso, con un agente distinto)

```text
Audita la rama del paso <ID> contra: (a) su checklist de aceptación, (b) las reglas del archivo 01,
(c) los contratos. Lista violaciones de estructura (módulos que importan repositorios ajenos, SQL fuera de
repositories/, nombres distintos a los definidos, endpoints no contemplados). No corrijas: solo reporta con archivo y línea.
```

## 6. Reporte de cierre (obligatorio)

```text
PASO: <ID>   RAMA: step/<ID>   COMMITS: <n>
ARCHIVOS CREADOS: …        ARCHIVOS MODIFICADOS: …
COMANDOS DE VERIFICACIÓN Y RESULTADO: lint / test / build / migraciones
CHECKLIST DE ACEPTACIÓN: (copiar con [x]/[ ])
DECISIONES O DUDAS REGISTRADAS EN docs/DECISIONES.md: …
RIESGOS CONOCIDOS: …
```

## 7. Definición de "Hecho" común a todos los pasos

- `pnpm lint`, `pnpm test` y `pnpm build` del/los workspaces afectados terminan sin errores.
- Migraciones: `up` y `down` ejecutan limpias sobre una BD vacía (pasos DB y BACK que migren).
- Cero secretos en el repo; `.env.example` actualizado si se agregó una variable.
- Swagger actualizado (pasos BACK con endpoints) y `contratos/` consistente con lo implementado.
- Sin `console.log`, sin `any` no justificado, sin `TODO` sin entrada en `docs/DECISIONES.md`.
- `PROGRESO.md` actualizado.

## 8. Hitos de la spec (Tabla 53) ↔ pasos

| Hito | Semana | Pasos | Criterio de salida |
|---|---|---|---|
| H1 | 4 | DB-01, BACK-01, FRONT-01 | Arquitectura y entorno listos; prototipo UX validado |
| H2 | 10 | DB-02/03, BACK-02/03/05/07, FRONT-02…05 | v0.1 en tiendas; OWASP básico superado; primeras afiliaciones |
| H3 | 16 | DB-04, BACK-04/06, FRONT-06 | Generador + Offline-First en beta; SUS ≥ 68 |
| H4 | 20 | FRONT-07, QA-01 final | v1.0 y piloto en San José de Gracia |
