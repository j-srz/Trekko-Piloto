export interface CoordenadaMapa {
  latitude: number;
  longitude: number;
}

export type TipoPuntoMapa = 'Destino' | 'Ruta' | 'Hospedaje' | 'Grupo';

export interface PuntoMapa {
  id: string;
  nombre: string;
  coordenada: CoordenadaMapa;
  tipo: TipoPuntoMapa;
}
