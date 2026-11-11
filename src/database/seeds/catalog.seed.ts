import { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';

const municipalities = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    nombre: 'Aguascalientes',
    esPuebloMagico: false,
    lng: -102.2916,
    lat: 21.8853,
    pois: [
      'Patio de los Vientos',
      'Taller Nube de Barro',
      'Mirador de la Cantera Azul',
      'La Mesa del Mezquite',
      'Jardin de las Luciernagas',
      'Casa del Mapa Antiguo',
      'Sendero del Arroyo Claro',
      'Posada del Anden Verde',
      'Estacion de Bicicletas del Centro',
      'Galeria del Cobre Dormido',
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    nombre: 'Calvillo',
    esPuebloMagico: true,
    lng: -102.7183,
    lat: 21.8456,
    pois: [
      'Huerto de la Brisa Dulce',
      'Taller de Papel de Guayaba',
      'Cascada del Sendero Escondido',
      'Cocina del Patio Amarillo',
      'Mirador de las Nubes Bajitas',
      'Museo de la Ruta Imaginaria',
      'Rincon de las Macetas Azules',
      'Campamento del Pino Quieto',
      'Parador del Camino del Rio',
      'Casa de Oficios del Valle',
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    nombre: 'Real de Asientos',
    esPuebloMagico: true,
    lng: -102.0894,
    lat: 22.2385,
    pois: [
      'Plaza de la Lluvia Serena',
      'Taller de Piedra de Luna',
      'Tunel de los Ecos Suaves',
      'Cocina del Horno de Barro',
      'Mirador de la Mina Azul',
      'Archivo de Historias del Norte',
      'Jardin del Silencio Mineral',
      'Posada de los Faroles Grises',
      'Andador de la Estacion Vieja',
      'Mercado de la Cantera Clara',
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    nombre: 'San José de Gracia',
    esPuebloMagico: true,
    lng: -102.417,
    lat: 22.1518,
    pois: [
      'Muelle de la Luna Verde',
      'Taller de Madera del Lago',
      'Sendero de los Sauces Quietos',
      'Comedor de la Orilla Clara',
      'Mirador del Viento del Norte',
      'Centro de Relatos del Agua',
      'Jardin de las Piedras Blancas',
      'Refugio de la Presa Serena',
      'Parador de los Remeros',
      'Galeria de los Pescadores de Papel',
    ],
  },
] as const;

const categories = [
  'restaurante',
  'artesania',
  'aventura',
  'restaurante',
  'naturaleza',
  'cultural',
  'artesania',
  'hospedaje',
  'transporte',
  'cultural',
] as const;
const weekdayKeys = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;

export async function seedCatalog(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    await seedMunicipalities(manager);
    await seedPois(manager);
  });
}

async function seedMunicipalities(manager: EntityManager): Promise<void> {
  for (const municipality of municipalities) {
    await manager.query(
      `INSERT INTO municipio (id, nombre, es_pueblo_magico, centro)
       VALUES ($1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326))
       ON CONFLICT (id) DO UPDATE SET
         nombre = EXCLUDED.nombre,
         es_pueblo_magico = EXCLUDED.es_pueblo_magico,
         centro = EXCLUDED.centro`,
      [
        municipality.id,
        municipality.nombre,
        municipality.esPuebloMagico,
        municipality.lng,
        municipality.lat,
      ],
    );
  }
}

async function seedPois(manager: EntityManager): Promise<void> {
  for (let municipalityIndex = 0; municipalityIndex < municipalities.length; municipalityIndex += 1) {
    const municipality = municipalities[municipalityIndex];
    for (let poiIndex = 0; poiIndex < municipality.pois.length; poiIndex += 1) {
      const number = municipalityIndex * 10 + poiIndex + 1;
      const category = categories[poiIndex];
      const latitude = municipality.lat + (poiIndex - 4.5) * 0.003;
      const longitude = municipality.lng + (poiIndex - 4.5) * 0.003;
      const hours = createSchedule(category);
      const id = `10000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
      await manager.query(
        `INSERT INTO poi
           (id, nombre, descripcion, categoria, municipio_id, ubicacion,
            direccion, costo_promedio, horario, contacto, duracion_visita_min,
            calificacion_promedio, numero_resenas)
         VALUES (
           $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326),
           $8, $9, $10::jsonb, $11::jsonb, $12, $13, $14
         )
         ON CONFLICT (id) DO UPDATE SET
           nombre = EXCLUDED.nombre,
           descripcion = EXCLUDED.descripcion,
           categoria = EXCLUDED.categoria,
           municipio_id = EXCLUDED.municipio_id,
           ubicacion = EXCLUDED.ubicacion,
           direccion = EXCLUDED.direccion,
           costo_promedio = EXCLUDED.costo_promedio,
           horario = EXCLUDED.horario,
           contacto = EXCLUDED.contacto,
           duracion_visita_min = EXCLUDED.duracion_visita_min,
           calificacion_promedio = EXCLUDED.calificacion_promedio,
           numero_resenas = EXCLUDED.numero_resenas`,
        [
          id,
          municipality.pois[poiIndex],
          `Lugar ficticio de ${municipality.nombre}, creado para pruebas de Trekko.`,
          category,
          municipality.id,
          longitude,
          latitude,
          `Calle Ficticia ${poiIndex + 1}`,
          [0, 80, 150, 300, 450][poiIndex % 5],
          JSON.stringify(hours),
          JSON.stringify({
            whatsapp: `520000000${String(number).padStart(4, '0')}`,
            telefono: `+52 000 000 ${String(number).padStart(4, '0')}`,
            sitio: `https://poi-${number}.example`,
          }),
          category === 'naturaleza' || category === 'aventura' ? 120 : 60,
          (3.5 + (poiIndex % 4) * 0.3).toFixed(2),
          poiIndex % 8,
        ],
      );
    }
  }
}

function createSchedule(category: (typeof categories)[number]) {
  const intervals =
    category === 'restaurante'
      ? [
          { abre: '12:00', cierra: '15:00' },
          { abre: '18:00', cierra: '22:00' },
        ]
      : [{ abre: '09:00', cierra: '18:00' }];
  return {
    zona: 'America/Mexico_City',
    semana: Object.fromEntries(weekdayKeys.map((day) => [day, intervals])),
    siempreAbierto: false,
  };
}
