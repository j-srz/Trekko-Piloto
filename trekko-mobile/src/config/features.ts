/**
 * Interruptores de secciones para la pantalla Inicio.
 *
 * Uso:
 *   import { features } from '@/config/features';
 *   if (features.mostrarHospedaje) { ... }
 *
 * Secciones marcadas con false no se renderizan en la pantalla,
 * pero el código de sus componentes permanece intacto y listo.
 */
export const features = {
  /** Los POIs se consultan desde el mapa, no con datos de demostración en Inicio. */
  mostrarLugares: false,

  /** Sección "Rutas populares" — listado de rutas. */
  mostrarRutas: true,

  /** El hospedaje no forma parte del alcance de Fase 1. */
  mostrarHospedaje: false,

  /** Grupos es Fase 2; se conserva solo la pestaña estática "Próximamente". */
  mostrarGrupos: false,
} as const;

export type Features = typeof features;
