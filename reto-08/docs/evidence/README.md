# Evidencia — Platzidle (reto-08)

## Pruebas unitarias

**23/23 tests pasando** en 4 suites, cubriendo toda la lógica pura del juego:

```bash
cd reto-08 && npm test
```

| Suite | Tests | Qué cubre |
|-------|:-----:|-----------|
| `src/data/words.test.ts` | 5 | Integridad de datos: A–Z sin `Ñ`/acentos, sin duplicados, `definition`/`category`/`course` no vacíos, largo mínimo de lista |
| `src/lib/game.test.ts` | 8 | `evaluateGuess` (incluye los casos difíciles de **letras repetidas** en respuesta y/o intento) + `isWin` |
| `src/lib/daily.test.ts` | 7 | `puzzleNumber` correcto según el epoch (2026-07-20, América/Bogotá), `dailyIndex` dentro de rango, determinismo de `mulberry32`/`seededShuffle` |
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

## Qué falta confirmar manualmente

La jugabilidad interactiva (tablero, teclado, colores, tarjeta de resultado con el curso de Platzi, compartir, persistencia del diario tras recargar) debe confirmarse corriendo el servidor de desarrollo:

```bash
cd reto-08 && npm run dev
# abrir http://localhost:4321
```

No se ha capturado todavía una screenshot del flujo E2E en navegador ni se ha desplegado el sitio a Cloudflare Workers — ambas cosas quedan pendientes para una siguiente pasada (Task 10 del plan cubre el despliegue opcional).
