/**
 * Datos de ejemplo para la pantalla Inicio.
 *
 * Convenio:
 *   - Las imágenes son URLs de Unsplash (foto libre, sin clave de API).
 *   - Cuando existan fotos locales, reemplaza el string por:
 *       require('@/assets/images/ejemplo/<nombre>.jpg')
 *   - Incluye casos "incómodos": nombre larguísimo, sin precio, sin reseñas,
 *     grupo lleno, imagen que podría fallar.
 *
 * Carpeta de imágenes locales: assets/images/ejemplo/
 */

import { crearGruposEjemplo } from '@/features/grupos/data/datosGrupos';
import type { DatosInicio, Hospedaje, Lugar, Ruta } from '../types';

// ─── Lugares ──────────────────────────────────────────────────────────────────

export const LUGARES_EJEMPLO: Lugar[] = [
  {
    id: 'lugar-feria-maiz',
    nombre: 'Feria Regional del Maíz',
    municipio: 'San José de Gracia, Ags.',
    coordenada: { latitude: 22.159, longitude: -102.415 },
    imagen: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1000',
    precio: 0,
    calificacion: 4.9,
    reseñas: 1200,
    categoria: 'Cultura',
    distancia: 'A 1.7 km',
    fecha: 'Del 8 al 10 de marzo de 2027',
    descripcion:
      'Ubicada en el marco del centenario del ejido y con raíces que se remontan a 1915, esta feria celebra la tradición del maíz y la vida de la región. Disfruta de música, gastronomía y actividades para toda la familia en un ambiente lleno de cultura y hospitalidad.',
    organizadoPor: 'Gobierno municipal de San José de Gracia',
    organizadorUsuario: '@SanJoseDeGraciaOriginal',
    organizadorBiografia:
      'Como Gobierno de San José de Gracia, trabajamos con orgullo para impulsar nuestro pueblo mágico: su tierra, su naturaleza y sus tradiciones arraigadas. Te esperamos para compartir lo mejor de nuestra región.',
    recomendacion: {
      autor: 'Visitantes de San José de Gracia',
      comentario:
        'Una gran oportunidad para probar la comida local, escuchar música y conocer de cerca las tradiciones de la comunidad.',
    },
  },
  {
    id: 'lugar-01',
    nombre: 'Cascada El Salto',
    municipio: 'Sierra Fría, Ags.',
    coordenada: { latitude: 22.12, longitude: -102.59 },
    imagen: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
    precio: 120,
    calificacion: 4.5,
    reseñas: 23,
    categoria: 'Naturaleza',
    distancia: 'A 1.7 km',
    descripcion:
      'Un rincón natural entre vegetación y montañas, ideal para disfrutar el paisaje, tomar fotografías y pasar un día al aire libre.',
    organizadoPor: 'Comunidad local de Sierra Fría',
    organizadorUsuario: '@sierrfria',
    organizadorBiografia:
      'Compartimos recomendaciones para que explores la sierra con respeto y disfrutes de sus paisajes y senderos.',
  },
  {
    id: 'lugar-02',
    // Nombre largo a propósito para probar el recorte de texto
    nombre: 'Presa Plutarco Elías Calles y Mirador del Cañón del Juchipila',
    municipio: 'Aguascalientes, Ags.',
    coordenada: { latitude: 22.13, longitude: -102.42 },
    imagen: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400',
    precio: 380,
    calificacion: 4.6,
    reseñas: 33,
    categoria: 'Naturaleza',
  },
  {
    id: 'lugar-03',
    nombre: 'Parque Ecológico del Cedazo',
    municipio: 'Aguascalientes, Ags.',
    coordenada: { latitude: 21.86, longitude: -102.25 },
    imagen: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=400',
    precio: 90,
    calificacion: 4.2,
    reseñas: 11,
    categoria: 'Naturaleza',
  },
  {
    id: 'lugar-04',
    nombre: 'Templo de San Marcos',
    municipio: 'Aguascalientes, Ags.',
    coordenada: { latitude: 21.883, longitude: -102.296 },
    imagen: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?w=400',
    // Sin precio → se muestra "Gratis"
    calificacion: 4.8,
    reseñas: 57,
    categoria: 'Cultura',
  },
  {
    id: 'lugar-05',
    nombre: 'Cerro del Muerto',
    municipio: 'San José de Gracia, Ags.',
    coordenada: { latitude: 21.78, longitude: -102.45 },
    imagen: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400',
    precio: 0,
    // Sin reseñas → se muestra "Sin reseñas"
    calificacion: 0,
    reseñas: 0,
    categoria: 'Aventura',
  },
  {
    id: 'lugar-06',
    nombre: 'Rincón de Romos Centro Histórico',
    municipio: 'Rincón de Romos, Ags.',
    coordenada: { latitude: 22.23, longitude: -102.32 },
    // URL intencionalmente mala para probar el fallback de ImagenTarjeta
    imagen: 'https://ejemplo-imagen-rota.invalido/foto.jpg',
    calificacion: 3.9,
    reseñas: 5,
    categoria: 'Cultura',
  },
];

// ─── Rutas ────────────────────────────────────────────────────────────────────

export const RUTAS_EJEMPLO: Ruta[] = [
  {
    id: 'ruta-01',
    nombre: 'Tarde en San José de Gracia',
    municipio: 'San José de Gracia, Ags.',
    coordenada: { latitude: 22.159, longitude: -102.415 },
    imagen: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800',
    duracion: '15–20h',
    precio: 860,
    destinos: 4,
    calificacion: 4.5,
    reseñas: 230,
    categoria: 'Naturaleza',
    organizador: {
      nombre: 'Daniel García',
      usuario: '@daniel.explora',
      biografia:
        'Guía local y viajero. Me gusta compartir los rincones naturales y las historias de San José de Gracia.',
    },
    puntosInteres: [
      {
        nombre: 'Centro de San José de Gracia',
        descripcion: 'Conoce la plaza principal y prueba la gastronomía local.',
        duracion: '45 min',
        coordenada: { latitude: 22.159, longitude: -102.415 },
      },
      {
        nombre: 'Santuario del Cristo Roto',
        descripcion: 'Visita uno de los símbolos más conocidos de la región.',
        duracion: '2 h',
        coordenada: { latitude: 22.16, longitude: -102.42 },
      },
      {
        nombre: 'Presa Plutarco Elías Calles',
        descripcion: 'Disfruta el paisaje y las vistas junto al agua.',
        duracion: '1 h',
        coordenada: { latitude: 22.13, longitude: -102.42 },
      },
      {
        nombre: 'Parque de aventura Boca del Túnel',
        descripcion: 'Cierra el recorrido con actividades y vistas de la sierra.',
        duracion: '3 h',
        coordenada: { latitude: 22.2, longitude: -102.45 },
      },
    ],
    incluye: ['Ruta autoguiada', 'Recomendaciones locales', '4 puntos de interés'],
    hospedajeRecomendadoId: 'hosp-01',
  },
  {
    id: 'ruta-02',
    nombre: 'Mañana en el Centro Histórico',
    municipio: 'Aguascalientes, Ags.',
    coordenada: { latitude: 21.883, longitude: -102.296 },
    imagen: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=800',
    duracion: '8–12h',
    // Sin precio → Gratis
    destinos: 6,
    calificacion: 4.7,
    reseñas: 88,
    categoria: 'Cultura',
    organizador: {
      nombre: 'Ana Ramírez',
      usuario: '@ana.descubre',
      biografia: 'Apasionada por la historia, la arquitectura y los rincones de Aguascalientes.',
    },
    puntosInteres: [
      {
        nombre: 'Plaza de la Patria',
        descripcion: 'Comienza en el corazón del centro histórico.',
        duracion: '45 min',
        coordenada: { latitude: 21.882, longitude: -102.296 },
      },
      {
        nombre: 'Templo de San Antonio',
        descripcion: 'Admira la arquitectura y los detalles del templo.',
        duracion: '1 h',
        coordenada: { latitude: 21.884, longitude: -102.295 },
      },
      {
        nombre: 'Museo de Aguascalientes',
        descripcion: 'Descubre arte e historia de la región.',
        duracion: '1 h 30 min',
        coordenada: { latitude: 21.884, longitude: -102.293 },
      },
    ],
    incluye: ['Ruta autoguiada', '6 sitios culturales'],
  },
  {
    id: 'ruta-03',
    nombre: 'Cañón de Juchipila: 3 días de Aventura Extrema en la Sierra',
    municipio: 'Juchipila, Zac.',
    coordenada: { latitude: 21.411, longitude: -103.116 },
    imagen: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=800',
    duracion: '3 días',
    precio: 2400,
    destinos: 8,
    calificacion: 4.9,
    reseñas: 12,
    categoria: 'Aventura',
    organizador: {
      nombre: 'Marcos Torres',
      usuario: '@marcos.senderos',
      biografia: 'Guía de montaña certificado. Planeo rutas seguras para disfrutar la sierra.',
    },
    puntosInteres: [
      {
        nombre: 'Mirador del cañón',
        descripcion: 'Una parada panorámica para conocer el terreno.',
        duracion: '1 h',
        coordenada: { latitude: 21.42, longitude: -103.13 },
      },
      {
        nombre: 'Sendero de la sierra',
        descripcion: 'Recorre cañadas y paisajes de montaña con calma.',
        duracion: '4 h',
        coordenada: { latitude: 21.44, longitude: -103.15 },
      },
      {
        nombre: 'Campamento junto al río',
        descripcion: 'Descansa y disfruta una noche bajo las estrellas.',
        duracion: '1 noche',
        coordenada: { latitude: 21.4, longitude: -103.1 },
      },
    ],
    incluye: ['Itinerario de 3 días', '8 puntos de interés', 'Consejos de seguridad'],
  },
  {
    id: 'ruta-04',
    nombre: 'Ruta de los Museos',
    municipio: 'Aguascalientes, Ags.',
    coordenada: { latitude: 21.883, longitude: -102.296 },
    imagen: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800',
    duracion: '4–6h',
    precio: 150,
    destinos: 5,
    // Sin reseñas
    calificacion: 0,
    reseñas: 0,
    categoria: 'Cultura',
    organizador: {
      nombre: 'Sofía Gómez',
      usuario: '@sofia.enruta',
      biografia: 'Me encanta descubrir las historias detrás de los museos y compartirlas.',
    },
    puntosInteres: [
      {
        nombre: 'Museo de Aguascalientes',
        descripcion: 'Conoce sus exposiciones de arte e historia.',
        duracion: '1 h',
        coordenada: { latitude: 21.884, longitude: -102.293 },
      },
      {
        nombre: 'Museo José Guadalupe Posada',
        descripcion: 'Un recorrido por la obra del grabador hidrocálido.',
        duracion: '1 h',
        coordenada: { latitude: 21.881, longitude: -102.298 },
      },
      {
        nombre: 'Museo Espacio',
        descripcion: 'Arte contemporáneo en un espacio industrial único.',
        duracion: '1 h 30 min',
        coordenada: { latitude: 21.89, longitude: -102.284 },
      },
    ],
    incluye: ['Ruta autoguiada', '5 museos'],
  },
];

// ─── Hospedajes ───────────────────────────────────────────────────────────────

export const HOSPEDAJES_EJEMPLO: Hospedaje[] = [
  {
    id: 'hosp-01',
    nombre: 'Cabañas Sierra Fría',
    zona: 'Pabellón de Arteaga, Ags.',
    coordenada: { latitude: 22.159, longitude: -102.415 },
    imagen: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=400',
    precioPorNoche: 860,
    calificacion: 4.5,
    reseñas: 23,
    distancia: 'A 1.7 km del centro',
    capacidad: 8,
    descripcion:
      'Descansa entre bosque y montaña en una cabaña privada, rodeada de naturaleza. Un espacio acogedor para desconectarte, compartir una fogata y explorar los paisajes de la Sierra Fría.',
    amenidades: ['Cocina equipada', 'Fogata', 'Estacionamiento', 'Pet friendly'],
    anfitrion: {
      nombre: 'Javier Delgado',
      usuario: '@soyJavierDelgado',
      biografia:
        'Me apasiona la naturaleza y compartir la belleza de San José de Gracia. Estoy pendiente para que disfrutes una estancia cómoda y tranquila.',
    },
    reseñaDestacada: {
      autor: 'Mariana R.',
      comentario:
        'La cabaña está rodeada de paisajes increíbles. Todo estaba limpio y el anfitrión nos dio recomendaciones buenísimas.',
    },
  },
  {
    id: 'hosp-02',
    nombre: 'Hotel Hacienda del Centenario con Desayuno Incluido',
    zona: 'Aguascalientes, Ags.',
    coordenada: { latitude: 21.883, longitude: -102.296 },
    imagen: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    precioPorNoche: 1250,
    calificacion: 4.5,
    reseñas: 23,
    distancia: 'A 2.3 km del centro',
    capacidad: 4,
    descripcion:
      'Una hacienda restaurada que combina arquitectura tradicional, habitaciones cómodas y una ubicación ideal para conocer Aguascalientes.',
    amenidades: ['Desayuno incluido', 'Wi-Fi', 'Alberca', 'Estacionamiento'],
    anfitrion: {
      nombre: 'Daniel García',
      usuario: '@hacienda.centenario',
      biografia:
        'Nos encanta recibir viajeros y compartir la historia, la gastronomía y los rincones favoritos de nuestra ciudad.',
    },
    reseñaDestacada: {
      autor: 'Luis A.',
      comentario: 'El desayuno y la atención fueron excelentes. La hacienda es muy bonita.',
    },
  },
  {
    id: 'hosp-03',
    nombre: 'Glamping El Durazno',
    zona: 'San José de Gracia, Ags.',
    coordenada: { latitude: 22.17, longitude: -102.43 },
    imagen: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400',
    // Sin precio → "Consultar"
    calificacion: 4.8,
    reseñas: 5,
    distancia: 'A 3 km del centro',
    capacidad: 2,
    descripcion:
      'Vive una noche distinta bajo las estrellas en un glamping acogedor, rodeado de árboles y muy cerca de la naturaleza.',
    amenidades: ['Terraza', 'Desayuno', 'Baño privado', 'Zona de fogata'],
    anfitrion: {
      nombre: 'Sofía Martínez',
      usuario: '@eldurazno',
      biografia:
        'Creamos este espacio para compartir la calma del campo y ayudarte a descubrir los senderos de la zona.',
    },
    reseñaDestacada: {
      autor: 'Fernanda P.',
      comentario: 'Un lugar mágico para desconectarse. El cielo de noche se ve increíble.',
    },
  },
  {
    id: 'hosp-04',
    nombre: 'Posada del Caminante',
    zona: 'Calvillo, Ags.',
    coordenada: { latitude: 21.846, longitude: -102.718 },
    imagen: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400',
    precioPorNoche: 450,
    calificacion: 3.8,
    reseñas: 0, // Sin reseñas
    distancia: 'En el centro de Calvillo',
    capacidad: 3,
    descripcion:
      'Una posada sencilla y familiar, a pasos de los principales atractivos y restaurantes de Calvillo.',
    amenidades: ['Wi-Fi', 'Estacionamiento', 'Agua caliente'],
    anfitrion: {
      nombre: 'Roberto López',
      usuario: '@posadadelcaminante',
      biografia:
        'Con gusto te orientamos para que conozcas los sabores y lugares imperdibles de Calvillo.',
    },
  },
];

// ─── Grupos ───────────────────────────────────────────────────────────────────

// export const GRUPOS_EJEMPLO: Grupo[] = [
//   {
//     id: 'grupo-01',
//     nombre: 'Aventura Sierra Madre',
//     rutaNombre: 'Tarde en San José de Gracia · 1:30h',
//     lider: 'Carlos M.',
//     fecha: '2025-11-15',
//     participantes: 4,
//     cupo: 8,
//     imagen: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=800',
//     estado: 'ACTIVO',
//   },
//   {
//     id: 'grupo-02',
//     nombre: 'Explorando el Centro Histórico Antiguo de Aguascalientes',
//     rutaNombre: 'Mañana en el Centro Histórico',
//     lider: 'Ana G.',
//     fecha: '2025-11-20',
//     participantes: 6,
//     cupo: 6,  // Grupo lleno
//     imagen: 'https://images.unsplash.com/photo-1528543606781-2f6e6857f318?w=800',
//     estado: 'LLENO',
//   },
//   {
//     id: 'grupo-03',
//     nombre: 'Trail Cañón Juchipila',
//     rutaNombre: 'Cañón de Juchipila: 3 días de Aventura Extrema en la Sierra',
//     lider: 'Marcos T.',
//     fecha: '2025-12-05',
//     participantes: 1,
//     cupo: 10,
//     imagen: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800',
//     estado: 'PRÓXIMO',
//   },
//   {
//     id: 'grupo-04',
//     nombre: 'Museos en Familia',
//     rutaNombre: 'Ruta de los Museos',
//     lider: 'Sofía R.',
//     fecha: '2025-11-08',
//     participantes: 8,
//     cupo: 8,  // Lleno
//     imagen: 'https://images.unsplash.com/photo-1503220317375-aaad61436b1b?w=800',
//     estado: 'LLENO',
//   },
//   {
//     id: 'grupo-05',
//     nombre: 'Noche de Estrellas Sierra Fría',
//     // Nombre de ruta muy largo para probar recorte
//     rutaNombre: 'Tarde en San José de Gracia con visita a la cascada el salto y miradores',
//     lider: 'Jorge B.',
//     fecha: '2025-11-28',
//     participantes: 0, // Nadie se ha unido
//     cupo: 6,
//     imagen: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=800',
//     estado: 'ACTIVO',
//   },
// ];

// ─── Agregado ─────────────────────────────────────────────────────────────────

export const DATOS_INICIO_EJEMPLO: DatosInicio = {
  lugares: LUGARES_EJEMPLO,
  rutas: RUTAS_EJEMPLO,
  hospedajes: HOSPEDAJES_EJEMPLO,
  grupos: crearGruposEjemplo(),
};
