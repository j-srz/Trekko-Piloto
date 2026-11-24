import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { ApiProblemResponse } from '../common/decorators/api-problem-response.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { GenerateRouteDto } from './dto/generate-route.dto.js';
import { RouteFiltersDto } from './dto/route-filters.dto.js';
import { RoutesService } from './routes.service.js';
import {
  GeneratedItineraryResponseDto,
  PaginatedRoutesResponseDto,
  RouteDetailResponseDto,
} from './dto/route-responses.dto.js';

@ApiTags('routes')
@Controller('routes')
export class RoutesController {
  constructor(private readonly routes: RoutesService) {}

  @Get()
  @Public()
  @ApiQuery({
    name: 'tipo',
    required: false,
    enum: ['original', 'comunitaria'],
    example: 'original',
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
    example: 100,
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
    name: 'duracionMin',
    required: false,
    type: Number,
    minimum: 1,
    example: 60,
  })
  @ApiQuery({
    name: 'duracionMax',
    required: false,
    type: Number,
    minimum: 1,
    example: 360,
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
  @ApiOperation({ summary: 'List published routes with optional filters' })
  @ApiResponse({
    status: 200,
    description: 'Paginated published routes',
    type: PaginatedRoutesResponseDto,
  })
  @ApiProblemResponse(400, 'Invalid route filters')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  list(@Query() query: RouteFiltersDto) {
    return this.routes.list(query);
  }

  @Post('generate')
  @HttpCode(HttpStatus.OK)
  @Roles('explorador')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate a deterministic itinerary proposal' })
  @ApiResponse({
    status: 200,
    description: 'Generated itinerary',
    type: GeneratedItineraryResponseDto,
  })
  @ApiProblemResponse(400, 'Invalid generation constraints')
  @ApiProblemResponse(401, 'Authentication required')
  @ApiProblemResponse(403, 'Explorer role required')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  generate(@Body() input: GenerateRouteDto) {
    return this.routes.generate(input);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get a published route with ordered POIs' })
  @ApiResponse({
    status: 200,
    description: 'Published route detail',
    type: RouteDetailResponseDto,
  })
  @ApiProblemResponse(400, 'Invalid route identifier')
  @ApiProblemResponse(404, 'Route not found')
  @ApiProblemResponse(429, 'Rate limit exceeded')
  detail(@Param('id', ParseUUIDPipe) id: string) {
    return this.routes.detail(id);
  }
}
