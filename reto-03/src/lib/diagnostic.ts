import { PREGUNTAS, ARQUETIPOS, type Arquetipo } from '../data/quiz';

export type Respuestas = Record<string, string>;
export interface Puntajes { puntaje_web: number; puntaje_automatizacion: number; }

function pesoDe(preguntaId: string, opcionId: string | undefined): number {
  const p = PREGUNTAS.find((q) => q.id === preguntaId);
  if (!p) return 0;
  const o = p.opciones.find((x) => x.id === opcionId);
  return o ? o.peso : 0;
}

function promedioEje(respuestas: Respuestas, eje: 'web' | 'automatizacion'): number {
  const preguntas = PREGUNTAS.filter((p) => p.eje === eje);
  const suma = preguntas.reduce((acc, p) => acc + pesoDe(p.id, respuestas[p.id]), 0);
  return Math.round(suma / preguntas.length);
}

export function scoreQuiz(respuestas: Respuestas): Puntajes {
  return {
    puntaje_web: promedioEje(respuestas, 'web'),
    puntaje_automatizacion: promedioEje(respuestas, 'automatizacion'),
  };
}

export function archetypeFor(p: Puntajes): Arquetipo {
  const web = p.puntaje_web >= 50 ? 'alto' : 'bajo';
  const auto = p.puntaje_automatizacion >= 50 ? 'alto' : 'bajo';
  const a = ARQUETIPOS.find((x) => x.web === web && x.auto === auto);
  return a!; // los 4 cuadrantes están cubiertos en ARQUETIPOS
}
