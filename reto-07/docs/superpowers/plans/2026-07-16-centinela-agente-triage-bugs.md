# Centinela · el agente que decide por ti — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un Cloudflare Worker + Workers AI que recibe un bug (texto libre), la IA lo clasifica según una rúbrica (¿producción?, ¿núcleo?, ¿pérdida de datos?) y lo enruta a 2 destinos reales: P0 → Slack; backlog → Google Sheet. Página de demo con 5 casos.

**Architecture:** Worker TypeScript puro (como reto-06). `index.ts` orquesta; cada `lib/*.ts` tiene una responsabilidad única y recibe `fetch`/AI por parámetro (inyectable). La decisión sale de la IA como JSON validado, con **fallback determinista por reglas**; la `prioridad` siempre se **deriva de 3 booleanos** vía una rúbrica única. Demo pública en dry-run; envío real detrás de `DEMO_TOKEN`.

**Tech Stack:** Cloudflare Workers (Wrangler), TypeScript strict, Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`), Vitest. Gate de tipos: `tsc --noEmit` (NO astro check).

**Spec:** `reto-07/docs/superpowers/specs/2026-07-16-centinela-agente-triage-bugs-design.md`

**Rutas:** todo bajo `reto-07/`. Comandos `npm` desde `reto-07/`.

---

## File Structure

```
reto-07/
  package.json  tsconfig.json  vitest.config.ts  wrangler.toml
  .dev.vars.example  .gitignore
  src/
    index.ts            # Env, handleTriage(), fetch(): GET / (demo) · POST /triage
    config.ts           # MODEL, SHEET_TAB/RANGE, SHEET_HEADERS (no-secreto)
    types.ts            # Decision, Route, Prioridad, Severidad, Fuente
    cases.ts            # los 5 casos de ejemplo + ruta esperada
    lib/
      route.ts          # priorityFromFlags() (rúbrica) + routeFor()
      rules.ts          # classifyByRules() heurística determinista (fallback)
      triage.ts         # triage(): Workers AI → JSON + validación + fallback
      slack.ts          # buildSlackMessage() + postSlack()
      sheets.ts         # getAccessToken() + rowFromDecision() + appendRow()
      demo.ts           # renderDemoPage(): HTML de la demo
    lib/*.test.ts  cases.test.ts
  docs/
    superpowers/{specs,plans}/
    evidence/           # captura de Slack + fila en la hoja
  README.md
```

---

## Task 1: Scaffold del proyecto

**Files:** Create `reto-07/{package.json,tsconfig.json,vitest.config.ts,wrangler.toml,.dev.vars.example,.gitignore,src/config.ts,src/types.ts}`

- [ ] **Step 1: `package.json`**
```json
{
  "name": "centinela",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^5.20260708.1",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "wrangler": "^4.61.1"
  }
}
```

- [ ] **Step 2: `tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "types": ["@cloudflare/workers-types", "vitest/globals"],
    "strict": true,
    "noImplicitAny": true,
    "noEmit": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": false
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: `vitest.config.ts`**
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 4: `wrangler.toml`**
```toml
name = "centinela"
main = "src/index.ts"
compatibility_date = "2025-05-21"
compatibility_flags = ["nodejs_compat"]

[ai]
binding = "AI"
```

- [ ] **Step 5: `.dev.vars.example`**
```
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
GOOGLE_CLIENT_ID=xxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxx
GOOGLE_REFRESH_TOKEN=1//xxxx
SHEETS_ID=id-de-tu-google-sheet
DEMO_TOKEN=cadena-larga-al-azar
```

- [ ] **Step 6: `.gitignore`**
```
node_modules/
.dev.vars
.wrangler/
dist/
```

- [ ] **Step 7: `src/config.ts`**
```ts
export const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const SHEET_TAB = 'Backlog';
export const SHEET_RANGE = `${SHEET_TAB}!A1`;
export const SHEET_HEADERS = [
  'fecha', 'titulo', 'severidad', 'prioridad', 'area',
  'enProduccion', 'afectaNucleo', 'perdidaDatos', 'razon', 'accionSugerida',
] as const;
```

- [ ] **Step 8: `src/types.ts`**
```ts
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
```

- [ ] **Step 9:** `cd reto-07 && npm install && npm run typecheck` → sin errores.
- [ ] **Step 10: Commit**
```bash
git add reto-07/package.json reto-07/tsconfig.json reto-07/vitest.config.ts reto-07/wrangler.toml reto-07/.dev.vars.example reto-07/.gitignore reto-07/src/config.ts reto-07/src/types.ts reto-07/package-lock.json
git commit -m "chore(reto-07): scaffold centinela worker (config, types)"
```

---

## Task 2: `route.ts` — rúbrica y ruta

**Files:** Create `reto-07/src/lib/route.ts`, `reto-07/src/lib/route.test.ts`

- [ ] **Step 1: Test que falla**
```ts
import { priorityFromFlags, routeFor } from './route';

test('perdidaDatos sola → P0 aunque enProduccion sea false', () => {
  expect(priorityFromFlags({ perdidaDatos: true, enProduccion: false, afectaNucleo: false })).toBe('P0');
});
test('producción + núcleo → P0', () => {
  expect(priorityFromFlags({ perdidaDatos: false, enProduccion: true, afectaNucleo: true })).toBe('P0');
});
test('producción sin núcleo → backlog', () => {
  expect(priorityFromFlags({ perdidaDatos: false, enProduccion: true, afectaNucleo: false })).toBe('backlog');
});
test('nada → backlog', () => {
  expect(priorityFromFlags({ perdidaDatos: false, enProduccion: false, afectaNucleo: false })).toBe('backlog');
});
test('routeFor mapea prioridad → ruta', () => {
  expect(routeFor('P0')).toBe('urgente');
  expect(routeFor('backlog')).toBe('registrar');
});
```

- [ ] **Step 2:** `cd reto-07 && npx vitest run src/lib/route.test.ts` → FAIL.

- [ ] **Step 3: `src/lib/route.ts`**
```ts
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
```

- [ ] **Step 4:** `npx vitest run src/lib/route.test.ts` → PASS (5) + `npm run typecheck`.
- [ ] **Step 5: Commit**
```bash
git add reto-07/src/lib/route.ts reto-07/src/lib/route.test.ts
git commit -m "feat(reto-07): add triage rubric (priorityFromFlags) + routeFor"
```

---

## Task 3: `rules.ts` + `cases.ts` — heurística y los 5 casos

**Files:** Create `reto-07/src/lib/rules.ts`, `reto-07/src/cases.ts`, `reto-07/src/lib/rules.test.ts`, `reto-07/src/cases.test.ts`

- [ ] **Step 1: Tests que fallan**

`src/lib/rules.test.ts`:
```ts
import { classifyByRules } from './rules';

test('bug de pérdida de datos → perdidaDatos true, P0', () => {
  const d = classifyByRules('Al editar un registro se borran los datos de otros registros.');
  expect(d.perdidaDatos).toBe(true);
  expect(d.prioridad).toBe('P0');
  expect(d.fuente).toBe('reglas');
});
test('checkout 500 en producción → prod + núcleo, P0', () => {
  const d = classifyByRules('El checkout tira error 500 al pagar en producción.');
  expect(d.enProduccion).toBe(true);
  expect(d.afectaNucleo).toBe(true);
  expect(d.prioridad).toBe('P0');
});
test('bug solo en local → no producción → backlog', () => {
  const d = classifyByRules('La app falla solo en mi entorno local con Node 18, en dev.');
  expect(d.enProduccion).toBe(false);
  expect(d.prioridad).toBe('backlog');
});
test('cosmético → baja severidad, backlog', () => {
  const d = classifyByRules('El botón de ayuda se ve gris y desalineado en móvil.');
  expect(d.prioridad).toBe('backlog');
  expect(d.severidad).toBe('baja');
});
```

`src/cases.test.ts`:
```ts
import { CASES } from './cases';
import { classifyByRules } from './lib/rules';
import { routeFor } from './lib/route';

test('los 5 casos enrutan como se espera (vía reglas)', () => {
  expect(CASES).toHaveLength(5);
  for (const c of CASES) {
    const d = classifyByRules(c.text);
    expect(routeFor(d.prioridad), `caso: ${c.nota}`).toBe(c.esperado);
  }
});
```

- [ ] **Step 2:** `npx vitest run src/lib/rules.test.ts src/cases.test.ts` → FAIL.

- [ ] **Step 3: `src/cases.ts`**
```ts
export interface ExampleCase { text: string; esperado: 'urgente' | 'registrar'; nota: string; }

export const CASES: ExampleCase[] = [
  { text: 'El checkout tira error 500 al pagar en producción, ningún usuario puede completar la compra.', esperado: 'urgente', nota: 'prod + núcleo' },
  { text: 'Al editar un registro se borran los datos de otros registros. Se está perdiendo información.', esperado: 'urgente', nota: 'pérdida de datos' },
  { text: 'El botón de ayuda se ve gris y desalineado en móvil.', esperado: 'registrar', nota: 'cosmético' },
  { text: 'La app falla solo en mi entorno local con Node 18, en dev.', esperado: 'registrar', nota: 'no-prod' },
  { text: 'Estaría bueno poder exportar el reporte a CSV.', esperado: 'registrar', nota: 'feature' },
];
```

- [ ] **Step 4: `src/lib/rules.ts`**
```ts
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
```

- [ ] **Step 5:** `npx vitest run src/lib/rules.test.ts src/cases.test.ts` → PASS + `npm run typecheck`.
- [ ] **Step 6: Commit**
```bash
git add reto-07/src/lib/rules.ts reto-07/src/lib/rules.test.ts reto-07/src/cases.ts reto-07/src/cases.test.ts
git commit -m "feat(reto-07): add rule-based classifier + 5 example cases"
```

---

## Task 4: `triage.ts` — decisión con IA + fallback

**Files:** Create `reto-07/src/lib/triage.ts`, `reto-07/src/lib/triage.test.ts`

- [ ] **Step 1: Test que falla**
```ts
import { triage, extractJson, buildFromParsed } from './triage';

test('extractJson saca el bloque JSON aunque venga envuelto en texto', () => {
  const j = extractJson('claro, aquí tienes: {"a":1,"b":{"c":2}} fin');
  expect(j).toEqual({ a: 1, b: { c: 2 } });
});
test('extractJson devuelve null si no hay JSON', () => {
  expect(extractJson('sin json')).toBeNull();
});
test('buildFromParsed deriva prioridad de los booleanos (no confía en la IA)', () => {
  const d = buildFromParsed({ titulo: 'X', enProduccion: false, afectaNucleo: false, perdidaDatos: true, severidad: 'baja', area: 'datos', prioridad: 'backlog', razon: 'r', accionSugerida: 'a' }, 'fallback');
  expect(d?.prioridad).toBe('P0'); // perdidaDatos manda, ignora prioridad 'backlog' de la IA
  expect(d?.fuente).toBe('ia');
});
test('triage usa la IA cuando devuelve JSON válido', async () => {
  const ai = async () => ({ response: '{"titulo":"Bug","enProduccion":true,"afectaNucleo":true,"perdidaDatos":false,"severidad":"crítica","area":"pagos","razon":"r","accionSugerida":"a"}' });
  const d = await triage('checkout roto', ai);
  expect(d.fuente).toBe('ia');
  expect(d.prioridad).toBe('P0');
});
test('triage cae a reglas si la IA lanza', async () => {
  const ai = async () => { throw new Error('AI down'); };
  const d = await triage('se borran los datos al editar', ai);
  expect(d.fuente).toBe('reglas');
  expect(d.prioridad).toBe('P0');
});
test('triage cae a reglas si la IA devuelve basura', async () => {
  const ai = async () => ({ response: 'no es json' });
  const d = await triage('El botón se ve gris', ai);
  expect(d.fuente).toBe('reglas');
  expect(d.prioridad).toBe('backlog');
});
```

- [ ] **Step 2:** `npx vitest run src/lib/triage.test.ts` → FAIL.

- [ ] **Step 3: `src/lib/triage.ts`**
```ts
import type { Decision, Severidad } from '../types';
import { classifyByRules } from './rules';
import { priorityFromFlags } from './route';
import { MODEL } from '../config';

export type AiRunner = (model: string, inputs: unknown) => Promise<{ response?: string }>;

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
      });
      const parsed = extractJson(out?.response ?? '');
      const title = text.trim().split('\n')[0].slice(0, 80) || 'Bug';
      const d = buildFromParsed(parsed, title);
      if (d) return d;
    } catch { /* cae a reglas */ }
  }
  return classifyByRules(text);
}
```

- [ ] **Step 4:** `npx vitest run src/lib/triage.test.ts` → PASS (6) + `npm run typecheck`.
- [ ] **Step 5: Commit**
```bash
git add reto-07/src/lib/triage.ts reto-07/src/lib/triage.test.ts
git commit -m "feat(reto-07): add AI triage with JSON extraction + rule fallback"
```

---

## Task 5: `slack.ts` — mensaje Block Kit + envío

**Files:** Create `reto-07/src/lib/slack.ts`, `reto-07/src/lib/slack.test.ts`

- [ ] **Step 1: Test que falla**
```ts
import { buildSlackMessage, postSlack } from './slack';
import type { Decision } from '../types';

const d: Decision = { titulo: 'Checkout roto', enProduccion: true, afectaNucleo: true, perdidaDatos: false, severidad: 'crítica', area: 'pagos', prioridad: 'P0', razon: 'bloquea compra', accionSugerida: 'hotfix', fuente: 'ia' };

test('buildSlackMessage arma bloques con título y campos', () => {
  const m = JSON.stringify(buildSlackMessage(d, 'texto original'));
  expect(m).toContain('Checkout roto');
  expect(m).toContain('crítica');
  expect(m).toContain('pagos');
  expect(m).toContain('blocks');
});
test('postSlack lanza en HTTP no-ok', async () => {
  const f = (async () => ({ ok: false, status: 500 } as Response)) as unknown as typeof fetch;
  await expect(postSlack('https://hooks/x', { a: 1 }, f)).rejects.toThrow('500');
});
test('postSlack ok no lanza', async () => {
  const f = (async () => ({ ok: true, status: 200 } as Response)) as unknown as typeof fetch;
  await expect(postSlack('https://hooks/x', { a: 1 }, f)).resolves.toBeUndefined();
});
```

- [ ] **Step 2:** `npx vitest run src/lib/slack.test.ts` → FAIL.

- [ ] **Step 3: `src/lib/slack.ts`**
```ts
import type { Decision } from '../types';

export function buildSlackMessage(d: Decision, text: string): object {
  return {
    blocks: [
      { type: 'header', text: { type: 'plain_text', text: `🚨 Bug P0 — ${d.titulo}`.slice(0, 150) } },
      { type: 'section', fields: [
        { type: 'mrkdwn', text: `*Severidad:*\n${d.severidad}` },
        { type: 'mrkdwn', text: `*Área:*\n${d.area}` },
        { type: 'mrkdwn', text: `*Producción:*\n${d.enProduccion ? 'sí' : 'no'}` },
        { type: 'mrkdwn', text: `*Pérdida de datos:*\n${d.perdidaDatos ? 'sí' : 'no'}` },
      ] },
      { type: 'section', text: { type: 'mrkdwn', text: `*Razón:* ${d.razon}\n*Acción:* ${d.accionSugerida}` } },
      { type: 'context', elements: [{ type: 'mrkdwn', text: `Reporte: ${text.slice(0, 280)}` }] },
    ],
  };
}

export async function postSlack(webhookUrl: string, message: object, fetchImpl?: typeof fetch): Promise<void> {
  const f = fetchImpl ?? fetch;
  const res = await f(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(message),
  });
  if (!res.ok) throw new Error(`Slack HTTP ${res.status}`);
}
```

- [ ] **Step 4:** `npx vitest run src/lib/slack.test.ts` → PASS (3) + `npm run typecheck`.
- [ ] **Step 5: Commit**
```bash
git add reto-07/src/lib/slack.ts reto-07/src/lib/slack.test.ts
git commit -m "feat(reto-07): add Slack Block Kit builder + webhook post"
```

---

## Task 6: `sheets.ts` — Google OAuth + append

**Files:** Create `reto-07/src/lib/sheets.ts`, `reto-07/src/lib/sheets.test.ts`

- [ ] **Step 1: Test que falla**
```ts
import { getAccessToken, rowFromDecision, appendRow } from './sheets';
import type { Decision } from '../types';

function jsonRes(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}
const d: Decision = { titulo: 'Botón gris', enProduccion: false, afectaNucleo: false, perdidaDatos: false, severidad: 'baja', area: 'ui', prioridad: 'backlog', razon: 'cosmético', accionSugerida: 'backlog', fuente: 'reglas' };

test('getAccessToken devuelve el token', async () => {
  const f = (async () => jsonRes({ access_token: 'ya29.x' })) as unknown as typeof fetch;
  expect(await getAccessToken({ clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl: f })).toBe('ya29.x');
});
test('getAccessToken lanza si no hay token', async () => {
  const f = (async () => jsonRes({}, false, 400)) as unknown as typeof fetch;
  await expect(getAccessToken({ clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl: f })).rejects.toThrow();
});
test('rowFromDecision arma la fila en orden', () => {
  const row = rowFromDecision(d, '2026-07-16T00:00:00Z');
  expect(row[0]).toBe('2026-07-16T00:00:00Z');
  expect(row[1]).toBe('Botón gris');
  expect(row[3]).toBe('backlog');
  expect(row).toHaveLength(10);
});
test('appendRow postea a la URL de append y lanza en error', async () => {
  let calledUrl = '';
  const okF = (async (u: string) => { calledUrl = u; return jsonRes({}); }) as unknown as typeof fetch;
  await appendRow({ sheetId: 'SID', accessToken: 't', row: ['a'], fetchImpl: okF });
  expect(calledUrl).toContain('/spreadsheets/SID/values/');
  expect(calledUrl).toContain(':append');
  const badF = (async () => jsonRes({}, false, 403)) as unknown as typeof fetch;
  await expect(appendRow({ sheetId: 'SID', accessToken: 't', row: ['a'], fetchImpl: badF })).rejects.toThrow('403');
});
```

- [ ] **Step 2:** `npx vitest run src/lib/sheets.test.ts` → FAIL.

- [ ] **Step 3: `src/lib/sheets.ts`**
```ts
import type { Decision } from '../types';
import { SHEET_RANGE } from '../config';

export async function getAccessToken(o: {
  clientId: string; clientSecret: string; refreshToken: string; fetchImpl?: typeof fetch;
}): Promise<string> {
  const f = o.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: o.clientId, client_secret: o.clientSecret,
    refresh_token: o.refreshToken, grant_type: 'refresh_token',
  });
  const res = await f('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body,
  });
  if (!res.ok) throw new Error(`OAuth token HTTP ${res.status}`);
  const j = (await res.json()) as { access_token?: string };
  if (!j.access_token) throw new Error('OAuth: sin access_token');
  return j.access_token;
}

export function rowFromDecision(d: Decision, fecha: string): string[] {
  return [
    fecha, d.titulo, d.severidad, d.prioridad, d.area,
    String(d.enProduccion), String(d.afectaNucleo), String(d.perdidaDatos), d.razon, d.accionSugerida,
  ];
}

export async function appendRow(o: {
  sheetId: string; accessToken: string; row: string[]; range?: string; fetchImpl?: typeof fetch;
}): Promise<void> {
  const f = o.fetchImpl ?? fetch;
  const range = o.range ?? SHEET_RANGE;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${o.sheetId}/values/${encodeURIComponent(range)}:append?valueInputOption=USER_ENTERED`;
  const res = await f(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${o.accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ values: [o.row] }),
  });
  if (!res.ok) throw new Error(`Sheets append HTTP ${res.status}`);
}
```

- [ ] **Step 4:** `npx vitest run src/lib/sheets.test.ts` → PASS (4) + `npm run typecheck`.
- [ ] **Step 5: Commit**
```bash
git add reto-07/src/lib/sheets.ts reto-07/src/lib/sheets.test.ts
git commit -m "feat(reto-07): add Google Sheets append via OAuth (backlog)"
```

---

## Task 7: `demo.ts` — página de demo

**Files:** Create `reto-07/src/lib/demo.ts`, `reto-07/src/lib/demo.test.ts`

La página se sirve en `GET /`. Un textarea + "Analizar" (POST /triage dryRun) y un botón "Correr 5 casos". Estilo cuidado (badges de decisión, tabla). CSS inline en la página (es navegador, no email — se permite CSS moderno). El JS llama a `/triage` con `dryRun:true`.

- [ ] **Step 1: Test que falla**
```ts
import { renderDemoPage } from './demo';
import { CASES } from '../cases';

test('la página incluye el formulario, el botón de 5 casos y llama a /triage', () => {
  const html = renderDemoPage(CASES);
  expect(html).toContain('<textarea');
  expect(html).toContain('/triage');
  expect(html).toContain('Correr 5 casos');
  expect(html).toContain('Centinela');
  // los 5 casos vienen embebidos para el botón
  expect(html).toContain('checkout');
});
```

- [ ] **Step 2:** `npx vitest run src/lib/demo.test.ts` → FAIL.

- [ ] **Step 3: `src/lib/demo.ts`**  (página autocontenida; `CASES` se serializa a JSON e inyecta)
```ts
import type { ExampleCase } from '../cases';

export function renderDemoPage(cases: ExampleCase[]): string {
  const casesJson = JSON.stringify(cases).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Centinela · triage de bugs</title>
<style>
  :root{--accent:#4f46e5;--ink:#111827;--muted:#6b7280;--border:#e5e7eb;--bg:#f6f7f9;--p0:#dc2626;--bk:#2563eb}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}
  .wrap{max-width:820px;margin:0 auto;padding:28px 18px}
  h1{font-size:24px;margin:0} .sub{color:var(--muted);margin:4px 0 22px}
  .card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:18px}
  textarea{width:100%;min-height:96px;border:1px solid var(--border);border-radius:10px;padding:12px;font:inherit;resize:vertical}
  button{background:var(--accent);color:#fff;border:0;border-radius:10px;padding:10px 16px;font:600 14px inherit;cursor:pointer}
  button.ghost{background:#fff;color:var(--accent);border:1px solid var(--accent)}
  .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
  .badge{display:inline-block;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;margin:2px 4px 2px 0}
  .b-p0{background:#fee2e2;color:var(--p0)} .b-bk{background:#dbeafe;color:var(--bk)} .b-n{background:#eef2ff;color:var(--accent)}
  table{width:100%;border-collapse:collapse;margin-top:6px;font-size:14px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}
  th{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .muted{color:var(--muted)} .pill{font-weight:700}
  .dot-p0{color:var(--p0)} .dot-bk{color:var(--bk)}
</style></head><body><div class="wrap">
  <h1>⚙️ Centinela</h1>
  <div class="sub">El agente que decide por ti — triage de bugs. Pega un bug y mira la decisión, o corre los 5 casos.</div>

  <div class="card">
    <textarea id="bug" placeholder="Describe un bug… p. ej. 'el checkout tira 500 al pagar en producción'"></textarea>
    <div class="row">
      <button onclick="analizar()">Analizar</button>
      <button class="ghost" onclick="correrCasos()">Correr 5 casos</button>
    </div>
    <div id="out"></div>
  </div>

  <div class="card">
    <div class="muted" style="font-size:13px">Rúbrica: <b>P0</b> = pérdida de datos, o (en producción y afecta el núcleo). El resto va al <b>backlog</b>. La demo corre en modo dry-run (no envía a Slack/Sheet).</div>
  </div>

<script>
const CASES = ${casesJson};
function badgesFor(d){
  const p = d.prioridad === 'P0'
    ? '<span class="badge b-p0">P0 · urgente → Slack</span>'
    : '<span class="badge b-bk">backlog → Sheet</span>';
  return p
    + '<span class="badge b-n">sev: '+d.severidad+'</span>'
    + '<span class="badge b-n">prod: '+(d.enProduccion?'sí':'no')+'</span>'
    + '<span class="badge b-n">núcleo: '+(d.afectaNucleo?'sí':'no')+'</span>'
    + '<span class="badge b-n">datos: '+(d.perdidaDatos?'sí':'no')+'</span>'
    + '<span class="badge b-n">'+d.fuente+'</span>';
}
async function triage(text){
  const r = await fetch('/triage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,dryRun:true})});
  return r.json();
}
async function analizar(){
  const t = document.getElementById('bug').value.trim();
  const out = document.getElementById('out');
  if(!t){ out.innerHTML='<p class="muted">Escribe un bug primero.</p>'; return; }
  out.innerHTML='<p class="muted">Analizando…</p>';
  try{
    const res = await triage(t); const d = res.decision;
    out.innerHTML = '<div style="margin-top:14px">'+badgesFor(d)
      +'<p style="margin:10px 0 0"><b>'+d.titulo+'</b></p>'
      +'<p class="muted" style="margin:4px 0 0">'+d.razon+'</p>'
      +'<p class="muted" style="margin:4px 0 0">Acción: '+d.accionSugerida+'</p></div>';
  }catch(e){ out.innerHTML='<p class="muted">Error: '+e+'</p>'; }
}
async function correrCasos(){
  const out = document.getElementById('out');
  out.innerHTML='<p class="muted">Corriendo los 5 casos…</p>';
  let rows='';
  for(const c of CASES){
    const res = await triage(c.text); const d = res.decision;
    const dot = d.prioridad==='P0' ? '<span class="pill dot-p0">P0 → Slack</span>' : '<span class="pill dot-bk">backlog → Sheet</span>';
    rows += '<tr><td>'+c.text+'</td><td>'+dot+'<div class="muted" style="font-size:12px">'+d.severidad+' · '+d.fuente+'</div></td></tr>';
  }
  out.innerHTML = '<table style="margin-top:14px"><thead><tr><th>Bug</th><th>Decisión → ruta</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
</script>
</div></body></html>`;
}
```

- [ ] **Step 4:** `npx vitest run src/lib/demo.test.ts` → PASS + `npm run typecheck`.
- [ ] **Step 5: Commit**
```bash
git add reto-07/src/lib/demo.ts reto-07/src/lib/demo.test.ts
git commit -m "feat(reto-07): add demo page (paste bug + run 5 cases, dry-run)"
```

---

## Task 8: `index.ts` — orquestación, rutas y gate

**Files:** Create `reto-07/src/index.ts`, `reto-07/src/index.test.ts`

- [ ] **Step 1: Test que falla**
```ts
import { handleTriage, type Env } from './index';

function fakeEnv(over: Partial<Env> = {}): Env {
  return {
    AI: { run: async () => ({ response: 'no json' }) } as unknown as Ai,
    SLACK_WEBHOOK_URL: 'https://hooks/x', GOOGLE_CLIENT_ID: 'c', GOOGLE_CLIENT_SECRET: 's',
    GOOGLE_REFRESH_TOKEN: 'r', SHEETS_ID: 'SID', DEMO_TOKEN: 'secreto', ...over,
  } as Env;
}

test('dry-run por defecto: devuelve decisión + ruta sin enviar', async () => {
  const { status, json } = await handleTriage(fakeEnv(), { text: 'El botón se ve gris' }, '2026-07-16T00:00:00Z');
  expect(status).toBe(200);
  expect(json.dryRun).toBe(true);
  expect(json.route).toBe('registrar');   // reglas: cosmético → backlog
  expect(json.decision.fuente).toBe('reglas');
});
test('text vacío → 400', async () => {
  const { status } = await handleTriage(fakeEnv(), { text: '   ' }, 'now');
  expect(status).toBe(400);
});
test('envío real sin token → 403', async () => {
  const { status, json } = await handleTriage(fakeEnv(), { text: 'bug', dryRun: false }, 'now');
  expect(status).toBe(403);
  expect(json.ok).toBe(false);
});
```

- [ ] **Step 2:** `npx vitest run src/index.test.ts` → FAIL.

- [ ] **Step 3: `src/index.ts`**
```ts
import { triage, type AiRunner } from './lib/triage';
import { routeFor } from './lib/route';
import { buildSlackMessage, postSlack } from './lib/slack';
import { getAccessToken, appendRow, rowFromDecision } from './lib/sheets';
import { renderDemoPage } from './lib/demo';
import { CASES } from './cases';

export interface Env {
  AI: Ai;
  SLACK_WEBHOOK_URL: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  GOOGLE_REFRESH_TOKEN: string;
  SHEETS_ID: string;
  DEMO_TOKEN: string;
}

export async function handleTriage(
  env: Env,
  body: { text?: string; dryRun?: boolean; token?: string },
  now: string,
): Promise<{ status: number; json: any }> {
  const text = (body.text ?? '').trim();
  if (!text) return { status: 400, json: { ok: false, error: 'text requerido' } };

  const aiRunner: AiRunner = (m, i) => env.AI.run(m as any, i as any) as any;
  const decision = await triage(text, aiRunner);
  const route = routeFor(decision.prioridad);

  const dryRun = body.dryRun !== false; // default true
  if (dryRun) return { status: 200, json: { ok: true, dryRun: true, decision, route } };

  if (!env.DEMO_TOKEN || body.token !== env.DEMO_TOKEN) {
    return { status: 403, json: { ok: false, error: 'forbidden' } };
  }

  try {
    if (route === 'urgente') {
      await postSlack(env.SLACK_WEBHOOK_URL, buildSlackMessage(decision, text));
      return { status: 200, json: { ok: true, dryRun: false, decision, route, destino: 'slack' } };
    }
    const token = await getAccessToken({
      clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET, refreshToken: env.GOOGLE_REFRESH_TOKEN,
    });
    await appendRow({ sheetId: env.SHEETS_ID, accessToken: token, row: rowFromDecision(decision, now) });
    return { status: 200, json: { ok: true, dryRun: false, decision, route, destino: 'sheet' } };
  } catch (e) {
    return { status: 200, json: { ok: false, decision, route, error: String(e) } };
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response(renderDemoPage(CASES), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
    }
    if (request.method === 'POST' && url.pathname === '/triage') {
      let body: any = {};
      try { body = await request.json(); } catch { /* body vacío */ }
      const { status, json } = await handleTriage(env, body, new Date().toISOString());
      return Response.json(json, { status });
    }
    return new Response('Centinela — agente de triage de bugs. GET / para la demo.', { status: 404 });
  },
};
```

- [ ] **Step 4:** `npx vitest run src/index.test.ts` → PASS (3); luego `npm run test` (suite completa) + `npm run typecheck` limpios.
- [ ] **Step 5: Commit**
```bash
git add reto-07/src/index.ts reto-07/src/index.test.ts
git commit -m "feat(reto-07): wire orchestration (demo + /triage, dry-run + token gate)"
```

---

## Task 9: Deploy, setup (Slack + Google Sheet + OAuth) y verificación E2E

**Files:** Create `reto-07/README.md`, `reto-07/docs/evidence/`; Modify root `README.md`.

Requiere acciones del usuario; se hace acompañado.

- [ ] **Step 1: Slack Incoming Webhook.** El usuario crea una Slack app → *Incoming Webhooks* → activar → *Add New Webhook to Workspace* → elegir canal → copiar la URL (`SLACK_WEBHOOK_URL`).
- [ ] **Step 2: Google Sheet.** Crear una hoja nueva, renombrar la pestaña a **`Backlog`**, poner en A1:J1 los encabezados de `SHEET_HEADERS`. Copiar el ID de la URL (`/d/<ID>/edit`) → `SHEETS_ID`.
- [ ] **Step 3: Refresh token de Google con scope Sheets.** Reusar el cliente OAuth Desktop del reto-06. Generar un refresh token nuevo con scope `https://www.googleapis.com/auth/spreadsheets` (mismo flujo manual: auth URL con `access_type=offline&prompt=consent&redirect_uri=http://localhost`, copiar `code`, intercambiar). → `GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN`. (Guiar en vivo.)
- [ ] **Step 4: Secretos + deploy**
```bash
cd reto-07
npx wrangler secret put SLACK_WEBHOOK_URL
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put SHEETS_ID
npx wrangler secret put DEMO_TOKEN
npx wrangler deploy
```
- [ ] **Step 5: Verificación E2E real (con DEMO_TOKEN).**
  - P0 → Slack: `curl -s https://centinela.<sub>.workers.dev/triage -H 'content-type: application/json' -d '{"text":"checkout tira 500 al pagar en producción","dryRun":false,"token":"<DEMO_TOKEN>"}'` → mensaje llega a Slack.
  - backlog → Sheet: `curl ... -d '{"text":"el botón se ve gris en móvil","dryRun":false,"token":"<DEMO_TOKEN>"}'` → fila nueva en la hoja.
  - Demo pública: abrir `https://centinela.<sub>.workers.dev/` y correr los 5 casos (dry-run).
- [ ] **Step 6: Evidencia.** Capturas del mensaje en Slack + la fila en la hoja + la demo con los 5 casos → `reto-07/docs/evidence/` con un README corto.
- [ ] **Step 7: `reto-07/README.md`** — qué es, el reto, stack, la rúbrica, las 2 rutas, los 5 casos, setup (Slack/Sheet/OAuth), secretos, deploy, cómo probar (`/` demo y `/triage` con token), evidencia. Tono de los README de reto-04/05/06.
- [ ] **Step 8: Enlazar en README raíz** (fila + árbol):
```
| 07 | [Centinela — El agente que decide por ti](./reto-07) | Agente IA / Triage de bugs con decisión y ruteo (Cloudflare Worker + Workers AI → Slack / Google Sheet) |
```
```
  reto-07/     Centinela — agente de triage de bugs con IA (Cloudflare Worker + Workers AI → Slack / Google Sheet)
```
- [ ] **Step 9: Commit**
```bash
git add reto-07/README.md reto-07/docs/evidence README.md
git commit -m "docs(reto-07): README, evidence, root README link"
```

---

## Task 10: Finalización de la rama

- [ ] Suite completa una última vez: `cd reto-07 && npm run test && npm run typecheck` → verde.
- [ ] Skill **superpowers:finishing-a-development-branch** para merge de `reto-07-centinela` a `main` + push.
- [ ] Actualizar la memoria del proyecto (`vibe-coders-league-edition-2.md`) con el resumen de reto-07.

---

## Notas de verificación (spec §13)

- **Salida IA:** `extractJson` toma el primer bloque `{...}` balanceado; `buildFromParsed` valida y **deriva prioridad de los booleanos** (la IA no decide la ruta directamente). Fallback por reglas cubierto por tests.
- **Scope Sheets:** refresh token nuevo con `spreadsheets` (el de reto-06 era `gmail.send`).
- **append:** `range=Backlog!A1` (encode del `!`), `valueInputOption=USER_ENTERED`; la pestaña debe llamarse `Backlog`.
- **Anti-spam:** demo pública siempre `dryRun:true`; envío real exige `DEMO_TOKEN`.
