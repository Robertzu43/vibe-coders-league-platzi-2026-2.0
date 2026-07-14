# Reto 04 — Nido: La automatización que responde por ti después de capturar el lead

*Vibe Coders League Platzi 2026 · Edición 2.0*

## El reto

Capturar un lead es solo el comienzo: **un lead que no recibe respuesta en minutos, se enfría.** Este reto construye el sistema que trabaja *después* de que un cliente deja sus datos — una automatización que **responde, organiza y avisa**, sin que nadie toque nada. Requisito central: al menos **3 acciones automáticas encadenadas** que se ejecuten **de verdad, de principio a fin**, con datos reales.

## El producto (inventado)

**Nido** — espacios de trabajo flexibles en Bogotá: *hot-desk*, oficinas privadas y pisos dedicados (enterprise). Gancho: *"Tu oficina lista para crecer."* El interesado **agenda una visita guiada ("tour")** dejando sus datos, y el sistema le responde en segundos con la confirmación y el plan recomendado, mientras avisa al equipo de Nido para un seguimiento humano rápido — para que el lead no se enfríe.

## Qué hace (enfoque 100% n8n)

Todo vive en un único **workflow de n8n**: n8n **hospeda el formulario** (nodo *Form Trigger*) y ejecuta la cadena completa. No hay app web propia — el corazón del reto es la orquestación.

```
[Form Trigger: "Agenda tu tour en Nido"]
        │
        ▼
[1. Clasificar lead]         Code node — regla determinista por tamaño de equipo
        │                     → segmento, plan_sugerido, prioridad + copy de email/Telegram
        ▼
[2. Guardar en Google Sheets]   Append row — el registro real del lead
        │
        ▼
[3. Email de confirmación]      Gmail — personalizado al prospecto
        │
        ▼
[4. Alerta interna]             Telegram — al canal del equipo Nido
        │
        ▼
[Pantalla: "¡Listo! Revisa tu correo"]
```

**4 acciones automáticas encadenadas** tras el trigger (clasificar → guardar → correo → notificar): supera el mínimo de 3 e incluye un paso real de **decisión**, no solo relays.

### El paso de clasificación (la "inteligencia")

Un Code node determinista deriva el segmento a partir del tamaño del equipo:

| Tamaño del equipo | Segmento | Plan sugerido | Prioridad |
|---|---|---|---|
| 1–2 | Independiente | Hot-desk flexible | Normal |
| 3–8 | Equipo pequeño | Oficina privada | Alta |
| 9 o más | Enterprise | Piso dedicado | 🔥 Hot lead |

Entrada inválida/vacía → Independiente + `clasificacion_incierta = true` (se persiste en la hoja para revisión humana). El mismo node arma el asunto/cuerpo del correo y el texto de Telegram, para que el copy dinámico tenga **una sola fuente**.

## Tech stack / herramientas conectadas

- **[n8n](https://n8n.io) Cloud** (`robertzu43.app.n8n.cloud`) — motor de la automatización, operado vía su **MCP server**.
- **Form Trigger** (n8n) — hospeda el formulario público.
- **Google Sheets** — almacén real del lead (append de filas).
- **Gmail** — correo de confirmación personalizado.
- **Telegram** — alerta interna al equipo.

No se usa ninguna API de pago ni IA en runtime; la clasificación es una regla determinista.

## Seguridad

- Las credenciales de **Google (Sheets + Gmail)** y de **Telegram** viven **solo dentro de n8n** (Credentials). Nunca en el repo.
- El **token del MCP de n8n** es un secreto: se referencia por expansión de variable de entorno (`${N8N_MCP_TOKEN}`) en `.mcp.json` (gitignored) y el valor real vive fuera de git. Ver `.mcp.json.example`.
- El **workflow exportado** (`workflow/nido-tour.json`) referencia credenciales por selección en la UI, **no contiene tokens ni llaves** (verificado con un escaneo de secretos).

## Estructura

```
reto-04/
├── README.md
├── .mcp.json.example              # plantilla del MCP de n8n (token por env var)
├── workflow/
│   └── nido-tour.json             # workflow de n8n, importable, sin credenciales
└── docs/
    ├── superpowers/{specs,plans}/ # diseño + plan de implementación
    └── evidence/                  # capturas de la corrida real (ver estado abajo)
```

## Cómo importar y correr

> **Requisitos previos (una sola vez, en tu cuenta):**
> 1. Una cuenta de **n8n** (aquí: n8n Cloud).
> 2. Una **credencial de Google OAuth** en n8n con acceso a **Sheets** y **Gmail**.
> 3. Un **bot de Telegram** (via [@BotFather](https://t.me/botfather)) añadido a tu grupo/canal, y su **chat ID**, guardados como credencial de Telegram en n8n.

1. **Importar el workflow:** en n8n → *Workflows* → *Import from File* → `workflow/nido-tour.json`.
2. **Conectar credenciales:** abre cada nodo y selecciona la credencial correspondiente:
   - *Guardar en Google Sheets* → credencial de Google Sheets. La hoja destino ya existe: **"Nido — Tours"** (`1zCasISyvhFcVWZJUazQnAtcDB1AWy1mGBOEEsaTlLvI`), pestaña con los 11 encabezados. Confirma que el documento y la pestaña quedaron seleccionados en los dropdowns.
   - *Email de confirmación* → credencial de Gmail.
   - *Alerta interna (Telegram)* → credencial de Telegram; reemplaza `REEMPLAZA_CON_TU_CHAT_ID` por tu chat ID real.
3. **Activar** el workflow y abrir la **URL del Form Trigger** (n8n la muestra en el nodo).
4. **Probar de verdad:** envía el formulario con datos de prueba (equipos de 1, 5 y 20) y verifica los 4 efectos: fila en Sheets, correo recibido, mensaje en Telegram (🔥 en el de 20), y ejecución en verde en el historial de n8n.

### Nota sobre versiones de nodos

El JSON usa versiones recientes de nodos (`formTrigger` 2.2, `code` 2, `googleSheets` 4.5, `gmail` 2.1, `telegram` 1.2). Si tu instancia de n8n propone una migración de versión al importar, acéptala.

## Estado de la corrida real

El workflow está **construido y listo para importar**, con la hoja de Google ya creada. La **corrida end-to-end con evidencia** (`docs/evidence/`) queda pendiente de conectar las credenciales de Google/Telegram dentro de n8n y crear el bot de Telegram — pasos que requieren acceso a esas cuentas. Una vez conectadas, la verificación es directa (paso 4 de arriba).

## Cómo cumple el reto

| Requisito | Estado |
| --- | --- |
| Formulario/landing/herramienta donde el cliente deja datos | ✓ (Form Trigger de n8n) |
| ≥3 acciones automáticas encadenadas | ✓ (4: clasificar → Sheets → Gmail → Telegram) |
| Va más allá de notificar (enriquecer/clasificar/asignar) | ✓ (paso de clasificación + plan sugerido por segmento) |
| El flujo se ejecuta de verdad, end-to-end, con datos reales | ⧗ Listo para correr; evidencia pendiente de credenciales (ver arriba) |
