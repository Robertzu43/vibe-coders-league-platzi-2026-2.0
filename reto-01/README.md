# Reto 01 — Parla: El asistente que responde por tu negocio

> Vibe Coders League Platzi 2026 · Edición 2.0

## El negocio: Parla

**Parla** es una academia de idiomas online con sede física en Bogotá (Chapinero). Enseña las
4 lenguas más habladas del mundo: **Inglés, Mandarín, Hindi y Español**. Su eslogan es
**"Idiomas sin miedo"** y su mascota / asistente virtual es **Kiko 🦜**, un loro con un tono
divertido, desenfadado y cercano — nada de solemnidad corporativa.

## Qué hace el asistente

Kiko vive en un chat embebido en la landing de Parla y hace tres cosas:

1. **Responde preguntas del negocio** (precios, horarios, sede, modalidades, reembolsos,
   descuentos, certificaciones, etc.) usando como única fuente de verdad una base de
   conocimiento estructurada con datos concretos del negocio.
2. **Admite cuando no sabe algo y no inventa.** Si le preguntan por algo fuera de la base de
   conocimiento (un curso de francés, parqueadero, un precio inexistente...), Kiko reconoce con
   gracia que no tiene esa info y redirige a WhatsApp/correo en vez de alucinar una respuesta.
3. **Hace un diagnóstico adaptativo de nivel** (extra): si el usuario quiere evaluar su nivel en
   uno de los 4 idiomas, Kiko le hace preguntas de dificultad creciente **en ese idioma** y cierra
   con un veredicto según el Marco Común Europeo de Referencia (MCER, A1 → C2) y una
   recomendación de curso.

## Tech stack

- **Astro 6** (`output: 'server'`) como framework de la landing + API routes.
- **`@astrojs/cloudflare`** como adapter — despliegue a **Cloudflare Workers**.
- **Cloudflare Workers AI** como motor del asistente, vía el binding `AI` (sin API key externa).
  Modelo: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (definido en `src/lib/system-prompt.ts`).
- **TypeScript vanilla** para el widget de chat en el cliente (sin frameworks de UI).
- **Vitest** para pruebas unitarias.

## Estructura del proyecto

```
src/
  data/
    knowledge-base.ts       # única fuente de verdad: datos del negocio
    knowledge-base.test.ts
  lib/
    system-prompt.ts        # arma el prompt de sistema de Kiko + define el modelo (MODEL)
    system-prompt.test.ts
  pages/
    index.astro              # landing
    api/chat.ts               # endpoint del chat (llama a Workers AI)
  components/                 # Hero, Idiomas, Modalidades, Precios, FAQ, ChatWidget, Diagnostico, Footer
  scripts/
    chat-widget.ts            # lógica del widget de chat embebido (vanilla TS)
  styles/
    global.css, chat.css
scripts/
  eval.mjs                    # evaluación manual del asistente (ver abajo)
```

## Cómo correr localmente

```bash
npm install

# necesario: el binding de Workers AI llama al servicio real de Cloudflare
# incluso en modo dev, así que hace falta estar autenticado
npx wrangler login

npm run dev      # abre http://localhost:4321

npm test         # tests unitarios: base de conocimiento + system prompt

npm run eval     # evaluación manual del asistente (requiere el dev server corriendo)
```

`npm run eval` dispara una serie de preguntas guionizadas contra `/api/chat` y imprime
pregunta + respuesta para revisión humana. Como la salida de un LLM no es determinista, esto
es una evaluación manual, no un conjunto de asserts automáticos — hay que leer cada respuesta
y verificar si cumple lo esperado.

## Cómo desplegar

```bash
npm run deploy   # astro build && wrangler deploy → Cloudflare Workers (*.workers.dev)
```

## Cómo cumple el reto

| Requisito | Cumple |
|---|---|
| Base de conocimiento con ≥10 datos concretos del negocio | ✓ (`factCount()` en `src/data/knowledge-base.ts` devuelve 24) |
| Responde correctamente lo que está en la base de conocimiento | ✓ |
| Admite lo que no sabe, sin inventar | ✓ (regla explícita en el system prompt) |
| Tono definido y coherente | ✓ — Kiko 🦜, divertido y desenfadado, "Idiomas sin miedo" |
| Canal de acceso | ✓ — chat embebido en la landing propia de Parla |
| Extra | ✓ — diagnóstico adaptativo de nivel (MCER A1–C2) |
