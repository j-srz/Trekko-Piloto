import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator.js';
import { ApiProblemResponse } from '../common/decorators/api-problem-response.decorator.js';
import { PoisService } from './pois.service.js';
import { MunicipalityResponseDto } from './dto/poi-responses.dto.js';

@ApiTags('municipios')
@Public()
@Controller('municipios')
export class MunicipalitiesController {
  constructor(private readonly pois: PoisService) {}

  @Get()
  @ApiOperation({ summary: 'List available municipalities and their centers' })
  @ApiResponse({
    status: 200,
    description: 'Municipality list',
    type: MunicipalityResponseDto,
    isArray: true,
  })
  @ApiProblemResponse(429, 'Rate limit exceeded')
  list() {
    return this.pois.municipalities();
  }
}
