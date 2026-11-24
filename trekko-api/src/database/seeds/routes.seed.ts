import { DataSource } from 'typeorm';

const originalRoutes = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    municipioId: '00000000-0000-4000-8000-000000000001',
    titulo: 'Centro histórico de Aguascalientes',
    descripcion: 'Paseo por la Plaza de la Patria, el Templo de San Antonio, el Jardín de San Marcos y museos del centro.',
    costo: 40,
    duration: 240,
    poiNumbers: [1, 2, 3, 4],
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    municipioId: '00000000-0000-4000-8000-000000000002',
    titulo: 'Tradición y guayaba en Calvillo',
    descripcion: 'Recorrido por la plaza, la Parroquia del Señor del Salitre, el Museo Nacional de Pueblos Mágicos y el Santuario de Guadalupe.',
    costo: 30,
    duration: 300,
    poiNumbers: [11, 12, 13, 14],
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    municipioId: '00000000-0000-4000-8000-000000000003',
    titulo: 'Huella minera de Real de Asientos',
    descripcion: 'Paseo por la Plaza Juárez, la Parroquia de Nuestra Señora de Belén, los túneles y el Museo Minero.',
    costo: 40,
    duration: 240,
    poiNumbers: [21, 22, 23, 24],
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    municipioId: '00000000-0000-4000-8000-000000000004',
    titulo: 'San José de Gracia y la presa Calles',
    descripcion: 'Visita el centro de San José de Gracia y continúa hacia la presa Calles y el Santuario del Cristo Roto.',
    costo: 100,
    duration: 300,
    poiNumbers: [31, 32, 33, 34],
  },
  {
    id: '20000000-0000-4000-8000-000000000005',
    municipioId: '00000000-0000-4000-8000-000000000005',
    titulo: 'Historia de Pabellón de Hidalgo',
    descripcion: 'Recorrido por el Museo de la Insurgencia, la Parroquia de San Blas y la plaza principal.',
    costo: 20,
    duration: 180,
    poiNumbers: [41, 42, 43],
  },
] as const;

export async function seedOriginalRoutes(dataSource: DataSource): Promise<void> {
  await dataSource.transaction(async (manager) => {
    for (const route of originalRoutes) {
      await manager.query(
        `INSERT INTO ruta
           (id, tipo, estado, titulo, descripcion, costo_estimado,
            duracion_min, municipio_id, autor_id)
         VALUES ($1, 'original', 'publicada', $2, $3, $4, $5, $6, NULL)
         ON CONFLICT (id) DO UPDATE SET
           tipo = 'original',
           estado = 'publicada',
           titulo = EXCLUDED.titulo,
           descripcion = EXCLUDED.descripcion,
           costo_estimado = EXCLUDED.costo_estimado,
           duracion_min = EXCLUDED.duracion_min,
           municipio_id = EXCLUDED.municipio_id,
           autor_id = NULL`,
        [
          route.id,
          route.titulo,
          route.descripcion,
          route.costo,
          route.duration,
          route.municipioId,
        ],
      );
      await manager.query('DELETE FROM ruta_poi WHERE ruta_id = $1', [route.id]);
      for (let index = 0; index < route.poiNumbers.length; index += 1) {
        const poiId = `10000000-0000-4000-8000-${String(route.poiNumbers[index]).padStart(12, '0')}`;
        await manager.query(
          `INSERT INTO ruta_poi (ruta_id, poi_id, orden, duracion_visita_min)
           VALUES ($1, $2, $3, $4)`,
          [route.id, poiId, index + 1, 60],
        );
      }
    }
  });
}
