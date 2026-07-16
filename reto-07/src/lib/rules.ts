import type { Decision, Severidad } from '../types';
import { priorityFromFlags } from './route';

const RE = {
  perdida: /(se\s+)?(borran?|borrado|pierden?|p[eé]rdida de datos|se perdi[oó]|corrup\w*|data loss)/i,
  prod: /(producci[oó]n|en prod\b|\bprod\b|en vivo|usuarios? reales?|\blive\b)/i,
  noProd: /(local(host)?|en mi (m[aá]quina|dev|equipo)|entorno de desarrollo|\bdev\b|staging|\bqa\b)/i,
  nucleo: /(pago|checkout|cobro|login|inicio de sesi[oó]n|iniciar sesi[oó]n|no puedo (entrar|pagar|acceder|iniciar)|ca[ií]da|se cae|crash|\b500\b|se rompe|no carga la app)/i,
  cosmetico: /(cosm[eé]tic\w*|color|desalinead\w*|\bgris\b|margen|padding|se ve mal|tipograf[ií]a|estilo)/i,
  feature: /(estar[ií]a bueno|ser[ií]a genial|feature|mejora|nice to have|podr[ií]amos agregar|sugerencia)/i,
};

function detectArea(text: string): string {
  if (/pago|checkout|cobro/i.test(text)) return 'pagos';
  if (/login|sesi[oó]n|auth/i.test(text)) return 'auth';
  if (/color|\bui\b|bot[oó]n|dise[nñ]o|estilo/i.test(text)) return 'ui';
  if (/datos|registro|base de datos|\bdb\b/i.test(text)) return 'datos';
  return 'general';
}

export function classifyByRules(text: string): Decision {
  const perdidaDatos = RE.perdida.test(text);
  const enProduccion = RE.prod.test(text) && !RE.noProd.test(text);
  const afectaNucleo = RE.nucleo.test(text);
  const prioridad = priorityFromFlags({ perdidaDatos, enProduccion, afectaNucleo });

  let severidad: Severidad;
  if (perdidaDatos || (enProduccion && afectaNucleo)) severidad = 'crítica';
  else if (enProduccion || afectaNucleo) severidad = 'alta';
  else if (RE.cosmetico.test(text) || RE.feature.test(text)) severidad = 'baja';
  else severidad = 'media';

  const titulo = text.trim().split('\n')[0].slice(0, 80) || 'Bug sin título';
  return {
    titulo, enProduccion, afectaNucleo, perdidaDatos, severidad,
    area: detectArea(text), prioridad,
    razon: `Clasificado por reglas: producción=${enProduccion}, núcleo=${afectaNucleo}, pérdidaDatos=${perdidaDatos}.`,
    accionSugerida: prioridad === 'P0' ? 'Atender ya: hotfix / avisar on-call' : 'Registrar en backlog para priorizar',
    fuente: 'reglas',
  };
}
