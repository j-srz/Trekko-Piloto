import { Injectable } from '@nestjs/common';

@Injectable()
export class ClockService {
  now(): Date {
    return new Date();
  }

  nowIso(): string {
    return this.now().toISOString();
  }
}
