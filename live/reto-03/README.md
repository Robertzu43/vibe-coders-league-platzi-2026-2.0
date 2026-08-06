# Reto en Vivo 03 · nexum — bosque infinito de investigación

> **Reto (en vivo, ~1 hora):** una herramienta de research para un cliente: input
> de tema → research riguroso con las mejores fuentes (universidades, citaciones)
> → y la información presentada de una forma distinta, no texto plano.

**En vivo:** https://nexum.robertzu43.workers.dev

## La idea

Cuando le pides research a una IA te devuelve un muro de texto que puede estar
inventado. **nexum** hace lo contrario: convierte cualquier tema en un **bosque
de conocimiento real**. Cada árbol es un paper académico verificable; mientras
más citado, más alto. Las arboledas agrupan por región del mundo: **Ivy League,
Norteamérica, Europa, Latinoamérica, Asia & Oceanía**.

> Planta una pregunta, cosecha un bosque.

## El rigor (el diferencial)

- Las fuentes salen de **OpenAlex** (254M+ papers, el índice académico abierto
  más grande del mundo) ordenadas por **relevancia real** al tema.
- Cada árbol trae **universidad, revista, año, citaciones, abstract, cita APA
  lista para copiar y DOI clickeable** — nada alucinado.
- La región se deriva del **país real de la institución** (dato de OpenAlex);
  la Ivy League se detecta por nombre (las 8).
- **Workers AI solo sintetiza**: resumen ejecutivo + 4 hallazgos en español a
  partir de los abstracts. Piso determinista: si la IA falla, el bosque crece
  igual con los datos crudos.

## El momento (gancho de votos)

Buscas → la IA "lee" (copy rotativo) → llega el resumen → **el bosque crece**,
árbol por árbol, con la escena nocturna de fondo (estrellas, siluetas de bosque
lejano con perspectiva atmosférica, niebla que deriva, luciérnagas). Barres con
el cursor y una tarjeta flotante va contando cada paper; clic = la fuente
completa. El bosque es **infinito**: deslizas a la derecha y sigue creciendo.

## Los árboles

SVG 100% procedural (cero assets): tronco con vetas y raíces, esqueleto de
ramas, copa densa en 4 verdes con **doble desplazamiento por turbulencia**
(silueta orgánica + borde de hojitas) y **moteado de sol por feDiffuseLighting**.
Determinista por semilla: el mismo paper siempre da el mismo árbol.

## Stack

- **Un Worker de Cloudflare**: assets estáticos + endpoint `/api/sintesis`
  (Workers AI `llama-3.3-70b`, `json_schema`).
- **OpenAlex desde el navegador** (CORS abierto): cada visitante usa su propia
  IP — cero rate-limit compartido, cero API keys.
- HTML/CSS/JS vanilla + Tailwind CDN. Sin build, sin frameworks, sin
  dependencias.
- Estética glassmorphism cinematográfica (Geist + Silkscreen, video full-bleed
  con fallback nocturno propio).

## Correr / verificar

```bash
npx wrangler deploy   # deploy completo en ~10s
node check.mjs        # check funcional: regiones, APA, árboles, click E2E
```

## Gotchas que dejó el reto

- **OpenAlex desde Workers da 429** (IPs compartidas de Cloudflare) → moverlo
  al navegador del usuario (CORS `*`) lo resuelve de raíz.
- **`sort=cited_by_count` rompe la relevancia**: trae los papers más citados
  que apenas mencionan el término. El default (relevancia) + altura por citas
  da lo mejor de ambos.
- **`overflow-anchor: none`**: el scroll anchoring de Chrome "devuelve" el
  scroll cuando insertas árboles animados en un carril horizontal.
- Hover que abre un panel lateral tapa lo que estás barriendo → tarjeta
  flotante para preview, panel solo al click.
