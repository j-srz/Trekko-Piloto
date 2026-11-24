import { Module } from '@nestjs/common';
import { MunicipalitiesController } from './municipalities.controller.js';
import { PoisController } from './pois.controller.js';
import { PoisService } from './pois.service.js';

@Module({
  controllers: [PoisController, MunicipalitiesController],
  providers: [PoisService],
})
export class PoisModule {}
