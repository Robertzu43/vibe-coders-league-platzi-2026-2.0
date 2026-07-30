export const board = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Anotado · la colmena se organiza sola</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,600;12..96,800&display=swap" rel="stylesheet">
<style>
  *,*::before,*::after{box-sizing:border-box;margin:0}
  :root{
    --cera:#fdf5e3; --cera2:#f6e8c9; --panel:#fffdf6;
    --tinta:#2b1e08; --suave:#7d6640; --linea:#e3d2ab;
    --miel:#e0940a; --miel2:#f7c948; --alta:#c0341c; --baja:#6b8f3f;
  }
  body{
    background:var(--cera); color:var(--tinta);
    font-family:'Bricolage Grotesque',system-ui,sans-serif;
    min-height:100vh; padding:30px clamp(16px,3vw,42px) 70px;
    background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49' viewBox='0 0 28 49'%3E%3Cpath fill='%23c9962a' fill-opacity='0.11' d='M13.99 9.25l13 7.5v15l-13 7.5L1 31.75v-15l12.99-7.5zM3 17.9v12.7l10.99 6.34 11-6.35V17.9l-11-6.34L3 17.9zM0 15l12.98-7.5V0h-2v6.35L0 12.69v2.3zm0 18.5L12.98 41v8h-2v-6.85L0 35.81v-2.3zM15 0v7.5L27.99 15H28v-2.31h-.01L17 6.35V0h-2zm0 49v-8l12.99-7.5H28v2.31h-.01L17 42.15V49h-2z'/%3E%3C/svg%3E");
    background-attachment:fixed;
  }
  .hex{clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)}

  header{max-width:1440px;margin:0 auto 26px;display:flex;flex-wrap:wrap;gap:24px;align-items:flex-end;justify-content:space-between}
  .marca{font-family:'Instrument Serif',serif;font-size:clamp(46px,6.4vw,80px);line-height:.9;letter-spacing:-.02em;display:flex;align-items:center;gap:14px}
  .marca span{font-size:.62em;filter:drop-shadow(0 3px 6px rgba(224,148,10,.4))}
  .marca em{font-style:italic;color:var(--miel)}
  .lema{font-size:15.5px;color:var(--suave);max-width:40ch;margin-top:11px;line-height:1.5}
  .lema b{color:var(--tinta);font-weight:600}
  .stats{display:flex;gap:12px}
  .stat{background:var(--miel);color:#fff;width:104px;height:118px;display:flex;flex-direction:column;
    align-items:center;justify-content:center;text-align:center;padding:0 12px;gap:2px}
  .stat.otra{background:var(--tinta)}
  .stat b{font-family:'Instrument Serif',serif;font-style:italic;font-size:40px;line-height:1}
  .stat i{font-style:normal;font-size:10.5px;line-height:1.25;opacity:.9;letter-spacing:.02em}

  .decir{max-width:1440px;margin:0 auto 30px;display:flex;gap:10px;flex-wrap:wrap;align-items:center;
    background:var(--panel);border:1px solid var(--linea);border-radius:14px;padding:15px;
    box-shadow:0 8px 22px -18px rgba(43,30,8,.7)}
  .decir input{flex:1 1 320px;border:0;background:transparent;font:inherit;font-size:16px;color:var(--tinta);padding:8px 6px;outline:none}
  .decir input::placeholder{color:#b6a37f}
  .decir button{border:0;background:var(--tinta);color:var(--cera);font:inherit;font-weight:600;
    font-size:15px;padding:12px 24px;border-radius:9px;cursor:pointer;transition:transform .12s,background .2s}
  .decir button:hover{background:var(--miel);transform:translateY(-1px)}
  .decir button:disabled{opacity:.45;cursor:wait;transform:none}
  .pista{flex-basis:100%;font-size:13px;color:var(--suave);padding:2px 6px 0;line-height:1.5}
  .pista b{color:var(--miel);font-weight:600}

  .tablero{max-width:1440px;margin:0 auto;display:grid;gap:16px;
    grid-template-columns:repeat(auto-fit,minmax(255px,1fr));align-items:start}
  .col{background:rgba(255,253,246,.76);border:1px solid var(--linea);border-radius:16px;
    padding:15px;min-height:240px;transition:background .18s,border-color .18s,transform .18s}
  .col.sobre{background:var(--panel);border-color:var(--miel);border-style:dashed;transform:scale(1.012)}
  .col h2{font-family:'Instrument Serif',serif;font-size:24px;font-weight:400;
    display:flex;align-items:center;gap:9px;padding-bottom:11px;border-bottom:1px solid var(--linea)}
  .col h2 u{width:19px;height:21px;background:var(--miel);flex:none;text-decoration:none;
    clip-path:polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)}
  .col[data-estado="listo"] h2 u{background:var(--baja)}
  .col[data-estado="trabado"] h2 u{background:var(--alta)}
  .col h2 span{margin-left:auto;font-family:'Bricolage Grotesque',sans-serif;font-size:12px;
    font-weight:600;color:var(--suave);background:var(--cera2);border-radius:20px;padding:3px 10px}
  .sub{font-size:12px;color:#a89372;padding:9px 2px 13px;line-height:1.4}

  .lista{display:flex;flex-direction:column;gap:12px;min-height:56px}
  .vacio{font-size:13px;color:#b6a37f;font-style:italic;text-align:center;padding:20px 10px;line-height:1.5}

  .t{background:var(--panel);border:1px solid var(--linea);border-left:4px solid var(--miel);
    border-radius:10px;padding:13px 14px;cursor:grab;position:relative;overflow:hidden;
    box-shadow:0 6px 18px -14px rgba(43,30,8,.75);transition:transform .16s,box-shadow .16s}
  .t:hover{transform:translateY(-2px) rotate(-.35deg);box-shadow:0 14px 26px -16px rgba(43,30,8,.7)}
  .t:active{cursor:grabbing}
  .t.arrastrando{opacity:.35}
  .t[data-p="alta"]{border-left-color:var(--alta)}
  .t[data-p="baja"]{border-left-color:var(--baja)}
  .t h3{font-size:15.5px;font-weight:600;line-height:1.32;margin-bottom:9px;letter-spacing:-.005em}
  .meta{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:11.5px;color:var(--suave)}
  .chip{background:var(--cera2);border-radius:20px;padding:2.5px 9px;font-weight:600;letter-spacing:.02em}
  .chip.p-alta{background:#f7ded6;color:var(--alta)}
  .chip.p-baja{background:#e4eddb;color:var(--baja)}
  .dicho{margin-top:10px;padding-top:9px;border-top:1px dashed var(--linea);
    font-size:12.5px;color:var(--suave);font-style:italic;line-height:1.45}

  /* Lo que la colmena puede hacer sola. El humano autoriza. */
  .auto{margin-top:11px;background:linear-gradient(180deg,#fff8e3,#fdefcd);
    border:1px dashed var(--miel);border-radius:9px;padding:10px 11px}
  .auto p{font-size:12.5px;line-height:1.4;color:#6b5312;margin-bottom:9px}
  .auto p b{color:var(--tinta);font-weight:600}
  .auto button{width:100%;border:0;background:var(--miel);color:#fff;font:inherit;font-weight:700;
    font-size:13px;padding:9px;border-radius:7px;cursor:pointer;letter-spacing:.01em;
    transition:background .18s,transform .12s}
  .auto button:hover{background:#c67f05;transform:translateY(-1px)}
  .auto button:disabled{opacity:.6;cursor:wait;transform:none}
  .hecho{margin-top:11px;background:#eef4e6;border:1px solid #cfe0bd;border-radius:9px;
    padding:9px 11px;font-size:12.5px;line-height:1.4;color:#40632a}
  .hecho b{font-weight:600}

  @keyframes cae{
    0%{opacity:0;transform:translateY(-48px) rotate(-7deg) scale(.9)}
    62%{opacity:1;transform:translateY(5px) rotate(1.4deg) scale(1.03)}
    100%{opacity:1;transform:none}
  }
  @keyframes zumba{0%,100%{box-shadow:0 6px 18px -14px rgba(43,30,8,.75)}45%{box-shadow:0 0 0 4px rgba(224,148,10,.28)}}
  .t.nuevo{animation:cae .62s cubic-bezier(.2,1.5,.4,1),zumba 1.5s ease .6s}
  @keyframes miel{
    0%{transform:translateX(-105%)}
    100%{transform:translateX(105%)}
  }
  .t.mielando::after{content:'';position:absolute;inset:0;pointer-events:none;
    background:linear-gradient(100deg,transparent,rgba(247,201,72,.85),transparent);
    animation:miel .8s ease}
  @media (prefers-reduced-motion:reduce){.t.nuevo,.t.mielando::after{animation:none}.t:hover{transform:none}}
</style>
</head>
<body>

<header>
  <div>
    <h1 class="marca"><span>🐝</span>Anotado<em>.</em></h1>
    <p class="lema">En una colmena nadie llena formularios. Cada obrera reporta lo que ve y <b>el panal se organiza solo</b>. Tu equipo escribe en el chat como siempre.</p>
  </div>
  <div class="stats">
    <div class="stat hex"><b id="n">0</b><i>tickets recibidos</i></div>
    <div class="stat otra hex"><b id="na">0</b><i>los resuelve la colmena</i></div>
  </div>
</header>

<form class="decir" id="f">
  <input id="txt" autocomplete="off" placeholder="Escribí como le escribirías a un compañero: &quot;perdí mis credenciales del sistema&quot;">
  <button id="b">Decirlo</button>
  <p class="pista">Así lo manda tu equipo por Telegram a <b>@vibeliga_bot</b>. La IA le pone título, área y prioridad — y marca lo que <b>puede resolver sola</b>. Arrastrá las tarjetas entre panales.</p>
</form>

<main class="tablero" id="tablero"></main>

<script>
var COLS = [
  ['nuevo', 'Recibido', 'Lo que el equipo acaba de decir.'],
  ['curso', 'En proceso', 'Alguien ya lo tomó.'],
  ['trabado', 'En espera', 'Necesita a alguien más.'],
  ['listo', 'Resuelto', 'Hecho. Sin reclamos.']
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
    d.innerHTML = '<h2><u></u>' + c[1] + ' <span data-c="' + c[0] + '">0</span></h2>' +
      '<p class="sub">' + c[2] + '</p>' +
      '<div class="lista" data-lista="' + c[0] + '"></div>' +
      '<p class="vacio" data-v="' + c[0] + '">Nada por acá.</p>';
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

  var html = '<h3>' + esc(k.titulo) + '</h3>' +
    '<div class="meta">' +
      '<span class="chip' + pc + '">' + esc(k.prioridad) + '</span>' +
      '<span class="chip">' + esc(k.area) + '</span>' +
      '<span>' + esc(k.autor) + ' · ' + cuando(k.creado) + '</span>' +
    '</div>' +
    (k.detalle && k.detalle !== k.titulo ? '<p class="dicho">“' + esc(k.detalle) + '”</p>' : '');

  if (k.resuelto) {
    html += '<p class="hecho">🐝 <b>Lo resolvió la colmena:</b> ' + esc(k.resuelto) + '</p>';
  } else if (k.automatizable) {
    html += '<div class="auto">' +
      '<p>🐝 <b>Esto no necesita manos.</b> ' + esc(k.accion) + '</p>' +
      '<button data-r="' + k.id + '">Autorizar a la colmena</button>' +
    '</div>';
  }

  el.innerHTML = html;
  var b = el.querySelector('[data-r]');
  if (b) b.addEventListener('click', function () { resolver(k.id, el, b); });

  el.addEventListener('dragstart', function () { arrastrando = k.id; el.classList.add('arrastrando'); });
  el.addEventListener('dragend', function () { arrastrando = null; el.classList.remove('arrastrando'); });
  return el;
}

function resolver(id, el, boton) {
  boton.disabled = true;
  boton.textContent = 'La colmena trabajando…';
  el.classList.add('mielando');
  fetch('/api/resolver', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id: id })
  }).then(function (r) { return r.json(); }).then(function () {
    setTimeout(pintar, 620);
  }).catch(function () {
    boton.disabled = false;
    boton.textContent = 'Autorizar a la colmena';
    el.classList.remove('mielando');
  });
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
    document.getElementById('na').textContent = ts.filter(function (k) {
      return k.automatizable && !k.resuelto;
    }).length;

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
