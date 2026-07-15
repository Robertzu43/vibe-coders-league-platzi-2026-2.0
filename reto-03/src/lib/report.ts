import { PREGUNTAS } from '../data/quiz';
import { BLOQUES, OPTIMIZACIONES, type Bloque } from '../data/report-blocks';
import { archetypeFor, type Puntajes, type Respuestas } from './diagnostic';
import type { Arquetipo } from '../data/quiz';

const UMBRAL_DEBIL = 65;
const MAX_BLOQUES = 4;
const MIN_BLOQUES = 3;

export interface Informe { arquetipo: Arquetipo; bloques: Bloque[]; cierre: string; }

function pesoRespuesta(respuestas: Respuestas, preguntaId: string): number {
  const p = PREGUNTAS.find((q) => q.id === preguntaId);
  const o = p?.opciones.find((x) => x.id === respuestas[preguntaId]);
  return o ? o.peso : 0;
}

export function buildReport(respuestas: Respuestas, puntajes: Puntajes): Informe {
  const arquetipo = archetypeFor(puntajes);

  // Bloques disparados por debilidades, ordenados por urgencia (peso ascendente).
  const debiles = BLOQUES
    .map((b) => ({ b, peso: pesoRespuesta(respuestas, b.id) }))
    .filter((x) => x.peso <= UMBRAL_DEBIL)
    .sort((a, z) => a.peso - z.peso)
    .map((x) => x.b);

  const bloques: Bloque[] = [...debiles];

  // Garantizar mínimo con optimizaciones del arquetipo (sin duplicar).
  for (const opt of OPTIMIZACIONES[arquetipo.id] ?? []) {
    if (bloques.length >= MIN_BLOQUES) break;
    if (!bloques.some((b) => b.id === opt.id)) bloques.push(opt);
  }

  const cierre = `Este es tu punto de partida como "${arquetipo.label}". En Órbita construimos justo estas piezas — escríbenos y armamos tu plan paso a paso.`;
  return { arquetipo, bloques: bloques.slice(0, MAX_BLOQUES), cierre };
}
