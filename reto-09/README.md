# Reto 09 — La campaña de lanzamiento de Platzidle

*Vibe Coders League Platzi 2026 · Edición 2.0*

## El reto (Platzi)

**"La campaña de lanzamiento de tu producto."** Ponerle marketing a uno de los proyectos de la liga y crear su campaña de lanzamiento con IA. Requisitos: un **brief creativo** (público, promesa, tono), **al menos 2 piezas creadas con IA**, **consistencia visual y de mensaje**, y **publicar** la campaña dejando el link.

## El producto: Platzidle

**Platzidle** (reto 08) — un clon de Wordle de términos tech que, al resolver, te lleva al **curso real de Platzi**. En vivo: https://platzidle.robertzu43.workers.dev

## La campaña: "Aprende tech jugando"

**Eje / payoff:** *resuelves el término → tocas el link → estás en el curso real de Platzi.* El juego es el gancho; el aprendizaje real es el destino.
**Tagline:** *"Learn tech by playing — one term a day, one course a click away."*
**Gran idea visual:** "El término del día" — el tablero de Platzidle con casillas **verde Platzi** como firma en todas las piezas.

## Cómo cumple el reto

| Requisito | Cómo se cumple |
|-----------|----------------|
| Brief creativo (público, promesa, tono) | [`brief.md`](./brief.md) — con diferenciador e insight |
| ≥2 piezas creadas con IA | Imagen principal (hero) + post de LinkedIn con galería de 3 imágenes |
| Consistencia visual y de mensaje | Sistema visual (paleta, DM Sans, casillas verdes) embebido en cada prompt; mismo payoff en todas |
| Publicar + link | [`linkedin-post.md`](./linkedin-post.md) (EN) y [`platzi-post.md`](./platzi-post.md) (ES), con el link del juego |

## Entregables

| Archivo | Idioma | Qué es |
|---------|--------|--------|
| [`brief.md`](./brief.md) | EN | El brief creativo completo (lo que más se evalúa) |
| [`image-prompts.md`](./image-prompts.md) | EN | Los 3 prompts de imagen (hero · payoff · ejemplos) con el sistema visual embebido |
| [`linkedin-post.md`](./linkedin-post.md) | EN | El copy del post de LinkedIn (campaña) + variante corta + primer comentario |
| [`platzi-post.md`](./platzi-post.md) | ES | El post para la comunidad Platzi contando qué construiste |

## Cómo usar los entregables

1. Genera las 3 imágenes con tu herramienta de IA usando los prompts de `image-prompts.md` (respeta el **STYLE BLOCK** en cada uno para que salgan consistentes; ver la nota sobre texto en imágenes).
2. Revisa el **checklist de consistencia** al final de `image-prompts.md`.
3. Publica en **LinkedIn** con `linkedin-post.md` (link en el primer comentario) y en la **comunidad Platzi** con `platzi-post.md`.
4. Orden de galería: hero → payoff → ejemplos.

## Nota de veracidad

Los términos y cursos citados existen de verdad (las 30 URLs de cursos de reto-08 fueron verificadas en platzi.com). La campaña no promete cursos inventados.

## Cómo se construyó

Con **Claude Code** siguiendo el flujo superpowers: brainstorming (brief + gran idea) → spec revisado → producción de entregables. Specs en [`docs/superpowers/specs/`](./docs/superpowers/specs/).
