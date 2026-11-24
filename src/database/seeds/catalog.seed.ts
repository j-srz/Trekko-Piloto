import { EntityManager } from 'typeorm';
import { DataSource } from 'typeorm';
import { PoiCategory } from '../../pois/poi.constants.js';

interface SeedPoi {
  nombre: string;
  descripcion: string;
  categoria: PoiCategory;
  lat: number;
  lng: number;
  direccion: string;
  costo: number;
  duracion: number;
}

function poi(
  nombre: string,
  categoria: PoiCategory,
  lat: number,
  lng: number,
  direccion: string,
  descripcion: string,
  costo = 0,
  duracion = 60,
): SeedPoi {
  return {
    nombre,
    categoria,
    lat,
    lng,
    direccion,
    costo,
    duracion,
    descripcion: `${descripcion} Horarios y costos son referencias de demostración; confirma antes de visitar.`,
  };
}

const municipalities = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    nombre: 'Aguascalientes',
    esPuebloMagico: false,
    lng: -102.2916,
    lat: 21.8853,
    pois: [
      poi('Plaza de la Patria', PoiCategory.Cultural, 21.8818, -102.2963, 'Zona Centro, Aguascalientes', 'Plaza cívica frente a la Catedral Basílica.'),
      poi('Templo de San Antonio', PoiCategory.Cultural, 21.8856003, -102.2918001, 'Calle General Ignacio Zaragoza, Aguascalientes', 'Templo histórico reconocido por su arquitectura.', 0, 45),
      poi('Jardín de San Marcos', PoiCategory.Naturaleza, 21.8798, -102.3001, 'Barrio de San Marcos, Aguascalientes', 'Jardín público tradicional junto al recinto ferial.'),
      poi('Museo Nacional de la Muerte', PoiCategory.Cultural, 21.8840078, -102.2954864, 'Calle José María Morelos y Pavón, Aguascalientes', 'Museo universitario dedicado a las representaciones de la muerte en México.', 20, 90),
      poi('Museo Aguascalientes', PoiCategory.Cultural, 21.8859267, -102.291373, 'Calle General Ignacio Zaragoza 505, Aguascalientes', 'Recinto museístico de arte e historia del estado.', 20, 90),
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    nombre: 'Calvillo',
    esPuebloMagico: true,
    lng: -102.7183,
    lat: 21.8456,
    pois: [
      poi('Plaza Principal de Calvillo', PoiCategory.Cultural, 21.8463948, -102.7186027, 'Centro, Calvillo, Aguascalientes', 'Plaza central del Pueblo Mágico.', 0, 45),
      poi('Parroquia del Señor del Salitre', PoiCategory.Cultural, 21.8464842, -102.717523, 'Avenida Zaragoza 101, Calvillo, Aguascalientes', 'Parroquia histórica del centro de Calvillo.', 0, 45),
      poi('Museo Nacional de Pueblos Mágicos', PoiCategory.Cultural, 21.847, -102.7182, 'Centro, Calvillo, Aguascalientes', 'Museo dedicado a la historia y tradiciones de los Pueblos Mágicos de México.', 30, 90),
      poi('Santuario de la Virgen de Guadalupe', PoiCategory.Cultural, 21.8433346, -102.7153524, 'Calle Lorenzo Herrera, Calvillo, Aguascalientes', 'Santuario católico ubicado en Calvillo.', 0, 45),
      poi('Presa de Malpaso', PoiCategory.Naturaleza, 21.8578153, -102.6539804, 'Malpaso, Calvillo, Aguascalientes', 'Presa y paisaje natural al sur de Calvillo; las actividades acuáticas pueden tener costo adicional.', 100, 120),
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    nombre: 'Real de Asientos',
    esPuebloMagico: true,
    lng: -102.0894,
    lat: 22.2385,
    pois: [
      poi('Plaza Juárez de Asientos', PoiCategory.Cultural, 22.2381, -102.0898, 'Centro, Real de Asientos, Aguascalientes', 'Plaza principal del antiguo pueblo minero.', 0, 45),
      poi('Parroquia de Nuestra Señora de Belén', PoiCategory.Cultural, 22.2385, -102.0894, 'Centro, Real de Asientos, Aguascalientes', 'Templo parroquial histórico de Real de Asientos.', 0, 45),
      poi('Túneles de Asientos', PoiCategory.Cultural, 22.2384, -102.0889, 'Centro, Real de Asientos, Aguascalientes', 'Recorrido por los túneles históricos del centro; verifica acceso y disponibilidad.', 20, 60),
      poi('Museo Minero de Asientos', PoiCategory.Cultural, 22.239, -102.0902, 'Centro, Real de Asientos, Aguascalientes', 'Espacio dedicado al pasado minero de la localidad.', 20, 60),
      poi('Panteón de Guadalupe', PoiCategory.Cultural, 22.241369, -102.0908019, 'Real de Asientos, Aguascalientes', 'Cementerio histórico de la comunidad.', 0, 45),
      poi('Museo de Cactáceas', PoiCategory.Naturaleza, 22.2349, -102.0859766, 'Real de Asientos, Aguascalientes', 'Colección y jardín de cactáceas de la región.', 20, 60),
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    nombre: 'San José de Gracia',
    esPuebloMagico: true,
    lng: -102.4128,
    lat: 22.1468,
    pois: [
      poi('Plaza Principal de San José de Gracia', PoiCategory.Cultural, 22.1468069, -102.4127811, 'Centro, San José de Gracia, Aguascalientes', 'Plaza central del Pueblo Mágico.', 0, 45),
      poi('Parroquia de San José', PoiCategory.Cultural, 22.147, -102.4125, 'Centro, San José de Gracia, Aguascalientes', 'Templo parroquial del centro de la localidad.', 0, 45),
      poi('Presa Presidente Plutarco Elías Calles', PoiCategory.Naturaleza, 22.1393, -102.4298, 'San José de Gracia, Aguascalientes', 'Embalse conocido también como presa Calles; confirma condiciones de acceso y actividades.', 0, 90),
      poi('Santuario del Cristo Roto', PoiCategory.Cultural, 22.1388926, -102.430457, 'Presa Calles, San José de Gracia, Aguascalientes', 'Santuario y escultura monumental del Cristo Roto, accesible desde la zona de la presa.', 100, 120),
    ],
  },
  {
    id: '00000000-0000-4000-8000-000000000005',
    nombre: 'Pabellón de Hidalgo',
    esPuebloMagico: true,
    lng: -102.3397,
    lat: 22.1771,
    pois: [
      poi('Museo de la Insurgencia (Museo de la Revolución)', PoiCategory.Cultural, 22.1749886, -102.3417116, 'Plaza 4 de Enero, Pabellón de Hidalgo, Aguascalientes', 'Museo histórico ubicado en la antigua Hacienda de San Blas, ligado a la historia de la Independencia.', 20, 90),
      poi('Iglesia de San Blas', PoiCategory.Cultural, 22.1752833, -102.340854, 'Pabellón de Hidalgo, Aguascalientes', 'Templo histórico de la comunidad de Pabellón de Hidalgo.', 0, 45),
      poi('Plaza Principal de Pabellón de Hidalgo', PoiCategory.Cultural, 22.1756, -102.341, 'Centro, Pabellón de Hidalgo, Aguascalientes', 'Plaza pública del centro de la localidad.', 0, 45),
    ],
  },
];

const weekdayKeys = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const;

export async function seedCatalog(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    await removeRetiredSamplePois(manager);
    await seedMunicipalities(manager);
    await seedPois(manager);
  });
}

async function removeRetiredSamplePois(manager: EntityManager): Promise<void> {
  const activeIds = new Set(
    municipalities.flatMap((municipality, municipalityIndex) =>
      municipality.pois.map((_, poiIndex) =>
        samplePoiId(municipalityIndex * 10 + poiIndex + 1),
      ),
    ),
  );
  const retiredIds = Array.from({ length: 50 }, (_, index) => samplePoiId(index + 1))
    .filter((id) => !activeIds.has(id));
  await manager.query('DELETE FROM ruta_poi WHERE poi_id = ANY($1::uuid[])', [retiredIds]);
  await manager.query('DELETE FROM poi WHERE id = ANY($1::uuid[])', [retiredIds]);
}

function samplePoiId(number: number): string {
  return `10000000-0000-4000-8000-${String(number).padStart(12, '0')}`;
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
      const sample = municipality.pois[poiIndex];
      const number = municipalityIndex * 10 + poiIndex + 1;
      const hours = createSchedule();
      await manager.query(
        `INSERT INTO poi
           (id, nombre, descripcion, categoria, municipio_id, ubicacion,
            direccion, costo_promedio, horario, contacto, duracion_visita_min,
            calificacion_promedio, numero_resenas)
         VALUES (
           $1, $2, $3, $4, $5, ST_SetSRID(ST_MakePoint($6, $7), 4326),
           $8, $9, $10::jsonb, $11::jsonb, $12, 0, 0
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
           calificacion_promedio = 0,
           numero_resenas = 0`,
        [
          samplePoiId(number),
          sample.nombre,
          sample.descripcion,
          sample.categoria,
          municipality.id,
          sample.lng,
          sample.lat,
          sample.direccion,
          sample.costo,
          JSON.stringify(hours),
          JSON.stringify({}),
          sample.duracion,
        ],
      );
    }
  }
}

function createSchedule() {
  const interval = [{ abre: '09:00', cierra: '18:00' }];
  return {
    zona: 'America/Mexico_City',
    semana: Object.fromEntries(weekdayKeys.map((day) => [day, interval])),
    siempreAbierto: false,
  };
}
