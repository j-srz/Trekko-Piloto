import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { RATE_LIMIT_KEY, type RateLimit } from './rate-limit.decorator.js';

@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, { startedAt: number; count: number }>();
  private readonly defaultLimit: RateLimit = { limit: 120, ttl: 60_000 };

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const policy =
      this.reflector.getAllAndOverride<RateLimit>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? this.defaultLimit;
    const now = Date.now();
    const route = request.route?.path ?? request.path;
    const key = `${request.ip}:${request.method}:${route}`;
    const current = this.windows.get(key);
    if (!current || now - current.startedAt >= policy.ttl) {
      this.windows.set(key, { startedAt: now, count: 1 });
    } else if (current.count >= policy.limit) {
      throw new HttpException(
        { code: 'RATE_LIMITED', message: 'Too many requests' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    } else {
      current.count += 1;
    }
    this.pruneExpired(now, policy.ttl);
    return true;
  }

  private pruneExpired(now: number, ttl: number): void {
    if (this.windows.size <= 10_000) return;
    for (const [key, window] of this.windows) {
      if (now - window.startedAt >= ttl) this.windows.delete(key);
    }
    while (this.windows.size > 10_000) {
      const oldest = this.windows.keys().next().value;
      if (oldest === undefined) break;
      this.windows.delete(oldest);
    }
  }
}
