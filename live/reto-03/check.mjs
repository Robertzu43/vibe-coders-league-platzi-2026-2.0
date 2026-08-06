// Check ejecutable: carga el JS real de public/index.html y prueba la lógica pura.
// Correr: node check.mjs
import { readFileSync } from 'fs';
import assert from 'assert';

const html = readFileSync(new URL('./public/index.html', import.meta.url), 'utf8');
const code = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
assert(code.length > 1000, 'no encontré el script inline');

// DOM mínimo para que el script cargue sin explotar — elementos persistentes por id
const registro = {};
const el = (id) => registro[id] ??= {
  listeners: {}, addEventListener(ev, fn) { this.listeners[ev] = fn; },
  clases: new Set(['translate-x-full']),
  classList: {
    add: (c) => registro[id].clases.add(c),
    remove: (c) => registro[id].clases.delete(c),
    contains: (c) => registro[id].clases.has(c),
  },
  style: {}, innerHTML: '', textContent: '', focus() {}, scrollIntoView() {},
  insertAdjacentHTML(_, h) { this.innerHTML += h; }, querySelectorAll: () => [],
  closest: () => el(id + ':wrap'), remove() {}, appendChild() {}, dataset: {},
};
globalThis.document = { getElementById: (id) => el(id), createElement: () => el(Math.random()), querySelectorAll: () => [] };
globalThis.requestAnimationFrame = (fn) => fn();
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText() {} } }, configurable: true });

new Function(code + '\nglobalThis.__t = { arbolSVG, regionDe, citaAPA, mapWork, abstractDeInvertido, rngDe, estado, abrirPanel, cerrarPanel, plantar };')();
const { arbolSVG, regionDe, citaAPA, mapWork, abstractDeInvertido, estado, abrirPanel, cerrarPanel, plantar } = globalThis.__t;

// regiones
assert.equal(regionDe({ institucion: 'Harvard University', pais: 'US' }).id, 'ivy');
assert.equal(regionDe({ institucion: 'University of British Columbia', pais: 'CA' }).id, 'na', 'UBC no es Ivy');
assert.equal(regionDe({ institucion: 'UNAM', pais: 'MX' }).id, 'latam');
assert.equal(regionDe({ institucion: 'ETH', pais: 'CH' }).id, 'eu');
assert.equal(regionDe({ institucion: 'Tsinghua', pais: 'CN' }).id, 'asia');
assert.equal(regionDe({ institucion: 'X', pais: 'ZA' }).id, 'otros');

// abstract invertido
assert.equal(abstractDeInvertido({ Hola: [0], mundo: [1], Hola2: [2] }), 'Hola mundo Hola2');
assert.equal(abstractDeInvertido(null), '');

// cita APA sin datos no imprime "undefined"
for (const w of [
  { autores: ['A. Pérez'], anio: 2020, titulo: 'T', revista: 'Nature', doi: 'https://doi.org/x' },
  { autores: [], anio: null, titulo: 'T', revista: '', doi: '' },
]) assert(!citaAPA(w).includes('undefined'), 'APA con undefined: ' + citaAPA(w));

// mapWork con respuesta OpenAlex mínima
const m = mapWork({ title: 'T', publication_year: 2021, cited_by_count: 5, doi: 'd',
  authorships: [{ author: { display_name: 'Ana' }, institutions: [{ display_name: 'MIT', country_code: 'US' }] }],
  primary_location: { source: { display_name: 'Rev' } }, abstract_inverted_index: { a: [0], b: [1] } });
assert.equal(m.pais, 'US'); assert.equal(m.abstract, 'a b');
assert(!Object.values(mapWork({})).some(v => v === undefined), 'mapWork vacío da undefined');

// árboles: SVG válido, clickeable (data-i), sin NaN, altura crece con citas
const alturaDe = (svg) => Number(svg.match(/height="(\d+)"/)[1]);
const casos = [
  { citas: 0, institucion: '', pais: '', titulo: 'Sin datos "x"' },
  { citas: 12000, institucion: 'Harvard University', pais: 'US', titulo: 'Famoso' },
  { citas: 50, institucion: 'UNAM', pais: 'MX', titulo: 'Medio' },
];
const svgs = casos.map((w, i) => arbolSVG(w, i));
svgs.forEach((s, i) => {
  assert(s.includes('class="arbol"') && s.includes(`data-i="${i}"`), 'falta hook de click');
  assert(!s.includes('NaN') && !s.includes('undefined'), `SVG ${i} con NaN/undefined`);
  assert((s.match(/<ellipse/g) || []).length > 5, 'copa sin racimos');
  assert(s.includes('url(#foliaje)'), 'sin filtro de follaje');
});
assert(alturaDe(svgs[1]) > alturaDe(svgs[2]) && alturaDe(svgs[2]) > alturaDe(svgs[0]), 'altura no crece con citas');
assert.equal(arbolSVG(casos[1], 1), arbolSVG(casos[1], 1), 'árbol no determinista (misma semilla, distinto SVG)');

// ── flujo de click: delegación en #suelo → abrirPanel → panel con fuente, APA y DOI
const work = { titulo: 'Deep Learning', anio: 2015, citas: 9000, doi: 'https://doi.org/10.1038/nature14539',
  autores: ['Y. LeCun', 'Y. Bengio'], institucion: 'New York University', pais: 'US',
  revista: 'Nature', abstract: 'Deep learning allows computational models...' };
estado.works = [work];

const clickSuelo = el('suelo').listeners.click;
assert(typeof clickSuelo === 'function', 'no hay listener de click en #suelo');
el('panelDetalle').clases.add('translate-x-full');
clickSuelo({ target: { closest: (sel) => sel === '.arbol' ? { dataset: { i: '0' } } : null } });

const panel = el('detalleContenido').innerHTML;
assert(panel.includes('Deep Learning'), 'panel sin título');
assert(panel.includes('New York University'), 'panel sin institución');
assert(panel.includes('https://doi.org/10.1038/nature14539'), 'panel sin link DOI');
assert(panel.includes('Y. LeCun, Y. Bengio (2015)'), 'panel sin cita APA');
assert(/9[.,]?000/.test(panel), 'panel sin citaciones');
assert(!el('panelDetalle').clases.has('translate-x-full'), 'el panel no se abrió (sigue translate-x-full)');

// hover: tarjeta flotante con la info del paper, sin abrir el panel
const hoverSuelo = el('suelo').listeners.mousemove;
assert(typeof hoverSuelo === 'function', 'no hay listener de mousemove en #suelo');
globalThis.window = { innerWidth: 1400 };
cerrarPanel();
hoverSuelo({ clientX: 300, clientY: 500, target: { closest: (sel) => sel === '.arbol' ? { dataset: { i: '0' } } : null } });
assert(el('miniInfo').innerHTML.includes('Deep Learning'), 'miniInfo sin título en hover');
assert(el('miniInfo').innerHTML.includes('New York University'), 'miniInfo sin institución');
assert(!el('miniInfo').clases.has('hidden'), 'miniInfo no se mostró');
assert(el('panelDetalle').clases.has('translate-x-full'), 'el hover abrió el panel (no debía)');
hoverSuelo({ clientX: 300, clientY: 500, target: { closest: () => null } });
assert(el('miniInfo').clases.has('hidden'), 'miniInfo no se ocultó al salir del árbol');

// click fuera de un árbol no abre nada
el('panelDetalle').clases.add('translate-x-full');
clickSuelo({ target: { closest: () => null } });
assert(el('panelDetalle').clases.has('translate-x-full'), 'click fuera de árbol abrió el panel');

// plantar registra el árbol en su arboleda con data-i correcto
el('arboleda-na').innerHTML = ''; el('contador-na').textContent = '0';
plantar([work], 0);
assert(el('arboleda-na').innerHTML.includes('data-i="0"'), 'plantar no puso data-i');
assert.equal(el('contador-na').textContent, 1, 'contador de arboleda no subió');

console.log('✅ check verde: regiones, APA, mapWork, árboles (sin NaN, altura∝citas, determinista) + CLICK E2E (panel abre con fuente/APA/DOI, cierra fuera, plantar cablea data-i)');
