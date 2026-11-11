/**
 * BotonFlotante — botón circular con ícono y sombra.
 *
 * Variantes:
 *   'blanco' → acciones secundarias (buscar)
 *   'verde'  → acción principal (crear)
 */

import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { colores, sombra } from '../../constants/tokens';

export const TAMANO_BOTON_FLOTANTE = 56;

interface BotonFlotanteProps {
    icono: React.ComponentProps<typeof Feather>['name'];
    /** Texto que lee el lector de pantalla. */
    etiqueta: string;
    onPress: () => void;
    variante?: 'blanco' | 'verde';
    style?: StyleProp<ViewStyle>;
}

export function BotonFlotante({
    icono,
    etiqueta,
    onPress,
    variante = 'blanco',
    style,
}: BotonFlotanteProps) {
    const esVerde = variante === 'verde';

    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            accessibilityLabel={etiqueta}
            style={({ pressed }) => [
                estilos.base,
                { backgroundColor: esVerde ? colores.verdeBoton : colores.tarjeta },
                pressed && { opacity: 0.8 },
                style,
            ]}
        >
            <Feather
                name={icono}
                size={esVerde ? 28 : 22}
                color={esVerde ? colores.blanco : colores.azulProfundo}
            />
        </Pressable>
    );
}

const estilos = StyleSheet.create({
    base: {
        width: TAMANO_BOTON_FLOTANTE,
        height: TAMANO_BOTON_FLOTANTE,
        borderRadius: TAMANO_BOTON_FLOTANTE / 2,
        alignItems: 'center',
        justifyContent: 'center',
        ...sombra.nivel2,
    },
});