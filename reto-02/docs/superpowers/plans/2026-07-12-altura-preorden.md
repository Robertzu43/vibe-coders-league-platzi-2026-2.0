# Altura — Pre-orden de café capturando datos reales · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publicar la landing de "Altura" (café de especialidad, lote limitado, pre-orden) con una propuesta de valor clara, diseño responsive "Editorial cálido", y un formulario de pre-orden cuyos datos se guardan **de verdad** en Supabase.

**Architecture:** Astro 6 (`output: 'server'`) con el adapter `@astrojs/cloudflare` → despliegue a Cloudflare **Workers** (mismo stack probado en reto-01). El formulario hace POST a `/api/preorder`; el API route **valida** en el servidor y hace `INSERT` en Supabase vía su API REST (`fetch`, sin dependencias). Un módulo de datos (`data/product.ts`) es la fuente única del producto/copy; una función pura (`lib/validation.ts`) valida el formulario y es la pieza testeada.

**Tech Stack:** Astro 6, `@astrojs/cloudflare` v13, Supabase (PostgREST vía REST), TypeScript vanilla (script del formulario), Vitest.

**Modelo de despliegue (consistente en todo el plan):** Cloudflare **Workers** (igual que reto-01, ya validado):
- `wrangler.toml` con `main = "@astrojs/cloudflare/entrypoints/server"`, `nodejs_compat`; **sin** `pages_build_output_dir` ni `[assets]`.
- Bindings/vars vía `import { env } from 'cloudflare:workers'` → `env.SUPABASE_URL`, `env.SUPABASE_PUBLISHABLE_KEY`.
- dev `astro dev` (lee `.dev.vars`); build `astro build`; deploy `astro build && wrangler deploy`.

**Seguridad de credenciales (CRÍTICO):**
- Solo se usa la **publishable key** de Supabase, en el **servidor** (`.dev.vars` local + secrets del Worker en prod). **Nunca** en el cliente ni en git.
- `.dev.vars` y `.env` van en `.gitignore`. Se comitea solo `.dev.vars.example` con placeholders.
- La **secret key** de Supabase y la **contraseña de la DB** NO se usan en la app ni se comitean. (La secret key/psql solo la usa el CONTROLADOR para crear la tabla y para verificación manual — nunca entra al código ni a prompts de subagentes.)
- **RLS** activado en `preorders` con política **solo-INSERT**.

**Skills relevantes:** @superpowers:test-driven-development · @superpowers:verification-before-completion · @frontend-design:frontend-design (landing) · Spec: `reto-02/docs/superpowers/specs/2026-07-12-altura-preorden-design.md`

**Notas de credenciales para el CONTROLADOR** (NO se comitean): la `SUPABASE_URL` y la `SUPABASE_PUBLISHABLE_KEY` del proyecto se manejan fuera del repo — localmente en `reto-02/.dev.vars` (gitignored) y en producción como secrets del Worker (`wrangler secret put`). `<redactado>`. Todas las rutas son relativas a `reto-02/`.

---

## File Structure

```
reto-02/
  package.json               # Astro + cloudflare + vitest + wrangler
  astro.config.mjs           # output:'server', adapter cloudflare()
  wrangler.toml              # main entrypoint + nodejs_compat (Workers)
  tsconfig.json
  vitest.config.ts
  .gitignore                 # node_modules, dist, .astro, .wrangler, .dev.vars, .env
  .dev.vars.example          # plantilla de env (committed)
  db/schema.sql              # tabla preorders + RLS insert-only (referencia + ejecutable)
  README.md
  src/
    data/product.ts          # FUENTE ÚNICA: datos del lote Altura + copy + precio
    lib/validation.ts        # validatePreorder() — función pura
    lib/validation.test.ts
    pages/index.astro        # landing (ensambla secciones + monta el form)
    pages/api/preorder.ts    # POST -> validate -> INSERT en Supabase
    components/
      Hero.astro             # propuesta + CTA + badge SCA
      Historia.astro         # origen: finca/productor/región
      Trazabilidad.astro     # altitud/variedad/proceso/notas/SCA (desde product.ts)
      ComoFunciona.astro     # reservas -> tostamos -> enviamos
      Escasez.astro          # "X de 300" (número estático de marketing)
      Formulario.astro       # sección con el <form> de pre-orden
      FAQ.astro              # envíos/fechas/reembolso
      Footer.astro
    scripts/preorder-form.ts # cliente: submit, estados, honeypot, total en vivo
    styles/global.css        # tokens "Editorial cálido"
```

---

## Task 1: Scaffold Astro + Cloudflare Workers + Vitest

**Files:** `reto-02/{package.json, astro.config.mjs, wrangler.toml, tsconfig.json, vitest.config.ts, .gitignore, .dev.vars.example, src/pages/index.astro}`

- [ ] **Step 1: `package.json`**
```json
{
  "name": "altura",
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
name = "altura"
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
<html lang="es"><head><meta charset="utf-8" /><title>Altura — Café de origen</title></head>
<body><h1>Altura ☕</h1></body></html>
```

- [ ] **Step 9: Instalar + verificar**
Run: `cd reto-02 && npm install && npm run build`
Expected: build OK, crea `dist/`.
Run: `cd reto-02 && npx wrangler deploy --dry-run`
Expected: valida sin errores (no requiere login).

- [ ] **Step 10: Commit**
```bash
git add reto-02/package.json reto-02/package-lock.json reto-02/astro.config.mjs reto-02/wrangler.toml reto-02/tsconfig.json reto-02/vitest.config.ts reto-02/.gitignore reto-02/.dev.vars.example reto-02/src/pages/index.astro
git commit -m "chore(reto-02): scaffold Astro + Cloudflare Workers + Vitest"
```

---

## Task 2: Esquema Supabase (tabla + RLS)

**Files:** Create `reto-02/db/schema.sql`

- [ ] **Step 1: Escribir `db/schema.sql`**
```sql
-- Tabla de pre-órdenes de Altura
create table if not exists public.preorders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  email text not null,
  ciudad text not null,
  cantidad int not null default 1 check (cantidad between 1 and 5),
  molido text not null check (molido in ('grano_entero','molido'))
);

-- Seguridad: RLS solo permite INSERT (no lectura/edición) con la publishable key
alter table public.preorders enable row level security;

drop policy if exists "allow anon inserts" on public.preorders;
create policy "allow anon inserts"
  on public.preorders
  for insert
  to anon
  with check (true);
```

- [ ] **Step 2 (CONTROLADOR): crear la tabla en Supabase**
El subagente NO ejecuta esto (requiere credenciales). El controlador crea la tabla ejecutando `db/schema.sql` en Supabase (SQL Editor del dashboard, o conexión directa a Postgres con la contraseña de la DB). Luego verifica:
Run (controlador): `curl -s "$SUPABASE_URL/rest/v1/preorders?select=id&limit=1" -H "apikey: $KEY" -H "Authorization: Bearer $KEY"`
Expected: `[]` (arreglo vacío) en vez de `PGRST205 ... Could not find the table`.

- [ ] **Step 3: Commit**
```bash
git add reto-02/db/schema.sql
git commit -m "feat(reto-02): add Supabase preorders schema with insert-only RLS"
```

---

## Task 3: Módulo de datos del producto (fuente única)

**Files:** Create `reto-02/src/data/product.ts`, Test `reto-02/src/data/product.test.ts`

- [ ] **Step 1: Test que falla** — `product.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { producto, PRECIO_COP, MOLIDOS } from './product';

describe('producto', () => {
  it('tiene los datos clave del lote', () => {
    expect(producto.marca).toBe('Altura');
    expect(producto.finca).toMatch(/Mirador/);
    expect(producto.sca).toBeGreaterThanOrEqual(80);
    expect(producto.notas.length).toBeGreaterThanOrEqual(3);
  });
  it('define precio y opciones de molido', () => {
    expect(PRECIO_COP).toBe(58000);
    expect(MOLIDOS.map((m) => m.value)).toEqual(['grano_entero', 'molido']);
  });
});
```

- [ ] **Step 2: Correr → falla.** `cd reto-02 && npm test`

- [ ] **Step 3: Implementar `product.ts`**
```ts
export const PRECIO_COP = 58000;
export const ENVIO_GRATIS_COP = 200000;
export const LOTE_TOTAL = 300;
export const LOTE_RESERVADAS = 128; // número de marketing estático (MVP; ver spec §6)

export const MOLIDOS = [
  { value: 'grano_entero', label: 'Grano entero' },
  { value: 'molido', label: 'Molido' },
] as const;

export const producto = {
  marca: 'Altura',
  eslogan: 'Un lote. Una cosecha. Tuyo.',
  descripcion:
    'Café de especialidad colombiano de un solo lote y una sola cosecha. Lo tostamos cuando lo pides y lo enviamos fresco desde el origen.',
  finca: 'Finca El Mirador',
  region: 'Pitalito, Huila, Colombia',
  altitud: '1.850 msnm',
  variedad: 'Caturra',
  proceso: 'Lavado',
  sca: 86.5,
  notas: ['Panela', 'Mandarina', 'Chocolate con leche'] as string[],
  presentacion: 'Bolsa de 340 g',
  pasos: [
    { t: 'Reservas', d: 'Aseguras tu bolsa de este lote limitado.' },
    { t: 'Tostamos al pedir', d: 'Tostamos tu café solo después de tu reserva, para máxima frescura.' },
    { t: 'Enviamos fresco', d: 'Despachamos desde el origen a tu ciudad.' },
  ],
  faqs: [
    { q: '¿Cuándo llega mi café?', a: 'Tostamos y despachamos dentro de los 5 días hábiles siguientes a tu reserva.' },
    { q: '¿El envío tiene costo?', a: 'El envío se calcula al despacho y es gratis en pedidos sobre $200.000 COP.' },
    { q: '¿Puedo cancelar mi reserva?', a: 'Sí, puedes cancelar sin costo antes de que tostemos tu lote.' },
  ],
  contacto: { correo: 'hola@altura.cafe', instagram: '@altura.cafe' },
} as const;
```

- [ ] **Step 4: Correr → pasa.** **Step 5: Commit** `feat(reto-02): add product data module (Altura lot) with tests`

---

## Task 4: Validación del formulario (TDD, función pura)

**Files:** Create `reto-02/src/lib/validation.ts`, Test `reto-02/src/lib/validation.test.ts`

- [ ] **Step 1: Test que falla** — `validation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { validatePreorder } from './validation';

const base = { nombre: 'Ana', email: 'ana@correo.com', ciudad: 'Bogotá', cantidad: 2, molido: 'molido', website: '' };

describe('validatePreorder', () => {
  it('acepta una pre-orden válida y normaliza cantidad', () => {
    const r = validatePreorder(base);
    expect(r.ok).toBe(true);
    if (r.ok) { expect(r.data.cantidad).toBe(2); expect(r.data.email).toBe('ana@correo.com'); }
  });
  it('rechaza email inválido', () => {
    expect(validatePreorder({ ...base, email: 'no-es-email' }).ok).toBe(false);
  });
  it('rechaza campos requeridos vacíos', () => {
    expect(validatePreorder({ ...base, nombre: '' }).ok).toBe(false);
    expect(validatePreorder({ ...base, ciudad: '  ' }).ok).toBe(false);
  });
  it('rechaza cantidad fuera de 1..5', () => {
    expect(validatePreorder({ ...base, cantidad: 0 }).ok).toBe(false);
    expect(validatePreorder({ ...base, cantidad: 6 }).ok).toBe(false);
  });
  it('rechaza molido inválido', () => {
    expect(validatePreorder({ ...base, molido: 'polvo' }).ok).toBe(false);
  });
  it('rechaza si el honeypot viene lleno (bot)', () => {
    expect(validatePreorder({ ...base, website: 'http://spam' }).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Correr → falla.**

- [ ] **Step 3: Implementar `validation.ts`**
```ts
export interface PreorderInput {
  nombre?: unknown; email?: unknown; ciudad?: unknown;
  cantidad?: unknown; molido?: unknown; website?: unknown;
}
export interface PreorderData {
  nombre: string; email: string; ciudad: string; cantidad: number; molido: 'grano_entero' | 'molido';
}
export type ValidationResult =
  | { ok: true; data: PreorderData }
  | { ok: false; errors: string[] };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOLIDOS = ['grano_entero', 'molido'];

export function validatePreorder(input: PreorderInput): ValidationResult {
  const errors: string[] = [];

  // Honeypot: si viene con contenido, es un bot -> rechazar.
  if (typeof input.website === 'string' && input.website.trim() !== '') {
    return { ok: false, errors: ['spam'] };
  }

  const nombre = typeof input.nombre === 'string' ? input.nombre.trim() : '';
  const email = typeof input.email === 'string' ? input.email.trim() : '';
  const ciudad = typeof input.ciudad === 'string' ? input.ciudad.trim() : '';
  const molido = typeof input.molido === 'string' ? input.molido : '';
  const cantidad = Number(input.cantidad);

  if (!nombre) errors.push('El nombre es obligatorio.');
  if (!EMAIL_RE.test(email)) errors.push('El correo no es válido.');
  if (!ciudad) errors.push('La ciudad es obligatoria.');
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 5) errors.push('La cantidad debe estar entre 1 y 5.');
  if (!MOLIDOS.includes(molido)) errors.push('Elige un tipo de molido válido.');

  if (errors.length) return { ok: false, errors };
  return { ok: true, data: { nombre, email, ciudad, cantidad, molido: molido as PreorderData['molido'] } };
}
```

- [ ] **Step 4: Correr → pasa.** **Step 5: Commit** `feat(reto-02): add form validation (pure, tested)`

---

## Task 5: API route de pre-orden (Supabase insert)

**Files:** Create `reto-02/src/pages/api/preorder.ts`

Nota: la inserción real se verifica en vivo (controlador) con `.dev.vars` reales; no hay test unitario de la llamada de red.

- [ ] **Step 1: Implementar `preorder.ts`**
```ts
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { validatePreorder } from '../../lib/validation';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try { body = await request.json(); }
  catch { return json({ error: 'Solicitud inválida.' }, 400); }

  const result = validatePreorder((body ?? {}) as any);
  if (!result.ok) {
    // Honeypot: fingir éxito para no darle pistas al bot.
    if (result.errors[0] === 'spam') return json({ ok: true }, 200);
    return json({ error: result.errors.join(' ') }, 400);
  }

  const url = (env as any).SUPABASE_URL as string;
  const key = (env as any).SUPABASE_PUBLISHABLE_KEY as string;
  if (!url || !key) {
    console.error('Faltan SUPABASE_URL / SUPABASE_PUBLISHABLE_KEY');
    return json({ error: 'Configuración del servidor incompleta.' }, 500);
  }

  try {
    const res = await fetch(`${url}/rest/v1/preorders`, {
      method: 'POST',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(result.data),
    });
    if (!res.ok) {
      const detail = await res.text();
      console.error('Supabase insert error:', res.status, detail);
      return json({ error: 'No pudimos guardar tu reserva. Intenta de nuevo.' }, 502);
    }
    return json({ ok: true }, 201);
  } catch (e) {
    console.error('Preorder error:', e instanceof Error ? e.message : String(e));
    return json({ error: 'No pudimos guardar tu reserva. Intenta de nuevo.' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
```

- [ ] **Step 2 (CONTROLADOR): verificación en vivo**
El controlador crea `reto-02/.dev.vars` (gitignored) con `SUPABASE_URL` y `SUPABASE_PUBLISHABLE_KEY` reales, corre `npm run dev`, y prueba:
```bash
curl -s -X POST http://localhost:4321/api/preorder -H 'Content-Type: application/json' \
  -d '{"nombre":"Test QA","email":"qa@altura.cafe","ciudad":"Bogotá","cantidad":2,"molido":"molido","website":""}'
```
Expected: `{"ok":true}` (201) y una fila nueva visible en Supabase. Probar también: email inválido → 400; honeypot lleno → `{"ok":true}` sin insertar.

- [ ] **Step 3: Commit** `feat(reto-02): add preorder API route (validate + Supabase insert)`

---

## Task 6: Estilos "Editorial cálido" + Hero

**Files:** Create `reto-02/src/styles/global.css`, `reto-02/src/components/Hero.astro`; Modify `reto-02/src/pages/index.astro`

**FIRST: invoca el skill `frontend-design`.** Estilo "Editorial cálido": papel crema `#F4ECD8`, café espresso `#3B2A1E`, acento terracota/ámbar (`#C0703B`/`#E0A96D`), verdes/cremas suaves. Tipografía serif display (Fraunces o Playfair vía webfont con preconnect + fallback serif de sistema) + sans para cuerpo.

- [ ] **Step 1: `global.css`** — tokens (paleta, radios, sombras suaves, fuentes), reset ligero, `.contenedor` (~1080px), `.seccion`, escala de títulos serif, `.btn` (botón principal terracota/espresso). Base reutilizable por todas las secciones.
- [ ] **Step 2: `Hero.astro`** — importa `producto` de `../data/product.ts`. Hero editorial: marca "Altura", titular con la propuesta (`producto.eslogan` + descripción), badge "SCA {producto.sca}", y CTA que ancla al formulario (`<a href="#reservar" class="btn">Reserva tu bolsa</a>`). Estilo scoped.
- [ ] **Step 3: `index.astro`** — importa `global.css` + `Hero`, `<title>`/meta desde `producto`, renderiza `<Hero />`, deja comentario para las demás secciones.
- [ ] **Step 4: Verificar build** `cd reto-02 && npm run build`. (No arrancar dev; el controlador hará la verificación visual.)
- [ ] **Step 5: Commit** `feat(reto-02): add Editorial-warm styles and hero`

---

## Task 7: Secciones de contenido (desde product.ts)

**Files:** Create `reto-02/src/components/{Historia,Trazabilidad,ComoFunciona,Escasez,FAQ,Footer}.astro`; Modify `index.astro`.

**Usa `frontend-design`.** Todas las secciones importan `producto` de `../data/product.ts` — NO hardcodear datos. Reutiliza tokens de `global.css`, coherente con el Hero.

- [ ] **Step 1: Crear las 6 secciones**
  - `Historia.astro`: origen — `producto.finca`, `producto.region`, narrativa breve del roast-to-order.
  - `Trazabilidad.astro`: ficha con `altitud`, `variedad`, `proceso`, `sca`, `notas` (chips) y `presentacion`.
  - `ComoFunciona.astro`: 3 pasos desde `producto.pasos`.
  - `Escasez.astro`: barra/indicador "`LOTE_RESERVADAS` de `LOTE_TOTAL` bolsas reservadas" (importa las constantes de `product.ts`; número estático de marketing, NO lee la BD).
  - `FAQ.astro`: `producto.faqs` como `<details>/<summary>` accesible.
  - `Footer.astro`: marca + `producto.contacto` (correo `mailto:`, instagram link).
- [ ] **Step 2: Ensamblar en `index.astro`** tras `<Hero />`: Historia, Trazabilidad, ComoFunciona, Escasez, (Formulario en Task 8), FAQ, Footer.
- [ ] **Step 3: Build** OK. **Step 4: Commit** `feat(reto-02): add landing content sections from product data`

---

## Task 8: Formulario de pre-orden + cliente (E2E)

**Files:** Create `reto-02/src/components/Formulario.astro`, `reto-02/src/scripts/preorder-form.ts`; Modify `index.astro` (insertar `<Formulario />` en la posición de la sección 6, con `id="reservar"`).

**Usa `frontend-design`** para que el formulario sea agradable y responsive.

- [ ] **Step 1: `Formulario.astro`** — sección `id="reservar"` con un `<form id="preorder-form">` que contiene:
  - `nombre` (text, required), `email` (email, required), `ciudad` (text, required),
  - `cantidad` (number min=1 max=5 value=1, required), `molido` (select con `MOLIDOS` de `product.ts`, required),
  - honeypot oculto: `<input type="text" name="website" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">` (ocultado por CSS, fuera de pantalla),
  - un `<p>` de total en vivo (`cantidad × PRECIO_COP`) + nota "Envío calculado al despacho · gratis sobre $200.000",
  - botón submit "Reservar mi bolsa",
  - un contenedor de estado (`#form-status`) para éxito/error.
  Importa el script del island vía `<script>import '../scripts/preorder-form.ts'</script>`. Importa `PRECIO_COP`, `MOLIDOS` de `product.ts`.
- [ ] **Step 2: `preorder-form.ts`** — vanilla TS:
  - calcula y muestra el total en vivo al cambiar `cantidad`,
  - en `submit`: `preventDefault`, recoge los campos en un objeto, deshabilita el botón, hace `fetch('/api/preorder', {POST, json})`,
  - éxito (`ok`): muestra mensaje "¡Reserva confirmada! 🎉 Te contactaremos por correo." y resetea el form,
  - error: muestra el mensaje de error del servidor,
  - `finally`: re-habilita el botón.
  Usar `textContent` (no `innerHTML`) para los mensajes.
- [ ] **Step 3: Estilos** — estilos del formulario en `global.css` o scoped en `Formulario.astro`: inputs grandes, un campo por fila en móvil, foco visible, `.hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}`.
- [ ] **Step 4 (CONTROLADOR): verificación E2E en vivo**
Con `.dev.vars` reales y `npm run dev`: abrir la landing, enviar el formulario, ver `{ok:true}` y **la fila en Supabase**. Verificar también mensaje de error (email inválido) y responsive (móvil/desktop).
- [ ] **Step 5: Commit** `feat(reto-02): add pre-order form wired to /api/preorder`

---

## Task 9: README + verificación responsive

**Files:** Create `reto-02/README.md`

- [ ] **Step 1: Escribir `README.md`** (español): título del reto; descripción del producto (Altura, propuesta de valor); qué hace (formulario → Supabase real, validación server-side, anti-invención de datos N/A pero sí anti-spam honeypot); tech stack (Astro 6, Cloudflare Workers, Supabase publishable key + RLS insert-only, Vitest); estructura; cómo correr (`npm install`, crear `.dev.vars` desde `.dev.vars.example`, crear tabla con `db/schema.sql`, `npm run dev`, `npm test`); cómo desplegar (`npm run deploy` + `wrangler secret put SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY`); mención del bonus (investigación de mercado, resumida); tabla "cómo cumple el reto". No inventar scripts inexistentes.
- [ ] **Step 2 (CONTROLADOR): verificación responsive** en `npm run dev` (viewport móvil + desktop).
- [ ] **Step 3: Commit** `docs(reto-02): add README`

---

## Task 10: Verificación final + deploy + README raíz

- [ ] **Step 1: Tests** `cd reto-02 && npm test` → todos pasan.
- [ ] **Step 2: Build limpio** `cd reto-02 && npm run build`.
- [ ] **Step 3: Checklist del reto (@superpowers:verification-before-completion)** — verificar en vivo: propuesta de valor clara ✓; formulario guarda en Supabase (fila real) ✓; responsive ✓; bonus investigación ✓.
- [ ] **Step 4 (CONTROLADOR, requiere token nuevo de Cloudflare): deploy**
Pedir al usuario un token nuevo de Cloudflare (scope Workers). Configurar secrets del Worker: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (`wrangler secret put ...` o `[vars]`), luego `npm run deploy`. Verificar la URL pública: enviar una pre-orden y confirmar la fila en Supabase.
- [ ] **Step 5: README raíz** — actualizar la tabla de retos con reto-02 (Altura, Web App / E-commerce landing + Supabase). Commit `docs: link reto-02 (Altura) in root README`.
