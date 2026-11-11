import {
  generarItinerario,
  type GenerateItineraryInput,
  type GeneratedItinerary,
} from '../../../api/itinerary';
import { obtenerPoi, type Poi } from '../../../api/pois';

export type ItineraryStop = GeneratedItinerary['items'][number] & { poi: Poi };

export type ItineraryWithDetails = Omit<GeneratedItinerary, 'items'> & {
  items: ItineraryStop[];
  offline: boolean;
};

export async function generarItinerarioConDetalles(
  input: GenerateItineraryInput,
): Promise<ItineraryWithDetails> {
  const generated = await generarItinerario(input);
  const orderedItems = [...generated.items].sort((a, b) => a.orden - b.orden);
  const pois: Poi[] = [];
  let offline = false;
  for (let index = 0; index < orderedItems.length; index += 5) {
    const batch = orderedItems.slice(index, index + 5);
    const responses = await Promise.all(batch.map(({ poiId }) => obtenerPoi(poiId)));
    pois.push(...responses.map((response) => response.data));
    offline ||= responses.some((response) => response.offline);
  }
  return {
    ...generated,
    items: orderedItems.map((item, index) => ({ ...item, poi: pois[index] })),
    offline,
  };
}
