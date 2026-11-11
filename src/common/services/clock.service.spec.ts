import { jest } from '@jest/globals';
import { ClockService } from './clock.service.js';

describe('ClockService', () => {
  const clock = new ClockService();

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the current instant', () => {
    const instant = new Date('2026-11-10T12:00:00.000Z');
    jest.useFakeTimers().setSystemTime(instant);

    expect(clock.now()).toEqual(instant);
    expect(clock.nowIso()).toBe('2026-11-10T12:00:00.000Z');
  });
});
