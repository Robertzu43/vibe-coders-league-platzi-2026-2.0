# Reto 07 — Centinela: El agente que decide por ti

*Vibe Coders League Platzi 2026 · Edición 2.0*

## El reto

Hasta ahora las automatizaciones ejecutan órdenes. Este da el salto a **agente**: la IA **analiza y decide** qué hacer con cada cosa que llega. Requisitos: entrada de **contenido variable**, un **paso de decisión con IA** que clasifica según criterios propios, **al menos 2 rutas** distintas según la decisión, y **demostrarlo con ≥5 casos** donde se vea al agente decidiendo.

## El producto

**Centinela** — un **agente de triage de bugs para developers**. Llega un reporte de bug en texto libre; la IA lo analiza según criterios de ingeniería (¿está en **producción**?, ¿afecta **funcionalidad núcleo**?, ¿hay **pérdida de datos**?) y **decide** su prioridad, enrutándolo a uno de dos destinos reales. Es "lo que las empresas quieren implementar y pocos saben construir": triage inteligente de incidencias.

## Qué hace

Un **Cloudflare Worker + Workers AI** que recibe un bug (por la página de demo o `POST /triage`), la IA devuelve una **decisión estructurada** y el agente enruta:

```
[bug: texto variable] → POST /triage
        │
        ▼
[decidir]  Workers AI (structured output json_schema) → { enProduccion, afectaNucleo, perdidaDatos, severidad, area, ... }
        │          (fallback determinista por reglas si la IA falla)
        ▼
   ¿prioridad?
        ├─ P0 ────────────▶ Slack (alerta Block Kit)        [ruta urgente]
        └─ backlog ───────▶ Google Sheet (append de fila)   [ruta registrar / "Jira" accesible]
```

**Rúbrica de decisión:** `P0` ⇔ **pérdida de datos** **o** (**en producción** **y** **afecta el núcleo**). Todo lo demás → **backlog**. La `prioridad` se deriva siempre de los 3 booleanos (la IA no decide la ruta directamente; sus booleanos sí).

## La IA decide (5 casos)

| Bug | prod | núcleo | datos | → |
|-----|:--:|:--:|:--:|---|
| Checkout tira 500 al pagar en producción | ✓ | ✓ | | **P0 → Slack** |
| Se sobrescriben datos de otros usuarios | ✓ | ✓ | ✓ | **P0 → Slack** |
| Ícono del menú corrido en Safari | ✓ | | | backlog → Sheet |
| Crash solo en entorno local (Node 18) | | | | backlog → Sheet |
| Sería genial exportar a PDF | | | | backlog → Sheet |

La página (`GET /`) es el **intake**: escribes un bug y **"Reportar bug"** lo clasifica y lo envía de verdad (P0 → Slack, backlog → Google Sheet), mostrando a dónde fue. El botón **"Correr 5 casos"** muestra al agente decidiendo en vivo (preview, sin enviar). Ver [`docs/evidence/`](./docs/evidence/README.md).

## Tech stack

- **Cloudflare Workers** — endpoint + página de demo, desplegado con Wrangler.
- **Workers AI** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) con **structured output** (`response_format: json_schema`) → decisión estructurada garantizada; **fallback por reglas** si falla.
- **Slack** (Incoming Webhook, Block Kit) — ruta urgente.
- **Google Sheets API** (OAuth) — backlog accesible.
- **TypeScript** puro + **Vitest** (28 tests). Gate: `tsc --noEmit`.

## Arquitectura

Cada módulo en `src/lib/` tiene una responsabilidad única y recibe `fetch`/AI por parámetro (inyectable para tests). `index.ts` solo orquesta.

```
reto-07/
├── README.md
├── wrangler.toml            # name, main, [ai]
├── package.json  tsconfig.json  vitest.config.ts  .dev.vars.example
├── src/
│   ├── index.ts             # Env; handleTriage(); GET / (demo) · POST /triage
│   ├── config.ts            # MODEL, SHEET_TAB/RANGE, SHEET_HEADERS
│   ├── types.ts             # Decision, Route, Prioridad, Severidad
│   ├── cases.ts             # los 5 casos de ejemplo
│   └── lib/
│       ├── route.ts         # priorityFromFlags() (rúbrica) + routeFor()
│       ├── rules.ts         # clasificador determinista (fallback)
│       ├── triage.ts        # decide(): Workers AI structured output + fallback
│       ├── slack.ts         # Block Kit + webhook post
│       ├── sheets.ts        # Google OAuth + values.append
│       └── demo.ts          # HTML de la página de demo
└── docs/
    ├── superpowers/{specs,plans}/
    └── evidence/
```

## Seguridad

- Secretos vía `wrangler secret put`, **nunca en el repo**: `SLACK_WEBHOOK_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `SHEETS_ID`.
- **Intake real:** "Reportar bug" envía de verdad (P0 → Slack, backlog → Sheet); el endpoint es abierto (no requiere token) — el acceso se controla no compartiendo la URL. "Correr 5 casos" queda en dry-run para no spamear. `POST /triage` acepta `{ "dryRun": true }` si solo se quiere clasificar sin enviar.
- Google OAuth con scope mínimo `spreadsheets`; el HTML de la página escapa el texto del usuario (anti-XSS).

## Configuración y despliegue

> **Requisitos (una vez):**
> 1. **Slack Incoming Webhook** → `SLACK_WEBHOOK_URL`.
> 2. **Google Cloud:** habilitar **Google Sheets API**; cliente OAuth Desktop → `GOOGLE_CLIENT_ID/SECRET`; refresh token con scope `spreadsheets` → `GOOGLE_REFRESH_TOKEN`.
> 3. **Google Sheet** con pestaña `Backlog` y encabezados en `A1:J1` → `SHEETS_ID`.

```bash
cd reto-07
npx wrangler secret put SLACK_WEBHOOK_URL
npx wrangler secret put GOOGLE_CLIENT_ID
npx wrangler secret put GOOGLE_CLIENT_SECRET
npx wrangler secret put GOOGLE_REFRESH_TOKEN
npx wrangler secret put SHEETS_ID
npx wrangler deploy
```

## Cómo probar

```bash
# Intake: abre la página y usa "Reportar bug" (envía de verdad) o "Correr 5 casos" (preview)
open https://centinela.robertzu43.workers.dev/

# Reporte real por API (envía a Slack/Sheet según la decisión):
curl -s https://centinela.robertzu43.workers.dev/triage \
  -H 'content-type: application/json' \
  -d '{"text":"login devuelve 500 en producción","dryRun":false}'

# Solo clasificar sin enviar (preview):
curl -s https://centinela.robertzu43.workers.dev/triage \
  -H 'content-type: application/json' \
  -d '{"text":"el botón se ve gris"}'
```

## Desarrollo

```bash
cd reto-07 && npm install
npm run test        # 28 tests
npm run typecheck   # tsc --noEmit
npm run dev         # wrangler dev
```

## Estado

✅ **Desplegado y verificado end-to-end el 2026-07-16** en `https://centinela.robertzu43.workers.dev`. La IA decide (`fuente: "ia"`) sobre los 5 casos; envíos reales confirmados a Slack (P0) y Google Sheet (backlog). 28/28 tests, `tsc --noEmit` limpio. Evidencia en [`docs/evidence/`](./docs/evidence/README.md).

## Cómo cumple el reto

| Requisito | Estado |
| --- | --- |
| Entrada con contenido variable | ✓ bug en texto libre (demo o `POST /triage`) |
| Paso de decisión con IA | ✓ Workers AI structured output clasifica por rúbrica (fallback por reglas) |
| ≥2 rutas distintas según la decisión | ✓ P0 → Slack · backlog → Google Sheet |
| Demostrado con ≥5 casos | ✓ botón "Correr 5 casos" + verificación E2E |
