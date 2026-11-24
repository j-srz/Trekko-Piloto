import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export enum RouteType {
  Original = 'original',
  Comunitaria = 'comunitaria',
}

export class RouteFiltersDto {
  @ApiPropertyOptional({ enum: RouteType, example: RouteType.Original })
  @IsOptional()
  @IsEnum(RouteType)
  tipo?: RouteType;

  @ApiPropertyOptional({
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000001',
  })
  @IsOptional()
  @IsUUID()
  municipioId?: string;

  @ApiPropertyOptional({ minimum: 0, multipleOf: 0.01, example: 100 })
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

  @ApiPropertyOptional({ minimum: 1, example: 60 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duracionMin?: number;

  @ApiPropertyOptional({ minimum: 1, example: 360 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  duracionMax?: number;

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
