import { Module, RequestMethod } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { resolve } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { PinoLogger } from 'nestjs-pino';
import { AppController } from '../src/app.controller.js';
import { AppService } from '../src/app.service.js';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { HealthController } from '../src/health/health.controller.js';
import { ClockService } from '../src/common/services/clock.service.js';
import { DataSource } from 'typeorm';
import { StorageService } from '../src/storage/storage.service.js';
import { MunicipalitiesController } from '../src/pois/municipalities.controller.js';
import { PoisController } from '../src/pois/pois.controller.js';
import { PoisService } from '../src/pois/pois.service.js';
import { RoutesController } from '../src/routes/routes.controller.js';
import { RoutesService } from '../src/routes/routes.service.js';

@Module({
  controllers: [
    AppController,
    HealthController,
    AuthController,
    PoisController,
    MunicipalitiesController,
    RoutesController,
  ],
  providers: [
    AppService,
    { provide: AuthService, useValue: {} },
    { provide: PoisService, useValue: {} },
    { provide: RoutesService, useValue: {} },
    { provide: DataSource, useValue: {} },
    { provide: StorageService, useValue: {} },
    { provide: ClockService, useValue: {} },
    { provide: PinoLogger, useValue: {} },
  ],
})
class OpenApiModule {}

const app = await NestFactory.create(OpenApiModule, { logger: false });
try {
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/ready', method: RequestMethod.ALL },
    ],
  });
  const config = new DocumentBuilder()
    .setTitle('Trekko API')
    .setDescription('Trekko backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  await writeFile(
    resolve('docs/openapi.json'),
    `${JSON.stringify(document, null, 2)}\n`,
    'utf8',
  );
} finally {
  await app.close();
}
