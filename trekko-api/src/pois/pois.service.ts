import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { isOpenAt, PoiSchedule } from './schedule/is-open-at.js';
import { NearbyPoisDto, PoiFiltersDto } from './dto/poi-filters.dto.js';
import { PoiOrder } from './poi.constants.js';

type PoiRow = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: string;
  municipioId: string;
  municipioNombre: string;
  lat: number;
  lng: number;
  direccion: string | null;
  costoPromedio: string | number;
  horario: PoiSchedule;
  contacto: Record<string, unknown>;
  duracionVisitaMin: number;
  calificacionPromedio: string | number;
  numeroResenas: number;
  destacado: boolean;
  distanciaM?: number;
};

type MunicipalityRow = {
  id: string;
  nombre: string;
  esPuebloMagico: boolean;
  lat: number | null;
  lng: number | null;
};

@Injectable()
export class PoisService {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: PoiFiltersDto) {
    this.validateFilters(query);
    const filters = this.buildFilters(query);
    const openNow = query.abiertoAhora === true;
    const sort = this.sortExpression(query.ordenar, Boolean(filters.distanceSql));
    const baseSql = `
      SELECT ${this.poiColumns(filters.distanceSql)}
      FROM poi p
      JOIN municipio m ON m.id = p.municipio_id
      WHERE ${filters.clauses.join(' AND ')}
      ORDER BY ${sort}
    `;

    if (openNow) {
      const rows = (await this.dataSource.query(
        baseSql,
        filters.params,
      )) as PoiRow[];
      const openPois = rows.filter((poi) =>
        isOpenAt(poi.horario, new Date()),
      );
      return this.paginate(openPois, query.page, query.limit);
    }

    const countRows = (await this.dataSource.query(
      `SELECT count(*)::int AS total
       FROM poi p
       JOIN municipio m ON m.id = p.municipio_id
       WHERE ${filters.clauses.join(' AND ')}`,
      filters.countParams,
    )) as Array<{ total: number }>;
    const pageParams = [...filters.params, query.limit, (query.page - 1) * query.limit];
    const rows = (await this.dataSource.query(
      `${baseSql} LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams,
    )) as PoiRow[];
    return this.pageResponse(
      rows,
      Number(countRows[0]?.total ?? 0),
      query.page,
      query.limit,
    );
  }

  async nearby(query: NearbyPoisDto) {
    if (query.lat === undefined || query.lng === undefined) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'lat and lng are required for nearby search',
      });
    }
    this.validateFilters(query);
    const filters = this.buildFilters(query, {
      lat: query.lat,
      lng: query.lng,
      radioM: query.radioM ?? 5_000,
    });
    const sort = this.sortExpression(query.ordenar, true, true);
    const baseSql = `
      SELECT ${this.poiColumns(filters.distanceSql)}
      FROM poi p
      JOIN municipio m ON m.id = p.municipio_id
      WHERE ${filters.clauses.join(' AND ')}
      ORDER BY ${sort}
    `;

    if (query.abiertoAhora === true) {
      const rows = (await this.dataSource.query(
        baseSql,
        filters.params,
      )) as PoiRow[];
      return this.paginate(
        rows.filter((poi) => isOpenAt(poi.horario, new Date())),
        query.page,
        query.limit,
      );
    }

    const countRows = (await this.dataSource.query(
      `SELECT count(*)::int AS total
       FROM poi p
       JOIN municipio m ON m.id = p.municipio_id
       WHERE ${filters.clauses.join(' AND ')}`,
       filters.countParams,
    )) as Array<{ total: number }>;
    const pageParams = [...filters.params, query.limit, (query.page - 1) * query.limit];
    const rows = (await this.dataSource.query(
      `${baseSql} LIMIT $${pageParams.length - 1} OFFSET $${pageParams.length}`,
      pageParams,
    )) as PoiRow[];
    return this.pageResponse(
      rows,
      Number(countRows[0]?.total ?? 0),
      query.page,
      query.limit,
    );
  }

  async detail(id: string) {
    const rows = (await this.dataSource.query(
      `SELECT ${this.poiColumns()}
       FROM poi p
       JOIN municipio m ON m.id = p.municipio_id
       WHERE p.id = $1 AND p.eliminado_en IS NULL`,
      [id],
    )) as PoiRow[];
    const poi = rows[0];
    if (!poi) throw new NotFoundException({ code: 'NOT_FOUND', message: 'POI not found' });
    return this.mapPoi(poi);
  }

  async municipalities() {
    const rows = (await this.dataSource.query(
      `SELECT id, nombre, es_pueblo_magico AS "esPuebloMagico",
              ST_Y(centro) AS lat, ST_X(centro) AS lng
       FROM municipio
       ORDER BY nombre`,
    )) as MunicipalityRow[];
    return rows.map((row) => ({
      id: row.id,
      nombre: row.nombre,
      esPuebloMagico: row.esPuebloMagico,
      centro:
        row.lat === null || row.lng === null
          ? null
          : { lat: Number(row.lat), lng: Number(row.lng) },
    }));
  }

  private buildFilters(
    query: PoiFiltersDto,
    nearby?: { lat: number; lng: number; radioM: number },
  ) {
    const params: unknown[] = [];
    const bind = (value: unknown) => {
      params.push(value);
      return `$${params.length}`;
    };
    const clauses = ['p.eliminado_en IS NULL'];
    if (query.q?.trim()) {
      clauses.push(`p.nombre ILIKE ${bind(`%${query.q.trim()}%`)}`);
    }
    if (query.categoria?.length) {
      clauses.push(`p.categoria = ANY(${bind(query.categoria)}::poi_categoria[])`);
    }
    if (query.municipioId) {
      clauses.push(`p.municipio_id = ${bind(query.municipioId)}::uuid`);
    }
    if (query.costoMin !== undefined) {
      clauses.push(`p.costo_promedio >= ${bind(query.costoMin)}`);
    }
    if (query.costoMax !== undefined) {
      clauses.push(`p.costo_promedio <= ${bind(query.costoMax)}`);
    }
    let countParams = [...params];
    let distanceSql: string | undefined;
    if (nearby || (query.lat !== undefined && query.lng !== undefined)) {
      const lng = bind(nearby?.lng ?? query.lng);
      const lat = bind(nearby?.lat ?? query.lat);
      const point = `ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography`;
      distanceSql = `ST_Distance(p.ubicacion::geography, ${point})`;
      if (nearby) {
        const radius = bind(nearby.radioM);
        clauses.push(`ST_DWithin(p.ubicacion::geography, ${point}, ${radius})`);
        countParams = [...params];
      }
    }
    return { clauses, params, countParams, distanceSql };
  }

  private poiColumns(distanceSql?: string): string {
    return `
      p.id, p.nombre, p.descripcion, p.categoria,
      p.municipio_id AS "municipioId", m.nombre AS "municipioNombre",
      ST_Y(p.ubicacion) AS lat, ST_X(p.ubicacion) AS lng,
      p.direccion, p.costo_promedio AS "costoPromedio", p.horario,
      p.contacto, p.duracion_visita_min AS "duracionVisitaMin",
      p.calificacion_promedio AS "calificacionPromedio",
      p.numero_resenas AS "numeroResenas",
      COALESCE(p.destacado_hasta > now(), false) AS destacado
      ${distanceSql ? `, ${distanceSql} AS "distanciaM"` : ''}
    `;
  }

  private sortExpression(
    order: PoiOrder | undefined,
    hasDistance: boolean,
    prioritizeFeatured = false,
  ): string {
    const orderBy =
      order === PoiOrder.Costo
        ? 'p.costo_promedio ASC'
        : order === PoiOrder.Calificacion
          ? 'p.calificacion_promedio DESC'
          : hasDistance
            ? '"distanciaM" ASC'
            : 'p.nombre ASC';
    const expressions = prioritizeFeatured
      ? [
          '"distanciaM" ASC',
          'COALESCE(p.destacado_hasta > now(), false) DESC',
          ...(order && order !== PoiOrder.Distancia ? [orderBy] : []),
        ]
      : [orderBy];
    expressions.push('p.id ASC');
    return expressions.join(', ');
  }

  private validateFilters(query: PoiFiltersDto): void {
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
    if ((query.lat === undefined) !== (query.lng === undefined)) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'lat and lng must be provided together',
      });
    }
    if (query.ordenar === PoiOrder.Distancia && query.lat === undefined) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: 'lat and lng are required to sort by distance',
      });
    }
  }

  private paginate(rows: PoiRow[], page: number, limit: number) {
    const start = (page - 1) * limit;
    return this.pageResponse(rows.slice(start, start + limit), rows.length, page, limit);
  }

  private pageResponse(
    rows: PoiRow[],
    total: number,
    page: number,
    limit: number,
  ) {
    return {
      data: rows.map((row) => this.mapPoi(row)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  private mapPoi(row: PoiRow) {
    const contacto = row.contacto ?? {};
    const whatsapp =
      typeof contacto.whatsapp === 'string'
        ? contacto.whatsapp.replace(/\D/g, '')
        : '';
    const telephone =
      typeof contacto.telefono === 'string'
        ? contacto.telefono.replace(/\D/g, '')
        : '';
    const site =
      typeof contacto.sitio === 'string' &&
      /^https?:\/\//i.test(contacto.sitio)
        ? contacto.sitio
        : undefined;
    return {
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion,
      categoria: row.categoria,
      municipio: { id: row.municipioId, nombre: row.municipioNombre },
      ubicacion: { lat: Number(row.lat), lng: Number(row.lng) },
      direccion: row.direccion,
      costoPromedio: Number(row.costoPromedio),
      horario: row.horario,
      contacto: {
        ...(typeof contacto.whatsapp === 'string'
          ? { whatsapp: contacto.whatsapp }
          : {}),
        ...(typeof contacto.telefono === 'string'
          ? { telefono: contacto.telefono }
          : {}),
        ...(site ? { sitio: site } : {}),
        ...(whatsapp.length >= 8 && whatsapp.length <= 15
          ? { whatsappUrl: `https://wa.me/${whatsapp}` }
          : {}),
        ...(telephone.length >= 7 && telephone.length <= 15
          ? { telefonoUrl: `tel:+${telephone}` }
          : {}),
      },
      duracionVisitaMin: row.duracionVisitaMin,
      calificacionPromedio: Number(row.calificacionPromedio),
      numeroResenas: row.numeroResenas,
      destacado: row.destacado,
      ...(row.distanciaM !== undefined
        ? { distanciaM: Number(row.distanciaM) }
        : {}),
    };
  }
}
