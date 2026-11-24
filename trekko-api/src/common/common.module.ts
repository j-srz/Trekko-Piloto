import { Module } from '@nestjs/common';
import { ClockService } from './services/clock.service.js';
import { CryptoService } from './services/crypto.service.js';

@Module({
  providers: [ClockService, CryptoService],
  exports: [ClockService, CryptoService],
})
export class CommonModule {}
