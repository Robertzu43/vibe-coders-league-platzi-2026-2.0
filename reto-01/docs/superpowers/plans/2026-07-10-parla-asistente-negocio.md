# Parla — Asistente que responde por tu negocio · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir una landing de la academia de idiomas "Parla" con un chat embebido (mascota Kiko 🦜) que responde preguntas del negocio desde una base de conocimiento, admite cuando no sabe (no inventa) y ofrece un diagnóstico adaptativo de nivel de idioma.

**Architecture:** Astro 6 en modo `server` con el adapter de Cloudflare (`@astrojs/cloudflare` v13), desplegable en Cloudflare **Workers**. Una sola base de conocimiento tipada (`data/knowledge-base.ts`) es la fuente de verdad: alimenta tanto el system prompt del agente como las secciones de precios/FAQ de la landing. El chat es un island de TypeScript vanilla que llama a un endpoint `POST /api/chat`, el cual usa el binding de Cloudflare Workers AI (Llama) con el system prompt construido en `lib/system-prompt.ts`.

**Tech Stack:** Astro 6, `@astrojs/cloudflare` v13, Cloudflare Workers AI (`@cf/meta/llama-3.1-8b-instruct`), TypeScript vanilla (sin React), Vitest para tests unitarios, Wrangler (modelo **Cloudflare Workers**) para dev/deploy.

**Modelo de despliegue (consistente en todo el plan):** Cloudflare **Workers**. IMPORTANTE: `@astrojs/cloudflare` v13 **ya no soporta Cloudflare Pages** — despliega a Workers. Por eso:
- `wrangler.toml` declara `main` (entrypoint del adapter) y el binding `AI`; **sin** `pages_build_output_dir` ni `[assets]` (el adapter maneja los assets automáticamente).
- El binding se accede con `import { env } from 'cloudflare:workers'` → `env.AI`. (En v13 se removió `Astro.locals.runtime`; este es el patrón correcto y es el mismo que usó reto-10 de la edición 1.)
- Comandos: dev `astro dev`; preview local del worker `astro build && astro preview`; deploy `astro build && wrangler deploy`.
- El binding de Workers AI llama al servicio real de Cloudflare incluso en dev/preview, así que requiere `npx wrangler login` antes de las verificaciones del chat.

**Nota de implementación (decisión de planeación):** el spec mencionaba streaming; para reducir riesgo y usar el patrón probado de la edición 1 (reto-10), el endpoint responde **sin streaming** (`ai.run` normal, respuestas cortas con `max_tokens`). El widget simula el efecto de escritura revelando el texto gradualmente en el cliente. Si más adelante se quiere streaming real, es un cambio aislado en el endpoint + widget.

**Skills relevantes:** @superpowers:test-driven-development · @superpowers:verification-before-completion · @frontend-design:frontend-design (para la landing) · Spec: `reto-01/docs/superpowers/specs/2026-07-10-parla-asistente-negocio-design.md`

**Directorio de trabajo:** todas las rutas son relativas a `reto-01/`. Todos los comandos se ejecutan desde `reto-01/`.

---

## File Structure

```
reto-01/
  package.json                    # deps + scripts (dev, build, preview, test, eval)
  astro.config.mjs                # output:'server', adapter cloudflare()
  wrangler.toml                   # Workers: main (adapter entrypoint) + binding [ai] + nodejs_compat
  tsconfig.json                   # config estricta de Astro
  vitest.config.ts                # runner de tests unitarios
  .gitignore                      # node_modules, dist, .astro, .wrangler
  README.md                       # doc del reto
  src/
    data/knowledge-base.ts        # FUENTE ÚNICA: negocio, precios, horarios, políticas, FAQ
    data/knowledge-base.test.ts   # test: ≥10 datos + campos requeridos
    lib/system-prompt.ts          # buildSystemPrompt() + MODEL; tono Kiko + KB + reglas + diagnóstico
    lib/system-prompt.test.ts     # test: incluye datos clave, regla anti-invención, tono, modo diagnóstico
    pages/index.astro             # landing (ensambla las secciones + monta el chat)
    pages/api/chat.ts             # endpoint POST -> Workers AI
    components/
      Hero.astro                  # hero Playful Pop + botón grande que abre el chat
      Idiomas.astro               # 4 tarjetas de idiomas (desde KB)
      Modalidades.astro           # grupal / 1-a-1 / intensivo (desde KB)
      Precios.astro               # tabla de precios (desde KB)
      Diagnostico.astro           # sección destacando el diagnóstico + botón
      FAQ.astro                   # preguntas frecuentes (desde KB)
      Footer.astro                # contacto (desde KB)
      ChatWidget.astro            # markup del modal + <script> que importa el island
    scripts/chat-widget.ts        # lógica del chat: abrir/cerrar, enviar, render, efecto typing
    styles/global.css             # design tokens Playful Pop + estilos base
    styles/chat.css               # estilos del widget de chat
  scripts/eval.mjs                # script manual: dispara preguntas guion al endpoint local
```

---

## Task 1: Scaffold del proyecto Astro + Cloudflare + Vitest

**Files:**
- Create: `reto-01/package.json`
- Create: `reto-01/astro.config.mjs`
- Create: `reto-01/wrangler.toml`
- Create: `reto-01/tsconfig.json`
- Create: `reto-01/vitest.config.ts`
- Create: `reto-01/.gitignore`
- Create: `reto-01/src/pages/index.astro` (placeholder)

- [ ] **Step 1: Crear `package.json`**

```json
{
  "name": "parla",
  "type": "module",
  "version": "0.0.1",
  "engines": { "node": ">=22.12.0" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "deploy": "astro build && wrangler deploy",
    "astro": "astro",
    "test": "vitest run",
    "eval": "node scripts/eval.mjs"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^13.0.0",
    "astro": "^6.0.4"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20250320.0",
    "vitest": "^2.1.0",
    "wrangler": "^4.61.1"
  }
}
```

- [ ] **Step 2: Crear `astro.config.mjs`**

En v13 el adapter corre el dev server sobre workerd y expone los bindings de `wrangler.toml` automáticamente (no hace falta `platformProxy`).

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

- [ ] **Step 3: Crear `wrangler.toml`** (modelo Cloudflare Workers)

`main` apunta al entrypoint del adapter (así `wrangler deploy` sabe qué desplegar). NO usar `pages_build_output_dir` ni `[assets]` — el adapter v13 maneja los assets automáticamente.

```toml
name = "parla"
main = "@astrojs/cloudflare/entrypoints/server"
compatibility_date = "2025-05-21"
compatibility_flags = ["nodejs_compat"]

[ai]
binding = "AI"
```

Verificación de que la config es válida (Step 8): `npx wrangler deploy --dry-run` debe validar sin errores (no requiere login). Si por la versión instalada `main` con el entrypoint del paquete no valida, la alternativa avalada es desplegar con la config generada por el adapter: `wrangler deploy -c dist/server/wrangler.json` (y ajustar el script `deploy` en consecuencia). Reportar cuál funcionó.

- [ ] **Step 4: Crear `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "types": ["@cloudflare/workers-types", "vitest/globals"]
  }
}
```

- [ ] **Step 5: Crear `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 6: Crear `.gitignore`**

```gitignore
node_modules/
dist/
.astro/
.wrangler/
.dev.vars
*.log
```

- [ ] **Step 7: Crear placeholder `src/pages/index.astro`**

```astro
---
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Parla — Idiomas sin miedo</title>
  </head>
  <body>
    <h1>Parla 🦜</h1>
  </body>
</html>
```

- [ ] **Step 8: Instalar y verificar build + config**

Run: `cd reto-01 && npm install && npm run build`
Expected: build termina sin errores y crea `dist/`.
Run: `cd reto-01 && npx wrangler deploy --dry-run`
Expected: Wrangler valida la config sin errores (no despliega, no requiere login). Si falla por `main`, aplicar la alternativa del Step 3 y re-verificar.

- [ ] **Step 9: Commit**

```bash
git add reto-01/package.json reto-01/package-lock.json reto-01/astro.config.mjs reto-01/wrangler.toml reto-01/tsconfig.json reto-01/vitest.config.ts reto-01/.gitignore reto-01/src/pages/index.astro
git commit -m "chore(reto-01): scaffold Astro + Cloudflare + Vitest"
```

---

## Task 2: Base de conocimiento (fuente única)

**Files:**
- Create: `reto-01/src/data/knowledge-base.ts`
- Test: `reto-01/src/data/knowledge-base.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/data/knowledge-base.test.ts
import { describe, it, expect } from 'vitest';
import { knowledgeBase, factCount } from './knowledge-base';

describe('knowledgeBase', () => {
  it('tiene al menos 10 datos concretos del negocio', () => {
    expect(factCount()).toBeGreaterThanOrEqual(10);
  });

  it('incluye los campos esenciales del negocio', () => {
    expect(knowledgeBase.nombre).toBe('Parla');
    expect(knowledgeBase.idiomas.length).toBe(4);
    expect(knowledgeBase.precios.length).toBeGreaterThanOrEqual(3);
    expect(knowledgeBase.faqs.length).toBeGreaterThanOrEqual(4);
    expect(knowledgeBase.contacto.whatsapp).toContain('+57');
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `cd reto-01 && npm test`
Expected: FAIL — `knowledge-base` no existe / no exporta `knowledgeBase`.

- [ ] **Step 3: Implementar `knowledge-base.ts`**

Módulo tipado con los 16 datos del spec (sección 3). Estructura sugerida:

```ts
// src/data/knowledge-base.ts
export interface Idioma { nombre: string; bandera: string; codigo: string; }
export interface Precio { plan: string; valor: string; detalle: string; }
export interface Faq { pregunta: string; respuesta: string; }

export const knowledgeBase = {
  nombre: 'Parla',
  eslogan: 'Idiomas sin miedo',
  descripcion:
    'Academia de idiomas online y presencial en Bogotá. Enseñamos las 4 lenguas más habladas del mundo.',
  idiomas: [
    { nombre: 'Inglés', bandera: '🇬🇧', codigo: 'en' },
    { nombre: 'Mandarín', bandera: '🇨🇳', codigo: 'zh' },
    { nombre: 'Hindi', bandera: '🇮🇳', codigo: 'hi' },
    { nombre: 'Español', bandera: '🇪🇸', codigo: 'es' },
  ] as Idioma[],
  modalidades: [
    'Grupal (máximo 8 personas)',
    'Clases 1-a-1 privadas',
    'Online en vivo',
  ],
  niveles: 'MCER A1 → C2 (aprox. 3 meses por nivel en modalidad grupal)',
  precios: [
    { plan: 'Curso grupal', valor: '$189.000 COP/mes', detalle: '8 clases/mes (2 por semana)' },
    { plan: 'Clase 1-a-1', valor: '$55.000 COP', detalle: 'sesión de 60 minutos' },
    { plan: 'Plan intensivo', valor: '$650.000 COP/mes', detalle: 'clase diaria de lunes a viernes' },
    { plan: 'Clase de prueba', valor: 'Gratis', detalle: '1 clase sin costo' },
  ] as Precio[],
  horarios: 'Lunes a viernes 6:00am–9:00pm · Sábados 8:00am–1:00pm · Domingos cerrado',
  sede: 'Chapinero, Bogotá (Calle 63 #11-45) + campus online',
  pagos: 'PSE, tarjeta de crédito/débito, Nequi y efectivo en sede',
  reembolso: 'Reembolso del 100% si cancelas dentro de los primeros 7 días del mes; después no hay reembolso.',
  congelamiento: 'Puedes congelar tu plan hasta 1 mes por semestre sin costo.',
  certificacion: 'Certificado de nivel MCER al aprobar (nota ≥ 70%). Preparamos para TOEFL, IELTS y HSK.',
  descuentos: '15% de descuento pagando el semestre completo. 2x1 trayendo un amigo el primer mes.',
  profesores: 'Profesores nativos y certificados. Ratio máximo de 8 alumnos por grupo.',
  contacto: {
    whatsapp: '+57 300 123 4567',
    correo: 'hola@parla.co',
    instagram: '@parla.idiomas',
  },
  faqs: [
    { pregunta: '¿Ofrecen clase de prueba?', respuesta: 'Sí, la primera clase es gratis.' },
    { pregunta: '¿Cómo puedo pagar?', respuesta: 'PSE, tarjeta, Nequi o efectivo en la sede.' },
    { pregunta: '¿Dan certificado?', respuesta: 'Sí, un certificado de nivel MCER al aprobar con nota ≥ 70%.' },
    { pregunta: '¿Puedo congelar mi plan?', respuesta: 'Sí, hasta 1 mes por semestre sin costo.' },
    { pregunta: '¿Hay descuentos?', respuesta: '15% pagando el semestre completo y 2x1 trayendo un amigo el primer mes.' },
  ] as Faq[],
} as const;

/** Cuenta los datos concretos del negocio expuestos en la KB. */
export function factCount(): number {
  return (
    knowledgeBase.idiomas.length +
    knowledgeBase.precios.length +
    knowledgeBase.faqs.length +
    // datos escalares: niveles, horarios, sede, pagos, reembolso, congelamiento, certificacion, descuentos, profesores, modalidades, contacto
    11
  );
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `cd reto-01 && npm test`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add reto-01/src/data/knowledge-base.ts reto-01/src/data/knowledge-base.test.ts
git commit -m "feat(reto-01): add single-source knowledge base with tests"
```

---

## Task 3: Constructor del system prompt (tono Kiko + KB + reglas + diagnóstico)

**Files:**
- Create: `reto-01/src/lib/system-prompt.ts`
- Test: `reto-01/src/lib/system-prompt.test.ts`

- [ ] **Step 1: Escribir el test que falla**

```ts
// src/lib/system-prompt.test.ts
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, MODEL } from './system-prompt';

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('incluye datos clave de la base de conocimiento', () => {
    expect(prompt).toContain('$189.000');           // precio curso grupal
    expect(prompt).toContain('6:00am');              // horario
    expect(prompt).toContain('primeros 7 días');     // política de reembolso
    expect(prompt).toContain('+57 300 123 4567');    // contacto
  });

  it('define el tono/persona de Kiko', () => {
    expect(prompt).toMatch(/Kiko/);
    expect(prompt.toLowerCase()).toMatch(/loro|divertid/);
  });

  it('incluye la regla anti-invención', () => {
    expect(prompt.toLowerCase()).toMatch(/no inventes|no sabes|no está en/);
  });

  it('describe el modo diagnóstico', () => {
    expect(prompt.toLowerCase()).toMatch(/diagn[oó]stico/);
    expect(prompt).toMatch(/A1|C2|MCER/);
  });
});

describe('MODEL', () => {
  it('apunta a un modelo de Workers AI', () => {
    expect(MODEL).toContain('@cf/');
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `cd reto-01 && npm test`
Expected: FAIL — `system-prompt` no existe.

- [ ] **Step 3: Implementar `system-prompt.ts`**

`MODEL` es una constante única (facilita el cambio a un modelo mayor si el 8B falla en Mandarín/Hindi, según el punto de decisión del spec). `buildSystemPrompt()` serializa la KB a texto legible y añade tono + reglas + instrucciones de diagnóstico.

```ts
// src/lib/system-prompt.ts
import { knowledgeBase as kb } from '../data/knowledge-base';

/** Modelo de Cloudflare Workers AI. Cambiar aquí si el 8B falla en Mandarín/Hindi. */
export const MODEL = '@cf/meta/llama-3.1-8b-instruct';

export function buildSystemPrompt(): string {
  const precios = kb.precios.map((p) => `- ${p.plan}: ${p.valor} (${p.detalle})`).join('\n');
  const faqs = kb.faqs.map((f) => `- P: ${f.pregunta}\n  R: ${f.respuesta}`).join('\n');
  const idiomas = kb.idiomas.map((i) => `${i.bandera} ${i.nombre}`).join(', ');

  return `Eres Kiko 🦜, un loro asistente virtual de la academia de idiomas "${kb.nombre}".

## Tu personalidad
Eres divertido, desenfadado y cercano. Tuteas al usuario, celebras sus aciertos, usas emojis con mesura y cero solemnidad. Tu lema es "${kb.eslogan}". Mantén las respuestas breves y útiles.

## Base de conocimiento de ${kb.nombre} (ÚNICA fuente de verdad)
- Qué es: ${kb.descripcion}
- Idiomas: ${idiomas}
- Modalidades: ${kb.modalidades.join('; ')}
- Niveles: ${kb.niveles}
- Precios:
${precios}
- Horarios: ${kb.horarios}
- Sede: ${kb.sede}
- Métodos de pago: ${kb.pagos}
- Reembolso: ${kb.reembolso}
- Congelamiento: ${kb.congelamiento}
- Certificación: ${kb.certificacion}
- Descuentos: ${kb.descuentos}
- Profesores: ${kb.profesores}
- Contacto: WhatsApp ${kb.contacto.whatsapp}, correo ${kb.contacto.correo}, Instagram ${kb.contacto.instagram}

## Preguntas frecuentes
${faqs}

## Reglas (MUY IMPORTANTE)
1. Responde ÚNICAMENTE con información de la base de conocimiento de arriba.
2. Si te preguntan algo que NO está en la base de conocimiento (otro idioma, parqueadero, un precio que no aparece, etc.), NO INVENTES. Admite con gracia que no lo sabes y ofrece el WhatsApp ${kb.contacto.whatsapp} o el correo ${kb.contacto.correo} para que lo confirmen con el equipo.
3. No inventes precios, horarios ni políticas que no estén listados.

## Modo diagnóstico de nivel
Si el usuario quiere saber su nivel o iniciar un diagnóstico:
1. Pregúntale qué idioma quiere evaluar (${idiomas}).
2. Hazle entre 4 y 6 preguntas de dificultad creciente EN ESE IDIOMA, una a la vez, esperando su respuesta antes de la siguiente.
3. Al terminar, evalúa y cierra con un veredicto en este formato exacto: "📊 Tu nivel: **<A1-C2>**" seguido de una recomendación de un curso concreto de Parla acorde al nivel.
El diagnóstico se basa en el MCER (niveles A1 a C2).`;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `cd reto-01 && npm test`
Expected: PASS (todos los tests).

- [ ] **Step 5: Commit**

```bash
git add reto-01/src/lib/system-prompt.ts reto-01/src/lib/system-prompt.test.ts
git commit -m "feat(reto-01): add system prompt builder (Kiko tone + KB + no-hallucination + diagnostic)"
```

---

## Task 4: Endpoint del chat (Workers AI)

**Files:**
- Create: `reto-01/src/pages/api/chat.ts`

Nota: la respuesta del LLM no es determinista → se verifica manualmente, no con test unitario (según el spec, sección 6). El binding `AI` llama al servicio real de Cloudflare; funciona en `astro dev` (en v13 el dev server corre sobre workerd y expone los bindings), pero requiere `npx wrangler login` previo.

- [ ] **Step 1: Implementar el endpoint**

```ts
// src/pages/api/chat.ts
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { buildSystemPrompt, MODEL } from '../../lib/system-prompt';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const { messages } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return json({ error: 'Se requiere un arreglo de mensajes' }, 400);
    }

    // Acceso al binding en @astrojs/cloudflare v13 (Astro.locals.runtime fue removido).
    const ai = (env as any).AI;
    const aiMessages = [
      { role: 'system', content: buildSystemPrompt() },
      ...messages,
    ];

    const result = await ai.run(MODEL, {
      messages: aiMessages,
      max_tokens: 600,
      temperature: 0.2,
    });

    return json({ response: result.response }, 200);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Chat API error:', msg);
    return json({ error: '¡Uy! Se me trabó la lengua 🦜. ¿Intentamos de nuevo?' }, 500);
  }
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
```

- [ ] **Step 2: Verificar manualmente el endpoint**

Run:
```bash
npx wrangler login   # una sola vez, si no hay sesión
cd reto-01 && npm run dev
# en otra terminal (astro dev corre en http://localhost:4321):
curl -s -X POST http://localhost:4321/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"¿Cuánto cuesta el curso grupal?"}]}'
```
Expected: JSON con `response` que menciona `$189.000`.

- [ ] **Step 3: Verificar que admite lo que no sabe**

Run:
```bash
curl -s -X POST http://localhost:4321/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"messages":[{"role":"user","content":"¿Tienen cursos de francés?"}]}'
```
Expected: la respuesta admite que no lo sabe / no ofrece francés y deriva a WhatsApp o correo, SIN inventar.

- [ ] **Step 4: Commit**

```bash
git add reto-01/src/pages/api/chat.ts
git commit -m "feat(reto-01): add chat API route backed by Workers AI"
```

---

## Task 5: Estilos base (Playful Pop) + Hero con botón grande

**Files:**
- Create: `reto-01/src/styles/global.css`
- Create: `reto-01/src/components/Hero.astro`
- Modify: `reto-01/src/pages/index.astro`

Usar @frontend-design:frontend-design para calidad visual. Dirección "Playful Pop": amarillo `#FFE14D`, negro `#111`, acentos coral `#FF5A5F`, azul `#00A3FF`, morado `#7C4DFF`. Tipografía chunky/redondeada (p.ej. una fuente display de sistema o Google Font tipo "Fredoka"/"Poppins" con pesos altos).

- [ ] **Step 1: Crear `global.css` con design tokens**

Define variables CSS (`--amarillo`, `--negro`, acentos), reset básico, tipografía, y utilidades. Incluir tokens y estilos base de secciones.

```css
/* src/styles/global.css */
:root {
  --amarillo: #FFE14D;
  --negro: #111111;
  --coral: #FF5A5F;
  --azul: #00A3FF;
  --morado: #7C4DFF;
  --blanco: #FFFFFF;
  --radio: 16px;
  --fuente: system-ui, 'Segoe UI', sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body { font-family: var(--fuente); color: var(--negro); background: var(--blanco); line-height: 1.5; }
.contenedor { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
.seccion { padding: 72px 0; }
h1, h2, h3 { font-weight: 900; letter-spacing: -0.02em; line-height: 1.05; }
.btn-grande {
  background: var(--negro); color: var(--amarillo);
  border: none; border-radius: var(--radio);
  padding: 18px 28px; font-size: 1.15rem; font-weight: 900;
  cursor: pointer; transition: transform .15s ease;
}
.btn-grande:hover { transform: translateY(-2px) scale(1.02); }
```

- [ ] **Step 2: Crear `Hero.astro`**

Hero con fondo amarillo, título "Idiomas sin miedo", banderas de los 4 idiomas y el **botón grande** que abre el chat. El botón dispara un evento que escucha el widget (`data-open-chat`).

```astro
---
import { knowledgeBase as kb } from '../data/knowledge-base';
---
<section class="hero">
  <div class="contenedor">
    <span class="marca">parla<span>.</span></span>
    <h1>Idiomas<br/>sin miedo</h1>
    <p class="sub">Aprende las 4 lenguas más habladas del mundo con {kb.nombre}.</p>
    <div class="banderas">{kb.idiomas.map((i) => <span>{i.bandera} {i.nombre}</span>)}</div>
    <button class="btn-grande" data-open-chat>💬 Pregúntale a Kiko 🦜</button>
  </div>
</section>

<style>
  .hero { background: var(--amarillo); padding: 88px 0; }
  .marca { font-weight: 900; font-size: 1.6rem; }
  .marca span { color: var(--coral); }
  .hero h1 { font-size: clamp(2.8rem, 8vw, 5rem); margin: 16px 0; }
  .sub { font-size: 1.2rem; max-width: 520px; margin-bottom: 20px; }
  .banderas { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 28px; font-weight: 700; }
  .banderas span { background: var(--negro); color: #fff; padding: 6px 14px; border-radius: 20px; }
</style>
```

- [ ] **Step 3: Montar Hero en `index.astro`**

Reemplazar el placeholder por la estructura real (importa `global.css` y `Hero`).

```astro
---
import '../styles/global.css';
import Hero from '../components/Hero.astro';
import { knowledgeBase as kb } from '../data/knowledge-base';
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{kb.nombre} — {kb.eslogan}</title>
    <meta name="description" content={kb.descripcion} />
  </head>
  <body>
    <Hero />
    <!-- las demás secciones se agregan en la Task 6 -->
  </body>
</html>
```

- [ ] **Step 4: Verificar visualmente**

Run: `cd reto-01 && npm run dev` → abrir `http://localhost:4321`
Expected: hero amarillo con título, banderas y botón grande. (El botón aún no abre nada.)

- [ ] **Step 5: Commit**

```bash
git add reto-01/src/styles/global.css reto-01/src/components/Hero.astro reto-01/src/pages/index.astro
git commit -m "feat(reto-01): add Playful Pop base styles and hero"
```

---

## Task 6: Secciones de contenido de la landing (desde la KB)

**Files:**
- Create: `reto-01/src/components/Idiomas.astro`
- Create: `reto-01/src/components/Modalidades.astro`
- Create: `reto-01/src/components/Precios.astro`
- Create: `reto-01/src/components/Diagnostico.astro`
- Create: `reto-01/src/components/FAQ.astro`
- Create: `reto-01/src/components/Footer.astro`
- Modify: `reto-01/src/pages/index.astro`

Todas las secciones leen de `knowledge-base.ts` (DRY — mismos datos que usa el agente).

- [ ] **Step 1: Crear las 6 secciones**

Cada componente importa `knowledgeBase` y renderiza su parte:
- `Idiomas.astro`: 4 tarjetas (`kb.idiomas`), cada una con bandera, nombre y color de acento rotando entre coral/azul/morado/negro.
- `Modalidades.astro`: lista `kb.modalidades` + `kb.niveles`.
- `Precios.astro`: tabla/tarjetas de `kb.precios` (plan, valor, detalle) + nota de descuentos (`kb.descuentos`).
- `Diagnostico.astro`: bloque destacado que explica el diagnóstico de nivel + botón `data-open-chat` con texto "Empieza tu diagnóstico ⚡".
- `FAQ.astro`: acordeón simple o lista de `kb.faqs` (pregunta/respuesta) + `kb.horarios`, `kb.sede`, `kb.pagos`, `kb.reembolso`, `kb.congelamiento`, `kb.certificacion`.
- `Footer.astro`: `kb.contacto` (WhatsApp, correo, Instagram) + `kb.profesores`.

Cada uno con su `<style>` scoped usando los tokens de `global.css`. Mantener la estética Playful Pop (bordes redondeados, colores vivos, negrita).

- [ ] **Step 2: Ensamblar en `index.astro`**

Importar y colocar en orden: `Hero`, `Idiomas`, `Modalidades`, `Precios`, `Diagnostico`, `FAQ`, `Footer`.

- [ ] **Step 3: Verificar visualmente**

Run: `cd reto-01 && npm run dev`
Expected: landing completa, todas las secciones con datos reales de la KB, sin datos hardcodeados duplicados.

- [ ] **Step 4: Commit**

```bash
git add reto-01/src/components/ reto-01/src/pages/index.astro
git commit -m "feat(reto-01): add landing content sections sourced from KB"
```

---

## Task 7: Widget de chat (island vanilla TS)

**Files:**
- Create: `reto-01/src/components/ChatWidget.astro`
- Create: `reto-01/src/scripts/chat-widget.ts`
- Create: `reto-01/src/styles/chat.css`
- Modify: `reto-01/src/pages/index.astro` (montar `<ChatWidget />`)

- [ ] **Step 1: Crear `ChatWidget.astro` (markup del modal)**

Modal oculto por defecto con: header ("Kiko 🦜 · Parla"), botón cerrar, área de mensajes, input + botón enviar. Un mensaje de bienvenida inicial de Kiko. Importa el island con `<script>`.

```astro
---
import '../styles/chat.css';
---
<div id="chat-modal" class="chat-modal" hidden>
  <div class="chat-panel">
    <header class="chat-header">
      <span>Kiko 🦜 · Parla</span>
      <button id="chat-close" aria-label="Cerrar">✕</button>
    </header>
    <div id="chat-messages" class="chat-messages"></div>
    <form id="chat-form" class="chat-form">
      <input id="chat-input" type="text" placeholder="Escríbele a Kiko…" autocomplete="off" />
      <button type="submit">Enviar</button>
    </form>
  </div>
</div>
<script>
  import '../scripts/chat-widget.ts';
</script>
```

- [ ] **Step 2: Crear `chat-widget.ts` (lógica)**

Responsabilidades: abrir el modal desde cualquier `[data-open-chat]`, cerrar, mantener historial en memoria, enviar a `/api/chat`, renderizar burbujas, mostrar "Kiko está escribiendo…", y revelar la respuesta con efecto typing.

```ts
// src/scripts/chat-widget.ts
type Msg = { role: 'user' | 'assistant'; content: string };

const modal = document.getElementById('chat-modal')!;
const messagesEl = document.getElementById('chat-messages')!;
const form = document.getElementById('chat-form') as HTMLFormElement;
const input = document.getElementById('chat-input') as HTMLInputElement;
const history: Msg[] = [];

const WELCOME = '¡Hola! Soy Kiko 🦜 el loro de Parla. Puedo contarte de precios, horarios y políticas, o hacerte un diagnóstico de tu nivel. ¿Qué necesitas?';

function open() {
  modal.hidden = false;
  if (messagesEl.childElementCount === 0) addBubble('assistant', WELCOME);
  input.focus();
}
function close() { modal.hidden = true; }

function addBubble(role: Msg['role'], text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `bubble ${role}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

async function typeInto(el: HTMLElement, text: string) {
  el.textContent = '';
  for (const ch of text) {
    el.textContent += ch;
    messagesEl.scrollTop = messagesEl.scrollHeight;
    await new Promise((r) => setTimeout(r, 12));
  }
}

document.querySelectorAll('[data-open-chat]').forEach((b) => b.addEventListener('click', open));
document.getElementById('chat-close')!.addEventListener('click', close);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  addBubble('user', text);
  history.push({ role: 'user', content: text });

  const typing = addBubble('assistant', 'Kiko está escribiendo…');
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    const reply = data.response ?? data.error ?? '¡Uy! Algo salió mal 🦜';
    history.push({ role: 'assistant', content: reply });
    await typeInto(typing, reply);
  } catch {
    typing.textContent = '¡Uy! No pude responder 🦜. Intenta de nuevo.';
  }
});
```

- [ ] **Step 3: Crear `chat.css`**

Estilos del modal (overlay, panel, header amarillo/negro, burbujas: usuario a la derecha, Kiko a la izquierda), responsive (full-screen en móvil, esquina inferior derecha en desktop).

- [ ] **Step 4: Montar `<ChatWidget />` en `index.astro`**

Importar y colocar antes de cerrar `</body>`.

- [ ] **Step 5: Verificar end-to-end**

Run: `cd reto-01 && npm run dev` (con `npx wrangler login` hecho) → abrir `http://localhost:4321`
Expected: clic en el botón grande abre el chat; preguntar "¿cuánto cuesta el intensivo?" responde `$650.000`; preguntar por algo fuera de la KB → admite que no sabe; pedir diagnóstico → hace preguntas y da nivel MCER.

- [ ] **Step 6: Commit**

```bash
git add reto-01/src/components/ChatWidget.astro reto-01/src/scripts/chat-widget.ts reto-01/src/styles/chat.css reto-01/src/pages/index.astro
git commit -m "feat(reto-01): add embedded chat widget wired to /api/chat"
```

---

## Task 8: Script de evaluación (manual) + README

**Files:**
- Create: `reto-01/scripts/eval.mjs`
- Create: `reto-01/README.md`

- [ ] **Step 1: Crear `eval.mjs`**

Script Node que dispara preguntas guion contra el endpoint local e imprime pregunta + respuesta para juicio humano (la salida del LLM no es determinista, por eso es revisión manual, no aserciones).

```js
// scripts/eval.mjs
const BASE = process.env.BASE_URL ?? 'http://localhost:4321';

const casos = [
  { q: '¿Cuánto cuesta el curso grupal?', espero: 'debe mencionar $189.000' },
  { q: '¿A qué hora abren los sábados?', espero: 'debe mencionar 8:00am' },
  { q: '¿Puedo pedir reembolso a mitad de mes?', espero: 'primeros 7 días / no después' },
  { q: '¿Tienen cursos de francés?', espero: 'debe admitir que NO sabe / no inventar' },
  { q: '¿Hay parqueadero en la sede?', espero: 'debe admitir que NO sabe' },
  { q: 'Quiero un diagnóstico de mi nivel de inglés', espero: 'debe empezar a preguntar en inglés' },
];

for (const c of casos) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: c.q }] }),
  });
  const data = await res.json();
  console.log(`\nP: ${c.q}\n(espero: ${c.espero})\nKiko: ${data.response ?? data.error}`);
}
```

- [ ] **Step 2: Correr la evaluación y revisar**

Run: `cd reto-01 && npm run dev` (en una terminal, con `npx wrangler login` hecho) y `npm run eval` (en otra).
Expected: revisar a ojo que responde bien lo que está en la KB y admite lo que no sabe.

- [ ] **Step 3: Escribir `README.md`**

Incluir: nombre del reto, descripción del negocio (Parla), qué hace el asistente (Q&A + no-inventa + diagnóstico), tech stack, cómo correr (`npm install`, `npm run dev`, `npx wrangler login` para Workers AI), cómo desplegar (`npm run deploy`, que corre `astro build && wrangler deploy` a Cloudflare Workers), y cómo cumple cada requisito del reto.

- [ ] **Step 4: Commit**

```bash
git add reto-01/scripts/eval.mjs reto-01/README.md
git commit -m "docs(reto-01): add eval script and README"
```

---

## Task 9: Verificación final y despliegue

- [ ] **Step 1: Correr todos los tests**

Run: `cd reto-01 && npm test`
Expected: todos los tests unitarios pasan.

- [ ] **Step 2: Build limpio**

Run: `cd reto-01 && npm run build`
Expected: build sin errores ni warnings de tipos.

- [ ] **Step 3: Checklist de requisitos del reto (@superpowers:verification-before-completion)**

Verificar manualmente en `npm run dev` (con `npx wrangler login`):
- [ ] KB con ≥10 datos concretos (test lo cubre).
- [ ] Responde correctamente preguntas de la KB (precio, horario, reembolso).
- [ ] Admite cuando no sabe, sin inventar.
- [ ] Tono Kiko coherente y divertido.
- [ ] Chat embebido en la landing funciona.
- [ ] Diagnóstico de nivel funciona end-to-end.

- [ ] **Step 4 (opcional): Desplegar a Cloudflare Workers**

Run: `cd reto-01 && npm run deploy`   (corre `astro build && wrangler deploy`)
Expected: URL pública (`*.workers.dev`) funcionando con el chat.

- [ ] **Step 5: Commit final / actualizar README raíz**

Actualizar la tabla de retos del `README.md` raíz con el nombre real del reto-01 (Parla) y su categoría (Chatbot / Web App).

```bash
git add README.md
git commit -m "docs: link reto-01 (Parla) in root README"
```
