export type Severidad = 'crítica' | 'alta' | 'media' | 'baja';
export type Prioridad = 'P0' | 'backlog';
export type Route = 'urgente' | 'registrar';
export type Fuente = 'ia' | 'reglas';

export interface Decision {
  titulo: string;
  enProduccion: boolean;
  afectaNucleo: boolean;
  perdidaDatos: boolean;
  severidad: Severidad;
  area: string;
  prioridad: Prioridad;
  razon: string;
  accionSugerida: string;
  fuente: Fuente;
}
