import type { Decision, Severidad } from '../types';
import { classifyByRules } from './rules';
import { priorityFromFlags } from './route';
import { MODEL } from '../config';

// Workers AI puede devolver `response` como string (texto) o como objeto ya
// parseado (cuando se usa response_format json_schema). Aceptamos ambos.
export type AiRunner = (model: string, inputs: unknown) => Promise<{ response?: unknown }>;

// Esquema que fuerza a Workers AI a devolver exactamente estas claves.
const JSON_SCHEMA = {
  type: 'object',
  properties: {
    titulo: { type: 'string' },
    enProduccion: { type: 'boolean' },
    afectaNucleo: { type: 'boolean' },
    perdidaDatos: { type: 'boolean' },
    severidad: { type: 'string', enum: ['crítica', 'alta', 'media', 'baja'] },
    area: { type: 'string' },
    razon: { type: 'string' },
    accionSugerida: { type: 'string' },
  },
  required: ['titulo', 'enProduccion', 'afectaNucleo', 'perdidaDatos', 'severidad', 'area', 'razon', 'accionSugerida'],
};

const SYSTEM = `Eres un ingeniero de guardia que triadea reportes de bugs. Analiza el reporte y responde SOLO con un objeto JSON válido, sin texto adicional, con estas claves exactas:
{"titulo":string,"enProduccion":boolean,"afectaNucleo":boolean,"perdidaDatos":boolean,"severidad":"crítica"|"alta"|"media"|"baja","area":string,"razon":string,"accionSugerida":string}
- enProduccion: true SOLO si ocurre en el entorno productivo / usuarios reales (no local, dev ni staging).
- afectaNucleo: true si rompe una funcionalidad central (pagos, login, carga de la app).
- perdidaDatos: true si hay borrado, corrupción o pérdida de datos.
Si no hay evidencia, usa false. No inventes.`;

const SEVS: Severidad[] = ['crítica', 'alta', 'media', 'baja'];

export function extractJson(s: string): any | null {
  const start = s.indexOf('{');
  if (start < 0) return null;
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(s.slice(start, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

export function buildFromParsed(p: any, fallbackTitle: string): Decision | null {
  if (!p || typeof p !== 'object') return null;
  const bool = (v: any) => v === true;
  const enProduccion = bool(p.enProduccion);
  const afectaNucleo = bool(p.afectaNucleo);
  const perdidaDatos = bool(p.perdidaDatos);
  const severidad: Severidad = SEVS.includes(p.severidad) ? p.severidad : 'media';
  return {
    titulo: typeof p.titulo === 'string' && p.titulo.trim() ? p.titulo.slice(0, 80) : fallbackTitle,
    enProduccion, afectaNucleo, perdidaDatos, severidad,
    area: typeof p.area === 'string' && p.area ? p.area : 'general',
    prioridad: priorityFromFlags({ perdidaDatos, enProduccion, afectaNucleo }),
    razon: typeof p.razon === 'string' ? p.razon : '',
    accionSugerida: typeof p.accionSugerida === 'string' ? p.accionSugerida : '',
    fuente: 'ia',
  };
}

export async function triage(text: string, ai?: AiRunner): Promise<Decision> {
  if (ai) {
    try {
      const out = await ai(MODEL, {
        messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: text }],
        temperature: 0.1,
        response_format: { type: 'json_schema', json_schema: JSON_SCHEMA },
      });
      const raw: unknown = out?.response;
      // Workers AI devuelve `response` como objeto (con json_schema) o string.
      const parsed = typeof raw === 'string' ? extractJson(raw) : (raw ?? null);
      const title = text.trim().split('\n')[0].slice(0, 80) || 'Bug';
      const d = buildFromParsed(parsed, title);
      if (d) return d;
    } catch { /* cae a reglas */ }
  }
  return classifyByRules(text);
}
