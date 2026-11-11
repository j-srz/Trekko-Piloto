import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { ApiProblemResponse } from '../common/decorators/api-problem-response.decorator.js';
import { NearbyPoisDto, PoiFiltersDto } from './dto/poi-filters.dto.js';
import { PoiCategory, PoiOrder } from './poi.constants.js';
import { PoisService } from './pois.service.js';
import {
  PaginatedPoisResponseDto,
  PoiResponseDto,
} from './dto/poi-responses.dto.js';

@ApiTags('pois')
@Public()
@Controller('pois')
export class PoisController {
  constructor(private readonly pois: PoisService) {}

  @Get('nearby')
  @ApiQuery({
    name: 'lat',
    required: true,
    type: Number,
    minimum: -90,
    maximum: 90,
    example: 19.4326,
  })
  @ApiQuery({
    name: 'lng',
    required: true,
    type: Number,
    minimum: -180,
    maximum: 180,
    example: -99.1332,
  })
  @ApiQuery({
    name: 'radioM',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 50_000,
    example: 5_000,
  })
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    maxLength: 200,
    example: 'museo',
  })
  @ApiQuery({
    name: 'categoria[]',
    required: false,
    isArray: true,
    enum: PoiCategory,
    maxItems: 8,
    example: [PoiCategory.Cultural],
  })
  @ApiQuery({
    name: 'municipioId',
    required: false,
    type: String,
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000001',
  })
  @ApiQuery({
    name: 'costoMin',
    required: false,
    type: Number,
    minimum: 0,
    multipleOf: 0.01,
    example: 50,
  })
  @ApiQuery({
    name: 'costoMax',
    required: false,
    type: Number,
    minimum: 0,
    multipleOf: 0.01,
    example: 500,
  })
  @ApiQuery({
    name: 'abiertoAhora',
    required: false,
    type: Boolean,
    example: true,
  })
  @ApiQuery({
    name: 'ordenar',
    required: false,
    enum: PoiOrder,
    example: PoiOrder.Calificacion,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    minimum: 1,
    default: 1,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @ApiOperation({ summary: 'Find nearby points of interest using PostGIS' })
  @ApiResponse({
    status: 200,
    description: 'Nearby POIs and distance in meters',
    type: PaginatedPoisResponseDto,
  })
  @ApiProblemResponse(400, 'Invalid coordinates or filters')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  nearby(@Query() query: NearbyPoisDto) {
    return this.pois.nearby(query);
  }

  @Get()
  @ApiQuery({
    name: 'q',
    required: false,
    type: String,
    maxLength: 200,
    example: 'museo',
  })
  @ApiQuery({
    name: 'categoria[]',
    required: false,
    isArray: true,
    enum: PoiCategory,
    maxItems: 8,
    example: [PoiCategory.Cultural],
  })
  @ApiQuery({
    name: 'municipioId',
    required: false,
    type: String,
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000001',
  })
  @ApiQuery({
    name: 'costoMin',
    required: false,
    type: Number,
    minimum: 0,
    multipleOf: 0.01,
    example: 50,
  })
  @ApiQuery({
    name: 'costoMax',
    required: false,
    type: Number,
    minimum: 0,
    multipleOf: 0.01,
    example: 500,
  })
  @ApiQuery({
    name: 'abiertoAhora',
    required: false,
    type: Boolean,
    example: true,
  })
  @ApiQuery({
    name: 'ordenar',
    required: false,
    enum: PoiOrder,
    example: PoiOrder.Calificacion,
  })
  @ApiQuery({
    name: 'lat',
    required: false,
    type: Number,
    minimum: -90,
    maximum: 90,
    example: 19.4326,
  })
  @ApiQuery({
    name: 'lng',
    required: false,
    type: Number,
    minimum: -180,
    maximum: 180,
    example: -99.1332,
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    minimum: 1,
    default: 1,
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @ApiOperation({ summary: 'List and filter points of interest' })
  @ApiResponse({
    status: 200,
    description: 'Paginated POI results',
    type: PaginatedPoisResponseDto,
  })
  @ApiProblemResponse(400, 'Invalid filters')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  list(@Query() query: PoiFiltersDto) {
    return this.pois.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a POI and safe contact links' })
  @ApiResponse({ status: 200, description: 'POI detail', type: PoiResponseDto })
  @ApiProblemResponse(400, 'Invalid POI identifier')
  @ApiProblemResponse(404, 'POI not found')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.pois.detail(id);
  }
}
