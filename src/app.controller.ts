import { Controller, Get } from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AppService } from './app.service.js';
import { Public } from './auth/decorators/public.decorator.js';

@ApiTags('root')
@Public()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiExcludeEndpoint()
  @ApiOperation({ summary: 'Root endpoint placeholder' })
  getHello(): string {
    return this.appService.getHello();
  }
}
