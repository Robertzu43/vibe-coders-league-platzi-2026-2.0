export const board = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Anotado · el tablero se llena solo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0}
  :root{
    --papel:#f4efe4; --papel2:#ebe4d5; --tinta:#211d18; --suave:#6d6357;
    --linea:#d9cfbb; --alta:#c9401c; --media:#b8862a; --baja:#5c7a4a; --acento:#1f4d8f;
  }
  body{
    background:var(--papel); color:var(--tinta);
    font-family:'Bricolage Grotesque',system-ui,sans-serif;
    min-height:100vh; padding:28px clamp(16px,3vw,40px) 60px;
    background-image:repeating-linear-gradient(transparent 0 31px,var(--linea) 31px 32px);
    background-attachment:fixed;
  }
  header{max-width:1400px;margin:0 auto 26px;display:flex;flex-wrap:wrap;gap:20px;align-items:flex-end;justify-content:space-between}
  .marca{font-family:'Instrument Serif',serif;font-size:clamp(44px,6vw,76px);line-height:.92;letter-spacing:-.02em}
  .marca em{font-style:italic;color:var(--acento)}
  .lema{font-size:15px;color:var(--suave);max-width:34ch;margin-top:8px;line-height:1.45}
  .contador{font-family:'Instrument Serif',serif;font-size:15px;color:var(--suave);text-align:right;line-height:1.5}
  .contador b{display:block;font-size:38px;color:var(--tinta);font-style:italic}

  .decir{max-width:1400px;margin:0 auto 30px;display:flex;gap:10px;flex-wrap:wrap;
    background:#fffdf8;border:1px solid var(--linea);border-radius:14px;padding:14px;
    box-shadow:0 1px 0 #fff inset,0 6px 18px -14px rgba(33,29,24,.5)}
  .decir input{flex:1 1 320px;border:0;background:transparent;font:inherit;font-size:16px;color:var(--tinta);padding:8px 6px;outline:none}
  .decir input::placeholder{color:#a89c8b}
  .decir button{border:0;background:var(--tinta);color:var(--papel);font:inherit;font-weight:600;
    font-size:15px;padding:11px 22px;border-radius:9px;cursor:pointer;transition:transform .12s,background .2s}
  .decir button:hover{background:var(--acento);transform:translateY(-1px)}
  .decir button:disabled{opacity:.45;cursor:wait;transform:none}
  .pista{flex-basis:100%;font-size:13px;color:var(--suave);padding:0 6px}
  .pista b{color:var(--acento);font-weight:600}

  .tablero{max-width:1400px;margin:0 auto;display:grid;gap:16px;
    grid-template-columns:repeat(auto-fit,minmax(250px,1fr));align-items:start}
  .col{background:rgba(255,253,248,.72);border:1px solid var(--linea);border-radius:16px;
    padding:14px;min-height:230px;transition:background .18s,border-color .18s,transform .18s}
  .col.sobre{background:#fffdf8;border-color:var(--acento);border-style:dashed;transform:scale(1.012)}
  .col h2{font-family:'Instrument Serif',serif;font-size:23px;font-weight:400;
    display:flex;align-items:baseline;gap:9px;padding:0 4px 12px;border-bottom:1px solid var(--linea);margin-bottom:14px}
  .col h2 span{font-family:'Bricolage Grotesque',sans-serif;font-size:12px;font-weight:600;
    color:var(--suave);background:var(--papel2);border-radius:20px;padding:3px 9px}
  .vacio{font-size:13px;color:#a89c8b;font-style:italic;text-align:center;padding:26px 10px;line-height:1.5}

  .lista{display:flex;flex-direction:column;gap:12px;min-height:60px}
  .t{background:#fffdf8;border:1px solid var(--linea);border-left:4px solid var(--media);
    border-radius:10px;padding:13px 14px;cursor:grab;position:relative;
    box-shadow:0 5px 16px -12px rgba(33,29,24,.65);transition:transform .16s,box-shadow .16s}
  .t:hover{transform:translateY(-2px) rotate(-.35deg);box-shadow:0 12px 24px -14px rgba(33,29,24,.6)}
  .t:active{cursor:grabbing}
  .t.arrastrando{opacity:.35}
  .t[data-p="alta"]{border-left-color:var(--alta)}
  .t[data-p="baja"]{border-left-color:var(--baja)}
  .t h3{font-size:15.5px;font-weight:600;line-height:1.32;margin-bottom:9px;letter-spacing:-.005em}
  .meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11.5px;color:var(--suave)}
  .chip{background:var(--papel2);border-radius:20px;padding:2.5px 8px;font-weight:600;letter-spacing:.02em}
  .chip.p-alta{background:#f7ded6;color:var(--alta)}
  .chip.p-baja{background:#e2ebdc;color:var(--baja)}
  .dicho{margin-top:10px;padding-top:9px;border-top:1px dashed var(--linea);
    font-size:12.5px;color:var(--suave);font-style:italic;line-height:1.45}

  @keyframes cae{
    0%{opacity:0;transform:translateY(-46px) rotate(-7deg) scale(.9)}
    62%{opacity:1;transform:translateY(5px) rotate(1.4deg) scale(1.03)}
    100%{opacity:1;transform:none}
  }
  .t.nuevo{animation:cae .62s cubic-bezier(.2,1.5,.4,1)}
  @keyframes brillo{0%,100%{box-shadow:0 5px 16px -12px rgba(33,29,24,.65)}45%{box-shadow:0 0 0 4px rgba(31,77,143,.16)}}
  .t.nuevo{animation:cae .62s cubic-bezier(.2,1.5,.4,1),brillo 1.5s ease .6s}
  @media (prefers-reduced-motion:reduce){.t.nuevo{animation:none}.t:hover{transform:none}}
</style>
</head>
<body>

<header>
  <div>
    <h1 class="marca">Anotado<em>.</em></h1>
    <p class="lema">Tu equipo no va a aprender otra herramienta. Que escriban en el chat como siempre — el tablero se llena solo.</p>
  </div>
  <div class="contador"><b id="n">0</b>tickets que nadie<br>tuvo que capturar</div>
</header>

<form class="decir" id="f">
  <input id="txt" autocomplete="off" placeholder="Escribí como le escribirías a tu compañero: &quot;se volvió a trabar la puerta de la bodega 2&quot;">
  <button id="b">Decirlo</button>
  <p class="pista">Así de fácil lo manda tu equipo por Telegram a <b>@vibeliga_bot</b>. La IA le pone título, área y prioridad. Nadie llena un formulario.</p>
</form>

<main class="tablero" id="tablero"></main>

<script>
var COLS = [
  ['nuevo', 'Recién dicho', 'Todavía nadie lo agarra.'],
  ['curso', 'En eso ando', 'Arrastrá algo acá cuando alguien lo tome.'],
  ['trabado', 'Trabado', 'Lo que espera a alguien más.'],
  ['listo', 'Listo', 'Lo hecho. Sin reclamos.']
];
var vistos = null;
var arrastrando = null;

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function cuando(iso) {
  var d = new Date(String(iso).replace(' ', 'T') + 'Z');
  var m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (isNaN(m) || m < 1) return 'ahora';
  if (m < 60) return 'hace ' + m + ' min';
  if (m < 1440) return 'hace ' + Math.floor(m / 60) + ' h';
  return 'hace ' + Math.floor(m / 1440) + ' d';
}

function armar() {
  var t = document.getElementById('tablero');
  t.innerHTML = '';
  COLS.forEach(function (c) {
    var d = document.createElement('section');
    d.className = 'col';
    d.dataset.estado = c[0];
    d.innerHTML = '<h2>' + c[1] + ' <span data-c="' + c[0] + '">0</span></h2>' +
      '<div class="lista" data-lista="' + c[0] + '"></div>' +
      '<p class="vacio" data-v="' + c[0] + '">' + c[2] + '</p>';
    d.addEventListener('dragover', function (e) { e.preventDefault(); d.classList.add('sobre'); });
    d.addEventListener('dragleave', function () { d.classList.remove('sobre'); });
    d.addEventListener('drop', function (e) {
      e.preventDefault();
      d.classList.remove('sobre');
      if (arrastrando) mover(arrastrando, c[0]);
    });
    t.appendChild(d);
  });
}

function tarjeta(k, fresco) {
  var el = document.createElement('article');
  el.className = 't' + (fresco ? ' nuevo' : '');
  el.draggable = true;
  el.dataset.id = k.id;
  el.dataset.p = k.prioridad;
  var pc = k.prioridad === 'alta' ? ' p-alta' : k.prioridad === 'baja' ? ' p-baja' : '';
  el.innerHTML = '<h3>' + esc(k.titulo) + '</h3>' +
    '<div class="meta">' +
      '<span class="chip' + pc + '">' + esc(k.prioridad) + '</span>' +
      '<span class="chip">' + esc(k.area) + '</span>' +
      '<span>' + esc(k.autor) + ' · ' + cuando(k.creado) + '</span>' +
    '</div>' +
    (k.detalle && k.detalle !== k.titulo ? '<p class="dicho">“' + esc(k.detalle) + '”</p>' : '');
  el.addEventListener('dragstart', function () { arrastrando = k.id; el.classList.add('arrastrando'); });
  el.addEventListener('dragend', function () { arrastrando = null; el.classList.remove('arrastrando'); });
  return el;
}

function mover(id, estado) {
  var el = document.querySelector('[data-id="' + id + '"]');
  if (el) document.querySelector('[data-lista="' + estado + '"]').appendChild(el);
  fetch('/api/move', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: id, estado: estado })
  }).then(pintar);
}

function pintar() {
  return fetch('/api/tickets').then(function (r) { return r.json(); }).then(function (ts) {
    var primera = vistos === null;
    if (primera) vistos = {};
    document.getElementById('n').textContent = ts.length;

    COLS.forEach(function (c) { document.querySelector('[data-lista="' + c[0] + '"]').innerHTML = ''; });

    var cuenta = { nuevo: 0, curso: 0, trabado: 0, listo: 0 };
    ts.slice().reverse().forEach(function (k) {
      var est = cuenta[k.estado] === undefined ? 'nuevo' : k.estado;
      var fresco = !primera && !vistos[k.id];
      vistos[k.id] = 1;
      cuenta[est]++;
      var lista = document.querySelector('[data-lista="' + est + '"]');
      lista.insertBefore(tarjeta(k, fresco), lista.firstChild);
    });

    COLS.forEach(function (c) {
      document.querySelector('[data-c="' + c[0] + '"]').textContent = cuenta[c[0]];
      document.querySelector('[data-v="' + c[0] + '"]').style.display = cuenta[c[0]] ? 'none' : 'block';
    });
  });
}

document.getElementById('f').addEventListener('submit', function (e) {
  e.preventDefault();
  var i = document.getElementById('txt'), b = document.getElementById('b');
  if (!i.value.trim()) return;
  b.disabled = true;
  fetch('/api/decir', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ texto: i.value, autor: 'vos' })
  }).then(function () { i.value = ''; b.disabled = false; return pintar(); })
    .catch(function () { b.disabled = false; });
});

armar();
pintar();
setInterval(pintar, 2000);
</script>
</body>
</html>`;
