# Anotado 🐝 · reto en vivo 02

**El gestor de tickets que nadie tiene que usar.**

Reto (en vivo): resolver un problema real de trabajo. El problema: existen Miro, Monday y compañía, pero el equipo no los usa en la realidad.

## El diagnóstico

El problema no es la herramienta — es que le pedís a tu equipo que vaya a un lugar nuevo. Abrir la app, loguearse, elegir proyecto, asignado, prioridad, etiqueta. Nadie lo hace, porque el trabajo pasa en el chat y el ticket pasa en una herramienta que nadie abre.

## La colmena

En una colmena nadie llena formularios. Cada obrera reporta lo que ve, y el panal se organiza solo.

Eso es Anotado. **El equipo escribe en el chat como siempre** y la IA arma el ticket: título, área, prioridad. El bot contesta *"listo, anotado ✅"*. Cero formularios, cero login, cero capacitación.

```
Telegram (@vibeliga_bot)  →  Worker /tg  →  Workers AI  →  D1  →  el panal
      "perdí mis                 extrae y             el tablero
       credenciales"             evalúa               se llena solo
```

## Lo que la colmena resuelve sola

Al entrar, la IA además evalúa si el ticket **necesita manos humanas o no**. Un reset de contraseña, un acceso a una carpeta, reenviar una factura: eso lo puede hacer un bot entero.

Cuando lo detecta, la tarjeta muestra la acción concreta y un botón: **"Autorizar a la colmena"**. Vos decidís, la colmena ejecuta, el ticket pasa a Resuelto con lo que se hizo. El humano nunca pierde el control — solo deja de hacer el trámite.

Nada físico se automatiza. Las reglas vetan a la IA: si el mensaje habla de una puerta, un motor o una impresora, el botón no aparece aunque el modelo se entusiasme.

> La ejecución es **simulada** — el valor del reto es la decisión, no el side effect. Cablearla de verdad es un `fetch` por acción (Gmail para los resets, la API de accesos para los permisos).

## El tablero

https://anotado.robertzu43.workers.dev

Cuatro estados, arrastrables: **Recibido → En proceso → En espera → Resuelto**. Drag & drop nativo del navegador, sin librerías; el movimiento se persiste en D1. Se refresca cada 2s y las tarjetas nuevas caen con animación — el jefe ve entrar el trabajo en vivo.

Cada tarjeta guarda el mensaje original textual. Nadie puede decir *"yo ya te dije"*.

## Stack

Un Worker, dos archivos. Sin build, sin framework, sin dependencias.

- **Cloudflare Workers** — `src/index.ts` lógica, `src/board.ts` el panal
- **Workers AI** `@cf/meta/llama-3.3-70b-instruct-fp8-fast` con `response_format: json_schema`
- **D1** — una tabla
- **Telegram Bot API** — webhook protegido con `secret_token`

Si la IA falla, `porReglas()` clasifica por palabras clave y el ticket entra igual. Nunca se pierde un mensaje.

## Endpoints

| | |
|---|---|
| `GET /` | el panal |
| `GET /api/tickets` | JSON |
| `POST /api/move` | `{id, estado}` — valida el estado |
| `POST /api/resolver` | `{id}` — 409 si el ticket necesita manos humanas |
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

**Gotcha:** después de `wrangler deploy`, el edge tarda ~30s en servir la versión nueva de forma consistente. Verificar E2E antes de eso devuelve la versión vieja.

## Lo que no tiene

Login, editar, borrar, multi-proyecto, asignación manual. Un gestor de tickets con adopción real primero tiene que probar que la adopción funciona; lo demás es CRUD.
