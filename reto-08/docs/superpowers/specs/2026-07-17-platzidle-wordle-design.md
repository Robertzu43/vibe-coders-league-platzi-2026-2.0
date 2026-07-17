# Platzidle · clona tu app favorita (Wordle) — Diseño

**Reto 08 · Vibe Coders League (Edición 2.0)**
Fecha: 2026-07-17 · Estado: aprobado en brainstorming, pendiente de spec review

---

## 1. Contexto

**El reto (Platzi):** "Clona tu app favorita." Recrear la funcionalidad esencial de una app de uso
diario, **dirigiendo un agente de código** (el proceso es parte del reto). Debe incluir:

- **Un clon funcional:** la mecánica central funciona de verdad, no una maqueta (si es un Wordle,
  se tiene que poder jugar).
- **Construido dirigiendo un agente de código** (aquí: Claude Code).
- **Tu toque personal:** al menos una diferencia o mejora sobre la app original.
- Empezar por la versión más simple que funcione y crecer desde ahí.

**La idea:** **Platzidle** — un clon de **Wordle** con temática tech y guiño a Platzi. La palabra
secreta es siempre un **término del mundo tech/Platzi** (PYTHON, DOCKER, LINUX, DATOS, NUBES…). Al
terminar la partida, una **tarjeta educativa** explica el término y **recomienda un curso real de
Platzi** para aprenderlo. Se juega de verdad: adivinas el término en 6 intentos con el feedback
clásico de colores.

**Por qué esta app:** Wordle es el ejemplo del propio enunciado, tiene un núcleo de juego pequeño y
100% testeable, y deja mucho espacio para un toque personal claro. (La otra idea explorada —clonar
*one sec*, la app de fricción anti-distracción— se **reserva para los retos en vivo**, donde se
puede desarrollar a fondo como extensión de navegador.)

## 2. Objetivos y no-objetivos

**Objetivos**
- **Clon funcional de Wordle** jugable de verdad: tablero, feedback de colores con manejo correcto
  de letras repetidas, teclado físico + en pantalla, victoria/derrota.
- **Temática tech + guiño a Platzi (toque personal):** términos tech; al terminar, tarjeta con
  definición + **curso real de Platzi**.
- **Largo de palabra variable** (el tablero se adapta al largo del término).
- **Dos modos:** reto **diario** (término del día por fecha, igual para todos) + **práctica**
  ilimitada.
- **Pista de categoría visible** desde el inicio de cada partida.
- **Compartir** el resultado como grilla de emojis (estilo Wordle) con guiño a Platzi.
- Consistente con el patrón de la liga: carpeta `reto-08/` autocontenida, Astro estático +
  `@astrojs/cloudflare`, TypeScript, Vitest, README, `docs/superpowers/{specs,plans}`.

**No-objetivos (YAGNI)**
- Sin backend ni base de datos: todo se resuelve en el cliente (la palabra vive en el fuente, como
  el Wordle original; se acepta para un juego de portafolio).
- Sin IA en runtime ni llamadas de red: contenido resuelto en build time.
- Sin cuentas de usuario ni sincronización entre dispositivos: estadísticas en `localStorage`.
- Sin diccionario de validación de intentos: se acepta cualquier combinación A–Z del largo exacto.
- Sin Ñ ni acentos en v1: la lista usa solo términos A–Z (extensible después).
- Sin multi-idioma ni dificultades configurables en v1.

## 3. Decisiones tomadas en brainstorming

| Decisión | Elección |
|----------|----------|
| App a clonar | Wordle (con temática tech/Platzi) |
| Enfoque | A — Astro estático + Cloudflare (espejo de reto-05), todo client-side |
| Rol de Platzi | Palabras tech + tarjeta con curso real de Platzi al terminar |
| Largo de palabra | **Variable** por término (tablero se adapta) |
| Modos | **Ambos**: diario (por fecha) + práctica ilimitada |
| Intentos | **6** (clásico) |
| Alfabeto | A–Z, **sin Ñ ni acentos** en v1 |
| Pista | **Categoría visible** desde el inicio |
| Validación de intento | Sin diccionario; cualquier combinación del largo exacto |
| Persistencia | `localStorage` (estado del diario + estadísticas) |
| Zona horaria del "día" | America/Bogotá |

## 4. Arquitectura

Astro 6 **estático** + adaptador `@astrojs/cloudflare` → Cloudflare Workers. TypeScript vanilla,
sin frameworks de UI. **Lógica pura y testeable en `src/lib/`**, **datos curados en `src/data/`**,
componentes Astro para el markup y **un** script de cliente que orquesta el DOM. Sin backend, sin
IA en runtime, cero llamadas de red: todo se resuelve en el cliente.

**Estructura de archivos** (dentro de `reto-08/`, espejo del patrón de la liga):

```
reto-08/
  README.md
  astro.config.mjs · wrangler.toml · tsconfig.json · vitest.config.ts · package.json
  src/
    data/
      words.ts          # ÚNICA fuente: términos + definición + categoría + curso Platzi
      words.test.ts     # integridad de datos
    lib/
      game.ts           # PURO: evaluateGuess(answer, guess) → estados de casillas; ganó/perdió
      game.test.ts
      daily.ts          # PURO: índice del día por fecha (America/Bogotá), nº de puzzle, práctica
      daily.test.ts
      share.ts          # PURO: arma la grilla de emojis + texto para compartir
      share.test.ts
    components/          # Header · Board · Keyboard · HowToPlay · ResultCard · Footer
    scripts/
      game-ui.ts        # une el DOM: input, render tablero/teclado, estado, persistencia
    styles/global.css
    pages/index.astro
```

### 4.1 Modelo de datos (`words.ts`)

Cada término es un objeto:

```ts
export interface Term {
  word: string;        // A–Z mayúsculas, sin acentos/Ñ. Su .length define el largo del tablero.
  category: string;    // pista visible: "Cloud", "Frontend", "DevOps", "Data", "IA", "Diseño"…
  definition: string;  // 1–2 líneas
  course: { name: string; url: string }; // curso REAL de Platzi
}
```

- **v1: ~30–40 términos** curados, con **cursos reales de Platzi**. Los nombres/URLs se verifican
  durante la implementación; si una URL puntual no se puede verificar, se enlaza a la página del
  curso/ruta que sí exista (nunca una URL inventada).
- La lista se **baraja de forma determinista** (semilla fija) para el orden del diario, de modo que
  no sea alfabético/predecible pero sí estable entre corridas.

### 4.2 Lógica pura (`lib/`)

- **`game.ts`**
  - `evaluateGuess(answer, guess): TileState[]` → arreglo de `"correct" | "present" | "absent"` con
    el **algoritmo por conteo** (primero marca verdes, descuenta esas letras, luego reparte amarillos
    por ocurrencia restante — maneja bien las letras repetidas).
  - `isWin(states): boolean` → todas `correct`.
- **`daily.ts`**
  - `puzzleNumber(date): number` → días transcurridos desde la fecha **epoch fija
    `2026-07-20` (America/Bogotá)** = "Platzidle #1". `puzzleNumber` empieza en 1 ese día.
  - `dailyIndex(date, listLen): number` → índice determinista y estable en rango, a partir del
    `puzzleNumber` sobre la lista **ya barajada** (ver §4.1). Cada día puede tener un término de
    largo distinto; el tablero se re-renderiza al `.length` del término activo en cada carga.
  - `pickPractice(listLen, excludeIndex?): number` → índice al azar para práctica.
- **`share.ts`**
  - `buildShareText({ puzzleNumber, rows, won, mode }): string` → título "Platzidle #N" + grilla de
    emojis (🟩🟨⬛) fila por fila + tagline con Platzi.

### 4.3 UI (componentes + `game-ui.ts`)

- **Componentes Astro** (solo markup + estilos): `Header` (título + chip de categoría + acceso a
  ayuda/estadísticas), `Board` (grilla N×6), `Keyboard` (A–Z + ENTER/BORRAR), `HowToPlay` (modal),
  `ResultCard` (tarjeta Platzi al terminar), `Footer`.
- **`game-ui.ts`** (único script de cliente): lee el término activo (diario o práctica), pinta el
  tablero/teclado, procesa entrada (físico + en pantalla), aplica `evaluateGuess`, colorea casillas
  y teclado, maneja fin de partida (ResultCard + estadísticas), persistencia y compartir.

## 5. Flujo de juego

```
[carga] → determina modo (diario por defecto)
   │        diario:   idx = dailyIndex(hoy_Bogotá, N);   restaura estado si ya empezó hoy
   │        práctica: idx = pickPractice(N)
   ▼
[muestra] tablero N×6 + chip "Categoría: <category>" + teclado
   ▼
[input] escribe letras → ENTER
   │  fila incompleta → shake + "Faltan letras" (no consume intento)
   │  fila completa   → evaluateGuess → colorea casillas + teclado; persiste estado (diario)
   ▼
[¿fin?]  win (acierto) o 6 intentos fallidos (revela respuesta)
   ▼
[ResultCard] término + definición + "Aprende más: <curso> en Platzi" (enlace real)
             + estadísticas (jugadas, %, racha, distribución) + botón Compartir
             + en práctica: "Jugar otra"
```

## 6. Estado y persistencia (`localStorage`)

- **Partida diaria** — clave `platzidle:daily:<puzzleNumber>`, valor JSON
  `{ guesses: string[], status: "playing" | "won" | "lost" }` → **sobrevive al refresh**; no deja
  repetir el diario de hoy.
- **Estadísticas** — clave `platzidle:stats`, valor JSON
  `{ played, wins, currentStreak, maxStreak, distribution: number[6] }`. Se muestran al terminar.
- **Práctica**: no persiste (cada "jugar otra" empieza limpio).

## 7. Manejo de errores / casos borde

- Fila incompleta al ENTER → *shake* + aviso "Faltan letras" (no consume intento).
- **Letras repetidas** coloreadas correctamente (cubierto por tests con los casos clásicos).
- `localStorage` no disponible o corrupto → el juego corre **en memoria** igual (try/catch,
  degradación elegante).
- **Clipboard** no disponible → fallback mostrando el texto para copiar a mano.
- **Fecha/zona**: el día se calcula en **America/Bogotá**, así el diario cambia a medianoche de
  Colombia (consistente con los otros retos).
- Reingreso al diario ya terminado: muestra el resultado y estadísticas, no permite más intentos.

## 8. Testing (Vitest — solo lógica pura)

- `game.ts`: `evaluateGuess` incluyendo los **casos difíciles de letras repetidas**; `isWin`.
- `daily.ts`: `dailyIndex` **determinista y estable** por fecha y dentro de rango; `puzzleNumber`
  correcto; comportamiento en cambios de día (zona Bogotá).
- `share.ts`: la grilla de emojis corresponde exactamente a los estados de las casillas.
- `words.ts`: integridad de datos — todo A–Z sin Ñ/acentos, sin duplicados, cada término con
  `definition`, `category`, `course.name` y `course.url` no vacíos; tamaño mínimo de lista.
- **Estabilidad del barajado**: el orden barajado de la lista es reproducible con la semilla fija
  (un edit al orden de `words.ts` no debe cambiar en silencio los términos/números de puzzles
  pasados).

## 9. Cómo cumple el reto

| Requisito | Cómo se cumple |
|-----------|----------------|
| Clon funcional (no maqueta) | Wordle jugable de verdad; lógica bajo tests |
| Dirigido con agente de código | Construido con Claude Code; proceso documentado en README + specs |
| Toque personal (≥1 mejora) | Temática tech + tarjeta con curso real de Platzi; largo variable; práctica ilimitada; pista de categoría |
| Versión más simple primero | v1 client-side sin backend; extensiones listadas abajo |

## 10. Extensiones futuras (fuera de v1)

- Soporte de Ñ/acentos y lista ampliada de términos.
- Modo "ruta de aprendizaje" (elegir Frontend/Data/IA… y jugar términos de esa ruta).
- Rachas por modo, logros, o backend para palabra del día no espiable + estadísticas globales.
- Botón de pista adicional (revelar una letra a cambio de "gastar" algo).
