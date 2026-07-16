# Centinela · el agente que decide por ti — Diseño

**Reto 07 · Vibe Coders League (Edición 2.0)**
Fecha: 2026-07-16 · Estado: aprobado en brainstorming, pendiente de spec review

---

## 1. Contexto

**El reto (Platzi):** "El agente que decide por ti." El salto de automatización a agente: la IA **analiza y decide** qué hacer con cada cosa que llega, en vez de ejecutar una orden fija. Debe incluir:

- **Entrada con contenido variable** (correos, mensajes, respuestas de formulario, comentarios).
- **Un paso de decisión con IA:** el modelo analiza el contenido y lo clasifica/evalúa según criterios definidos.
- **Al menos 2 rutas distintas** según la decisión (p. ej. urgente → Slack; lo demás → hoja).
- **Demostrarlo con al menos 5 casos** donde se vea al agente decidiendo.

**La idea:** "Centinela" — un **agente de triage de bugs para developers**. Llega un reporte de bug (texto libre y variable); la IA lo analiza según criterios de ingeniería (¿está en **producción**?, ¿afecta **funcionalidad núcleo** / hay pérdida de datos?) y **decide** su prioridad, enrutándolo a uno de dos destinos reales. Es exactamente "lo que las empresas quieren implementar y pocos saben construir": triage inteligente de incidencias.

**Problema que resuelve:** los reportes de bugs llegan mezclados; separar lo que exige un hotfix ya de lo que puede esperar consume tiempo y criterio. Centinela aplica ese criterio automáticamente y enruta.

## 2. Objetivos y no-objetivos

**Objetivos**
- Un **Cloudflare Worker** con **Workers AI** que recibe un bug (texto libre) y devuelve una **decisión estructurada**.
- **Paso de decisión con IA** según una **rúbrica definida** (producción + núcleo/pérdida de datos → urgente; resto → backlog), con **fallback determinista por reglas** si la IA falla.
- **2 rutas reales:** P0 → **Slack** (alerta Block Kit); backlog → **Google Sheet** (append de fila = "Jira" accesible).
- **Página de demo** servida por el Worker: analizar un bug pegado + botón "correr 5 casos" que muestra al agente decidiendo.
- Consistente con el patrón de la liga: carpeta `reto-07/` autocontenida, TypeScript, Vitest, `.dev.vars.example`, README, `docs/superpowers/{specs,plans}`.

**No-objetivos (YAGNI)**
- Sin base de datos propia ni panel de administración; el "backlog" es una Google Sheet.
- Sin múltiples canales por ruta: una ruta = un destino (Slack / Sheet).
- Sin autenticación de usuarios; la demo pública es **dry-run**, el envío real va detrás de un token.
- Sin ingestión automática desde correos/issue-trackers reales: la entrada es por la demo o `POST /triage` (el contenido variable se cubre con eso).
- No es Astro: Worker TS puro; la página de demo es HTML servido por el Worker.

## 3. Decisiones tomadas en brainstorming

| Decisión | Elección |
|----------|----------|
| Dominio | Agente de triage de bugs para devs |
| Stack | Cloudflare Worker + Workers AI + página de demo |
| Criterios de decisión | ¿en producción? ¿afecta núcleo / pérdida de datos? → prioridad |
| Rutas | **2**: P0 urgente → Slack · backlog → Google Sheet |
| IA | Workers AI (Llama) devuelve JSON estructurado, con fallback por reglas |
| Backlog | Google Sheet (append vía Sheets API + Google OAuth) |
| Seguridad demo | Demo pública en dry-run; envío real detrás de `DEMO_TOKEN` |

## 4. Arquitectura

**Stack:** Cloudflare Worker (TypeScript puro, sin framework), Wrangler, binding `[ai]` para Workers AI. Sin dependencias de red en runtime salvo tres HTTP: Workers AI (binding), Slack webhook, Google (OAuth + Sheets API).

**Estructura de archivos** (dentro de `reto-07/`, espejo del patrón de la liga):

```
reto-07/
  README.md
  wrangler.toml            # name, main, compatibility_date, [ai], [vars]
  package.json  tsconfig.json  vitest.config.ts
  .dev.vars.example
  src/
    index.ts               # Env; GET / (demo) · POST /triage ; orquesta
    config.ts              # modelo IA, rúbrica/umbrales, zona horaria (no-secreto)
    types.ts               # Decision, TriageResult, Route
    cases.ts               # los 5 casos de ejemplo curados
    lib/
      triage.ts            # decide(): Workers AI → JSON + validación + fallback
      rules.ts             # heurística determinista (fallback + tests)
      route.ts             # decisión → ruta (P0 | backlog)
      slack.ts             # postSlack(): webhook + Block Kit
      sheets.ts            # appendRow(): Google OAuth (refresh→access) + Sheets append
      demo.ts              # HTML de la página de demo (string)
    lib/*.test.ts
  docs/
    superpowers/{specs,plans}/
    evidence/              # captura de Slack + fila en la hoja
```

`index.ts` solo orquesta; cada `lib/*` recibe `fetch`/AI por parámetro (inyectable para tests).

## 5. Entrada (contenido variable)

Un bug llega como texto libre (`{ "text": "..." }`), por dos vías con el mismo motor:
- **Página de demo** (`GET /`): textarea donde se pega/describe el bug.
- **API** (`POST /triage`): `{ text, dryRun?, token? }`.

Contenido variable real: "el checkout tira 500 en producción al pagar" vs "el botón de ayuda se ve gris en móvil" → el agente los trata distinto.

## 6. Paso de decisión con IA

`triage.ts` pasa el bug + la rúbrica a **Workers AI** (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, temperatura baja) pidiendo **JSON estricto**:

```json
{
  "titulo": "Checkout falla al pagar",
  "enProduccion": true,
  "afectaNucleo": true,
  "perdidaDatos": false,
  "severidad": "crítica",
  "area": "pagos",
  "prioridad": "P0",
  "razon": "Bloquea la compra en producción; función núcleo.",
  "accionSugerida": "Hotfix + avisar on-call"
}
```

- `enProduccion`, `afectaNucleo`, `perdidaDatos`: `boolean`
- `severidad`: `crítica | alta | media | baja`
- `prioridad`: `P0 | backlog`
- **Rúbrica (única fuente de verdad del enrutado):** `P0` ⇔ `perdidaDatos` **o** (`enProduccion` **y** `afectaNucleo`). En caso contrario `backlog`. Es decir: la **pérdida de datos** (o corrupción/borrado) es P0 por sí sola, sin importar el entorno; y un bug **en producción que afecta el núcleo** también es P0. La `prioridad` que devuelve la IA se **recalcula/valida** contra esta rúbrica a partir de los tres booleanos (los booleanos mandan; la `prioridad` del modelo es solo sugerencia y se corrige si no coincide).
- **Robustez:** se extrae el bloque `{...}` de la salida, se **valida** (campos y enums), se **deriva `prioridad` de la rúbrica** sobre los booleanos, y si el parseo/validación falla → **fallback por reglas** (`rules.ts`): heurística por palabras clave que setea los mismos booleanos (`producción`/`prod`, `500`/`error`, `caída`/`down`, `no puedo pagar/entrar`, `se borran/pierden datos` → `perdidaDatos`, `cosmético`/`UI`, `local`/`dev`/`staging`, etc.) y aplica la misma rúbrica. El agente **siempre** decide; el resultado marca `fuente: "ia" | "reglas"`.

## 7. Las 2 rutas (destinos reales)

`route.ts` mapea la decisión → ruta; `index.ts` ejecuta el efecto (salvo dry-run):

| Decisión | Ruta | Destino | Contenido |
|---|---|---|---|
| **P0** | `urgente` | **Slack** (Incoming Webhook, Block Kit) | severidad, área, razón, acción sugerida, texto original |
| **backlog** | `registrar` | **Google Sheet** (`values.append`) | fecha, título, severidad, prod, núcleo, área, prioridad, razón, acción |

Dos rutas claramente distintas según la decisión, cada una a un destino real y verificable. La Google Sheet funciona como backlog accesible (un link que se abre y se ve como tablero de tickets).

## 8. Página de demo + los 5 casos

`GET /` sirve HTML (desde `demo.ts`) con:
- **Textarea + "Analizar"** → `POST /triage` en **dry-run**; muestra la decisión (badges: severidad, ¿prod?, ¿núcleo?, prioridad), la **ruta** que tomaría y la razón de la IA.
- **"Correr 5 casos de ejemplo"** → corre los 5 bugs de `cases.ts` (dry-run) y muestra una tabla `bug → decisión → ruta`. Aquí **se ve al agente decidiendo** (cumple ≥5 casos).

**Los 5 casos** (cubren el espacio de decisión):
1. Prod + núcleo, crítico ("checkout tira 500 al pagar en prod") → `enProduccion:true, afectaNucleo:true` → **P0 → Slack**
2. Pérdida de datos ("se borran registros al editar") → `perdidaDatos:true` → **P0 → Slack** (P0 por la cláusula de pérdida de datos, sin importar el entorno)
3. Cosmético móvil ("botón gris desalineado") → todos los booleanos `false` → **backlog → Sheet**
4. Entorno local/no-prod ("falla solo en mi dev con Node 18") → **backlog → Sheet**
5. Mejora/feature ("estaría bueno exportar a CSV") → **backlog → Sheet**

**Seguridad anti-spam:** la demo pública corre en **dry-run** (clasifica y muestra la ruta, sin tocar Slack/Sheet). El **envío real** requiere `DEMO_TOKEN` (`POST /triage` con `token` y `dryRun:false`); se usa para capturar la evidencia end-to-end.

## 9. Destinos: setup (una vez)

- **Slack:** crear un **Incoming Webhook** en un workspace propio → `SLACK_WEBHOOK_URL` (secreto). Centinela postea Block Kit para P0.
- **Google Sheet:** crear hoja "Centinela — Backlog" con una **pestaña llamada `Backlog`** y fila de encabezados; su ID → `SHEETS_ID`. El Worker hace `spreadsheets.values.append` con `range=Backlog!A:J` y `valueInputOption=USER_ENTERED`, vía **Google OAuth** — se reutiliza el **cliente OAuth del reto-06** (misma cuenta), con un **refresh token nuevo** que incluya el scope `https://www.googleapis.com/auth/spreadsheets`. El nombre de la pestaña vive en `config.ts` (`SHEET_TAB = "Backlog"`).

## 10. Configuración y secretos

- **wrangler.toml:** `name = "centinela"`, `main = "src/index.ts"`, `compatibility_date`, `[ai] binding = "AI"`, `compatibility_flags = ["nodejs_compat"]`.
- **Secretos** (`wrangler secret put`, nunca en el repo): `SLACK_WEBHOOK_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, `SHEETS_ID`, `DEMO_TOKEN`.
- **Config no-secreta** (`config.ts` / `[vars]`): modelo IA, umbrales/rúbrica, zona horaria, encabezados de la hoja.
- **`.dev.vars.example`** committeado con placeholders; `.dev.vars` en `.gitignore`.

## 11. Manejo de errores

- IA falla / JSON inválido → **fallback por reglas** (§6). El agente siempre decide.
- Slack o Sheets fallan → se captura y se reporta en la respuesta (`{ ok:false, ruta, error }`); no tumba el request.
- **dry-run** nunca toca destinos externos (demo pública segura).

## 12. Testing y verificación

- **Vitest** sobre funciones puras (con `fetch`/AI inyectables):
  - `rules`: heurística → booleanos + prioridad correcta por caso (incluye los 5 ejemplos; en particular caso 2 `perdidaDatos:true`→P0 y caso 1 prod+núcleo→P0).
  - `route`: decisión (booleanos → rúbrica) → ruta correcta; verifica que `perdidaDatos` sola da P0 aunque `enProduccion:false`.
  - `triage`: parseo/validación del JSON de la IA; **fallback** cuando la IA "falla" (mock que lanza / devuelve basura).
  - `slack`: payload Block Kit bien formado.
  - `sheets`: fila construida correctamente (orden de columnas).
  - Un test que corre **los 5 casos** por el clasificador y verifica la ruta esperada de cada uno.
- **Gate de tipos:** `tsc --noEmit` (no es Astro).
- **Verificación E2E real:** con `DEMO_TOKEN`, correr un P0 (llega a Slack) y un backlog (aparece fila en la hoja); evidencia en `docs/evidence/`.

## 13. Riesgos / a verificar en implementación

- **Salida estructurada de Workers AI:** Llama a veces envuelve el JSON en prosa; el parser extrae el primer bloque `{...}` balanceado y valida, con fallback por reglas. Cubierto por tests.
- **Scope de Sheets en el refresh token:** regenerar el refresh token con `spreadsheets` (el de reto-06 era solo `gmail.send`); mismo cliente OAuth Desktop.
- **Formato de `values.append`:** requiere `valueInputOption=USER_ENTERED` y `range=Backlog!A:J` (pestaña `Backlog`, fijada en §9/§11); crear la hoja con esa pestaña.
- **Diseño de la página de demo:** badges de decisión + tabla de casos; se hará un pase visual cuidado.
