/**
 * Galería de componentes — SOLO DESARROLLO.
 *
 * Ruta: (dev)/galeria
 * Muestra todos los componentes ui y las tarjetas en sus distintos estados.
 * Borrar o dejar solo en modo __DEV__ antes de publicar.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Calificacion } from '../../components/ui/Calificacion';
import { CampoBusqueda } from '../../components/ui/CampoBusqueda';
import { CarruselHorizontal } from '../../components/ui/CarruselHorizontal';
import { Chip } from '../../components/ui/Chip';
import { EncabezadoSeccion } from '../../components/ui/EncabezadoSeccion';
import { Insignia } from '../../components/ui/Insignia';
import { colores, espacio, fuente } from '../../constants/tokens';
import { TarjetaGrupo } from '../../features/inicio/components/TarjetaGrupo';
import { TarjetaHospedaje } from '../../features/inicio/components/TarjetaHospedaje';
import { TarjetaLugar } from '../../features/inicio/components/TarjetaLugar';
import { TarjetaRuta } from '../../features/inicio/components/TarjetaRuta';
import {
  GRUPOS_EJEMPLO,
  HOSPEDAJES_EJEMPLO,
  LUGARES_EJEMPLO,
  RUTAS_EJEMPLO,
} from '../../features/inicio/data/datosEjemplo';

export default function GaleriaScreen() {
  const [busqueda, setBusqueda] = useState('');
  const [chipActivo, setChipActivo] = useState('Todos');
  const chips = ['Todos', 'Naturaleza', 'Aventura', 'Cultura'];

  return (
    <SafeAreaView style={estilos.pantalla}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <Seccion titulo="Insignias">
          <View style={estilos.fila}>
            <Insignia texto="$120" variante="verde" />
            <Insignia texto="15–20h" variante="oscura" />
            <Insignia texto="LLENO" variante="roja" />
            <Insignia texto="ACTIVO" variante="verde" />
          </View>
        </Seccion>

        <Seccion titulo="Calificación">
          <View style={estilos.fila}>
            <Calificacion valor={4.5} reseñas={23} />
            <Calificacion valor={0} reseñas={0} />
          </View>
        </Seccion>

        <Seccion titulo="Chips">
          <View style={estilos.fila}>
            {chips.map((c) => (
              <Chip
                key={c}
                etiqueta={c}
                seleccionado={chipActivo === c}
                onPress={() => setChipActivo(c)}
              />
            ))}
          </View>
        </Seccion>

        <Seccion titulo="Campo de búsqueda">
          <CampoBusqueda valor={busqueda} onCambio={setBusqueda} />
        </Seccion>

        <Seccion titulo="Encabezado de sección">
          <EncabezadoSeccion titulo="Rutas populares" onVerTodas={() => {}} />
          <EncabezadoSeccion titulo="Sin enlace" />
        </Seccion>

        <Seccion titulo="Tarjetas de Lugar">
          <CarruselHorizontal
            datos={LUGARES_EJEMPLO}
            renderItem={({ item }) => <TarjetaLugar lugar={item} />}
          />
        </Seccion>

        <Seccion titulo="Tarjetas de Ruta">
          <CarruselHorizontal
            datos={RUTAS_EJEMPLO}
            renderItem={({ item }) => <TarjetaRuta ruta={item} />}
          />
        </Seccion>

        <Seccion titulo="Tarjetas de Hospedaje">
          <CarruselHorizontal
            datos={HOSPEDAJES_EJEMPLO}
            renderItem={({ item }) => <TarjetaHospedaje hospedaje={item} />}
          />
        </Seccion>

        <Seccion titulo="Tarjetas de Grupo">
          <CarruselHorizontal
            datos={GRUPOS_EJEMPLO}
            renderItem={({ item }) => <TarjetaGrupo grupo={item} />}
          />
        </Seccion>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Contenedor de sección dentro de la galería ───────────────────────────────
function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.seccion}>
      <Text style={estilos.tituloSeccion}>{titulo}</Text>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colores.fondo,
  },
  contenido: {
    paddingVertical: espacio.xl,
    gap: espacio.xl,
  },
  seccion: {
    gap: espacio.m,
  },
  tituloSeccion: {
    fontFamily: fuente.bold,
    fontSize: 16,
    color: colores.azulProfundo,
    paddingHorizontal: espacio.xl,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    opacity: 0.5,
  },
  fila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: espacio.s,
    paddingHorizontal: espacio.xl,
  },
});
