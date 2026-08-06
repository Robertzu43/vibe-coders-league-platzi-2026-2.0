# Nexum Photorealistic Forest Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and locally review a photorealistic, data-driven Nexum forest on `codex/nexum-realistic-trees-preview` without merging into `main` or deploying it.

**Architecture:** A single optimized transparent WebP atlas supplies six photographic tree variants. A small dependency-free browser module turns citation counts and stable paper indexes into accessible tree-button markup; the existing page keeps ownership of research data, grouping, pagination, details, and AI synthesis. A standalone preview harness uses the same renderer so visual approval does not depend on a live OpenAlex or Workers AI response.

**Tech Stack:** Static HTML/CSS/JavaScript, SVG image cropping, Node.js 24 built-in test runner, Cloudflare Workers static assets, ImageGen, `cwebp`

**ImageGen source path:** `/Users/robertozuniga/.codex/visualizations/2026/08/06/019fd91a-cfdd-71c0-891c-f623a26e1485/nexum-trees-source.png`

## Global Constraints

- Implement only on `codex/nexum-realistic-trees-preview`; do not merge into `main`.
- Do not deploy or run `wrangler deploy`.
- Keep the citation-height formula exactly `Math.round(100 + Math.pow(Math.min(1, Math.log10(citations + 1) / 4), 0.85) * 340)`.
- Keep the tree-height range at 100–440 px.
- Use one 1536 × 1024 transparent WebP atlas arranged as a 3 × 2 grid with exactly six trees.
- Keep the atlas at or below 1,258,291 bytes (1.2 MiB).
- Keep natural bark and foliage colors; region colors appear only as restrained rim lights.
- Preserve search, OpenAlex mapping, AI synthesis and fallback, region grouping and counters, infinite loading, detail panel, DOI link, APA citation, clipboard, fireflies, navigation, and method modal.
- Use no new runtime package, framework, canvas renderer, 3D engine, or third-party asset host.
- Require explicit user approval of the local branch preview before any merge or deployment.

---

## File Structure

- Create `live/reto-03/public/assets/nexum-trees.webp`: optimized transparent 3 × 2 photographic tree atlas.
- Create `live/reto-03/public/forest-trees.js`: deterministic citation sizing, seeded variant selection, escaping, and accessible tree markup.
- Create `live/reto-03/public/forest-preview.html`: standalone visual review harness with 24 representative papers and all region colors.
- Create `live/reto-03/tests/forest-trees.test.mjs`: unit tests for sizing, deterministic presentation, safety, and markup.
- Create `live/reto-03/tests/index-contract.test.mjs`: regression tests for the narrow index integration and preserved behavioral anchors.
- Modify `live/reto-03/check.mjs`: preserve the existing region, APA, OpenAlex mapping, and renderer smoke checks after extraction.
- Modify `live/reto-03/public/index.html`: replace only tree-specific styles/rendering integration and load the renderer module.

## Execution Preflight: Isolate the Work

Use `superpowers:using-git-worktrees` before Task 1.

The current Nexum application files are untracked on `main`, so preserve them without accidentally adding `.wrangler` cache data:

1. Add `.worktrees/` to the repository `.gitignore` with `apply_patch`, stage only `.gitignore`, and commit `chore: ignore local worktrees`.
2. Create and switch to `codex/nexum-realistic-trees-preview`.
3. Stage exactly:

   ```bash
   git add -- live/reto-03/check.mjs live/reto-03/public/index.html live/reto-03/src/index.ts live/reto-03/wrangler.toml
   ```

4. Verify the staged set excludes `.wrangler`:

   ```bash
   git diff --cached --name-status
   ```

   Expected: only the four baseline Nexum files above.

5. Commit the baseline:

   ```bash
   git commit -m "feat(live-03): add Nexum research forest baseline"
   ```

6. Switch the primary checkout back to `main`, then create `.worktrees/nexum-realistic-trees-preview` for the existing preview branch.
7. Confirm the worktree reports branch `codex/nexum-realistic-trees-preview` and that `git status --short` is empty.
8. There is no `package.json` in `live/reto-03`, so skip dependency installation. Verify the baseline with:

   ```bash
   test -f live/reto-03/public/index.html
   test -f live/reto-03/src/index.ts
   test -f live/reto-03/wrangler.toml
   rg -n "buscarOpenAlex|/api/sintesis|sueloWrap|abrirPanel" live/reto-03/public/index.html
   node live/reto-03/check.mjs
   ```

   Expected: all three application files exist, all four behavioral anchors are found, and the existing check ends with `check verde`.

---

### Task 1: Generate and Validate the Photorealistic Tree Atlas

**Files:**
- Create: `live/reto-03/public/assets/nexum-trees.webp`
- Inspect only: thread-owned ImageGen source PNG outside the repository

**Interfaces:**
- Consumes: the approved cinematic-tree direction and upper-left moonlight art direction.
- Produces: `/assets/nexum-trees.webp`, exactly 1536 × 1024 with six safe crop cells.

- [ ] **Step 1: Generate the source image with ImageGen**

Use the `imagegen` skill and this exact prompt:

```text
Create one photorealistic transparent-background sprite atlas for a cinematic nighttime web experience. Exact composition: a 3-column by 2-row grid containing exactly six distinct mature broadleaf trees. Each tree must be isolated, fully visible from the bottom of the trunk to the top and widest edge of the crown, centered in its equal 512-by-512 cell, and contained inside the central 75 percent of that cell with generous transparent padding. No tree may cross a cell boundary or overlap another tree. Vary species, age, trunk curvature, branching, canopy silhouette, and foliage density: oak, beech, maple, elm, linden, and ash. Natural dark-brown bark and deep realistic green foliage. Consistent subtle cool moonlight from the upper left, gentle highlights, deep photographic shadow detail, documentary nature-photography realism. No ground, roots extending outside the trunk footprint, fog, cast shadows, glow, colored rim light, labels, borders, dividers, text, scenery, sky, or background. Transparent alpha everywhere outside the six trees. Landscape output at exactly 1536 by 1024 pixels.
```

If the result lacks clean transparency, exact tree count, safe cell containment, or full trunks, edit/regenerate it with ImageGen; do not repair visual defects with code.

- [ ] **Step 2: Inspect the source at original resolution**

Open the generated PNG with `view_image` at original detail and check:

- exactly six trees;
- no overlap or cell-boundary crossing;
- all trunks touch the same bottom area within their cell;
- no baked ground, sky, fog, shadow, glow, or labels;
- foliage and bark remain photographic at 1:1 zoom.

- [ ] **Step 3: Verify dimensions and alpha before conversion**

Save the accepted ImageGen result to the exact source path declared in the plan header, then run:

```bash
sips -g pixelWidth -g pixelHeight -g hasAlpha /Users/robertozuniga/.codex/visualizations/2026/08/06/019fd91a-cfdd-71c0-891c-f623a26e1485/nexum-trees-source.png
```

Expected: `pixelWidth: 1536`, `pixelHeight: 1024`, and `hasAlpha: yes`. If any value differs, return to Step 1.

- [ ] **Step 4: Convert the accepted source to the production WebP**

Create `live/reto-03/public/assets/` with `mkdir -p`, then run:

```bash
cwebp -quiet -q 82 -alpha_q 90 -m 6 /Users/robertozuniga/.codex/visualizations/2026/08/06/019fd91a-cfdd-71c0-891c-f623a26e1485/nexum-trees-source.png -o live/reto-03/public/assets/nexum-trees.webp
```

- [ ] **Step 5: Validate the WebP contract**

Run:

```bash
sips -g pixelWidth -g pixelHeight -g hasAlpha live/reto-03/public/assets/nexum-trees.webp
stat -f%z live/reto-03/public/assets/nexum-trees.webp
```

Expected: 1536 × 1024, alpha present, and byte size no greater than 1,258,291. If larger, repeat conversion at `-q 76`; do not reduce dimensions.

- [ ] **Step 6: Commit the verified atlas**

```bash
git add -- live/reto-03/public/assets/nexum-trees.webp
git commit -m "feat(live-03): add photorealistic Nexum tree atlas"
```

---

### Task 2: Build the Deterministic Tree Renderer with Tests

**Files:**
- Create: `live/reto-03/tests/forest-trees.test.mjs`
- Create: `live/reto-03/public/forest-trees.js`

**Interfaces:**
- Consumes: `/assets/nexum-trees.webp` from Task 1 and a work object with `{ titulo: string, citas: number }`.
- Produces: `window.NexumTrees` and CommonJS exports `{ FRAMES, citationHeight, presentationFor, arbolHTML }`.
- `arbolHTML(work, index, regionColor)` returns one accessible `<button class="arbol">` string with `data-i=index`.

- [ ] **Step 1: Write the failing renderer tests**

Create `live/reto-03/tests/forest-trees.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { FRAMES, citationHeight, presentationFor, arbolHTML } =
  require('../public/forest-trees.js');

test('citation height preserves the 100–440 px logarithmic scale', () => {
  assert.equal(citationHeight(0), 100);
  assert.equal(citationHeight(10_000), 440);
  assert.ok(citationHeight(99) < citationHeight(999));
});

test('presentation is deterministic and remains within visual bounds', () => {
  assert.deepEqual(presentationFor(17), presentationFor(17));
  for (let i = 0; i < 100; i += 1) {
    const value = presentationFor(i);
    assert.ok(value.frame >= 0 && value.frame < 6);
    assert.ok(value.rotation >= -2 && value.rotation <= 2);
    assert.ok(Math.abs(value.scaleX) >= 0.94 && Math.abs(value.scaleX) <= 1.02);
  }
});

test('the atlas exposes six fixed safe crop frames', () => {
  assert.equal(FRAMES.length, 6);
  assert.deepEqual(FRAMES.map((frame) => frame.viewBox), [
    '64 0 384 512', '576 0 384 512', '1088 0 384 512',
    '64 512 384 512', '576 512 384 512', '1088 512 384 512',
  ]);
});

test('tree markup is accessible, escaped, local, and interaction-compatible', () => {
  const html = arbolHTML({ titulo: '<Study & "Trees">', citas: 123 }, 5, '#4ade80');
  assert.match(html, /<button[^>]+class="arbol"[^>]+data-i="5"/);
  assert.match(html, /type="button"/);
  assert.match(html, /aria-label="[^"]*123[^"]*citas/);
  assert.match(html, /href="\/assets\/nexum-trees\.webp"/);
  assert.doesNotMatch(html, /<Study/);
  assert.match(html, /&lt;Study &amp; &quot;Trees&quot;&gt;/);
});
```

- [ ] **Step 2: Run the renderer tests and verify the expected failure**

Run:

```bash
node --test live/reto-03/tests/forest-trees.test.mjs
```

Expected: FAIL with `Cannot find module '../public/forest-trees.js'`.

- [ ] **Step 3: Implement the minimal dependency-free renderer**

Create `live/reto-03/public/forest-trees.js` as a browser/CommonJS factory. Use these exact constants and signatures:

```js
(function exposeNexumTrees(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.NexumTrees = api;
})(typeof window === 'object' ? window : globalThis, function createNexumTrees() {
  const ATLAS_PATH = '/assets/nexum-trees.webp';
  const FRAMES = [
    { viewBox: '64 0 384 512' },
    { viewBox: '576 0 384 512' },
    { viewBox: '1088 0 384 512' },
    { viewBox: '64 512 384 512' },
    { viewBox: '576 512 384 512' },
    { viewBox: '1088 512 384 512' },
  ];

  function rngDe(seed) {
    let state = (seed * 2654435761) >>> 0;
    return () => ((state = (state * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  function citationHeight(citations) {
    const safe = Math.max(0, Number(citations) || 0);
    const t = Math.min(1, Math.log10(safe + 1) / 4);
    return Math.round(100 + Math.pow(t, 0.85) * 340);
  }

  function presentationFor(index) {
    const rnd = rngDe(Number(index) + 7);
    const frame = Math.floor(rnd() * FRAMES.length);
    const mirrored = rnd() > 0.5;
    const scale = 0.94 + rnd() * 0.08;
    return {
      frame,
      rotation: -2 + rnd() * 4,
      scaleX: mirrored ? -scale : scale,
    };
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, (character) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    })[character]);
  }

  function safeColor(value) {
    return /^#[0-9a-f]{6}$/i.test(String(value)) ? String(value) : '#ffffff';
  }

  function arbolHTML(work, index, regionColor) {
    const citations = Math.max(0, Number(work.citas) || 0);
    const height = citationHeight(citations);
    const width = Math.round(height * 0.75);
    const presentation = presentationFor(index);
    const frame = FRAMES[presentation.frame];
    const title = escapeHtml(work.titulo || 'Sin título');
    const citationLabel = citations.toLocaleString('es');
    const color = safeColor(regionColor);
    const delay = (index % 24) * 70;

    return `<button type="button" class="arbol" data-i="${index}"
      aria-label="${title} · ${citationLabel} citas"
      style="width:${width}px;height:${height}px;--region-color:${color};--tree-rotation:${presentation.rotation.toFixed(2)}deg;--tree-scale-x:${presentation.scaleX.toFixed(3)};transition-delay:${delay}ms">
      <svg class="arbol-imagen" viewBox="${frame.viewBox}" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <image href="${ATLAS_PATH}" x="0" y="0" width="1536" height="1024"/>
      </svg>
      <span class="sr-only">${title} · ${citationLabel} citas</span>
    </button>`;
  }

  return { FRAMES, citationHeight, presentationFor, arbolHTML };
});
```

- [ ] **Step 4: Run the renderer tests and verify they pass**

Run:

```bash
node --test live/reto-03/tests/forest-trees.test.mjs
```

Expected: 4 tests pass, 0 fail.

- [ ] **Step 5: Commit the tested renderer**

```bash
git add -- live/reto-03/public/forest-trees.js live/reto-03/tests/forest-trees.test.mjs
git commit -m "feat(live-03): add deterministic photoreal tree renderer"
```

---

### Task 3: Integrate the Renderer Without Changing Application Logic

**Files:**
- Create: `live/reto-03/tests/index-contract.test.mjs`
- Modify: `live/reto-03/check.mjs`
- Modify: `live/reto-03/public/index.html`

**Interfaces:**
- Consumes: synchronous `window.NexumTrees.arbolHTML` from Task 2.
- Produces: the existing `plantar(works, desde)` behavior with photoreal tree buttons.

- [ ] **Step 1: Write the failing integration-contract test**

Create `live/reto-03/tests/index-contract.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

test('loads the tree renderer synchronously before application code', () => {
  const renderer = html.indexOf('<script src="/forest-trees.js"></script>');
  const application = html.indexOf('<script>', renderer + 1);
  assert.ok(renderer > 0);
  assert.ok(application > renderer);
});

test('plantar uses the external renderer and preserves the paper index', () => {
  assert.match(html, /NexumTrees\.arbolHTML\(w, desde \+ j, region\.color\)/);
  assert.doesNotMatch(html, /function arbolSVG\(/);
});

test('existing research and interaction anchors remain present', () => {
  for (const marker of [
    'function buscarOpenAlex',
    "fetch('/api/sintesis'",
    "getElementById('sueloWrap').addEventListener('scroll'",
    'function abrirPanel',
    'function copiarCita',
    "getElementById('suelo').addEventListener('click'",
  ]) assert.ok(html.includes(marker), `missing behavior anchor: ${marker}`);
});

test('tree CSS keeps growth, hover, focus, rim light, and reduced motion', () => {
  for (const marker of [
    '.arbol.crecido',
    '.arbol.crecido:hover',
    '.arbol:focus-visible',
    'var(--region-color)',
    '@media (prefers-reduced-motion: reduce)',
  ]) assert.ok(html.includes(marker), `missing tree style: ${marker}`);
});
```

- [ ] **Step 2: Run all tests and verify the integration test fails**

Run:

```bash
node --test live/reto-03/tests/*.test.mjs
```

Expected: renderer tests pass; integration tests fail because `index.html` does not load or use `forest-trees.js` yet.

- [ ] **Step 3: Replace only the tree-specific styles**

In `public/index.html`, keep the root growth transform on `.arbol`, reset native button chrome, style `.arbol-imagen`, apply a low region rim at rest and stronger rim on hover, add a visible keyboard focus ring, and disable transform animation under reduced motion.

Use this behavior:

```css
.arbol { appearance:none; display:block; flex:none; position:relative; padding:0; border:0; background:transparent;
  transform:scaleY(0); transform-origin:bottom center; opacity:0; cursor:pointer;
  transition:transform .9s cubic-bezier(.2,1.4,.3,1), opacity .4s ease; }
.arbol-imagen { display:block; width:100%; height:100%; overflow:visible; transform-origin:bottom center;
  transform:rotate(var(--tree-rotation)) scaleX(var(--tree-scale-x));
  filter:drop-shadow(0 7px 8px rgba(0,0,0,.55)) drop-shadow(0 0 4px var(--region-color));
  transition:filter .3s ease; }
.arbol.crecido { transform:scaleY(1); opacity:1; }
.arbol.crecido:hover { transform:scaleY(1.14) scaleX(1.05); }
.arbol.crecido:hover .arbol-imagen { filter:drop-shadow(0 9px 9px rgba(0,0,0,.62)) drop-shadow(0 0 10px var(--region-color)); }
.arbol:focus-visible { outline:2px solid var(--region-color); outline-offset:4px; border-radius:10px; }
@media (prefers-reduced-motion:reduce) {
  .arbol, .arbol-imagen { transition:none; }
  .arbol { transform:none; opacity:1; }
  .arbol.crecido:hover { transform:scale(1.03); }
}
```

- [ ] **Step 4: Replace only the tree-rendering integration**

- Remove the unused hidden `foliaje` SVG filter.
- Add `<script src="/forest-trees.js"></script>` immediately before the existing application `<script>`.
- Remove `rngDe` and `arbolSVG` from `index.html`; their only responsibility now lives in `forest-trees.js`.
- In `plantar`, replace the insertion call with:

```js
fila.insertAdjacentHTML('beforeend', NexumTrees.arbolHTML(w, desde + j, region.color));
```

Do not edit any other function.

- [ ] **Step 5: Run all tests and verify they pass**

Update `live/reto-03/check.mjs` so it keeps the existing region, abstract, APA, and `mapWork` assertions while loading the extracted renderer explicitly:

```js
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
globalThis.NexumTrees = require('./public/forest-trees.js');
```

Remove `arbolSVG` and `rngDe` from the `globalThis.__t` extraction, keep `regionDe`, `citaAPA`, `mapWork`, and `abstractDeInvertido`, and replace the old ellipse/filter-specific tree assertions with:

```js
const tree = globalThis.NexumTrees.arbolHTML(
  { citas: 50, titulo: 'Medio' },
  2,
  '#4ade80',
);
assert(tree.includes('class="arbol"') && tree.includes('data-i="2"'), 'falta hook de click');
assert(tree.includes('/assets/nexum-trees.webp'), 'falta atlas local');
assert(!tree.includes('NaN') && !tree.includes('undefined'), 'árbol con NaN/undefined');
assert.equal(
  globalThis.NexumTrees.citationHeight(10_000),
  440,
  'altura máxima cambió',
);
```

Run:

```bash
node --test live/reto-03/tests/*.test.mjs
node live/reto-03/check.mjs
```

Expected: 8 tests pass, 0 fail, and the smoke check ends with `check verde`.

- [ ] **Step 6: Review the narrow diff**

Run:

```bash
git diff --check
git diff -- live/reto-03/check.mjs live/reto-03/public/index.html live/reto-03/public/forest-trees.js live/reto-03/tests
```

Expected: no whitespace errors; no changes outside the smoke check, tree CSS, renderer loading/call, and tests.

- [ ] **Step 7: Commit the integration**

```bash
git add -- live/reto-03/check.mjs live/reto-03/public/index.html live/reto-03/tests/index-contract.test.mjs
git commit -m "feat(live-03): render research papers as photoreal trees"
```

---

### Task 4: Build the Standalone Branch Preview and Review It

**Files:**
- Create: `live/reto-03/public/forest-preview.html`
- Modify: `live/reto-03/tests/index-contract.test.mjs`

**Interfaces:**
- Consumes: `window.NexumTrees.arbolHTML` and the final production tree CSS.
- Produces: `/forest-preview.html`, an immediate branch-only review surface with 24 mock papers, six regions, growth, hover, and clickable details.

- [ ] **Step 1: Add a failing preview-contract test**

Append to `index-contract.test.mjs`:

```js
test('standalone preview exercises 24 papers and all six regions', async () => {
  const preview = await readFile(new URL('../public/forest-preview.html', import.meta.url), 'utf8');
  assert.ok(preview.includes('<script src="/forest-trees.js"></script>'));
  assert.ok(preview.includes('Array.from({ length: 24 }'));
  for (const color of ['#e3b34c', '#38bdf8', '#c084fc', '#4ade80', '#f472b6', '#2dd4bf']) {
    assert.ok(preview.includes(color), `missing preview region ${color}`);
  }
  assert.ok(preview.includes("closest('.arbol')"));
});
```

- [ ] **Step 2: Run the test and verify the expected failure**

Run:

```bash
node --test live/reto-03/tests/index-contract.test.mjs
```

Expected: FAIL with `ENOENT` for `forest-preview.html`.

- [ ] **Step 3: Create the standalone preview harness**

Build a full dark Nexum preview document that:

- loads `/forest-trees.js` synchronously;
- copies the final tree CSS exactly from `index.html`;
- defines these six region objects and colors:

```js
const REGIONES = [
  { nombre: 'Ivy League', color: '#e3b34c' },
  { nombre: 'Norteamérica', color: '#38bdf8' },
  { nombre: 'Europa', color: '#c084fc' },
  { nombre: 'Latinoamérica', color: '#4ade80' },
  { nombre: 'Asia & Oceanía', color: '#f472b6' },
  { nombre: 'Otras regiones', color: '#2dd4bf' },
];
const CITAS = [0, 4, 28, 180, 950, 10_000];
const works = Array.from({ length: 24 }, (_, index) => ({
  titulo: `Paper de demostración ${index + 1}`,
  citas: CITAS[index % CITAS.length],
  region: REGIONES[index % REGIONES.length],
}));
```

- renders four trees per region using `NexumTrees.arbolHTML`;
- applies `.crecido` in `requestAnimationFrame`;
- opens a right-side detail panel on delegated clicks using `event.target.closest('.arbol')`;
- defines the standard visually-hidden `.sr-only` utility because the preview does not load Tailwind;
- includes the visible legend `altura = citaciones · luz = región académica`;
- contains no fetch, API request, external video, or deployment-only dependency.

- [ ] **Step 4: Run the complete test suite**

Run:

```bash
node --test live/reto-03/tests/*.test.mjs
```

Expected: 9 tests pass, 0 fail.

- [ ] **Step 5: Commit the preview harness**

```bash
git add -- live/reto-03/public/forest-preview.html live/reto-03/tests/index-contract.test.mjs
git commit -m "feat(live-03): add isolated forest review page"
```

- [ ] **Step 6: Start a local static preview**

From the isolated worktree, run:

```bash
python3 -m http.server 4173 --directory live/reto-03/public
```

Open `http://localhost:4173/forest-preview.html`. Do not open or deploy a public URL.

- [ ] **Step 7: Perform desktop and narrow-screen visual QA**

Using the browser workflow, verify at 1440 × 900 and 390 × 844:

- six visibly different photographic tree variants;
- no atlas seams, adjacent-tree fragments, clipped crowns, or missing trunks;
- tallest trees render at 440 px and zero-citation trees at 100 px;
- natural foliage/bark with restrained region rim lights;
- grounded baseline alignment and usable horizontal scrolling;
- staggered growth and hover enlargement;
- keyboard focus and Enter/Space activation;
- correct sample detail opens for a clicked tree;
- no console errors.

If a crop is wrong, adjust only the corresponding `FRAMES` viewBox in `forest-trees.js`, update the exact expected viewBox in `forest-trees.test.mjs`, rerun all tests, and commit `fix(live-03): refine tree atlas crops`.

- [ ] **Step 8: Verify the real page integration locally**

Open `http://localhost:4173/`, search for `federated learning IoT security`, and verify:

- OpenAlex results populate;
- AI synthesis may use its existing fallback because the static server has no Worker API;
- region counters populate;
- clicking a tree opens the correct real paper;
- scrolling right appends another page once network data is available;
- DOI and APA actions remain present.

- [ ] **Step 9: Stop for user approval**

Keep `codex/nexum-realistic-trees-preview` and its local preview available. Report the branch name, worktree path, test count, atlas size, and preview URL. Do not merge, push, deploy, or modify `main` until the user explicitly approves the result.

---

## Final Verification Command Set

```bash
git branch --show-current
git status --short
node --test live/reto-03/tests/*.test.mjs
node live/reto-03/check.mjs
sips -g pixelWidth -g pixelHeight -g hasAlpha live/reto-03/public/assets/nexum-trees.webp
stat -f%z live/reto-03/public/assets/nexum-trees.webp
git diff main...HEAD --check
git diff main...HEAD --name-status
```

Expected:

- branch is `codex/nexum-realistic-trees-preview`;
- worktree is clean;
- 9 tests pass, 0 fail;
- atlas is 1536 × 1024 with alpha and no more than 1,258,291 bytes;
- diff contains only the Nexum baseline, design/plan documents, atlas, renderer, preview, tests, and tree-specific index integration;
- no merge or deployment has occurred.
