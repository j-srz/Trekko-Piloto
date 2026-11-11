import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { appConfig } from './config/app.config.js';
import { databaseConfig } from './config/database.config.js';
import { securityConfig } from './config/security.config.js';
import { storageConfig } from './config/storage.config.js';
import { validateEnvironment } from './config/env.validation.js';
import { CommonModule } from './common/common.module.js';
import { AllExceptionsFilter } from './common/filters/http-exception.filter.js';
import { HealthModule } from './health/health.module.js';
import { StorageModule } from './storage/storage.module.js';
import { DatabaseStartupLogger } from './database/database-startup-logger.js';
import { buildPinoOptions } from './common/logger/pino-options.js';
import { AuthModule } from './auth/auth.module.js';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard.js';
import { RolesGuard } from './auth/guards/roles.guard.js';
import { RateLimitGuard } from './common/guards/rate-limit.guard.js';
import { PoisModule } from './pois/pois.module.js';
import { RoutesModule } from './routes/routes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, securityConfig, storageConfig],
      envFilePath: '.env',
      validate: validateEnvironment,
    }),
    LoggerModule.forRoot({
      pinoHttp: buildPinoOptions(),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        configService.getOrThrow('database'),
    }),
    CommonModule,
    StorageModule,
    HealthModule,
    AuthModule,
    PoisModule,
    RoutesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    DatabaseStartupLogger,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: RateLimitGuard },
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
