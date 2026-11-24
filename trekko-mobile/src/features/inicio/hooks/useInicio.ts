/**
 * Hook que expone los datos de la pantalla Inicio.
 *
 * Retorna: { cargando, error, datos, estaOffline, recargar }
 *
 * - La pantalla en app/ solo importa este hook.
 * - Nunca importa los datos de ejemplo directamente.
 */

import { useCallback, useEffect, useState } from 'react';
import { obtenerInicio } from '../data/repositorio';
import type { DatosInicio } from '../types';

interface EstadoInicio {
  cargando: boolean;
  error: string | null;
  datos: DatosInicio | null;
  estaOffline: boolean;
}

interface UseInicioReturn extends EstadoInicio {
  /** Fuerza una nueva carga. Útil para "Reintentar" y pull-to-refresh. */
  recargar: () => void;
}

export function useInicio(): UseInicioReturn {
  const [estado, setEstado] = useState<EstadoInicio>({
    cargando: true,
    error: null,
    datos: null,
    estaOffline: false,
  });

  const cargar = useCallback(async () => {
    setEstado((prev) => ({ ...prev, cargando: true, error: null }));
    try {
      const { datos, estaOffline } = await obtenerInicio();
      setEstado({ cargando: false, error: null, datos, estaOffline });
    } catch (e) {
      const mensaje =
        e instanceof Error ? e.message : 'Ocurrió un error inesperado.';
      setEstado((prev) => ({
        ...prev,
        cargando: false,
        error: mensaje,
        estaOffline: false,
      }));
    }
  }, []);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return { ...estado, recargar: cargar };
}

