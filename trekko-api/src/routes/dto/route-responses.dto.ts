import { ApiProperty } from '@nestjs/swagger';
import { PoiCategory } from '../../pois/poi.constants.js';
import { PaginationMetaDto } from '../../common/dto/pagination.dto.js';
import type { RouteType } from './route-filters.dto.js';

export class RouteMunicipalityResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000001',
  })
  id!: string;

  @ApiProperty({ example: 'San Miguel de Allende' })
  nombre!: string;
}

export class RouteAuthorResponseDto {
  @ApiProperty({ format: 'uuid', nullable: true, example: null })
  id!: string | null;

  @ApiProperty({ example: 'Trekko' })
  nombre!: string;
}

export class RouteSummaryResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '3c78617f-5e1f-49e4-8e61-06f3c732473b',
  })
  id!: string;

  @ApiProperty({ enum: ['original', 'comunitaria'], example: 'original' })
  tipo!: RouteType;

  @ApiProperty({ example: 'Un día en San Miguel' })
  titulo!: string;

  @ApiProperty({
    nullable: true,
    example: 'Recorrido por el centro histórico.',
  })
  descripcion!: string | null;

  @ApiProperty({ minimum: 0, example: 250 })
  costoEstimado!: number;

  @ApiProperty({ minimum: 1, example: 240 })
  duracionMin!: number;

  @ApiProperty({ type: RouteMunicipalityResponseDto })
  municipio!: RouteMunicipalityResponseDto;

  @ApiProperty({ type: RouteAuthorResponseDto, nullable: true })
  autor!: RouteAuthorResponseDto | null;
}

export class RouteDetailPoiResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '3c78617f-5e1f-49e4-8e61-06f3c732473b',
  })
  poiId!: string;

  @ApiProperty({ minimum: 1, example: 1 })
  orden!: number;

  @ApiProperty({ minimum: 1, example: 60 })
  duracionVisitaMin!: number;

  @ApiProperty({ example: 'Museo de la ciudad' })
  nombre!: string;

  @ApiProperty({ enum: PoiCategory, example: PoiCategory.Cultural })
  categoria!: PoiCategory;

  @ApiProperty({
    type: 'object',
    properties: {
      lat: { type: 'number', minimum: -90, maximum: 90, example: 19.4326 },
      lng: { type: 'number', minimum: -180, maximum: 180, example: -99.1332 },
    },
    required: ['lat', 'lng'],
  })
  ubicacion!: { lat: number; lng: number };

  @ApiProperty({ minimum: 0, example: 80 })
  costoPromedio!: number;
}

export class RouteDetailResponseDto extends RouteSummaryResponseDto {
  @ApiProperty({ type: () => [RouteDetailPoiResponseDto] })
  pois!: RouteDetailPoiResponseDto[];
}

export class PaginatedRoutesResponseDto {
  @ApiProperty({ type: () => [RouteSummaryResponseDto] })
  data!: RouteSummaryResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class ItineraryTransferResponseDto {
  @ApiProperty({ minimum: 0, example: 850 })
  distanciaM!: number;

  @ApiProperty({ minimum: 0, example: 12 })
  minutos!: number;
}

export class ItineraryItemResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '3c78617f-5e1f-49e4-8e61-06f3c732473b',
  })
  poiId!: string;

  @ApiProperty({ minimum: 1, example: 1 })
  orden!: number;

  @ApiProperty({ pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$', example: '09:12' })
  horaLlegada!: string;

  @ApiProperty({ pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$', example: '10:12' })
  horaSalida!: string;

  @ApiProperty({ minimum: 1, example: 60 })
  duracionVisitaMin!: number;

  @ApiProperty({ type: ItineraryTransferResponseDto })
  traslado!: ItineraryTransferResponseDto;

  @ApiProperty({ minimum: 0, example: 80 })
  costo!: number;
}

export class ItineraryBreakdownResponseDto {
  @ApiProperty({ minimum: 0, example: 80 })
  entradas!: number;

  @ApiProperty({ minimum: 0, example: 150 })
  comida!: number;

  @ApiProperty({ minimum: 0, example: 0 })
  hospedaje!: number;

  @ApiProperty({ minimum: 0, example: 40 })
  transporte!: number;
}

export class GeneratedItineraryResponseDto {
  @ApiProperty({ type: () => [ItineraryItemResponseDto] })
  items!: ItineraryItemResponseDto[];

  @ApiProperty({ minimum: 0, example: 270 })
  costoTotal!: number;

  @ApiProperty({ minimum: 0, example: 270 })
  costoEstimado!: number;

  @ApiProperty({ minimum: 0, example: 135 })
  costoPorPersona!: number;

  @ApiProperty({ minimum: 0, example: 240 })
  duracionTotalMin!: number;

  @ApiProperty({ type: [String], example: [] })
  advertencias!: string[];

  @ApiProperty({ type: ItineraryBreakdownResponseDto })
  desglose!: ItineraryBreakdownResponseDto;
}
