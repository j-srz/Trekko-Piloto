import { useCallback, useEffect, useState } from 'react';
import { traducirErrorApi } from '../../../api';
import { listarRutasOriginales, type RouteSummary } from '../../../api/routes';

export function useRutasOriginales(limit = 50) {
  const [rutas, setRutas] = useState<RouteSummary[]>([]);
  const [version, setVersion] = useState(0);
  const [versionTerminada, setVersionTerminada] = useState<number | null>(null);
  const [fallo, setFallo] = useState<{ version: number; mensaje: string } | null>(null);
  const [offline, setOffline] = useState(false);

  const recargar = useCallback(() => setVersion((actual) => actual + 1), []);

  useEffect(() => {
    let activo = true;
    void listarRutasOriginales(limit)
      .then((pagina) => {
        if (activo) {
          setRutas(pagina.data.data);
          setOffline(pagina.offline);
        }
      })
      .catch((cause: unknown) => {
        if (activo) setFallo({ version, mensaje: traducirErrorApi(cause) });
      })
      .finally(() => {
        if (activo) setVersionTerminada(version);
      });
    return () => {
      activo = false;
    };
  }, [limit, version]);

  const cargando = versionTerminada !== version;
  const error = fallo?.version === version ? fallo.mensaje : null;
  return { rutas, cargando, error, offline, recargar };
}
