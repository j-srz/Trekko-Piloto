import { isOpenAt, PoiSchedule } from '../../pois/schedule/is-open-at.js';
import { PoiCategory } from '../../pois/poi.constants.js';

export type Pace = 'relajado' | 'normal' | 'intenso';

export interface RoutePoint {
  lat: number;
  lng: number;
}

export interface RouteCandidate extends RoutePoint {
  id: string;
  nombre: string;
  categoria: PoiCategory;
  costoPromedio: number;
  duracionVisitaMin: number;
  calificacionPromedio: number;
  horario: PoiSchedule;
}

export interface GenerateItineraryInput {
  fecha: string;
  horaInicio: string;
  horaFin?: string;
  duracionMaxMin?: number;
  presupuestoMax?: number;
  personas: number;
  categorias?: PoiCategory[];
  ritmo: Pace;
  puntoInicio?: RoutePoint;
  excluirPoiIds?: string[];
}

export interface ItineraryItem {
  poiId: string;
  nombre: string;
  categoria: PoiCategory;
  orden: number;
  horaLlegada: string;
  horaSalida: string;
  duracionVisitaMin: number;
  traslado: { distanciaM: number; minutos: number };
  costo: number;
  score: number;
}

interface ItineraryPlan {
  items: ItineraryItem[];
  desglose: {
    entradas: number;
    comida: number;
    hospedaje: number;
    transporte: number;
  };
  costoTotal: number;
  duracionTotalMin: number;
}

const paceFactors: Record<Pace, number> = {
  relajado: 1.25,
  normal: 1,
  intenso: 0.8,
};
const transportCostPerKmPerPerson = 2;
const lunchStartMinute = 13 * 60;
const lunchEndMinute = 15 * 60;

export function generateItinerary(
  input: GenerateItineraryInput,
  candidates: RouteCandidate[],
  origin: RoutePoint,
): {
  items: Omit<ItineraryItem, 'nombre' | 'categoria' | 'score'>[];
  costoTotal: number;
  costoEstimado: number;
  costoPorPersona: number;
  duracionTotalMin: number;
  advertencias: string[];
  desglose: ItineraryPlan['desglose'];
} {
  const startMinute = parseTime(input.horaInicio);
  const endMinute = input.horaFin
    ? parseTime(input.horaFin)
    : startMinute + (input.duracionMaxMin ?? 0);
  if (endMinute <= startMinute) {
    throw new RangeError('The itinerary end must be after its start');
  }
  const date = parseDate(input.fecha);
  const timezone =
    candidates[0]?.horario.zona ?? 'America/Mexico_City';
  const startAt = localDateTimeToInstant(
    date,
    startMinute,
    timezone,
  );
  const availableMinutes = endMinute - startMinute;
  const lunchWindow =
    startMinute < lunchEndMinute && endMinute > lunchStartMinute;
  const warnings: string[] = [];
  const removedForBudget = new Set(input.excluirPoiIds ?? []);
  let plan = buildPlan(
    input,
    candidates,
    origin,
    startAt,
    availableMinutes,
    startMinute,
    lunchWindow,
    removedForBudget,
  );

  while (
    input.presupuestoMax !== undefined &&
    plan.costoTotal > input.presupuestoMax &&
    plan.items.length > 0
  ) {
    const lowest = [...plan.items].sort(
      (left, right) =>
        left.score - right.score || right.poiId.localeCompare(left.poiId),
    )[0];
    removedForBudget.add(lowest.poiId);
    warnings.push(
      `Se omitio ${lowest.nombre} para respetar el presupuesto maximo.`,
    );
    plan = buildPlan(
      input,
      candidates,
      origin,
      startAt,
      availableMinutes,
      startMinute,
      lunchWindow,
      removedForBudget,
    );
  }

  if (plan.items.length === 0) {
    warnings.push('No se encontraron POIs abiertos y compatibles con el horario.');
  } else if (
    lunchWindow &&
    !plan.items.some((item) => item.categoria === PoiCategory.Restaurante)
  ) {
    warnings.push('No fue posible incluir un restaurante durante el horario de comida.');
  }

  const items = plan.items.map(
    ({ nombre: _nombre, categoria: _categoria, score: _score, ...item }) =>
      item,
  );
  return {
    items,
    costoTotal: plan.costoTotal,
    costoEstimado: plan.costoTotal,
    costoPorPersona: roundMoney(plan.costoTotal / input.personas),
    duracionTotalMin: plan.duracionTotalMin,
    advertencias: warnings,
    desglose: plan.desglose,
  };
}

function buildPlan(
  input: GenerateItineraryInput,
  candidates: RouteCandidate[],
  origin: RoutePoint,
  startAt: Date,
  availableMinutes: number,
  startMinute: number,
  lunchWindow: boolean,
  excludedIds: Set<string>,
): ItineraryPlan {
  const remaining = candidates.filter(
    (candidate) => !excludedIds.has(candidate.id),
  );
  const items: ItineraryItem[] = [];
  const desglose = {
    entradas: 0,
    comida: 0,
    hospedaje: 0,
    transporte: 0,
  };
  let currentPoint = input.puntoInicio ?? origin;
  let elapsedMinutes = 0;
  let totalCost = 0;

  while (remaining.length > 0) {
    const options = remaining
      .map((candidate) =>
        scoreCandidate(
          input,
          candidate,
          currentPoint,
          elapsedMinutes,
          startAt,
          startMinute,
          availableMinutes,
          lunchWindow,
          items.some((item) => item.categoria === PoiCategory.Restaurante),
        ),
      )
      .filter(
        (option): option is ScoredCandidate => option !== undefined,
      )
      .sort(
        (left, right) =>
          right.score - left.score || left.candidate.id.localeCompare(right.candidate.id),
      );
    const selected = options[0];
    if (!selected) break;

    const candidateIndex = remaining.findIndex(
      (candidate) => candidate.id === selected.candidate.id,
    );
    remaining.splice(candidateIndex, 1);
    const arrivalAt = addMinutes(startAt, selected.arrivalMinute);
    const departureAt = addMinutes(arrivalAt, selected.visitMinutes);
    const transportCost = roundMoney(
      (selected.distanceM / 1_000) *
        transportCostPerKmPerPerson *
        input.personas,
    );
    const poiCost = roundMoney(
      selected.candidate.costoPromedio * input.personas,
    );
    const itemCost = roundMoney(poiCost + transportCost);
    const item: ItineraryItem = {
      poiId: selected.candidate.id,
      nombre: selected.candidate.nombre,
      categoria: selected.candidate.categoria,
      orden: items.length + 1,
      horaLlegada: arrivalAt.toISOString(),
      horaSalida: departureAt.toISOString(),
      duracionVisitaMin: selected.visitMinutes,
      traslado: {
        distanciaM: Math.round(selected.distanceM),
        minutos: selected.travelMinutes,
      },
      costo: itemCost,
      score: selected.score,
    };
    items.push(item);
    totalCost += itemCost;
    desglose.transporte += transportCost;
    if (item.categoria === PoiCategory.Restaurante) {
      desglose.comida += poiCost;
    } else if (item.categoria === PoiCategory.Hospedaje) {
      desglose.hospedaje += poiCost;
    } else {
      desglose.entradas += poiCost;
    }

    currentPoint = selected.candidate;
    elapsedMinutes = selected.arrivalMinute + selected.visitMinutes;
  }

  return {
    items,
    desglose: {
      entradas: roundMoney(desglose.entradas),
      comida: roundMoney(desglose.comida),
      hospedaje: roundMoney(desglose.hospedaje),
      transporte: roundMoney(desglose.transporte),
    },
    costoTotal: roundMoney(totalCost),
    duracionTotalMin: elapsedMinutes,
  };
}

interface ScoredCandidate {
  candidate: RouteCandidate;
  arrivalMinute: number;
  travelMinutes: number;
  visitMinutes: number;
  distanceM: number;
  score: number;
}

function scoreCandidate(
  input: GenerateItineraryInput,
  candidate: RouteCandidate,
  currentPoint: RoutePoint,
  elapsedMinutes: number,
  startAt: Date,
  startMinute: number,
  availableMinutes: number,
  lunchWindow: boolean,
  mealIncluded: boolean,
): ScoredCandidate | undefined {
  const distanceM = haversineMeters(currentPoint, candidate);
  const travelMinutes = Math.ceil((distanceM * 1.3) / ((30_000 / 60)));
  let arrivalMinute = elapsedMinutes + travelMinutes;
  let mealWaitMinutes = 0;
  if (
    lunchWindow &&
    !mealIncluded &&
    candidate.categoria === PoiCategory.Restaurante
  ) {
    const mealStartOffset = lunchStartMinute - startMinute;
    const mealEndOffset = lunchEndMinute - startMinute;
    if (arrivalMinute < mealStartOffset) {
      mealWaitMinutes = mealStartOffset - arrivalMinute;
      arrivalMinute = mealStartOffset;
    }
    if (arrivalMinute >= mealEndOffset) return undefined;
  }

  const visitMinutes = Math.max(
    1,
    Math.round(candidate.duracionVisitaMin * paceFactors[input.ritmo]),
  );
  if (arrivalMinute + visitMinutes > availableMinutes) return undefined;
  const arrivalAt = addMinutes(startAt, arrivalMinute);
  if (!isOpenForDuration(candidate.horario, arrivalAt, visitMinutes)) {
    return undefined;
  }

  const categoryMatch =
    input.categorias?.length && input.categorias.includes(candidate.categoria)
      ? 100
      : 0;
  const distanceKm = distanceM / 1_000;
  const score =
    categoryMatch +
    candidate.calificacionPromedio * 10 -
    distanceKm * 4 -
    candidate.costoPromedio * 0.05 -
    mealWaitMinutes * 0.1;
  return {
    candidate,
    arrivalMinute,
    travelMinutes,
    visitMinutes,
    distanceM,
    score,
  };
}

function isOpenForDuration(
  schedule: PoiSchedule,
  arrival: Date,
  durationMinutes: number,
): boolean {
  for (let minute = 0; minute < durationMinutes; minute += 1) {
    if (!isOpenAt(schedule, addMinutes(arrival, minute))) return false;
  }
  return true;
}

function parseDate(value: string): Date {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || date.toISOString().slice(0, 10) !== value) {
    throw new RangeError('fecha must be a valid YYYY-MM-DD date');
  }
  return date;
}

function parseTime(value: string): number {
  if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)) {
    throw new RangeError('Time must use HH:mm');
  }
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function localDateTimeToInstant(
  date: Date,
  minuteOfDay: number,
  timezone: string,
): Date {
  const targetLocal = new Date(date.getTime() + minuteOfDay * 60_000);
  const targetUtc = targetLocal.getTime();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  let instant = targetUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = formatter.formatToParts(new Date(instant));
    const value = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((part) => part.type === type)?.value;
    const localAsUtc = Date.UTC(
      Number(value('year')),
      Number(value('month')) - 1,
      Number(value('day')),
      Number(value('hour')),
      Number(value('minute')),
    );
    instant += targetUtc - localAsUtc;
  }
  const result = new Date(instant);
  const formatted = formatter.formatToParts(result);
  const actual = ['year', 'month', 'day', 'hour', 'minute']
    .map((type) => formatted.find((part) => part.type === type)?.value ?? '')
    .join('');
  const expected = [
    targetLocal.getUTCFullYear(),
    String(targetLocal.getUTCMonth() + 1).padStart(2, '0'),
    String(targetLocal.getUTCDate()).padStart(2, '0'),
    String(targetLocal.getUTCHours()).padStart(2, '0'),
    String(targetLocal.getUTCMinutes()).padStart(2, '0'),
  ].join('');
  if (actual !== expected) {
    throw new RangeError('Local itinerary time does not exist in its timezone');
  }
  return result;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

function haversineMeters(from: RoutePoint, to: RoutePoint): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.lat)) *
      Math.cos(radians(to.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
