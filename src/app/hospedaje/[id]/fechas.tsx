import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Boton } from '../../../components/ui/Boton';
import { colores, espacio, fuente, radio, sombra, texto } from '../../../constants/tokens';
import { HOSPEDAJES_EJEMPLO } from '../../../features/inicio/data/datosEjemplo';
import { formatearFechaCorta } from '../../../utils/formato';

const DIAS_SEMANA = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function mismoDia(a: Date | null, b: Date): boolean {
  return !!a && a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inicioDelDia(fecha: Date): Date {
  return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
}

function claveFecha(fecha: Date): string {
  return `${fecha.getFullYear()}-${fecha.getMonth()}-${fecha.getDate()}`;
}

export default function FechasHospedajeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hospedaje = HOSPEDAJES_EJEMPLO.find((item) => item.id === id);
  const hoy = useMemo(() => inicioDelDia(new Date()), []);
  const [mesVisible, setMesVisible] = useState(
    () => new Date(hoy.getFullYear(), hoy.getMonth(), 1),
  );
  const [llegada, setLlegada] = useState<Date | null>(null);
  const [salida, setSalida] = useState<Date | null>(null);

  const dias = useMemo(() => {
    const primerDia = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1);
    const cantidadDias = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate();
    const celdas: (Date | null)[] = Array(primerDia.getDay()).fill(null);
    for (let dia = 1; dia <= cantidadDias; dia += 1) {
      celdas.push(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), dia));
    }
    while (celdas.length % 7 !== 0) celdas.push(null);
    return celdas;
  }, [mesVisible]);

  if (!hospedaje) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={estilos.pantalla}>
          <Pressable onPress={() => router.back()} style={estilos.botonVolver}>
            <Feather name="arrow-left" size={22} color={colores.azulProfundo} />
          </Pressable>
          <View style={estilos.noEncontrado}>
            <Text style={texto.h3}>No encontramos este alojamiento</Text>
            <Boton titulo="Volver" onPress={() => router.back()} />
          </View>
        </SafeAreaView>
      </>
    );
  }

  const noches = llegada && salida
    ? Math.round((salida.getTime() - llegada.getTime()) / 86400000)
    : 0;
  const subtotal = hospedaje.precioPorNoche != null && noches > 0
    ? hospedaje.precioPorNoche * noches
    : null;

  function seleccionarDia(fecha: Date) {
    if (fecha < hoy) return;
    if (!llegada || salida || fecha <= llegada) {
      setLlegada(fecha);
      setSalida(null);
      return;
    }
    setSalida(fecha);
  }

  function cambiarMes(cantidad: number) {
    setMesVisible((mes) => new Date(mes.getFullYear(), mes.getMonth() + cantidad, 1));
  }

  function continuar() {
    if (!llegada || !salida) return;
    Alert.alert(
      'Fechas seleccionadas',
      `${formatearFechaCorta(llegada)} al ${formatearFechaCorta(salida)} · ${noches} ${noches === 1 ? 'noche' : 'noches'}.\n\nLa reserva todavía no está confirmada; estamos preparando esta función.`,
      [{ text: 'Entendido' }],
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={estilos.pantalla} edges={['top', 'left', 'right']}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 200 + insets.bottom }}
        >
          <View style={estilos.contenido}>
            <Pressable
              onPress={() => router.back()}
              style={estilos.botonVolver}
              accessibilityRole="button"
              accessibilityLabel="Volver al alojamiento"
            >
              <Feather name="arrow-left" size={22} color={colores.azulProfundo} />
            </Pressable>

            <Text style={texto.h2} accessibilityRole="header">{hospedaje.nombre}</Text>
            <Text style={estilos.subtitulo}>
              {hospedaje.zona}{hospedaje.distancia ? ` · ${hospedaje.distancia}` : ''}
            </Text>

            <View style={estilos.tarjetaAnfitrion}>
              {hospedaje.imagen ? (
                <Image
                  source={typeof hospedaje.imagen === 'number' ? hospedaje.imagen : { uri: hospedaje.imagen }}
                  style={estilos.foto}
                  contentFit="cover"
                  accessibilityLabel={hospedaje.nombre}
                />
              ) : null}
              <View style={estilos.infoAnfitrion}>
                <Text style={estilos.tituloAnfitrion}>Tu anfitrión</Text>
                <Text style={estilos.nombreAnfitrion}>
                  {hospedaje.anfitrion?.nombre ?? 'Anfitrión Trekko'}
                </Text>
                <Text style={estilos.biografia} numberOfLines={3}>
                  {hospedaje.anfitrion?.biografia ?? 'Te ayudará a planear una estancia cómoda y agradable.'}
                </Text>
              </View>
            </View>

            <View style={estilos.seccionCalendario}>
              <Text style={texto.h3}>Selecciona tus fechas</Text>
              <View style={estilos.resumenFechas}>
                <View style={estilos.campoFecha}>
                  <Text style={estilos.etiquetaFecha}>LLEGADA</Text>
                  <Text style={estilos.valorFecha}>
                    {llegada ? formatearFechaCorta(llegada) : 'Elige un día'}
                  </Text>
                </View>
                <Feather name="arrow-right" size={18} color={colores.gris} />
                <View style={estilos.campoFecha}>
                  <Text style={estilos.etiquetaFecha}>SALIDA</Text>
                  <Text style={estilos.valorFecha}>
                    {salida ? formatearFechaCorta(salida) : 'Elige un día'}
                  </Text>
                </View>
              </View>

              <View style={estilos.calendario}>
                <View style={estilos.cabeceraMes}>
                  <Pressable
                    onPress={() => cambiarMes(-1)}
                    disabled={mesVisible.getFullYear() === hoy.getFullYear() && mesVisible.getMonth() === hoy.getMonth()}
                    style={estilos.flecha}
                    accessibilityRole="button"
                    accessibilityLabel="Mes anterior"
                  >
                    <Feather name="chevron-left" size={21} color={colores.azulProfundo} />
                  </Pressable>
                  <Text style={estilos.mes}>
                    {NOMBRES_MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
                  </Text>
                  <Pressable
                    onPress={() => cambiarMes(1)}
                    style={estilos.flecha}
                    accessibilityRole="button"
                    accessibilityLabel="Mes siguiente"
                  >
                    <Feather name="chevron-right" size={21} color={colores.azulProfundo} />
                  </Pressable>
                </View>

                <View style={estilos.cuadricula}>
                  {DIAS_SEMANA.map((dia, index) => (
                    <Text key={`${dia}-${index}`} style={estilos.diaSemana}>{dia}</Text>
                  ))}
                  {dias.map((fecha, index) => {
                    if (!fecha) return <View key={`vacio-${index}`} style={estilos.celda} />;
                    const deshabilitado = fecha < hoy;
                    const esLlegada = mismoDia(llegada, fecha);
                    const esSalida = mismoDia(salida, fecha);
                    const enRango = !!llegada && !!salida && fecha > llegada && fecha < salida;
                    const seleccionada = esLlegada || esSalida;
                    return (
                      <Pressable
                        key={claveFecha(fecha)}
                        onPress={() => seleccionarDia(fecha)}
                        disabled={deshabilitado}
                        accessibilityRole="button"
                        accessibilityLabel={fecha.toLocaleDateString('es-MX', { dateStyle: 'full' })}
                        accessibilityState={{ selected: seleccionada, disabled: deshabilitado }}
                        style={[
                          estilos.celda,
                          enRango && estilos.diaEnRango,
                          seleccionada && estilos.diaSeleccionado,
                        ]}
                      >
                        <Text
                          style={[
                            estilos.numeroDia,
                            deshabilitado && estilos.diaPasado,
                            seleccionada && estilos.numeroSeleccionado,
                          ]}
                        >
                          {fecha.getDate()}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <Text style={estilos.ayudaCalendario}>
                  {llegada && !salida ? 'Ahora elige tu día de salida.' : 'Selecciona llegada y salida.'}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <View style={[estilos.pie, { paddingBottom: Math.max(insets.bottom, espacio.m) }]}>
          <View style={estilos.resumenPrecio}>
            <Text style={estilos.valorResumen}>
              {subtotal != null ? `$${subtotal.toLocaleString('es-MX')}` : hospedaje.precioPorNoche != null ? `$${hospedaje.precioPorNoche.toLocaleString('es-MX')}/noche` : 'Precio por consultar'}
            </Text>
            <Text style={estilos.detalleResumen}>
              {noches > 0 ? `${noches} ${noches === 1 ? 'noche' : 'noches'} · total estimado` : 'Elige tus fechas para ver el total'}
            </Text>
          </View>
          <Boton
            titulo="Continuar"
            onPress={continuar}
            deshabilitado={!llegada || !salida}
          />
        </View>
      </SafeAreaView>
    </>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: colores.fondo },
  contenido: { paddingHorizontal: espacio.xl, paddingTop: espacio.s },
  botonVolver: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: espacio.m,
    backgroundColor: colores.tarjeta,
  },
  subtitulo: { ...texto.micro, marginTop: espacio.xs },
  tarjetaAnfitrion: {
    flexDirection: 'row',
    gap: espacio.m,
    marginTop: espacio.l,
    padding: espacio.m,
    borderRadius: radio.tarjeta,
    backgroundColor: colores.tarjeta,
    ...sombra.nivel1,
  },
  foto: { width: 64, height: 76, borderRadius: radio.boton },
  infoAnfitrion: { flex: 1, gap: espacio.xs },
  tituloAnfitrion: { ...texto.etiqueta },
  nombreAnfitrion: { fontFamily: fuente.medium, fontSize: 13, color: colores.azulProfundo },
  biografia: { ...texto.micro, fontSize: 11, lineHeight: 16 },
  seccionCalendario: { marginTop: espacio.xl, gap: espacio.m },
  resumenFechas: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: espacio.m,
    paddingHorizontal: espacio.l,
    borderRadius: radio.boton,
    borderWidth: 1,
    borderColor: colores.borde,
    backgroundColor: colores.tarjeta,
  },
  campoFecha: { flex: 1, gap: espacio.xs },
  etiquetaFecha: { fontFamily: fuente.semibold, fontSize: 10, color: colores.gris, letterSpacing: 0.5 },
  valorFecha: { fontFamily: fuente.medium, fontSize: 13, color: colores.azulProfundo },
  calendario: { padding: espacio.m, borderRadius: radio.tarjeta, backgroundColor: colores.tarjeta, ...sombra.nivel1 },
  cabeceraMes: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: espacio.s },
  flecha: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  mes: { fontFamily: fuente.semibold, fontSize: 15, color: colores.azulProfundo },
  cuadricula: { flexDirection: 'row', flexWrap: 'wrap' },
  diaSemana: {
    width: `${100 / 7}%`,
    height: 36,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontFamily: fuente.medium,
    fontSize: 11,
    color: colores.gris,
  },
  celda: {
    width: `${100 / 7}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 21,
  },
  numeroDia: { fontFamily: fuente.medium, fontSize: 13, color: colores.azulProfundo },
  diaPasado: { color: colores.deshabilitadoTexto },
  diaSeleccionado: { backgroundColor: colores.verdeBoton },
  numeroSeleccionado: { color: colores.tarjeta, fontFamily: fuente.bold },
  diaEnRango: { backgroundColor: colores.verdeSuave, borderRadius: 0 },
  ayudaCalendario: { ...texto.micro, fontSize: 11, textAlign: 'center', marginTop: espacio.s },
  pie: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: espacio.m,
    paddingHorizontal: espacio.xl,
    paddingTop: espacio.m,
    backgroundColor: colores.tarjeta,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colores.borde,
  },
  resumenPrecio: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: espacio.s },
  valorResumen: { fontFamily: fuente.semibold, fontSize: 14, color: colores.azulProfundo },
  detalleResumen: { ...texto.micro, fontSize: 11, textAlign: 'right', flex: 1 },
  noEncontrado: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: espacio.xl, gap: espacio.l },
});
