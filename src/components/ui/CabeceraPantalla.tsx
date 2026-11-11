/**
 * CabeceraPantalla — título grande con una acción opcional arriba a la
 * derecha (por ejemplo, el botón de búsqueda).
 * Siempre reserva el espacio de la acción, para que el título quede a la
 * misma altura en todas las pantallas.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { espacio, texto } from '../../constants/tokens';
import { BotonFlotante, TAMANO_BOTON_FLOTANTE } from './BotonFlotante';

interface CabeceraPantallaProps {
    titulo: string;
    accion?: {
        icono: React.ComponentProps<typeof BotonFlotante>['icono'];
        etiqueta: string;
        onPress: () => void;
    };
}

export function CabeceraPantalla({ titulo, accion }: CabeceraPantallaProps) {
    return (
        <View style={estilos.contenedor}>
            <View style={estilos.filaAccion}>
                {accion && <BotonFlotante {...accion} variante="blanco" />}
            </View>
            <Text style={texto.h1} accessibilityRole="header">
                {titulo}
            </Text>
        </View>
    );
}

const estilos = StyleSheet.create({
    contenedor: {
        paddingHorizontal: espacio.xl,
        marginBottom: espacio.xl,
        gap: espacio.s,
    },
    filaAccion: {
        minHeight: TAMANO_BOTON_FLOTANTE,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
});