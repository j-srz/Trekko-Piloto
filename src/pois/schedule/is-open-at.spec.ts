import { isOpenAt, PoiSchedule } from './is-open-at.js';

describe('isOpenAt', () => {
  const schedule: PoiSchedule = {
    zona: 'America/Mexico_City',
    semana: {
      lun: [{ abre: '09:00', cierra: '18:00' }],
      mar: [
        { abre: '09:00', cierra: '14:00' },
        { abre: '16:00', cierra: '20:00' },
      ],
      vie: [{ abre: '22:00', cierra: '02:00' }],
      dom: [],
    },
  };

  it('handles normal intervals and split shifts with an exclusive closing time', () => {
    expect(isOpenAt(schedule, new Date('2026-11-09T16:00:00.000Z'))).toBe(true);
    expect(isOpenAt(schedule, new Date('2026-11-10T20:30:00.000Z'))).toBe(false);
    expect(isOpenAt(schedule, new Date('2026-11-10T22:30:00.000Z'))).toBe(true);
    expect(isOpenAt(schedule, new Date('2026-11-11T02:00:00.000Z'))).toBe(false);
  });

  it('does not carry an overnight opening into a closed exception date', () => {
    const withException: PoiSchedule = {
      ...schedule,
      excepciones: [{ fecha: '2026-11-07', cerrado: true }],
    };
    expect(isOpenAt(withException, new Date('2026-11-07T07:00:00.000Z'))).toBe(
      false,
    );
  });

  it('keeps an overnight opening through midnight and closes at its end', () => {
    expect(isOpenAt(schedule, new Date('2026-11-07T05:30:00.000Z'))).toBe(true);
    expect(isOpenAt(schedule, new Date('2026-11-07T08:00:00.000Z'))).toBe(false);
  });

  it('applies closed-date exceptions to the whole local date', () => {
    const withException: PoiSchedule = {
      ...schedule,
      excepciones: [{ fecha: '2026-11-09', cerrado: true }],
    };
    expect(isOpenAt(withException, new Date('2026-11-09T16:00:00.000Z'))).toBe(
      false,
    );
  });

  it('supports always-open schedules and rejects malformed schedule values', () => {
    expect(
      isOpenAt(
        { zona: 'UTC', semana: {}, siempreAbierto: true },
        new Date('2026-11-09T00:00:00.000Z'),
      ),
    ).toBe(true);
    expect(() =>
      isOpenAt(
        {
          zona: 'UTC',
          semana: { lun: [{ abre: '9:00', cierra: '18:00' }] },
        },
        new Date('2026-11-09T12:00:00.000Z'),
      ),
    ).toThrow('Invalid schedule time');
  });
});
