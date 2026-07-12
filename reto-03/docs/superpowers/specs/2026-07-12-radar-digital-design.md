# Reto 03 — Radar Digital: la forma más creativa de capturar leads

> Vibe Coders League Platzi 2026 · Edición 2.0
> Fecha: 2026-07-12 · Estado: Diseño aprobado

## 1. Objetivo del reto

Construir una **herramienta interactiva que la gente quiera usar por sí misma** y que, a cambio del valor que entrega, capture datos de contacto **voluntariamente**. Nada de formularios fríos: primero se da algo útil, después se pide el contacto. Requisitos:

- Herramienta interactiva que dé **valor real** a quien la usa, **antes** de pedirle nada.
- **Intercambio justo:** la persona deja sus datos para recibir su resultado completo / diagnóstico / recomendación.
- Los datos capturados se guardan **de verdad en una base de datos** (Supabase).
- No cuenta un formulario simple de suscripción. **Se evalúa la creatividad del incentivo.**

## 2. El producto (inventado)

**El negocio:** **Órbita** — un estudio pequeño que construye **páginas web + automatizaciones** para negocios pequeños y emprendedores en Colombia/LatAm.

**El lead magnet:** **Radar Digital** — un diagnóstico interactivo de ~2 minutos que le dice a un dueño de negocio qué tan preparado está en dos frentes: **presencia web** y **automatización de procesos**. Entrega valor honesto antes de pedir nada.

**Para quién:** dueños de negocios pequeños / emprendedores que sospechan que "deberían" digitalizarse pero no saben por dónde empezar.

**Propuesta de valor:** en 2 minutos sabes *dónde estás parado* (puntaje + arquetipo, gratis) y *qué hacer al respecto* (informe con recomendaciones priorizadas a tu caso, a cambio del correo).

## 3. El flujo (dónde está el intercambio justo)

1. **Landing** de Radar Digital: gancho + CTA "Haz el diagnóstico (2 min)".
2. **Quiz** de 6–8 preguntas de opción múltiple, interactivo en el navegador, con barra de progreso.
3. **Resultado instantáneo GRATIS** (sin pedir nada): puntaje 0–100 + **arquetipo** con una explicación corta de qué significa. *Aquí ya se entregó valor.*
4. **Gate del informe:** "Tu informe personalizado con las 3–4 acciones prioritarias para *tu* caso está listo. ¿A qué correo te lo enviamos?" → nombre + correo (+ nombre del negocio opcional).
5. **Al enviar:** se guarda en Supabase (de verdad), el **informe completo aparece en pantalla al instante** y además se **envía por correo**.

El gate es honesto: el puntaje/arquetipo son gratis; lo que se desbloquea es el **plan de acción específico**.

## 4. Motor de diagnóstico (reglas, determinista y testeable)

**Dos ejes medidos**; cada respuesta suma puntos en uno u otro:

- **Presencia web:** ¿tienes sitio?, ¿cómo te encuentran hoy (voz a voz / redes / Google)?, ¿se puede comprar/agendar en línea?
- **Automatización:** ¿cómo agendas o tomas pedidos (manual/WhatsApp vs sistema)?, ¿respondes lo mismo una y otra vez a mano?, ¿facturación/seguimiento manual?

**Puntaje** → `puntaje_web` (0–100) y `puntaje_automatizacion` (0–100) → **cuadrante 2×2 = 4 arquetipos**:

| | Automatización baja | Automatización alta |
|---|---|---|
| **Web baja** | 🌱 Negocio Análogo | ⚙️ Motor sin Vitrina |
| **Web alta** | 📣 Vitrina Manual | 🚀 Digital en Marcha |

**El informe** se ensambla de un **catálogo curado de bloques** de recomendación, seleccionados por las respuestas concretas (ej: "agendas por WhatsApp a mano" → bloque *"Automatiza tu agenda"* con pasos y beneficio esperado). Cada informe = **3–4 bloques priorizados** para ese perfil + un cierre. Toda la lógica vive en funciones puras (`lib/diagnostic.ts`, `lib/report.ts`) testeadas con Vitest, siguiendo el patrón de los retos 01/02.

**Umbrales de arquetipo:** cada eje se considera "alto" con puntaje ≥ 50 y "bajo" con < 50 (el punto medio 50 cuenta como alto). Los pesos por respuesta viven en `data/quiz.ts` y se normalizan a 0–100 por eje.

## 5. Datos y captura (Supabase real)

Tabla `public.leads` con RLS **solo-INSERT** (mismo patrón seguro del reto-02: la app usa solo la *publishable key* en el servidor).

```sql
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  email text not null,
  negocio text,                       -- nombre del negocio (opcional, campo del gate)
  tipo_negocio text,                  -- tipo de negocio; proviene de una pregunta del quiz (ej: restaurante, tienda…)
  respuestas jsonb not null,          -- respuestas crudas del quiz
  puntaje_web int not null,
  puntaje_automatizacion int not null,
  arquetipo text not null
);
alter table public.leads enable row level security;
drop policy if exists "allow anon inserts" on public.leads;
create policy "allow anon inserts"
  on public.leads
  for insert
  to anon
  with check (true);
```

**Clave de confianza:** el puntaje y el arquetipo se **recalculan en el servidor** desde `respuestas` (no se confía en lo que manda el cliente) antes de guardar. Así el lead capturado es real y consistente.

## 6. Email real (con degradación elegante)

- Envío vía **Cloudflare Email Service** (binding del Worker), disparado desde el endpoint tras guardar el lead. El email lleva el mismo informe determinista (contenido 100% confiable).
- **Degradación:** si el dominio/verificación de correo no está listo, el endpoint **igual guarda en BD y muestra el informe en pantalla**; el envío se salta sin romper el flujo (se registra en logs). Esto mantiene el reto cumplible sin bloquear.
- **Prerrequisito marcado:** dominio verificado con SPF/DKIM/DMARC + Email Sending habilitado. Bloquea *solo* el envío real; quiz, informe en pantalla y guardado funcionan sin él.

## 7. Arquitectura y stack

Mismo stack probado: **Astro 6 (`output: 'server'`) + `@astrojs/cloudflare` → Cloudflare Workers + Supabase (REST vía `fetch`, sin SDK)**.

```
reto-03/
  src/
    data/quiz.ts              # FUENTE ÚNICA: preguntas, opciones, pesos, arquetipos, catálogo de bloques
    lib/diagnostic.ts         # scoring + arquetipo (puro, testeado)  ← compartido cliente/servidor
    lib/report.ts             # selección de bloques del informe (puro, testeado)
    lib/validation.ts         # valida nombre/email + honeypot (puro, testeado)
    pages/index.astro         # landing + quiz (isla interactiva) + gate + render del informe
    pages/api/lead.ts         # POST: valida → recalcula puntaje → INSERT Supabase → email → devuelve informe
    scripts/quiz.ts           # cliente: navegación del quiz, puntaje instantáneo, gate, fetch a /api/lead
    components/                # Hero, Quiz, Resultado, GateForm, Informe, Footer
    styles/global.css
  db/schema.sql
```

**Flujo de datos:** el quiz corre en el cliente y muestra puntaje+arquetipo al instante (valor gratis, usando `lib/diagnostic.ts`). El **informe completo NO viaja al cliente hasta pasar el gate** — lo devuelve el servidor tras capturar el correo (el gate es real, no un `display:none`). El servidor recalcula el puntaje y arma el informe con `lib/report.ts`.

**Seguridad de credenciales (CRÍTICO, igual que reto-02):**
- Solo se usa la **publishable key** de Supabase, en el **servidor** (`.dev.vars` local + secrets del Worker en prod). Nunca en el cliente ni en git.
- `.dev.vars` y `.env` van en `.gitignore`; se comitea solo `.dev.vars.example`.
- La **secret key** de Supabase y la contraseña de la DB NO se usan en la app ni se comitean.
- **RLS** activado en `leads` con política **solo-INSERT**.

## 8. Diseño visual

Distinto de reto-01 (Parla, juguetón) y reto-02 (editorial cálido de café). Dirección: **confiado, moderno y humano** — algo "tech" pero cercano, no corporativo frío. Paleta propuesta: índigo/violeta profundo + un acento vivo (lima o coral); sans limpio para cuerpo + un display con carácter para titulares. El quiz debe sentirse ágil y satisfactorio (transiciones suaves, progreso claro). Mobile-first, responsive verificado. El detalle fino lo afina el skill `frontend-design` en implementación.

## 9. Pruebas

- **Unitarias (Vitest, TDD):**
  - `diagnostic.ts` — scoring por eje, límites (0/100), mapeo correcto a los 4 arquetipos según los umbrales.
  - `report.ts` — selección de bloques correcta por perfil, cantidad 3–4, priorización.
  - `validation.ts` — email válido/ inválido, campos requeridos, honeypot vacío → válido / lleno → rechazo.
- **Verificación en vivo (controlador):** completar el quiz → ver resultado instantáneo → dejar correo → ver informe en pantalla → **ver la fila real en Supabase** → (si email configurado) recibir el correo. Casos: email inválido → 400; honeypot lleno → finge éxito sin insertar.
- **Responsive:** móvil + desktop.

## 10. Cumplimiento del reto

| Requisito | Cómo se cumple |
|---|---|
| Herramienta interactiva con valor real antes de pedir datos | Quiz Radar Digital → puntaje + arquetipo instantáneos y gratis (secciones 3–4) |
| Intercambio justo (datos por el resultado completo) | Gate del informe: correo → informe personalizado en pantalla + email (sección 3) |
| Datos guardados de verdad en BD | POST `/api/lead` → INSERT en Supabase `leads`, puntaje recalculado en servidor (sección 5) |
| Creatividad del incentivo (no un form de suscripción) | Diagnóstico personalizado con arquetipo + plan de acción priorizado, no una simple newsletter |

## 11. Fuera de alcance (YAGNI)

- Sin login/cuentas de usuario.
- Sin panel de admin (los leads se ven en el dashboard de Supabase).
- Sin pasarela de pagos.
- Sin IA generativa (el informe usa un motor de reglas determinista).
- Sin lectura pública de la tabla (RLS solo-INSERT).
- Sin PDF descargable (informe en pantalla + email).

## 12. Prerrequisitos / bloqueadores conocidos

1. **Tabla `leads`** creada en Supabase con su política RLS (sección 5) antes de la verificación en vivo. Se crea al inicio de la implementación (SQL de la sección 5).
2. **Credenciales Supabase:** `SUPABASE_URL` + `SUPABASE_PUBLISHABLE_KEY` (entregadas por el usuario; en `.dev.vars` local / secrets del Worker).
3. **Email real:** dominio verificado (SPF/DKIM/DMARC) + Email Sending habilitado en Cloudflare. Si falta, el flujo **degrada** (guarda + muestra en pantalla, sin enviar). Bloquea solo el envío real.
4. **Deploy final:** token de Cloudflare con scope Workers. Bloquea únicamente el paso de despliegue; build, dev local, tests y verificación de inserción funcionan sin él.

## 13. Decisiones abiertas (resueltas)

- Formato: **quiz diagnóstico** ("¿tu negocio necesita web + automatización?").
- Intercambio: **puntaje + arquetipo gratis; informe personalizado al dejar el correo**.
- Entrega del informe: **en pantalla al instante + correo real** (con degradación si el email no está listo).
- Generación del informe: **motor de reglas determinista** (bloques curados), no IA.
- Nombre del negocio **Órbita** y de la herramienta **Radar Digital**: aprobados (ajustables).
- Base de datos: **Supabase** (publishable key + RLS solo-INSERT).
