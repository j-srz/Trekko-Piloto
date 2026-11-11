import { randomUUID } from 'node:crypto';
import { Options as PinoHttpOptions } from 'pino-http';

export function buildPinoOptions(
  environment: NodeJS.ProcessEnv = process.env,
): PinoHttpOptions {
  return {
    level: environment.LOG_LEVEL ?? 'info',
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.authorization',
        'req.body.password',
        'req.body.token',
        'req.body.tokens',
        'req.body.accessToken',
        'req.body.refreshToken',
        'req.body.access_token',
        'req.body.refresh_token',
        '*.password',
        '*.token',
        '*.tokens',
        '*.accessToken',
        '*.refreshToken',
        '*.access_token',
        '*.refresh_token',
      ],
      censor: '[REDACTED]',
    },
    genReqId: (request, response) => {
      const requestId = request.headers['x-request-id'];
      const id =
        typeof requestId === 'string' &&
        /^[A-Za-z0-9._:-]{1,128}$/.test(requestId)
          ? requestId
          : randomUUID();
      response.setHeader('x-request-id', id);
      return id;
    },
    transport:
      environment.NODE_ENV === 'development'
        ? {
            target: 'pino-pretty',
            options: { colorize: false, translateTime: 'SYS:standard' },
          }
        : undefined,
  };
}
