// Check de la lógica con ramas: prioridad, y el piso determinista de la colmena.
// Correr: node --experimental-strip-types check.ts
import assert from 'node:assert';
import { porReglas, accionPorReglas } from './src/index.ts';

// Prioridad
assert.equal(porReglas('se cayó el sistema, urge').prioridad, 'alta');
assert.equal(porReglas('no funciona la caja 3').prioridad, 'alta');
assert.equal(porReglas('cambiale el foco cuando puedas').prioridad, 'baja');
assert.equal(porReglas('hay que pedir más cajas').prioridad, 'media');

// El piso: cada trámite de software tiene su acción concreta, siempre la misma.
assert.equal(
  accionPorReglas('perdí mis credenciales del sistema'),
  'Enviar correo de restablecimiento de contraseña',
);
assert.equal(
  accionPorReglas('necesito acceso a la carpeta compartida de contabilidad'),
  'Dar el acceso solicitado y avisar por correo',
);
assert.equal(accionPorReglas('me quedó bloqueada la cuenta'), 'Desbloquear la cuenta y avisar por correo');
assert.equal(accionPorReglas('reenviame el recibo del mes pasado'), 'Reenviar el documento por correo');

// Determinista: el mismo texto da la misma acción siempre (la IA no).
const texto = 'necesito acceso a la carpeta compartida de contabilidad para cerrar el mes';
assert.equal(accionPorReglas(texto), accionPorReglas(texto));
assert.equal(porReglas(texto).automatizable, true);
assert.equal(porReglas(texto).area, 'sistemas');

// Nada que no sea trámite de software se automatiza.
assert.equal(accionPorReglas('hay que pedir más cajas'), '');
assert.equal(porReglas('hay que pedir más cajas').automatizable, false);

// Nada físico, aunque la frase suene a sistemas.
assert.equal(accionPorReglas('se dañó la impresora de facturación'), '');
assert.equal(accionPorReglas('no anda el cable de la cuenta de red'), '');
assert.equal(porReglas('se rompió la banda transportadora').automatizable, false);

// Nunca perdemos el mensaje: el detalle queda completo aunque el título se corte.
const largo = 'x'.repeat(200);
const t = porReglas(largo);
assert.equal(t.detalle, largo);
assert.ok(t.titulo.length <= 70);

console.log('check ok');
