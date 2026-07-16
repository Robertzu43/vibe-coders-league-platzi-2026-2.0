# Evidencia — Centinela (reto-07)

**Verificado end-to-end el 2026-07-16.** El agente desplegado en `https://centinela.robertzu43.workers.dev` clasifica bugs con **Workers AI** (structured output) y los enruta a dos destinos reales: **Slack** (P0) y **Google Sheet** (backlog).

## La IA decide (5 casos, `GET /` dry-run → `POST /triage`)

Todos con `fuente: "ia"` (el modelo decide; las reglas son solo fallback):

| Bug | prod | núcleo | datos | prioridad | ruta |
|-----|------|--------|-------|-----------|------|
| Checkout tira 500 al pagar en producción | sí | sí | no | **P0** | Slack |
| Al guardar se sobrescriben datos de otros usuarios | sí | sí | **sí** | **P0** | Slack |
| Ícono del menú corrido en Safari | sí | no | no | backlog | Sheet |
| Crash solo en entorno local con Node 18 | no | no | no | backlog | Sheet |
| Sería genial exportar reportes a PDF | no | no | no | backlog | Sheet |

> La IA aporta sobre las reglas: en el caso 2 detectó `perdidaDatos: true` a partir de "se sobrescriben datos", algo que la heurística por palabras clave no capturaba.

## Envíos reales (`dryRun:false` + `DEMO_TOKEN`)

- **P0 → Slack** — `{"text":"Los usuarios en producción no pueden iniciar sesión, el login devuelve 500..."}` → `{"ok":true,"decision":{"fuente":"ia","prioridad":"P0"},"destino":"slack"}`. Mensaje Block Kit recibido en el canal.
- **backlog → Google Sheet** — `{"text":"Error de ortografía en el footer de la página de contacto"}` → `{"ok":true,"decision":{"fuente":"ia","prioridad":"backlog"},"destino":"sheet"}`. Fila añadida al backlog:

```
2026-07-16T16:28:03Z | Error de ortografía en footer de página de contacto | baja | backlog | frontend
```

## Cómo se reprodujo

```bash
# Demo pública (dry-run, sin efectos): abrir en el navegador
open https://centinela.robertzu43.workers.dev/

# Envío real (P0 → Slack)
curl -s https://centinela.robertzu43.workers.dev/triage \
  -H 'content-type: application/json' \
  -d '{"text":"login devuelve 500 en producción","dryRun":false,"token":"<DEMO_TOKEN>"}'
```

## Nota técnica (bug encontrado y corregido en verificación)

Workers AI, con `response_format: json_schema`, devuelve `response` como **objeto ya parseado** (no string). La primera versión pasaba ese objeto a un extractor de JSON basado en string → excepción silenciosa → caía siempre al fallback por reglas. Se corrigió leyendo `response` como objeto-o-string y añadiendo el `response_format` con el esquema exacto, de modo que el modelo devuelve siempre las claves correctas. (commit `fix(reto-07): use Workers AI structured output ...`).

> _Adjuntar aquí capturas del mensaje en Slack, la fila en la Google Sheet y la demo con los 5 casos._
