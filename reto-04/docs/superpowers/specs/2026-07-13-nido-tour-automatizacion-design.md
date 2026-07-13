# Reto 04 — Nido: La automatización que responde por ti después de capturar el lead

> Vibe Coders League Platzi 2026 · Edición 2.0
> Fecha: 2026-07-13 · Estado: Diseño aprobado

## 1. Objetivo del reto

Capturar un lead es solo el comienzo: un lead que no recibe respuesta en minutos, se enfría. Este reto construye el **sistema que trabaja después** de que un cliente deja sus datos: una automatización que responde, organiza y avisa, sin que nadie toque nada. Requisitos:

- Un formulario, landing o herramienta donde el cliente deje sus datos.
- **Al menos 3 acciones automáticas encadenadas** (p. ej. correo de bienvenida + registro en hoja/CRM + notificación a un canal).
- El flujo debe **ejecutarse de verdad, de principio a fin, con datos de prueba reales**.
- Se decide libremente qué herramientas conectar y qué tan lejos llevar el flujo (enriquecer, clasificar, asignar vendedor…).

## 2. Decisión de enfoque: 100% n8n

Todo el reto se resuelve dentro de **n8n Cloud** (instancia `robertzu43.app.n8n.cloud`), operado vía su **MCP server**. n8n **hospeda el formulario** (nodo *Form Trigger*) y ejecuta la cadena completa de acciones. No se construye una landing Astro separada: el punto de entrada y toda la automatización viven en un único workflow de n8n.

Esto se aparta del patrón "app Astro + Cloudflare Workers" de los retos 01–03 de forma deliberada: el corazón de **este** reto es la orquestación, no una UI. El entregable en el repo es el **workflow exportado + documentación + evidencia** de una corrida real, no una aplicación.

## 3. El producto (inventado)

**Nido** — espacios de trabajo flexibles en Bogotá: *hot-desk*, oficinas privadas y pisos dedicados (enterprise). Gancho: *"Tu oficina lista para crecer."*

El interesado agenda una **visita guiada ("tour")** dejando sus datos. El sistema le responde en segundos —confirmación por correo + plan recomendado— y avisa al equipo de Nido para seguimiento humano rápido, de modo que el lead **no se enfríe**.

**Para quién:** independientes, equipos pequeños y empresas que buscan espacio de trabajo y evalúan visitar antes de decidir.

## 4. Arquitectura (un solo workflow de n8n)

Cadena lineal disparada por el formulario hospedado en n8n:

```
[Form Trigger: "Agenda tu tour en Nido"]
        │
        ▼
[1. Clasificar lead]        Code node — regla determinista por tamaño de equipo
        │                    → segmento, plan_sugerido, prioridad, texto de tour
        ▼
[2. Guardar en Google Sheets]   Append row — el "data store" real
        │
        ▼
[3. Email de confirmación]      Gmail — personalizado al prospecto
        │
        ▼
[4. Alerta interna]             Telegram — al canal del equipo Nido
        │
        ▼
[Form completion: "¡Listo! Revisa tu correo"]
```

**4 acciones automáticas encadenadas** tras el trigger (clasificar → guardar → email → notificar): supera el mínimo de 3 e incluye un paso real de **decisión** (clasificación), no solo relays.

## 5. El formulario (nodo Form Trigger)

Formulario público hospedado por n8n. Campos:

| Campo | Tipo | Requerido |
|---|---|---|
| Nombre completo | texto | Sí |
| Correo | email | Sí |
| Empresa | texto | No |
| Tamaño del equipo | número | Sí |
| Día preferido del tour | fecha | Sí |
| Mensaje | texto largo | No |

Pantalla de finalización: *"¡Listo! Te enviamos la confirmación de tu tour al correo. Nuestro equipo te contactará pronto."*

## 6. Paso de clasificación (la decisión)

Un **Code node** (JavaScript, determinista) deriva `segmento`, `plan_sugerido` y `prioridad` a partir del tamaño del equipo:

| Tamaño del equipo | Segmento | Plan sugerido | Prioridad |
|---|---|---|---|
| 1–2 | Independiente | Hot-desk flexible | Normal |
| 3–8 | Equipo pequeño | Oficina privada | Alta |
| 9 o más | Enterprise | Piso dedicado | 🔥 Hot lead |

Regla exacta: `n = Number(tamaño)`. `n <= 2` → Independiente. `n <= 8` → Equipo pequeño. `n >= 9` → Enterprise. Entrada inválida o vacía (`NaN`, `< 1`) → Independiente + prioridad Normal, con una nota `clasificacion_incierta = true` para revisión humana. El node también compone un saludo y un texto de confirmación de tour reutilizados por los nodos de email y Telegram (fuente única del copy dinámico).

## 7. Las 3+ acciones (detalle)

1. **Google Sheets — Append row.** Hoja `Nido — Tours` con columnas: `timestamp`, `nombre`, `email`, `empresa`, `tamano_equipo`, `dia_tour`, `segmento`, `plan_sugerido`, `prioridad`, `mensaje`. Este es el registro real del lead (equivalente a "hoja/CRM" del reto).
2. **Gmail — Send.** Correo personalizado al prospecto: saludo por nombre, confirmación del día del tour, dirección de Nido, el **plan recomendado** según su tamaño de equipo y qué esperar en la visita. Asunto: *"Tu tour en Nido está confirmado, {nombre} 🌱"*.
3. **Telegram — Send message.** Mensaje al canal interno del equipo de Nido con: nombre, empresa, correo, tamaño de equipo, día del tour, **segmento + plan + prioridad**. Los hot leads (9+) se marcan con 🔥 para priorizar el seguimiento.

## 8. Manejo de errores y degradación

- **Telegram** con *Continue On Fail*: si la notificación interna falla, el correo al cliente **ya se envió** y la fila **ya se guardó** — el lead no se pierde.
- **Gmail** con *Continue On Fail* + registro del error: si el correo falla, la fila en Sheets y la alerta interna igual ocurren, y queda traza en el log de ejecución de n8n para reintento manual.
- **Google Sheets** es el paso más crítico (persistencia); si falla, se registra el error en el log de n8n. (Opcional: un *Error Trigger workflow* que notifique fallos por Telegram.)
- Todos los errores quedan visibles en el **historial de ejecuciones** de n8n. Espíritu de degradación elegante consistente con retos 02/03.

## 9. Datos y credenciales (seguridad)

- **Google (Sheets + Gmail):** credencial OAuth conectada dentro de n8n. Ningún secreto de Google vive en el repo.
- **Telegram:** bot token (via @BotFather) + chat/channel ID de destino, guardados como **credencial de n8n**, nunca en el repo.
- **Token del MCP de n8n:** es un secreto. **No** se comitea. Se referencia por expansión de variable de entorno en `.mcp.json` y el token real vive fuera de git (variable de entorno / archivo gitignored).
- El **workflow exportado** (`workflow/nido-tour.json`) se revisa antes de comitear para asegurar que **no contenga credenciales** (n8n exporta referencias a credenciales por ID/nombre, no sus valores; aun así se verifica).

## 10. Verificación (cómo probamos que corre de verdad)

Como es n8n (no código con Vitest), la evidencia es una **corrida end-to-end real**:

1. Enviar el formulario con datos de prueba (3 casos: equipo de 1, de 5 y de 20 → los tres segmentos).
2. Verificar la **fila** correspondiente en Google Sheets.
3. Verificar el **correo** recibido (contenido personalizado correcto por segmento).
4. Verificar el **mensaje** en Telegram (segmento/prioridad correctos, 🔥 en el caso enterprise).
5. Guardar **capturas** + el **ID/log de ejecución** de n8n como evidencia en `docs/evidence/`.

Criterio de éxito: los 3 casos completan la cadena de 4 acciones sin intervención manual, y la clasificación es correcta en cada uno.

## 11. Entregables en el repo (`reto-04/`)

```
reto-04/
├── README.md                       # reto, producto, diagrama del flujo, herramientas, cómo importar/correr, evidencia
├── workflow/
│   └── nido-tour.json              # export del workflow de n8n (reproducible, sin credenciales)
├── docs/
│   ├── superpowers/
│   │   ├── specs/                  # este documento
│   │   └── plans/                  # plan de implementación
│   └── evidence/                   # capturas de la corrida real (Sheets, correo, Telegram, log n8n)
└── .mcp.json.example               # config del MCP de n8n con placeholder del token (el real, gitignored)
```

## 12. Fuera de alcance (YAGNI)

- Landing Astro / Cloudflare Workers propia (el form lo hospeda n8n).
- Enriquecimiento externo del lead (Clearbit, etc.), asignación automática a un vendedor por nombre, o recordatorio de seguimiento a 24h. Son extensiones plausibles pero no necesarias para cumplir "≥3 acciones encadenadas que corren de verdad". Se mencionan como posibles siguientes pasos en el README.
- Tests unitarios Vitest: no aplican a un workflow de n8n; la verificación es la corrida end-to-end documentada.

## 13. Cómo cumple el reto

| Requisito | Cómo se cumple |
|---|---|
| Formulario/landing/herramienta donde el cliente deja datos | Nodo Form Trigger de n8n ("Agenda tu tour en Nido") |
| ≥3 acciones automáticas encadenadas | 4: clasificar → Google Sheets → Gmail → Telegram |
| El flujo se ejecuta de verdad, end-to-end, con datos reales | Corrida documentada con 3 casos + evidencia (§10) |
| Decisiones libres de herramientas / qué tan lejos llevarlo | n8n Cloud + Sheets + Gmail + Telegram; incluye paso de clasificación/decisión |
