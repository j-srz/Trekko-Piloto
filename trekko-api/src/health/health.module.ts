import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StorageModule } from '../storage/storage.module.js';
import { CommonModule } from '../common/common.module.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TypeOrmModule, StorageModule, CommonModule],
  controllers: [HealthController],
})
export class HealthModule {}
