# Reto 02 — Altura: Tu producto en línea capturando datos reales

*Vibe Coders League Platzi 2026 · Edición 2.0*

## El producto

**Altura** es café de especialidad colombiano de un solo lote y una sola cosecha, en modalidad de **pre-orden roast-to-order** (se tuesta después de reservar, para máxima frescura).

- **Finca:** El Mirador — Pitalito, Huila, Colombia
- **Altitud:** 1.850 msnm
- **Variedad:** Caturra
- **Proceso:** Lavado
- **Puntaje SCA:** 86.5
- **Notas de taza:** Panela, mandarina, chocolate con leche
- **Presentación:** Bolsa de 340 g
- **Lote:** limitado (300 unidades)

**Propuesta de valor:** frescura (se tuesta al pedir, no antes) + trazabilidad (finca, altitud, variedad y proceso específicos) + escasez (lote de una sola cosecha, cantidad limitada).

**Público objetivo:** amantes del café de especialidad que valoran el origen y la frescura por encima del precio.

## Qué hace

Una landing responsive que comunica la propuesta de valor de Altura (historia, trazabilidad, cómo funciona la pre-orden, escasez del lote, FAQ) y un **formulario de pre-orden** cuyos datos se guardan de verdad en una base de datos **Supabase** (tabla `preorders`).

- **Validación server-side**: el endpoint (`src/pages/api/preorder.ts`) revalida todos los campos con `validatePreorder` (`src/lib/validation.ts`) antes de insertar nada, sin confiar en la validación del navegador.
- **Honeypot anti-spam**: un campo oculto (`website`) que un humano nunca llena; si llega con contenido, el servidor responde como si todo hubiera ido bien (`{ ok: true }`) sin insertar el registro, para no darle pistas a los bots.
- **El servidor no expone datos**: solo se usa la *publishable key* de Supabase, y la tabla tiene Row Level Security (RLS) con una única política que permite **INSERT** al rol `anon` — no hay lectura, actualización ni borrado posibles desde la app.

## Tech stack

- **[Astro 6](https://astro.build)** con `output: 'server'` (SSR, ver `astro.config.mjs`)
- **[@astrojs/cloudflare](https://www.npmjs.com/package/@astrojs/cloudflare)** como adaptador → despliega a **Cloudflare Workers**
- **Supabase** como base de datos, consumido vía **PostgREST directo con `fetch`** (sin el SDK de `@supabase/supabase-js`)
- **TypeScript vanilla** para el script del formulario (`src/scripts/preorder-form.ts`), sin frameworks de UI
- **[Vitest](https://vitest.dev)** para pruebas unitarias

No se usa ninguna API key externa de pago (no hay IA, mapas de pago, etc. en runtime).

## Seguridad

- Solo la **publishable key** de Supabase vive en el servidor, cargada como variable de entorno/secret del Worker (`.dev.vars` en local, secrets de Wrangler en producción). **Nunca** se commitea al repo ni se expone al cliente/navegador.
- **RLS activado** en la tabla `preorders` con una política que permite exclusivamente `INSERT` para el rol `anon` (ver `db/schema.sql`). No hay política de `SELECT`, `UPDATE` ni `DELETE`, así que ni con la publishable key filtrada se pueden leer ni modificar reservas ajenas.
- La **secret key** de Supabase y la **contraseña de la base de datos** no se usan en ningún punto de la aplicación.

## Estructura del proyecto

```
reto-02/
├── db/
│   └── schema.sql                  # Tabla preorders + política RLS (solo INSERT)
├── src/
│   ├── data/
│   │   └── product.ts              # Fuente única de datos del producto (precio, finca, FAQs, etc.)
│   ├── lib/
│   │   └── validation.ts           # Validación server-side + honeypot (con su test)
│   ├── pages/
│   │   ├── index.astro
│   │   └── api/
│   │       └── preorder.ts         # Endpoint POST que valida e inserta en Supabase
│   ├── components/
│   │   ├── Hero.astro
│   │   ├── Historia.astro
│   │   ├── Trazabilidad.astro
│   │   ├── ComoFunciona.astro
│   │   ├── Escasez.astro
│   │   ├── Formulario.astro
│   │   ├── FAQ.astro
│   │   └── Footer.astro
│   ├── scripts/
│   │   └── preorder-form.ts        # Lógica cliente del formulario de pre-orden
│   └── styles/
│       └── global.css
└── .dev.vars.example
```

## Cómo correr localmente

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear el archivo `.dev.vars` a partir de `.dev.vars.example` con tus propias credenciales de Supabase:
   ```bash
   cp .dev.vars.example .dev.vars
   # y editar .dev.vars con tu SUPABASE_URL y SUPABASE_PUBLISHABLE_KEY
   ```
3. Crear la tabla en tu proyecto de Supabase: pega el contenido de `db/schema.sql` en el **SQL Editor** de Supabase y ejecútalo.
4. Levantar el servidor de desarrollo:
   ```bash
   npm run dev
   ```
   Disponible en `http://localhost:4321`.
5. Correr las pruebas unitarias (datos del producto + validación):
   ```bash
   npm test
   ```

## Cómo desplegar

```bash
npm run deploy
```

Este script equivale a `astro build && wrangler deploy`, que compila el sitio y lo publica en **Cloudflare Workers**.

Antes de desplegar, configura los secrets del Worker (no se suben al repo):

```bash
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_PUBLISHABLE_KEY
```

(Alternativa para entornos no productivos: definirlas en `[vars]` dentro de `wrangler.toml`.)

## Bonus — investigación de mercado con IA

Resumen de la investigación que informó la propuesta de valor: el mercado de café de especialidad DTC (direct-to-consumer) muestra una tendencia clara hacia el **single-origin** como categoría en crecimiento, donde la **trazabilidad** (finca, altitud, variedad, proceso) actúa como el diferenciador que efectivamente convierte visitas en reservas. El modelo **roast-to-order** se percibe como garantía de frescura frente al café ya tostado en bodega, y la **escasez de micro-lote** (una sola cosecha, cantidad limitada) genera urgencia legítima sin recurrir a tácticas engañosas. En este segmento, el precio premium típico se ubica en un rango de aproximadamente **$42.000–$78.000 COP por bolsa de 340 g**, rango dentro del cual se fijó el precio de Altura.

Esta investigación fue la base para decidir los tres pilares de la propuesta de valor (frescura + trazabilidad + escasez) y la estructura de la landing (Historia, Trazabilidad, Cómo funciona, Escasez, FAQ).

## Cómo cumple el reto

| Requisito | Estado |
| --- | --- |
| Propuesta de valor clara (frescura + trazabilidad + escasez) | ✓ |
| Formulario que guarda datos en una base de datos real (Supabase, tabla `preorders`) | ✓ |
| Diseño responsive (mobile-first) | ✓ |
| Bonus: investigación de mercado con IA aplicada a la propuesta de valor | ✓ |
