# Pulso · el reporte que se arma y se envía solo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un Cloudflare Worker con Cron Trigger que cada viernes 5PM Bogotá recolecta tráfico de las landings de la liga (Cloudflare GraphQL Analytics API) + conversiones (Supabase), genera un resumen ejecutivo con Workers AI y lo envía por Gmail API (OAuth/HTTPS) a Roberto.

**Architecture:** Worker TypeScript puro, sin framework. `index.ts` orquesta; cada `lib/*.ts` tiene una responsabilidad única y recibe `fetch`/deps por parámetro para ser testeable en aislamiento. Fuentes aisladas con degradación elegante: si una falla, el correo igual sale. IA con fallback determinista por reglas.

**Tech Stack:** Cloudflare Workers (Wrangler), TypeScript strict, Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`), Vitest. Gate de tipos: `tsc --noEmit` (NO `astro check` — esto no es Astro).

**Spec:** `reto-06/docs/superpowers/specs/2026-07-15-pulso-liga-reporte-design.md`

**Rutas:** todo bajo `reto-06/`. Comandos `npm` se ejecutan desde `reto-06/`.

---

## File Structure

```
reto-06/
  package.json          # scripts: dev, deploy, typecheck, test
  tsconfig.json         # strict, sin base de astro
  vitest.config.ts
  wrangler.toml         # name, main, [ai], [vars], [triggers] crons
  .dev.vars.example     # secretos con placeholders
  .gitignore            # .dev.vars, node_modules, .wrangler
  src/
    index.ts            # Env, runReport(), scheduled(), fetch(); checkTrigger()
    config.ts           # LANDINGS, TABLES, ALERTS, TIMEZONE (no-secreto)
    types.ts            # interfaces del dominio
    lib/
      dates.ts          # computeWindows(now), formatRange()
      cloudflare.ts     # fetchTraffic() → GraphQL Analytics
      supabase.ts       # countRows() → PostgREST count
      report.ts         # buildReport() → modelo determinista
      summarize.ts      # summarize() + ruleSummary() (fallback)
      render.ts         # renderHtml/renderText/buildMime/base64UrlEncode
      gmail.ts          # getAccessToken/sendRaw/sendEmail (1 retry)
    lib/*.test.ts
  docs/
    superpowers/{specs,plans}/
    evidence/           # screenshot del correo (se agrega en verificación)
  README.md
```

---

## Task 1: Scaffold del proyecto

**Files:**
- Create: `reto-06/package.json`, `reto-06/tsconfig.json`, `reto-06/vitest.config.ts`, `reto-06/wrangler.toml`, `reto-06/.dev.vars.example`, `reto-06/.gitignore`, `reto-06/src/config.ts`, `reto-06/src/types.ts`

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "pulso",
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

- [ ] **Step 2: Crear `tsconfig.json`** (sin base de astro)

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

- [ ] **Step 3: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 4: Crear `wrangler.toml`**

```toml
name = "pulso"
main = "src/index.ts"
compatibility_date = "2025-05-21"
compatibility_flags = ["nodejs_compat"]

[ai]
binding = "AI"

[vars]
CF_ACCOUNT_ID = "51932bfebff61c30c7a32b96834796c1"
REPORT_TO = "robertzu43@gmail.com"

[triggers]
crons = ["0 22 * * 5"]
```

- [ ] **Step 5: Crear `.dev.vars.example`**

```
CF_ANALYTICS_TOKEN=cf_analytics_readonly_token
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxx
GMAIL_CLIENT_ID=xxxx.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=xxxx
GMAIL_REFRESH_TOKEN=1//xxxx
TRIGGER_TOKEN=cadena-larga-al-azar
```

- [ ] **Step 6: Crear `.gitignore`**

```
node_modules/
.dev.vars
.wrangler/
dist/
```

- [ ] **Step 7: Crear `src/config.ts`**

```ts
// Config no-secreta. Los scriptName se confirman contra `wrangler deployments list` / dashboard.
export const LANDINGS = ['parla', 'altura', 'radar-digital', 'golazo'] as const;
export const TABLES = { leads: 'leads', preorders: 'preorders' } as const;
export const ALERTS = { errorRateAlert: 0.05, trafficDropAlert: -30 } as const;
export const TIMEZONE = 'America/Bogota';
```

- [ ] **Step 8: Crear `src/types.ts`**

```ts
export interface Window { startISO: string; endISO: string; }
export interface Windows { current: Window; previous: Window; }

export interface LandingTraffic {
  scriptName: string;
  requests: number;
  errors: number;
  subrequests: number;
  cpuP50: number;
  cpuP99: number;
}

export interface Conversions { leads: number; preorders: number; }

export interface LandingReport {
  scriptName: string;
  requests: number;
  errors: number;
  errorRate: number;        // 0..1
  cpuP50: number;
  requestsPrev: number;
  deltaPct: number | null;  // null si prev === 0
}

export interface ConversionReport {
  leads: number; leadsPrev: number; leadsDeltaPct: number | null;
  preorders: number; preordersPrev: number; preordersDeltaPct: number | null;
}

export interface ReportModel {
  window: Windows;
  landings: LandingReport[];
  totalRequests: number;
  totalErrors: number;
  topLanding: string | null;
  requestsDeltaPct: number | null;
  conversions: ConversionReport;
  alerts: string[];
  degraded: { traffic: boolean; conversions: boolean };
}
```

- [ ] **Step 9: Instalar y verificar typecheck**

Run: `cd reto-06 && npm install && npm run typecheck`
Expected: sin errores (no hay `.ts` con lógica todavía salvo tipos/config).

- [ ] **Step 10: Commit**

```bash
git add reto-06/package.json reto-06/tsconfig.json reto-06/vitest.config.ts reto-06/wrangler.toml reto-06/.dev.vars.example reto-06/.gitignore reto-06/src/config.ts reto-06/src/types.ts reto-06/package-lock.json
git commit -m "chore(reto-06): scaffold pulso worker (config, types, wrangler cron)"
```

---

## Task 2: `dates.ts` — ventanas 7d actual + previa

**Files:**
- Create: `reto-06/src/lib/dates.ts`, `reto-06/src/lib/dates.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { computeWindows, formatRange } from './dates';

test('computeWindows produce ventana actual de 7d y previa contigua de 7d', () => {
  const now = Date.parse('2026-07-17T22:00:00.000Z'); // viernes 5pm Bogota
  const w = computeWindows(now);
  expect(w.current.endISO).toBe('2026-07-17T22:00:00.000Z');
  expect(w.current.startISO).toBe('2026-07-10T22:00:00.000Z');
  expect(w.previous.endISO).toBe('2026-07-10T22:00:00.000Z');
  expect(w.previous.startISO).toBe('2026-07-03T22:00:00.000Z');
});

test('formatRange muestra YYYY-MM-DD → YYYY-MM-DD', () => {
  expect(formatRange({ startISO: '2026-07-10T22:00:00.000Z', endISO: '2026-07-17T22:00:00.000Z' }))
    .toBe('2026-07-10 → 2026-07-17');
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `cd reto-06 && npx vitest run src/lib/dates.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `dates.ts`**

```ts
import type { Windows, Window } from '../types';

const DAY = 86_400_000;

export function computeWindows(now: number): Windows {
  const end = new Date(now);
  const currentStart = new Date(now - 7 * DAY);
  const prevStart = new Date(now - 14 * DAY);
  return {
    current: { startISO: currentStart.toISOString(), endISO: end.toISOString() },
    previous: { startISO: prevStart.toISOString(), endISO: currentStart.toISOString() },
  };
}

export function formatRange(w: Window): string {
  return `${w.startISO.slice(0, 10)} → ${w.endISO.slice(0, 10)}`;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `cd reto-06 && npx vitest run src/lib/dates.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add reto-06/src/lib/dates.ts reto-06/src/lib/dates.test.ts
git commit -m "feat(reto-06): add date-window helpers (7d current + previous)"
```

---

## Task 3: `cloudflare.ts` — cliente GraphQL Analytics

**Files:**
- Create: `reto-06/src/lib/cloudflare.ts`, `reto-06/src/lib/cloudflare.test.ts`

Nota: los tests mockean `fetch`; la exactitud de la query GraphQL se valida en la verificación E2E (Task 10). El parseo y el manejo de errores sí se testean aquí.

- [ ] **Step 1: Escribir el test que falla**

```ts
import { fetchTraffic } from './cloudflare';

const sample = {
  data: { viewer: { accounts: [ { workersInvocationsAdaptiveGroups: [
    { dimensions: { scriptName: 'parla' }, sum: { requests: 100, errors: 2, subrequests: 5 }, quantiles: { cpuTimeP50: 3, cpuTimeP99: 12 } },
    { dimensions: { scriptName: 'golazo' }, sum: { requests: 50, errors: 0, subrequests: 1 }, quantiles: { cpuTimeP50: 2, cpuTimeP99: 9 } },
  ] } ] } },
};

function mockFetch(body: unknown, ok = true, status = 200): typeof fetch {
  return (async () => ({ ok, status, json: async () => body } as Response)) as unknown as typeof fetch;
}

test('fetchTraffic parsea grupos a LandingTraffic[]', async () => {
  const rows = await fetchTraffic({
    accountId: 'acc', token: 'tok', scripts: ['parla', 'golazo'],
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch(sample),
  });
  expect(rows).toEqual([
    { scriptName: 'parla', requests: 100, errors: 2, subrequests: 5, cpuP50: 3, cpuP99: 12 },
    { scriptName: 'golazo', requests: 50, errors: 0, subrequests: 1, cpuP50: 2, cpuP99: 9 },
  ]);
});

test('fetchTraffic lanza en HTTP no-ok', async () => {
  await expect(fetchTraffic({
    accountId: 'a', token: 't', scripts: [], window: { startISO: 'a', endISO: 'b' },
    fetchImpl: mockFetch({}, false, 403),
  })).rejects.toThrow('403');
});

test('fetchTraffic lanza si el payload trae errors', async () => {
  await expect(fetchTraffic({
    accountId: 'a', token: 't', scripts: [], window: { startISO: 'a', endISO: 'b' },
    fetchImpl: mockFetch({ errors: [{ message: 'bad token' }] }),
  })).rejects.toThrow(/bad token/);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `cd reto-06 && npx vitest run src/lib/cloudflare.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `cloudflare.ts`**

```ts
import type { LandingTraffic, Window } from '../types';

const ENDPOINT = 'https://api.cloudflare.com/client/v4/graphql';

const QUERY = `query($tag: string!, $start: Time!, $end: Time!, $scripts: [string!]!) {
  viewer { accounts(filter: { accountTag: $tag }) {
    workersInvocationsAdaptiveGroups(limit: 100, filter: { datetime_geq: $start, datetime_leq: $end, scriptName_in: $scripts }) {
      dimensions { scriptName }
      sum { requests errors subrequests }
      quantiles { cpuTimeP50 cpuTimeP99 }
    }
  } }
}`;

export async function fetchTraffic(opts: {
  accountId: string;
  token: string;
  scripts: readonly string[];
  window: Window;
  fetchImpl?: typeof fetch;
}): Promise<LandingTraffic[]> {
  const f = opts.fetchImpl ?? fetch;
  const res = await f(ENDPOINT, {
    method: 'POST',
    headers: { Authorization: `Bearer ${opts.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: QUERY,
      variables: { tag: opts.accountId, start: opts.window.startISO, end: opts.window.endISO, scripts: opts.scripts },
    }),
  });
  if (!res.ok) throw new Error(`Cloudflare GraphQL HTTP ${res.status}`);
  const json = (await res.json()) as any;
  if (json.errors?.length) throw new Error(`Cloudflare GraphQL: ${JSON.stringify(json.errors)}`);
  const groups = json.data?.viewer?.accounts?.[0]?.workersInvocationsAdaptiveGroups ?? [];
  return groups.map((g: any): LandingTraffic => ({
    scriptName: g.dimensions.scriptName,
    requests: g.sum?.requests ?? 0,
    errors: g.sum?.errors ?? 0,
    subrequests: g.sum?.subrequests ?? 0,
    cpuP50: g.quantiles?.cpuTimeP50 ?? 0,
    cpuP99: g.quantiles?.cpuTimeP99 ?? 0,
  }));
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `cd reto-06 && npx vitest run src/lib/cloudflare.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add reto-06/src/lib/cloudflare.ts reto-06/src/lib/cloudflare.test.ts
git commit -m "feat(reto-06): add Cloudflare GraphQL analytics client"
```

---

## Task 4: `supabase.ts` — conteo de filas por ventana

**Files:**
- Create: `reto-06/src/lib/supabase.ts`, `reto-06/src/lib/supabase.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { countRows } from './supabase';

function mockFetch(contentRange: string | null, ok = true, status = 206): typeof fetch {
  return (async () => ({
    ok, status,
    headers: { get: (h: string) => (h.toLowerCase() === 'content-range' ? contentRange : null) },
  } as unknown as Response)) as unknown as typeof fetch;
}

test('countRows parsea el total del header content-range', async () => {
  const n = await countRows({
    url: 'https://x.supabase.co', secretKey: 'k', table: 'leads',
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch('0-6/7'),
  });
  expect(n).toBe(7);
});

test('countRows devuelve 0 cuando no hay filas', async () => {
  const n = await countRows({
    url: 'https://x.supabase.co', secretKey: 'k', table: 'leads',
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch('*/0'),
  });
  expect(n).toBe(0);
});

test('countRows lanza en HTTP de error', async () => {
  await expect(countRows({
    url: 'https://x.supabase.co', secretKey: 'k', table: 'leads',
    window: { startISO: 'a', endISO: 'b' }, fetchImpl: mockFetch(null, false, 401),
  })).rejects.toThrow('401');
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `cd reto-06 && npx vitest run src/lib/supabase.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `supabase.ts`**

```ts
import type { Window } from '../types';

// Usa la SECRET KEY (service_role) server-side: la RLS de las tablas es insert-only
// y bloquea lecturas anónimas. Cuenta filas creadas dentro de la ventana.
export async function countRows(opts: {
  url: string;
  secretKey: string;
  table: string;
  window: Window;
  createdColumn?: string; // default 'created_at'
  fetchImpl?: typeof fetch;
}): Promise<number> {
  const f = opts.fetchImpl ?? fetch;
  const col = opts.createdColumn ?? 'created_at';
  const q = `${opts.url}/rest/v1/${opts.table}` +
    `?select=id&${col}=gte.${encodeURIComponent(opts.window.startISO)}` +
    `&${col}=lt.${encodeURIComponent(opts.window.endISO)}`;
  const res = await f(q, {
    method: 'GET',
    headers: {
      apikey: opts.secretKey,
      Authorization: `Bearer ${opts.secretKey}`,
      Prefer: 'count=exact',
      Range: '0-0',
    },
  });
  if (!res.ok && res.status !== 206) throw new Error(`Supabase HTTP ${res.status}`);
  const cr = res.headers.get('content-range'); // "0-6/7" o "*/0"
  const total = cr?.split('/')?.[1];
  return total ? parseInt(total, 10) : 0;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `cd reto-06 && npx vitest run src/lib/supabase.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add reto-06/src/lib/supabase.ts reto-06/src/lib/supabase.test.ts
git commit -m "feat(reto-06): add Supabase row-count client (service_role, windowed)"
```

---

## Task 5: `report.ts` — modelo determinista

**Files:**
- Create: `reto-06/src/lib/report.ts`, `reto-06/src/lib/report.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { buildReport } from './report';
import type { Windows } from '../types';

const win: Windows = {
  current: { startISO: 'c0', endISO: 'c1' },
  previous: { startISO: 'p0', endISO: 'p1' },
};

test('buildReport calcula totales, topLanding, deltas y alertas', () => {
  const m = buildReport({
    window: win,
    currentTraffic: [
      { scriptName: 'parla', requests: 200, errors: 20, subrequests: 0, cpuP50: 3, cpuP99: 9 }, // errorRate 10% > 5%
      { scriptName: 'golazo', requests: 50, errors: 0, subrequests: 0, cpuP50: 2, cpuP99: 8 },
    ],
    previousTraffic: [
      { scriptName: 'parla', requests: 100, errors: 1, subrequests: 0, cpuP50: 3, cpuP99: 9 },
      { scriptName: 'golazo', requests: 200, errors: 0, subrequests: 0, cpuP50: 2, cpuP99: 8 }, // caída -75% < -30%
    ],
    currentConversions: { leads: 4, preorders: 2 },
    previousConversions: { leads: 2, preorders: 0 },
    degraded: { traffic: false, conversions: false },
  });

  expect(m.totalRequests).toBe(250);
  expect(m.totalErrors).toBe(20);
  expect(m.topLanding).toBe('parla');
  expect(m.requestsDeltaPct).toBeCloseTo(-16.666, 1); // 250 vs 300
  const parla = m.landings.find(l => l.scriptName === 'parla')!;
  expect(parla.deltaPct).toBe(100); // 200 vs 100
  expect(m.conversions.leadsDeltaPct).toBe(100);
  expect(m.conversions.preordersDeltaPct).toBeNull(); // prev 0
  expect(m.alerts.some(a => a.includes('parla') && a.includes('error'))).toBe(true);
  expect(m.alerts.some(a => a.includes('golazo'))).toBe(true);
});

test('buildReport con listas vacías no rompe', () => {
  const m = buildReport({
    window: win, currentTraffic: [], previousTraffic: [],
    currentConversions: { leads: 0, preorders: 0 },
    previousConversions: { leads: 0, preorders: 0 },
    degraded: { traffic: true, conversions: false },
  });
  expect(m.totalRequests).toBe(0);
  expect(m.topLanding).toBeNull();
  expect(m.requestsDeltaPct).toBeNull();
  expect(m.degraded.traffic).toBe(true);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `cd reto-06 && npx vitest run src/lib/report.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `report.ts`**

```ts
import type {
  LandingTraffic, LandingReport, ReportModel, Windows, Conversions,
} from '../types';

function deltaPct(current: number, prev: number): number | null {
  if (prev === 0) return null;
  return ((current - prev) / prev) * 100;
}

export function buildReport(input: {
  window: Windows;
  currentTraffic: LandingTraffic[];
  previousTraffic: LandingTraffic[];
  currentConversions: Conversions;
  previousConversions: Conversions;
  degraded: { traffic: boolean; conversions: boolean };
  errorRateAlert?: number;   // default 0.05
  trafficDropAlert?: number; // default -30
}): ReportModel {
  const errThreshold = input.errorRateAlert ?? 0.05;
  const dropThreshold = input.trafficDropAlert ?? -30;
  const prevByName = new Map(input.previousTraffic.map((t) => [t.scriptName, t]));

  const landings: LandingReport[] = input.currentTraffic.map((t) => {
    const requestsPrev = prevByName.get(t.scriptName)?.requests ?? 0;
    const errorRate = t.requests > 0 ? t.errors / t.requests : 0;
    return {
      scriptName: t.scriptName,
      requests: t.requests,
      errors: t.errors,
      errorRate,
      cpuP50: t.cpuP50,
      requestsPrev,
      deltaPct: deltaPct(t.requests, requestsPrev),
    };
  });

  const totalRequests = landings.reduce((a, l) => a + l.requests, 0);
  const totalErrors = landings.reduce((a, l) => a + l.errors, 0);
  const totalPrev = input.previousTraffic.reduce((a, l) => a + l.requests, 0);
  const topLanding = landings.length
    ? landings.reduce((a, b) => (b.requests > a.requests ? b : a)).scriptName
    : null;

  const alerts: string[] = [];
  for (const l of landings) {
    if (l.errorRate > errThreshold) {
      alerts.push(`${l.scriptName}: tasa de error ${(l.errorRate * 100).toFixed(1)}%`);
    }
    if (l.deltaPct !== null && l.deltaPct < dropThreshold) {
      alerts.push(`${l.scriptName}: tráfico ${l.deltaPct.toFixed(0)}% vs. semana previa`);
    }
  }

  return {
    window: input.window,
    landings,
    totalRequests,
    totalErrors,
    topLanding,
    requestsDeltaPct: deltaPct(totalRequests, totalPrev),
    conversions: {
      leads: input.currentConversions.leads,
      leadsPrev: input.previousConversions.leads,
      leadsDeltaPct: deltaPct(input.currentConversions.leads, input.previousConversions.leads),
      preorders: input.currentConversions.preorders,
      preordersPrev: input.previousConversions.preorders,
      preordersDeltaPct: deltaPct(input.currentConversions.preorders, input.previousConversions.preorders),
    },
    alerts,
    degraded: input.degraded,
  };
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `cd reto-06 && npx vitest run src/lib/report.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add reto-06/src/lib/report.ts reto-06/src/lib/report.test.ts
git commit -m "feat(reto-06): add deterministic report model builder"
```

---

## Task 6: `summarize.ts` — Workers AI + fallback por reglas

**Files:**
- Create: `reto-06/src/lib/summarize.ts`, `reto-06/src/lib/summarize.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { summarize, ruleSummary } from './summarize';
import type { ReportModel } from '../types';

const model: ReportModel = {
  window: { current: { startISO: 'c0', endISO: 'c1' }, previous: { startISO: 'p0', endISO: 'p1' } },
  landings: [{ scriptName: 'parla', requests: 200, errors: 0, errorRate: 0, cpuP50: 3, requestsPrev: 100, deltaPct: 100 }],
  totalRequests: 200, totalErrors: 0, topLanding: 'parla', requestsDeltaPct: 100,
  conversions: { leads: 4, leadsPrev: 2, leadsDeltaPct: 100, preorders: 1, preordersPrev: 0, preordersDeltaPct: null },
  alerts: [], degraded: { traffic: false, conversions: false },
};

test('ruleSummary incluye totales y top landing', () => {
  const s = ruleSummary(model);
  expect(s).toContain('200');
  expect(s).toContain('parla');
  expect(s).toContain('4 leads');
});

test('summarize sin AI usa el fallback por reglas', async () => {
  const s = await summarize(model);
  expect(s).toContain('parla');
});

test('summarize cae al fallback si la AI lanza', async () => {
  const ai = async () => { throw new Error('AI down'); };
  const s = await summarize(model, ai);
  expect(s).toContain('parla'); // fallback determinista
});

test('summarize cae al fallback si la AI devuelve vacío', async () => {
  const ai = async () => ({ response: '   ' });
  const s = await summarize(model, ai);
  expect(s).toContain('parla');
});

test('summarize usa el texto de la AI cuando responde', async () => {
  const ai = async () => ({ response: 'Resumen IA de la semana.' });
  const s = await summarize(model, ai);
  expect(s).toBe('Resumen IA de la semana.');
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `cd reto-06 && npx vitest run src/lib/summarize.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `summarize.ts`**

```ts
import type { ReportModel } from '../types';

export type AiRunner = (model: string, inputs: unknown) => Promise<{ response?: string }>;

const MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

export function ruleSummary(r: ReportModel): string {
  const parts: string[] = [];
  const delta = r.requestsDeltaPct;
  parts.push(
    `La liga recibió ${r.totalRequests.toLocaleString('es')} requests esta semana` +
      (delta !== null ? ` (${delta >= 0 ? '+' : ''}${delta.toFixed(0)}% vs. la anterior).` : '.'),
  );
  if (r.topLanding) parts.push(`La landing con más tráfico fue ${r.topLanding}.`);
  parts.push(`Conversiones: ${r.conversions.leads} leads y ${r.conversions.preorders} pre-órdenes.`);
  if (r.alerts.length) parts.push(`Alertas: ${r.alerts.join('; ')}.`);
  return parts.join(' ');
}

export function buildPrompt(r: ReportModel): string {
  return JSON.stringify({
    totalRequests: r.totalRequests,
    requestsDeltaPct: r.requestsDeltaPct,
    topLanding: r.topLanding,
    landings: r.landings.map((l) => ({
      name: l.scriptName, requests: l.requests,
      errorRatePct: +(l.errorRate * 100).toFixed(1), deltaPct: l.deltaPct,
    })),
    conversions: r.conversions,
    alerts: r.alerts,
  });
}

export async function summarize(r: ReportModel, ai?: AiRunner): Promise<string> {
  if (!ai) return ruleSummary(r);
  try {
    const out = await ai(MODEL, {
      messages: [
        {
          role: 'system',
          content:
            'Eres un analista de producto. Resume en 3-4 frases ejecutivas en español, ' +
            'tono claro y directo. Usa SOLO los números provistos; no inventes cifras.',
        },
        { role: 'user', content: buildPrompt(r) },
      ],
      temperature: 0.2,
    });
    const text = (out?.response ?? '').trim();
    return text.length > 0 ? text : ruleSummary(r);
  } catch {
    return ruleSummary(r);
  }
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `cd reto-06 && npx vitest run src/lib/summarize.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add reto-06/src/lib/summarize.ts reto-06/src/lib/summarize.test.ts
git commit -m "feat(reto-06): add Workers AI summary with rule-based fallback"
```

---

## Task 7: `render.ts` — email HTML/texto + MIME base64url

**Files:**
- Create: `reto-06/src/lib/render.ts`, `reto-06/src/lib/render.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { base64UrlEncode, buildMime, renderHtml, renderText } from './render';
import type { ReportModel } from '../types';

const model: ReportModel = {
  window: { current: { startISO: '2026-07-10T22:00:00.000Z', endISO: '2026-07-17T22:00:00.000Z' }, previous: { startISO: 'p0', endISO: 'p1' } },
  landings: [{ scriptName: 'parla', requests: 200, errors: 2, errorRate: 0.01, cpuP50: 3, requestsPrev: 100, deltaPct: 100 }],
  totalRequests: 200, totalErrors: 2, topLanding: 'parla', requestsDeltaPct: 100,
  conversions: { leads: 4, leadsPrev: 2, leadsDeltaPct: 100, preorders: 1, preordersPrev: 0, preordersDeltaPct: null },
  alerts: [], degraded: { traffic: false, conversions: false },
};

test('base64UrlEncode: sin +, /, ni =, y decodifica de vuelta', () => {
  const s = base64UrlEncode('Hola, liga ✅');
  expect(s).not.toMatch(/[+/=]/);
  const restored = Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
  expect(restored).toBe('Hola, liga ✅');
});

test('renderHtml incluye métricas clave y el resumen', () => {
  const html = renderHtml(model, 'Resumen ejecutivo.');
  expect(html).toContain('parla');
  expect(html).toContain('200');
  expect(html).toContain('Resumen ejecutivo.');
});

test('renderText es texto plano con las métricas', () => {
  const txt = renderText(model, 'Resumen ejecutivo.');
  expect(txt).toContain('parla');
  expect(txt).toContain('Resumen ejecutivo.');
  expect(txt).not.toContain('<');
});

test('buildMime arma multipart con ambas partes y subject codificado', () => {
  const mime = buildMime({ to: 'a@b.com', subject: 'Pulso ✅', html: '<b>h</b>', text: 't' });
  expect(mime).toContain('To: a@b.com');
  expect(mime).toContain('multipart/alternative');
  expect(mime).toContain('text/plain');
  expect(mime).toContain('text/html');
  expect(mime).toContain('=?UTF-8?B?'); // subject RFC2047
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `cd reto-06 && npx vitest run src/lib/render.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `render.ts`**

```ts
import type { ReportModel } from '../types';
import { formatRange } from './dates';

const BOUNDARY = 'pulso_boundary_a1b2c3d4e5';

export function base64UrlEncode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function encodeSubject(subject: string): string {
  // RFC 2047 para asunto con caracteres no-ASCII
  return `=?UTF-8?B?${b64(subject)}?=`;
}

function fmtDelta(d: number | null): string {
  if (d === null) return '—';
  return `${d >= 0 ? '+' : ''}${d.toFixed(0)}%`;
}

export function renderText(r: ReportModel, summary: string): string {
  const lines: string[] = [];
  lines.push(`PULSO DE LA LIGA · ${formatRange(r.window.current)}`);
  lines.push('');
  lines.push(summary);
  lines.push('');
  lines.push(`Tráfico total: ${r.totalRequests} requests (${fmtDelta(r.requestsDeltaPct)}), ${r.totalErrors} errores.`);
  if (r.degraded.traffic) lines.push('(datos de tráfico no disponibles esta semana)');
  for (const l of r.landings) {
    lines.push(`- ${l.scriptName}: ${l.requests} req (${fmtDelta(l.deltaPct)}), error ${(l.errorRate * 100).toFixed(1)}%`);
  }
  lines.push('');
  lines.push(`Conversiones: ${r.conversions.leads} leads (${fmtDelta(r.conversions.leadsDeltaPct)}), ${r.conversions.preorders} pre-órdenes (${fmtDelta(r.conversions.preordersDeltaPct)}).`);
  if (r.degraded.conversions) lines.push('(datos de conversiones no disponibles esta semana)');
  if (r.alerts.length) { lines.push(''); lines.push('Alertas:'); r.alerts.forEach((a) => lines.push(`- ${a}`)); }
  return lines.join('\n');
}

export function renderHtml(r: ReportModel, summary: string): string {
  const rows = r.landings
    .map(
      (l) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${l.scriptName}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${l.requests}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${fmtDelta(l.deltaPct)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${(l.errorRate * 100).toFixed(1)}%</td>
      </tr>`,
    )
    .join('');
  const alerts = r.alerts.length
    ? `<ul style="color:#b00">${r.alerts.map((a) => `<li>${a}</li>`).join('')}</ul>`
    : '';
  return `<!doctype html><html><body style="font-family:system-ui,Arial,sans-serif;color:#111;max-width:640px;margin:0 auto">
  <h1 style="font-size:20px">Pulso de la liga</h1>
  <p style="color:#666;margin-top:-8px">${formatRange(r.window.current)}</p>
  <p style="font-size:15px;line-height:1.5">${summary}</p>
  <h2 style="font-size:15px">Tráfico por landing</h2>
  <table style="border-collapse:collapse;width:100%;font-size:14px">
    <thead><tr>
      <th style="text-align:left;padding:6px 10px">Landing</th>
      <th style="text-align:right;padding:6px 10px">Requests</th>
      <th style="text-align:right;padding:6px 10px">WoW</th>
      <th style="text-align:right;padding:6px 10px">Error</th>
    </tr></thead>
    <tbody>${rows || '<tr><td colspan="4" style="padding:10px;color:#999">Sin datos de tráfico</td></tr>'}</tbody>
  </table>
  <p style="font-size:14px">Total: <b>${r.totalRequests}</b> requests (${fmtDelta(r.requestsDeltaPct)}) · ${r.totalErrors} errores</p>
  <h2 style="font-size:15px">Conversiones</h2>
  <p style="font-size:14px">${r.conversions.leads} leads (${fmtDelta(r.conversions.leadsDeltaPct)}) · ${r.conversions.preorders} pre-órdenes (${fmtDelta(r.conversions.preordersDeltaPct)})</p>
  ${alerts}
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0">
  <p style="color:#999;font-size:12px">Generado automáticamente por Pulso · reto-06 · Vibe Coders League</p>
  </body></html>`;
}

export function buildMime(opts: { to: string; subject: string; html: string; text: string }): string {
  return [
    `To: ${opts.to}`,
    `Subject: ${encodeSubject(opts.subject)}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${BOUNDARY}"`,
    '',
    `--${BOUNDARY}`,
    'Content-Type: text/plain; charset="UTF-8"',
    '',
    opts.text,
    '',
    `--${BOUNDARY}`,
    'Content-Type: text/html; charset="UTF-8"',
    '',
    opts.html,
    '',
    `--${BOUNDARY}--`,
    '',
  ].join('\r\n');
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `cd reto-06 && npx vitest run src/lib/render.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add reto-06/src/lib/render.ts reto-06/src/lib/render.test.ts
git commit -m "feat(reto-06): add email HTML/text rendering + base64url MIME"
```

---

## Task 8: `gmail.ts` — OAuth token + envío con 1 retry

**Files:**
- Create: `reto-06/src/lib/gmail.ts`, `reto-06/src/lib/gmail.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
import { getAccessToken, sendEmail } from './gmail';

function jsonRes(body: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => body } as unknown as Response;
}

test('getAccessToken devuelve el access_token', async () => {
  const f = (async () => jsonRes({ access_token: 'ya29.abc' })) as unknown as typeof fetch;
  expect(await getAccessToken({ clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl: f })).toBe('ya29.abc');
});

test('getAccessToken lanza si no hay token', async () => {
  const f = (async () => jsonRes({}, false, 400)) as unknown as typeof fetch;
  await expect(getAccessToken({ clientId: 'c', clientSecret: 's', refreshToken: 'r', fetchImpl: f }))
    .rejects.toThrow();
});

test('sendEmail reintenta una vez y luego tiene éxito', async () => {
  let sendCalls = 0;
  const f = (async (url: string) => {
    if (url.includes('oauth2')) return jsonRes({ access_token: 't' });
    sendCalls++;
    if (sendCalls === 1) return jsonRes({}, false, 500); // primer intento falla
    return jsonRes({ id: 'msg1' }); // segundo pasa
  }) as unknown as typeof fetch;

  await sendEmail({ clientId: 'c', clientSecret: 's', refreshToken: 'r', rawBase64Url: 'RAW', fetchImpl: f });
  expect(sendCalls).toBe(2);
});

test('sendEmail lanza si ambos intentos fallan', async () => {
  const f = (async (url: string) => {
    if (url.includes('oauth2')) return jsonRes({ access_token: 't' });
    return jsonRes({}, false, 500);
  }) as unknown as typeof fetch;
  await expect(sendEmail({ clientId: 'c', clientSecret: 's', refreshToken: 'r', rawBase64Url: 'RAW', fetchImpl: f }))
    .rejects.toThrow();
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `cd reto-06 && npx vitest run src/lib/gmail.test.ts`
Expected: FAIL — módulo no existe.

- [ ] **Step 3: Implementar `gmail.ts`**

```ts
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

export async function getAccessToken(opts: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  fetchImpl?: typeof fetch;
}): Promise<string> {
  const f = opts.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    refresh_token: opts.refreshToken,
    grant_type: 'refresh_token',
  });
  const res = await f(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) throw new Error(`OAuth token HTTP ${res.status}`);
  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('OAuth: sin access_token');
  return json.access_token;
}

async function sendRaw(accessToken: string, rawBase64Url: string, f: typeof fetch): Promise<void> {
  const res = await f(SEND_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: rawBase64Url }),
  });
  if (!res.ok) throw new Error(`Gmail send HTTP ${res.status}`);
}

export async function sendEmail(opts: {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  rawBase64Url: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const f = opts.fetchImpl ?? fetch;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const token = await getAccessToken(opts);
      await sendRaw(token, opts.rawBase64Url, f);
      return;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}
```

- [ ] **Step 4: Ejecutar y ver que pasa**

Run: `cd reto-06 && npx vitest run src/lib/gmail.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add reto-06/src/lib/gmail.ts reto-06/src/lib/gmail.test.ts
git commit -m "feat(reto-06): add Gmail API OAuth token + send with one retry"
```

---

## Task 9: `index.ts` — orquestación, scheduled y fetch

**Files:**
- Create: `reto-06/src/index.ts`, `reto-06/src/index.test.ts`

Nota: `runReport()` (integración de las 3 APIs) se verifica E2E en Task 10. Aquí testeamos la función pura `checkTrigger()` (guard del endpoint manual).

- [ ] **Step 1: Escribir el test que falla**

```ts
import { checkTrigger } from './index';

test('checkTrigger acepta el token por query param', () => {
  const url = new URL('https://x/__run?token=secreto');
  expect(checkTrigger(url, new Headers(), 'secreto')).toBe(true);
});

test('checkTrigger acepta el token por header', () => {
  const url = new URL('https://x/__run');
  expect(checkTrigger(url, new Headers({ 'x-trigger-token': 'secreto' }), 'secreto')).toBe(true);
});

test('checkTrigger rechaza token incorrecto o ausente', () => {
  const url = new URL('https://x/__run');
  expect(checkTrigger(url, new Headers(), 'secreto')).toBe(false);
  expect(checkTrigger(new URL('https://x/__run?token=malo'), new Headers(), 'secreto')).toBe(false);
});
```

- [ ] **Step 2: Ejecutar y ver que falla**

Run: `cd reto-06 && npx vitest run src/index.test.ts`
Expected: FAIL — `checkTrigger` no existe.

- [ ] **Step 3: Implementar `index.ts`**

```ts
import { computeWindows, formatRange } from './lib/dates';
import { fetchTraffic } from './lib/cloudflare';
import { countRows } from './lib/supabase';
import { buildReport } from './lib/report';
import { summarize } from './lib/summarize';
import { renderHtml, renderText, buildMime, base64UrlEncode } from './lib/render';
import { sendEmail } from './lib/gmail';
import { LANDINGS, TABLES, ALERTS } from './config';
import type { Conversions, LandingTraffic } from './types';

export interface Env {
  AI: Ai;
  CF_ACCOUNT_ID: string;
  REPORT_TO: string;
  CF_ANALYTICS_TOKEN: string;
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  GMAIL_CLIENT_ID: string;
  GMAIL_CLIENT_SECRET: string;
  GMAIL_REFRESH_TOKEN: string;
  TRIGGER_TOKEN: string;
}

export function checkTrigger(url: URL, headers: Headers, expected: string): boolean {
  const token = url.searchParams.get('token') ?? headers.get('x-trigger-token');
  return !!expected && token === expected;
}

export async function runReport(env: Env, now: number): Promise<{ subject: string; summary: string }> {
  const windows = computeWindows(now);

  // Fuente 1: tráfico (aislada; degrada si falla)
  let currentTraffic: LandingTraffic[] = [];
  let previousTraffic: LandingTraffic[] = [];
  let degradedTraffic = false;
  try {
    const base = { accountId: env.CF_ACCOUNT_ID, token: env.CF_ANALYTICS_TOKEN, scripts: LANDINGS as unknown as string[] };
    currentTraffic = await fetchTraffic({ ...base, window: windows.current });
    previousTraffic = await fetchTraffic({ ...base, window: windows.previous });
  } catch (e) {
    console.error('traffic error', e);
    degradedTraffic = true;
  }

  // Fuente 2: conversiones (aislada; degrada si falla)
  let currentConversions: Conversions = { leads: 0, preorders: 0 };
  let previousConversions: Conversions = { leads: 0, preorders: 0 };
  let degradedConversions = false;
  try {
    const base = { url: env.SUPABASE_URL, secretKey: env.SUPABASE_SECRET_KEY };
    currentConversions = {
      leads: await countRows({ ...base, table: TABLES.leads, window: windows.current }),
      preorders: await countRows({ ...base, table: TABLES.preorders, window: windows.current }),
    };
    previousConversions = {
      leads: await countRows({ ...base, table: TABLES.leads, window: windows.previous }),
      preorders: await countRows({ ...base, table: TABLES.preorders, window: windows.previous }),
    };
  } catch (e) {
    console.error('conversions error', e);
    degradedConversions = true;
  }

  const model = buildReport({
    window: windows,
    currentTraffic, previousTraffic,
    currentConversions, previousConversions,
    degraded: { traffic: degradedTraffic, conversions: degradedConversions },
    errorRateAlert: ALERTS.errorRateAlert,
    trafficDropAlert: ALERTS.trafficDropAlert,
  });

  const summary = await summarize(model, (m, i) => env.AI.run(m as any, i as any) as any);
  const subject = `Pulso de la liga · ${formatRange(windows.current)}`;
  const html = renderHtml(model, summary);
  const text = renderText(model, summary);
  const raw = base64UrlEncode(buildMime({ to: env.REPORT_TO, subject, html, text }));

  await sendEmail({
    clientId: env.GMAIL_CLIENT_ID,
    clientSecret: env.GMAIL_CLIENT_SECRET,
    refreshToken: env.GMAIL_REFRESH_TOKEN,
    rawBase64Url: raw,
  });

  return { subject, summary };
}

export default {
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runReport(env, Date.now()));
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/__run') {
      if (!checkTrigger(url, request.headers, env.TRIGGER_TOKEN)) {
        return new Response('forbidden', { status: 403 });
      }
      try {
        const out = await runReport(env, Date.now());
        return Response.json({ ok: true, ...out });
      } catch (e) {
        return Response.json({ ok: false, error: String(e) }, { status: 500 });
      }
    }
    return new Response('Pulso — reporte automático de la liga. Ver README.', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  },
};
```

- [ ] **Step 4: Ejecutar y ver que pasa + typecheck + suite completa**

Run: `cd reto-06 && npx vitest run src/index.test.ts && npm run test && npm run typecheck`
Expected: index.test PASS (3); suite completa PASS (todos los módulos); typecheck sin errores.

- [ ] **Step 5: Commit**

```bash
git add reto-06/src/index.ts reto-06/src/index.test.ts
git commit -m "feat(reto-06): wire orchestration, scheduled cron + manual trigger"
```

---

## Task 10: Deploy, OAuth, secretos y verificación E2E real

**Files:**
- Create: `reto-06/README.md`, `reto-06/docs/evidence/` (screenshot)
- Modify: `README.md` (raíz — fila reto-06 + árbol)

Esta tarea requiere acciones del usuario (Google Cloud OAuth, tokens). Se ejecuta acompañado, no por subagente autónomo.

- [ ] **Step 1: Confirmar los `scriptName` reales de las landings**

Run: `npx wrangler deployments list 2>/dev/null || npx wrangler deploy --dry-run` en cada reto, o revisar el dashboard.
Ajustar `LANDINGS` en `src/config.ts` si algún nombre difiere de `parla|altura|radar-digital|golazo`. Confirmar también que `leads` y `preorders` tienen columna `created_at` (Supabase SQL editor: `select column_name from information_schema.columns where table_name in ('leads','preorders');`).

- [ ] **Step 2: Crear el API token de analytics de Cloudflare**

En el dashboard CF → My Profile → API Tokens → Create Token → permiso **Account · Account Analytics · Read**. Guardar el valor.

- [ ] **Step 3: Setup OAuth de Gmail (una vez)**

Documentar en el README y ejecutar:
1. Google Cloud Console → nuevo proyecto → habilitar **Gmail API**.
2. Pantalla de consentimiento OAuth (External, modo Testing, agregar tu Gmail como test user).
3. Crear **OAuth Client ID** tipo *Desktop app* → guardar `client_id` y `client_secret`.
4. Obtener refresh token con scope `https://www.googleapis.com/auth/gmail.send`, `access_type=offline`, `prompt=consent` (vía OAuth Playground con tu client propio, o un script local). Guardar `refresh_token`.

- [ ] **Step 4: Cargar secretos en el Worker**

```bash
cd reto-06
npx wrangler secret put CF_ANALYTICS_TOKEN
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_SECRET_KEY
npx wrangler secret put GMAIL_CLIENT_ID
npx wrangler secret put GMAIL_CLIENT_SECRET
npx wrangler secret put GMAIL_REFRESH_TOKEN
npx wrangler secret put TRIGGER_TOKEN
```
(`CF_ACCOUNT_ID` y `REPORT_TO` van en `[vars]` de `wrangler.toml`, no como secreto.)

- [ ] **Step 5: Deploy**

Run: `cd reto-06 && npx wrangler deploy`
Expected: despliega el Worker `pulso` con el cron `0 22 * * 5` registrado.

- [ ] **Step 6: Verificación E2E (disparo manual)**

Run: `curl -s "https://pulso.robertzu43.workers.dev/__run?token=<TRIGGER_TOKEN>"`
Expected: `{"ok":true,"subject":"Pulso de la liga · ...","summary":"..."}` y **el correo llega** a robertzu43@gmail.com. Si alguna fuente estaba vacía/caída, el correo igual llega en modo degradado.
Revisar logs si algo falla: `npx wrangler tail pulso`.

- [ ] **Step 7: Capturar evidencia**

Guardar screenshot del correo recibido en `reto-06/docs/evidence/` + un `README.md` corto describiéndola (patrón de reto-04).

- [ ] **Step 8: Escribir `reto-06/README.md`**

Incluir: qué es Pulso, el enunciado del reto, stack, arquitectura, las 2 fuentes, el flujo, setup OAuth de Gmail (pasos del Step 3), secretos requeridos, cómo desplegar, cómo disparar manualmente, horario del cron, y evidencia. Seguir el tono/formato de los README de reto-04/reto-05.

- [ ] **Step 9: Enlazar en el README raíz**

Agregar la fila reto-06 a la tabla de retos y la línea al árbol de estructura:

```
| 06 | [Pulso — El reporte que se arma y se envía solo](./reto-06) | Automatización / Reporte programado (Cloudflare Worker Cron + Workers AI + Gmail API) |
```
```
  reto-06/     Pulso — reporte automático de resultados de la liga (Cloudflare Worker Cron + Workers AI + Gmail API)
```

- [ ] **Step 10: Commit**

```bash
git add reto-06/README.md reto-06/docs/evidence README.md reto-06/src/config.ts
git commit -m "docs(reto-06): README, evidence, root README link; confirm landing names"
```

---

## Task 11: Finalización de la rama

- [ ] Ejecutar la suite completa una última vez: `cd reto-06 && npm run test && npm run typecheck` → todo verde.
- [ ] Usar la skill **superpowers:finishing-a-development-branch** para decidir merge/PR de la rama `reto-06-pulso` a `main` (patrón de retos 03/05: PR).
- [ ] Actualizar la memoria del proyecto (`vibe-coders-league-edition-2.md`) con el resumen de reto-06.

---

## Notas de verificación (spec §12)

- **Retención de analytics (plan free):** si el rango de 7d excede la retención de `workersInvocationsAdaptiveGroups`, `fetchTraffic` devuelve lo disponible (grupos parciales) — no rompe. Si devuelve vacío, el reporte sale marcando tráfico en 0. La ventana es ajustable en `dates.ts`/`config.ts`.
- **base64url:** cubierto por test con round-trip (Task 7).
- **Refresh token duradero:** exigir `access_type=offline` + `prompt=consent` al generarlo (Task 10, Step 3).
