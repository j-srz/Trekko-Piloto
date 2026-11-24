import { useSyncExternalStore } from 'react';

let destinosGuardados: string[] = [];
const suscriptores = new Set<() => void>();

function notificar() {
  suscriptores.forEach((suscriptor) => suscriptor());
}

function suscribirse(suscriptor: () => void) {
  suscriptores.add(suscriptor);
  return () => suscriptores.delete(suscriptor);
}

function obtenerSnapshot() {
  return destinosGuardados;
}

export function useDestinosGuardados() {
  return useSyncExternalStore(suscribirse, obtenerSnapshot, obtenerSnapshot);
}

export function alternarDestinoGuardado(id: string) {
  destinosGuardados = destinosGuardados.includes(id)
    ? destinosGuardados.filter((guardado) => guardado !== id)
    : [...destinosGuardados, id];
  notificar();
}

export function quitarDestinoGuardado(id: string) {
  if (!destinosGuardados.includes(id)) return;
  destinosGuardados = destinosGuardados.filter((guardado) => guardado !== id);
  notificar();
}
