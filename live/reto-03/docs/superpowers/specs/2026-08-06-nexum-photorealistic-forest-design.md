# Nexum Photorealistic Forest Design

**Date:** 2026-08-06  
**Status:** Approved for implementation on an isolated preview branch; merging or deploying requires a second explicit approval

## Context

Nexum turns OpenAlex research results into an infinite forest. Each tree is a real paper, tree height represents citation count, rows represent academic regions, and clicking a tree opens source details and an APA citation.

The current forest works, but its procedural SVG trees read as flat clusters of ellipses. They do not match the photorealistic, cinematic forest video in the hero. This change improves only the tree presentation while protecting the existing search and interaction behavior.

## Goals

- Make every tree look photorealistic and visually coherent with the hero video.
- Preserve citation-based height, regional grouping, growth, hover enlargement, infinite horizontal loading, and click-to-open details.
- Keep natural bark and foliage colors.
- Preserve region identity through a restrained colored moonlight rim.
- Show the complete change on an isolated Git branch and obtain explicit approval before merging it into `main` or deploying it.
- Keep the production asset small enough for a fast first forest render.

## Non-goals

- No redesign of the hero, summary card, region labels, detail panel, or typography.
- No changes to OpenAlex queries, result mapping, the Cloudflare AI synthesis endpoint, pagination, or citation generation.
- No new framework, canvas renderer, 3D engine, or runtime dependency.
- No production deployment as part of the preview phase.

## Approaches Considered

### 1. Detailed procedural SVG

This keeps the current code-only model and adds branches, bark texture, layered canopy shapes, and more organic contours. It is lightweight and highly controllable, but it remains visibly illustrated and cannot fully match the photographic hero.

### 2. Photorealistic asset atlas with deterministic variation — selected

A single transparent atlas contains six distinct, isolated broadleaf trees photographed in consistent moonlit conditions. The existing renderer selects a frame and applies deterministic mirroring, width variation, and a small rotation. This gives the strongest realism with a contained change to the current rendering function.

### 3. Canvas or WebGL forest

This could add depth, fog, and parallax, but it would replace the existing DOM interaction model, complicate individual tree clicking and accessibility, and expand the scope beyond the visual defect.

## Visual Design

### Tree assets

- Use one locally bundled 1536 × 1024 transparent WebP atlas arranged as a 3 × 2 grid containing exactly six distinct broadleaf trees.
- Trees share the same nighttime direction of light and realistic color treatment, but vary in trunk shape, branching, canopy outline, density, and age.
- The atlas must contain no ground, labels, borders, shadows baked into the background, or overlapping trees.
- Target a maximum atlas size of 1.2 MB. Reusing one cached asset prevents the infinite forest from creating additional image requests.

### Data-driven dimensions

- Preserve the existing citation calculation exactly:
  - `t = min(1, log10(citations + 1) / 4)`
  - height = `100 + pow(t, 0.85) * 340`, rounded to pixels
  - visual range remains 100–440 px
- Derive width from each atlas frame's natural tree proportion without vertically stretching the tree.
- Reuse the seeded random generator so the same paper index always gets the same frame, mirror state, width adjustment, and rotation.
- Compute rotation as `-2 + rnd() * 4` degrees, yielding a strict range from -2 to +2 degrees so variation feels natural without making the ground alignment unstable.

### Region color

- Bark and foliage remain naturally colored for all regions.
- Set the region color as a CSS custom property on each tree.
- Apply a quiet, persistent outer rim using a region-colored drop shadow.
- Intensify the same rim on hover; do not wash or recolor the canopy.
- Keep the existing region label and legend colors unchanged.

### Motion and interaction

- Keep `.arbol`, `.crecido`, and `data-i` on the interactive root so event delegation and animation continue to work.
- Keep the existing staggered growth delay and bottom-center transform origin.
- Keep hover enlargement and add only the approved rim-light emphasis.
- Render each tree as a real `button type="button"` with an accessible label containing paper title and citation count.
- Preserve the current tooltip information and click behavior that opens `panelDetalle`.

## Component Boundary

The preview branch may add `public/forest-trees.js` to isolate the deterministic renderer and make it testable. In `public/index.html`, only the tree-specific CSS, renderer loading, and call from `plantar` may change. The exported renderer is named `arbolHTML`; `plantar` must continue receiving equivalent clickable markup.

The following remain unchanged:

- `REGIONES`, country sets, and `regionDe`
- `estado` and pagination state
- OpenAlex request and `mapWork`
- AI synthesis request and fallback
- region counters and grouping
- infinite-scroll trigger
- detail panel, DOI link, APA citation, and clipboard behavior
- fireflies, page navigation, and method modal

## Preview Gate

The complete implementation lives on `codex/nexum-realistic-trees-preview`. The `main` branch and deployed site remain unchanged until the user explicitly approves merging the preview branch.

The preview will contain:

- the final six-tree atlas;
- the production citation-to-height calculation;
- all six region colors shown as moonlight rims;
- at least 24 representative papers across the full height range;
- staggered growth and hover behavior;
- clickable sample trees with representative detail content;
- desktop and narrow-screen layouts.

The branch also includes a standalone `public/forest-preview.html` harness so the final renderer can be reviewed immediately with representative data. The preview may be revised repeatedly. Merging or deploying begins only after the user explicitly approves the branch preview in Codex.

## Production Integration

After preview approval:

1. Re-run functional and visual verification on the preview branch.
2. Merge or cherry-pick the approved branch into `main` only with explicit user approval.
3. Keep all current data and UI functions intact.
4. Do not deploy unless deployment is separately requested.

## Failure Handling

- The atlas is served as a local static asset through the existing Cloudflare asset binding, so tree rendering does not depend on a third-party host.
- The renderer keeps an accessible clickable tree root even if an image frame fails to paint.
- A missing atlas must not block search results, region counters, infinite loading, or the detail panel.
- The preview must verify the final asset path and frame positions before production integration.

## Verification

### Visual

- Compare the preview with the hero at desktop width and confirm the trees share its cinematic realism.
- Verify six distinct silhouettes, natural colors, clean transparency, no atlas seams, grounded trunks, and restrained regional rim lights.
- Verify 100 px, medium, and 440 px trees remain sharp and proportionate.
- Verify horizontal scrolling and grouping at desktop and mobile widths.
- Verify reduced-motion users do not receive unnecessary growth or hover motion.

### Functional

- Submit a research topic and confirm OpenAlex results still populate.
- Confirm AI synthesis success and fallback states remain unchanged.
- Confirm citation heights still follow the existing formula.
- Confirm each regional row and counter remains correct.
- Scroll to the right and confirm the next OpenAlex page is appended once.
- Click trees from initial and appended pages and verify the correct paper opens.
- Confirm DOI links, APA output, and copy-citation behavior.
- Confirm keyboard focus and activation work on tree buttons.

### Performance

- Confirm the atlas is no larger than 1.2 MB.
- Confirm the browser requests the atlas once and reuses it for subsequently appended trees.
- Confirm no console errors during initial growth, hover, detail opening, or infinite loading.

## Acceptance Criteria

- The user approves the isolated branch preview before it is merged into `main` or deployed.
- Trees look photorealistic and visually compatible with the hero video.
- Region colors appear as subtle moonlight rims, not canopy tints.
- All existing Nexum functionality remains available and behaves as before.
- No production deployment occurs without a separate request.
