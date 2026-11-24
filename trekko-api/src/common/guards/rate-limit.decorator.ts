import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';

export interface RateLimit {
  limit: number;
  ttl: number;
}

export const Throttle = (limit: number, ttl = 60_000) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, ttl } satisfies RateLimit);
