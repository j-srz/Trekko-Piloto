/**
 * Tipos del dominio Grupos.
 * Se guardan hechos (cupo, participantes, fechas); la insignia y las
 * secciones se calculan en reglas.ts.
 */

import type { CoordenadaMapa } from '../mapa/types';

export interface Grupo {
    id: string;
    nombre: string;
    /** Nombre de la ruta asociada. */
    rutaNombre: string;
    /** Nombre del organizador. */
    lider: string;
    /** Fecha y hora de salida, en texto ISO. */
    salidaEn: string;
    /** Fecha de creación del grupo, en texto ISO. */
    creadoEn: string;
    /** true mientras la salida está ocurriendo. */
    enCurso: boolean;
    participantes: number;
    cupo: number;
    imagen: number | string;
    coordenada?: CoordenadaMapa;
}

export type TonoInsignia = 'verde' | 'roja';

export interface InsigniaGrupo {
    texto: string;
    tono: TonoInsignia;
}

export interface SeccionesGrupos {
    finDeSemana: Grupo[];
    casiCompletos: Grupo[];
    nuevos: Grupo[];
}