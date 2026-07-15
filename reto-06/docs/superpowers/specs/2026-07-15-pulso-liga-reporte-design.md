# Pulso · el reporte que se arma y se envía solo — Diseño

**Reto 06 · Vibe Coders League (Edición 2.0)**
Fecha: 2026-07-15 · Estado: aprobado en brainstorming, pendiente de spec review

> **Addendum (durante implementación):** el acceso a Supabase cambió de la **service_role/secret key** (leyendo tablas directo) a la **misma publishable/anon key** de reto-02/03 llamando una función `SECURITY DEFINER` `pulso.weekly_counts(win_start, win_end)` en un schema nuevo `pulso` (ver `db/schema.sql`). Motivo: instrucción del usuario de reutilizar las mismas credenciales sin exponer la service_role. `supabase.ts` pasó de `countRows` (select por tabla) a `fetchConversions` (RPC). El resto del diseño se mantiene. El secreto correspondiente es `SUPABASE_PUBLISHABLE_KEY` (reemplaza a `SUPABASE_SECRET_KEY` en las secciones §5.2 y §8).

---

## 1. Contexto

**El reto (Platzi):** "El reporte que se arma y se envía solo." En toda empresa alguien cada lunes copia datos de tres lugares distintos para armar el mismo reporte de siempre. El desafío es jubilar esa tarea: un flujo que **recolecta datos, los organiza y envía el reporte automáticamente, en horario programado**. Debe incluir:

- **Al menos una fuente de datos real** (hoja de cálculo, formulario, API pública, o los datos de proyectos anteriores).
- **Transformación con criterio:** no reenvía datos crudos; los resume, calcula totales o destaca lo importante (se permite IA para el resumen ejecutivo).
- **Envío automático y programado a un destino real:** email, Slack o Telegram.
- Lo que se evalúa es que **el sistema funcione solo**.

**La idea:** "Pulso" — el boletín de **resultados de la liga**. Un reporte semanal que condensa las analíticas de las landings ya desplegadas en la Vibe Coders League (Parla, Altura, Radar Digital, GOLAZO) y las conversiones de negocio capturadas en retos anteriores, y se lo envía a Roberto por correo cada viernes. Cierra el loop de la liga: los retos previos ahora **se miden a sí mismos**.

**Problema que resuelve:** las métricas de cada landing viven dispersas (dashboard de Cloudflare por Worker, tablas de Supabase) y nadie las revisa. "Pulso" las junta, las interpreta con IA y las entrega sin que haya que abrir un solo dashboard.

## 2. Objetivos y no-objetivos

**Objetivos**
- Un **Cloudflare Worker sin UI** que corre en un **Cron Trigger** (viernes 5:00 PM Bogotá = `0 22 * * 5` UTC).
- Recolecta de **dos fuentes reales**: tráfico por landing (Cloudflare GraphQL Analytics API) y conversiones (Supabase: leads del reto-03 + pre-órdenes del reto-02).
- **Transforma con criterio:** totales de liga, landing líder, tasa de error, y **variación semana-a-semana (WoW)**.
- **Resumen ejecutivo con IA** (Workers AI, modelo Llama) que interpreta el modelo de datos, con **fallback determinista por reglas** si la IA falla.
- **Envío por Gmail API** (HTTPS + OAuth) desde y hacia el Gmail de Roberto.
- Consistente con el patrón de la liga: carpeta `reto-06/` autocontenida, TypeScript, Vitest, `.dev.vars.example`, README y `docs/superpowers/{specs,plans}`.
- "Que funcione solo": secretos vía `wrangler secret`, cron, y **degradación elegante** ante cualquier fallo de fuente.

**No-objetivos (YAGNI)**
- Sin UI web, sin dashboard, sin frontend (no es Astro).
- Sin engagement de web-analytics real (pageviews, visitantes únicos, rebote): eso exigiría inyectar beacons de Cloudflare Web Analytics en las 4 landings viejas. Fuera de alcance; el "engagement" se representa con requests (tráfico) + conversiones de negocio.
- Sin base de datos propia ni almacenamiento de histórico: la ventana WoW se calcula pidiendo los dos rangos a las APIs en cada corrida (no persistimos snapshots).
- Sin múltiples destinatarios ni múltiples canales: un solo correo, a Roberto.
- Sin dominio propio ni SMTP: Gmail API (HTTPS) resuelve el envío desde la cuenta personal.

## 3. Decisiones tomadas en brainstorming

| Decisión | Elección |
|----------|----------|
| Tema / fuente | Resultados de la liga: tráfico CF + conversiones Supabase (cierra el loop) |
| Stack | Cloudflare Worker + Cron Trigger |
| Métricas | Requests/errores/CPU por landing + conteo de leads y pre-órdenes |
| IA | Sí — Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`), con fallback por reglas |
| Envío | Gmail API (HTTPS + OAuth), no SMTP (Workers no soporta SMTP) |
| Remitente/destinatario | El propio Gmail de Roberto (robertzu43@gmail.com) |
| Horario | Viernes 5:00 PM Bogotá (`0 22 * * 5` UTC) |

## 4. Arquitectura

**Stack:** Cloudflare Worker (TypeScript puro, sin framework) desplegado con Wrangler. Binding `[ai]` para Workers AI. Cron Trigger para el agendado. Sin dependencias de red en runtime salvo las tres APIs HTTP (Cloudflare GraphQL, Supabase PostgREST, Gmail/OAuth de Google).

**Orquestación** (`index.ts`):
```
scheduled(event, env, ctx)      // disparo por cron
fetch(request, env, ctx)        // disparo manual protegido por TRIGGER_TOKEN (dev / verificación E2E)
        │
        └─> runReport(env):
              collect()   → cloudflare.ts + supabase.ts   (en paralelo, cada una aislada)
              analyze()   → report.ts                      (modelo determinista: totales, top, deltas, alertas)
              summarize() → summarize.ts                   (Workers AI; fallback por reglas)
              render()    → render.ts                      (MIME: HTML + texto plano)
              send()      → gmail.ts                        (refresh→access token; messages.send)
```

Cada módulo en `lib/` tiene un propósito único, recibe `fetch` y config por parámetro (inyectable para tests), y se prueba aislado. `index.ts` solo orquesta.

**Estructura de archivos** (dentro de `reto-06/`, espejo del patrón de la liga):

```
reto-06/
  README.md              # qué es, stack, setup OAuth, deploy, evidencia
  wrangler.toml          # name, main, compatibility_date, [ai], [triggers] crons
  package.json  tsconfig.json  vitest.config.ts
  .dev.vars.example      # todas las claves con placeholders
  src/
    index.ts             # scheduled() + fetch()
    config.ts            # scriptNames de landings, umbrales, zona horaria (no-secreto)
    lib/
      dates.ts           # ventanas 7d actual + 7d previa (WoW), formato de fechas
      cloudflare.ts      # cliente GraphQL Analytics API
      supabase.ts        # conteos PostgREST (leads, preorders)
      report.ts          # arma el modelo de datos del reporte
      summarize.ts       # Workers AI + fallback por reglas
      render.ts          # plantilla email (HTML + texto) y MIME base64url
      gmail.ts           # OAuth token + messages.send
    lib/*.test.ts        # Vitest por módulo
  docs/
    superpowers/{specs,plans}/
    evidence/            # screenshot del correo recibido
```

## 5. Fuentes de datos y flujo

### 5.1 Tráfico — Cloudflare GraphQL Analytics API
- Endpoint: `POST https://api.cloudflare.com/client/v4/graphql`.
- Auth: **API token de solo lectura de Analytics** (Account Analytics: Read), secreto del Worker `CF_ANALYTICS_TOKEN`.
- Dataset: `viewer.accounts.workersInvocationsAdaptiveGroups`, filtrado por `accountTag` (config `CF_ACCOUNT_ID`, valor conocido `51932bfebff61c30c7a32b96834796c1`), rango `datetime_geq`/`datetime_leq`, y `scriptName_in: [parla, altura, radar-digital, golazo]`.
- Campos: `dimensions { scriptName }`, `sum { requests, errors, subrequests }`, `quantiles { cpuTimeP50, cpuTimeP99 }`.
- **Decisión (determinismo):** se consulta **dos veces** — ventana actual y ventana previa — para el delta WoW. Fija el contrato de `cloudflare.ts` y sus fixtures de test (dos llamadas, no partición en código).

### 5.2 Conversiones — Supabase (PostgREST)
- Reutiliza el proyecto Supabase de reto-02/03 (misma instancia). Tablas: `preorders` (reto-02) y `leads` (reto-03).
- Conteo por ventana con `Prefer: count=exact` y filtro `created_at=gte.<iso>&created_at=lt.<iso>` (`select=id` o `HEAD`).
- ⚠️ **La RLS es insert-only** (bloquea lecturas anónimas). Por eso se usa la **secret key / service_role de Supabase** (`SUPABASE_SECRET_KEY`), server-side, como secreto del Worker — nunca la publishable key. Es un backend confiable; el service_role no toca el cliente.
- A verificar en implementación: que ambas tablas tengan columna `created_at` (o equivalente) para filtrar por ventana.

### 5.3 Ventana temporal
- `dates.ts` calcula, con `Date.now()` (disponible en el runtime del Worker): ventana actual `[now-7d, now)` y previa `[now-14d, now-7d)`.
- Ventana configurable (`config.ts`) por si la retención de analytics obliga a acortarla.

## 6. Transformación + resumen IA

- `report.ts` produce un **modelo determinista** (objeto tipado), la única fuente de verdad numérica del correo:
  - Por landing: `{ scriptName, requests, errors, errorRate, cpuP50, requestsPrev, deltaPct }`.
  - Liga: `totalRequests`, `totalErrors`, `topLanding`, deltas WoW.
  - Conversiones: `{ leads, leadsPrev, leadsDelta, preorders, preordersPrev, preordersDelta }`.
  - `alerts[]`: reglas simples (p. ej. `errorRate > 5%`, o `deltaPct < -30%`).
- `summarize.ts` pasa **ese modelo ya calculado** a Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, temperatura baja) con un prompt en español que pide 3–4 frases ejecutivas. **Regla dura:** la IA solo interpreta los números dados, no inventa cifras. Si la llamada falla o devuelve vacío → **fallback por reglas**: una frase armada determinísticamente con los mismos datos. El correo siempre sale con resumen.

## 7. Envío por Gmail API (HTTPS + OAuth)

`gmail.ts`, sin SDK, dos llamadas HTTP:
1. **Refresh → access token:** `POST https://oauth2.googleapis.com/token`, `grant_type=refresh_token` + `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`. Access token fresco por corrida (no se cachea).
2. **Enviar:** `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send` con `{ raw: base64url(MIME) }`. MIME RFC 2822 con `Content-Type: text/html; charset=UTF-8`, `From: me`, `To: REPORT_TO`, `Subject`.

**Setup OAuth (una vez, del lado de Roberto), documentado en el README:** proyecto en Google Cloud → habilitar Gmail API → crear OAuth Client → obtener **refresh token** con scope mínimo `https://www.googleapis.com/auth/gmail.send` (solo envía, no lee). El README incluye el paso a paso / snippet para obtener el refresh token.

## 8. Cron, secretos y configuración

- **wrangler.toml:** `name` (p. ej. `pulso`), `main = "src/index.ts"`, `compatibility_date`, `[ai] binding = "AI"`, `[triggers] crons = ["0 22 * * 5"]`.
- **Secretos** (`wrangler secret put`, nunca en el repo):
  `CF_ANALYTICS_TOKEN`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`, `TRIGGER_TOKEN`.
- **Config no-secreta** (`config.ts` / `[vars]`): `CF_ACCOUNT_ID` (no es secreto: es un identificador), `REPORT_TO` (**fuente de verdad** del destinatario; default `robertzu43@gmail.com`), `scriptNames` de las landings, umbrales de alerta, zona horaria para el texto del correo.
- **`.dev.vars.example`** committeado con todas las claves y placeholders (patrón reto-02/03). El `.dev.vars` real nunca se commitea.

## 9. Manejo de errores (clave para "que funcione solo")

- **Fuentes aisladas:** si `cloudflare` o `supabase` fallan, el reporte se arma **degradado** (la sección afectada se marca "datos no disponibles esta semana") pero **igual se envía** — filosofía `continueRegularOutput` de reto-04.
- **IA falla** → fallback por reglas (§6).
- **Gmail falla** → **un** reintento tras re-pedir el access token; si vuelve a fallar, se registra en logs (`wrangler tail`) y `scheduled` termina en error (queda en las métricas del cron).
- **Ventana sin datos** (0 requests, 0 conversiones) → correo de "semana tranquila", no un error.

## 10. Testing y verificación

- **Vitest** sobre funciones puras con `fetch` inyectado/mockeado:
  - `dates`: ventanas 7d actual/previa correctas.
  - `report`: totales, `topLanding`, deltas WoW, disparo de `alerts`.
  - `render`: MIME válido, base64url correcto, HTML bien formado, texto plano presente.
  - `summarize`: usa el fallback por reglas cuando la IA "falla" (mock que lanza).
  - `cloudflare`/`supabase`: parseo correcto de respuestas de ejemplo y manejo de error → degradado.
- **Gate de tipos:** esto **no es Astro** → el gate es `tsc --noEmit` (+ `wrangler types` para tipos del runtime). No aplica `astro check`.
- **Verificación E2E real:** disparo manual vía el endpoint `fetch` protegido con `TRIGGER_TOKEN`; se confirma que el correo llega a la bandeja y se captura **evidencia** (screenshot) en `docs/evidence/`.

## 11. Integración con el repo

- Nueva fila **reto-06** en la tabla de retos del README raíz y en el árbol de estructura, igual que los demás.
- README propio en `reto-06/` documentando: qué es, stack, setup OAuth de Gmail, secretos requeridos, cómo desplegar (`wrangler deploy`), cómo disparar manualmente, y evidencia.

## 12. Riesgos y cosas a verificar en implementación

- **Retención de analytics en plan free:** el dataset `workersInvocationsAdaptiveGroups` vía GraphQL puede tener retención corta en free (posiblemente < 7 días). Si la ventana de 7d excede la retención, se toma lo disponible y se marca en el reporte; la ventana es configurable.
- **Nombres exactos de los Workers** (`scriptName` de parla/altura/radar-digital/golazo): confirmar contra `wrangler` / dashboard.
- **Columnas de fecha** en `leads` y `preorders`: confirmar `created_at` (o equivalente) para el filtro de ventana.
- **Formato del MIME / base64url**: Gmail exige base64url (no base64 estándar) del mensaje RFC 2822 completo; se cubre con un test.
- **Alcance del refresh token:** debe emitirse con `access_type=offline` y `prompt=consent` para que Google entregue un refresh token duradero.
