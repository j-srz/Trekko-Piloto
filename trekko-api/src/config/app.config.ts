import { registerAs } from '@nestjs/config';

export const appConfig = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 3000),
  appUrl: process.env.APP_URL ?? 'http://localhost:3000',
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:8081')
    .split(',')
    .map((origin) => origin.trim()),
  logLevel: process.env.LOG_LEVEL ?? 'info',
}));
