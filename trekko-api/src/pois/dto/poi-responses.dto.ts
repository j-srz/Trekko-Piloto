import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PoiCategory } from '../poi.constants.js';
import { PaginationMetaDto } from '../../common/dto/pagination.dto.js';

export class PoiPointResponseDto {
  @ApiProperty({ minimum: -90, maximum: 90, example: 19.4326 })
  lat!: number;

  @ApiProperty({ minimum: -180, maximum: 180, example: -99.1332 })
  lng!: number;
}

export class PoiMunicipalityResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000001',
  })
  id!: string;

  @ApiProperty({ example: 'San Miguel de Allende' })
  nombre!: string;
}

export class OpeningIntervalResponseDto {
  @ApiProperty({ pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$', example: '09:00' })
  abre!: string;

  @ApiProperty({ pattern: '^(?:[01]\\d|2[0-3]):[0-5]\\d$', example: '18:00' })
  cierra!: string;
}

export class ScheduleExceptionResponseDto {
  @ApiProperty({ format: 'date', example: '2026-12-25' })
  fecha!: string;

  @ApiPropertyOptional({ example: true })
  cerrado?: boolean;

  @ApiPropertyOptional({ type: () => [OpeningIntervalResponseDto] })
  intervalos?: OpeningIntervalResponseDto[];
}

export class PoiScheduleResponseDto {
  @ApiProperty({ example: 'America/Mexico_City' })
  zona!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          abre: { type: 'string', example: '09:00' },
          cierra: { type: 'string', example: '18:00' },
        },
        required: ['abre', 'cierra'],
      },
    },
    example: { lun: [{ abre: '09:00', cierra: '18:00' }] },
  })
  semana!: Record<string, OpeningIntervalResponseDto[]>;

  @ApiPropertyOptional({ type: () => [ScheduleExceptionResponseDto] })
  excepciones?: ScheduleExceptionResponseDto[];

  @ApiPropertyOptional({ example: false })
  siempreAbierto?: boolean;
}

export class PoiContactResponseDto {
  @ApiPropertyOptional({ example: '+52 415 123 4567' })
  telefono?: string;

  @ApiPropertyOptional({ example: '+52 415 123 4567' })
  whatsapp?: string;

  @ApiPropertyOptional({ format: 'uri', example: 'https://example.com' })
  sitio?: string;

  @ApiPropertyOptional({ format: 'uri', example: 'https://wa.me/524151234567' })
  whatsappUrl?: string;

  @ApiPropertyOptional({ example: 'tel:+524151234567' })
  telefonoUrl?: string;
}

export class PoiResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '3c78617f-5e1f-49e4-8e61-06f3c732473b',
  })
  id!: string;

  @ApiProperty({ example: 'Museo de la ciudad' })
  nombre!: string;

  @ApiProperty({ nullable: true, example: 'Colección histórica local.' })
  descripcion!: string | null;

  @ApiProperty({ enum: PoiCategory, example: PoiCategory.Cultural })
  categoria!: PoiCategory;

  @ApiProperty({ type: PoiMunicipalityResponseDto })
  municipio!: PoiMunicipalityResponseDto;

  @ApiProperty({ type: PoiPointResponseDto })
  ubicacion!: PoiPointResponseDto;

  @ApiProperty({ nullable: true, example: 'Centro, calle principal 10' })
  direccion!: string | null;

  @ApiProperty({ minimum: 0, example: 80 })
  costoPromedio!: number;

  @ApiProperty({ type: PoiScheduleResponseDto })
  horario!: PoiScheduleResponseDto;

  @ApiProperty({ type: PoiContactResponseDto })
  contacto!: PoiContactResponseDto;

  @ApiProperty({ minimum: 0, example: 90 })
  duracionVisitaMin!: number;

  @ApiProperty({ minimum: 0, maximum: 5, example: 4.7 })
  calificacionPromedio!: number;

  @ApiProperty({ minimum: 0, example: 120 })
  numeroResenas!: number;

  @ApiProperty({ example: false })
  destacado!: boolean;

  @ApiPropertyOptional({ minimum: 0, example: 850 })
  distanciaM?: number;
}

export class PaginatedPoisResponseDto {
  @ApiProperty({ type: () => [PoiResponseDto] })
  data!: PoiResponseDto[];

  @ApiProperty({ type: PaginationMetaDto })
  meta!: PaginationMetaDto;
}

export class MunicipalityResponseDto {
  @ApiProperty({
    format: 'uuid',
    example: '00000000-0000-4000-8000-000000000001',
  })
  id!: string;

  @ApiProperty({ example: 'San Miguel de Allende' })
  nombre!: string;

  @ApiProperty({ example: true })
  esPuebloMagico!: boolean;

  @ApiProperty({ type: PoiPointResponseDto, nullable: true })
  centro!: PoiPointResponseDto | null;
}
