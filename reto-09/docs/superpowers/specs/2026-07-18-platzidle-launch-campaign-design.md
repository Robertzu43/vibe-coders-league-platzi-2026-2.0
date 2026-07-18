# Platzidle · campaña de lanzamiento — Diseño

**Reto 09 · Vibe Coders League (Edición 2.0)**
Fecha: 2026-07-18 · Estado: aprobado en brainstorming, pendiente de spec review

---

## 1. Contexto

**El reto (Platzi):** "La campaña de lanzamiento de tu producto." Ponerle marketing a uno de los
proyectos construidos en la liga (o un producto inventado con brief serio) y crear su campaña de
lanzamiento con IA — los assets que publicarías si mañana saliera al mundo. **Lo que se evalúa es el
criterio** (el brief), no solo los assets. Requisitos:

- **Brief creativo definido por ti:** público objetivo, promesa principal y tono.
- **Al menos 2 piezas creadas con IA** (combinación a elección: imagen + video, post + reel,
  carrusel + hilo, etc.).
- **Consistencia visual y de mensaje** entre las piezas (que se note que son la misma campaña).
- **Publicar la campaña** en redes contando qué se construyó, y dejar el link en los comentarios.

**El producto elegido:** **Platzidle** (reto 08) — un clon de Wordle de términos tech que, al
resolver el término, te lleva con un clic al **curso real de Platzi** para aprenderlo. Está en vivo
en https://platzidle.robertzu43.workers.dev. Es el producto más fresco, jugable, compartible y con un
payoff educativo claro — ideal como carta de presentación ante la comunidad.

## 2. Brief creativo

- **Público objetivo:** estudiantes y devs junior de LatAm (comunidad Platzi); fans de los juegos de
  palabras diarios (Wordle) con ganas de crecer en tecnología.
- **Promesa principal:** *"Adivina el término, aprende de verdad."* Cada día un término tech nuevo —
  y a un clic, el curso de Platzi para dominarlo.
- **Diferenciador (el payoff, eje de la campaña):** no es solo un juego. **Resuelves el término →
  tocas el link → estás en el curso real de Platzi.** El juego es el gancho; el aprendizaje real es
  el destino.
- **Tono:** motivador, cercano, nerd-friendly; energía Platzi (verde, comunidad, "sí se puede").
  Nada corporativo.
- **Insight:** millones hacen su Wordle cada mañana por hábito. ¿Y si ese ritual de 2 minutos te
  hiciera un poquito mejor dev cada día?
- **Tagline de campaña:** *"Aprende tech jugando. Un término al día, un curso a un clic."*

## 3. Gran idea: "El término del día"

El hilo conductor visual es **el tablero de Platzidle con casillas verde Platzi** que deletrean un
término tech. Cada pieza vive dos momentos: **el reto** (casillas revelándose) y **el payoff** (el
término resuelto + la tarjeta que enlaza al curso real de Platzi). El "resuelves → clic → curso real"
es el remate de todas las piezas.

## 4. Las piezas (2, con imágenes de apoyo)

### Pieza 1 — Imagen principal (hero)
Poster 1:1 (con variante 4:5 opcional para feed). En una sola imagen: el tablero con `DOCKER`
resuelto en casillas verdes + la tarjeta *"🎓 Aprende más: Curso de Docker"* con flecha a Platzi +
wordmark **Platzidle** + **la tagline de campaña** (*"Aprende tech jugando. Un término al día, un
curso a un clic."*). La *promesa principal* ("Adivina el término, aprende de verdad.") se reserva
para el copy del post, no va en el hero. Se entiende el juego y el payoff sin leer nada más.

### Pieza 2 — Post único de LinkedIn + galería de imágenes
**No es un hilo largo:** un solo post de LinkedIn (copy conciso) acompañado de **3 imágenes** en
galería. Estructura del copy: gancho → qué es → el payoff ("resuelves y caes en el curso real de
Platzi") → cómo lo construí (dirigiendo un agente de código, reto de la Vibe Coders League) → CTA con
el link. Imágenes de la galería:
1. **Hero** (la imagen principal).
2. **El payoff** — split "término resuelto → tarjeta del Curso de Docker en Platzi".
3. **Ejemplos** — collage de 3 términos con su curso (PYTHON→Curso de Python,
   KUBERNETES→Curso de Kubernetes, TOKEN→Curso de Node.js: Autenticación, Microservicios y Redis).

> Cuentan como las "2 piezas": la **imagen principal** + el **post de LinkedIn**. Las imágenes 2 y 3
> refuerzan la consistencia y el mensaje del post.

## 5. Sistema visual (consistencia)

Va **embebido en cada prompt** para que, aunque las imágenes se generen por separado, salgan como una
familia:

- **Paleta:** fondo `#0c1420` · panel `#121d2b` · **verde Platzi `#0bd982`** (casilla correcta) ·
  ámbar `#c9a227` (presente) · pizarra `#38465a` (ausente) · texto `#e8eef5` · texto suave `#9fb0c3`.
- **Tipografía:** DM Sans (geométrica; bold en títulos). Wordmark "Platzidle".
- **Motivo firma:** la grilla de casillas tipo Wordle; el verde `#0bd982` como color estrella; texto
  oscuro sobre las casillas verdes (contraste).
- **Composición:** fondo azul noche, tablero centrado, mucho aire, **un término por pieza**, wordmark
  + claim.
- **Regla de oro:** toda imagen lleva casillas verdes + fondo azul noche + DM Sans → identidad
  inmediata.

## 6. Entregables (en `reto-09/`)

- **`brief.md`** — el brief creativo completo (§2), listo para presentar como criterio.
- **`prompts-imagenes.md`** — los **3 prompts** de imagen (hero, payoff, ejemplos), cada uno con el
  **mismo bloque de sistema visual embebido** (§5) + relación de aspecto, en inglés (mejor para
  generadores) con notas en español. Los términos y nombres de cursos deben ser reales (coinciden con
  `reto-08/src/data/words.ts`): DOCKER→Curso de Docker, PYTHON→Curso de Python,
  KUBERNETES→Curso de Kubernetes, TOKEN→Curso de Node.js: Autenticación, Microservicios y Redis.
- **`post-linkedin.md`** — el copy final del post (español), con una variante corta, los hashtags, y
  el orden sugerido de las 3 imágenes. Incluye el link https://platzidle.robertzu43.workers.dev.
- **`README.md`** — qué es la campaña, cómo cumple el reto (tabla), y cómo usar los entregables.

## 7. Cómo cumple el reto

| Requisito | Cómo se cumple |
|-----------|----------------|
| Brief creativo (público, promesa, tono) | `brief.md` completo con diferenciador e insight |
| ≥2 piezas creadas con IA | Imagen principal (hero) + post de LinkedIn con galería de imágenes |
| Consistencia visual y de mensaje | Sistema visual §5 embebido en cada prompt; mismo claim y payoff en todas |
| Publicar + link en comentarios | `post-linkedin.md` listo para publicar; link del juego incluido |

## 8. No-objetivos (YAGNI)

- **No se genera video** en v1 (el combo elegido es imagen principal + post con imágenes). Se podría
  añadir un guion/storyboard de reel después.
- **No se generan los archivos de imagen finales aquí** (los produce el usuario con su herramienta de
  IA a partir de los prompts); este reto entrega el brief, los prompts y el copy.
- Sin pauta pagada, calendario de medios, ni múltiples idiomas en v1.
- No se toca el código de reto-08; la campaña solo referencia el producto ya desplegado.

## 9. Nota de veracidad

Los términos y los cursos citados deben existir de verdad (ya verificados en reto-08: las 30 URLs de
cursos resuelven en platzi.com). La campaña no promete cursos inventados; usa ejemplos reales del
propio juego.
