import type { ReactNode } from 'react';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { colores } from '../../theme/tokens';

interface ScreenProps {
  children: ReactNode;
  edges?: Edge[];
}

export function Screen({ children, edges = ['top', 'left', 'right'] }: ScreenProps) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colores.fondo }} edges={edges}>
      {children}
    </SafeAreaView>
  );
}
