/**
 * AccesoAlternativo — separador "o continúa con" y botones de Google y Apple.
 * Sin contenedor ni fondo: se adapta a la superficie del formulario.
 */

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colores, espacio, fuente, texto } from '../../constants/tokens';

interface AccesoAlternativoProps {
    onGoogle: () => void;
    onApple: () => void;
}

export function AccesoAlternativo({ onGoogle, onApple }: AccesoAlternativoProps) {
    return (
        <View style={estilos.contenedor}>
            <View style={estilos.separador}>
                <View style={estilos.linea} />
                <Text style={texto.micro}>o continúa con</Text>
                <View style={estilos.linea} />
            </View>

            <BotonSocial icono="logo-google" titulo="Continuar con Google" onPress={onGoogle} />
            <BotonSocial icono="logo-apple" titulo="Continuar con Apple" onPress={onApple} />
        </View>
    );
}

// ─── Botón individual ─────────────────────────────────────────────────────────

function BotonSocial({
    icono,
    titulo,
    onPress,
}: {
    icono: React.ComponentProps<typeof Ionicons>['name'];
    titulo: string;
    onPress: () => void;
}) {
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={titulo}
            style={({ pressed }) => [estilos.boton, pressed && { backgroundColor: colores.grisPresionado }]}
        >
            <Ionicons name={icono} size={22} color={colores.textoOscuro} />
            <Text style={estilos.botonTexto}>{titulo}</Text>
        </Pressable>
    );
}

const estilos = StyleSheet.create({
    contenedor: {
        gap: espacio.m,
    },
    separador: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: espacio.m,
        marginVertical: espacio.s,
    },
    linea: {
        flex: 1,
        height: 1,
        backgroundColor: colores.borde,
    },
    boton: {
        height: 52,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: espacio.m,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colores.borde,
        backgroundColor: colores.tarjeta,
    },
    botonTexto: {
        fontFamily: fuente.semibold,
        fontSize: 16,
        color: colores.textoOscuro,
    },
});