import { ApiError, apiGet, apiPost } from './index';
import type { PoiCategory } from './pois';

export type RoutePace = 'relajado' | 'normal' | 'intenso';

export interface Municipality {
  id: string;
  nombre: string;
  esPuebloMagico: boolean;
  centro: { lat: number; lng: number } | null;
}

type RouteLocation =
  | { municipioId: string; centro?: never }
  | {
      municipioId?: never;
      centro: { lat: number; lng: number; radioM: number };
    };

type RouteDuration =
  | { horaFin: string; duracionMaxMin?: never }
  | { horaFin?: never; duracionMaxMin: number };

export type GenerateItineraryInput = RouteLocation &
  RouteDuration & {
    fecha: string;
    horaInicio: string;
    presupuestoMax?: number;
    personas: number;
    categorias?: PoiCategory[];
    ritmo: RoutePace;
    puntoInicio?: { lat: number; lng: number };
    excluirPoiIds?: string[];
  };

export interface GeneratedItineraryItem {
  poiId: string;
  orden: number;
  horaLlegada: string;
  horaSalida: string;
  duracionVisitaMin: number;
  traslado: { distanciaM: number; minutos: number };
  costo: number;
}

export interface GeneratedItinerary {
  items: GeneratedItineraryItem[];
  costoTotal: number;
  costoEstimado: number;
  costoPorPersona: number;
  duracionTotalMin: number;
  advertencias: string[];
  desglose: {
    entradas: number;
    comida: number;
    hospedaje: number;
    transporte: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function invalidResponse(): ApiError {
  return new ApiError(502, { detail: 'El servidor devolvió datos de itinerario inválidos.' });
}

export async function listarMunicipios(): Promise<Municipality[]> {
  const value = await apiGet<unknown>('/municipios');
  if (!Array.isArray(value)) throw invalidResponse();
  return value.map((item) => {
    if (!isRecord(item)) throw invalidResponse();
    const center = item.centro;
    if (
      typeof item.id !== 'string' ||
      typeof item.nombre !== 'string' ||
      typeof item.esPuebloMagico !== 'boolean' ||
      (center !== null &&
        (!isRecord(center) || typeof center.lat !== 'number' || typeof center.lng !== 'number'))
    ) {
      throw invalidResponse();
    }
    let parsedCenter: Municipality['centro'] = null;
    if (center !== null) {
      if (!isRecord(center) || typeof center.lat !== 'number' || typeof center.lng !== 'number') {
        throw invalidResponse();
      }
      parsedCenter = { lat: center.lat, lng: center.lng };
    }
    return {
      id: item.id,
      nombre: item.nombre,
      esPuebloMagico: item.esPuebloMagico,
      centro: parsedCenter,
    };
  });
}

function readItineraryItem(value: unknown): GeneratedItineraryItem {
  if (!isRecord(value) || !isRecord(value.traslado)) throw invalidResponse();
  if (
    typeof value.poiId !== 'string' ||
    typeof value.orden !== 'number' ||
    typeof value.horaLlegada !== 'string' ||
    typeof value.horaSalida !== 'string' ||
    typeof value.duracionVisitaMin !== 'number' ||
    typeof value.traslado.distanciaM !== 'number' ||
    typeof value.traslado.minutos !== 'number' ||
    typeof value.costo !== 'number'
  ) {
    throw invalidResponse();
  }
  return {
    poiId: value.poiId,
    orden: value.orden,
    horaLlegada: value.horaLlegada,
    horaSalida: value.horaSalida,
    duracionVisitaMin: value.duracionVisitaMin,
    traslado: { distanciaM: value.traslado.distanciaM, minutos: value.traslado.minutos },
    costo: value.costo,
  };
}

function readItinerary(value: unknown): GeneratedItinerary {
  if (!isRecord(value) || !Array.isArray(value.items) || !isRecord(value.desglose)) {
    throw invalidResponse();
  }
  const desglose = value.desglose;
  if (
    typeof value.costoTotal !== 'number' ||
    typeof value.costoEstimado !== 'number' ||
    typeof value.costoPorPersona !== 'number' ||
    typeof value.duracionTotalMin !== 'number' ||
    !Array.isArray(value.advertencias) ||
    !value.advertencias.every((warning) => typeof warning === 'string') ||
    typeof desglose.entradas !== 'number' ||
    typeof desglose.comida !== 'number' ||
    typeof desglose.hospedaje !== 'number' ||
    typeof desglose.transporte !== 'number'
  ) {
    throw invalidResponse();
  }
  return {
    items: value.items.map(readItineraryItem),
    costoTotal: value.costoTotal,
    costoEstimado: value.costoEstimado,
    costoPorPersona: value.costoPorPersona,
    duracionTotalMin: value.duracionTotalMin,
    advertencias: value.advertencias,
    desglose: {
      entradas: desglose.entradas,
      comida: desglose.comida,
      hospedaje: desglose.hospedaje,
      transporte: desglose.transporte,
    },
  };
}

export async function generarItinerario(input: GenerateItineraryInput): Promise<GeneratedItinerary> {
  const result = await apiPost<unknown, GenerateItineraryInput>('/routes/generate', input, true);
  return readItinerary(result);
}
