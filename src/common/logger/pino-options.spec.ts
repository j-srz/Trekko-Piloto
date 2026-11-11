import { jest } from '@jest/globals';
import { IncomingMessage, ServerResponse } from 'node:http';
import { buildPinoOptions } from './pino-options.js';

describe('buildPinoOptions', () => {
  it('redacts credentials and configures a stable incoming request ID', () => {
    const options = buildPinoOptions({ NODE_ENV: 'test', LOG_LEVEL: 'debug' });
    const setHeader = jest.fn();
    const request = {
      headers: { 'x-request-id': 'client-request-42' },
    } as unknown as IncomingMessage;
    const response = { setHeader } as unknown as ServerResponse;
    const requestId = options.genReqId?.(request, response);

    expect(options.level).toBe('debug');
    expect(options.redact).toMatchObject({
      paths: expect.arrayContaining([
        'req.headers.authorization',
        'req.body.password',
        '*.refreshToken',
        'req.body.tokens',
      ]),
      censor: '[REDACTED]',
    });
    expect(requestId).toBe('client-request-42');
    expect(setHeader).toHaveBeenCalledWith('x-request-id', 'client-request-42');
  });

  it('generates a request ID for absent or invalid client IDs', () => {
    const options = buildPinoOptions({ NODE_ENV: 'production' });
    const setHeader = jest.fn();
    const request = {
      headers: { 'x-request-id': ['invalid'] },
    } as unknown as IncomingMessage;
    const response = { setHeader } as unknown as ServerResponse;
    const requestId = options.genReqId?.(request, response);

    expect(typeof requestId).toBe('string');
    expect(requestId).toHaveLength(36);
    expect(options.transport).toBeUndefined();
    expect(setHeader).toHaveBeenCalledWith('x-request-id', requestId);
  });

  it('rejects oversized client request IDs and uses process defaults', () => {
    const options = buildPinoOptions();
    const setHeader = jest.fn();
    const request = {
      headers: { 'x-request-id': 'x'.repeat(129) },
    } as unknown as IncomingMessage;
    const response = { setHeader } as unknown as ServerResponse;
    const requestId = options.genReqId?.(request, response);

    expect(requestId).not.toBe('x'.repeat(129));
    expect(requestId).toHaveLength(36);
    expect(options.level).toBe('info');
  });

  it('rejects request IDs containing unsafe header characters', () => {
    const options = buildPinoOptions({ NODE_ENV: 'test' });
    const request = {
      headers: { 'x-request-id': 'invalid\r\nheader' },
    } as unknown as IncomingMessage;
    const response = { setHeader: jest.fn() } as unknown as ServerResponse;

    expect(options.genReqId?.(request, response)).toHaveLength(36);
  });
});
