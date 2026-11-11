import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { PoiCategory } from '../../pois/poi.constants.js';
import type { Pace } from '../generator/generate-itinerary.js';

export class GeoPointDto {
  @ApiProperty({ minimum: -90, maximum: 90, example: 19.4326 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat!: number;

  @ApiProperty({ minimum: -180, maximum: 180, example: -99.1332 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lng!: number;
}

export class RouteAreaDto extends GeoPointDto {
  @ApiProperty({ minimum: 1, maximum: 50_000, example: 5_000 })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(50_000)
  radioM!: number;
}

export enum RoutePace {
  Relajado = 'relajado',
  Normal = 'normal',
  Intenso = 'intenso',
}

export class GenerateRouteDto {
  @ApiPropertyOptional({
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000001',
    description: 'Provide this or centro, but not both.',
  })
  @IsOptional()
  @IsUUID()
  municipioId?: string;

  @ApiPropertyOptional({
    type: () => RouteAreaDto,
    description: 'Provide this or municipioId, but not both.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RouteAreaDto)
  centro?: RouteAreaDto;

  @ApiProperty({ format: 'date', example: '2026-11-12' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  fecha!: string;

  @ApiProperty({ pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$', example: '09:00' })
  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  horaInicio!: string;

  @ApiPropertyOptional({
    pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$',
    example: '14:30',
    description: 'Provide this or duracionMaxMin, but not both.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^(?:[01]\d|2[0-3]):[0-5]\d$/)
  horaFin?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 1_440, example: 330 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1_440)
  duracionMaxMin?: number;

  @ApiPropertyOptional({ minimum: 0, multipleOf: 0.01, example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  presupuestoMax?: number;

  @ApiProperty({ minimum: 1, maximum: 20, example: 2 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  personas!: number;

  @ApiPropertyOptional({
    enum: PoiCategory,
    isArray: true,
    maxItems: 8,
    example: [PoiCategory.Restaurante, PoiCategory.Cultural],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(PoiCategory, { each: true })
  categorias?: PoiCategory[];

  @ApiProperty({ enum: RoutePace, example: RoutePace.Normal })
  @IsEnum(RoutePace)
  ritmo!: Pace;

  @ApiPropertyOptional({ type: () => GeoPointDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointDto)
  puntoInicio?: GeoPointDto;

  @ApiPropertyOptional({
    type: String,
    format: 'uuid',
    isArray: true,
    maxItems: 100,
    example: ['3c78617f-5e1f-49e4-8e61-06f3c732473b'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsUUID(undefined, { each: true })
  excluirPoiIds?: string[];
}
