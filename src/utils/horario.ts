import type { PoiSchedule } from '../api/pois';

const DIAS = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'] as const;
const DIAS_INGLES: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};

function minutos(hora: string): number {
  const [horas, mins] = hora.split(':').map(Number);
  return horas * 60 + mins;
}

export function estaAbiertoAhora(schedule: PoiSchedule | null): boolean | null {
  if (!schedule) return null;
  if (schedule.siempreAbierto) return true;

  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-US', {
      timeZone: schedule.zona,
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
  } catch {
    return null;
  }
  const part = (key: string) => parts.find((item) => item.type === key)?.value;
  const weekday = part('weekday');
  const year = part('year');
  const month = part('month');
  const day = part('day');
  const hour = part('hour');
  const minute = part('minute');
  if (!weekday || !year || !month || !day || !hour || !minute) return null;

  const dayIndex = DIAS_INGLES[weekday.slice(0, 3).toLowerCase()];
  if (dayIndex === undefined) return null;
  const date = `${year}-${month}-${day}`;
  if (schedule.excepciones?.some((item) => item.fecha === date && item.cerrado)) return false;

  const exception = schedule.excepciones?.find((item) => item.fecha === date);
  const intervals = exception?.intervalos ?? schedule.semana[DIAS[dayIndex]] ?? [];
  const currentMinute = Number(hour) * 60 + Number(minute);
  if (intervals.some(({ abre, cierra }) => {
    const start = minutos(abre);
    const end = minutos(cierra);
    return end > start
      ? currentMinute >= start && currentMinute < end
      : end < start && currentMinute >= start;
  })) {
    return true;
  }

  const previousDate = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day) - 1))
    .toISOString()
    .slice(0, 10);
  const previousDay = DIAS[(dayIndex + 6) % 7];
  if (schedule.excepciones?.some((item) => item.fecha === previousDate && item.cerrado)) return false;
  const previousException = schedule.excepciones?.find((item) => item.fecha === previousDate);
  const previousIntervals = previousException?.intervalos ?? schedule.semana[previousDay] ?? [];
  return previousIntervals.some(({ abre, cierra }) => {
    const start = minutos(abre);
    const end = minutos(cierra);
    return end < start && currentMinute < end;
  });
}

export function formatearHorario(schedule: PoiSchedule | null): string[] {
  if (!schedule) return [];
  if (schedule.siempreAbierto) return ['Abierto las 24 horas'];
  const nombres: Record<(typeof DIAS)[number], string> = {
    dom: 'Domingo',
    lun: 'Lunes',
    mar: 'Martes',
    mie: 'Miércoles',
    jue: 'Jueves',
    vie: 'Viernes',
    sab: 'Sábado',
  };
  const lines = DIAS.flatMap((dia) => {
    const intervalos = schedule.semana[dia] ?? [];
    return intervalos.length
      ? [`${nombres[dia]}: ${intervalos.map(({ abre, cierra }) => `${abre}-${cierra}`).join(', ')}`]
      : [];
  });
  return lines.length ? lines : ['Horario no disponible'];
}
