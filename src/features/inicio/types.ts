/**
 * Tipos del dominio para la pantalla Inicio de Trekko.
 *
 * Regla: ningún componente usa datos sueltos.
 * Todos reciben un objeto de alguno de estos tipos.
 */

import type { Grupo } from '../grupos/types';
import type { CoordenadaMapa } from '../mapa/types';

// ─── Categorías ───────────────────────────────────────────────────────────────

export type Categoria = 'Todos' | 'Naturaleza' | 'Aventura' | 'Cultura';

// ─── Lugar ────────────────────────────────────────────────────────────────────

export interface Lugar {
  id: string;
  nombre: string;
  municipio: string;
  /** Ruta local `require(...)` o URL remota. */
  imagen: number | string;
  /** Precio de entrada en pesos MXN. Omitido = gratuito. */
  precio?: number;
  calificacion: number;
  reseñas: number;
  categoria: Categoria;
  coordenada?: CoordenadaMapa;
  distancia?: string;
  fecha?: string;
  descripcion?: string;
  organizadoPor?: string;
  organizadorUsuario?: string;
  organizadorBiografia?: string;
  recomendacion?: {
    autor: string;
    comentario: string;
  };
}

// ─── Ruta ─────────────────────────────────────────────────────────────────────

export interface Ruta {
  id: string;
  nombre: string;
  municipio: string;
  imagen: number | string;
  /** Texto libre, ej. "15–30 hrs" o "1:30h". */
  duracion: string;
  /** Precio de la ruta en pesos MXN. Omitido = gratuita. */
  precio?: number;
  /** Número de destinos o puntos de interés dentro de la ruta. */
  destinos: number;
  calificacion: number;
  reseñas: number;
  categoria: Categoria;
  coordenada?: CoordenadaMapa;
  organizador?: {
    nombre: string;
    usuario: string;
    biografia: string;
  };
  puntosInteres?: {
    nombre: string;
    descripcion: string;
    duracion: string;
    coordenada?: CoordenadaMapa;
  }[];
  incluye?: string[];
  hospedajeRecomendadoId?: string;
}

// ─── Hospedaje ────────────────────────────────────────────────────────────────

export interface Hospedaje {
  id: string;
  nombre: string;
  /** Zona o municipio donde está ubicado. */
  zona: string;
  coordenada?: CoordenadaMapa;
  imagen: number | string;
  /** Precio por noche en pesos MXN. Omitido = consultar. */
  precioPorNoche?: number;
  calificacion: number;
  reseñas: number;
  distancia?: string;
  capacidad?: number;
  descripcion?: string;
  amenidades?: string[];
  anfitrion?: {
    nombre: string;
    usuario: string;
    biografia: string;
  };
  reseñaDestacada?: {
    autor: string;
    comentario: string;
  };
}



// ─── Datos agregados que devuelve el repositorio ──────────────────────────────

export interface DatosInicio {
  lugares: Lugar[];
  rutas: Ruta[];
  hospedajes: Hospedaje[];
  grupos: Grupo[];
}
