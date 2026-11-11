import { Expose, Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  Allow,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { PoiCategory, PoiOrder } from '../poi.constants.js';

export class PoiFiltersDto {
  @ApiPropertyOptional({ maxLength: 200, example: 'museo' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;

  @ApiPropertyOptional({
    enum: PoiCategory,
    isArray: true,
    maxItems: 8,
    example: [PoiCategory.Cultural],
  })
  @IsOptional()
  @Expose({ name: 'categoria[]' })
  @Transform(({ value, obj }) => {
    const category = value ?? obj['categoria[]'];
    if (category === undefined) return undefined;
    return Array.isArray(category) ? category : [category];
  })
  @IsArray()
  @ArrayMaxSize(8)
  @IsEnum(PoiCategory, { each: true })
  categoria?: PoiCategory[];

  @ApiPropertyOptional({
    name: 'categoria[]',
    enum: PoiCategory,
    isArray: true,
    maxItems: 8,
    example: [PoiCategory.Cultural],
  })
  @Allow()
  'categoria[]'?: PoiCategory | PoiCategory[];

  @ApiPropertyOptional({
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000001',
  })
  @IsOptional()
  @IsUUID()
  municipioId?: string;

  @ApiPropertyOptional({ minimum: 0, multipleOf: 0.01, example: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoMin?: number;

  @ApiPropertyOptional({ minimum: 0, multipleOf: 0.01, example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  costoMax?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  abiertoAhora?: boolean;

  @ApiPropertyOptional({ enum: PoiOrder, example: PoiOrder.Calificacion })
  @IsOptional()
  @IsEnum(PoiOrder)
  ordenar?: PoiOrder;

  @ApiPropertyOptional({ minimum: -90, maximum: 90, example: 19.4326 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-90)
  @Max(90)
  lat?: number;

  @ApiPropertyOptional({ minimum: -180, maximum: 180, example: -99.1332 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(-180)
  @Max(180)
  lng?: number;

  @ApiPropertyOptional({ minimum: 1, default: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 20, example: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;
}

export class NearbyPoisDto extends PoiFiltersDto {
  @ApiPropertyOptional({
    minimum: 1,
    maximum: 50_000,
    default: 5_000,
    example: 5_000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  @Max(50_000)
  radioM = 5_000;
}
