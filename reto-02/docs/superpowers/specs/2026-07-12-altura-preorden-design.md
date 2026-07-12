# Reto 02 — Altura: Tu producto en línea capturando datos reales

> Vibe Coders League Platzi 2026 · Edición 2.0
> Fecha: 2026-07-12 · Estado: Diseño aprobado

## 1. Objetivo del reto

Publicar la página de un producto que **se vea bien y funcione**: cuando alguien deja sus datos, se guardan **de verdad en una base de datos real**. Requisitos:

- Propuesta de valor clara: qué es, para quién, por qué importa.
- Formulario de contacto/registro cuyos datos se guarden en una BD real (**Supabase**) — no un botón decorativo.
- Diseño **responsive** (celular y computador).
- Bonus: investigar el mercado con IA antes de definir la propuesta. **(Hecho — ver sección 2.)**

## 2. Investigación de mercado (bonus, ya realizada)

Investigación web sobre café de especialidad DTC / pre-orden de micro-lotes. Hallazgos que guían el diseño:

- Single-origin crece ~8–12%/año; e-commerce/suscripción ya es ~25–30% de las ventas. Trazabilidad aparece en 40%+ de lanzamientos 2025; compradores pagan 15–25% de premium por origen verificado.
- **Público:** millennials/Gen Z urbanos, café-literate; baja sensibilidad al precio cuando la calidad/origen está probada.
- **Diferenciadores que convierten:** puntaje SCA (80+ = especialidad, <3% del café mundial califica), ficha de trazabilidad (finca/productor/altitud/variedad/proceso), frescura roast-to-order, escasez de micro-lote.
- **Precio (COP, 340g):** micro-lotes premium ~$42.000–$78.000; envío gratis sobre ~$200.000.
- **Formulario:** pedir lo mínimo (menos campos → más conversión); guest checkout; validación inline; mobile-first; mostrar costo de envío temprano; FAQ + política de reembolso reducen ansiedad.
- **Inspiración:** Pergamino, Devoción, Azahar (Colombia).

## 3. El producto (inventado)

**Altura** — café de especialidad colombiano, **lotes limitados de una sola cosecha**, en pre-orden. Se **tuesta al pedir** (roast-to-order) y se envía fresco desde el origen.

**El lote actual:**
- Finca **El Mirador**, Pitalito, **Huila** · **1.850 msnm**
- Variedad **Caturra** · Proceso **Lavado** · Puntaje **SCA 86.5**
- Notas de cata: **panela, mandarina, chocolate con leche**
- **300 bolsas** de 340g · **$58.000 COP** c/u · envío gratis sobre $200.000

## 4. Propuesta de valor

- **Qué:** reserva una bolsa de un lote único y trazable; se tuesta solo cuando ordenas.
- **Para quién:** amantes del café (millennials/Gen Z urbanos) que valoran origen, frescura y sostenibilidad.
- **Por qué importa:** frescura real (roast-to-order) + trazabilidad hasta la finca + escasez genuina (300 bolsas). Los 3 diferenciadores que la investigación mostró que convierten.

## 5. La landing (secciones)

Estilo **"Editorial cálido"**: papel crema (`#F4ECD8`), café espresso (`#3B2A1E`), acento terracota/ámbar, tipografía **serif display** (Fraunces/Playfair vía webfont con fallback de sistema) + sans para cuerpo.

1. **Hero** — propuesta de valor + CTA "Reserva tu bolsa" + badge "SCA 86.5".
2. **Historia del origen** — finca, productor, región.
3. **Ficha de trazabilidad** — altitud, variedad, proceso, notas de cata, puntaje SCA.
4. **Cómo funciona** — reservas → tostamos al pedir → enviamos fresco.
5. **Escasez** — "X de 300 bolsas reservadas" (el número refleja las filas reales en Supabase; ver 6).
6. **Formulario de pre-orden** (sección 6).
7. **FAQ** — envíos, fechas de despacho, política de reembolso.
8. **Footer** — marca, contacto.

## 6. El formulario → Supabase

**Campos** (mínimos, para conversión):

| Campo | Tipo | Requerido |
|---|---|---|
| Nombre | texto | ✅ |
| Correo | email (validado) | ✅ |
| Ciudad | texto | ✅ |
| Cantidad | número 1–5 (default 1) | ✅ |
| Molido | select: `grano_entero` / `molido` | ✅ |

- **Honeypot** oculto anti-bots (campo señuelo; si viene lleno, se rechaza sin insertar).
- Checkout como invitado (sin cuenta). Total estimado en vivo (cantidad × $58.000).
- Estados de UI: idle → enviando → éxito ("¡Reserva confirmada! 🎉") / error.

**Tabla Supabase `public.preorders`:**

```sql
create table public.preorders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  email text not null,
  ciudad text not null,
  cantidad int not null default 1 check (cantidad between 1 and 5),
  molido text not null check (molido in ('grano_entero','molido'))
);
alter table public.preorders enable row level security;
create policy "allow anon inserts" on public.preorders
  for insert to anon with check (true);
```

**Contador de escasez:** para mostrar "X de 300", se lee un conteo. Como RLS solo permite INSERT (no SELECT) con la publishable key, el conteo se hará server-side con un endpoint que devuelve `count` vía la publishable key **si** se agrega una política SELECT de solo-conteo; para mantener privacidad de datos, la opción por defecto es **mostrar un número base + reservas de la sesión** o un valor estático de marketing. Decisión: mantener simple — número de marketing estático ("128 de 300") en el MVP; sin exponer SELECT. (YAGNI: no exponer lectura de la tabla.)

## 7. Arquitectura y seguridad

- **Astro 6 + Cloudflare Workers** (mismo stack probado que reto-01; adapter `@astrojs/cloudflare`, deploy a Workers).
- El formulario hace **POST a `/api/preorder`** (API route). El servidor **valida** y hace `INSERT` en Supabase vía su **API REST** (`POST {SUPABASE_URL}/rest/v1/preorders`) con `fetch` — sin dependencias extra.
- **Seguridad de llaves:**
  - Se usa **solo la publishable key** (`SUPABASE_PUBLISHABLE_KEY`), guardada como variable de entorno / secret del Worker y en `.dev.vars` local — **nunca** en el cliente ni en git (`.dev.vars`, `.env` en `.gitignore`).
  - **RLS activado** con política **solo-INSERT**: aunque la publishable key es de bajo riesgo por diseño, RLS garantiza que no se puedan leer ni modificar filas existentes.
  - La **secret key** de Supabase y la **contraseña de la DB** NO se usan en la app ni se comitean.
- Variables de entorno: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.

## 8. Responsive

Mobile-first. Layout fluido (grid/flex), imágenes `max-width:100%`, formulario cómodo en móvil (inputs grandes, un campo por fila en móvil). Se verifica en viewport móvil y desktop.

## 9. Pruebas

- **Test unitario** de la función de **validación** del formulario (`validatePreorder`): email válido, campos requeridos presentes, `cantidad` en 1–5, `molido` en el enum, honeypot vacío → válido; casos inválidos → error con mensaje.
- **Verificación en vivo:** enviar una pre-orden desde la landing y **ver la fila aparecer en Supabase** (dashboard o `GET` con la secret key en verificación manual del controlador).
- **Responsive:** revisar móvil y desktop.

## 10. Cumplimiento del reto

| Requisito | Cómo se cumple |
|---|---|
| Propuesta de valor clara | Secciones 4–5 (qué/para quién/por qué) |
| Formulario guarda en BD real | POST `/api/preorder` → INSERT en Supabase `preorders` |
| Responsive | Mobile-first, verificado móvil + desktop |
| Bonus: investigación con IA | Sección 2 (hecha antes de definir la propuesta) |

## 11. Fuera de alcance (YAGNI)

- Sin pasarela de pagos real (es pre-orden/reserva; no se cobra).
- Sin cuentas de usuario ni login.
- Sin panel de admin (las reservas se ven en el dashboard de Supabase).
- Sin lectura pública de la tabla (RLS solo-INSERT); el contador de escasez es un número de marketing estático en el MVP.
- Sin emails de confirmación automáticos (posible extensión futura).

## 12. Decisiones abiertas (resueltas)

- Nombre "Altura" y detalles del lote (Huila, Caturra, SCA 86.5): **aprobados**.
- Campos del formulario (5 + honeypot): **aprobados**.
- Base de datos: **Supabase** (publishable key + RLS solo-INSERT).
- Credenciales entregadas por el usuario (proyecto `yotlmzydbrkzwzqmhmgz`). Pendiente: token nuevo de Cloudflare para el deploy final.
