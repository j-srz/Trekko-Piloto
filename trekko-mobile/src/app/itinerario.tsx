import { Feather } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { traducirErrorApi } from '../api';
import {
  listarMunicipios,
  type Municipality,
  type RoutePace,
} from '../api/itinerary';
import type { PoiCategory } from '../api/pois';
import { Boton } from '../components/ui/Boton';
import { AvisoOffline } from '../components/ui/AvisoOffline';
import { CampoTexto } from '../components/ui/CampoTexto';
import { Card } from '../components/ui/Card';
import { EstadoCarga } from '../components/ui/EstadoCarga';
import { EstadoError } from '../components/ui/EstadoError';
import { generarItinerarioConDetalles, type ItineraryWithDetails } from '../features/rutas/data/generador';
import { ALTO_CONTROL, colores, espacio, fuente, radio, texto } from '../theme/tokens';
import { formatearPrecio } from '../utils/formato';
import { formatearDuracion } from '../features/rutas/components/TarjetaRutaOriginal';

const CATEGORIAS: { value: PoiCategory; label: string }[] = [
  { value: 'naturaleza', label: 'Naturaleza' },
  { value: 'aventura', label: 'Aventura' },
  { value: 'cultural', label: 'Cultura' },
  { value: 'restaurante', label: 'Restaurantes' },
  { value: 'artesania', label: 'Artesanías' },
  { value: 'hospedaje', label: 'Hospedaje' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'otro', label: 'Otros' },
];

const RITMOS: { value: RoutePace; label: string }[] = [
  { value: 'relajado', label: 'Relajado' },
  { value: 'normal', label: 'Normal' },
  { value: 'intenso', label: 'Intenso' },
];

function fechaLocalHoy(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, '0');
  const dia = String(hoy.getDate()).padStart(2, '0');
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}

function fechaValida(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const parsed = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return parsed.toISOString().slice(0, 10) === value;
}

function horaValida(value: string): boolean {
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function mostrarHora(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' });
}

export default function ItinerarioScreen() {
  const router = useRouter();
  const [municipios, setMunicipios] = useState<Municipality[]>([]);
  const [municipioElegido, setMunicipioElegido] = useState('');
  const [versionMunicipios, setVersionMunicipios] = useState(0);
  const [municipiosListos, setMunicipiosListos] = useState<number | null>(null);
  const [errorMunicipios, setErrorMunicipios] = useState<{ version: number; mensaje: string } | null>(null);
  const municipiosCargando = municipiosListos !== versionMunicipios;
  const municipioId = municipioElegido || municipios[0]?.id || '';
  const errorDeMunicipios = errorMunicipios?.version === versionMunicipios
    ? errorMunicipios.mensaje
    : null;
  const [fecha, setFecha] = useState(fechaLocalHoy);
  const [horaInicio, setHoraInicio] = useState('09:00');
  const [horaFin, setHoraFin] = useState('17:00');
  const [presupuesto, setPresupuesto] = useState('');
  const [personas, setPersonas] = useState('1');
  const [categorias, setCategorias] = useState<PoiCategory[]>([]);
  const [ritmo, setRitmo] = useState<RoutePace>('normal');
  const [generando, setGenerando] = useState(false);
  const [errorFormulario, setErrorFormulario] = useState<string>();
  const [resultado, setResultado] = useState<ItineraryWithDetails | null>(null);
  const formularioBloqueado = municipiosCargando || generando;

  useEffect(() => {
    let activo = true;
    void listarMunicipios()
      .then((response) => {
        if (activo) setMunicipios(response);
      })
      .catch((cause: unknown) => {
        if (activo) setErrorMunicipios({ version: versionMunicipios, mensaje: traducirErrorApi(cause) });
      })
      .finally(() => {
        if (activo) setMunicipiosListos(versionMunicipios);
      });
    return () => {
      activo = false;
    };
  }, [versionMunicipios]);

  async function generar() {
    if (!municipioId) {
      setErrorFormulario('Selecciona un municipio para continuar.');
      return;
    }
    if (!fechaValida(fecha)) {
      setErrorFormulario('Ingresa una fecha válida con formato AAAA-MM-DD.');
      return;
    }
    if (!horaValida(horaInicio) || !horaValida(horaFin) || horaFin <= horaInicio) {
      setErrorFormulario('Ingresa un horario válido; la hora de fin debe ser posterior al inicio.');
      return;
    }
    const cantidadPersonas = Number(personas);
    if (!/^\d+$/.test(personas) || cantidadPersonas < 1 || cantidadPersonas > 20) {
      setErrorFormulario('El número de personas debe estar entre 1 y 20.');
      return;
    }
    const presupuestoMax = presupuesto.trim() ? Number(presupuesto) : undefined;
    if (presupuestoMax !== undefined && (!Number.isFinite(presupuestoMax) || presupuestoMax < 0)) {
      setErrorFormulario('El presupuesto debe ser un número igual o mayor que cero.');
      return;
    }

    setErrorFormulario(undefined);
    setResultado(null);
    setGenerando(true);
    try {
      const generated = await generarItinerarioConDetalles({
        municipioId,
        fecha,
        horaInicio,
        horaFin,
        personas: cantidadPersonas,
        ritmo,
        ...(presupuestoMax !== undefined ? { presupuestoMax } : {}),
        ...(categorias.length ? { categorias } : {}),
      });
      setResultado(generated);
    } catch (cause: unknown) {
      setErrorFormulario(traducirErrorApi(cause));
    } finally {
      setGenerando(false);
    }
  }

  function alternarCategoria(categoria: PoiCategory) {
    setCategorias((actuales) =>
      actuales.includes(categoria)
        ? actuales.filter((item) => item !== categoria)
        : [...actuales, categoria],
    );
  }

  if (errorDeMunicipios && municipios.length === 0) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.screen}>
          <EstadoError
            mensaje={errorDeMunicipios}
            onReintentar={() => setVersionMunicipios((actual) => actual + 1)}
          />
        </SafeAreaView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Boton
            titulo="Volver"
            variante="texto"
            onPress={() => router.back()}
            deshabilitado={formularioBloqueado}
          />
          <Text style={texto.h2} accessibilityRole="header">Genera tu itinerario</Text>
          <Text style={texto.cuerpo}>Personaliza un recorrido con horarios y costos estimados.</Text>

          <View style={styles.fieldGroup}>
            <Text style={texto.etiqueta}>Municipio</Text>
            {municipiosCargando ? (
              <EstadoCarga mensaje="Cargando municipios..." />
            ) : municipios.length === 0 ? (
              <Text style={styles.error}>No hay municipios disponibles para generar rutas.</Text>
            ) : (
              <View style={styles.options}>
                {municipios.map((municipio) => (
                  <Pressable
                    key={municipio.id}
                    onPress={() => setMunicipioElegido(municipio.id)}
                    disabled={formularioBloqueado}
                    accessibilityRole="radio"
                    accessibilityLabel={municipio.nombre}
                    accessibilityState={{ selected: municipio.id === municipioId, disabled: formularioBloqueado }}
                    style={[styles.option, municipio.id === municipioId && styles.optionSelected]}
                  >
                    <View style={styles.optionContent}>
                      {municipio.id === municipioId && <Feather name="check-circle" size={16} color={colores.blanco} />}
                      <Text style={[styles.optionText, municipio.id === municipioId && styles.optionTextSelected]}>
                        {municipio.nombre}
                      </Text>
                    </View>
                  </Pressable>
                ))}
              </View>
            )}
          </View>

          <CampoTexto
            etiqueta="Fecha"
            value={fecha}
            onChangeText={setFecha}
            editable={!formularioBloqueado}
            placeholder="AAAA-MM-DD"
            keyboardType="numbers-and-punctuation"
          />
          <View style={styles.row}>
            <View style={styles.half}>
              <CampoTexto etiqueta="Hora de inicio" value={horaInicio} onChangeText={setHoraInicio} placeholder="09:00" editable={!formularioBloqueado} />
            </View>
            <View style={styles.half}>
              <CampoTexto etiqueta="Hora de fin" value={horaFin} onChangeText={setHoraFin} placeholder="17:00" editable={!formularioBloqueado} />
            </View>
          </View>
          <View style={styles.row}>
            <View style={styles.half}>
              <CampoTexto
                etiqueta="Presupuesto máximo (opcional)"
                value={presupuesto}
                onChangeText={setPresupuesto}
                placeholder="Ej. 1500"
                keyboardType="decimal-pad"
                editable={!formularioBloqueado}
              />
            </View>
            <View style={styles.half}>
              <CampoTexto
                etiqueta="Personas"
                value={personas}
                onChangeText={setPersonas}
                keyboardType="number-pad"
                editable={!formularioBloqueado}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={texto.etiqueta}>Categorías (opcional)</Text>
            <View style={styles.options}>
              {CATEGORIAS.map(({ value, label }) => (
                <Pressable
                  key={value}
                  onPress={() => alternarCategoria(value)}
                  disabled={formularioBloqueado}
                  accessibilityRole="checkbox"
                  accessibilityLabel={label}
                  accessibilityState={{ checked: categorias.includes(value), disabled: formularioBloqueado }}
                  style={[styles.option, categorias.includes(value) && styles.optionSelected]}
                >
                  <View style={styles.optionContent}>
                    {categorias.includes(value) && <Feather name="check-square" size={16} color={colores.blanco} />}
                    <Text style={[styles.optionText, categorias.includes(value) && styles.optionTextSelected]}>
                      {label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={texto.etiqueta}>Ritmo</Text>
            <View style={styles.options}>
              {RITMOS.map(({ value, label }) => (
                <Pressable
                  key={value}
                  onPress={() => setRitmo(value)}
                  disabled={formularioBloqueado}
                  accessibilityRole="radio"
                  accessibilityLabel={label}
                  accessibilityState={{ selected: ritmo === value, disabled: formularioBloqueado }}
                  style={[styles.option, ritmo === value && styles.optionSelected]}
                >
                  <View style={styles.optionContent}>
                    {ritmo === value && <Feather name="check-circle" size={16} color={colores.blanco} />}
                    <Text style={[styles.optionText, ritmo === value && styles.optionTextSelected]}>{label}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {!!errorFormulario && <Text style={styles.error} accessibilityRole="alert">{errorFormulario}</Text>}
          <AvisoOffline visible={resultado?.offline ?? false} />
          <Boton
            titulo="Generar itinerario"
            onPress={() => void generar()}
            deshabilitado={formularioBloqueado || !municipioId}
            cargando={generando}
          />

          {resultado && (
            <View style={styles.result}>
              <Text style={texto.h3} accessibilityRole="header">Tu itinerario</Text>
              <Card style={styles.summary}>
                <Text style={styles.summaryTitle}>Resumen de costos</Text>
                <Dato etiqueta="Costo total" valor={formatearPrecio(resultado.costoTotal)} />
                <Dato etiqueta="Por persona" valor={formatearPrecio(resultado.costoPorPersona)} />
                <Dato etiqueta="Duración" valor={formatearDuracion(resultado.duracionTotalMin)} />
                <Dato etiqueta="Entradas" valor={formatearPrecio(resultado.desglose.entradas)} />
                <Dato etiqueta="Comida" valor={formatearPrecio(resultado.desglose.comida)} />
                <Dato etiqueta="Hospedaje" valor={formatearPrecio(resultado.desglose.hospedaje)} />
                <Dato etiqueta="Transporte" valor={formatearPrecio(resultado.desglose.transporte)} />
              </Card>
              {resultado.advertencias.map((advertencia, index) => (
                <Text key={`${index}-${advertencia}`} style={styles.warning} accessibilityRole="alert">
                  Aviso: {advertencia}
                </Text>
              ))}
              {resultado.items.length === 0 ? (
                <Text style={texto.cuerpo}>No hay paradas compatibles con estos datos. Prueba otro horario o municipio.</Text>
              ) : (
                resultado.items.map((item) => (
                  <Card key={item.poiId} style={styles.stop}>
                    <Text style={styles.stopTitle}>{item.orden}. {item.poi.nombre}</Text>
                    <Text style={styles.stopText}>
                      {item.poi.categoria} · {mostrarHora(item.horaLlegada)}–{mostrarHora(item.horaSalida)}
                    </Text>
                    <Text style={styles.stopText}>
                      Traslado: {formatearDuracion(item.traslado.minutos)} ({formatearDistancia(item.traslado.distanciaM)})
                    </Text>
                    <Text style={styles.stopText}>Costo estimado: {formatearPrecio(item.costo)}</Text>
                  </Card>
                ))
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <View style={styles.summaryRow}>
      <Text style={texto.cuerpo}>{etiqueta}</Text>
      <Text style={styles.summaryValue}>{valor}</Text>
    </View>
  );
}

function formatearDistancia(metros: number): string {
  return metros >= 1_000 ? `${(metros / 1_000).toFixed(1)} km` : `${Math.round(metros)} m`;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colores.fondo },
  content: { paddingHorizontal: espacio.xl, paddingTop: espacio.s, paddingBottom: espacio.xxl, gap: espacio.l },
  fieldGroup: { gap: espacio.s },
  row: { flexDirection: 'row', gap: espacio.m },
  half: { flex: 1 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: espacio.s },
  option: {
    minHeight: ALTO_CONTROL,
    paddingHorizontal: espacio.m,
    borderWidth: 1,
    borderColor: colores.borde,
    borderRadius: radio.chip,
    backgroundColor: colores.tarjeta,
    justifyContent: 'center',
  },
  optionSelected: { backgroundColor: colores.azulProfundo, borderColor: colores.azulProfundo },
  optionContent: { flexDirection: 'row', alignItems: 'center', gap: espacio.xs },
  optionText: { ...texto.micro, color: colores.azulProfundo },
  optionTextSelected: { color: colores.blanco, fontFamily: fuente.semibold },
  error: { ...texto.cuerpo, color: colores.error },
  result: { gap: espacio.m, marginTop: espacio.m },
  summary: { gap: espacio.s },
  summaryTitle: { ...texto.h3, marginBottom: espacio.xs },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', gap: espacio.m },
  summaryValue: { ...texto.cuerpo, fontFamily: fuente.semibold, textAlign: 'right' },
  warning: { ...texto.cuerpo, color: colores.azulProfundo, backgroundColor: colores.terracotaClaro, borderRadius: radio.tarjeta, padding: espacio.m },
  stop: { gap: espacio.s },
  stopTitle: { ...texto.cuerpo, fontFamily: fuente.semibold, color: colores.azulProfundo },
  stopText: { ...texto.micro, color: colores.textoOscuro, textTransform: 'capitalize' },
});
