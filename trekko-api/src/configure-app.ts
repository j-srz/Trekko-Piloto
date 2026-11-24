import { INestApplication, RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';

export function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'health', method: RequestMethod.ALL },
      { path: 'health/ready', method: RequestMethod.ALL },
    ],
  });
  const logger = app.get(Logger);
  app.useLogger(logger);
  app.flushLogs();
  app.use(helmet());

  const origins = (process.env.CORS_ORIGINS ?? 'http://localhost:8081')
    .split(',')
    .map((origin) => origin.trim());
  app.enableCors({ origin: origins, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      stopAtFirstError: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Trekko API')
    .setDescription('Trekko backend API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs/openapi.json',
  });
  logger.log('Swagger documentation available at /api/docs', 'Bootstrap');
}
