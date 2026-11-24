export interface OpeningInterval {
  abre: string;
  cierra: string;
}

export interface ScheduleException {
  fecha: string;
  cerrado?: boolean;
  intervalos?: OpeningInterval[];
}

export interface PoiSchedule {
  zona: string;
  semana: Partial<
    Record<
      'lun' | 'mar' | 'mie' | 'jue' | 'vie' | 'sab' | 'dom',
      OpeningInterval[]
    >
  >;
  excepciones?: ScheduleException[];
  siempreAbierto?: boolean;
}

const weekdayKeys = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'] as const;
const weekdayIndexes: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};
const formatterCache = new Map<string, Intl.DateTimeFormat>();

export function isOpenAt(
  schedule: PoiSchedule | null | undefined,
  instant: Date,
): boolean {
  if (!schedule) return false;
  if (Number.isNaN(instant.getTime())) {
    throw new RangeError('instant must be a valid date');
  }
  if (schedule.siempreAbierto) return true;
  if (!schedule.zona) throw new TypeError('schedule timezone is required');

  let formatter = formatterCache.get(schedule.zona);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: schedule.zona,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    formatterCache.set(schedule.zona, formatter);
  }
  const parts = formatter.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value;
  const weekday = value('weekday');
  const year = value('year');
  const month = value('month');
  const day = value('day');
  const hour = value('hour');
  const minute = value('minute');
  if (!weekday || !year || !month || !day || !hour || !minute) {
    throw new Error('Unable to resolve local schedule time');
  }

  const weekdayIndex = weekdayIndexes[weekday.toLowerCase().slice(0, 3)];
  if (weekdayIndex === undefined) {
    throw new Error(`Unsupported weekday: ${weekday}`);
  }
  const localDate = `${year}-${month}-${day}`;
  if (
    schedule.excepciones?.some(
      (exception) => exception.fecha === localDate && exception.cerrado,
    )
  ) {
    return false;
  }
  const previousDate = new Date(
    Date.UTC(Number(year), Number(month) - 1, Number(day) - 1),
  )
    .toISOString()
    .slice(0, 10);
  const minuteOfDay = Number(hour) * 60 + Number(minute);

  const todayIntervals = intervalsFor(schedule, localDate, weekdayKeys[weekdayIndex]);
  if (todayIntervals.some((interval) => containsMinute(interval, minuteOfDay))) {
    return true;
  }

  const previousWeekday = weekdayKeys[(weekdayIndex + 6) % 7];
  return intervalsFor(schedule, previousDate, previousWeekday).some(
    (interval) => {
      const { abre, cierra } = intervalToMinutes(interval);
      return cierra < abre && minuteOfDay < cierra;
    },
  );
}

function intervalsFor(
  schedule: PoiSchedule,
  date: string,
  weekday: (typeof weekdayKeys)[number],
): OpeningInterval[] {
  const exception = schedule.excepciones?.find((item) => item.fecha === date);
  if (exception?.cerrado) return [];
  return exception?.intervalos ?? schedule.semana[weekday] ?? [];
}

function containsMinute(interval: OpeningInterval, minute: number): boolean {
  const { abre, cierra } = intervalToMinutes(interval);
  return cierra > abre && minute >= abre && minute < cierra
    ? true
    : cierra < abre && minute >= abre;
}

function intervalToMinutes(interval: OpeningInterval): {
  abre: number;
  cierra: number;
} {
  return {
    abre: parseTime(interval.abre),
    cierra: parseTime(interval.cierra),
  };
}

function parseTime(value: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new TypeError(`Invalid schedule time: ${value}`);
  }
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}
