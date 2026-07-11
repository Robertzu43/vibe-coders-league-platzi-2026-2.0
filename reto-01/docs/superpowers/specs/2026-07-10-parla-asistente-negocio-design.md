# Reto 01 — Parla: El asistente que responde por tu negocio

> Vibe Coders League Platzi 2026 · Edición 2.0
> Fecha: 2026-07-10 · Estado: Diseño aprobado

## 1. Objetivo del reto

Construir un asistente de IA que conozca un negocio a fondo y responda preguntas de clientes. Requisitos del reto:

- Base de conocimiento real: FAQ, precios, horarios, políticas — **mínimo 10 datos concretos**.
- El asistente responde correctamente preguntas cuya respuesta está en la base de conocimiento y **admite cuando no sabe algo (no inventa)**.
- Un **tono de respuesta definido** y coherente con el negocio.
- Canal/formato a elección: aquí, **chat embebido en una landing propia**.

**Extra sobre el mínimo:** además del Q&A del negocio, el asistente ofrece un **diagnóstico adaptativo de nivel de idioma**.

## 2. El negocio (ficticio, con detalle)

**Parla** — academia de idiomas online + sede física en Bogotá. Eslogan: **"Idiomas sin miedo"**.

Enseña las **4 lenguas más habladas del mundo**: Inglés 🇬🇧, Mandarín 🇨🇳, Hindi 🇮🇳 y Español 🇪🇸 (para extranjeros).

- **Mascota / asistente:** un loro llamado **Kiko** 🦜 — "el loro que habla todos los idiomas". Es la voz del chat.
- **Tono:** divertido y desenfadado. Tutea, celebra los aciertos, usa emojis con mesura, cero solemnidad. Marca fresca y juvenil.
- **Moneda:** pesos colombianos (COP).

## 3. Base de conocimiento (16 datos concretos)

La base de conocimiento es la **fuente única de verdad**. Vive en un solo archivo estructurado y alimenta **tanto** el system prompt del agente **como** las secciones de precios/FAQ de la landing.

| # | Dato | Valor |
|---|------|-------|
| 1 | Idiomas | Inglés, Mandarín, Hindi, Español para extranjeros |
| 2 | Modalidades | Grupal (máx 8 personas), 1-a-1 privado, online en vivo |
| 3 | Niveles | MCER A1 → C2 (~3 meses por nivel en modalidad grupal) |
| 4 | Curso grupal | $189.000 COP/mes · 8 clases/mes (2 por semana) |
| 5 | Clase 1-a-1 | $55.000 COP · sesión de 60 min |
| 6 | Plan intensivo | $650.000 COP/mes · clase diaria de lunes a viernes |
| 7 | Clase de prueba | 1 clase gratis, sin costo |
| 8 | Horarios | Lun-Vie 6:00am–9:00pm · Sáb 8:00am–1:00pm · Dom cerrado |
| 9 | Sede | Chapinero, Bogotá (Calle 63 #11-45) + campus online |
| 10 | Métodos de pago | PSE, tarjeta crédito/débito, Nequi, efectivo en sede |
| 11 | Política de reembolso | 100% si cancelas dentro de los primeros 7 días del mes; después no hay reembolso |
| 12 | Congelamiento | Puedes congelar el plan hasta 1 mes por semestre sin costo |
| 13 | Certificación | Certificado de nivel MCER al aprobar (nota ≥ 70%); preparación para TOEFL, IELTS y HSK |
| 14 | Descuentos | 15% pagando semestre completo · 2x1 trayendo un amigo el primer mes |
| 15 | Profesores | Nativos y certificados; ratio máximo 8 alumnos por grupo |
| 16 | Contacto | WhatsApp +57 300 123 4567 · hola@parla.co · Instagram @parla.idiomas |

## 4. Comportamiento del asistente

El asistente **Kiko** 🦜 tiene tres capacidades:

1. **Responder preguntas del negocio** usando exclusivamente la base de conocimiento (sección 3).
2. **Admitir cuando no sabe.** Si la pregunta cae fuera de la base de conocimiento, lo dice con gracia y ofrece el WhatsApp/correo de contacto. **Nunca inventa datos** (precios, horarios, políticas que no estén en la KB). Se refuerza con:
   - Regla explícita anti-invención en el system prompt.
   - Temperatura baja en la llamada al modelo.
3. **Diagnóstico de nivel adaptativo:**
   - El usuario elige uno de los 4 idiomas.
   - Kiko hace entre **4 y 6 preguntas** de dificultad creciente *en ese idioma*.
   - Evalúa las respuestas y entrega un **nivel MCER estimado (A1–C2)**.
   - Recomienda un curso/plan concreto de Parla acorde al nivel.
   - El flujo es conversacional (una pregunta a la vez) y tiene un final claro (el veredicto de nivel + recomendación).

## 5. Arquitectura técnica

**Stack:** Astro 5 + Cloudflare Pages + **Cloudflare Workers AI (Llama)**. Sin API key externa, cero costo. Mismo ecosistema que la edición 1.

- **Modelo:** `@cf/meta/llama-3.1-8b-instruct` (rápido y gratis en Workers AI). Ajustable si otro modelo de Workers AI da mejor calidad multilingüe.
- **Dirección visual:** "Playful Pop" — amarillo brillante (`#FFE14D`), negro, tipografía chunky redondeada, banderas y acentos de color (coral `#FF5A5F`, azul `#00A3FF`, morado `#7C4DFF`). Máxima energía juvenil.

### Estructura de archivos

```
reto-01/
  src/
    data/knowledge-base.ts     # fuente única: negocio + FAQ + precios + idiomas
    lib/system-prompt.ts       # arma el prompt: tono Kiko + KB + reglas anti-invención + modo diagnóstico
    pages/index.astro          # landing (una sola página, dirección Playful Pop)
    pages/api/chat.ts          # endpoint POST → env.AI (Workers AI / Llama), streaming
    components/                # Hero (con botón grande), Idiomas, Modalidades, Precios,
                               #   Diagnóstico (destacado), FAQ, Footer/contacto
    scripts/chat-widget.ts     # island vanilla TS: modal de chat, historial, streaming
    styles/                    # design tokens y CSS global
  wrangler.jsonc               # binding [ai]
  astro.config.mjs             # adapter Cloudflare
  package.json
  README.md
```

### Flujo de datos

1. Usuario hace clic en el botón grande del Hero → se abre el modal de chat.
2. El widget mantiene el historial de la conversación y lo envía a `POST /api/chat`.
3. El endpoint construye los mensajes (`system` = system-prompt con la KB + historial) y llama a `env.AI.run(model, { messages, stream: true })`.
4. La respuesta se transmite en **streaming** de vuelta al widget y se renderiza incrementalmente.
5. Para el diagnóstico, el mismo endpoint/system-prompt maneja el modo: el system prompt instruye a Kiko a conducir el mini-quiz cuando el usuario lo solicita.

### Landing (secciones)

Hero (con el botón grande "Pregúntale a Kiko" / "Empieza tu diagnóstico") · Idiomas (4 tarjetas) · Modalidades · Precios (desde la KB) · Diagnóstico (feature destacado) · FAQ (desde la KB) · Footer con contacto.

## 6. Estrategia de pruebas

- **Test unitario del constructor del system prompt** (`lib/system-prompt.ts`): verifica que el prompt generado incluye datos clave de la KB (p.ej. precio del curso grupal, horario, política de reembolso) y las reglas anti-invención.
- **Script de evaluación** con preguntas guion:
  - Preguntas cuya respuesta está en la KB (precio, horario, reembolso) → deben responderse correctamente.
  - Preguntas fuera de la KB (p.ej. "¿tienen curso de francés?", "¿hay parqueadero?") → el asistente debe admitir que no sabe y derivar a contacto, **sin inventar**.
- **Verificación manual** del flujo end-to-end: abrir landing, abrir chat, hacer Q&A del negocio y completar un diagnóstico de nivel.

## 7. Cumplimiento del reto

| Requisito | Cómo se cumple |
|---|---|
| KB con ≥10 datos concretos | 16 datos (sección 3) |
| Responde correctamente lo que está en la KB | Q&A vía Workers AI con KB en system prompt + test de evaluación |
| Admite cuando no sabe (no inventa) | Regla anti-invención + temperatura baja + test de rechazo |
| Tono definido y coherente | Kiko 🦜, "divertido y desenfadado", codificado en el system prompt |
| Canal/formato | Chat embebido en landing propia (Astro + Cloudflare) |
| Extra | Diagnóstico de nivel adaptativo (MCER A1-C2) |

## 8. Decisiones abiertas (resueltas)

- Nombre "Parla" y mascota loro "Kiko": **aprobados**.
- Moneda en COP: **aprobada**.
- Base de conocimiento tal como está en la sección 3: **aprobada**.

## 9. Fuera de alcance (YAGNI)

- Sin autenticación de usuarios ni cuentas.
- Sin persistencia de conversaciones (el historial vive solo en la sesión del navegador).
- Sin pasarela de pagos real (los precios son informativos).
- Sin panel de administración ni CMS para la KB (se edita en código).
- Sin RAG / base vectorial: con 16 datos, la KB entra completa en el system prompt.
