# Nido — Automatización de tours post-captura (n8n) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **⚠️ Este plan NO es TDD con Vitest.** El entregable es un *workflow de n8n* construido en n8n Cloud vía su **MCP server**, no código con pruebas unitarias. La disciplina "test-first" se adapta a **verificación-first**: cada tarea define el resultado observable esperado (ejecución de n8n en verde, fila en Sheets, correo recibido, mensaje en Telegram) *antes* de construir, y se verifica corriendo el workflow de verdad.

**Goal:** Construir en n8n Cloud un workflow que hospede el formulario "Agenda tu tour en Nido" y ejecute 4 acciones automáticas encadenadas (clasificar → guardar en Google Sheets → correo de confirmación por Gmail → alerta interna por Telegram), verificado con una corrida real end-to-end, y dejar en el repo el workflow exportado + README + evidencia.

**Architecture:** Un único workflow de n8n. Trigger = *Form Trigger* (n8n hospeda el form). Cadena lineal de nodos: `Form Trigger → Code (clasificar) → Google Sheets (append) → Gmail (send) → Telegram (send)`. La lógica de clasificación es un Code node JS determinista (fuente única del copy dinámico para email/Telegram). Credenciales (Google OAuth, Telegram) viven **solo en n8n**, nunca en el repo.

**Tech Stack:** n8n Cloud (`robertzu43.app.n8n.cloud`) operado vía MCP; nodos Form Trigger, Code, Google Sheets, Gmail, Telegram. Sin build local, sin Vitest.

**Skills relevantes:** @superpowers:verification-before-completion (la corrida real es el criterio de "hecho") · @superpowers:systematic-debugging (si un nodo falla) · Spec: `reto-04/docs/superpowers/specs/2026-07-13-nido-tour-automatizacion-design.md`

---

## Prerrequisitos del CONTROLADOR / humano (NO se comitean)

Antes de la Tarea 2, estos deben existir. Varios requieren acción humana en UIs externas — el implementador debe **pedirlos explícitamente** y detenerse hasta tenerlos:

1. **MCP de n8n conectado** en esta sesión (Tarea 1). Token = secreto; nunca al repo.
2. **Credencial de Google OAuth en n8n** con permisos de **Google Sheets** y **Gmail** (envío). Se conecta en la UI de n8n (Credentials → Google). El implementador confirma que existe y anota su *nombre/ID* de credencial (no su valor).
3. **Google Sheet destino** creado, con una pestaña y la fila de encabezados exacta (Tarea 3). El implementador necesita su *Spreadsheet ID / URL*.
4. **Bot de Telegram**: token de @BotFather + **chat ID** del canal/grupo destino (el bot debe estar añadido al grupo). Se guarda como *credencial de Telegram* en n8n. El implementador necesita el chat ID.

> Si alguno falta, **pausar y pedirlo**. No inventar credenciales ni IDs.

---

## Estructura de archivos (entregables en el repo)

```
reto-04/
├── README.md                       # Tarea 10
├── workflow/
│   └── nido-tour.json              # Tarea 9 — export del workflow, SIN credenciales
├── docs/
│   ├── superpowers/{specs,plans}/  # ya existen
│   └── evidence/                   # Tarea 8 — capturas de la corrida real
└── .mcp.json.example               # Tarea 1 — config del MCP con placeholder del token
```

El repo raíz también añade una fila a la tabla de retos del `README.md` raíz (Tarea 10).

---

## Task 1: Wire del MCP de n8n (sin comitear el secreto)

**Files:**
- Create: `reto-04/.mcp.json.example` (plantilla con placeholder)
- Create/modify: `.mcp.json` en la raíz del worktree (gitignored, con expansión de env var)
- Modify: `.gitignore` (raíz del worktree)

- [ ] **Step 1: Verificar el estado del .gitignore**

Run: `git -C <WT> check-ignore .mcp.json || echo "NO IGNORADO"`
Expected: si imprime `NO IGNORADO`, hay que añadirlo.

- [ ] **Step 2: Añadir `.mcp.json` (y `.env`) al `.gitignore` de la raíz**

Añadir líneas:
```
.mcp.json
.env
```

- [ ] **Step 3: Crear `.mcp.json` con expansión de variable de entorno** (NO commiteado)

```json
{
  "mcpServers": {
    "n8n-mcp": {
      "type": "http",
      "url": "https://robertzu43.app.n8n.cloud/mcp-server/http",
      "headers": { "Authorization": "Bearer ${N8N_MCP_TOKEN}" }
    }
  }
}
```
Exportar el token real fuera de git: `export N8N_MCP_TOKEN='<token>'` (el controlador lo tiene). El token NUNCA entra a un archivo trackeado.

- [ ] **Step 4: Crear `reto-04/.mcp.json.example`** (SÍ commiteado — solo placeholder)

Igual que arriba pero con `"Authorization": "Bearer ${N8N_MCP_TOKEN}"` y un comentario en el README explicando cómo exportar el token.

- [ ] **Step 5: Activar/reconectar el MCP y descubrir sus herramientas**

Reconectar la sesión al MCP (puede requerir aprobación del usuario / reinicio de la sesión de Claude Code). Luego listar las herramientas del MCP `n8n-mcp` (vía ToolSearch) para conocer las operaciones reales disponibles (crear workflow, añadir nodos, activar, ejecutar, exportar). **Las llamadas exactas del MCP en las tareas siguientes se ajustan a lo que exponga el server.**

Verify: una llamada de solo-lectura del MCP responde (p. ej. listar workflows) sin error de auth.

- [ ] **Step 6: Commit** (solo el ejemplo y el gitignore; el `.mcp.json` real queda fuera)

```bash
git -C <WT> add reto-04/.mcp.json.example .gitignore
git -C <WT> commit -m "chore(reto-04): add n8n MCP config example + gitignore secret"
```

---

## Task 2: Crear el workflow y el Form Trigger

**Outcome esperado (verificación-first):** existe un workflow "Nido — Agenda tu tour" en n8n con un Form Trigger que expone una URL pública de formulario con los 6 campos de la spec §5, y su pantalla de finalización.

- [ ] **Step 1:** Crear el workflow vacío vía MCP con nombre `Nido — Agenda tu tour`.
- [ ] **Step 2:** Añadir un nodo **Form Trigger** con título "Agenda tu tour en Nido" y campos (labels exactos, que se convierten en las claves de salida):
  - `Nombre completo` (text, required)
  - `Correo` (email, required)
  - `Empresa` (text, optional)
  - `Tamaño del equipo` (number, required)
  - `Día preferido del tour` (date, required)
  - `Mensaje` (textarea, optional)
- [ ] **Step 3:** Configurar el texto de la pantalla de finalización: *"¡Listo! Te enviamos la confirmación de tu tour al correo. Nuestro equipo te contactará pronto."*
- [ ] **Step 4: Verify** — abrir la URL del Form Trigger en el navegador; confirmar que renderiza los 6 campos con los required correctos. Anotar los **nombres exactos de las claves de salida** (n8n las deriva de los labels) — se usan en la Tarea 4.
- [ ] **Step 5: Commit** (nota: el workflow vive en n8n; el commit aquí es solo si ya se puede exportar un snapshot parcial — si no, se difiere a Tarea 9). Registrar avance en el plan (marcar checkboxes).

---

## Task 3: Preparar la Google Sheet destino

**Outcome esperado:** existe una hoja con la pestaña `Tours` y la fila de encabezados exacta, lista para `append`.

- [ ] **Step 1:** (Humano/controlador) Crear una Google Sheet, pestaña `Tours`, fila 1 con encabezados EXACTOS y en este orden:

```
timestamp | nombre | email | empresa | tamano_equipo | dia_tour | segmento | plan_sugerido | prioridad | clasificacion_incierta | mensaje
```

- [ ] **Step 2: Verify** — el implementador recibe/confirma el Spreadsheet ID y que los encabezados coinciden carácter por carácter con la lista de la spec §7.1.

---

## Task 4: Code node de clasificación

**Outcome esperado:** dado el JSON del Form Trigger, el node emite un objeto con todos los campos normalizados + `segmento`, `plan_sugerido`, `prioridad`, `clasificacion_incierta`, y textos listos para email/Telegram. Verificable con "Execute node" sobre datos de prueba pegados a mano.

**Files:** (lógica que vive en el Code node de n8n; se documenta completa aquí)

- [ ] **Step 1: Definir el resultado esperado por caso** (esto es el "test"):
  - `Tamaño del equipo = 1` → `Independiente / Hot-desk flexible / Normal`
  - `= 5` → `Equipo pequeño / Oficina privada / Alta`
  - `= 20` → `Enterprise / Piso dedicado / 🔥 Hot lead`
  - vacío/inválido → `Independiente / Hot-desk flexible / Normal` + `clasificacion_incierta=true`

- [ ] **Step 2: Escribir el Code node (JavaScript, "Run Once for Each Item")**. Ajustar las claves de entrada a los nombres reales anotados en Tarea 2 Step 4 (aquí se asume el mapeo por label):

```javascript
const j = $input.item.json;

// Mapeo desde los labels del Form Trigger (ajustar si n8n usó otras claves)
const nombre  = String(j['Nombre completo'] ?? '').trim();
const email   = String(j['Correo'] ?? '').trim();
const empresa = String(j['Empresa'] ?? '').trim();
const diaTour = String(j['Día preferido del tour'] ?? '').trim();
const mensaje = String(j['Mensaje'] ?? '').trim();
const n = Number(j['Tamaño del equipo']);

let segmento, plan_sugerido, prioridad;
let clasificacion_incierta = false;

if (!Number.isFinite(n) || n < 1) {
  segmento = 'Independiente'; plan_sugerido = 'Hot-desk flexible'; prioridad = 'Normal';
  clasificacion_incierta = true;
} else if (n <= 2) {
  segmento = 'Independiente'; plan_sugerido = 'Hot-desk flexible'; prioridad = 'Normal';
} else if (n <= 8) {
  segmento = 'Equipo pequeño'; plan_sugerido = 'Oficina privada'; prioridad = 'Alta';
} else {
  segmento = 'Enterprise'; plan_sugerido = 'Piso dedicado'; prioridad = '🔥 Hot lead';
}

const primerNombre = (nombre.split(/\s+/)[0] || nombre);
const DIRECCION = 'Nido · Cra. 13 #93-40, Chapinero, Bogotá';

const emailSubject = `Tu tour en Nido está confirmado, ${primerNombre} 🌱`;
const emailBody =
`Hola ${primerNombre},

¡Gracias por agendar tu tour en Nido! Te esperamos el ${diaTour || 'día acordado'} en:
${DIRECCION}

Según nos contaste (equipo de ${Number.isFinite(n) ? n : '—'}), creemos que el plan ideal para ti es:
👉 ${plan_sugerido} (${segmento})

En la visita te mostramos el espacio, resolvemos tus dudas y armamos una propuesta a tu medida.

Nos vemos pronto,
El equipo de Nido`;

const telegramText =
`🏢 *Nuevo tour agendado — Nido*
${prioridad === '🔥 Hot lead' ? '🔥 *HOT LEAD*\n' : ''}*Nombre:* ${nombre}
*Empresa:* ${empresa || '—'}
*Correo:* ${email}
*Equipo:* ${Number.isFinite(n) ? n : 's/d'} personas
*Día del tour:* ${diaTour || 's/d'}
*Segmento:* ${segmento}
*Plan sugerido:* ${plan_sugerido}
*Prioridad:* ${prioridad}${clasificacion_incierta ? '\n⚠️ Clasificación incierta — revisar' : ''}${mensaje ? `\n*Mensaje:* ${mensaje}` : ''}`;

// timestamp: se usa el del item de ejecución; n8n expone $now
const timestamp = $now.toISO();

return { json: {
  timestamp, nombre, email, empresa,
  tamano_equipo: Number.isFinite(n) ? n : '',
  dia_tour: diaTour,
  segmento, plan_sugerido, prioridad,
  clasificacion_incierta,
  mensaje,
  emailSubject, emailBody, telegramText,
}};
```

- [ ] **Step 3: Verify** — usar "Execute step" con datos pegados para los 4 casos del Step 1; confirmar que `segmento/plan_sugerido/prioridad/clasificacion_incierta` coinciden exactamente. Corregir el mapeo de claves si alguno sale vacío.
- [ ] **Step 4:** Marcar checkboxes (avance en el plan).

---

## Task 5: Nodo Google Sheets — Append row

**Outcome esperado:** al ejecutar la cadena Form→Code→Sheets con datos de prueba, aparece **una fila nueva** en la pestaña `Tours` con las 11 columnas correctamente pobladas.

- [ ] **Step 1:** Añadir nodo **Google Sheets** (operación *Append*), credencial Google OAuth de n8n, Spreadsheet ID (Tarea 3), pestaña `Tours`.
- [ ] **Step 2:** Mapear columnas → campos del Code node (`timestamp`→`timestamp`, `nombre`→`nombre`, … `clasificacion_incierta`→`clasificacion_incierta`, `mensaje`→`mensaje`). Usar "map each column manually".
- [ ] **Step 3: Verify** — ejecutar la cadena con el caso `n=5`; confirmar la fila nueva en la hoja con `segmento=Equipo pequeño`, `plan_sugerido=Oficina privada`, `prioridad=Alta`.
- [ ] **Step 4:** Marcar checkboxes.

---

## Task 6: Nodo Gmail — Send

**Outcome esperado:** el prospecto recibe un correo con asunto y cuerpo personalizados por segmento.

- [ ] **Step 1:** Añadir nodo **Gmail** (operación *Send*), credencial Google OAuth.
- [ ] **Step 2:** `To` = `{{$json.email}}`; `Subject` = `{{$json.emailSubject}}`; `Message` = `{{$json.emailBody}}` (texto plano). Conectar después de Sheets.
- [ ] **Step 3: Verify** — ejecutar con `n=1` usando un correo de prueba propio; confirmar recepción y que el cuerpo dice "Hot-desk flexible (Independiente)".
- [ ] **Step 4:** Marcar checkboxes.

---

## Task 7: Nodo Telegram — Send message

**Outcome esperado:** llega al canal interno un mensaje con el resumen del lead + segmento/prioridad; el caso enterprise muestra 🔥.

- [ ] **Step 1:** Añadir nodo **Telegram** (operación *Send Message*), credencial Telegram (bot token), `Chat ID` del canal.
- [ ] **Step 2:** `Text` = `{{$json.telegramText}}`, parse mode = *Markdown*. Conectar después de Gmail.
- [ ] **Step 3: Verify** — ejecutar con `n=20`; confirmar el mensaje en Telegram con 🔥 HOT LEAD y `Prioridad: 🔥 Hot lead`.
- [ ] **Step 4:** Marcar checkboxes.

---

## Task 8: Manejo de errores + corrida end-to-end real (verificación completa)

**Outcome esperado:** los 3 casos de la spec §10 completan la cadena de 4 acciones sin intervención manual; evidencia capturada.

- [ ] **Step 1:** Activar *Continue On Fail* en los nodos Gmail y Telegram (spec §8). Dejar Sheets sin continue-on-fail (paso crítico de persistencia).
- [ ] **Step 2:** **Activar** el workflow (production) y abrir la URL pública del formulario.
- [ ] **Step 3:** Enviar el formulario 3 veces (datos de prueba reales): equipo de **1**, de **5**, de **20**, cada uno con un correo real accesible.
- [ ] **Step 4: Verify (los 4 efectos, por caso):** (a) ejecución en verde en el historial de n8n; (b) 3 filas nuevas en la Sheet con la clasificación correcta; (c) 3 correos recibidos con el plan correcto; (d) 3 mensajes en Telegram (🔥 solo en el de 20).
- [ ] **Step 5: Capturar evidencia** en `reto-04/docs/evidence/`: captura del historial de ejecuciones de n8n, de la Sheet con las 3 filas, de un correo recibido, del canal de Telegram. Anotar los *execution IDs*.
- [ ] **Step 6: Commit** de la evidencia:
```bash
git -C <WT> add reto-04/docs/evidence
git -C <WT> commit -m "docs(reto-04): add end-to-end run evidence (3 casos)"
```

---

## Task 9: Exportar el workflow al repo (sin credenciales)

**Outcome esperado:** `reto-04/workflow/nido-tour.json` es un export reproducible que NO contiene valores de credenciales.

- [ ] **Step 1:** Exportar el workflow vía MCP (o UI → Download) a `reto-04/workflow/nido-tour.json`.
- [ ] **Step 2: Verify (crítico):** revisar el JSON — debe referenciar credenciales por ID/nombre, **nunca** contener tokens/keys. Buscar: `grep -iE 'bearer|token|secret|apikey|password|AIza|xoxb' reto-04/workflow/nido-tour.json` → esperado: sin coincidencias con valores reales. Redactar el Spreadsheet ID y el Chat ID si se consideran sensibles (o dejarlos, son de bajo riesgo — decidir y anotar).
- [ ] **Step 3: Commit:**
```bash
git -C <WT> add reto-04/workflow/nido-tour.json
git -C <WT> commit -m "feat(reto-04): add exported n8n workflow (Nido tour automation)"
```

---

## Task 10: README del reto + tabla del repo raíz

**Files:**
- Create: `reto-04/README.md`
- Modify: `README.md` (raíz — tabla de retos + estructura)

- [ ] **Step 1:** Escribir `reto-04/README.md` siguiendo el estilo de los retos 01–03: producto (Nido), qué hace, el flujo (diagrama), herramientas conectadas (n8n + Form Trigger + Sheets + Gmail + Telegram), las 4 acciones, seguridad de credenciales, cómo importar el workflow (`workflow/nido-tour.json`) y correrlo, prerrequisitos (credenciales), evidencia, y una tabla "Cómo cumple el reto".
- [ ] **Step 2:** Documentar en el README cómo exportar `N8N_MCP_TOKEN` y usar `.mcp.json.example`.
- [ ] **Step 3:** Añadir la fila de reto-04 a la tabla del `README.md` raíz y a la sección de estructura.
- [ ] **Step 4: Verify** — leer ambos README; links y rutas correctos; no hay secretos.
- [ ] **Step 5: Commit:**
```bash
git -C <WT> add reto-04/README.md README.md
git -C <WT> commit -m "docs(reto-04): add README and link in root README"
```

---

## Task 11: Cierre de rama

- [ ] **Step 1:** REQUIRED SUB-SKILL: usar @superpowers:finishing-a-development-branch para decidir merge/PR/limpieza.
- [ ] **Step 2:** Confirmar que el `.mcp.json` real y el token NUNCA se comitearon (`git -C <WT> log --all -p | grep -i bearer` → sin el token real).

---

## Notas para el CONTROLADOR (NO se comitean)

- `<WT>` = `/Users/robertozuniga/.config/superpowers/worktrees/vibe-coders-league-platzi-2026-2.0/reto-04-nido`. Todas las rutas `reto-04/...` son relativas a `<WT>`.
- El **token del MCP de n8n** se maneja fuera del repo (env var `N8N_MCP_TOKEN`). Nunca en git ni en prompts de subagentes.
- Las credenciales de Google y Telegram viven **solo dentro de n8n**; el implementador solo necesita nombres/IDs, no valores.
