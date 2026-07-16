# Reto 06 — Pulso: El reporte que se arma y se envía solo

*Vibe Coders League Platzi 2026 · Edición 2.0*

## El reto

En toda empresa alguien cada lunes copia datos de tres lugares distintos para armar el mismo reporte de siempre. Este reto **jubila esa tarea**: un flujo que **recolecta datos, los organiza y envía el reporte automáticamente, en horario programado**. Requisitos: al menos una fuente de datos real, **transformación con criterio** (no reenviar datos crudos — resumir, totalizar, destacar; se permite IA), y **envío automático programado a un destino real**. Lo que se evalúa es que **el sistema funcione solo**.

## El producto

**Pulso** — el boletín de *resultados de la liga*. Cada viernes 5:00 PM (hora Colombia), un Cloudflare Worker recolecta las analíticas de las landings ya desplegadas en esta misma Vibe Coders League (Parla, Altura, Radar Digital, GOLAZO), las conversiones de negocio capturadas por los retos previos, arma un resumen ejecutivo con IA, y **se lo envía por correo a su dueño** — sin abrir un solo dashboard. Cierra el loop de la liga: los retos anteriores ahora **se miden a sí mismos**.

## Qué hace

Un **Cloudflare Worker sin UI**, disparado por **Cron Trigger** (`0 22 * * 5` UTC = viernes 17:00 America/Bogotá):

```
[Cron: viernes 17:00 Bogotá]
        │
        ▼
[1. Recolectar]   ── Cloudflare GraphQL Analytics API → requests/errores/CPU por landing (7d actual + 7d previa)
        │          └─ Supabase (PostgREST, service_role) → conteo de leads (reto-03) y pre-órdenes (reto-02)
        ▼
[2. Transformar]  ── modelo determinista: totales de liga, landing líder, tasa de error,
        │             variación semana-a-semana (WoW), alertas por umbral
        ▼
[3. Resumir]      ── Workers AI (Llama) → párrafo ejecutivo en español (fallback por reglas si la IA falla)
        │
        ▼
[4. Renderizar]   ── email HTML + texto plano → MIME (base64url)
        │
        ▼
[5. Enviar]       ── Gmail API (OAuth refresh→access token, HTTPS) → a tu propio correo
```

**Transformación con criterio:** el correo nunca reenvía datos crudos. `report.ts` calcula totales, deltas WoW y alertas; `summarize.ts` los interpreta con IA usando **solo los números provistos** (no inventa cifras), y cae a un resumen determinista si la IA no responde.

**Que funcione solo:** cron programado + secretos en el Worker + **degradación elegante** — si una fuente falla, el correo igual sale marcando "datos no disponibles esta semana" (nunca datos parciales junto al aviso).

## Métricas del reporte

| Fuente | Datos |
|--------|-------|
| Cloudflare GraphQL Analytics API | Por landing: requests, errores, tasa de error, CPU p50; totales de liga; delta WoW |
| Supabase (retos 02 y 03) | Conteo semanal de leads y pre-órdenes, con delta WoW |
| Workers AI | Resumen ejecutivo en lenguaje natural |

> Nota: el "engagement" se representa con requests (tráfico) + conversiones de negocio. Métricas de web-analytics reales (pageviews, visitantes únicos) quedaron fuera de alcance a propósito: requerirían inyectar beacons en las 4 landings viejas.

## Tech stack

- **Cloudflare Workers** + **Cron Triggers** (agendado) — desplegado con Wrangler.
- **TypeScript** puro (sin framework). Gate de tipos: `tsc --noEmit`.
- **Workers AI** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) — resumen ejecutivo.
- **Cloudflare GraphQL Analytics API** y **Supabase PostgREST** (RPC en un schema `pulso`) — fuentes de datos (vía `fetch`, sin SDK).
- **Gmail API** (OAuth 2.0 sobre HTTPS) — envío (Workers no soporta SMTP).
- **Vitest** — 28 tests unitarios.

## Arquitectura

Cada módulo en `src/lib/` tiene una responsabilidad única y recibe `fetch`/dependencias por parámetro (inyectable para tests). `index.ts` solo orquesta.

```
reto-06/
├── README.md
├── wrangler.toml            # name, main, [ai], [vars], [triggers] crons
├── package.json  tsconfig.json  vitest.config.ts
├── .dev.vars.example        # secretos con placeholders
├── db/
│   └── schema.sql           # schema `pulso` + función weekly_counts (correr en Supabase)
├── src/
│   ├── index.ts             # Env, runReport(), scheduled(), fetch() (/__run), checkTrigger()
│   ├── config.ts            # LANDINGS, TABLES, ALERTS, TIMEZONE (no-secreto)
│   ├── types.ts             # interfaces del dominio
│   └── lib/
│       ├── dates.ts         # ventanas 7d actual + previa (WoW)
│       ├── cloudflare.ts    # cliente GraphQL Analytics
│       ├── supabase.ts      # conteo de filas por ventana
│       ├── report.ts        # modelo determinista (totales, deltas, alertas)
│       ├── summarize.ts     # Workers AI + fallback por reglas
│       ├── render.ts        # email HTML/texto + MIME base64url
│       └── gmail.ts         # OAuth token + envío (1 retry)
└── docs/
    ├── superpowers/{specs,plans}/   # diseño + plan de implementación
    └── evidence/                    # captura del correo recibido (tras despliegue)
```

## Seguridad

- Todos los secretos van por `wrangler secret put`, **nunca en el repo**: `CF_ANALYTICS_TOKEN`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `TRIGGER_TOKEN`.
- Config no-secreta en `wrangler.toml [vars]`: `CF_ACCOUNT_ID` (un identificador, no un secreto) y `REPORT_TO`.
- El disparo manual `/__run` está protegido por `TRIGGER_TOKEN` (falla cerrado si el token no coincide).
- **Supabase sin service_role:** la RLS de `leads`/`preorders` es *insert-only* y bloquea lecturas anónimas. En vez de exponer la service_role key, se crea un schema `pulso` con la función `weekly_counts` (`SECURITY DEFINER`) que devuelve **solo agregados** (conteos) y es ejecutable por el rol `anon`. El Worker la llama con la **misma publishable key** de reto-02/03 (`SUPABASE_PUBLISHABLE_KEY`). Ver [`db/schema.sql`](./db/schema.sql).
- El scope de Gmail es el mínimo: `gmail.send` (solo envía, no lee tu correo).
- `.dev.vars` está en `.gitignore`; solo se commitea `.dev.vars.example` con placeholders.

## Configuración y despliegue

> **Requisitos previos (una sola vez):**
> 1. **Cloudflare API token** con permiso *Account · Account Analytics · Read* → `CF_ANALYTICS_TOKEN`.
> 2. **Supabase** (proyecto de reto-02/03): la **misma publishable key** → `SUPABASE_PUBLISHABLE_KEY` (+ `SUPABASE_URL`). Corre [`db/schema.sql`](./db/schema.sql) en el SQL Editor y luego expón el schema `pulso` en *Settings → API → Exposed schemas*. Las tablas `leads` y `preorders` deben tener columna `created_at`.
> 3. **OAuth de Gmail** (ver abajo) → `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`.
> 4. Un **`TRIGGER_TOKEN`** al azar para proteger el disparo manual.

### Setup OAuth de Gmail (una vez)

1. [Google Cloud Console](https://console.cloud.google.com) → nuevo proyecto → habilitar **Gmail API**.
2. Pantalla de consentimiento OAuth: tipo **External**, modo **Testing**, agrega tu Gmail como *test user*.
3. Crear **OAuth Client ID** tipo **Desktop app** → guarda `client_id` y `client_secret`.
4. Obtener un **refresh token** para el scope `https://www.googleapis.com/auth/gmail.send`, con `access_type=offline` y `prompt=consent` (por ejemplo con el [OAuth Playground](https://developers.google.com/oauthplayground) configurando tu propio client, o un script local de intercambio de código).

### Cargar secretos y desplegar

```bash
cd reto-06
npx wrangler secret put CF_ANALYTICS_TOKEN
npx wrangler secret put SUPABASE_URL
npx wrangler secret put SUPABASE_PUBLISHABLE_KEY
npx wrangler secret put GMAIL_CLIENT_ID
npx wrangler secret put GMAIL_CLIENT_SECRET
npx wrangler secret put GMAIL_REFRESH_TOKEN
npx wrangler secret put TRIGGER_TOKEN
npx wrangler deploy
```

### Disparo manual (para probar sin esperar al viernes)

```bash
curl -s "https://pulso.robertzu43.workers.dev/__run?token=<TRIGGER_TOKEN>"
# → {"ok":true,"subject":"Pulso de la liga · ...","summary":"..."} y el correo llega a tu bandeja
```

Ver logs en vivo: `npx wrangler tail pulso`.

## Desarrollo

```bash
cd reto-06
npm install
npm run test        # 28 tests (Vitest)
npm run typecheck   # tsc --noEmit
npm run dev         # wrangler dev (local)
```

## Estado

✅ **Desplegado y verificado end-to-end el 2026-07-15** en `https://pulso.robertzu43.workers.dev` (cron `0 22 * * 5`). Una corrida real (`/__run`) recolectó tráfico real de las 4 landings (264 requests), conteos reales de Supabase (6 leads), generó el resumen con Workers AI y **envió el reporte por Gmail** — todo sin intervención. 28/28 tests en verde, `tsc --noEmit` limpio. Evidencia en [`docs/evidence/`](./docs/evidence/README.md).

## Cómo cumple el reto

| Requisito | Estado |
| --- | --- |
| Al menos una fuente de datos real | ✓ dos: Cloudflare Analytics API + Supabase (datos de retos previos) |
| Transformación con criterio (no datos crudos) | ✓ totales, deltas WoW, alertas + resumen ejecutivo con IA |
| Envío automático y programado a un destino real | ✓ email vía Gmail API, cron viernes 17:00 Bogotá |
| El sistema funciona solo | ✓ verificado end-to-end (cron + secretos + degradación elegante) |
