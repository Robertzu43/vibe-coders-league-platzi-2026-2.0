# Evidencia — Pulso (reto-06)

**Verificado end-to-end el 2026-07-15.** El Worker desplegado en `https://pulso.robertzu43.workers.dev` (cron `0 22 * * 5`) ejecutó el flujo completo con datos **100% reales** y envió el reporte por correo.

## Corrida real (`GET /__run`)

Respuesta HTTP 200:

```json
{
  "ok": true,
  "subject": "Pulso de la liga · 2026-07-09 → 2026-07-16",
  "summary": "Se registraron 264 solicitudes en total, con \"radar-digital\" como la página de destino principal. Las páginas \"golazo\", \"parla\" y \"altura\" recibieron 92, 60 y 16 solicitudes respectivamente. Se generaron 6 leads, sin registros previos. No se reportaron errores en ninguna de las páginas."
}
```

## Datos reales verificados en vivo

**Tráfico — Cloudflare GraphQL Analytics API** (`workersInvocationsAdaptive`, ventana 7d):

| Landing | requests | errores | CPU p50 (µs) |
|---|---|---|---|
| radar-digital | 94 | 0 | 7307 |
| golazo | 92 | 0 | 9119 |
| parla | 60 | 0 | 3165 |
| altura | 16 | 0 | 2823 |
| **Total liga** | **264** | **0** | — |

**Conversiones — Supabase RPC `pulso.weekly_counts`** (publishable key, schema `pulso`): `{ "leads": 6, "preorders": 0 }`.

**Resumen ejecutivo:** generado por Workers AI (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`) interpretando el modelo de datos (no inventa cifras).

**Envío:** Gmail API (OAuth `gmail.send`) → bandeja de `robertzu43@gmail.com`. Prueba de envío aislada previa: message id `19f6846082dfab0f` (labels SENT, INBOX).

## Cómo se reprodujo

```bash
curl -s "https://pulso.robertzu43.workers.dev/__run?token=<TRIGGER_TOKEN>"
```

> _Adjuntar aquí una captura del correo recibido en la bandeja para evidencia visual._
