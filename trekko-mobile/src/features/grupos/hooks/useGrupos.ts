import { useCallback, useEffect, useMemo, useState } from 'react';
import { obtenerGrupos } from '../data/repositorioGrupos';
import { organizarGrupos } from '../reglas';
import type { Grupo } from '../types';

export function useGrupos() {
    const [grupos, setGrupos] = useState<Grupo[] | null>(null);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const cargar = useCallback(async () => {
        setCargando(true);
        setError(null);
        try {
            setGrupos(await obtenerGrupos());
        } catch {
            // Si ya había datos, se conservan y solo se avisa del error
            setError('No pudimos cargar los grupos. Revisa tu conexión e intenta de nuevo.');
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    const secciones = useMemo(
        () => (grupos ? organizarGrupos(grupos, new Date()) : null),
        [grupos],
    );

    return { cargando, error, grupos, secciones, recargar: cargar };
}