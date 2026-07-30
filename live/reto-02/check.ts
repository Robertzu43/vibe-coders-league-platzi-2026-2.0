// Check de la única lógica con ramas: las reglas que corren si la IA falla.
// Correr: node --experimental-strip-types check.ts
import assert from 'node:assert';
import { porReglas } from './src/index.ts';

// Prioridad
assert.equal(porReglas('se cayó el sistema, urge').prioridad, 'alta');
assert.equal(porReglas('no funciona la caja 3').prioridad, 'alta');
assert.equal(porReglas('cambiale el foco cuando puedas').prioridad, 'baja');
assert.equal(porReglas('hay que pedir más cajas').prioridad, 'media');

// La colmena solo se ofrece para trámites de software.
const cred = porReglas('perdí mis credenciales del sistema');
assert.equal(cred.automatizable, true);
assert.equal(cred.area, 'sistemas');
assert.ok(cred.accion.length > 0);

assert.equal(porReglas('hay que pedir más cajas').automatizable, false);
assert.equal(porReglas('hay que pedir más cajas').accion, '');

// Nada físico se automatiza, aunque la frase suene a sistemas.
assert.equal(porReglas('se dañó la impresora de facturación').automatizable, false);
assert.equal(porReglas('no anda el cable de la cuenta de red').automatizable, false);

// Nunca perdemos el mensaje: el detalle queda completo aunque el título se corte.
const largo = 'x'.repeat(200);
const t = porReglas(largo);
assert.equal(t.detalle, largo);
assert.ok(t.titulo.length <= 70);

console.log('check ok');
