import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colores, espacio, fuente, radio, sombra, texto } from '../../constants/tokens';
import { LUGARES_EJEMPLO } from '../inicio/data/datosEjemplo';
import { formatearPrecio } from '../../utils/formato';
import { BarraCuenta } from './BarraCuenta';
import { quitarDestinoGuardado, useDestinosGuardados } from './guardados';

export type SeccionCuenta =
  | 'perfil'
  | 'rango'
  | 'viajes'
  | 'guardados'
  | 'ayuda'
  | 'cuenta'
  | 'acerca';

const TITULOS: Record<SeccionCuenta, string> = {
  perfil: 'Mi perfil',
  rango: 'Mi rango',
  viajes: 'Mis viajes',
  guardados: 'Guardados',
  ayuda: 'Ayuda',
  cuenta: 'Cuenta e información',
  acerca: 'Acerca de la app',
};

const PREGUNTAS = [
  {
    pregunta: '¿Cómo me uno a un grupo?',
    respuesta: 'Abre una tarjeta de grupo y toca “Unirme”. La inscripción se habilitará cuando conectemos el servicio de grupos.',
  },
  {
    pregunta: '¿Cómo guardo un destino?',
    respuesta: 'Abre el destino y toca “Guardar”. Lo encontrarás en esta sección mientras la app siga abierta.',
  },
  {
    pregunta: '¿Puedo cancelar una reserva?',
    respuesta: 'Las reservas aún no están disponibles en esta versión de Trekko.',
  },
];

export function PantallaCuenta({ seccion }: { seccion: SeccionCuenta }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const idsGuardados = useDestinosGuardados();
  const [preguntaAbierta, setPreguntaAbierta] = useState<number | null>(null);
  const lugaresGuardados = LUGARES_EJEMPLO.filter((lugar) => idsGuardados.includes(lugar.id));

  function abrirSeccion(destino: SeccionCuenta) {
    router.push({ pathname: '/cuenta/[seccion]', params: { seccion: destino } });
  }

  function mostrarProximamente(accion: string) {
    Alert.alert('Próximamente', `${accion} estará disponible en una próxima versión.`);
  }

  return (
    <>
      <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[estilos.contenido, { paddingBottom: 112 + insets.bottom }]}
        >
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [estilos.botonAtras, pressed && estilos.presionado]}
            accessibilityRole="button"
            accessibilityLabel="Volver a mi cuenta"
          >
            <Feather name="arrow-left" size={21} color={colores.azulProfundo} />
          </Pressable>
          <Text style={estilos.titulo} accessibilityRole="header">{TITULOS[seccion]}</Text>

          {seccion === 'perfil' && (
            <View style={estilos.seccionPerfil}>
              <View style={estilos.tarjetaPerfil}>
                <View style={estilos.avatarGrande}>
                  <Text style={estilos.inicialesGrande}>AR</Text>
                </View>
                <Text style={estilos.nombrePerfil}>Ana Ramírez</Text>
                <Text style={estilos.textoSecundario}>Viajera Trekko desde 2025</Text>
                <Pressable
                  onPress={() => abrirSeccion('cuenta')}
                  style={estilos.botonContorno}
                  accessibilityRole="button"
                >
                  <Feather name="edit-2" size={15} color={colores.azulProfundo} />
                  <Text style={estilos.textoBotonContorno}>Editar información</Text>
                </Pressable>
              </View>
              <InfoFila icono="mail" titulo="Correo" valor="ana@trekko.mx" />
              <InfoFila icono="map-pin" titulo="Ubicación" valor="Aguascalientes, México" />
              <InfoFila icono="award" titulo="Rango actual" valor="Exploradora" />
              <Pressable
                onPress={() => abrirSeccion('viajes')}
                style={({ pressed }) => [estilos.filaAccion, pressed && estilos.presionado]}
              >
                <Text style={estilos.textoFilaAccion}>Ver mis viajes</Text>
                <Feather name="chevron-right" size={18} color={colores.gris} />
              </Pressable>
            </View>
          )}

          {seccion === 'rango' && (
            <View style={estilos.contenedorSecciones}>
              <View style={estilos.tarjetaRango}>
                <View style={estilos.medalla}>
                  <Feather name="award" size={36} color={colores.terracotaOscuro} />
                </View>
                <Text style={estilos.nombreRango}>Exploradora</Text>
                <Text style={estilos.textoSecundario}>Nivel 2 · 240 puntos</Text>
                <View style={estilos.progresoFondo}>
                  <View style={estilos.progresoRelleno} />
                </View>
                <Text style={estilos.textoProgreso}>240 de 500 puntos para llegar a Aventurera</Text>
              </View>
              <Text style={estilos.tituloSeccion}>Cómo sumar puntos</Text>
              <InfoFila icono="map" titulo="Completar una ruta" valor="+50 puntos" />
              <InfoFila icono="users" titulo="Unirte a un grupo" valor="+30 puntos" />
              <InfoFila icono="star" titulo="Compartir una reseña" valor="+20 puntos" />
              <Text style={estilos.tituloSeccion}>Tus insignias</Text>
              <View style={estilos.insignias}>
                <Insignia icono="compass" titulo="Primera ruta" obtenida />
                <Insignia icono="map-pin" titulo="Exploradora local" obtenida />
                <Insignia icono="camera" titulo="Fotógrafa" />
                <Insignia icono="users" titulo="Viajera en grupo" />
              </View>
            </View>
          )}

          {seccion === 'viajes' && (
            <View style={estilos.vacio}>
              <View style={estilos.iconoVacio}>
                <Feather name="briefcase" size={30} color={colores.verdeBoton} />
              </View>
              <Text style={estilos.tituloVacio}>Tus próximas aventuras aparecerán aquí</Text>
              <Text style={estilos.textoVacio}>
                Cuando te unas a un grupo o reserves un alojamiento, encontrarás aquí los detalles de tus viajes.
              </Text>
              <Pressable
                onPress={() => router.navigate('/(tabs)/grupos')}
                style={({ pressed }) => [estilos.botonPrimario, pressed && estilos.presionado]}
                accessibilityRole="button"
              >
                <Text style={estilos.textoBotonPrimario}>Explorar grupos</Text>
              </Pressable>
            </View>
          )}

          {seccion === 'guardados' && (
            <View style={estilos.contenedorSecciones}>
              {lugaresGuardados.length === 0 ? (
                <View style={estilos.vacio}>
                  <View style={estilos.iconoVacio}>
                    <Feather name="heart" size={30} color={colores.verdeBoton} />
                  </View>
                  <Text style={estilos.tituloVacio}>Aún no tienes destinos guardados</Text>
                  <Text style={estilos.textoVacio}>
                    Guarda los lugares que te interesen y los encontrarás aquí.
                  </Text>
                  <Pressable
                    onPress={() => router.navigate('/(tabs)/inicio')}
                    style={({ pressed }) => [estilos.botonPrimario, pressed && estilos.presionado]}
                    accessibilityRole="button"
                  >
                    <Text style={estilos.textoBotonPrimario}>Descubrir destinos</Text>
                  </Pressable>
                </View>
              ) : (
                lugaresGuardados.map((lugar) => (
                  <View key={lugar.id} style={estilos.tarjetaGuardado}>
                    <Pressable
                      onPress={() =>
                        router.push({ pathname: '/destino/[id]', params: { id: lugar.id } })
                      }
                      style={estilos.detalleGuardado}
                      accessibilityRole="button"
                      accessibilityLabel={`Abrir ${lugar.nombre}`}
                    >
                      <View style={estilos.miniaturaGuardado}>
                        <Feather name="map-pin" size={18} color={colores.verdeBoton} />
                      </View>
                      <View style={estilos.infoGuardado}>
                        <Text style={estilos.nombreGuardado}>{lugar.nombre}</Text>
                        <Text style={estilos.textoSecundario}>{lugar.municipio}</Text>
                        <Text style={estilos.precioGuardado}>{formatearPrecio(lugar.precio)}</Text>
                      </View>
                      <Feather name="chevron-right" size={18} color={colores.gris} />
                    </Pressable>
                    <Pressable
                      onPress={() => quitarDestinoGuardado(lugar.id)}
                      style={estilos.quitarGuardado}
                      accessibilityRole="button"
                      accessibilityLabel={`Quitar ${lugar.nombre} de guardados`}
                    >
                      <Feather name="heart" size={16} color={colores.error} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          )}

          {seccion === 'ayuda' && (
            <View style={estilos.contenedorSecciones}>
              <Text style={estilos.introAyuda}>¿En qué podemos ayudarte?</Text>
              {PREGUNTAS.map((item, index) => {
                const abierta = preguntaAbierta === index;
                return (
                  <Pressable
                    key={item.pregunta}
                    onPress={() => setPreguntaAbierta(abierta ? null : index)}
                    style={({ pressed }) => [estilos.pregunta, pressed && estilos.presionado]}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: abierta }}
                  >
                    <View style={estilos.filaPregunta}>
                      <Text style={estilos.textoPregunta}>{item.pregunta}</Text>
                      <Feather
                        name={abierta ? 'chevron-up' : 'chevron-down'}
                        size={18}
                        color={colores.gris}
                      />
                    </View>
                    {abierta && <Text style={estilos.respuesta}>{item.respuesta}</Text>}
                  </Pressable>
                );
              })}
              <Pressable
                onPress={() => mostrarProximamente('El contacto con soporte')}
                style={({ pressed }) => [estilos.contacto, pressed && estilos.presionado]}
              >
                <Feather name="message-circle" size={19} color={colores.verdeBoton} />
                <View style={estilos.infoContacto}>
                  <Text style={estilos.nombreGuardado}>¿Necesitas más ayuda?</Text>
                  <Text style={estilos.textoSecundario}>Contacta al equipo Trekko</Text>
                </View>
                <Feather name="chevron-right" size={18} color={colores.gris} />
              </Pressable>
            </View>
          )}

          {seccion === 'cuenta' && (
            <View style={estilos.contenedorSecciones}>
              <View style={estilos.tarjetaInfo}>
                <Text style={estilos.tituloSeccion}>Información personal</Text>
                <InfoFila icono="user" titulo="Nombre" valor="Ana Ramírez" />
                <InfoFila icono="mail" titulo="Correo electrónico" valor="ana@trekko.mx" />
                <InfoFila icono="map-pin" titulo="Ciudad" valor="Aguascalientes, México" />
              </View>
              <View style={estilos.tarjetaInfo}>
                <Text style={estilos.tituloSeccion}>Seguridad</Text>
                <Pressable
                  onPress={() => mostrarProximamente('El cambio de contraseña')}
                  style={estilos.filaAccion}
                >
                  <Text style={estilos.textoFilaAccion}>Cambiar contraseña</Text>
                  <Feather name="chevron-right" size={18} color={colores.gris} />
                </Pressable>
                <Pressable
                  onPress={() => mostrarProximamente('La configuración de privacidad')}
                  style={estilos.filaAccion}
                >
                  <Text style={estilos.textoFilaAccion}>Privacidad y permisos</Text>
                  <Feather name="chevron-right" size={18} color={colores.gris} />
                </Pressable>
              </View>
              <Text style={estilos.notaDemo}>
                Esta cuenta de demostración usa datos de ejemplo. La edición y sincronización se habilitarán al conectar el backend.
              </Text>
            </View>
          )}

          {seccion === 'acerca' && (
            <View style={estilos.acerca}>
              <View style={estilos.logo}>
                <Feather name="compass" size={42} color={colores.tarjeta} />
              </View>
              <Text style={estilos.nombreApp}>Trekko</Text>
              <Text style={estilos.version}>Versión 1.0.0</Text>
              <Text style={estilos.textoAcerca}>
                Descubre destinos, planea rutas y comparte aventuras con personas que disfrutan explorar tanto como tú.
              </Text>
              <View style={estilos.tarjetaInfo}>
                <InfoFila icono="shield" titulo="Privacidad" valor="Consulta cómo cuidamos tus datos" />
                <InfoFila icono="file-text" titulo="Términos de uso" valor="Información de uso de Trekko" />
              </View>
              <Text style={estilos.copyright}>Hecho para quienes siempre buscan un nuevo camino.</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
      <BarraCuenta />
    </>
  );
}

function InfoFila({ icono, titulo, valor }: { icono: React.ComponentProps<typeof Feather>['name']; titulo: string; valor: string }) {
  return (
    <View style={estilos.infoFila}>
      <Feather name={icono} size={17} color={colores.gris} />
      <View style={estilos.infoFilaTexto}>
        <Text style={estilos.infoFilaTitulo}>{titulo}</Text>
        <Text style={estilos.textoSecundario}>{valor}</Text>
      </View>
    </View>
  );
}

function Insignia({ icono, titulo, obtenida = false }: { icono: React.ComponentProps<typeof Feather>['name']; titulo: string; obtenida?: boolean }) {
  return (
    <View style={[estilos.insigniaItem, !obtenida && estilos.insigniaPendiente]}>
      <Feather name={icono} size={20} color={obtenida ? colores.verdeBoton : colores.deshabilitadoTexto} />
      <Text style={estilos.nombreInsignia}>{titulo}</Text>
      <Text style={estilos.estadoInsignia}>{obtenida ? 'Obtenida' : 'Por desbloquear'}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { paddingHorizontal: espacio.xl, paddingTop: espacio.s },
  botonAtras: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.s,
    borderRadius: 22,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
  titulo: { ...texto.h2, marginBottom: espacio.l },
  contenedorSecciones: { gap: espacio.m },
  seccionPerfil: { gap: espacio.m },
  tarjetaPerfil: {
    alignItems: 'center',
    gap: espacio.s,
    padding: espacio.xl,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
  avatarGrande: {
    width: 78,
    height: 78,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 39,
    backgroundColor: colores.verdeSuave,
  },
  inicialesGrande: { fontFamily: fuente.bold, fontSize: 24, color: colores.verdeBoton },
  nombrePerfil: { fontFamily: fuente.bold, fontSize: 19, color: colores.azulProfundo },
  textoSecundario: { ...texto.micro, fontSize: 11 },
  botonContorno: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.s,
    paddingHorizontal: espacio.l,
    marginTop: espacio.s,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.boton,
  },
  textoBotonContorno: { fontFamily: fuente.medium, fontSize: 12, color: colores.azulProfundo },
  infoFila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    minHeight: 64,
    paddingHorizontal: espacio.l,
    paddingVertical: espacio.s,
    borderRadius: radio.boton,
    backgroundColor: colores.tarjeta,
  },
  infoFilaTexto: { flex: 1, gap: espacio.xs },
  infoFilaTitulo: { fontFamily: fuente.medium, fontSize: 13, color: colores.azulProfundo },
  filaAccion: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: espacio.l,
    borderRadius: radio.boton,
    backgroundColor: colores.tarjeta,
  },
  textoFilaAccion: { fontFamily: fuente.medium, fontSize: 13, color: colores.azulProfundo },
  tarjetaRango: {
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.xl,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
  medalla: {
    width: 76,
    height: 76,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colores.terracotaBorde,
    borderRadius: 22,
    backgroundColor: colores.terracotaClaro,
  },
  nombreRango: { fontFamily: fuente.bold, fontSize: 20, color: colores.azulProfundo },
  progresoFondo: { width: '100%', height: 10, overflow: 'hidden', borderRadius: radio.chip, backgroundColor: colores.grisSuave },
  progresoRelleno: { width: '48%', height: '100%', borderRadius: radio.chip, backgroundColor: colores.verdeBoton },
  textoProgreso: { ...texto.micro, fontSize: 11, textAlign: 'center' },
  tituloSeccion: { ...texto.h3, marginTop: espacio.m, marginBottom: espacio.xs },
  insignias: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  insigniaItem: {
    width: '48%',
    minHeight: 100,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espacio.xs,
    padding: espacio.s,
    borderRadius: radio.boton,
    backgroundColor: colores.verdeSuave,
  },
  insigniaPendiente: { backgroundColor: colores.tarjeta, opacity: 0.7 },
  nombreInsignia: { fontFamily: fuente.semibold, fontSize: 11, color: colores.azulProfundo, textAlign: 'center' },
  estadoInsignia: { fontFamily: fuente.regular, fontSize: 9, color: colores.gris, textAlign: 'center' },
  vacio: { alignItems: 'center', gap: espacio.m, paddingHorizontal: espacio.m, paddingVertical: espacio.xxxl },
  iconoVacio: {
    width: 72,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36,
    backgroundColor: colores.verdeSuave,
  },
  tituloVacio: { ...texto.h3, fontSize: 17, textAlign: 'center' },
  textoVacio: { ...texto.cuerpo, textAlign: 'center', lineHeight: 21 },
  botonPrimario: {
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: espacio.xl,
    marginTop: espacio.s,
    borderRadius: radio.boton,
    backgroundColor: colores.verdeBoton,
  },
  textoBotonPrimario: { fontFamily: fuente.semibold, fontSize: 14, color: colores.tarjeta },
  tarjetaGuardado: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: espacio.m,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
  detalleGuardado: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espacio.m, paddingVertical: espacio.m },
  miniaturaGuardado: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radio.boton,
    backgroundColor: colores.verdeSuave,
  },
  infoGuardado: { flex: 1, gap: espacio.xs },
  nombreGuardado: { fontFamily: fuente.semibold, fontSize: 13, color: colores.azulProfundo },
  precioGuardado: { fontFamily: fuente.medium, fontSize: 11, color: colores.verdeBoton },
  quitarGuardado: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center' },
  introAyuda: { ...texto.cuerpo, marginBottom: espacio.s },
  pregunta: { padding: espacio.l, borderRadius: radio.boton, backgroundColor: colores.tarjeta },
  filaPregunta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espacio.m },
  textoPregunta: { flex: 1, fontFamily: fuente.semibold, fontSize: 13, color: colores.azulProfundo },
  respuesta: { ...texto.cuerpo, fontSize: 12, lineHeight: 19, marginTop: espacio.m },
  contacto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espacio.m,
    padding: espacio.l,
    marginTop: espacio.s,
    borderRadius: radio.boton,
    backgroundColor: colores.tarjeta,
  },
  infoContacto: { flex: 1, gap: espacio.xs },
  tarjetaInfo: { padding: espacio.m, gap: espacio.xs, borderRadius: radio.tarjeta, backgroundColor: colores.tarjeta },
  notaDemo: { ...texto.micro, lineHeight: 18, marginTop: espacio.s },
  acerca: { alignItems: 'center', gap: espacio.m },
  logo: {
    width: 82,
    height: 82,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colores.verdeBoton,
  },
  nombreApp: { fontFamily: fuente.bold, fontSize: 24, color: colores.azulProfundo },
  version: { ...texto.micro },
  textoAcerca: { ...texto.cuerpo, textAlign: 'center', lineHeight: 21, marginVertical: espacio.s },
  copyright: { ...texto.micro, textAlign: 'center', marginTop: espacio.s },
  presionado: { opacity: 0.75 },
});
