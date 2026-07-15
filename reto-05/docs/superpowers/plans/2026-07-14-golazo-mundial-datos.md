# GOLAZO · el Mundial en datos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build GOLAZO, a static, no-backend interactive landing that visualizes historical FIFA World Cup data across 6 connected sections, in the "Álbum Panini" aesthetic, deployed to Cloudflare Workers.

**Architecture:** Astro 6 static-content site (mirrors reto-02's proven config: `@astrojs/cloudflare` adapter, `nodejs_compat`). A single typed data module (`worldcup.ts`) is the source of truth; Astro renders each section's HTML + SVG at build; small vanilla-TS client scripts read data embedded as JSON/`data-*` and mutate the DOM for interactions (zero network at runtime). Charts are hand-rolled accessible SVG — no charting libraries.

**Tech Stack:** Astro 6, TypeScript, `@astrojs/cloudflare`, Wrangler, Vitest. No Supabase, no AI, no external data.

**Reference skills:** @superpowers:test-driven-development (data + chart-helper tasks), @dataviz (every chart), @frontend-design (Panini section styling).

**Validated chart palette (dataviz, light mode, surface `#fbf3e4`):**
- Categorical pair (confederación toggle): UEFA `#1f6fb8` · CONMEBOL `#e63946` — all checks pass.
- Extended categorical (if needed): `#e63946, #2a9d8f, #1f6fb8, #e08a1e` — all pass (gold `#e08a1e` requires visible labels; bars have them).
- Single-series marks (goals line, attendance bars): `#e63946`.
- Charts are **light-only by design** (the landing commits to the cream Panini look).

**Working location:** worktree `~/.config/superpowers/worktrees/vibe-coders-league-platzi-2026-2.0/reto-05-golazo`, branch `reto-05-golazo`. All paths below are relative to `reto-05/` inside that worktree. Run all commands from `reto-05/`.

---

## File Structure

```
reto-05/
  package.json, astro.config.mjs, wrangler.toml, tsconfig.json, vitest.config.ts, .gitignore
  src/
    data/worldcup.ts            # source of truth: champions, editions(goals), teams, venues, cup2026
    data/worldcup.test.ts       # data-integrity tests
    lib/chart.ts                # pure helpers: scaleLinear, formatInt, linePath
    lib/chart.test.ts           # helper tests
    styles/global.css           # Panini theme tokens + base
    components/
      Hero.astro Dinastias.astro EraGoles.astro Estadios.astro Explora.astro Comparte.astro
      SectionNav.astro Footer.astro
    scripts/
      counter.ts dinastias.ts era-goles.ts estadios.ts explora.ts comparte.ts
    pages/index.astro           # assembles sections + nav
  README.md
```

**Responsibility split:** data (`data/`) is pure content; math (`lib/`) is pure + tested; each section is one `.astro` (markup/SVG) + at most one `scripts/*.ts` (its interaction). No shared mutable state — `explora.ts` writes `data-seleccion` on a shared container; `comparte.ts` reads it (default `ARG`).

---

## Task 0: Scaffold the Astro project

**Files:**
- Create: `reto-05/package.json`, `astro.config.mjs`, `wrangler.toml`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "golazo",
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

- [ ] **Step 2: Create the config files** (identical to reto-02, name changed)

`astro.config.mjs`:
```js
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  output: 'server',
  adapter: cloudflare(),
});
```

`wrangler.toml`:
```toml
name = "golazo"
main = "@astrojs/cloudflare/entrypoints/server"
compatibility_date = "2025-05-21"
compatibility_flags = ["nodejs_compat"]
```

`tsconfig.json`:
```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": { "types": ["@cloudflare/workers-types", "vitest/globals"] }
}
```

`vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { globals: true, environment: 'node', include: ['src/**/*.test.ts'] },
});
```

`.gitignore`:
```
node_modules/
dist/
.astro/
.wrangler/
```

- [ ] **Step 3: Install and verify the toolchain**

Run: `cd reto-05 && npm install && npx astro --version`
Expected: installs cleanly; prints an Astro 6.x version.

- [ ] **Step 4: Commit**

```bash
git add reto-05/package.json reto-05/astro.config.mjs reto-05/wrangler.toml reto-05/tsconfig.json reto-05/vitest.config.ts reto-05/.gitignore reto-05/package-lock.json
git commit -m "chore(reto-05): scaffold Astro + Cloudflare project (GOLAZO)"
```

---

## Task 1: World Cup data module (TDD)

Use @superpowers:test-driven-development. The tests encode the data invariants; the data satisfies them.

**Files:**
- Create: `src/data/worldcup.ts`
- Test: `src/data/worldcup.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { champions, editions, teams, cup2026, totalTitles, byConfederation } from './worldcup';

describe('champions', () => {
  it('titles sum to 22 finals (1930–2022)', () => {
    expect(totalTitles()).toBe(22);
  });
  it('has 8 unique champions', () => {
    expect(champions.length).toBe(8);
  });
  it('splits UEFA 12 / CONMEBOL 10', () => {
    const c = byConfederation();
    expect(c.UEFA).toBe(12);
    expect(c.CONMEBOL).toBe(10);
  });
});

describe('editions', () => {
  it('covers 22 editions', () => expect(editions.length).toBe(22));
  it('1954 has the highest goals-per-match (~5.38)', () => {
    const avg = (e: Edition) => e.goals / e.matches;
    const max = editions.reduce((a, b) => (avg(b) > avg(a) ? b : a));
    expect(max.year).toBe(1954);
    expect(avg(max)).toBeCloseTo(5.38, 1);
  });
  it('every edition has positive goals and matches', () => {
    for (const e of editions) { expect(e.goals).toBeGreaterThan(0); expect(e.matches).toBeGreaterThan(0); }
  });
});

describe('teams (explorer)', () => {
  it('has 8 curated teams each with required fields', () => {
    expect(teams.length).toBe(8);
    for (const t of teams) {
      expect(t.code).toMatch(/^[A-Z]{3}$/);
      expect(t.name).toBeTruthy();
      expect(t.flag).toBeTruthy();
      expect(typeof t.titles).toBe('number');
      expect(t.bestResult).toBeTruthy();
      expect(t.appearances).toBeGreaterThan(0);
      expect(t.topScorer).toBeTruthy();
      expect(t.topScorerGoals).toBeGreaterThan(0);
    }
  });
  it('includes Colombia and Argentina', () => {
    const codes = teams.map(t => t.code);
    expect(codes).toContain('COL');
    expect(codes).toContain('ARG');
  });
});

describe('cup2026', () => {
  it('is the 23rd Cup with 48 teams and 104 matches', () => {
    expect(cup2026.edition).toBe(23);
    expect(cup2026.teams).toBe(48);
    expect(cup2026.matches).toBe(104);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd reto-05 && npm test`
Expected: FAIL (module not found / exports undefined).

- [ ] **Step 3: Write `src/data/worldcup.ts`**

```ts
export type Confederation = 'UEFA' | 'CONMEBOL';

export interface Champion { code: string; name: string; flag: string; titles: number; confederation: Confederation; }
export interface Edition { year: number; host: string; matches: number; goals: number; }
export interface Team { code: string; name: string; flag: string; titles: number; bestResult: string; appearances: number; topScorer: string; topScorerGoals: number; }
export interface Venue { name: string; city: string; year: number; attendance: number; note: string; }

// Campeones del Mundo (1930–2022): suma de títulos = 22 finales.
export const champions: Champion[] = [
  { code: 'BRA', name: 'Brasil',     flag: '🇧🇷', titles: 5, confederation: 'CONMEBOL' },
  { code: 'GER', name: 'Alemania',   flag: '🇩🇪', titles: 4, confederation: 'UEFA' },
  { code: 'ITA', name: 'Italia',     flag: '🇮🇹', titles: 4, confederation: 'UEFA' },
  { code: 'ARG', name: 'Argentina',  flag: '🇦🇷', titles: 3, confederation: 'CONMEBOL' },
  { code: 'URU', name: 'Uruguay',    flag: '🇺🇾', titles: 2, confederation: 'CONMEBOL' },
  { code: 'FRA', name: 'Francia',    flag: '🇫🇷', titles: 2, confederation: 'UEFA' },
  { code: 'ENG', name: 'Inglaterra', flag: '🏴',  titles: 1, confederation: 'UEFA' },
  { code: 'ESP', name: 'España',     flag: '🇪🇸', titles: 1, confederation: 'UEFA' },
];

// Goles y partidos por edición (fuente histórica; los tests fijan invariantes).
export const editions: Edition[] = [
  { year: 1930, host: 'Uruguay',        matches: 18, goals: 70 },
  { year: 1934, host: 'Italia',         matches: 17, goals: 70 },
  { year: 1938, host: 'Francia',        matches: 18, goals: 84 },
  { year: 1950, host: 'Brasil',         matches: 22, goals: 88 },
  { year: 1954, host: 'Suiza',          matches: 26, goals: 140 },
  { year: 1958, host: 'Suecia',         matches: 35, goals: 126 },
  { year: 1962, host: 'Chile',          matches: 32, goals: 89 },
  { year: 1966, host: 'Inglaterra',     matches: 32, goals: 89 },
  { year: 1970, host: 'México',         matches: 32, goals: 95 },
  { year: 1974, host: 'Alemania Occ.',  matches: 38, goals: 97 },
  { year: 1978, host: 'Argentina',      matches: 38, goals: 102 },
  { year: 1982, host: 'España',         matches: 52, goals: 146 },
  { year: 1986, host: 'México',         matches: 52, goals: 132 },
  { year: 1990, host: 'Italia',         matches: 52, goals: 115 },
  { year: 1994, host: 'Estados Unidos', matches: 52, goals: 141 },
  { year: 1998, host: 'Francia',        matches: 64, goals: 171 },
  { year: 2002, host: 'Corea/Japón',    matches: 64, goals: 161 },
  { year: 2006, host: 'Alemania',       matches: 64, goals: 147 },
  { year: 2010, host: 'Sudáfrica',      matches: 64, goals: 145 },
  { year: 2014, host: 'Brasil',         matches: 64, goals: 171 },
  { year: 2018, host: 'Rusia',          matches: 64, goals: 169 },
  { year: 2022, host: 'Catar',          matches: 64, goals: 172 },
];

// Selecciones destacadas para "Explora tú" (8 curadas).
export const teams: Team[] = [
  { code: 'BRA', name: 'Brasil',    flag: '🇧🇷', titles: 5, bestResult: 'Campeón (×5)',          appearances: 22, topScorer: 'Ronaldo',         topScorerGoals: 15 },
  { code: 'ARG', name: 'Argentina', flag: '🇦🇷', titles: 3, bestResult: 'Campeón (×3)',          appearances: 18, topScorer: 'Lionel Messi',   topScorerGoals: 13 },
  { code: 'GER', name: 'Alemania',  flag: '🇩🇪', titles: 4, bestResult: 'Campeón (×4)',          appearances: 20, topScorer: 'Miroslav Klose', topScorerGoals: 16 },
  { code: 'ITA', name: 'Italia',    flag: '🇮🇹', titles: 4, bestResult: 'Campeón (×4)',          appearances: 18, topScorer: 'Paolo Rossi',    topScorerGoals: 9 },
  { code: 'FRA', name: 'Francia',   flag: '🇫🇷', titles: 2, bestResult: 'Campeón (×2)',          appearances: 16, topScorer: 'Just Fontaine',  topScorerGoals: 13 },
  { code: 'URU', name: 'Uruguay',   flag: '🇺🇾', titles: 2, bestResult: 'Campeón (×2)',          appearances: 14, topScorer: 'Óscar Míguez',   topScorerGoals: 8 },
  { code: 'ESP', name: 'España',    flag: '🇪🇸', titles: 1, bestResult: 'Campeón (2010)',        appearances: 16, topScorer: 'David Villa',    topScorerGoals: 9 },
  { code: 'COL', name: 'Colombia',  flag: '🇨🇴', titles: 0, bestResult: 'Cuartos de final (2014)', appearances: 6, topScorer: 'James Rodríguez', topScorerGoals: 6 },
];

// Asistencias históricas notables (para la sección Estadios).
export const venues: Venue[] = [
  { name: 'Maracaná',     city: 'Río de Janeiro', year: 1950, attendance: 173850, note: 'Final Brasil–Uruguay (récord)' },
  { name: 'Azteca',       city: 'Ciudad de México', year: 1986, attendance: 114600, note: 'Final Argentina–Alemania' },
  { name: 'Wembley',      city: 'Londres',        year: 1966, attendance: 96924,  note: 'Final Inglaterra–Alemania' },
  { name: 'Lusail',       city: 'Lusail',         year: 2022, attendance: 88966,  note: 'Final Argentina–Francia' },
  { name: 'Rose Bowl',    city: 'Pasadena',       year: 1994, attendance: 94194,  note: 'Final Brasil–Italia' },
];

export const cup2026 = { edition: 23, teams: 48, matches: 104, hosts: ['Estados Unidos', 'Canadá', 'México'] };

export function totalTitles(): number {
  return champions.reduce((s, c) => s + c.titles, 0);
}
export function byConfederation(): Record<Confederation, number> {
  return champions.reduce((acc, c) => { acc[c.confederation] += c.titles; return acc; },
    { UEFA: 0, CONMEBOL: 0 } as Record<Confederation, number>);
}
export function teamByCode(code: string): Team | undefined {
  return teams.find(t => t.code === code);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd reto-05 && npm test`
Expected: PASS (all data-integrity tests green). Fix any figure the tests reject.

- [ ] **Step 5: Commit**

```bash
git add reto-05/src/data/worldcup.ts reto-05/src/data/worldcup.test.ts
git commit -m "feat(reto-05): add World Cup data module with integrity tests"
```

---

## Task 2: Chart math helpers (TDD)

Pure functions the SVG components use. Use @superpowers:test-driven-development.

**Files:**
- Create: `src/lib/chart.ts`
- Test: `src/lib/chart.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { scaleLinear, formatInt, linePath } from './chart';

describe('scaleLinear', () => {
  const s = scaleLinear([0, 100], [0, 200]);
  it('maps domain min to range min', () => expect(s(0)).toBe(0));
  it('maps domain max to range max', () => expect(s(100)).toBe(200));
  it('maps midpoint', () => expect(s(50)).toBe(100));
});

describe('formatInt', () => {
  it('groups thousands with dots (es-CO style)', () => expect(formatInt(173850)).toBe('173.850'));
  it('leaves small numbers', () => expect(formatInt(88)).toBe('88'));
});

describe('linePath', () => {
  it('builds an SVG path from points', () => {
    expect(linePath([[0, 10], [10, 20]])).toBe('M0,10 L10,20');
  });
  it('returns empty string for no points', () => expect(linePath([])).toBe(''));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd reto-05 && npm test -- chart`
Expected: FAIL (module not found).

- [ ] **Step 3: Write `src/lib/chart.ts`**

```ts
/** Linear scale from [d0,d1] domain to [r0,r1] range. */
export function scaleLinear([d0, d1]: [number, number], [r0, r1]: [number, number]) {
  return (x: number) => (d1 === d0 ? r0 : r0 + ((x - d0) / (d1 - d0)) * (r1 - r0));
}

/** Integer with dot thousands separators (es-CO). */
export function formatInt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** SVG path "M x,y L x,y ..." from [x,y] points. */
export function linePath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd reto-05 && npm test -- chart`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add reto-05/src/lib/chart.ts reto-05/src/lib/chart.test.ts
git commit -m "feat(reto-05): add tested SVG chart math helpers"
```

---

## Task 3: Panini theme tokens + base CSS

Use @frontend-design for the aesthetic. Cream paper, primary colors, rounded corners, serif display type.

**Files:**
- Create: `src/styles/global.css`

- [ ] **Step 1: Write `src/styles/global.css`**

```css
:root {
  --paper: #fbf3e4;        --paper-2: #fff;
  --ink: #1b2a4a;          --ink-soft: #5b6b8a;
  --line: #ecdfc7;         --line-2: #e6d8bd;
  --red: #e63946;          --teal: #2a9d8f;   --blue: #1f6fb8;  --gold: #e08a1e;
  --uefa: #1f6fb8;         --conmebol: #e63946;
  --radius: 16px;          --radius-sm: 10px;
  --shadow: 0 6px 20px rgba(27,42,74,.08);
  --serif: Georgia, 'Times New Roman', serif;
  --sans: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--paper); color: var(--ink); font-family: var(--sans); line-height: 1.5; }
h1, h2, h3 { font-family: var(--serif); line-height: 1.1; margin: 0 0 .4em; }
section { padding: 72px 20px; max-width: 960px; margin: 0 auto; scroll-margin-top: 64px; }
.card { background: var(--paper-2); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: var(--shadow); }
.label { font-size: 12px; letter-spacing: .08em; text-transform: uppercase; color: var(--red); font-weight: 700; }
.btn { display: inline-flex; align-items: center; gap: 8px; background: var(--red); color: #fff; border: 0;
       border-radius: 99px; padding: 12px 22px; font: inherit; font-weight: 700; cursor: pointer; text-decoration: none; }
.btn:focus-visible, [tabindex]:focus-visible, button:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } * { animation: none !important; transition: none !important; } }
```

- [ ] **Step 2: Commit**

```bash
git add reto-05/src/styles/global.css
git commit -m "style(reto-05): add Panini theme tokens and base CSS"
```

---

## Task 4: Hero + count-up (section 0)

**Files:**
- Create: `src/components/Hero.astro`, `src/scripts/counter.ts`

- [ ] **Step 1: Write `src/components/Hero.astro`**

```astro
---
import { champions, editions } from '../data/worldcup';
const unique = champions.length;      // 8
const years = 2022 - 1930;            // 92
const cups = editions.length;         // 22
---
<section id="hero" aria-labelledby="hero-title">
  <p class="label">Especial interactivo · Mundial 2026</p>
  <h1 id="hero-title" style="font-size:clamp(2.2rem,6vw,4rem)">GOLAZO</h1>
  <p style="font-size:clamp(1.1rem,3vw,1.6rem);max-width:34ch">
    <strong>{years} años</strong>, <strong data-count={cups}>0</strong> Mundiales,
    y solo <strong data-count={unique}>0</strong> países han levantado la copa.
  </p>
  <a class="btn" href="#dinastias">Explora los datos ↓</a>
</section>
<script>
  import { initCounters } from '../scripts/counter';
  initCounters();
</script>
```

- [ ] **Step 2: Write `src/scripts/counter.ts`**

```ts
/** Animate every [data-count] element from 0 to its target when it scrolls into view. */
export function initCounters(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.count || '0');
    if (reduce) { el.textContent = String(target); return; }
    const start = performance.now(), dur = 900;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      el.textContent = String(Math.round(p * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { run(e.target as HTMLElement); io.unobserve(e.target); }
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}
```

- [ ] **Step 3: Verify in dev**

Run: `cd reto-05 && npm run dev` — open the printed localhost URL. Expected: hero counts up to 22 and 8 on load; "Explora los datos" scrolls down.

- [ ] **Step 4: Commit**

```bash
git add reto-05/src/components/Hero.astro reto-05/src/scripts/counter.ts
git commit -m "feat(reto-05): add hero section with count-up"
```

---

## Task 5: Dinastías — palmarés bars + confederación toggle (section 1)

Use @dataviz. Bar chart, magnitude by title count; the toggle recolors by confederation (color follows the entity's confederation, not rank). Direct value labels on each bar. Accessible `<table>` fallback in a `<details>`.

**Files:**
- Create: `src/components/Dinastias.astro`, `src/scripts/dinastias.ts`

- [ ] **Step 1: Write `src/components/Dinastias.astro`**

Render horizontal bars (one per champion, sorted desc by titles). Each bar: width via `scaleLinear([0, maxTitles],[0, 100])` as a `%`; `rx="4"` rounded end; a direct label `{flag} {name} · {titles}`. Store confederation on each bar as `data-conf`. Include a mode toggle (two buttons: "Por país" / "Por confederación") and an accessible data table.

```astro
---
import { champions } from '../data/worldcup';
const max = Math.max(...champions.map(c => c.titles));
const sorted = [...champions].sort((a, b) => b.titles - a.titles);
---
<section id="dinastias" aria-labelledby="din-title">
  <p class="label">Capítulo 1</p>
  <h2 id="din-title">Dinastías · quién manda</h2>
  <div role="group" aria-label="Modo de color" class="toggle">
    <button data-mode="pais" class="btn" aria-pressed="true">Por país</button>
    <button data-mode="conf" class="btn" aria-pressed="false">Por confederación</button>
  </div>
  <ul id="din-bars" class="bars" data-mode="pais" role="list">
    {sorted.map(c => (
      <li class="bar-row">
        <span class="bar-label">{c.flag} {c.name}</span>
        <span class="bar-track">
          <span class="bar-fill" data-conf={c.confederation}
                style={`width:${(c.titles / max) * 100}%`}></span>
        </span>
        <span class="bar-value">{c.titles}</span>
      </li>
    ))}
  </ul>
  <p class="legend" hidden id="din-legend">
    <span class="chip" style="--c:var(--uefa)">UEFA · 12</span>
    <span class="chip" style="--c:var(--conmebol)">CONMEBOL · 10</span>
  </p>
  <details><summary>Ver datos en tabla</summary>
    <table><thead><tr><th>País</th><th>Títulos</th><th>Confederación</th></tr></thead>
      <tbody>{sorted.map(c => (<tr><td>{c.name}</td><td>{c.titles}</td><td>{c.confederation}</td></tr>))}</tbody>
    </table>
  </details>
</section>
<style>
  .bars { list-style: none; padding: 0; display: flex; flex-direction: column; gap: 10px; margin: 18px 0; }
  .bar-row { display: grid; grid-template-columns: 140px 1fr 32px; align-items: center; gap: 10px; }
  .bar-track { background: var(--line); border-radius: 6px; height: 22px; }
  .bar-fill { display: block; height: 100%; border-radius: 4px; background: var(--red); transition: background .3s, width .5s; }
  .bars[data-mode="conf"] .bar-fill[data-conf="UEFA"] { background: var(--uefa); }
  .bars[data-mode="conf"] .bar-fill[data-conf="CONMEBOL"] { background: var(--conmebol); }
  .bar-value { font-weight: 700; text-align: right; }
  .legend { display: flex; gap: 12px; }
  .chip { border-left: 12px solid var(--c); padding-left: 8px; font-size: 13px; }
  .toggle { display: flex; gap: 8px; }
  .toggle .btn[aria-pressed="false"] { background: transparent; color: var(--ink); border: 1px solid var(--line-2); }
  table { border-collapse: collapse; margin-top: 10px; } td, th { border: 1px solid var(--line); padding: 4px 10px; text-align: left; }
</style>
<script>
  import { initDinastias } from '../scripts/dinastias';
  initDinastias();
</script>
```

- [ ] **Step 2: Write `src/scripts/dinastias.ts`**

```ts
/** Toggle the bars container between per-country and per-confederation coloring. */
export function initDinastias(): void {
  const bars = document.getElementById('din-bars');
  const legend = document.getElementById('din-legend');
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.toggle .btn'));
  if (!bars) return;
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    const mode = btn.dataset.mode || 'pais';
    bars.dataset.mode = mode;
    if (legend) legend.hidden = mode !== 'conf';
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  }));
}
```

- [ ] **Step 3: Verify in dev** — bars show; toggling to "Por confederación" recolors UEFA blue / CONMEBOL red and reveals the legend; table present under `<details>`.

- [ ] **Step 4: dataviz check** — verify against @dataviz `references/anti-patterns.md`: single measure = one axis ✓, color follows entity not rank ✓, direct labels ✓, table view ✓, legend appears when 2 categories ✓.

- [ ] **Step 5: Commit**

```bash
git add reto-05/src/components/Dinastias.astro reto-05/src/scripts/dinastias.ts
git commit -m "feat(reto-05): add Dinastias bars with confederation toggle"
```

---

## Task 6: La era de los goles — line chart + hover (section 2)

Use @dataviz. Single-series line/area over time (goals-per-match by edition), `#e63946`, 2px line, ≥8px markers, crosshair + tooltip on hover (dataviz requires the hover layer on line charts). Accessible table fallback.

**Files:**
- Create: `src/components/EraGoles.astro`, `src/scripts/era-goles.ts`

- [ ] **Step 1: Write `src/components/EraGoles.astro`**

The `<section>` id MUST be `goles` (SectionNav links `#goles`); the SVG id MUST be `goles-svg`. Build an inline SVG (viewBox e.g. `0 0 720 300`, margins ~40). Compute per-edition `avg = goals/matches`. X = `scaleLinear([0, editions.length-1],[m, W-m])` by index; Y = `scaleLinear([2, 5.5],[H-m, m])`. Draw: recessive gridlines + y-ticks (2,3,4,5), an area path (line + baseline) at low opacity, the `linePath(...)` stroke, and one `<circle r="5">` per edition carrying `data-year data-goals data-matches data-avg` and `tabindex="0"` + `aria-label`. **`data-avg` must be pre-formatted** in the frontmatter as `(goals/matches).toFixed(2)` (the script renders `${avg}` verbatim). Add an empty `<div id="goles-tip" role="status">` tooltip and a `<details>` table of every edition.

Pull `linePath`/`scaleLinear` from `../lib/chart`. Compute points server-side in the frontmatter and emit the path string + circles.

- [ ] **Step 2: Write `src/scripts/era-goles.ts`**

```ts
/** Show a tooltip with the edition detail on hover/focus of each data point. */
export function initEraGoles(): void {
  const tip = document.getElementById('goles-tip');
  const dots = Array.from(document.querySelectorAll<SVGElement>('#goles-svg [data-year]'));
  if (!tip) return;
  const show = (el: SVGElement) => {
    const { year, goals, matches, avg } = (el as any).dataset;
    tip.innerHTML = `<strong>${year}</strong> · ${goals} goles / ${matches} partidos · <strong>${avg}</strong> por partido`;
    tip.classList.add('on');
    dots.forEach((d) => d.classList.toggle('active', d === el));
  };
  const hide = () => { tip.classList.remove('on'); dots.forEach((d) => d.classList.remove('active')); };
  dots.forEach((el) => {
    el.addEventListener('mouseenter', () => show(el));
    el.addEventListener('focus', () => show(el));
    el.addEventListener('mouseleave', hide);
    el.addEventListener('blur', hide);
  });
}
```

- [ ] **Step 3: Verify in dev** — line renders with the 1954 peak; hovering/focusing a point shows the tooltip; keyboard Tab reaches points.

- [ ] **Step 4: dataviz check** — one axis ✓, single hue ✓, hover layer present ✓, markers ≥8px ✓, table ✓, reduced-motion respected ✓.

- [ ] **Step 5: Commit**

```bash
git add reto-05/src/components/EraGoles.astro reto-05/src/scripts/era-goles.ts
git commit -m "feat(reto-05): add goals-per-edition line chart with hover"
```

---

## Task 7: Estadios llenos — attendance bars + highlight + 2026 callout (section 3)

Use @dataviz. Vertical bars of notable attendances (`venues`), single hue `#e63946`, direct value labels via `formatInt`, click a bar to highlight it (adds `.active`, shows its `note`). A callout card frames Mundial 2026 (`cup2026`: 48 selecciones, 104 partidos, 3 sedes).

**Files:**
- Create: `src/components/Estadios.astro`, `src/scripts/estadios.ts`

- [ ] **Step 1: Write `src/components/Estadios.astro`** — the `<section>` id MUST be `estadios` (SectionNav links `#estadios`); the bars container id MUST be `estadios-bars`. Bars for each venue (height via `scaleLinear([0, maxAttendance],[0, 220])`), label `{name} {year}`, value `formatInt(attendance)`, `data-note` on each; a `#estadios-note` region; a Panini callout card with the 2026 facts; `<details>` table.

- [ ] **Step 2: Write `src/scripts/estadios.ts`**

```ts
/** Highlight the clicked/focused venue bar and surface its note. */
export function initEstadios(): void {
  const note = document.getElementById('estadios-note');
  const bars = Array.from(document.querySelectorAll<HTMLElement>('#estadios-bars [data-note]'));
  const pick = (el: HTMLElement) => {
    bars.forEach((b) => b.classList.toggle('active', b === el));
    if (note) note.textContent = el.dataset.note || '';
  };
  bars.forEach((el) => {
    el.tabIndex = 0;
    el.addEventListener('click', () => pick(el));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(el); } });
  });
}
```

- [ ] **Step 3: Verify in dev** — bars show; clicking a bar highlights it and shows the note; 2026 callout visible.

- [ ] **Step 4: Commit**

```bash
git add reto-05/src/components/Estadios.astro reto-05/src/scripts/estadios.ts
git commit -m "feat(reto-05): add stadium attendance bars with 2026 callout"
```

---

## Task 8: Explora tú — the interactive heart (section 4)

The selector is the core "estado que cambia". A `<select>` (accessible) of the 8 teams; on change, the card recomputes from `teams`. Writes `data-seleccion` on the shared container (read later by Comparte). Default `ARG`.

**Files:**
- Create: `src/components/Explora.astro`, `src/scripts/explora.ts`

- [ ] **Step 1: Write `src/components/Explora.astro`**

```astro
---
import { teams } from '../data/worldcup';
const teamsJson = JSON.stringify(teams);
const def = teams.find(t => t.code === 'ARG')!;
---
<section id="explora" aria-labelledby="exp-title" data-seleccion="ARG">
  <p class="label">Capítulo 4 · Explora tú</p>
  <h2 id="exp-title">Elige una selección</h2>
  <label class="visually-hidden" for="exp-select">Selección</label>
  <select id="exp-select" class="btn">
    {teams.map(t => (<option value={t.code} selected={t.code === 'ARG'}>{t.flag} {t.name}</option>))}
  </select>
  <article id="exp-card" class="card" style="padding:22px;margin-top:16px" aria-live="polite">
    <h3 id="exp-name">{def.flag} {def.name}</h3>
    <dl class="stats">
      <div><dt>Títulos</dt><dd id="exp-titles">{def.titles}</dd></div>
      <div><dt>Mejor resultado</dt><dd id="exp-best">{def.bestResult}</dd></div>
      <div><dt>Participaciones</dt><dd id="exp-apps">{def.appearances}</dd></div>
      <div><dt>Goleador histórico</dt><dd id="exp-scorer">{def.topScorer} ({def.topScorerGoals})</dd></div>
    </dl>
  </article>
  <script type="application/json" id="exp-data" set:html={teamsJson}></script>
</section>
<style>
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; margin: 0; }
  .stats dt { font-size: 12px; text-transform: uppercase; letter-spacing: .05em; color: var(--ink-soft); }
  .stats dd { margin: 2px 0 0; font-size: 1.5rem; font-weight: 700; font-family: var(--serif); }
</style>
<script>
  import { initExplora } from '../scripts/explora';
  initExplora();
</script>
```

- [ ] **Step 2: Write `src/scripts/explora.ts`**

```ts
interface Team { code: string; name: string; flag: string; titles: number; bestResult: string; appearances: number; topScorer: string; topScorerGoals: number; }

/** On team change, recompute the card and record the selection on #explora. */
export function initExplora(): void {
  const raw = document.getElementById('exp-data')?.textContent;
  const select = document.getElementById('exp-select') as HTMLSelectElement | null;
  const section = document.getElementById('explora');
  if (!raw || !select || !section) return;
  const teams: Team[] = JSON.parse(raw);
  const set = (id: string, v: string) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const render = (code: string) => {
    const t = teams.find((x) => x.code === code); if (!t) return;
    set('exp-name', `${t.flag} ${t.name}`);
    set('exp-titles', String(t.titles));
    set('exp-best', t.bestResult);
    set('exp-apps', String(t.appearances));
    set('exp-scorer', `${t.topScorer} (${t.topScorerGoals})`);
    section.dataset.seleccion = code;
  };
  select.addEventListener('change', () => render(select.value));
}
```

- [ ] **Step 3: Verify in dev** — changing the selector updates every stat and `#explora[data-seleccion]`.

- [ ] **Step 4: Commit**

```bash
git add reto-05/src/components/Explora.astro reto-05/src/scripts/explora.ts
git commit -m "feat(reto-05): add interactive team explorer"
```

---

## Task 9: Comparte — shareable card (section 5)

Reads the active selection from `#explora[data-seleccion]` (default `ARG` if unset). A button builds a "carnet" card from `teams` and highlights it. No real sharing (YAGNI) — an on-screen presumible card + a "copiar resumen" that writes text to the clipboard.

**Files:**
- Create: `src/components/Comparte.astro`, `src/scripts/comparte.ts`

- [ ] **Step 1: Write `src/components/Comparte.astro`** — the `<section>` id MUST be `comparte` (SectionNav links `#comparte`). A button `id="share-btn"` labeled "Arma mi tarjeta", an initially-muted `#share-card` (Panini sticker look), and embed the `teams` JSON in `<script type="application/json" id="share-data">` (the script reads `#share-data`). Card fields mirror the explorer.

- [ ] **Step 2: Write `src/scripts/comparte.ts`**

```ts
interface Team { code: string; name: string; flag: string; titles: number; appearances: number; topScorer: string; topScorerGoals: number; }

/** Build the shareable card from the current explorer selection (default ARG). */
export function initComparte(): void {
  const raw = document.getElementById('share-data')?.textContent;
  const btn = document.getElementById('share-btn');
  const card = document.getElementById('share-card');
  if (!raw || !btn || !card) return;
  const teams: Team[] = JSON.parse(raw);
  btn.addEventListener('click', () => {
    const code = document.getElementById('explora')?.dataset.seleccion || 'ARG';
    const t = teams.find((x) => x.code === code) || teams[0];
    card.innerHTML = `<div class="sticker"><span class="big">${t.flag}</span>
      <strong>${t.name}</strong><span>${t.titles} títulos · ${t.appearances} Mundiales</span>
      <span>⚽ ${t.topScorer} (${t.topScorerGoals})</span></div>`;
    card.classList.add('on');
    card.setAttribute('tabindex', '-1'); (card as HTMLElement).focus();
  });
}
```

- [ ] **Step 3: Verify in dev** — pick a team in section 4, click "Arma mi tarjeta" → the card shows that team; with no prior pick it defaults to Argentina.

- [ ] **Step 4: Commit**

```bash
git add reto-05/src/components/Comparte.astro reto-05/src/scripts/comparte.ts
git commit -m "feat(reto-05): add shareable team card wired to explorer"
```

---

## Task 10: SectionNav, Footer, and page assembly

Makes the flow feel like a recorrido: a sticky mini-nav of the 6 steps that scroll-jumps and marks the active section.

**Files:**
- Create: `src/components/SectionNav.astro`, `src/components/Footer.astro`, `src/pages/index.astro`

- [ ] **Step 1: Write `SectionNav.astro`** — a sticky `<nav>` with anchor links (`#hero`, `#dinastias`, `#goles`, `#estadios`, `#explora`, `#comparte`), each a labeled dot/chip. Include a tiny inline script using IntersectionObserver to add `.active` to the link of the section in view.

- [ ] **Step 2: Write `Footer.astro`** — context line: "Prototipo · datos históricos (1930–2022) · sin backend" + reto/credit.

- [ ] **Step 3: Write `src/pages/index.astro`**

```astro
---
import '../styles/global.css';
import SectionNav from '../components/SectionNav.astro';
import Hero from '../components/Hero.astro';
import Dinastias from '../components/Dinastias.astro';
import EraGoles from '../components/EraGoles.astro';
import Estadios from '../components/Estadios.astro';
import Explora from '../components/Explora.astro';
import Comparte from '../components/Comparte.astro';
import Footer from '../components/Footer.astro';
---
<html lang="es">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>GOLAZO · el Mundial en datos</title>
    <meta name="description" content="Especial interactivo de datos del Mundial: dinastías, goles, estadios y tu selección." />
  </head>
  <body>
    <SectionNav />
    <main>
      <Hero /><Dinastias /><EraGoles /><Estadios /><Explora /><Comparte />
    </main>
    <Footer />
  </body>
</html>
```

- [ ] **Step 4: Verify full flow in dev** — all 6 sections render; nav dots jump + highlight; every interaction works end-to-end.

- [ ] **Step 5: Commit**

```bash
git add reto-05/src/components/SectionNav.astro reto-05/src/components/Footer.astro reto-05/src/pages/index.astro
git commit -m "feat(reto-05): assemble page with section nav and footer"
```

---

## Task 11: README + root README link

**Files:**
- Create: `reto-05/README.md`
- Modify: root `README.md` (retos table + estructura block)

- [ ] **Step 1: Write `reto-05/README.md`** — problem, audience, the 6-step flow, interactions, stack, "how to run" (`npm install && npm run dev`), data-source note (historical 1930–2022, hardcoded, no backend), deployed URL (fill after Task 12).

- [ ] **Step 2: Add the reto-05 row** to the root README retos table and the estructura block, mirroring reto-01…04 wording.

- [ ] **Step 3: Commit**

```bash
git add reto-05/README.md README.md
git commit -m "docs(reto-05): add README and link GOLAZO in root README"
```

---

## Task 12: Build, verify, deploy

- [ ] **Step 1: Full test + typecheck + build**

Run: `cd reto-05 && npm test && npx astro check && npm run build`
Expected: tests PASS, no type errors, build succeeds to `dist/`.

- [ ] **Step 2: Preview the production build** — `npm run preview`, walk all 6 sections and every interaction once more (this is the reto's "navegable" acceptance).

- [ ] **Step 3: Deploy** — `npm run deploy` (needs `wrangler login` OAuth, per the repo's Cloudflare notes). Capture the printed `*.workers.dev` URL.

- [ ] **Step 4: Smoke-test the live URL** — load it, confirm the flow works over the network.

- [ ] **Step 5: Put the URL in both READMEs and commit**

```bash
git add reto-05/README.md README.md
git commit -m "docs(reto-05): add deployed GOLAZO URL"
```

---

## Done criteria

- 6 connected sections, ≥3 real state-changing interactions (toggle, hover, click, selector, share) — the reto's requirements.
- All Vitest data + chart-helper tests pass; `astro check` clean; production build + live URL verified.
- Panini aesthetic; charts validated against @dataviz.
- Then: @superpowers:finishing-a-development-branch (merge/PR to `main`), and update project memory.
```
