import { DataSource } from 'typeorm';

const originalRoutes = [
  {
    id: '20000000-0000-4000-8000-000000000001',
    municipioId: '00000000-0000-4000-8000-000000000001',
    titulo: 'Paseo de patios y oficios',
    descripcion: 'Recorrido ficticio por espacios y talleres imaginarios.',
    costo: 280,
    duration: 240,
    poiNumbers: [1, 2, 6, 10],
  },
  {
    id: '20000000-0000-4000-8000-000000000002',
    municipioId: '00000000-0000-4000-8000-000000000002',
    titulo: 'Valle de huertos inventados',
    descripcion: 'Ruta ficticia de miradores, jardines y talleres.',
    costo: 350,
    duration: 300,
    poiNumbers: [11, 12, 15, 17],
  },
  {
    id: '20000000-0000-4000-8000-000000000003',
    municipioId: '00000000-0000-4000-8000-000000000003',
    titulo: 'Ecos de la cantera serena',
    descripcion: 'Itinerario ficticio de plazas, cocina y oficios.',
    costo: 320,
    duration: 270,
    poiNumbers: [21, 22, 24, 26],
  },
  {
    id: '20000000-0000-4000-8000-000000000004',
    municipioId: '00000000-0000-4000-8000-000000000004',
    titulo: 'Orillas de agua tranquila',
    descripcion: 'Paseo ficticio por jardines y miradores del lago.',
    costo: 300,
    duration: 260,
    poiNumbers: [31, 33, 35, 38],
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
