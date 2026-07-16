import type { Prioridad, Route } from '../types';

export function priorityFromFlags(f: {
  perdidaDatos: boolean;
  enProduccion: boolean;
  afectaNucleo: boolean;
}): Prioridad {
  return f.perdidaDatos || (f.enProduccion && f.afectaNucleo) ? 'P0' : 'backlog';
}

export function routeFor(p: Prioridad): Route {
  return p === 'P0' ? 'urgente' : 'registrar';
}
