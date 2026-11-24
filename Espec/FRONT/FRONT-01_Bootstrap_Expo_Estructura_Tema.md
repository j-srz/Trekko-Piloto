# FRONT-01 — Bootstrap de Expo, estructura, tema y reglas de frontera

**Fase:** 1 · **Depende de:** — · **Spec origen:** §3.1, §3.2, §3.11, RNF-05, RNF-06, RNF-09 · **Hito:** H1

## 1. Objetivo
Proyecto `apps/mobile` con la estructura exacta de `01 §2`, navegación por pestañas (**Inicio, Grupos, Mapa, Perfil**), sistema de diseño con los tokens de marca, componentes base accesibles y lint de fronteras.

## 2. Prerrequisitos
Monorepo pnpm creado; `packages/contracts` existe (BACK-01) o se crea vacío.

## 3. Archivos permitidos
Todo bajo `apps/mobile/`; `.github/workflows/ci.yml` (job móvil: lint, tipos, test).

## 4. Tareas

1. **Crear app Expo** (TypeScript estricto, SDK estable vigente, versiones fijadas) con **expo-router**. Configurar `app.config.ts` (nombre Trekko, esquema `trekko`, permisos de ubicación **solo "mientras se usa"** con texto explicativo en español). Habilitar **development build** (EAS) — WatermelonDB no corre en Expo Go.
2. **Estructura:** crear exactamente las carpetas de `01 §2` (`app/`, `src/core/{api,auth,db,sync,theme,a11y,config,conectividad,i18n}`, `src/features`, `src/shared/ui`). Pantallas de `(tabs)` con placeholders: `inicio`, `grupos`, `mapa`, `perfil` en ese orden.
3. **Tema (`core/theme/tokens.ts`):**

| Token | Valor |
|---|---|
| `colores.azulProfundo` | `#0A3641` |
| `colores.verdeAventura` | `#00A86B` |
| `colores.terracota` | `#F4A261` |
| `colores.blancoHueso` (fondo) | `#F8F9FA` |
| `espacio.margenLateral` | 24 |
| `radio.tarjeta` / `radio.boton` | 16 / 12 |
| `tactil.minimo` | 48 (Android dp) / 44 (iOS pt) |

   Verificar **contraste ≥ 4.5:1** de cada combinación texto/fondo usada (función de prueba en `core/a11y/contraste.ts` con test). Si una combinación de marca no cumple (p. ej. terracota con texto blanco), definir variante accesible y documentarlo.
4. **Componentes base (`shared/ui`)**: `Pantalla`, `Boton` (estado `cargando` que **deshabilita** el toque), `Tarjeta`, `Campo`, `Chip`, `Banner` (offline/errores), `EstadoVacio`, `Cargando`. Todos con `accessibilityLabel/Role/State`, área táctil mínima, y que respeten el tamaño de fuente del sistema (`allowFontScaling`). **Nunca** comunican estado solo con color (texto o icono incluido).
5. **i18n simple:** `core/i18n/es.ts` con todas las cadenas; prohibido texto literal en pantallas.
6. **Reglas de frontera (ESLint `no-restricted-imports`):** pantallas y componentes **no** importan `axios`/`fetch` wrappers de `core/api` ni `@nozbe/watermelondb`; solo `features/*/services` y `core/*` pueden. Test del lint (import prohibido a propósito falla).
7. **Pruebas:** Jest + React Native Testing Library; test de render de cada componente base y de contraste.
8. **CI móvil:** `lint`, `tsc --noEmit`, `test`.

## 5. Reglas obligatorias
- Smartphone-first; tablets con la misma interfaz escalable (layouts por `flex`, sin anchos fijos).
- Sin cadenas literales en español dentro de componentes.

## 6. Criterios de aceptación
- [ ] La app abre en development build con 4 pestañas en el orden indicado.
- [ ] Test de contraste verde para todas las combinaciones del tema.
- [ ] El lint rechaza el import prohibido (probado).
- [ ] Todos los componentes base con etiquetas de accesibilidad.

## 7. Prohibido
Expo Go como entorno objetivo · AsyncStorage para tokens · textos literales en pantallas · colores fuera del tema.
