# Reto 08 — Platzidle: clona tu app favorita

*Vibe Coders League Platzi 2026 · Edición 2.0*

## El reto (Platzi)

**"Clona tu app favorita."** Recrear la funcionalidad esencial de una app de uso diario, **dirigiendo un agente de código** (el proceso es parte del reto). Requisitos:

- **Un clon funcional:** la mecánica central funciona de verdad, no una maqueta.
- **Construido dirigiendo un agente de código** (aquí: Claude Code).
- **Tu toque personal:** al menos una diferencia o mejora sobre la app original.
- Empezar por la versión más simple que funcione y crecer desde ahí.

## El producto: Platzidle

**Platzidle** es un clon jugable de **Wordle** con temática tech y guiño a Platzi. La palabra secreta siempre es un **término del mundo tech** (`PYTHON`, `DOCKER`, `LINUX`, `NUBES`, `PROMPT`...). Adivinas el término en **6 intentos** con el feedback clásico de colores — y al terminar la partida, en vez de solo revelar la respuesta, una **tarjeta educativa** explica el término y **recomienda un curso real de Platzi** para aprenderlo.

## Cómo cumple el reto

| Requisito | Cómo se cumple |
|-----------|-----------------|
| Clon funcional (no maqueta) | Wordle jugable de verdad: tablero, feedback de colores con manejo correcto de letras repetidas, teclado físico + en pantalla, victoria/derrota — toda la lógica bajo tests (Vitest) |
| Dirigido con agente de código | Construido con **Claude Code** siguiendo el flujo de Superpowers: brainstorming → spec → plan → implementación por tareas con subagentes |
| Toque personal (≥1 mejora) | Temática tech + tarjeta con curso **real** de Platzi al terminar; largo de palabra variable; modo práctica ilimitado además del diario; pista de categoría visible desde el inicio |

## Toque personal / mejoras sobre Wordle

- **Temática tech + recomendación de Platzi.** La palabra nunca es genérica: es un término tech (lenguaje, herramienta, concepto). Al terminar, una tarjeta muestra su definición y enlaza a un curso real de Platzi para profundizar.
- **Largo de palabra variable.** Cada término tiene su propio largo (5 a 6 letras en la lista actual) y el tablero se adapta al término activo, en vez de un ancho fijo de 5 columnas.
- **Dos modos:** el reto **diario** clásico (mismo término para todos según la fecha) + un modo **práctica ilimitado** para seguir jugando sin esperar al día siguiente.
- **Pista de categoría visible.** Desde el primer intento se muestra la categoría del término (Frontend, DevOps, IA, Cloud, Data...), a diferencia del Wordle original que no da ninguna pista.

## Mecánica de juego

- **6 intentos** para adivinar el término del largo exacto de la palabra secreta.
- **Feedback de colores** (verde/amarillo/gris) calculado con el algoritmo por conteo: primero marca las letras en su posición exacta y las descuenta de un "pool"; luego reparte los amarillos por ocurrencia restante — así se manejan bien los casos con **letras repetidas**.
- **Teclado físico + en pantalla**, sincronizados: ambos reflejan el mejor estado conocido de cada letra.
- Alfabeto **A–Z**, sin `Ñ` ni acentos en esta v1.
- **Modo diario**: el término del día se calcula por fecha con un epoch fijo (**2026-07-20 = Platzidle #1**) en zona horaria **America/Bogotá**, para que el reto cambie a medianoche de Colombia igual que en los demás retos de la liga. La lista de términos se baraja con una semilla fija (determinista) para que el orden del diario no sea alfabético pero sí estable entre partidas.
- **Modo práctica**: término al azar, ilimitado, sin persistencia entre rondas.
- **Compartir**: genera una grilla de emojis (🟩🟨⬛) estilo Wordle + puntaje, lista para copiar/pegar.
- **Estadísticas**: partidas jugadas, % de victorias, racha actual/máxima e histograma de intentos, guardadas en `localStorage`.

## Tech stack

- **[Astro 6](https://astro.build)** con `output: 'server'` + adaptador **`@astrojs/cloudflare`** → desplegado a **Cloudflare Workers**.
- **TypeScript vanilla** — sin frameworks de UI. Toda la lógica de juego es pura y vive en `src/lib/`, testeada con Vitest; un único script de cliente (`src/scripts/game-ui.ts`) conecta esa lógica con el DOM.
- **[Vitest](https://vitest.dev)** para las pruebas unitarias (23 tests en 4 suites).
- **Sin backend, sin IA, sin llamadas de red en runtime** — la lista de términos viaja empaquetada en el cliente (igual que el Wordle original), todo el contenido se resuelve en build time.

## Cómo se construyó

Este reto se construyó **dirigiendo a Claude Code** con el flujo de trabajo de [Superpowers](./docs/superpowers/): primero una sesión de **brainstorming** para explorar la app a clonar y las decisiones de diseño, luego una **spec** de diseño detallada, después un **plan** de implementación dividido en tareas (scaffold → datos → lógica pura con TDD → UI → estilos → documentación), ejecutado con subagentes que implementan tarea por tarea con revisión. Los documentos viven en `docs/superpowers/specs/` y `docs/superpowers/plans/`.

## Estructura del proyecto

```
reto-08/
  README.md
  astro.config.mjs · wrangler.toml · tsconfig.json · vitest.config.ts · package.json
  src/
    data/
      words.ts           # única fuente: términos + definición + categoría + curso Platzi
      words.test.ts       # integridad de datos (A–Z, sin duplicados, cursos no vacíos...)
    lib/
      game.ts             # puro: evaluateGuess(answer, guess) → estados de casillas; isWin
      game.test.ts        # incluye casos de letras repetidas
      daily.ts            # puro: puzzleNumber, dailyIndex, seededShuffle/mulberry32, pickPractice
      daily.test.ts
      share.ts            # puro: arma la grilla de emojis + texto para compartir
      share.test.ts
    components/           # Header · Board · Keyboard · HowToPlay · ResultCard · Footer (.astro)
    scripts/
      game-ui.ts          # une el DOM: input, render de tablero/teclado, estado, persistencia, compartir
    styles/global.css
    pages/index.astro
  docs/
    superpowers/{specs,plans}/
    evidence/
```

## Cómo correr en local

```bash
cd reto-08
npm install
npm run dev      # http://localhost:4321
```

Correr las pruebas (lógica de juego, datos, fecha diaria, compartir):

```bash
npm test
```

Compilar el sitio para producción:

```bash
npm run build
```

Desplegar a Cloudflare Workers (requiere `wrangler login`):

```bash
npm run deploy   # astro build && wrangler deploy
```

## Evidencia

Ver [`docs/evidence/`](./docs/evidence/README.md) — resultados de tests, type-check y build, y verificación de los enlaces a cursos de Platzi.

---

Desarrollado por **Roberto Zuniga** con **Claude Code** como copiloto. Diseño → spec → plan → implementación por tareas con revisión, usando los skills de Superpowers.
