# Evidencia — Platzidle (reto-08)

## Pruebas unitarias

**25/25 tests pasando** en 4 suites, cubriendo toda la lógica pura del juego:

```bash
cd reto-08 && npm test
```

| Suite | Tests | Qué cubre |
|-------|:-----:|-----------|
| `src/data/words.test.ts` | 5 | Integridad de datos: A–Z sin `Ñ`/acentos, sin duplicados, `definition`/`category`/`course` no vacíos, largo mínimo de lista |
| `src/lib/game.test.ts` | 8 | `evaluateGuess` (incluye los casos difíciles de **letras repetidas** en respuesta y/o intento) + `isWin` |
| `src/lib/daily.test.ts` | 9 | `puzzleNumber` correcto según el epoch (2026-07-20, América/Bogotá), `dailyIndex` dentro de rango, determinismo de `mulberry32`/`seededShuffle`, y **estabilidad del orden diario** (golden test: reordenar `words.ts` cambiaría los puzzles ya publicados) |
| `src/lib/share.test.ts` | 3 | Texto de compartir: grilla de emojis, puntaje de victoria/derrota, etiqueta de modo práctica |

## Type check

```bash
cd reto-08 && npx astro check
```

Resultado: **0 errores, 0 advertencias**.

## Build de producción

```bash
cd reto-08 && npm run build
```

Resultado: build exitoso, `dist/` generado vía el adaptador `@astrojs/cloudflare`.

## Cursos de Platzi verificados

Los 30 términos de `src/data/words.ts` tienen un campo `course.url`. Cada URL fue verificada con WebFetch para confirmar que resuelve a una página real de curso en platzi.com. De la lista inicial (seed), **9 URLs adivinadas** no correspondían a un curso real y fueron **reemplazadas por cursos verificados** antes de dar por cerrada esta tarea (ver commit de la tarea "Verificar y arreglar URLs de cursos Platzi").

## Desplegado en producción

**https://platzidle.robertzu43.workers.dev** — desplegado a Cloudflare Workers con `npm run deploy`. La URL responde **HTTP 200** sirviendo el shell completo del juego (`#board`, `#keyboard`, tecla `ENTER`, `#result-modal`, `#category-chip`, branding Platzidle).

## Smoke test del servidor

También se levantó `npm run dev` en local y la home respondió **HTTP 200** con el mismo shell.

## Revisión de código

Una revisión final de código detectó y **corrigió** un bug real: las estadísticas del reto diario se recontaban en cada recarga de una partida ya terminada. Se separó "terminar la partida" (registra estadísticas) de "restaurar una partida terminada" (solo muestra el resultado). Ver commit `fix(reto-08): review fixes`.

## Qué falta confirmar manualmente

La jugabilidad interactiva completa (colores, tarjeta de resultado con el curso de Platzi, compartir, persistencia del diario tras recargar) conviene confirmarla en navegador corriendo el servidor de desarrollo:

```bash
cd reto-08 && npm run dev
# abrir http://localhost:4321
```

No se ha capturado todavía una screenshot del flujo E2E en navegador ni se ha desplegado el sitio a Cloudflare Workers — ambas cosas quedan pendientes para una siguiente pasada (Task 10 del plan cubre el despliegue opcional).
