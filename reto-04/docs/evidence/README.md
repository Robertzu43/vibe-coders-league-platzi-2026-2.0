# Evidencia de la corrida real — Nido (reto 04)

Corrida end-to-end del workflow de n8n **"Nido — Agenda tu tour"** (`NmKsQSikWeKO3NwF`, activo/publicado en `robertzu43.app.n8n.cloud`), operado vía el MCP oficial de n8n. Fecha: 2026-07-14.

> Nota: la evidencia aquí son los **registros de ejecución de n8n** + el **contenido real de la Google Sheet** (capturados vía API), no capturas de pantalla. Cada ejecución corrió los 5 nodos de verdad: el correo salió por Gmail, la fila se escribió en Sheets y el mensaje llegó a Telegram.

## Cadena ejecutada

`Form Trigger → Clasificar lead (Code) → Preparar fila (Set) → Google Sheets (append) → Gmail (send) → Telegram (sendMessage)`

4 acciones automáticas encadenadas tras el trigger (clasificar → guardar → correo → notificar), con un paso real de decisión (clasificación por tamaño de equipo).

## 3 casos de prueba (los 3 arquetipos), todos `success`

| Ejecución | Equipo | Segmento | Plan sugerido | Prioridad | Estado |
|---|---|---|---|---|---|
| #5 | 1 | Independiente | Hot-desk flexible | Normal | ✅ success |
| #6 | 5 | Equipo pequeño | Oficina privada | Alta | ✅ success |
| #7 | 20 | Enterprise | Piso dedicado | 🔥 Hot lead | ✅ success |

(Una primera tanda de pruebas —ejecuciones #1–#3— también corrió en verde; luego se limpió la hoja y se re-corrió con el correo personal para dejar los datos definitivos.)

## Efecto 1 — Google Sheets (dato guardado de verdad)

Contenido final de la hoja "Nido — Tours" (pestaña `Sheet1`), 11 columnas, 3 filas:

```
timestamp                | nombre        | email                 | empresa       | tamano_equipo | dia_tour   | segmento       | plan_sugerido     | prioridad | clasificacion_incierta | mensaje
2026-07-14T20:53:14.837Z | Laura Pérez   | robertzu43@gmail.com  | Freelance     | 1             | 2026-07-21 | Independiente  | Hot-desk flexible | Normal    | FALSE                  | Trabajo sola, busco un puesto
2026-07-14T20:53:26.921Z | Carlos Gómez  | robertzu43@gmail.com  | Estudio Gómez | 5             | 2026-07-22 | Equipo pequeño | Oficina privada   | Alta      | FALSE                  |
2026-07-14T20:53:33.111Z | María Torres  | robertzu43@gmail.com  | TechCorp      | 20            | 2026-07-23 | Enterprise     | Piso dedicado     | Hot lead  | FALSE                  | Necesitamos un piso para el equipo
```

## Efecto 2 — Gmail (correo de confirmación al prospecto)

Los 3 correos se enviaron (nodo Gmail devolvió `labelIds: ["SENT"]`) a `robertzu43@gmail.com`, personalizados por segmento. Ejemplo del asunto/cuerpo (caso equipo de 1):

```
Asunto: Tu tour en Nido esta confirmado, Laura

Hola Laura,

Gracias por agendar tu tour en Nido. Te esperamos el 2026-07-21 en:
Nido - Cra. 13 #93-40, Chapinero, Bogota

Segun nos contaste (equipo de 1), creemos que el plan ideal para ti es:
Hot-desk flexible (Independiente)

En la visita te mostramos el espacio, resolvemos tus dudas y armamos una propuesta a tu medida.

Nos vemos pronto,
El equipo de Nido
```

## Efecto 3 — Telegram (alerta interna al equipo)

Los 3 mensajes llegaron al chat del equipo (bot **@Nido2026bot**), `ok:true`. El caso enterprise se marca con `HOT LEAD -` al inicio para priorizar el seguimiento. Ejemplo (caso equipo de 20):

```
HOT LEAD - Nuevo tour agendado en Nido
Nombre: María Torres
Empresa: TechCorp
Correo: robertzu43@gmail.com
Equipo: 20 personas
Dia del tour: 2026-07-23
Segmento: Enterprise
Plan sugerido: Piso dedicado
Prioridad: Hot lead
Mensaje: Necesitamos un piso para el equipo
```

## Robustez

- Gmail y Telegram tienen `onError: continueRegularOutput`: un fallo de notificación no tumba el resto de la cadena ni pierde el lead (la fila ya quedó guardada).
- El nodo **Preparar fila** (Set) recorta el item a exactamente las 11 columnas del lead antes de escribir en Sheets, para que la hoja quede limpia; el correo/Telegram leen el texto completo desde el nodo **Clasificar lead**.
