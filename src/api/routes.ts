import { ApiError, apiGet } from './index';
import { readThroughCache, type ReadCacheResult } from './readCache';
import type { PoiCategory } from './pois';

export interface RouteSummary {
  id: string;
  tipo: 'original' | 'comunitaria';
  titulo: string;
  descripcion: string | null;
  costoEstimado: number;
  duracionMin: number;
  municipio: { id: string; nombre: string };
  autor: { id: string | null; nombre: string } | null;
}

export interface RoutePoi {
  poiId: string;
  orden: number;
  duracionVisitaMin: number;
  nombre: string;
  categoria: PoiCategory;
  ubicacion: { lat: number; lng: number };
  costoPromedio: number;
}

export interface RouteDetail extends RouteSummary {
  pois: RoutePoi[];
}

export interface RoutePage {
  data: RouteSummary[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

const POI_CATEGORIES: PoiCategory[] = [
  'restaurante',
  'hospedaje',
  'artesania',
  'aventura',
  'cultural',
  'naturaleza',
  'transporte',
  'otro',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function invalidResponse(): ApiError {
  return new ApiError(502, { detail: 'El servidor devolvió datos de rutas inválidos.' });
}

function isPoiCategory(value: unknown): value is PoiCategory {
  return typeof value === 'string' && POI_CATEGORIES.includes(value as PoiCategory);
}

function readSummary(value: unknown): RouteSummary {
  if (!isRecord(value) || !isRecord(value.municipio)) throw invalidResponse();
  const author = value.autor;
  if (
    typeof value.id !== 'string' ||
    (value.tipo !== 'original' && value.tipo !== 'comunitaria') ||
    typeof value.titulo !== 'string' ||
    (value.descripcion !== null && typeof value.descripcion !== 'string') ||
    typeof value.costoEstimado !== 'number' ||
    typeof value.duracionMin !== 'number' ||
    typeof value.municipio.id !== 'string' ||
    typeof value.municipio.nombre !== 'string' ||
    (author !== null &&
      (!isRecord(author) ||
        (author.id !== null && typeof author.id !== 'string') ||
        typeof author.nombre !== 'string'))
  ) {
    throw invalidResponse();
  }

  let parsedAuthor: RouteSummary['autor'] = null;
  if (author !== null) {
    if (!isRecord(author) || (author.id !== null && typeof author.id !== 'string') || typeof author.nombre !== 'string') {
      throw invalidResponse();
    }
    parsedAuthor = { id: author.id, nombre: author.nombre };
  }

  return {
    id: value.id,
    tipo: value.tipo,
    titulo: value.titulo,
    descripcion: value.descripcion,
    costoEstimado: value.costoEstimado,
    duracionMin: value.duracionMin,
    municipio: { id: value.municipio.id, nombre: value.municipio.nombre },
    autor: parsedAuthor,
  };
}

function readPoi(value: unknown): RoutePoi {
  if (!isRecord(value) || !isRecord(value.ubicacion)) throw invalidResponse();
  if (
    typeof value.poiId !== 'string' ||
    typeof value.orden !== 'number' ||
    typeof value.duracionVisitaMin !== 'number' ||
    typeof value.nombre !== 'string' ||
    !isPoiCategory(value.categoria) ||
    typeof value.ubicacion.lat !== 'number' ||
    typeof value.ubicacion.lng !== 'number' ||
    typeof value.costoPromedio !== 'number'
  ) {
    throw invalidResponse();
  }
  return {
    poiId: value.poiId,
    orden: value.orden,
    duracionVisitaMin: value.duracionVisitaMin,
    nombre: value.nombre,
    categoria: value.categoria,
    ubicacion: { lat: value.ubicacion.lat, lng: value.ubicacion.lng },
    costoPromedio: value.costoPromedio,
  };
}

function readPage(value: unknown): RoutePage {
  if (
    !isRecord(value) ||
    !Array.isArray(value.data) ||
    !isRecord(value.meta) ||
    typeof value.meta.page !== 'number' ||
    typeof value.meta.limit !== 'number' ||
    typeof value.meta.total !== 'number' ||
    typeof value.meta.totalPages !== 'number'
  ) {
    throw invalidResponse();
  }
  return {
    data: value.data.map(readSummary),
    meta: {
      page: value.meta.page,
      limit: value.meta.limit,
      total: value.meta.total,
      totalPages: value.meta.totalPages,
    },
  };
}

export async function listarRutasOriginales(limit = 50): Promise<ReadCacheResult<RoutePage>> {
  const query = new URLSearchParams({ tipo: 'original', page: '1', limit: String(limit) });
  return readThroughCache(
    `routes-original:${query.toString()}`,
    async () => readPage(await apiGet<unknown>(`/routes?${query.toString()}`)),
    readPage,
  );
}

function readDetail(value: unknown): RouteDetail {
  if (!isRecord(value) || !Array.isArray(value.pois)) throw invalidResponse();
  return { ...readSummary(value), pois: value.pois.map(readPoi) };
}

export async function obtenerRuta(id: string): Promise<ReadCacheResult<RouteDetail>> {
  return readThroughCache(
    `route:${id}`,
    async () => readDetail(await apiGet<unknown>(`/routes/${encodeURIComponent(id)}`)),
    readDetail,
  );
}
