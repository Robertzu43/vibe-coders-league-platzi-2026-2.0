# Anotado · reto en vivo 02

**El gestor de tickets que nadie tiene que usar.**

Reto (40 min, en vivo): resolver un problema real de trabajo. El problema: existen Miro, Monday y compañía, pero el equipo no los usa en la realidad.

## El diagnóstico

El problema no es la herramienta — es que le pedís a tu equipo que vaya a un lugar nuevo. Abrir la app, loguearse, elegir proyecto, asignado, prioridad, etiqueta. Nadie lo hace, porque el trabajo pasa en el chat y el ticket pasa en una herramienta que nadie abre.

Así que Anotado no agrega otro tablero que haya que adoptar. **El equipo escribe en el chat como siempre** y la IA arma el ticket.

## Cómo funciona

```
Telegram (@vibeliga_bot)  →  Worker /tg  →  Workers AI  →  D1  →  tablero
       "se trabó la              extrae título,        el tablero
        puerta otra vez"          área, prioridad       se llena solo
```

El bot contesta *"listo, anotado ✅"* con el ticket ya clasificado. Cero formularios, cero login, cero capacitación.

## El tablero

https://anotado.robertzu43.workers.dev

Cuatro estados, arrastrables: **Recién dicho → En eso ando → Trabado → Listo**. Drag & drop nativo del navegador (sin librerías), el movimiento se persiste en D1. Se refresca cada 2s, y las tarjetas nuevas caen con animación — el jefe ve entrar el trabajo en vivo.

Cada tarjeta guarda el mensaje original textual. Nadie puede decir "yo ya te dije".

## Stack

Un solo Worker, un archivo de lógica + un archivo de HTML. Sin build, sin framework, sin dependencias.

- **Cloudflare Workers** — `src/index.ts`
- **Workers AI** `@cf/meta/llama-3.3-70b-instruct-fp8-fast` con `response_format: json_schema`
- **D1** — `schema.sql`, una tabla
- **Telegram Bot API** — webhook protegido con `secret_token`

Si la IA falla, `porReglas()` clasifica por palabras clave y el ticket entra igual. Nunca se pierde un mensaje.

## Endpoints

| | |
|---|---|
| `GET /` | tablero |
| `GET /api/tickets` | JSON |
| `POST /api/move` | `{id, estado}` — valida el estado |
| `POST /api/decir` | `{texto, autor}` — crear sin Telegram (demo) |
| `POST /tg` | webhook, exige `X-Telegram-Bot-Api-Secret-Token` |

## Correr

```sh
npx wrangler d1 execute yatedije --remote --file schema.sql
npx wrangler secret put TG_TOKEN     # token del bot
npx wrangler secret put TG_SECRET    # openssl rand -hex 16
npx wrangler deploy
node --experimental-strip-types check.ts   # check de las reglas de fallback
```

Registrar el webhook:

```sh
curl -X POST "https://api.telegram.org/bot<TOKEN>/setWebhook" \
  -d "url=https://anotado.robertzu43.workers.dev/tg" \
  -d "secret_token=<TG_SECRET>" -d 'allowed_updates=["message"]'
```

## Lo que no tiene

Login, editar, borrar, multi-proyecto, asignación manual. Un gestor de tickets con adopción real primero tiene que probar que la adopción funciona; lo demás es CRUD.
