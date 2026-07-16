import type { ExampleCase } from '../cases';

export function renderDemoPage(cases: ExampleCase[]): string {
  const casesJson = JSON.stringify(cases).replace(/</g, '\\u003c');
  return `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Centinela · triage de bugs</title>
<style>
  :root{--accent:#4f46e5;--ink:#111827;--muted:#6b7280;--border:#e5e7eb;--bg:#f6f7f9;--p0:#dc2626;--bk:#2563eb}
  *{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif}
  .wrap{max-width:820px;margin:0 auto;padding:28px 18px}
  h1{font-size:24px;margin:0} .sub{color:var(--muted);margin:4px 0 22px}
  .card{background:#fff;border:1px solid var(--border);border-radius:14px;padding:18px;margin-bottom:18px}
  textarea{width:100%;min-height:96px;border:1px solid var(--border);border-radius:10px;padding:12px;font:inherit;resize:vertical}
  button{background:var(--accent);color:#fff;border:0;border-radius:10px;padding:10px 16px;font:600 14px inherit;cursor:pointer}
  button.ghost{background:#fff;color:var(--accent);border:1px solid var(--accent)}
  .row{display:flex;gap:10px;flex-wrap:wrap;margin-top:12px}
  .badge{display:inline-block;border-radius:999px;padding:3px 10px;font-size:12px;font-weight:600;margin:2px 4px 2px 0}
  .b-p0{background:#fee2e2;color:var(--p0)} .b-bk{background:#dbeafe;color:var(--bk)} .b-n{background:#eef2ff;color:var(--accent)}
  table{width:100%;border-collapse:collapse;margin-top:6px;font-size:14px}
  th,td{text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);vertical-align:top}
  th{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.04em}
  .muted{color:var(--muted)} .pill{font-weight:700}
  .dot-p0{color:var(--p0)} .dot-bk{color:var(--bk)}
</style></head><body><div class="wrap">
  <h1>⚙️ Centinela</h1>
  <div class="sub">El agente que decide por ti — triage de bugs. Pega un bug y mira la decisión, o corre los 5 casos.</div>

  <div class="card">
    <textarea id="bug" placeholder="Describe un bug… p. ej. 'el checkout tira 500 al pagar en producción'"></textarea>
    <div class="row">
      <button onclick="analizar()">Analizar</button>
      <button class="ghost" onclick="correrCasos()">Correr 5 casos</button>
    </div>
    <div id="out"></div>
  </div>

  <div class="card">
    <div class="muted" style="font-size:13px">Rúbrica: <b>P0</b> = pérdida de datos, o (en producción y afecta el núcleo). El resto va al <b>backlog</b>. La demo corre en modo dry-run (no envía a Slack/Sheet).</div>
  </div>

<script>
const CASES = ${casesJson};
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function badgesFor(d){
  const p = d.prioridad === 'P0'
    ? '<span class="badge b-p0">P0 · urgente → Slack</span>'
    : '<span class="badge b-bk">backlog → Sheet</span>';
  return p
    + '<span class="badge b-n">sev: '+esc(d.severidad)+'</span>'
    + '<span class="badge b-n">prod: '+(d.enProduccion?'sí':'no')+'</span>'
    + '<span class="badge b-n">núcleo: '+(d.afectaNucleo?'sí':'no')+'</span>'
    + '<span class="badge b-n">datos: '+(d.perdidaDatos?'sí':'no')+'</span>'
    + '<span class="badge b-n">'+esc(d.fuente)+'</span>';
}
async function triage(text){
  const r = await fetch('/triage',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,dryRun:true})});
  return r.json();
}
async function analizar(){
  const t = document.getElementById('bug').value.trim();
  const out = document.getElementById('out');
  if(!t){ out.innerHTML='<p class="muted">Escribe un bug primero.</p>'; return; }
  out.innerHTML='<p class="muted">Analizando…</p>';
  try{
    const res = await triage(t); const d = res.decision;
    out.innerHTML = '<div style="margin-top:14px">'+badgesFor(d)
      +'<p style="margin:10px 0 0"><b>'+esc(d.titulo)+'</b></p>'
      +'<p class="muted" style="margin:4px 0 0">'+esc(d.razon)+'</p>'
      +'<p class="muted" style="margin:4px 0 0">Acción: '+esc(d.accionSugerida)+'</p></div>';
  }catch(e){ out.innerHTML='<p class="muted">Error: '+e+'</p>'; }
}
async function correrCasos(){
  const out = document.getElementById('out');
  out.innerHTML='<p class="muted">Corriendo los 5 casos…</p>';
  let rows='';
  for(const c of CASES){
    const res = await triage(c.text); const d = res.decision;
    const dot = d.prioridad==='P0' ? '<span class="pill dot-p0">P0 → Slack</span>' : '<span class="pill dot-bk">backlog → Sheet</span>';
    rows += '<tr><td>'+esc(c.text)+'</td><td>'+dot+'<div class="muted" style="font-size:12px">'+esc(d.severidad)+' · '+esc(d.fuente)+'</div></td></tr>';
  }
  out.innerHTML = '<table style="margin-top:14px"><thead><tr><th>Bug</th><th>Decisión → ruta</th></tr></thead><tbody>'+rows+'</tbody></table>';
}
</script>
</div></body></html>`;
}
