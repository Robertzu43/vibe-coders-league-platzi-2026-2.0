# Radar Digital — Lead magnet (quiz diagnóstico) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar la landing de **Radar Digital** (lead magnet del estudio ficticio **Órbita**): un quiz diagnóstico interactivo que entrega valor gratis (puntaje + arquetipo al instante) y, a cambio del correo, desbloquea un informe personalizado que se guarda **de verdad** en Supabase y se muestra en pantalla + (si hay dominio) se envía por correo.

**Architecture:** Astro 6 (`output: 'server'`) + adapter `@astrojs/cloudflare` → despliegue a Cloudflare **Workers** (mismo stack probado en reto-01/02). El quiz corre en el cliente y calcula puntaje + arquetipo al instante con `lib/diagnostic.ts` (compartido cliente/servidor). El **informe completo NO viaja al cliente hasta pasar el gate**: al enviar el correo, el cliente hace POST a `/api/lead`, el servidor **valida**, **recalcula el puntaje** (no confía en el cliente), arma el informe con `lib/report.ts` (bloques curados server-only), hace `INSERT` en Supabase vía REST (`fetch`, sin SDK), intenta enviar el correo (degrada si no hay dominio), y **devuelve el informe** que el cliente renderiza.

**Tech Stack:** Astro 6, `@astrojs/cloudflare` v13, Supabase (PostgREST vía REST), Cloudflare Email Service, TypeScript vanilla (script del quiz), Vitest.

**Modelo de despliegue (consistente en todo el plan):** Cloudflare **Workers** (igual que reto-01/02, ya validado):
- `wrangler.toml` con `main = "@astrojs/cloudflare/entrypoints/server"`, `nodejs_compat`; **sin** `pages_build_output_dir` ni `[assets]`.
- Vars/secrets vía `import { env } from 'cloudflare:workers'` → `env.SUPABASE_URL`, `env.SUPABASE_PUBLISHABLE_KEY`.
- dev `astro dev` (lee `.dev.vars`); build `astro build`; deploy `astro build && wrangler deploy`.

**Seguridad de credenciales (CRÍTICO):**
- Solo se usa la **publishable key** de Supabase, en el **servidor** (`.dev.vars` local + secrets del Worker en prod). **Nunca** en el cliente ni en git.
- `.dev.vars` y `.env` van en `.gitignore`. Se comitea solo `.dev.vars.example` con placeholders.
- La **secret key** de Supabase y la contraseña de la DB NO se usan en la app ni se comitean. (Solo las usa el CONTROLADOR para crear la tabla y para verificación manual — nunca entran al código ni a prompts de subagentes.)
- **RLS** activado en `leads` con política **solo-INSERT**.

**Frontera cliente/servidor (IMPORTANTE):** el catálogo de bloques del informe (`data/report-blocks.ts`) es **server-only**: solo lo importan `lib/report.ts`, `pages/api/lead.ts` y los tests. El script del cliente (`scripts/quiz.ts`) importa **únicamente** `data/quiz.ts` y `lib/diagnostic.ts`. Así el contenido del informe no entra al bundle del cliente y el gate es real (no un `display:none`).

**Skills relevantes:** @superpowers:test-driven-development · @superpowers:verification-before-completion · @frontend-design:frontend-design (landing + quiz) · @cloudflare-email-service (envío real) · Spec: `reto-03/docs/superpowers/specs/2026-07-12-radar-digital-design.md`

**Notas para el CONTROLADOR** (no van en el repo): antes de la verificación en vivo se necesitan `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` (puede reutilizarse el proyecto Supabase del reto-02 o uno nuevo; **pedírselo al usuario**). El envío de correo real requiere un dominio verificado en Cloudflare Email (degrada si falta). Todas las rutas son relativas a `reto-03/`.

---

## File Structure

```
reto-03/
  package.json               # Astro + cloudflare + vitest + wrangler
  astro.config.mjs           # output:'server', adapter cloudflare()
  wrangler.toml              # main entrypoint + nodejs_compat (Workers)
  tsconfig.json
  vitest.config.ts
  .gitignore
  .dev.vars.example          # plantilla de env (committed)
  db/schema.sql              # tabla leads + RLS insert-only
  README.md
  src/
    data/quiz.ts             # FUENTE ÚNICA (client-safe): preguntas, opciones, pesos, arquetipos
    data/report-blocks.ts    # SERVER-ONLY: catálogo curado de bloques de recomendación
    lib/diagnostic.ts        # scoreQuiz() + archetypeFor() — puro, compartido cliente/servidor
    lib/diagnostic.test.ts
    lib/report.ts            # buildReport() — puro, server-only
    lib/report.test.ts
    lib/validation.ts        # validateLead() — puro
    lib/validation.test.ts
    pages/index.astro        # landing: Hero + Quiz + (resultado) + Gate + (informe) + Footer
    pages/api/lead.ts        # POST -> validate -> recompute -> report -> INSERT -> email -> return report
    scripts/quiz.ts          # cliente: navegación del quiz, puntaje instantáneo, gate, fetch, render informe
    components/
      Hero.astro
      Quiz.astro             # render server-side de las preguntas (desde quiz.ts) + contenedores de estado
      GateForm.astro         # form nombre/email/negocio + honeypot
      Footer.astro
    styles/global.css        # tokens "tech-humano"
```

---

## Task 1: Scaffold Astro + Cloudflare Workers + Vitest

**Files:** `reto-03/{package.json, astro.config.mjs, wrangler.toml, tsconfig.json, vitest.config.ts, .gitignore, .dev.vars.example, src/pages/index.astro}`

- [ ] **Step 1: `package.json`**
```json
{
  "name": "radar-digital",
  "type": "module",
  "version": "0.0.1",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "deploy": "astro build && wrangler deploy",
    "astro": "astro",
    "test": "vitest run"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^13.0.0",
    "astro": "^6.0.4"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^5.20260708.1",
    "vitest": "^2.1.0",
    "wrangler": "^4.61.1"
  }
}
```

- [ ] **Step 2: `astro.config.mjs`**
```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

- [ ] **Step 3: `wrangler.toml`** (modelo Workers — NO `pages_build_output_dir` ni `[assets]`)
```toml
name = "radar-digital"
main = "@astrojs/cloudflare/entrypoints/server"
compatibility_date = "2025-05-21"
compatibility_flags = ["nodejs_compat"]
```

- [ ] **Step 4: `tsconfig.json`**
```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types", "vitest/globals"]
  }
}
```

- [ ] **Step 5: `vitest.config.ts`**
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 6: `.gitignore`**
```gitignore
node_modules/
dist/
.astro/
.wrangler/
.dev.vars
.env
*.log
```

- [ ] **Step 7: `.dev.vars.example`** (committed — plantilla SIN valores reales)
```
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx
```

- [ ] **Step 8: placeholder `src/pages/index.astro`**
```astro
---
---
<html lang="es"><head><meta charset="utf-8" /><title>Radar Digital — Órbita</title></head>
<body><h1>Radar Digital 📡</h1></body></html>
```

- [ ] **Step 9: Instalar + verificar**
Run: `cd reto-03 && npm install && npm run build`
Expected: build OK, crea `dist/`.
Run: `cd reto-03 && npx wrangler deploy --dry-run`
Expected: valida sin errores (no requiere login).

- [ ] **Step 10: Commit**
```bash
git add reto-03/package.json reto-03/package-lock.json reto-03/astro.config.mjs reto-03/wrangler.toml reto-03/tsconfig.json reto-03/vitest.config.ts reto-03/.gitignore reto-03/.dev.vars.example reto-03/src/pages/index.astro
git commit -m "chore(reto-03): scaffold Astro + Cloudflare Workers + Vitest"
```

---

## Task 2: Esquema Supabase (tabla leads + RLS)

**Files:** Create `reto-03/db/schema.sql`

- [ ] **Step 1: Escribir `db/schema.sql`**
```sql
-- Tabla de leads capturados por Radar Digital
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  email text not null,
  negocio text,
  tipo_negocio text,
  respuestas jsonb not null,
  puntaje_web int not null,
  puntaje_automatizacion int not null,
  arquetipo text not null
);

-- Seguridad: RLS solo permite INSERT (no lectura/edición) con la publishable key
alter table public.leads enable row level security;

drop policy if exists "allow anon inserts" on public.leads;
create policy "allow anon inserts"
  on public.leads
  for insert
  to anon
  with check (true);
```

- [ ] **Step 2 (CONTROLADOR): crear la tabla en Supabase**
El subagente NO ejecuta esto (requiere credenciales). El controlador confirma con el usuario qué proyecto Supabase usar (reutilizar el del reto-02 o uno nuevo), obtiene `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY`, y crea la tabla ejecutando `db/schema.sql` (SQL Editor del dashboard, o psql). Luego verifica:
Run (controlador): `curl -s "$SUPABASE_URL/rest/v1/leads?select=id&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"`
Expected: `[]` (arreglo vacío) en vez de `PGRST205 ... Could not find the table`. (Nota: la publishable key + RLS solo-INSERT devolverá `[]` o un error de permiso de SELECT; ambos confirman que la tabla existe. Si se quiere confirmar con lectura, el controlador usa la secret key SOLO para esta verificación manual.)

- [ ] **Step 3: Commit**
```bash
git add reto-03/db/schema.sql
git commit -m "feat(reto-03): add Supabase leads schema with insert-only RLS"
```

---

## Task 3: Módulo de datos del quiz (fuente única, client-safe)

**Files:** Create `reto-03/src/data/quiz.ts`, Test `reto-03/src/data/quiz.test.ts`

Diseño: 1 pregunta de contexto (tipo de negocio, **no puntúa**) + 6 preguntas que puntúan (3 eje web, 3 eje automatización). Cada opción de las preguntas que puntúan lleva un `peso` 0–100. Este archivo es **client-safe** (lo usa el quiz y el arquetipo instantáneo); NO contiene el contenido del informe.

- [ ] **Step 1: Test que falla** — `quiz.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { PREGUNTAS, PREGUNTA_TIPO, ARQUETIPOS } from './quiz';

describe('quiz data', () => {
  it('tiene 6 preguntas que puntúan, 3 por eje', () => {
    expect(PREGUNTAS.length).toBe(6);
    expect(PREGUNTAS.filter((p) => p.eje === 'web').length).toBe(3);
    expect(PREGUNTAS.filter((p) => p.eje === 'automatizacion').length).toBe(3);
  });
  it('cada opción de puntaje tiene peso 0..100', () => {
    for (const p of PREGUNTAS)
      for (const o of p.opciones)
        expect(o.peso).toBeGreaterThanOrEqual(0), expect(o.peso).toBeLessThanOrEqual(100);
  });
  it('la pregunta de tipo de negocio no puntúa', () => {
    expect(PREGUNTA_TIPO.opciones.length).toBeGreaterThanOrEqual(3);
    expect((PREGUNTA_TIPO as any).eje).toBeUndefined();
  });
  it('define exactamente 4 arquetipos con cuadrante web/auto', () => {
    expect(ARQUETIPOS.length).toBe(4);
    const ids = ARQUETIPOS.map((a) => a.id).sort();
    expect(ids).toEqual(['analogo', 'digital', 'motor', 'vitrina']);
  });
});
```

- [ ] **Step 2: Correr → falla.** `cd reto-03 && npm test`

- [ ] **Step 3: Implementar `quiz.ts`** (los textos exactos pueden pulirse; mantener ids, ejes y pesos):
```ts
export type Eje = 'web' | 'automatizacion';

export interface Opcion { id: string; label: string; peso: number; }
export interface Pregunta { id: string; eje: Eje; texto: string; opciones: Opcion[]; }
export interface PreguntaTipo { id: 'tipo'; texto: string; opciones: { id: string; label: string }[]; }

export const PREGUNTA_TIPO: PreguntaTipo = {
  id: 'tipo',
  texto: '¿Qué tipo de negocio tienes?',
  opciones: [
    { id: 'restaurante', label: 'Restaurante / café' },
    { id: 'retail', label: 'Tienda / retail' },
    { id: 'servicios', label: 'Servicios profesionales' },
    { id: 'salud', label: 'Salud / belleza' },
    { id: 'otro', label: 'Otro' },
  ],
};

export const PREGUNTAS: Pregunta[] = [
  {
    id: 'web_sitio', eje: 'web', texto: '¿Tienes página web propia?',
    opciones: [
      { id: 'ninguna', label: 'No, ninguna', peso: 0 },
      { id: 'redes', label: 'Solo redes sociales', peso: 33 },
      { id: 'basica', label: 'Sí, pero básica o desactualizada', peso: 66 },
      { id: 'moderna', label: 'Sí, moderna y activa', peso: 100 },
    ],
  },
  {
    id: 'web_encuentran', eje: 'web', texto: '¿Cómo te encuentran nuevos clientes hoy?',
    opciones: [
      { id: 'voz', label: 'Voz a voz / recomendaciones', peso: 0 },
      { id: 'redes', label: 'Redes sociales', peso: 40 },
      { id: 'google', label: 'Aparezco en Google', peso: 80 },
      { id: 'ads', label: 'Publicidad digital activa', peso: 100 },
    ],
  },
  {
    id: 'web_comprar', eje: 'web', texto: '¿Un cliente puede comprar o agendar contigo en línea?',
    opciones: [
      { id: 'presencial', label: 'No, todo es presencial o por teléfono', peso: 0 },
      { id: 'whatsapp', label: 'Por WhatsApp, a mano', peso: 33 },
      { id: 'formulario', label: 'Sí, por un formulario o catálogo', peso: 66 },
      { id: 'checkout', label: 'Sí, checkout / agenda en línea completa', peso: 100 },
    ],
  },
  {
    id: 'auto_pedidos', eje: 'automatizacion', texto: '¿Cómo tomas pedidos o agendas citas?',
    opciones: [
      { id: 'mano', label: 'A mano (papel o de memoria)', peso: 0 },
      { id: 'whatsapp', label: 'Por WhatsApp / llamadas, manual', peso: 33 },
      { id: 'hoja', label: 'En una hoja de cálculo', peso: 66 },
      { id: 'sistema', label: 'Un sistema que lo gestiona solo', peso: 100 },
    ],
  },
  {
    id: 'auto_preguntas', eje: 'automatizacion', texto: '¿Respondes las mismas preguntas de clientes una y otra vez?',
    opciones: [
      { id: 'todo', label: 'Sí, todo el día a mano', peso: 0 },
      { id: 'aveces', label: 'A veces', peso: 40 },
      { id: 'guardadas', label: 'Tengo respuestas guardadas', peso: 70 },
      { id: 'bot', label: 'Un bot / FAQ responde por mí', peso: 100 },
    ],
  },
  {
    id: 'auto_facturacion', eje: 'automatizacion', texto: '¿Cómo manejas facturación y seguimiento post-venta?',
    opciones: [
      { id: 'manual', label: 'Manual, cuando me acuerdo', peso: 0 },
      { id: 'organizado', label: 'Manual pero organizado', peso: 40 },
      { id: 'plantillas', label: 'Con plantillas / recordatorios', peso: 70 },
      { id: 'auto', label: 'Automatizado (correos / CRM)', peso: 100 },
    ],
  },
];

export interface Arquetipo {
  id: 'analogo' | 'motor' | 'vitrina' | 'digital';
  label: string; emoji: string; web: 'alto' | 'bajo'; auto: 'alto' | 'bajo'; resumen: string;
}

export const ARQUETIPOS: Arquetipo[] = [
  { id: 'analogo', label: 'Negocio Análogo', emoji: '🌱', web: 'bajo', auto: 'bajo',
    resumen: 'Todo funciona a pulso. Es el punto de mayor oportunidad: pequeños cambios digitales se notan enseguida.' },
  { id: 'motor', label: 'Motor sin Vitrina', emoji: '⚙️', web: 'bajo', auto: 'alto',
    resumen: 'Operas ordenado por dentro, pero pocos te encuentran. Te falta vitrina digital para que ese motor rinda.' },
  { id: 'vitrina', label: 'Vitrina Manual', emoji: '📣', web: 'alto', auto: 'bajo',
    resumen: 'Tienes presencia y te ven, pero pierdes horas en tareas manuales. Automatizar te libera tiempo real.' },
  { id: 'digital', label: 'Digital en Marcha', emoji: '🚀', web: 'alto', auto: 'alto',
    resumen: 'Vas muy bien. Ahora se trata de optimizar y exprimir lo que ya tienes.' },
];
```

- [ ] **Step 4: Correr → pasa.** **Step 5: Commit** `feat(reto-03): add quiz data module (client-safe) with tests`

---

## Task 4: Motor de diagnóstico (TDD, función pura, compartida)

**Files:** Create `reto-03/src/lib/diagnostic.ts`, Test `reto-03/src/lib/diagnostic.test.ts`

`scoreQuiz(respuestas)` promedia los pesos por eje (0–100). `archetypeFor(scores)` mapea al cuadrante 2×2 con umbral 50 (≥50 = alto). `respuestas` es `Record<preguntaId, opcionId>`.

- [ ] **Step 1: Test que falla** — `diagnostic.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { scoreQuiz, archetypeFor } from './diagnostic';

const todoAlto = { web_sitio: 'moderna', web_encuentran: 'ads', web_comprar: 'checkout',
  auto_pedidos: 'sistema', auto_preguntas: 'bot', auto_facturacion: 'auto' };
const todoBajo = { web_sitio: 'ninguna', web_encuentran: 'voz', web_comprar: 'presencial',
  auto_pedidos: 'mano', auto_preguntas: 'todo', auto_facturacion: 'manual' };

describe('scoreQuiz', () => {
  it('todo alto → 100/100', () => {
    expect(scoreQuiz(todoAlto)).toEqual({ puntaje_web: 100, puntaje_automatizacion: 100 });
  });
  it('todo bajo → 0/0', () => {
    expect(scoreQuiz(todoBajo)).toEqual({ puntaje_web: 0, puntaje_automatizacion: 0 });
  });
  it('promedia por eje y redondea', () => {
    const r = scoreQuiz({ ...todoBajo, web_sitio: 'basica' }); // web: (66+0+0)/3 = 22
    expect(r.puntaje_web).toBe(22);
    expect(r.puntaje_automatizacion).toBe(0);
  });
  it('opción desconocida o faltante cuenta como 0', () => {
    const r = scoreQuiz({ web_sitio: 'inexistente' } as any);
    expect(r.puntaje_web).toBe(0);
    expect(r.puntaje_automatizacion).toBe(0);
  });
});

describe('archetypeFor', () => {
  it('bajo/bajo → analogo', () => expect(archetypeFor({ puntaje_web: 20, puntaje_automatizacion: 10 }).id).toBe('analogo'));
  it('bajo web, alto auto → motor', () => expect(archetypeFor({ puntaje_web: 30, puntaje_automatizacion: 70 }).id).toBe('motor'));
  it('alto web, bajo auto → vitrina', () => expect(archetypeFor({ puntaje_web: 80, puntaje_automatizacion: 20 }).id).toBe('vitrina'));
  it('alto/alto → digital', () => expect(archetypeFor({ puntaje_web: 60, puntaje_automatizacion: 90 }).id).toBe('digital'));
  it('el umbral 50 cuenta como alto', () => expect(archetypeFor({ puntaje_web: 50, puntaje_automatizacion: 50 }).id).toBe('digital'));
});
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Implementar `diagnostic.ts`**
```ts
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
```

- [ ] **Step 4: Correr → pasa.** **Step 5: Commit** `feat(reto-03): add diagnostic scoring + archetype (pure, tested)`

---

## Task 5: Motor del informe (TDD, server-only)

**Files:** Create `reto-03/src/data/report-blocks.ts`, `reto-03/src/lib/report.ts`, Test `reto-03/src/lib/report.test.ts`

`data/report-blocks.ts` es **server-only** (nunca importado por el cliente). Cada bloque se asocia a una pregunta; aplica cuando el peso de la respuesta a esa pregunta es bajo (`<= 65`), con prioridad = ese peso (menor peso = mayor urgencia). `buildReport` selecciona los aplicables, ordena por urgencia, garantiza 3–4 bloques (rellena con optimizaciones del arquetipo si faltan) y agrega un cierre.

- [ ] **Step 1: Test que falla** — `report.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildReport } from './report';

const todoBajo = { web_sitio: 'ninguna', web_encuentran: 'voz', web_comprar: 'presencial',
  auto_pedidos: 'mano', auto_preguntas: 'todo', auto_facturacion: 'manual' };
const todoAlto = { web_sitio: 'moderna', web_encuentran: 'ads', web_comprar: 'checkout',
  auto_pedidos: 'sistema', auto_preguntas: 'bot', auto_facturacion: 'auto' };

describe('buildReport', () => {
  it('perfil análogo (todo bajo) devuelve 4 bloques priorizados por urgencia', () => {
    const r = buildReport(todoBajo, { puntaje_web: 0, puntaje_automatizacion: 0 });
    expect(r.arquetipo.id).toBe('analogo');
    expect(r.bloques.length).toBe(4);           // cap en 4
    expect(r.bloques[0].titulo).toBeTruthy();
    expect(r.bloques[0].cuerpo).toBeTruthy();
    expect(r.cierre).toBeTruthy();
  });
  it('perfil digital (todo alto) igual devuelve al menos 3 bloques (optimización)', () => {
    const r = buildReport(todoAlto, { puntaje_web: 100, puntaje_automatizacion: 100 });
    expect(r.arquetipo.id).toBe('digital');
    expect(r.bloques.length).toBeGreaterThanOrEqual(3);
  });
  it('selecciona el bloque específico de la debilidad', () => {
    const soloSinWeb = { ...todoAlto, web_sitio: 'ninguna' };
    const r = buildReport(soloSinWeb, { puntaje_web: 66, puntaje_automatizacion: 100 });
    expect(r.bloques.some((b) => b.id === 'web_sitio')).toBe(true);
  });
});
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Implementar `data/report-blocks.ts`** (contenido curado — SERVER-ONLY):
```ts
// SERVER-ONLY. No importar desde código de cliente (scripts/). Ver "Frontera cliente/servidor".
export interface Bloque { id: string; titulo: string; cuerpo: string; }

// Bloques disparados por una pregunta débil (id === preguntaId).
export const BLOQUES: Bloque[] = [
  { id: 'web_sitio', titulo: 'Crea tu vitrina digital',
    cuerpo: 'Sin un sitio propio, dependes de que te recuerden. Una landing simple con lo que ofreces, fotos y un botón de contacto te da presencia 24/7 y credibilidad.' },
  { id: 'web_encuentran', titulo: 'Haz que Google te encuentre',
    cuerpo: 'Si solo llegas por voz a voz, dejas clientes sobre la mesa. Un perfil de Google Business y SEO básico hacen que te encuentren justo cuando te buscan.' },
  { id: 'web_comprar', titulo: 'Deja que te compren en línea',
    cuerpo: 'Cada pedido que pasa por chat manual es fricción. Un catálogo con carrito o una agenda en línea deja que el cliente avance solo, incluso fuera de tu horario.' },
  { id: 'auto_pedidos', titulo: 'Automatiza pedidos y agenda',
    cuerpo: 'Tomar pedidos a mano no escala y genera errores. Un sistema de reservas/pedidos confirma solo, evita choques de horario y te libera para atender.' },
  { id: 'auto_preguntas', titulo: 'Un asistente que responde por ti',
    cuerpo: 'Responder lo mismo todo el día cuesta horas. Un FAQ inteligente o un bot resuelve las preguntas repetidas al instante y te deja lo importante.' },
  { id: 'auto_facturacion', titulo: 'Automatiza facturación y seguimiento',
    cuerpo: 'El seguimiento manual se olvida y se pierde recompra. Facturas y correos automáticos post-venta mantienen la relación viva sin que muevas un dedo.' },
];

// Optimizaciones por arquetipo para rellenar si el perfil ya está fuerte.
export const OPTIMIZACIONES: Record<string, Bloque[]> = {
  digital: [
    { id: 'opt_datos', titulo: 'Mide y decide con datos',
      cuerpo: 'Ya tienes la base. Un panel con tus métricas clave (conversión, recompra) te dice dónde afinar para crecer sin adivinar.' },
    { id: 'opt_fidelizacion', titulo: 'Automatiza la fidelización',
      cuerpo: 'Campañas automáticas por segmento (inactivos, mejores clientes) exprimen la base que ya construiste.' },
    { id: 'opt_integraciones', titulo: 'Conecta tus herramientas',
      cuerpo: 'Integrar web, inventario y CRM elimina la doble digitación y los errores entre sistemas.' },
  ],
  vitrina: [
    { id: 'opt_flujos', titulo: 'Mapea tus tareas repetitivas',
      cuerpo: 'Anota qué haces manual cada día; ahí están las primeras automatizaciones de alto impacto.' },
  ],
  motor: [
    { id: 'opt_contenido', titulo: 'Convierte tu operación en contenido',
      cuerpo: 'Tienes el músculo operativo; muéstralo. Contenido y reseñas atraen la demanda que aún no llega.' },
  ],
  analogo: [
    { id: 'opt_quickwin', titulo: 'Empieza por una sola cosa',
      cuerpo: 'No intentes todo a la vez. Elige el bloque de arriba con mayor urgencia y ejecútalo esta semana.' },
  ],
};
```

- [ ] **Step 4: Implementar `lib/report.ts`**
```ts
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
```

- [ ] **Step 5: Correr → pasa.** **Step 6: Commit** `feat(reto-03): add report engine with curated blocks (server-only, tested)`

---

## Task 6: Validación del lead (TDD, función pura)

**Files:** Create `reto-03/src/lib/validation.ts`, Test `reto-03/src/lib/validation.test.ts`

Valida los campos del gate (`nombre`, `email`, `negocio` opcional) + honeypot. Las `respuestas` del quiz se validan por separado (el servidor recalcula el puntaje; respuestas inválidas → peso 0, no rompe).

- [ ] **Step 1: Test que falla** — `validation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { validateLead } from './validation';

const base = { nombre: 'Ana', email: 'ana@correo.com', negocio: 'Café Luna', website: '' };

describe('validateLead', () => {
  it('acepta un lead válido y normaliza', () => {
    const r = validateLead(base);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.data.nombre).toBe('Ana'); expect(r.data.negocio).toBe('Café Luna'); }
  });
  it('negocio es opcional', () => {
    const r = validateLead({ ...base, negocio: '' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.negocio).toBeUndefined();
  });
  it('rechaza email inválido', () => expect(validateLead({ ...base, email: 'no-email' }).ok).toBe(false));
  it('rechaza nombre vacío', () => expect(validateLead({ ...base, nombre: '  ' }).ok).toBe(false));
  it('rechaza si el honeypot viene lleno (bot)', () => {
    const r = validateLead({ ...base, website: 'http://spam' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toBe('spam');
  });
});
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Implementar `validation.ts`**
```ts
export interface LeadInput { nombre?: unknown; email?: unknown; negocio?: unknown; website?: unknown; }
export interface LeadData { nombre: string; email: string; negocio?: string; }
export type LeadResult = { ok: true; data: LeadData } | { ok: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateLead(input: LeadInput): LeadResult {
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return { ok: false, errors: ['spam'] };
  }
  const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const negocioRaw = typeof input.negocio === 'string' ? input.negocio.trim() : '';

  const errors: string[] = [];
  if (!nombre) errors.push('El nombre es obligatorio.');
  if (!EMAIL_RE.test(email)) errors.push('El correo no es válido.');

  if (errors.length) return { ok: false, errors };
  return { ok: true, data: { nombre, email, ...(negocioRaw ? { negocio: negocioRaw } : {}) } };
}
```

- [ ] **Step 4: Correr → pasa.** **Step 5: Commit** `feat(reto-03): add lead validation (pure, tested)`

---

## Task 7: API route `/api/lead` (recompute + Supabase insert + email)

**Files:** Create `reto-03/src/pages/api/lead.ts`

**Usa @cloudflare-email-service** para la parte de envío real. La inserción y el envío se verifican en vivo (controlador); no hay test unitario de red.

Contrato: recibe `{ nombre, email, negocio?, tipo_negocio?, respuestas, website? }`. Responde `{ ok: true, informe }` (201) o `{ error }` (4xx/5xx). El honeypot finge éxito **sin** insertar (devuelve un informe genérico neutro para no dar pistas al bot; o `{ ok: true }` sin informe — elegir `{ ok: true }` simple).

- [ ] **Step 1: Implementar `lead.ts`**
```ts
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validateLead } from '../../lib/validation';
import { scoreQuiz, type Respuestas } from '../../lib/diagnostic';
import { buildReport } from '../../lib/report';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try { body = await request.json(); }
  catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const lead = validateLead(body ?? {});
  if (!lead.ok) {
    if (lead.errors[0] === 'spam') return json({ ok: true }, 200); // finge éxito, no inserta
    return json({ error: lead.errors.join(' ') }, 400);
  }

  const respuestas: Respuestas = (body.respuestas && typeof body.respuestas === 'object') ? body.respuestas : {};
  const puntajes = scoreQuiz(respuestas);           // recomputado en el servidor (no se confía en el cliente)
  const informe = buildReport(respuestas, puntajes);
  const tipo_negocio = typeof body.tipo_negocio === 'string' ? body.tipo_negocio : null;

  const url = (env as any).SUPABASE_URL as string;
  const key = (env as any).SUPABASE_PUBLISHABLE_KEY as string;
  if (!url || !key) {
    console.error('Faltan SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY');
    return json({ error: 'Configuración del servidor incompleta.' }, 500);
  }

  try {
    const res = await fetch(`${url}/rest/v1/leads`, {
      method: 'POST',
      headers: {
        'apikey': key, 'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json', 'Prefer': 'return=minimal',
      },
      body: JSON.stringify({
        nombre: lead.data.nombre, email: lead.data.email,
        negocio: lead.data.negocio ?? null, tipo_negocio,
        respuestas, puntaje_web: puntajes.puntaje_web,
        puntaje_automatizacion: puntajes.puntaje_automatizacion,
        arquetipo: informe.arquetipo.id,
      }),
    });
    if (!res.ok) {
      console.error('Supabase insert error:', res.status, await res.text());
      return json({ error: 'No pudimos guardar tu diagnóstico. Intenta de nuevo.' }, 502);
    }
  } catch (e) {
    console.error('Lead insert error:', e instanceof Error ? e.message : String(e));
    return json({ error: 'No pudimos guardar tu diagnóstico. Intenta de nuevo.' }, 500);
  }

  // Envío de correo: mejor esfuerzo, nunca rompe la respuesta (degradación elegante).
  try { await sendReportEmail(lead.data, informe); }
  catch (e) { console.error('Email skipped/failed:', e instanceof Error ? e.message : String(e)); }

  return json({ ok: true, informe }, 201);
};

async function sendReportEmail(lead: { nombre: string; email: string }, informe: unknown): Promise<void> {
  // @cloudflare-email-service: si el binding de email NO está configurado, salir sin error (degrada).
  const emailBinding = (env as any).EMAIL; // binding del Worker (ver skill)
  if (!emailBinding) return;
  // ...construir y enviar el mensaje con el informe (texto/HTML) usando el binding.
  // Implementación exacta del binding/mensaje: seguir @cloudflare-email-service.
}
```

> **Nota (envío de correo — NO terminado en este task):** hasta que el binding `EMAIL` se declare en `wrangler.toml` y exista un dominio verificado, `sendReportEmail` **siempre sale sin enviar** (degradación por diseño; ver spec §6/§12). No es un feature terminado: la declaración del binding y la construcción real del mensaje se completan en la Task 11 (Step 4), siguiendo **@cloudflare-email-service**, una vez el usuario provea el dominio. El resto del flujo (guardar en Supabase + informe en pantalla) funciona sin esto.

```ts
// (continuación de lead.ts — helper json)

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
```

- [ ] **Step 2 (CONTROLADOR): verificación en vivo**
Crear `reto-03/.dev.vars` (gitignored) con `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` reales, `npm run dev`, y probar:
```bash
curl -s -X POST http://localhost:4321/api/lead -H 'Content-Type: application/json' \
  -d '{"nombre":"Test QA","email":"qa@orbita.dev","negocio":"Café Luna","tipo_negocio":"restaurante","respuestas":{"web_sitio":"ninguna","web_encuentran":"voz","web_comprar":"presencial","auto_pedidos":"mano","auto_preguntas":"todo","auto_facturacion":"manual"},"website":""}'
```
Expected: `{"ok":true,"informe":{...}}` (201) + fila nueva en Supabase con `arquetipo="analogo"`, `puntaje_web=0`, `puntaje_automatizacion=0`. Probar también: email inválido → 400; honeypot lleno → `{"ok":true}` sin insertar.

- [ ] **Step 3: Commit** `feat(reto-03): add /api/lead route (recompute + Supabase insert + email)`

---

## Task 8: Estilos "tech-humano" + Hero + shell de la landing

**Files:** Create `reto-03/src/styles/global.css`, `reto-03/src/components/Hero.astro`, `reto-03/src/components/Footer.astro`; Modify `reto-03/src/pages/index.astro`

**FIRST: invoca el skill @frontend-design.** Estilo **confiado, moderno y humano** (no corporativo frío): índigo/violeta profundo (`#2A2151`/`#4B3FA6`) + un acento vivo (lima `#C6F24E` o coral `#FF6B5C`), fondo claro casi-blanco con calidez, sans limpio para cuerpo + un display con carácter para titulares (webfont con preconnect + fallback de sistema). Distinto de reto-01 y reto-02.

- [ ] **Step 1: `global.css`** — tokens (paleta, radios, sombras suaves, fuentes), reset ligero, `.contenedor` (~1000px), `.seccion`, escala de títulos, `.btn` (principal índigo con acento). Base reutilizable por todas las secciones y por el quiz.
- [ ] **Step 2: `Hero.astro`** — marca "Órbita", título con la propuesta ("¿Tu negocio necesita web y automatización? Descúbrelo en 2 minutos"), subtítulo, y CTA que ancla al quiz (`<a href="#diagnostico" class="btn">Hacer el diagnóstico</a>`). Estilo scoped.
- [ ] **Step 3: `Footer.astro`** — marca Órbita + una línea de contacto (`hola@orbita.studio` mailto). Estilo scoped.
- [ ] **Step 4: `index.astro`** — importa `global.css`, `Hero`, `Footer`; `<title>`/meta; renderiza `<Hero />` … `<Footer />` con comentario para Quiz/Gate en las tareas siguientes.
- [ ] **Step 5: Verificar build** `cd reto-03 && npm run build`. **Step 6: Commit** `feat(reto-03): add tech-humano styles, hero and footer`

---

## Task 9: Quiz interactivo + puntaje instantáneo (cliente)

**Files:** Create `reto-03/src/components/Quiz.astro`, `reto-03/src/scripts/quiz.ts`; Modify `index.astro` (insertar `<Quiz />` con `id="diagnostico"`)

**Usa @frontend-design** para que el quiz se sienta ágil (una pregunta a la vez o lista con progreso, transiciones suaves, foco visible). El resultado instantáneo (puntaje + arquetipo) se muestra **sin pedir nada** (valor gratis).

- [ ] **Step 1: `Quiz.astro`** — sección `id="diagnostico"`. Renderiza server-side, desde `PREGUNTA_TIPO` + `PREGUNTAS` (import de `../data/quiz`), todas las preguntas como grupos de opciones (radios). Incluye:
  - barra/indicador de progreso,
  - contenedor de resultado oculto (`#resultado`) con slots para: emoji + label del arquetipo, dos barras de puntaje (web / automatización) y el `resumen` del arquetipo,
  - contenedor del gate oculto (`#gate`, se llena en Task 10),
  - contenedor del informe oculto (`#informe`, se llena en Task 10).
  Importa el script del island vía `<script>import '../scripts/quiz.ts'</script>`.
- [ ] **Step 2: `scripts/quiz.ts`** — vanilla TS. Importa **solo** `scoreQuiz`, `archetypeFor` de `../lib/diagnostic` y `ARQUETIPOS`/`PREGUNTAS` de `../data/quiz` (NO importar `report*`):
  - maneja navegación/estado del quiz y la barra de progreso,
  - al completar todas las preguntas: arma `respuestas` (`Record<preguntaId, opcionId>`), calcula `scoreQuiz` + `archetypeFor`, y **revela el resultado** (pinta arquetipo + barras con `textContent`/estilos, sin `innerHTML`),
  - guarda en memoria `respuestas` + `tipo` para el envío del gate (Task 10),
  - revela el `#gate` bajo el resultado.
- [ ] **Step 3: Estilos** del quiz (scoped o en global.css): opciones tipo tarjeta seleccionable, barras de puntaje, responsive (un campo por fila en móvil).
- [ ] **Step 4 (CONTROLADOR): verificación visual** `npm run dev`: completar el quiz y ver el resultado instantáneo (arquetipo + barras) sin que pida datos. Responsive móvil/desktop.
- [ ] **Step 5: Commit** `feat(reto-03): add interactive quiz with instant score + archetype`

---

## Task 10: Gate del correo + informe (E2E con /api/lead)

**Files:** Create `reto-03/src/components/GateForm.astro`; Modify `reto-03/src/scripts/quiz.ts`, `index.astro`

**Usa @frontend-design.** El gate aparece tras el resultado instantáneo; el informe completo llega del servidor y se renderiza al enviar.

- [ ] **Step 1: `GateForm.astro`** — dentro del contenedor `#gate`: un `<form id="lead-form">` con:
  - `nombre` (text, required), `email` (email, required), `negocio` (text, opcional),
  - honeypot oculto: `<input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">`,
  - copy del intercambio ("Tu informe personalizado con tus acciones prioritarias está listo. ¿A qué correo te lo enviamos?"),
  - botón submit "Ver mi informe",
  - contenedor de estado (`#gate-status`).
  Estilos: inputs grandes, `.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}`.
- [ ] **Step 2: Ampliar `scripts/quiz.ts`** — en `submit` del `#lead-form`:
  - `preventDefault`, recoge `nombre/email/negocio/website` + las `respuestas` y `tipo` guardadas del quiz,
  - deshabilita el botón, `fetch('/api/lead', {POST, json})`,
  - éxito con `informe`: oculta el gate y **renderiza el informe** en `#informe` construyendo nodos DOM con `textContent` (título del arquetipo, cada bloque `titulo`+`cuerpo`, y el `cierre`) — **sin `innerHTML`**,
  - éxito sin `informe` (caso honeypot): mostrar el mismo mensaje de confirmación neutro,
  - error: muestra el mensaje del servidor en `#gate-status`,
  - `finally`: re-habilita el botón.
- [ ] **Step 3: `index.astro`** — asegurar que `<Quiz />` (que ya incluye `#gate`/`#informe`) tenga el `<GateForm />` montado dentro del `#gate`.
- [ ] **Step 4 (CONTROLADOR): verificación E2E en vivo**
Con `.dev.vars` reales + `npm run dev`: completar quiz → ver resultado → dejar correo → ver el **informe en pantalla** → confirmar **fila real en Supabase**. Si el dominio de email está configurado, confirmar recepción del correo; si no, confirmar que el flujo NO se rompe (degradación). Verificar error (email inválido) y responsive.
- [ ] **Step 5: Commit** `feat(reto-03): add email gate and personalized report render (E2E)`

---

## Task 11: README + verificación final + deploy + README raíz

**Files:** Create `reto-03/README.md`; Modify root `README.md`

- [ ] **Step 1: `README.md`** (español): título del reto; el negocio (Órbita) y la herramienta (Radar Digital); qué hace (quiz → valor gratis → gate → informe personalizado guardado en Supabase real + email con degradación); el intercambio justo; tech stack (Astro 6, Cloudflare Workers, Supabase publishable key + RLS insert-only, Cloudflare Email Service, Vitest); estructura; cómo correr (`npm install`, `.dev.vars` desde `.dev.vars.example`, crear tabla con `db/schema.sql`, `npm run dev`, `npm test`); cómo desplegar (`npm run deploy` + `wrangler secret put SUPABASE_URL`/`SUPABASE_PUBLISHABLE_KEY`); nota del prerrequisito de dominio para email; tabla "cómo cumple el reto". No inventar scripts inexistentes.
- [ ] **Step 2: Tests** `cd reto-03 && npm test` → todos pasan. **Build limpio** `cd reto-03 && npm run build`.
- [ ] **Step 3: Checklist del reto (@superpowers:verification-before-completion)** — en vivo: herramienta interactiva con valor real antes de pedir datos ✓; intercambio justo (datos por el informe) ✓; datos guardados en Supabase (fila real) ✓; creatividad del incentivo (diagnóstico + arquetipo + plan, no un form de suscripción) ✓; responsive ✓.
- [ ] **Step 4 (CONTROLADOR, requiere token nuevo de Cloudflare): deploy**
Pedir al usuario token de Cloudflare (scope Workers). Configurar secrets del Worker: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`; (si aplica) el binding de email. Luego `npm run deploy`. Verificar la URL pública: completar el quiz, enviar el correo, confirmar la fila en Supabase.
- [ ] **Step 5: README raíz** — actualizar la tabla de retos con reto-03 (Radar Digital — Lead magnet / quiz diagnóstico + Supabase). Commit.
```bash
git add reto-03/README.md README.md
git commit -m "docs(reto-03): add README and link reto-03 (Radar Digital) in root README"
```
