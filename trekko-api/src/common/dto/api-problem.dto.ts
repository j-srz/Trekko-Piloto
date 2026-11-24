import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiProblemDto {
  @ApiProperty({ example: 'https://httpstatuses.com/400', format: 'uri' })
  type!: string;

  @ApiProperty({ example: 'Bad Request' })
  title!: string;

  @ApiProperty({ example: 400, minimum: 400, maximum: 599 })
  status!: number;

  @ApiProperty({ example: 'Request failed' })
  detail!: string;

  @ApiProperty({ example: '/api/v1/auth/register' })
  instance!: string;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiPropertyOptional({ example: 'b6f96374-0d2f-4f15-a0ec-2a6df2f437be' })
  requestId?: string;
}
