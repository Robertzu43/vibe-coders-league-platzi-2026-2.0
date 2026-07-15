# GOLAZO · el Mundial en datos — Diseño

**Reto 05 · Vibe Coders League (Edición 2.0)**
Fecha: 2026-07-14 · Estado: aprobado en brainstorming, pendiente de spec review

---

## 1. Contexto

**El reto (Platzi):** "El prototipo que convence en una reunión." Convertir una idea en un prototipo *navegable* —un link que alguien abre antes de una reunión para reaccionar a algo real, no a una promesa. Requisitos:

- Flujo navegable de **al menos 3 pantallas o pasos conectados** que se pueda recorrer, no solo mirar.
- **Interacciones reales:** botones que llevan a algún lado, un formulario que avanza, un estado que cambia.
- **Contexto claro:** qué problema resuelve y a quién se lo presentarías.
- **No** necesita backend ni datos reales. El objetivo es comunicar la idea, no operarla.

**La idea:** GOLAZO, un landing interactivo de datos del Mundial. Aprovecha que el Mundial 2026 se está jugando (temporada mundialista) para enganchar a los fans con distribuciones y estadísticas históricas que se pueden *tocar*.

**Problema que resuelve:** las estadísticas del Mundial están dispersas, en tablas frías, y nadie las recuerda. La pasión mundialista no encuentra un lugar visual, interactivo y compartible donde vivirla.

**A quién se le presenta:** al editor de un **medio deportivo digital** (o a una **marca patrocinadora**) como especial interactivo de fan-engagement para la ventana del Mundial.

## 2. Objetivos y no-objetivos

**Objetivos**
- Un landing de una sola página con **6 secciones conectadas** que se recorren de arriba abajo, con navegación explícita entre pasos.
- Al menos tres tipos de **interacción real** que cambian el estado en pantalla (toggle, hover, selector).
- Estética **Álbum Panini**: papel crema, colores primarios, bordes redondeados, tipografía serif nostálgica.
- Datos históricos reales (Mundiales 1930–2022) **hardcodeados** en el front, con el marco del Mundial 2026 (48 selecciones, 104 partidos, 3 sedes).
- Consistente con el patrón de la liga: Astro 6 + deploy a Cloudflare Workers, carpeta `reto-05/` autocontenida.

**No-objetivos (YAGNI)**
- Sin backend, sin base de datos, sin AI, sin llamadas de red en runtime.
- "Comparte" es una **tarjeta resaltada en pantalla**, no descarga de imagen ni sharing real a redes.
- El explorador cubre un set **curado de ~6–8 selecciones destacadas**, no las 80+ que han jugado un Mundial.
- No es responsivo pixel-perfect en todos los breakpoints; mobile-friendly razonable es suficiente para una demo.

## 3. El flujo (6 pasos conectados)

Una sola página con scroll + una navegación de secciones (chips/puntos sticky) y botones "siguiente" que hacen scroll-jump, de modo que se sienta un **recorrido**, no un muro.

| # | Sección | Contenido | Interacción real |
|---|---------|-----------|------------------|
| 0 | **Hero** | Título + gancho: "92 años, 22 Mundiales, y solo 8 países han levantado la copa." | Contador que sube al cargar; CTA "Explora los datos ↓" |
| 1 | **Dinastías** | Palmarés en barras: Brasil 5, Alemania 4, Italia 4, Argentina 3, Uruguay 2, Francia 2, Inglaterra 1, España 1 | **Toggle** "por país / por confederación" (UEFA 12 vs CONMEBOL 10) — cambia el corte de datos |
| 2 | **La era de los goles** | Goles por partido por edición: pico 5.38 en 1954, descenso a ~2.7 hoy | **Hover** en cada edición muestra tooltip con goles/partidos/promedio |
| 3 | **Estadios llenos** | Asistencia: récord Maracaná 1950 vs. promedios modernos; marco 2026 (48 selecciones, 104 partidos) | **Clic** en una sede/edición resalta su dato |
| 4 | **Explora tú** (corazón) | Selector de selección → tarjeta con títulos, mejor resultado, participaciones, goleador histórico | **Selector** → toda la tarjeta se recalcula (el estado cambia) |
| 5 | **Comparte** | "Tu selección en una tarjeta" lista para presumir + CTA de cierre/marca | **Botón** genera y resalta la tarjeta final |

Los pasos 1, 2 y 4 satisfacen de sobra "un estado que cambia"; el Hero y Comparte son "botones que llevan a algún lado"; el conjunto es "un recorrido que se puede hacer".

## 4. Arquitectura

**Stack:** Astro 6 (build estático) desplegado a Cloudflare Workers vía `@astrojs/cloudflare` + Wrangler, igual que retos 01–03. Interactividad con **TypeScript vanilla** del lado del cliente. Sin islas de framework, sin dependencias de charting.

**Estructura de archivos** (dentro de `reto-05/`, espejo del patrón de la liga):

```
reto-05/
  src/
    data/
      worldcup.ts          # única fuente de verdad: campeones, goles/edición,
                           # asistencia, selecciones del explorador, marco 2026
      worldcup.test.ts     # tests de integridad de datos (Vitest)
    lib/
      chart.ts             # helpers puros: escalado a coords SVG, formateo
      chart.test.ts        # tests de los helpers
    components/
      Hero.astro
      Dinastias.astro
      EraGoles.astro
      Estadios.astro
      Explora.astro
      Comparte.astro
      SectionNav.astro     # navegación entre pasos
      Footer.astro
    scripts/
      counter.ts           # contador del hero
      dinastias.ts         # toggle país/confederación
      era-goles.ts         # tooltips de hover
      estadios.ts          # resaltado por sede
      explora.ts           # selector → recálculo de la tarjeta
      comparte.ts          # generar tarjeta final
    styles/
      global.css           # tokens del tema Panini
    pages/
      index.astro          # ensambla las 6 secciones + nav
  docs/superpowers/{specs,plans}/
  README.md
  astro.config.mjs, wrangler.toml, package.json, tsconfig.json, vitest.config.ts
```

**Flujo de datos:** `worldcup.ts` exporta objetos tipados. Astro los usa en build para renderizar el HTML/SVG inicial de cada sección. Para las interacciones, la data relevante se embebe en el HTML (JSON en un `<script type="application/json">` o `data-*` attributes) y los scripts de cliente la leen para actualizar el DOM. **Cero red en runtime.**

**Charts:** SVG hecho a mano, sin librerías (CSP-friendly y liviano en Workers). Se aplicará la skill `dataviz` al diseñarlos: paleta categórica validada dentro del tema Panini, marcas y ejes accesibles, y una **tabla oculta accesible** o `aria-label`s como fallback de cada gráfico. Tipos de gráfico: barras (Dinastías, Estadios), línea/área (Era de los goles).

**Interacción / estado:** cada script es un módulo pequeño con una responsabilidad. El estado vive en el DOM (clase activa, atributo seleccionado); no hay store global. El selector del paso 4 cambia qué objeto-selección se muestra leyendo del JSON embebido.

**Accesibilidad:** navegación por teclado en el selector y en la nav de secciones; foco visible; gráficos con equivalente textual; contraste suficiente sobre el papel crema.

## 5. Datos (hardcodeados, históricos reales · verificar al implementar con TDD)

Los tests del módulo de datos son el guardarraíl de exactitud. Valores de referencia:

- **Campeones (22 finales 1930–2022):** BRA 5, GER 4, ITA 4, ARG 3, URU 2, FRA 2, ENG 1, ESP 1 → suma 22, 8 campeones únicos. Confederación: UEFA 12, CONMEBOL 10.
- **Goles por partido por edición:** serie 1930→2022 (p. ej. 1954 = 5.38 máx; 1990 = 2.21 mín; 2022 = 2.69). Se hardcodea la serie completa con goles y partidos por edición.
- **Asistencia:** récord de partido Maracaná 1950 (~173.850 oficial); mayor promedio por partido USA 1994. Total 2022 ~3.4M.
- **Selecciones del explorador (~6–8):** Brasil, Argentina, Alemania, Italia, Francia, Uruguay, España, Colombia. Cada una: títulos, mejor resultado, participaciones, goleador histórico en Mundiales (p. ej. Colombia: 6 participaciones, cuartos 2014, James Rodríguez 6 goles).
- **Marco 2026:** 23.º Mundial, 48 selecciones, 104 partidos, sedes USA/Canadá/México.

> Nota: las cifras exactas se fijan y validan durante la implementación (TDD sobre `worldcup.ts`). El reto no exige datos reales, pero usar cifras históricas correctas hace la demo más convincente.

## 6. Testing

- **Vitest** sobre `worldcup.ts`: la suma de títulos = 22; 8 campeones únicos; UEFA+CONMEBOL = 22; cada edición tiene goles/partidos coherentes con su promedio; cada selección del explorador tiene los campos requeridos.
- **Vitest** sobre `lib/chart.ts`: el escalado a coordenadas SVG y el formateo son correctos en los bordes (min/max, cero).
- Verificación manual/E2E al final: recorrer las 6 secciones, probar toggle, hover, selector y tarjeta de compartir en `astro dev`/preview.

## 7. Despliegue

Build estático de Astro → `wrangler deploy` a Cloudflare Workers, como retos 01–03. Sin secrets, sin bindings (no hay AI ni Supabase). URL objetivo: `https://golazo.robertzu43.workers.dev` (o el nombre que resuelva Wrangler).

## 8. Trabajo aislado

Se desarrolla en un **git worktree** en la branch `reto-05-golazo`, en `~/.config/superpowers/worktrees/vibe-coders-league-platzi-2026-2.0/reto-05-golazo`, por el gotcha de working-tree compartido de este repo. Al terminar: finishing-a-development-branch (merge/PR a `main`) + actualizar la tabla del README raíz.

## 9. Preguntas abiertas

- ¿El set de selecciones del explorador es el correcto, o cambiamos alguna (p. ej. incluir México/Inglaterra)?
- ¿"Comparte" necesita algún gancho de marca concreto (logo/nombre de patrocinador ficticio) o queda genérico?
