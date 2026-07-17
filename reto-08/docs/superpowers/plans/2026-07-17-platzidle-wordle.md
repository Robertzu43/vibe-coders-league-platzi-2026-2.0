# Platzidle (Wordle clone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build **Platzidle**, a functional Wordle clone with tech/Platzi-themed words that recommends a real Platzi course when the game ends.

**Architecture:** Astro static site + `@astrojs/cloudflare` (mirror of reto-05 GOLAZO). All game logic is pure and lives in `src/lib/` (tested with Vitest); curated terms live in `src/data/words.ts`; Astro components render the shell; a single client script `src/scripts/game-ui.ts` wires the DOM, state and `localStorage`. No backend, no AI, no network at runtime — the word list is bundled into the client (accepted for a portfolio game, like the real Wordle).

**Tech Stack:** Astro 6, `@astrojs/cloudflare`, TypeScript (vanilla, no UI framework), Vitest. Deployed to Cloudflare Workers via Wrangler.

**Spec:** `reto-08/docs/superpowers/specs/2026-07-17-platzidle-wordle-design.md`

**Conventions (match the repo):**
- Pure logic in `src/lib/*.ts` with a co-located `*.test.ts`. Tests use Vitest globals (`describe`/`it`/`expect`) — no imports of the test runner.
- Client scripts export an `initX()` function; components load them with `<script>import { initX } from '../scripts/x'; initX();</script>`.
- Words/terms are UPPERCASE, A–Z only (no Ñ/accents) in v1.
- Run all commands from inside `reto-08/`.

---

## Task 1: Scaffold reto-08 (Astro + Cloudflare + Vitest)

**Files:**
- Create: `reto-08/package.json`
- Create: `reto-08/astro.config.mjs`
- Create: `reto-08/wrangler.toml`
- Create: `reto-08/tsconfig.json`
- Create: `reto-08/vitest.config.ts`
- Create: `reto-08/.gitignore`

- [ ] **Step 1: Create `reto-08/package.json`**

```json
{
  "name": "platzidle",
  "type": "module",
  "version": "0.0.1",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "deploy": "astro build && wrangler deploy",
    "astro": "astro",
    "test": "vitest run"
  },
  "dependencies": {
    "@astrojs/cloudflare": "^13.0.0",
    "astro": "^6.0.4"
  },
  "devDependencies": {
    "@astrojs/check": "^0.9.0",
    "@cloudflare/workers-types": "^5.20260708.1",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0",
    "wrangler": "^4.61.1"
  }
}
```

- [ ] **Step 2: Create `reto-08/astro.config.mjs`**

```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

- [ ] **Step 3: Create `reto-08/wrangler.toml`**

```toml
name = "platzidle"
main = "@astrojs/cloudflare/entrypoints/server"
compatibility_date = "2025-05-21"
compatibility_flags = ["nodejs_compat"]
```

- [ ] **Step 4: Create `reto-08/tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": { "types": ["@cloudflare/workers-types", "vitest/globals"] }
}
```

- [ ] **Step 5: Create `reto-08/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 6: Create `reto-08/.gitignore`**

```
node_modules/
dist/
.astro/
.wrangler/
.dev.vars
```

- [ ] **Step 7: Install dependencies**

Run: `cd reto-08 && npm install`
Expected: dependencies install, `node_modules/` created, no fatal errors.

- [ ] **Step 8: Verify Vitest runs (no tests yet)**

Run: `cd reto-08 && npm test`
Expected: Vitest reports "No test files found" (exit is fine) — confirms the toolchain works.

- [ ] **Step 9: Commit**

```bash
git add reto-08/package.json reto-08/astro.config.mjs reto-08/wrangler.toml reto-08/tsconfig.json reto-08/vitest.config.ts reto-08/.gitignore reto-08/package-lock.json
git commit -m "chore(reto-08): scaffold Astro + Cloudflare + Vitest for Platzidle"
```

---

## Task 2: Word list + data-integrity tests (`words.ts`)

**Files:**
- Create: `reto-08/src/data/words.ts`
- Test: `reto-08/src/data/words.test.ts`

- [ ] **Step 1: Write the failing test** — `reto-08/src/data/words.test.ts`

```ts
import { terms, type Term } from './words';

describe('terms data integrity', () => {
  it('has a healthy number of terms', () => {
    expect(terms.length).toBeGreaterThanOrEqual(25);
  });

  it('every word is UPPERCASE A–Z only (no Ñ/accents/spaces)', () => {
    for (const t of terms) expect(t.word).toMatch(/^[A-Z]+$/);
  });

  it('every term has non-empty definition, category and course', () => {
    for (const t of terms) {
      expect(t.definition.trim().length).toBeGreaterThan(0);
      expect(t.category.trim().length).toBeGreaterThan(0);
      expect(t.course.name.trim().length).toBeGreaterThan(0);
      expect(t.course.url).toMatch(/^https:\/\/platzi\.com\//);
    }
  });

  it('has no duplicate words', () => {
    const seen = new Set<string>();
    for (const t of terms) {
      expect(seen.has(t.word)).toBe(false);
      seen.add(t.word);
    }
  });

  it('words are between 3 and 10 letters (board stays reasonable)', () => {
    for (const t of terms) {
      expect(t.word.length).toBeGreaterThanOrEqual(3);
      expect(t.word.length).toBeLessThanOrEqual(10);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reto-08 && npx vitest run src/data/words.test.ts`
Expected: FAIL — cannot resolve `./words`.

- [ ] **Step 3: Write minimal implementation** — `reto-08/src/data/words.ts`

> **IMPORTANT — course URLs:** the list below is a starting seed. Before committing, **verify each `course.url` resolves on platzi.com**. If a specific course slug can't be confirmed, link to the school/route page that does exist (e.g. `https://platzi.com/escuela/...`). **Never ship an invented URL.** Expand the list to **at least 25 terms** (add more tech terms + real courses following the same shape).

```ts
export interface Term {
  /** UPPERCASE, A–Z only. Its .length drives the board width. */
  word: string;
  /** Visible hint shown before guessing, e.g. "Cloud", "Frontend", "Data". */
  category: string;
  /** 1–2 line explanation shown when the game ends. */
  definition: string;
  /** A real Platzi course to learn more. */
  course: { name: string; url: string };
}

export const terms: Term[] = [
  { word: 'PYTHON', category: 'Lenguajes',
    definition: 'Lenguaje de programación versátil, popular en datos e IA.',
    course: { name: 'Curso de Python', url: 'https://platzi.com/cursos/python/' } },
  { word: 'DOCKER', category: 'DevOps',
    definition: 'Empaqueta tu app y sus dependencias en contenedores portables.',
    course: { name: 'Curso de Docker', url: 'https://platzi.com/cursos/docker/' } },
  { word: 'LINUX', category: 'Sistemas',
    definition: 'Sistema operativo de código abierto que corre la mayoría de servidores.',
    course: { name: 'Curso de Introducción a Linux', url: 'https://platzi.com/cursos/linux/' } },
  { word: 'REACT', category: 'Frontend',
    definition: 'Librería de JavaScript para construir interfaces por componentes.',
    course: { name: 'Curso de React', url: 'https://platzi.com/cursos/react/' } },
  { word: 'DATOS', category: 'Data',
    definition: 'La materia prima del análisis; se limpian, modelan y visualizan.',
    course: { name: 'Curso de Fundamentos de Ingeniería de Datos', url: 'https://platzi.com/cursos/ingenieria-datos/' } },
  { word: 'NUBES', category: 'Cloud',
    definition: 'Infraestructura donde corren tus apps sin servidores propios.',
    course: { name: 'Curso de Introducción a Cloud Computing', url: 'https://platzi.com/cursos/aws-fundamentos/' } },
  { word: 'TOKEN', category: 'Backend',
    definition: 'Credencial que autentica y autoriza peticiones (p. ej. JWT).',
    course: { name: 'Curso de Autenticación con JWT', url: 'https://platzi.com/cursos/jwt/' } },
  { word: 'CACHE', category: 'Backend',
    definition: 'Almacén temporal que acelera respuestas repetidas.',
    course: { name: 'Curso de Redis', url: 'https://platzi.com/cursos/redis/' } },
  { word: 'QUERY', category: 'Bases de datos',
    definition: 'Consulta que pide o modifica datos, típicamente en SQL.',
    course: { name: 'Curso de SQL', url: 'https://platzi.com/cursos/sql/' } },
  { word: 'CLASE', category: 'POO',
    definition: 'Plantilla que define atributos y métodos de un objeto.',
    course: { name: 'Curso de Programación Orientada a Objetos', url: 'https://platzi.com/cursos/oop/' } },
  { word: 'ARRAY', category: 'Programación',
    definition: 'Estructura que guarda una lista ordenada de elementos.',
    course: { name: 'Curso de Estructuras de Datos', url: 'https://platzi.com/cursos/estructuras-datos/' } },
  { word: 'DEBUG', category: 'Programación',
    definition: 'Proceso de encontrar y corregir errores en el código.',
    course: { name: 'Curso de Debugging', url: 'https://platzi.com/cursos/debugging/' } },
  { word: 'GITHUB', category: 'Herramientas',
    definition: 'Plataforma para alojar repositorios y colaborar con Git.',
    course: { name: 'Curso de Git y GitHub', url: 'https://platzi.com/cursos/git-github/' } },
  { word: 'MODELO', category: 'IA',
    definition: 'Sistema entrenado con datos para predecir o generar resultados.',
    course: { name: 'Curso de Fundamentos de Machine Learning', url: 'https://platzi.com/cursos/fundamentos-ml/' } },
  { word: 'PROMPT', category: 'IA',
    definition: 'Instrucción en lenguaje natural que guía a un modelo de IA.',
    course: { name: 'Curso de Prompt Engineering', url: 'https://platzi.com/cursos/prompt-engineering-chatgpt/' } },
];
```

- [ ] **Step 4: Run test to verify it passes** (after expanding to ≥25 terms)

Run: `cd reto-08 && npx vitest run src/data/words.test.ts`
Expected: PASS — all integrity checks green.

- [ ] **Step 5: Commit**

```bash
git add reto-08/src/data/words.ts reto-08/src/data/words.test.ts
git commit -m "feat(reto-08): curated tech/Platzi word list + integrity tests"
```

---

## Task 3: Guess evaluation logic (`game.ts`)

The heart of the clone: colour feedback with correct duplicate-letter handling.

**Files:**
- Create: `reto-08/src/lib/game.ts`
- Test: `reto-08/src/lib/game.test.ts`

- [ ] **Step 1: Write the failing test** — `reto-08/src/lib/game.test.ts`

```ts
import { evaluateGuess, isWin } from './game';

describe('evaluateGuess', () => {
  it('marks every tile correct on an exact match', () => {
    expect(evaluateGuess('REACT', 'REACT')).toEqual(
      ['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('marks a letter present when it exists in another position', () => {
    // answer LINUX, guess NXILU: all letters exist, none in place
    expect(evaluateGuess('LINUX', 'NXILU')).toEqual(
      ['present', 'present', 'present', 'present', 'present']);
  });

  it('marks absent letters', () => {
    // answer DATOS, guess PYQWK: none present
    expect(evaluateGuess('DATOS', 'PYQWK')).toEqual(
      ['absent', 'absent', 'absent', 'absent', 'absent']);
  });

  it('handles a duplicate in the guess against a single in the answer', () => {
    // answer LINUX (one L), guess LLAMA: first L correct, second L absent
    expect(evaluateGuess('LINUX', 'LLAMA')).toEqual(
      ['correct', 'absent', 'absent', 'absent', 'absent']);
  });

  it('handles duplicates in the answer (ARRAY vs RADAR)', () => {
    // answer A R R A Y, guess R A D A R
    expect(evaluateGuess('ARRAY', 'RADAR')).toEqual(
      ['present', 'present', 'absent', 'correct', 'present']);
  });
});

describe('isWin', () => {
  it('is true when all tiles are correct', () => {
    expect(isWin(['correct', 'correct', 'correct'])).toBe(true);
  });
  it('is false when any tile is not correct', () => {
    expect(isWin(['correct', 'present', 'correct'])).toBe(false);
  });
  it('is false for an empty array', () => {
    expect(isWin([])).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reto-08 && npx vitest run src/lib/game.test.ts`
Expected: FAIL — cannot resolve `./game`.

- [ ] **Step 3: Write minimal implementation** — `reto-08/src/lib/game.ts`

```ts
export type TileState = 'correct' | 'present' | 'absent';

/**
 * Evalúa un intento contra la respuesta con el algoritmo por conteo:
 *   1) marca 'correct' las letras en su posición exacta y las descuenta del pool,
 *   2) marca 'present' las que aún quedan en el pool (por ocurrencia); el resto 'absent'.
 * `answer` y `guess` deben tener el mismo largo, en mayúsculas A–Z.
 */
export function evaluateGuess(answer: string, guess: string): TileState[] {
  const n = answer.length;
  const states: TileState[] = new Array(n).fill('absent');
  const pool: Record<string, number> = {};
  for (const ch of answer) pool[ch] = (pool[ch] ?? 0) + 1;

  // Paso 1: verdes (posición exacta).
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      states[i] = 'correct';
      pool[guess[i]]--;
    }
  }
  // Paso 2: amarillos (existe pero en otra posición, mientras quede en el pool).
  for (let i = 0; i < n; i++) {
    if (states[i] === 'correct') continue;
    const ch = guess[i];
    if ((pool[ch] ?? 0) > 0) {
      states[i] = 'present';
      pool[ch]--;
    }
  }
  return states;
}

/** ¿El intento acertó por completo? */
export function isWin(states: TileState[]): boolean {
  return states.length > 0 && states.every((s) => s === 'correct');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd reto-08 && npx vitest run src/lib/game.test.ts`
Expected: PASS — all 8 cases green (duplicate cases included).

- [ ] **Step 5: Commit**

```bash
git add reto-08/src/lib/game.ts reto-08/src/lib/game.test.ts
git commit -m "feat(reto-08): guess evaluation with duplicate-letter handling"
```

---

## Task 4: Daily word selection + seeded shuffle (`daily.ts`)

**Files:**
- Create: `reto-08/src/lib/daily.ts`
- Test: `reto-08/src/lib/daily.test.ts`

- [ ] **Step 1: Write the failing test** — `reto-08/src/lib/daily.test.ts`

```ts
import { puzzleNumber, dailyIndex, seededShuffle, mulberry32 } from './daily';

// Epoch = 2026-07-20 00:00 America/Bogotá (UTC-5) = 2026-07-20 05:00 UTC.
const atBogota = (iso: string) => new Date(iso); // pass explicit UTC instants below

describe('puzzleNumber', () => {
  it('is 1 at midday on the epoch day (Bogotá)', () => {
    // 2026-07-20 12:00 Bogotá = 17:00 UTC
    expect(puzzleNumber(new Date('2026-07-20T17:00:00Z'))).toBe(1);
  });
  it('is still 1 late on the epoch day (Bogotá 23:30 = next-day 04:30 UTC)', () => {
    expect(puzzleNumber(new Date('2026-07-21T04:30:00Z'))).toBe(1);
  });
  it('rolls to 2 after Bogotá midnight (00:30 Bogotá = 05:30 UTC)', () => {
    expect(puzzleNumber(new Date('2026-07-21T05:30:00Z'))).toBe(2);
  });
});

describe('dailyIndex', () => {
  it('stays within [0, listLen)', () => {
    for (let d = 0; d < 40; d++) {
      const when = new Date(Date.UTC(2026, 6, 20, 17) + d * 86400000);
      const idx = dailyIndex(when, 15);
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThan(15);
    }
  });
});

describe('mulberry32 / seededShuffle', () => {
  it('is deterministic for the same seed', () => {
    const a = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 123);
    const b = seededShuffle([1, 2, 3, 4, 5, 6, 7, 8], 123);
    expect(a).toEqual(b);
  });
  it('produces a permutation (same multiset)', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = seededShuffle(input, 999);
    expect([...out].sort((x, y) => x - y)).toEqual(input);
  });
  it('does not mutate the input array', () => {
    const input = [1, 2, 3];
    seededShuffle(input, 7);
    expect(input).toEqual([1, 2, 3]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reto-08 && npx vitest run src/lib/daily.test.ts`
Expected: FAIL — cannot resolve `./daily`.

- [ ] **Step 3: Write minimal implementation** — `reto-08/src/lib/daily.ts`

```ts
const DAY_MS = 86_400_000;
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000; // America/Bogotá = UTC-5 (sin DST)

/** Índice de día calendario en Bogotá para un instante dado. */
function bogotaDayIndex(now: Date): number {
  return Math.floor((now.getTime() - BOGOTA_OFFSET_MS) / DAY_MS);
}

/** Día calendario del epoch (2026-07-20) según el reloj de pared. */
const EPOCH_DAY = Math.floor(Date.UTC(2026, 6, 20) / DAY_MS);

/** Número de puzzle: #1 el 2026-07-20 en Bogotá, +1 por cada día. */
export function puzzleNumber(now: Date): number {
  return bogotaDayIndex(now) - EPOCH_DAY + 1;
}

/** Índice determinista dentro de la lista (ya barajada) para el día de `now`. */
export function dailyIndex(now: Date, listLen: number): number {
  const n = puzzleNumber(now) - 1;
  return ((n % listLen) + listLen) % listLen; // seguro ante números negativos
}

/** PRNG determinista mulberry32. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates determinista: copia barajada con semilla fija (no muta la entrada). */
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const a = arr.slice();
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Índice al azar para práctica (evita `exclude` si se indica). */
export function pickPractice(listLen: number, exclude?: number): number {
  if (listLen <= 1) return 0;
  let i = Math.floor(Math.random() * listLen);
  if (exclude !== undefined) {
    while (i === exclude) i = Math.floor(Math.random() * listLen);
  }
  return i;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd reto-08 && npx vitest run src/lib/daily.test.ts`
Expected: PASS — puzzle number, range and shuffle determinism all green.

- [ ] **Step 5: Commit**

```bash
git add reto-08/src/lib/daily.ts reto-08/src/lib/daily.test.ts
git commit -m "feat(reto-08): daily word selection + deterministic seeded shuffle"
```

---

## Task 5: Share text (`share.ts`)

**Files:**
- Create: `reto-08/src/lib/share.ts`
- Test: `reto-08/src/lib/share.test.ts`

- [ ] **Step 1: Write the failing test** — `reto-08/src/lib/share.test.ts`

```ts
import { buildShareText } from './share';

describe('buildShareText', () => {
  it('renders a daily win with score and emoji grid', () => {
    const text = buildShareText({
      puzzleNumber: 3, won: true, maxAttempts: 6, mode: 'daily',
      rows: [
        ['absent', 'present', 'absent', 'absent', 'absent'],
        ['correct', 'correct', 'correct', 'correct', 'correct'],
      ],
    });
    expect(text).toContain('Platzidle #3 2/6');
    expect(text).toContain('⬛🟨⬛⬛⬛');
    expect(text).toContain('🟩🟩🟩🟩🟩');
    expect(text).toContain('Platzi');
  });

  it('renders a loss as X/6', () => {
    const text = buildShareText({
      puzzleNumber: 3, won: false, maxAttempts: 6, mode: 'daily',
      rows: [['absent', 'absent', 'absent']],
    });
    expect(text).toContain('Platzidle #3 X/6');
  });

  it('labels practice mode without a puzzle number', () => {
    const text = buildShareText({
      puzzleNumber: 3, won: true, maxAttempts: 6, mode: 'practice',
      rows: [['correct', 'correct', 'correct']],
    });
    expect(text).toContain('práctica');
    expect(text).not.toContain('#3');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd reto-08 && npx vitest run src/lib/share.test.ts`
Expected: FAIL — cannot resolve `./share`.

- [ ] **Step 3: Write minimal implementation** — `reto-08/src/lib/share.ts`

```ts
import type { TileState } from './game';

const EMOJI: Record<TileState, string> = { correct: '🟩', present: '🟨', absent: '⬛' };

export interface ShareInput {
  puzzleNumber: number;
  rows: TileState[][];   // una fila por intento
  won: boolean;
  maxAttempts: number;   // 6
  mode: 'daily' | 'practice';
}

/** Arma el texto para compartir: encabezado + grilla de emojis + guiño a Platzi. */
export function buildShareText({ puzzleNumber, rows, won, maxAttempts, mode }: ShareInput): string {
  const score = won ? `${rows.length}/${maxAttempts}` : `X/${maxAttempts}`;
  const head = mode === 'daily'
    ? `Platzidle #${puzzleNumber} ${score}`
    : `Platzidle (práctica) ${score}`;
  const grid = rows.map((r) => r.map((s) => EMOJI[s]).join('')).join('\n');
  return `${head}\n${grid}\n🎓 Aprende en Platzi`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd reto-08 && npx vitest run src/lib/share.test.ts`
Expected: PASS.

- [ ] **Step 5: Run the full suite**

Run: `cd reto-08 && npm test`
Expected: PASS — all four suites (words, game, daily, share) green.

- [ ] **Step 6: Commit**

```bash
git add reto-08/src/lib/share.ts reto-08/src/lib/share.test.ts
git commit -m "feat(reto-08): emoji share text"
```

---

## Task 6: Astro UI shell (components + page)

Pure markup + structure. The board and keyboard are rendered/coloured by `game-ui.ts` (Task 7); here we build the static shell and containers.

**Files:**
- Create: `reto-08/src/components/Header.astro`
- Create: `reto-08/src/components/Board.astro`
- Create: `reto-08/src/components/Keyboard.astro`
- Create: `reto-08/src/components/HowToPlay.astro`
- Create: `reto-08/src/components/ResultCard.astro`
- Create: `reto-08/src/components/Footer.astro`
- Create: `reto-08/src/pages/index.astro`

- [ ] **Step 1: Create `Header.astro`**

```astro
---
---
<header class="hd">
  <div class="hd-row">
    <h1 class="brand">Platzi<span>dle</span></h1>
    <div class="hd-actions">
      <button id="btn-help" class="icon-btn" aria-label="Cómo jugar" title="Cómo jugar">?</button>
      <button id="btn-stats" class="icon-btn" aria-label="Estadísticas" title="Estadísticas">📊</button>
    </div>
  </div>
  <div class="hd-sub">
    <span id="mode-label" class="mode-label">Reto del día</span>
    <span id="category-chip" class="chip" aria-live="polite">Categoría: —</span>
  </div>
</header>
```

- [ ] **Step 2: Create `Board.astro`** (JS fills it based on word length)

```astro
---
---
<main class="board-wrap">
  <div id="board" class="board" aria-label="Tablero de juego"></div>
  <p id="toast" class="toast" role="alert" aria-live="assertive" hidden></p>
</main>
```

- [ ] **Step 3: Create `Keyboard.astro`** (static keys; `data-key` drives input)

```astro
---
const rows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
---
<div id="keyboard" class="keyboard" aria-label="Teclado">
  {rows.map((row, i) => (
    <div class="kb-row">
      {i === 2 && <button class="key key-wide" data-key="ENTER">Enter</button>}
      {row.split('').map((k) => <button class="key" data-key={k}>{k}</button>)}
      {i === 2 && <button class="key key-wide" data-key="BACK">⌫</button>}
    </div>
  ))}
</div>
```

- [ ] **Step 4: Create `HowToPlay.astro`** (modal, hidden by default)

```astro
---
---
<div id="help-modal" class="modal" hidden>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="help-title">
    <button id="help-close" class="modal-close" aria-label="Cerrar">×</button>
    <h2 id="help-title">Cómo jugar</h2>
    <p>Adivina el término tech en <strong>6 intentos</strong>. Cada intento debe tener el largo exacto de la palabra.</p>
    <ul class="legend">
      <li><span class="tile mini correct">R</span> La letra está y en la posición correcta.</li>
      <li><span class="tile mini present">A</span> La letra está pero en otra posición.</li>
      <li><span class="tile mini absent">X</span> La letra no está en la palabra.</li>
    </ul>
    <p>La <strong>categoría</strong> es tu pista. Al terminar, te recomendamos un curso de Platzi. 🎓</p>
  </div>
</div>
```

- [ ] **Step 5: Create `ResultCard.astro`** (hidden; JS fills term/definition/course/stats)

```astro
---
---
<div id="result-modal" class="modal" hidden>
  <div class="modal-card" role="dialog" aria-modal="true" aria-labelledby="result-title">
    <button id="result-close" class="modal-close" aria-label="Cerrar">×</button>
    <p id="result-outcome" class="result-outcome"></p>
    <h2 id="result-title" class="result-term"></h2>
    <p id="result-cat" class="chip"></p>
    <p id="result-def" class="result-def"></p>
    <a id="result-course" class="course-link" href="#" target="_blank" rel="noopener noreferrer"></a>

    <dl class="stats-grid">
      <div><dt>Jugadas</dt><dd id="st-played">0</dd></div>
      <div><dt>% Victorias</dt><dd id="st-winrate">0</dd></div>
      <div><dt>Racha</dt><dd id="st-streak">0</dd></div>
      <div><dt>Máxima</dt><dd id="st-max">0</dd></div>
    </dl>

    <p class="dist-title">Distribución de intentos</p>
    <div id="dist" class="dist"></div>

    <div class="result-actions">
      <button id="btn-share" class="btn">Compartir</button>
      <button id="btn-again" class="btn btn-ghost">Jugar otra (práctica)</button>
    </div>
    <p id="share-fallback" class="share-fallback" hidden></p>
  </div>
</div>
```

- [ ] **Step 6: Create `Footer.astro`**

```astro
---
---
<footer class="ft">
  <p>Platzidle · un clon de Wordle con temática tech. Reto 08 · Vibe Coders League 2026.</p>
</footer>
```

- [ ] **Step 7: Create `index.astro`** (assembles the shell + loads the client script)

```astro
---
import '../styles/global.css';
import Header from '../components/Header.astro';
import Board from '../components/Board.astro';
import Keyboard from '../components/Keyboard.astro';
import HowToPlay from '../components/HowToPlay.astro';
import ResultCard from '../components/ResultCard.astro';
import Footer from '../components/Footer.astro';
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Platzidle · Wordle tech</title>
    <meta name="description" content="Adivina el término tech del día y aprende con Platzi. Un clon de Wordle con temática de programación." />
  </head>
  <body>
    <div class="app">
      <Header />
      <Board />
      <Keyboard />
      <Footer />
    </div>
    <HowToPlay />
    <ResultCard />
    <script>
      import { initGame } from '../scripts/game-ui';
      initGame();
    </script>
  </body>
</html>
```

- [ ] **Step 8: Verify the shell builds and renders**

Run: `cd reto-08 && npm run build`
Expected: build succeeds (the client script import will fail until Task 7 creates `game-ui.ts` — if so, proceed to Task 7 first, then re-run). To preview markup alone before Task 7, temporarily comment out the `<script>` block, run `npm run dev`, confirm header/board-wrap/keyboard render, then restore it.

- [ ] **Step 9: Commit**

```bash
git add reto-08/src/components reto-08/src/pages/index.astro
git commit -m "feat(reto-08): Astro UI shell (header, board, keyboard, modals)"
```

---

## Task 7: Game wiring, state & persistence (`game-ui.ts`)

Ties the DOM to the pure logic. Handles input (physical + on-screen), rendering, colouring, end-of-game result card, `localStorage` persistence and sharing.

**Files:**
- Create: `reto-08/src/scripts/game-ui.ts`

- [ ] **Step 1: Write `game-ui.ts`**

```ts
import { terms, type Term } from '../data/words';
import { evaluateGuess, isWin, type TileState } from '../lib/game';
import { puzzleNumber, dailyIndex, seededShuffle, pickPractice } from '../lib/daily';
import { buildShareText } from '../lib/share';

// Semilla fija: NO cambiar. Define el orden del diario. Nota: Fisher–Yates depende
// del largo del array, así que AGREGAR términos a words.ts rebaraja todo y cambiaría
// los puzzles pasados. Para v1 lo aceptamos (añade términos antes de publicar).
const SHUFFLE_SEED = 20260720;
const MAX_ATTEMPTS = 6;
const ORDER: Term[] = seededShuffle(terms, SHUFFLE_SEED);

type Mode = 'daily' | 'practice';
interface Stats { played: number; wins: number; currentStreak: number; maxStreak: number; distribution: number[]; }

const STATS_KEY = 'platzidle:stats';
const dailyKey = (n: number) => `platzidle:daily:${n}`;

// ---- persistencia (degrada a memoria si localStorage falla) ----
function readJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
}
function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignora */ }
}
function loadStats(): Stats {
  return readJSON<Stats>(STATS_KEY, { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: [0, 0, 0, 0, 0, 0] });
}
function saveStats(s: Stats): void { writeJSON(STATS_KEY, s); }

// ---- estado de juego ----
interface State { mode: Mode; term: Term; puzzleNo: number; guesses: string[]; current: string; status: 'playing' | 'won' | 'lost'; }
let state: State;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

function startDaily(): State {
  const now = new Date();
  const puzzleNo = puzzleNumber(now);
  const term = ORDER[dailyIndex(now, ORDER.length)];
  const saved = readJSON<{ guesses: string[]; status: State['status'] }>(dailyKey(puzzleNo), { guesses: [], status: 'playing' });
  return { mode: 'daily', term, puzzleNo, guesses: saved.guesses, current: '', status: saved.status };
}
function startPractice(prevIndex?: number): State {
  const idx = pickPractice(ORDER.length, prevIndex);
  return { mode: 'practice', term: ORDER[idx], puzzleNo: 0, guesses: [], current: '', status: 'playing' };
}

// ---- render ----
function renderCategory(): void { $('#category-chip').textContent = `Categoría: ${state.term.category}`; $('#mode-label').textContent = state.mode === 'daily' ? 'Reto del día' : 'Práctica'; }

function renderBoard(): void {
  const board = $('#board');
  const len = state.term.word.length;
  board.style.setProperty('--cols', String(len));
  board.innerHTML = '';
  for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const row = document.createElement('div');
    row.className = 'board-row';
    const guess = state.guesses[r];
    const isCurrentRow = r === state.guesses.length && state.status === 'playing';
    for (let c = 0; c < len; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      if (guess) {
        const states = evaluateGuess(state.term.word, guess);
        tile.textContent = guess[c];
        tile.classList.add(states[c], 'revealed');
      } else if (isCurrentRow && c < state.current.length) {
        tile.textContent = state.current[c];
        tile.classList.add('filled');
      }
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function renderKeyboard(): void {
  const best: Record<string, TileState> = {};
  const rank: Record<TileState, number> = { absent: 0, present: 1, correct: 2 };
  for (const g of state.guesses) {
    const st = evaluateGuess(state.term.word, g);
    for (let i = 0; i < g.length; i++) {
      const k = g[i];
      if (!(k in best) || rank[st[i]] > rank[best[k]]) best[k] = st[i];
    }
  }
  document.querySelectorAll<HTMLButtonElement>('.key').forEach((btn) => {
    const k = btn.dataset.key!;
    btn.classList.remove('correct', 'present', 'absent');
    if (best[k]) btn.classList.add(best[k]);
  });
}

let toastTimer: number | undefined;
function toast(msg: string): void {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { el.hidden = true; }, 1400);
}

// ---- input ----
function onKey(key: string): void {
  if (state.status !== 'playing') return;
  const len = state.term.word.length;
  if (key === 'ENTER') return submit();
  if (key === 'BACK') { state.current = state.current.slice(0, -1); return renderBoard(); }
  if (/^[A-Z]$/.test(key) && state.current.length < len) { state.current += key; renderBoard(); }
}

function submit(): void {
  const len = state.term.word.length;
  if (state.current.length !== len) {
    toast('Faltan letras');
    const rowEl = document.querySelectorAll('.board-row')[state.guesses.length];
    rowEl?.classList.add('shake');
    setTimeout(() => rowEl?.classList.remove('shake'), 300);
    return;
  }
  state.guesses.push(state.current);
  const won = isWin(evaluateGuess(state.term.word, state.current));
  state.current = '';
  if (won) state.status = 'won';
  else if (state.guesses.length >= MAX_ATTEMPTS) state.status = 'lost';
  if (state.mode === 'daily') writeJSON(dailyKey(state.puzzleNo), { guesses: state.guesses, status: state.status });
  renderBoard(); renderKeyboard();
  if (state.status !== 'playing') endGame(won);
}

// ---- fin de partida ----
function endGame(won: boolean): void {
  if (state.mode === 'daily') recordStats(won);
  const stats = loadStats();
  $('#result-outcome').textContent = won ? '¡Correcto! 🎉' : 'Fin del juego';
  $('#result-title').textContent = state.term.word;
  $('#result-cat').textContent = `Categoría: ${state.term.category}`;
  $('#result-def').textContent = state.term.definition;
  const link = $<HTMLAnchorElement>('#result-course');
  link.textContent = `🎓 Aprende más: ${state.term.course.name}`;
  link.href = state.term.course.url;
  $('#st-played').textContent = String(stats.played);
  $('#st-winrate').textContent = stats.played ? String(Math.round((stats.wins / stats.played) * 100)) : '0';
  $('#st-streak').textContent = String(stats.currentStreak);
  $('#st-max').textContent = String(stats.maxStreak);
  renderDistribution(stats, won && state.mode === 'daily' ? state.guesses.length : -1);
  openModal('#result-modal');
}

/** Histograma de intentos (1–6); resalta la fila del resultado actual. */
function renderDistribution(s: Stats, highlight: number): void {
  const max = Math.max(1, ...s.distribution);
  $('#dist').innerHTML = s.distribution.map((count, i) => {
    const pct = Math.max(Math.round((count / max) * 100), 8);
    const hot = i + 1 === highlight ? ' hot' : '';
    return `<div class="dist-row"><span class="dist-n">${i + 1}</span>` +
           `<div class="dist-bar${hot}" style="width:${pct}%">${count}</div></div>`;
  }).join('');
}

function recordStats(won: boolean): void {
  const s = loadStats();
  s.played += 1;
  if (won) { s.wins += 1; s.currentStreak += 1; s.maxStreak = Math.max(s.maxStreak, s.currentStreak); s.distribution[state.guesses.length - 1] += 1; }
  else { s.currentStreak = 0; }
  saveStats(s);
}

// ---- modales ----
function openModal(sel: string): void { $(sel).hidden = false; }
function closeModal(sel: string): void { $(sel).hidden = true; }

// ---- compartir ----
async function share(): Promise<void> {
  const rows = state.guesses.map((g) => evaluateGuess(state.term.word, g));
  const text = buildShareText({ puzzleNumber: state.puzzleNo, rows, won: state.status === 'won', maxAttempts: MAX_ATTEMPTS, mode: state.mode });
  try {
    await navigator.clipboard.writeText(text);
    toast('¡Copiado!');
  } catch {
    const fb = $('#share-fallback'); fb.textContent = text; fb.hidden = false;
  }
}

// ---- init ----
export function initGame(): void {
  state = startDaily();
  renderCategory(); renderBoard(); renderKeyboard();
  if (state.status !== 'playing') endGame(state.status === 'won');

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key === 'Enter' ? 'ENTER' : e.key === 'Backspace' ? 'BACK' : e.key.toUpperCase();
    if (k === 'ENTER' || k === 'BACK' || /^[A-Z]$/.test(k)) { e.preventDefault(); onKey(k); }
  });
  document.querySelectorAll<HTMLButtonElement>('.key').forEach((btn) =>
    btn.addEventListener('click', () => onKey(btn.dataset.key!)));

  $('#btn-help').addEventListener('click', () => openModal('#help-modal'));
  $('#help-close').addEventListener('click', () => closeModal('#help-modal'));
  $('#btn-stats').addEventListener('click', () => endGamePeek());
  $('#result-close').addEventListener('click', () => closeModal('#result-modal'));
  $('#btn-share').addEventListener('click', () => void share());
  $('#btn-again').addEventListener('click', () => {
    const prev = state.mode === 'practice' ? ORDER.indexOf(state.term) : undefined;
    state = startPractice(prev);
    closeModal('#result-modal');
    $('#share-fallback').hidden = true;
    renderCategory(); renderBoard(); renderKeyboard();
  });
}

/** Ver estadísticas sin terminar la partida (reusa el modal en modo lectura). */
function endGamePeek(): void {
  const stats = loadStats();
  $('#result-outcome').textContent = 'Tus estadísticas';
  $('#result-title').textContent = 'Platzidle';
  $('#result-cat').textContent = '';
  $('#result-def').textContent = '';
  const link = $<HTMLAnchorElement>('#result-course'); link.textContent = ''; link.removeAttribute('href');
  $('#st-played').textContent = String(stats.played);
  $('#st-winrate').textContent = stats.played ? String(Math.round((stats.wins / stats.played) * 100)) : '0';
  $('#st-streak').textContent = String(stats.currentStreak);
  $('#st-max').textContent = String(stats.maxStreak);
  renderDistribution(stats, -1);
  openModal('#result-modal');
}
```

- [ ] **Step 2: Type-check + build**

Run: `cd reto-08 && npx astro check && npm run build`
Expected: no type errors; build succeeds.

- [ ] **Step 3: Manual play verification (dev server)**

Run: `cd reto-08 && npm run dev`
Then in the browser (http://localhost:4321) confirm:
- Category chip shows a category; board width matches the word length.
- Typing letters fills tiles; Enter on an incomplete row shows "Faltan letras" (no row consumed).
- A full guess colours tiles (green/yellow/gray) and the keyboard updates.
- Winning and losing both open the result card with the term, definition and a working Platzi course link.
- "Jugar otra" starts a fresh practice game; "Compartir" copies text (check clipboard).
- Reload mid-daily: previous guesses are restored.

- [ ] **Step 4: Commit**

```bash
git add reto-08/src/scripts/game-ui.ts
git commit -m "feat(reto-08): game wiring, state machine, persistence, sharing"
```

---

## Task 8: Styles (`global.css`)

**Files:**
- Create: `reto-08/src/styles/global.css`

- [ ] **Step 1: Create `global.css`** (Platzi-flavoured: dark bg, green accent)

```css
:root {
  --bg: #0c1420; --panel: #121d2b; --ink: #e8eef5; --ink-soft: #9fb0c3;
  --line: #24344a; --green: #98c93c; --green-ink: #0c1420;
  --correct: #4a9d3f; --present: #c9a227; --absent: #38465a;
  --serif: 'Georgia', serif; --sans: system-ui, -apple-system, 'Segoe UI', sans-serif;
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: var(--sans); }
.app { max-width: 520px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; padding: 8px 12px; }

.hd { border-bottom: 1px solid var(--line); padding-bottom: 8px; }
.hd-row { display: flex; align-items: center; justify-content: space-between; }
.brand { font-family: var(--serif); font-size: 1.8rem; margin: 6px 0; letter-spacing: -.02em; }
.brand span { color: var(--green); }
.hd-actions { display: flex; gap: 8px; }
.icon-btn { background: var(--panel); color: var(--ink); border: 1px solid var(--line); border-radius: 8px; width: 38px; height: 38px; font-size: 1rem; cursor: pointer; }
.hd-sub { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; }
.mode-label { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); }
.chip { display: inline-block; background: var(--panel); border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; font-size: 13px; color: var(--green); }

.board-wrap { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; position: relative; padding: 16px 0; }
.board { display: grid; grid-template-rows: repeat(6, 1fr); gap: 6px; }
.board-row { display: grid; grid-template-columns: repeat(var(--cols, 5), 1fr); gap: 6px; }
.tile { width: 52px; height: 52px; display: grid; place-items: center; border: 2px solid var(--line); border-radius: 6px; font-size: 1.6rem; font-weight: 700; text-transform: uppercase; color: var(--ink); }
.tile.filled { border-color: var(--ink-soft); }
.tile.revealed { color: #fff; border: none; }
.tile.correct { background: var(--correct); }
.tile.present { background: var(--present); }
.tile.absent { background: var(--absent); }
.tile.mini { width: 30px; height: 30px; font-size: 1rem; }

@media (max-width: 400px) { .tile { width: 42px; height: 42px; font-size: 1.3rem; } }

.toast { position: absolute; top: 8px; background: var(--ink); color: var(--bg); padding: 8px 16px; border-radius: 8px; font-weight: 600; }

@keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-6px); } 75% { transform: translateX(6px); } }
.board-row.shake { animation: shake .3s; }

.keyboard { display: flex; flex-direction: column; gap: 6px; padding: 8px 0 14px; }
.kb-row { display: flex; gap: 5px; justify-content: center; }
.key { flex: 1; min-width: 26px; height: 52px; background: var(--panel); color: var(--ink); border: none; border-radius: 6px; font-size: .95rem; font-weight: 600; cursor: pointer; text-transform: uppercase; }
.key-wide { flex: 1.5; font-size: .8rem; }
.key.correct { background: var(--correct); color: #fff; }
.key.present { background: var(--present); color: #fff; }
.key.absent { background: var(--absent); color: var(--ink-soft); }

.ft { text-align: center; color: var(--ink-soft); font-size: 12px; padding: 10px 0; border-top: 1px solid var(--line); }

.modal { position: fixed; inset: 0; background: rgba(0,0,0,.6); display: grid; place-items: center; padding: 16px; z-index: 10; }
.modal[hidden] { display: none; }
.modal-card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 24px; max-width: 420px; width: 100%; position: relative; }
.modal-close { position: absolute; top: 10px; right: 12px; background: none; border: none; color: var(--ink-soft); font-size: 1.6rem; cursor: pointer; }
.legend { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.legend li { display: flex; align-items: center; gap: 10px; }

.result-outcome { font-size: 12px; text-transform: uppercase; letter-spacing: .08em; color: var(--ink-soft); margin: 0; }
.result-term { font-family: var(--serif); font-size: 2rem; margin: 4px 0; letter-spacing: .1em; }
.result-def { color: var(--ink-soft); }
.course-link { display: inline-block; margin: 6px 0 4px; color: var(--green); font-weight: 600; text-decoration: none; }
.course-link:hover { text-decoration: underline; }

.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 18px 0; }
.stats-grid dt { font-size: 11px; color: var(--ink-soft); text-transform: uppercase; }
.stats-grid dd { margin: 2px 0 0; font-size: 1.5rem; font-weight: 700; font-family: var(--serif); }

.dist-title { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--ink-soft); margin: 4px 0; }
.dist { display: flex; flex-direction: column; gap: 4px; margin: 4px 0 16px; }
.dist-row { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.dist-n { width: 12px; color: var(--ink-soft); }
.dist-bar { background: var(--absent); color: #fff; text-align: right; padding: 2px 8px; border-radius: 4px; min-width: 24px; font-weight: 600; }
.dist-bar.hot { background: var(--correct); }

.result-actions { display: flex; gap: 10px; }
.btn { flex: 1; background: var(--green); color: var(--green-ink); border: none; border-radius: 8px; padding: 12px; font-weight: 700; cursor: pointer; }
.btn-ghost { background: transparent; color: var(--ink); border: 1px solid var(--line); }
.share-fallback { margin-top: 10px; white-space: pre-wrap; background: var(--bg); border: 1px solid var(--line); border-radius: 8px; padding: 10px; font-size: 13px; }
```

- [ ] **Step 2: Visual verification**

Run: `cd reto-08 && npm run dev`
Confirm the board, keyboard and modals look right on desktop and narrow (mobile) widths; colours read clearly for correct/present/absent.

- [ ] **Step 3: Commit**

```bash
git add reto-08/src/styles/global.css
git commit -m "feat(reto-08): Platzi-flavoured styling"
```

---

## Task 9: README + evidence

**Files:**
- Create: `reto-08/README.md`
- Create: `reto-08/docs/evidence/README.md`
- Modify: root `README.md` (add reto-08 row + structure line)

- [ ] **Step 1: Write `reto-08/README.md`** following the style of reto-05/reto-07 READMEs: what it is (Platzidle), the challenge and how it's met, tech stack, how the AI-agent process worked, personal touches (tech theme + Platzi course card, variable length, practice mode, category hint), project structure, how to run/test/build/deploy, and a link to `docs/evidence/`.

- [ ] **Step 2: Write `reto-08/docs/evidence/README.md`** — capture verified evidence: `npm test` output (all suites green), a screenshot or description of a won game showing the Platzi course card, and a sample shared result grid. Only claim what was actually run.

- [ ] **Step 3: Update root `README.md`** — add the reto-08 row to the challenges table and a line to the repo-structure block:

Table row:
```
| 08 | [Platzidle — Clona tu app favorita (Wordle tech)](./reto-08) | Clon funcional / Juego (Astro + Cloudflare, temática Platzi) |
```
Structure line:
```
  reto-08/     Platzidle — clon de Wordle con términos tech + recomendación de curso Platzi (Astro + Cloudflare)
```

- [ ] **Step 4: Commit**

```bash
git add reto-08/README.md reto-08/docs/evidence/README.md README.md
git commit -m "docs(reto-08): README, evidence, root README link"
```

---

## Task 10: Final verification + deploy

- [ ] **Step 1: Full test suite**

Run: `cd reto-08 && npm test`
Expected: all suites (words, game, daily, share) PASS.

- [ ] **Step 2: Type check + production build**

Run: `cd reto-08 && npx astro check && npm run build`
Expected: no type errors; `dist/` produced.

- [ ] **Step 3: (Optional) Deploy to Cloudflare**

Run: `cd reto-08 && npm run deploy`
Expected: Wrangler deploys the Worker; note the URL for evidence. (Requires `wrangler login`.)

- [ ] **Step 4: Record the deployed URL in `docs/evidence/README.md` and commit if changed.**

---

## Done criteria

- `npm test` green (guess evaluation incl. duplicates, daily determinism, shuffle stability, share, data integrity).
- Game is playable end-to-end: daily + practice, colour feedback, keyboard sync, category hint, result card with a real Platzi course link, share, and daily state that survives reload.
- README documents the app, the agent-driven process and the personal touches; root README links reto-08.
```
