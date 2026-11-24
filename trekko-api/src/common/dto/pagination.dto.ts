import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetaDto {
  @ApiProperty({ minimum: 1, example: 1 })
  page!: number;

  @ApiProperty({ minimum: 1, maximum: 100, example: 20 })
  limit!: number;

  @ApiProperty({ minimum: 0, example: 40 })
  total!: number;

  @ApiProperty({ minimum: 0, example: 2 })
  totalPages!: number;
}
