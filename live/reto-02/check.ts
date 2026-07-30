// Check de la única lógica con ramas: las reglas que corren si la IA falla.
// Correr: node --experimental-strip-types check.ts
import assert from 'node:assert';
import { porReglas } from './src/index.ts';

assert.equal(porReglas('se cayó el sistema, urge').prioridad, 'alta');
assert.equal(porReglas('no funciona la caja 3').prioridad, 'alta');
assert.equal(porReglas('cambiale el foco cuando puedas').prioridad, 'baja');
assert.equal(porReglas('hay que pedir más cajas').prioridad, 'media');

// Nunca perdemos el mensaje: el detalle siempre queda completo aunque el título se corte.
const largo = 'x'.repeat(200);
const t = porReglas(largo);
assert.equal(t.detalle, largo);
assert.ok(t.titulo.length <= 70);

console.log('check ok');
