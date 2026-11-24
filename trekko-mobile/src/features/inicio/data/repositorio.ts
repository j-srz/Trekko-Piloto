/**
 * Repositorio de datos para la pantalla Inicio.
 *
 * Hoy devuelve los datos de ejemplo con una pausa simulada.
 * Cuando el backend esté listo, solo cambias la implementación
 * de `obtenerInicio` — el hook y los componentes no se tocan.
 *
 * Interruptores para forzar estados de UI (sin tocar componentes):
 *   SIMULAR_ERROR   → true para ver el estado de error con "Reintentar"
 *   SIMULAR_OFFLINE → true para ver el aviso "Sin conexión"
 *   RETARDO_MS      → ajusta la duración del spinner/esqueleto
 */

import { DATOS_INICIO_EJEMPLO } from './datosEjemplo';
import type { DatosInicio } from '../types';

const RETARDO_MS    = 800;   // ms que tarda la carga simulada
const SIMULAR_ERROR  = false; // true → estado de error + "Reintentar"
const SIMULAR_OFFLINE = false; // true → aviso "Sin conexión"

export interface RespuestaInicio {
  datos: DatosInicio;
  estaOffline: boolean;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Obtiene los datos de la pantalla Inicio.
 * Hoy: datos de ejemplo con retardo simulado.
 * Futuro: fetch al backend o consulta a SQLite.
 */
export async function obtenerInicio(): Promise<RespuestaInicio> {
  await esperar(RETARDO_MS);

  if (SIMULAR_ERROR) {
    throw new Error('Error de red simulado — activa tu conexión e intenta de nuevo.');
  }

  return {
    datos: DATOS_INICIO_EJEMPLO,
    estaOffline: SIMULAR_OFFLINE,
  };
}

