import { Dimensions } from 'react-native';

const ANCHO_PANTALLA = Dimensions.get('window').width;

export const colores = {
  azulProfundo: '#0A3641',
  verde: '#00A86B',
  verdeBoton: '#007A52',
  verdePresionado: '#006E49',
  verdeSuave: '#E9F8F1',
  terracota: '#F4A261',
  terracotaOscuro: '#A64B00',
  terracotaClaro: '#FFE2B8',
  terracotaBorde: '#D56B13',
  amber: '#FFB000',
  error: '#DC2626',
  errorSuave: '#FDECEC',
  textoOscuro: '#0D1E25',
  gris: '#64748B',
  grisSuave: '#F1F4F6',
  grisPresionado: '#EEF1F2',
  fondo: '#F8F9FA',
  tarjeta: '#FFFFFF',
  blanco: '#FFFFFF',
  borde: '#D5DCE1',
  deshabilitadoFondo: '#E8ECEE',
  deshabilitadoTexto: '#475569',
  mapaFondo: '#E8EEE8',
  mapaControl: '#DCE4DF',
  mapaIconoOscuro: '#183C35',
  mapaTextoOscuro: '#30463E',
  mapaTerracota: '#633F29',
  marcadorRuta: '#E89136',
  marcadorHospedaje: '#7057C8',
  marcadorGrupo: '#DF6E62',
  marcadorDestino: '#37856F',
  grisEsqueleto: '#E2E8EE',
  grisImagen: '#C9D3DA',
  insigniaVerde: '#007A52',
  insigniaOscura: '#0A3641',
  insigniaRoja: '#DC2626',
};

export const espacio = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const fuente = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
  extrabold: 'Inter_800ExtraBold',
};

export const texto = {
  h1: { fontFamily: fuente.extrabold, fontSize: 38, lineHeight: 44, color: colores.azulProfundo },
  h2: { fontFamily: fuente.semibold, fontSize: 24, lineHeight: 30, color: colores.azulProfundo },
  h3: { fontFamily: fuente.bold, fontSize: 18, lineHeight: 24, color: colores.azulProfundo },
  cuerpoGrande: { fontFamily: fuente.regular, fontSize: 16, lineHeight: 24, color: colores.gris },
  cuerpo: { fontFamily: fuente.regular, fontSize: 14, lineHeight: 20, color: colores.gris },
  etiqueta: { fontFamily: fuente.medium, fontSize: 14, lineHeight: 20, color: colores.azulProfundo },
  micro: { fontFamily: fuente.medium, fontSize: 12, lineHeight: 16, color: colores.gris },
};

export const radio = {
  tarjeta: 16,
  chip: 9999,
  campoBusqueda: 9999,
  campo: 12,
  insignia: 6,
  boton: 12,
};

export const ALTO_CONTROL = 52;

export const sombra = {
  nivel1: {
    shadowColor: colores.azulProfundo,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  nivel2: {
    shadowColor: colores.azulProfundo,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
};

export const tarjetaAncho = {
  lugar: Math.round(ANCHO_PANTALLA * 0.44),
  ruta: Math.round(ANCHO_PANTALLA * 0.82),
  grupo: Math.round(ANCHO_PANTALLA * 0.82),
};

export const MIN_AREA_TACTIL = 48;
export const ALTO_PILULA_TABS = 64;
export const MARGEN_BARRA_TABS = 12;
export const ALTO_BARRA_TABS = ALTO_PILULA_TABS + MARGEN_BARRA_TABS;
