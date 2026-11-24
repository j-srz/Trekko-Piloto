import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ApiProblemDto } from '../dto/api-problem.dto.js';

export function ApiProblemResponse(status: number, description: string) {
  return applyDecorators(
    ApiExtraModels(ApiProblemDto),
    ApiResponse({
      status,
      description,
      content: {
        'application/problem+json': {
          schema: { $ref: getSchemaPath(ApiProblemDto) },
        },
      },
    }),
  );
}
