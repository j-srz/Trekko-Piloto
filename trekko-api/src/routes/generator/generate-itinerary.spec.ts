import { PoiCategory } from '../../pois/poi.constants.js';
import { PoiSchedule } from '../../pois/schedule/is-open-at.js';
import {
  generateItinerary,
  GenerateItineraryInput,
  RouteCandidate,
} from './generate-itinerary.js';

describe('generateItinerary', () => {
  const openAllDay: PoiSchedule = {
    zona: 'America/Mexico_City',
    semana: {
      lun: [{ abre: '08:00', cierra: '18:00' }],
    },
  };
  const candidates: RouteCandidate[] = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      nombre: 'Patio Ficticio',
      categoria: PoiCategory.Cultural,
      lat: 21.8853,
      lng: -102.2916,
      costoPromedio: 50,
      duracionVisitaMin: 60,
      calificacionPromedio: 4.5,
      horario: openAllDay,
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      nombre: 'Mesa Ficticia',
      categoria: PoiCategory.Restaurante,
      lat: 21.8863,
      lng: -102.2916,
      costoPromedio: 30,
      duracionVisitaMin: 45,
      calificacionPromedio: 4,
      horario: openAllDay,
    },
  ];
  const input: GenerateItineraryInput = {
    fecha: '2026-11-09',
    horaInicio: '09:00',
    horaFin: '14:00',
    personas: 2,
    categorias: [PoiCategory.Cultural, PoiCategory.Restaurante],
    ritmo: 'normal',
  };

  it('is deterministic and reports group and per-person costs', () => {
    const first = generateItinerary(input, candidates, candidates[0]);
    const second = generateItinerary(input, candidates, candidates[0]);

    expect(first).toEqual(second);
    expect(first.items).toHaveLength(2);
    expect(first.items.map((item) => item.orden)).toEqual([1, 2]);
    expect(first.items[0].horaLlegada).toBe('2026-11-09T15:00:00.000Z');
    expect(first.costoPorPersona).toBe(first.costoTotal / input.personas);
    expect(first.desglose.comida).toBe(60);
    expect(first.desglose.entradas).toBe(100);
  });

  it('removes the lowest-scoring POI until the total budget is respected', () => {
    const result = generateItinerary(
      { ...input, presupuestoMax: 130 },
      candidates,
      candidates[0],
    );

    expect(result.items).toHaveLength(1);
    expect(result.costoTotal).toBeLessThanOrEqual(130);
    expect(result.advertencias[0]).toContain('Mesa Ficticia');
  });

  it('does not schedule a POI outside its opening window', () => {
    const closed: RouteCandidate[] = candidates.map((candidate) => ({
      ...candidate,
      horario: { zona: 'America/Mexico_City', semana: {} },
    }));
    const result = generateItinerary(input, closed, candidates[0]);

    expect(result.items).toEqual([]);
    expect(result.advertencias).toContain(
      'No se encontraron POIs abiertos y compatibles con el horario.',
    );
  });

  it('adjusts visit times by pace and includes a restaurant when lunch fits', () => {
    const relaxed = generateItinerary(
      {
        ...input,
        ritmo: 'relajado',
        horaInicio: '12:45',
        horaFin: '15:00',
        categorias: [PoiCategory.Restaurante],
      },
      candidates,
      candidates[0],
    );
    const intense = generateItinerary(
      {
        ...input,
        ritmo: 'intenso',
        horaInicio: '12:45',
        horaFin: '15:00',
        categorias: [PoiCategory.Restaurante],
      },
      candidates,
      candidates[0],
    );

    expect(relaxed.items.some((item) => item.poiId === candidates[1].id)).toBe(
      true,
    );
    expect(relaxed.items[0].duracionVisitaMin).toBeGreaterThan(
      intense.items[0].duracionVisitaMin,
    );
  });
});
