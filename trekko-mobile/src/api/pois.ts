import { ApiError, apiGet } from './index';
import { readThroughCache, type ReadCacheResult } from './readCache';

export type PoiCategory =
  | 'restaurante'
  | 'hospedaje'
  | 'artesania'
  | 'aventura'
  | 'cultural'
  | 'naturaleza'
  | 'transporte'
  | 'otro';

const CATEGORIAS_POI: PoiCategory[] = [
  'restaurante',
  'hospedaje',
  'artesania',
  'aventura',
  'cultural',
  'naturaleza',
  'transporte',
  'otro',
];

export interface PoiSchedule {
  zona: string;
  semana: Partial<Record<'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom', { abre: string; cierra: string }[]>>;
  excepciones?: { fecha: string; cerrado?: boolean; intervalos?: { abre: string; cierra: string }[] }[];
  siempreAbierto?: boolean;
}

export interface Poi {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: PoiCategory;
  municipio: { id: string; nombre: string };
  ubicacion: { lat: number; lng: number };
  direccion: string | null;
  costoPromedio: number;
  horario: PoiSchedule | null;
  contacto: {
    whatsapp?: string;
    telefono?: string;
    sitio?: string;
    whatsappUrl?: string;
    telefonoUrl?: string;
  };
  duracionVisitaMin: number;
  calificacionPromedio: number;
  numeroResenas: number;
  destacado: boolean;
  distanciaM?: number;
}

export interface PoiPage {
  data: Poi[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface NearbyPoiFilters {
  categorias?: PoiCategory[];
  costoMin?: number;
  costoMax?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function isPoiCategory(value: unknown): value is PoiCategory {
  return typeof value === 'string' && CATEGORIAS_POI.includes(value as PoiCategory);
}

function invalidResponse(): ApiError {
  return new ApiError(502, { detail: 'El servidor devolvió datos de puntos de interés inválidos.' });
}

function readPoi(value: unknown): Poi {
  if (!isRecord(value) || !isRecord(value.municipio) || !isRecord(value.ubicacion)) {
    throw invalidResponse();
  }
  const contacto = isRecord(value.contacto) ? value.contacto : {};
  const coordinates = value.ubicacion;
  if (
    typeof value.id !== 'string' ||
    typeof value.nombre !== 'string' ||
    !isPoiCategory(value.categoria) ||
    typeof value.municipio.id !== 'string' ||
    typeof value.municipio.nombre !== 'string' ||
    typeof coordinates.lat !== 'number' ||
    typeof coordinates.lng !== 'number' ||
    typeof value.costoPromedio !== 'number' ||
    typeof value.calificacionPromedio !== 'number' ||
    typeof value.numeroResenas !== 'number' ||
    typeof value.destacado !== 'boolean' ||
    typeof value.duracionVisitaMin !== 'number' ||
    !isRecord(value.contacto)
  ) {
    throw invalidResponse();
  }

  if (
    value.horario !== null &&
    value.horario !== undefined &&
    !isPoiSchedule(value.horario)
  ) {
    throw invalidResponse();
  }
  const category = value.categoria;

  return {
    id: value.id,
    nombre: value.nombre,
    descripcion: typeof value.descripcion === 'string' ? value.descripcion : null,
    categoria: category,
    municipio: { id: value.municipio.id, nombre: value.municipio.nombre },
    ubicacion: { lat: coordinates.lat, lng: coordinates.lng },
    direccion: typeof value.direccion === 'string' ? value.direccion : null,
    costoPromedio: value.costoPromedio,
    horario: value.horario ?? null,
    contacto: {
      ...(typeof contacto.whatsapp === 'string' ? { whatsapp: contacto.whatsapp } : {}),
      ...(typeof contacto.telefono === 'string' ? { telefono: contacto.telefono } : {}),
      ...(typeof contacto.sitio === 'string' ? { sitio: contacto.sitio } : {}),
      ...(typeof contacto.whatsappUrl === 'string' ? { whatsappUrl: contacto.whatsappUrl } : {}),
      ...(typeof contacto.telefonoUrl === 'string' ? { telefonoUrl: contacto.telefonoUrl } : {}),
    },
    duracionVisitaMin: value.duracionVisitaMin,
    calificacionPromedio: value.calificacionPromedio,
    numeroResenas: value.numeroResenas,
    destacado: value.destacado,
    ...(typeof value.distanciaM === 'number' ? { distanciaM: value.distanciaM } : {}),
  };
}

function isPoiSchedule(value: unknown): value is PoiSchedule {
  return (
    isRecord(value) &&
    typeof value.zona === 'string' &&
    isRecord(value.semana)
  );
}

function readPage(value: unknown): PoiPage {
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
    data: value.data.map(readPoi),
    meta: {
      page: value.meta.page,
      limit: value.meta.limit,
      total: value.meta.total,
      totalPages: value.meta.totalPages,
    },
  };
}

export async function obtenerPoisCercanos(
  latitude: number,
  longitude: number,
  filters: NearbyPoiFilters = {},
): Promise<ReadCacheResult<PoiPage>> {
  const query = new URLSearchParams({
    lat: String(latitude),
    lng: String(longitude),
    limit: '50',
    page: '1',
    radioM: '5000',
    ordenar: 'distancia',
  });
  if (filters.costoMin !== undefined) query.set('costoMin', String(filters.costoMin));
  if (filters.costoMax !== undefined) query.set('costoMax', String(filters.costoMax));
  filters.categorias?.forEach((category) => query.append('categoria[]', category));
  const path = `/pois/nearby?${query.toString()}`;
  const cacheKey = [
    'pois-nearby',
    latitude.toFixed(2),
    longitude.toFixed(2),
    filters.categorias?.slice().sort().join(',') ?? '*',
    filters.costoMin ?? '*',
    filters.costoMax ?? '*',
  ].join(':');
  return readThroughCache(
    cacheKey,
    async () => readPage(await apiGet<unknown>(path)),
    readPage,
  );
}

export async function obtenerPoi(id: string): Promise<ReadCacheResult<Poi>> {
  return readThroughCache(
    `poi:${id}`,
    async () => readPoi(await apiGet<unknown>(`/pois/${encodeURIComponent(id)}`)),
    readPoi,
  );
}
