import { ExecutionContext, HttpException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { jest } from '@jest/globals';
import { RateLimitGuard } from './rate-limit.guard.js';

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue({
      limit: 2,
      ttl: 60_000,
    });
    guard = new RateLimitGuard(reflector);
  });

  it('limits each client and route independently', () => {
    const request = { ip: '192.0.2.1', method: 'POST', path: '/auth/login' };
    const context = createContext(request);
    expect(guard.canActivate(context)).toBe(true);
    expect(guard.canActivate(context)).toBe(true);
    try {
      guard.canActivate(context);
      throw new Error('Expected request to be rate limited');
    } catch (error) {
      expect(error).toBeInstanceOf(HttpException);
      expect((error as HttpException).getStatus()).toBe(429);
    }
    expect(
      guard.canActivate(
        createContext({ ...request, path: '/auth/register' }),
      ),
    ).toBe(true);
  });

  it('starts a new window after expiration', () => {
    jest.useFakeTimers();
    try {
      const context = createContext({
        ip: '192.0.2.2',
        method: 'POST',
        path: '/auth/login',
      });
      expect(guard.canActivate(context)).toBe(true);
      expect(guard.canActivate(context)).toBe(true);
      jest.advanceTimersByTime(60_001);
      expect(guard.canActivate(context)).toBe(true);
    } finally {
      jest.useRealTimers();
    }
  });

  function createContext(request: {
    ip: string;
    method: string;
    path: string;
  }): ExecutionContext {
    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => undefined,
        getNext: () => undefined,
      }),
      getHandler: () => createContext,
      getClass: () => RateLimitGuard,
      getArgs: () => [],
      getArgByIndex: () => undefined,
      switchToRpc: () => ({
        getData: () => undefined,
        getContext: () => undefined,
      }),
      switchToWs: () => ({
        getClient: () => undefined,
        getData: () => undefined,
        getPattern: () => '',
      }),
      getType: () => 'http',
    } as ExecutionContext;
  }
});
