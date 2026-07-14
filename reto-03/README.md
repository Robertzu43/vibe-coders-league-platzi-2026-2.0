# Reto 03 — Radar Digital: la forma más creativa de capturar leads

> Vibe Coders League Platzi 2026 · Edición 2.0

## El reto

Construir una herramienta que la gente **quiera usar por sí misma** y que, a cambio del valor que entrega, capture datos de contacto de forma **voluntaria**. Nada de formularios fríos: primero das algo útil, después pides el contacto. Se evalúa la **creatividad del incentivo** — un formulario de suscripción no cuenta.

## El producto: Órbita · Radar Digital

**Órbita** es un estudio (ficticio) que construye páginas web y automatizaciones para negocios pequeños. Su lead magnet es **Radar Digital**: un **quiz diagnóstico** de ~2 minutos que le dice a un dueño de negocio qué tan preparado está en dos frentes — **presencia web** y **automatización de procesos**.

### El intercambio justo

1. **Valor gratis primero:** al terminar el quiz, la persona ve al instante su **puntaje** (0–100 en cada eje) y su **arquetipo** (uno de cuatro), con una explicación de qué significa. Sin pedir nada.
2. **El gancho:** para recibir el **informe personalizado** — 3 a 4 acciones prioritarias para *su* caso, con el porqué de cada una — deja su correo.
3. **La entrega:** el informe aparece en pantalla al instante y (cuando el dominio de correo está configurado) se envía por email. Los datos se **guardan de verdad** en Supabase.

### Los cuatro arquetipos (cuadrante 2×2)

|  | Automatización baja | Automatización alta |
|---|---|---|
| **Web baja** | 🌱 Negocio Análogo | ⚙️ Motor sin Vitrina |
| **Web alta** | 📣 Vitrina Manual | 🚀 Digital en Marcha |

El informe se arma con un **motor de reglas determinista** (no IA): cada respuesta débil dispara un bloque de recomendación curado, ordenado por urgencia; si el perfil ya es fuerte, se rellena con optimizaciones del arquetipo. Siempre entrega entre 3 y 4 bloques.

## Cómo cumple el reto

| Requisito | Cómo se cumple |
|---|---|
| Herramienta interactiva con valor real antes de pedir datos | Quiz → puntaje + arquetipo instantáneos y gratis |
| Intercambio justo (datos por el resultado completo) | Gate de correo → informe personalizado en pantalla + email |
| Datos guardados de verdad en una BD | `POST /api/lead` → `INSERT` en Supabase `leads`, con el puntaje **recalculado en el servidor** |
| Creatividad del incentivo (no un form de suscripción) | Diagnóstico con arquetipo + plan de acción priorizado a la medida |

## Tech stack

- **Astro 6** (`output: 'server'`) + adapter **`@astrojs/cloudflare`** → despliegue a **Cloudflare Workers**.
- **Supabase** como base de datos (PostgREST vía `fetch`, sin SDK). Solo la **publishable key**, en el servidor; **RLS solo-INSERT** en la tabla `leads` (la app no puede leer ni editar filas).
- **Cloudflare Email Service** para el envío del informe (degrada con elegancia si aún no hay dominio verificado: guarda + muestra en pantalla sin romper el flujo).
- **Vitest** para las pruebas unitarias.
- TypeScript vanilla para el quiz del cliente.

### Seguridad

- La **publishable key** vive solo en el servidor (`.dev.vars` local / secrets del Worker en prod), nunca en el cliente ni en git.
- El **informe completo no viaja al cliente** hasta pasar el gate: lo devuelve el servidor tras capturar el correo, así el intercambio es real.
- El puntaje se **recalcula en el servidor** desde las respuestas (no se confía en el cliente).
- Honeypot anti-bots en el formulario del gate.

## Estructura

```
reto-03/
  db/schema.sql              # tabla leads + RLS solo-INSERT
  src/
    data/quiz.ts             # fuente única (client-safe): preguntas, pesos, arquetipos
    data/report-blocks.ts    # SERVER-ONLY: catálogo curado de bloques del informe
    lib/diagnostic.ts        # scoreQuiz() + archetypeFor()  (puro, testeado)
    lib/report.ts            # buildReport()  (puro, server-only, testeado)
    lib/validation.ts        # validateLead()  (puro, testeado)
    pages/index.astro        # landing
    pages/api/lead.ts        # POST: valida → recalcula → informe → Supabase → email
    scripts/quiz.ts          # cliente: quiz, resultado instantáneo, gate, render del informe
    components/              # Hero, Quiz, GateForm, Footer
    styles/global.css
```

## Cómo correr en local

```bash
cd reto-03
npm install

# 1. Crea la tabla en Supabase: ejecuta db/schema.sql en el SQL Editor del dashboard.
# 2. Configura las credenciales:
cp .dev.vars.example .dev.vars
#    edita .dev.vars con tu SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY

npm run dev      # http://localhost:4321
npm test         # pruebas unitarias (Vitest)
```

## Cómo desplegar (Cloudflare Workers)

```bash
cd reto-03
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npm run deploy   # astro build && wrangler deploy
```

El envío de correo real requiere un dominio verificado en Cloudflare Email (SPF/DKIM/DMARC) y el binding `EMAIL`; sin eso, el flujo funciona igual (guarda en BD + muestra el informe en pantalla).

---

Desarrollado por **Roberto Zuniga** con **Claude Code** como copiloto. Diseño → spec → plan → implementación por tareas con revisión, usando los skills de Superpowers.
