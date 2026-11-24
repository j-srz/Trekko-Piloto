import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { PoiCategory } from '../pois/poi.constants.js';
import { PoiSchedule } from '../pois/schedule/is-open-at.js';
import {
  generateItinerary,
  RouteCandidate,
  RoutePoint,
} from './generator/generate-itinerary.js';
import { GenerateRouteDto } from './dto/generate-route.dto.js';
import { RouteFiltersDto } from './dto/route-filters.dto.js';

type RouteRow = {
  id: string;
  tipo: 'original' | 'comunitaria';
  titulo: string;
  descripcion: string | null;
  costoEstimado: string | number;
  duracionMin: number;
  municipioId: string;
  municipioNombre: string;
  autorId: string | null;
  autorNombre: string | null;
};

type GeneratorPoiRow = {
  id: string;
  nombre: string;
  categoria: PoiCategory;
  lat: number;
  lng: number;
  costoPromedio: string | number;
  duracionVisitaMin: number;
  calificacionPromedio: string | number;
  horario: PoiSchedule;
  municipioLat: number | null;
  municipioLng: number | null;
};

@Injectable()
export class RoutesService {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: RouteFiltersDto) {
    this.validateListFilters(query);
    const params: unknown[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const clauses = [
      `r.estado = 'publicada'`,
      'r.eliminado_en IS NULL',
    ];
    if (query.tipo) clauses.push(`r.tipo = ${bind(query.tipo)}::ruta_tipo`);
    if (query.municipioId) {
      clauses.push(`r.municipio_id = ${bind(query.municipioId)}::uuid`);
    }
    if (query.costoMin !== undefined) {
      clauses.push(`r.costo_estimado >= ${bind(query.costoMin)}`);
    }
    if (query.costoMax !== undefined) {
      clauses.push(`r.costo_estimado <= ${bind(query.costoMax)}`);
    }
    if (query.duracionMin !== undefined) {
      clauses.push(`r.duracion_min >= ${bind(query.duracionMin)}`);
    }
    if (query.duracionMax !== undefined) {
      clauses.push(`r.duracion_min <= ${bind(query.duracionMax)}`);
    }
    const where = clauses.join(' AND ');
    const countRows = (await this.dataSource.query(
      `SELECT count(*)::int AS total FROM ruta r WHERE ${where}`,
      params,
    )) as Array<{ total: number }>;
    const pageParams = [...params, query.limit, (query.page - 1) * query.limit];
    const rows = (await this.dataSource.query(
      `SELECT ${this.routeColumns()}
       FROM ruta r
       JOIN municipio m ON m.id = r.municipio_id
       LEFT JOIN usuario u ON u.id = r.autor_id
       WHERE ${where}
       ORDER BY r.titulo ASC, r.id ASC
       LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams,
    )) as RouteRow[];
    const total = Number(countRows[0]?.total ?? 0);
    return {
      data: rows.map((row) => this.mapRoute(row)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.ceil(total / query.limit),
      },
    };
  }

  async detail(id: string) {
    const rows = (await this.dataSource.query(
      `SELECT ${this.routeColumns()}
       FROM ruta r
       JOIN municipio m ON m.id = r.municipio_id
       LEFT JOIN usuario u ON u.id = r.autor_id
       WHERE r.id = $1 AND r.estado = 'publicada' AND r.eliminado_en IS NULL`,
      [id],
    )) as RouteRow[];
    const route = rows[0];
    if (!route) {
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Route not found',
      });
    }
    const pois = (await this.dataSource.query(
      `SELECT rp.poi_id AS "poiId", rp.orden, rp.duracion_visita_min AS "duracionVisitaMin",
              p.nombre, p.categoria, ST_Y(p.ubicacion) AS lat,
              ST_X(p.ubicacion) AS lng, p.costo_promedio AS "costoPromedio"
       FROM ruta_poi rp
       JOIN poi p ON p.id = rp.poi_id
       WHERE rp.ruta_id = $1 AND p.eliminado_en IS NULL
       ORDER BY rp.orden`,
      [id],
    )) as Array<{
      poiId: string;
      orden: number;
      duracionVisitaMin: number;
      nombre: string;
      categoria: PoiCategory;
      lat: number;
      lng: number;
      costoPromedio: string | number;
    }>;
    return {
      ...this.mapRoute(route),
      pois: pois.map(({ lat, lng, ...poi }) => ({
        ...poi,
        ubicacion: { lat: Number(lat), lng: Number(lng) },
        costoPromedio: Number(poi.costoPromedio),
      })),
    };
  }

  async generate(input: GenerateRouteDto) {
    this.validateGenerationInput(input);
    const params: unknown[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const clauses = ['p.eliminado_en IS NULL'];
    if (input.municipioId) {
      clauses.push(`p.municipio_id = ${bind(input.municipioId)}::uuid`);
    }
    if (input.centro) {
      const lng = bind(input.centro.lng);
      const lat = bind(input.centro.lat);
      const radius = bind(input.centro.radioM);
      clauses.push(
        `ST_DWithin(
          p.ubicacion::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${radius}
        )`,
      );
    }
    if (input.categorias?.length) {
      clauses.push(
        `p.categoria = ANY(${bind(input.categorias)}::poi_categoria[])`,
      );
    }
    if (input.excluirPoiIds?.length) {
      clauses.push(`NOT (p.id = ANY(${bind(input.excluirPoiIds)}::uuid[]))`);
    }
    const rows = (await this.dataSource.query(
      `SELECT p.id, p.nombre, p.categoria, ST_Y(p.ubicacion) AS lat,
              ST_X(p.ubicacion) AS lng, p.costo_promedio AS "costoPromedio",
              p.duracion_visita_min AS "duracionVisitaMin",
              p.calificacion_promedio AS "calificacionPromedio", p.horario,
              ST_Y(m.centro) AS "municipioLat", ST_X(m.centro) AS "municipioLng"
       FROM poi p
       JOIN municipio m ON m.id = p.municipio_id
       WHERE ${clauses.join(' AND ')}
       ORDER BY p.id`,
      params,
    )) as GeneratorPoiRow[];
    const candidates: RouteCandidate[] = rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      categoria: row.categoria,
      lat: Number(row.lat),
      lng: Number(row.lng),
      costoPromedio: Number(row.costoPromedio),
      duracionVisitaMin: row.duracionVisitaMin,
      calificacionPromedio: Number(row.calificacionPromedio),
      horario: row.horario,
    }));
    const origin: RoutePoint =
      input.puntoInicio ??
      input.centro ??
      (rows[0] &&
      rows[0].municipioLat !== null &&
      rows[0].municipioLng !== null
        ? {
            lat: Number(rows[0].municipioLat),
            lng: Number(rows[0].municipioLng),
          }
        : candidates[0] ?? { lat: 0, lng: 0 });
    return generateItinerary(input, candidates, origin);
  }

  private routeColumns(): string {
    return `r.id, r.tipo, r.titulo, r.descripcion,
            r.costo_estimado AS "costoEstimado", r.duracion_min AS "duracionMin",
            r.municipio_id AS "municipioId", m.nombre AS "municipioNombre",
            r.autor_id AS "autorId", u.nombre AS "autorNombre"`;
  }

  private mapRoute(route: RouteRow) {
    return {
      id: route.id,
      tipo: route.tipo,
      titulo: route.titulo,
      descripcion: route.descripcion,
      costoEstimado: Number(route.costoEstimado),
      duracionMin: route.duracionMin,
      municipio: { id: route.municipioId, nombre: route.municipioNombre },
      autor:
        route.tipo === 'original'
          ? { id: null, nombre: 'Trekko' }
          : route.autorId
            ? { id: route.autorId, nombre: route.autorNombre }
            : null,
    };
  }

  private validateListFilters(query: RouteFiltersDto): void {
    if (
      query.costoMin !== undefined &&
      query.costoMax !== undefined &&
      query.costoMin > query.costoMax
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'costoMin must not exceed costoMax',
      });
    }
    if (
      query.duracionMin !== undefined &&
      query.duracionMax !== undefined &&
      query.duracionMin > query.duracionMax
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'duracionMin must not exceed duracionMax',
      });
    }
  }

  private validateGenerationInput(input: GenerateRouteDto): void {
    const hasMunicipality = Boolean(input.municipioId);
    const hasArea = Boolean(input.centro);
    if (hasMunicipality === hasArea) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Provide exactly one of municipioId or centro',
      });
    }
    if (Boolean(input.horaFin) === (input.duracionMaxMin !== undefined)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'Provide exactly one of horaFin or duracionMaxMin',
      });
    }
    if (input.horaFin && input.horaFin <= input.horaInicio) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'horaFin must be after horaInicio on the same day',
      });
    }
    const date = new Date(`${input.fecha}T00:00:00.000Z`);
    if (
      Number.isNaN(date.getTime()) ||
      date.toISOString().slice(0, 10) !== input.fecha
    ) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'fecha must be a valid calendar date',
      });
    }
  }
}
