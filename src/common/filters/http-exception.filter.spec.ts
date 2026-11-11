import { jest } from '@jest/globals';
import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { AllExceptionsFilter } from './http-exception.filter.js';

describe('AllExceptionsFilter', () => {
  const logger = { error: jest.fn() } as unknown as PinoLogger;
  const filter = new AllExceptionsFilter(logger);

  function invoke(exception: unknown, url = '/test', requestId?: string) {
    const response = {
      status: jest.fn().mockReturnThis(),
      type: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    const request = { url, originalUrl: url, id: requestId };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => request,
      }),
    } as unknown as ArgumentsHost;

    filter.catch(exception, host);
    return response;
  }

  it('returns RFC 7807 details for client errors, including validation messages', () => {
    const response = invoke(
      new BadRequestException({
        message: ['name is required'],
        code: 'INVALID',
      }),
      '/test',
      'request-123',
    );
    const problem = response.json.mock.calls[0]?.[0] as { detail: string };

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.type).toHaveBeenCalledWith('application/problem+json');
    expect(problem).toMatchObject({
      type: 'https://httpstatuses.com/400',
      title: 'Bad Request',
      status: 400,
      detail: 'name is required',
      instance: '/test',
      code: 'INVALID',
      requestId: 'request-123',
    });
  });

  it('does not disclose internal exception details in 5xx responses', () => {
    const response = invoke(new Error('database password should not leak'));
    const problem = response.json.mock.calls[0]?.[0] as { detail: string };

    expect(response.status).toHaveBeenCalledWith(500);
    expect(problem.detail).toBe('An unexpected error occurred');
    expect(problem.detail).not.toContain('password');
    expect(logger.error).toHaveBeenCalled();
  });

  it('preserves the status and message of HTTP exceptions', () => {
    const response = invoke(
      new HttpException('resource missing', 404),
      '/missing',
    );

    expect(response.json.mock.calls[0][0]).toMatchObject({
      title: 'Not Found',
      status: 404,
      detail: 'resource missing',
      instance: '/missing',
      code: 'NOT_FOUND',
    });
  });

  it('uses safe defaults when an HTTP exception has no public message or request ID', () => {
    const response = invoke(
      new HttpException({ error: 'ignored' }, 418),
      '/teapot',
    );

    expect(response.status).toHaveBeenCalledWith(418);
    expect(response.json.mock.calls[0]?.[0]).toMatchObject({
      title: 'Error',
      status: 418,
      detail: 'Request failed',
      instance: '/teapot',
      code: 'HTTP_ERROR',
    });
    expect(response.json.mock.calls[0]?.[0]).not.toHaveProperty('requestId');
  });
});
