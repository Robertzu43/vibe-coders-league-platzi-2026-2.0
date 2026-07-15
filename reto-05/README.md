# Reto 05 — GOLAZO: el Mundial en datos

> Vibe Coders League Platzi 2026 · Edición 2.0

## El reto

Construir una landing **estática e interactiva** que cuente una historia con datos: nada de dashboards fríos, sino un recorrido navegable donde cada sección invita a tocar, comparar y explorar. Se evalúa que la pieza sea **visualmente atractiva**, **con interacciones reales** (no solo scroll) y que cuente **datos verídicos**, no inventados.

## El producto: GOLAZO

**GOLAZO** es un especial interactivo de datos del Mundial de fútbol, pensado como pieza de **fan-engagement** para un medio deportivo digital o una marca patrocinadora de cara al **Mundial 2026**. Con la estética de un álbum de figuritas Panini (papel crema, colores primarios, tipografía serif), convierte 92 años de historia del Mundial en un recorrido de seis capítulos que se recorren con scroll y se exploran con clics.

**El problema que resuelve:** las estadísticas del Mundial existen, pero están dispersas en tablas aburridas. GOLAZO las junta en una sola narrativa visual, pensada para compartirse y para hacer scroll sin perder el interés.

**Público objetivo:** un medio deportivo digital o una marca patrocinadora que necesita una pieza de fan-engagement para el Mundial 2026 — contenido que los aficionados quieran recorrer y compartir, no un reporte estadístico.

## El recorrido

Seis paradas conectadas por un mini-nav pegajoso que resalta el capítulo activo. Las tres secciones de datos son **densas: dos gráficas lado a lado** (2 columnas en desktop, apiladas en móvil) para más impacto.

1. **Hero** — la portada: `92 años`, un contador que sube de 0 a 22 Mundiales y de 0 a 8 países campeones al entrar en pantalla.
2. **Dinastías** — quién manda: barras de palmarés por país con un **toggle** que las recolorea por confederación (UEFA azul / CONMEBOL rojo), **+** una **dona** de títulos por confederación (UEFA 12 · CONMEBOL 10).
3. **La era de los goles** — una línea de goles-por-partido por edición (pico en 1954) con **hover/foco** que muestra el detalle de cada Copa, **+** barras de **goleadores históricos** (Klose 16, Ronaldo 15, Messi 13, Fontaine 13…).
4. **Estadios & 2026** — barras de asistencias históricas (Maracaná 1950, Azteca 1986, Wembley 1966…) con **clic** que resalta y muestra la nota, **+** una línea del **crecimiento del torneo** (13 selecciones en 1930 → 48 en 2026), junto a un callout del Mundial 2026 (48 selecciones, 104 partidos, 3 sedes).
5. **Explora tú** — el corazón interactivo: un **selector** de 16 selecciones que recalcula al instante títulos, mejor resultado, participaciones y goleador histórico.
6. **Comparte** — un botón arma una "tarjeta" tipo figurita Panini con la selección elegida en el capítulo anterior (por defecto Argentina si no se eligió ninguna).

Todas las interacciones son reales: contador animado, toggle de color, hover con tooltip, clic que resalta y muestra contexto, selector que recalcula el estado de la página, y un botón que genera contenido a partir de ese estado.

## Tech stack

- **[Astro 6](https://astro.build)** estático + adaptador **`@astrojs/cloudflare`** → despliegue a **Cloudflare Workers**.
- **Charts SVG hechos a mano** — sin librerías de gráficos. Los helpers matemáticos puros (`scaleLinear`, `formatInt`, `linePath`) viven en `src/lib/chart.ts` y están probados con Vitest.
- **Datos históricos reales (1930–2022)** hardcodeados en `src/data/worldcup.ts` (campeones, ediciones, selecciones destacadas, asistencias, Mundial 2026), con pruebas de integridad de datos.
- **TypeScript vanilla** para cada script de interacción (uno por sección), sin frameworks de UI.
- **[Vitest](https://vitest.dev)** para las pruebas unitarias.
- **Sin backend, sin IA, sin datos externos** — todo el contenido se resuelve en build time; cero llamadas de red en runtime.

## Cómo correr en local

```bash
cd reto-05
npm install
npm run dev      # http://localhost:4321
```

Correr las pruebas (datos + helpers de charts):

```bash
npm test
```

Compilar el sitio estático:

```bash
npm run build
```

## Datos

Todos los datos (campeones, goles por edición, asistencias, selecciones y el Mundial 2026) son **datos históricos reales**, hardcodeados en `src/data/worldcup.ts` y verificados con pruebas de integridad (`worldcup.test.ts`). El reto no exige backend ni datos en vivo: es una pieza estática, sin base de datos ni APIs externas.

## Estructura

```
reto-05/
  src/
    data/worldcup.ts            # fuente única: campeones, ediciones, goleadores, selecciones, estadios, cup2026
    data/worldcup.test.ts       # pruebas de integridad de datos
    lib/chart.ts                # scaleLinear, formatInt, linePath, polarToCartesian, donutSlice (puros, testeados)
    lib/chart.test.ts
    styles/global.css           # tokens del tema Panini + base + grid de 2 columnas
    components/                 # Hero, Dinastias, Confederacion, EraGoles, Goleadores, Estadios,
                                # Crecimiento, Explora, Comparte, SectionNav, Footer
    scripts/                    # counter, dinastias, era-goles, estadios, explora, comparte
    pages/index.astro           # ensambla 3 secciones densas (2 charts c/u) + hero + explora + comparte
```

## Deploy

Desplegado en: **https://golazo.robertzu43.workers.dev**

```bash
cd reto-05
npm run deploy   # astro build && wrangler deploy
```

---

Desarrollado por **Roberto Zuniga** con **Claude Code** como copiloto. Diseño → spec → plan → implementación por tareas con revisión, usando los skills de Superpowers.
