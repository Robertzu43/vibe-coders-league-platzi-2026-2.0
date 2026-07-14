// Cliente del quiz Radar Digital.
// IMPORTA SOLO datos client-safe + el motor de diagnóstico. NUNCA report.ts / report-blocks.ts
// (el contenido del informe llega del servidor tras el gate — así el gate es real).
import { scoreQuiz, archetypeFor, type Respuestas } from '../lib/diagnostic';

interface Bloque { titulo: string; cuerpo: string; }
interface Informe { arquetipo: { emoji: string; label: string }; bloques: Bloque[]; cierre: string; }

const root = document.querySelector<HTMLElement>('[data-quiz]');
if (root) init(root);

function init(root: HTMLElement) {
  const steps = Array.from(root.querySelectorAll<HTMLElement>('[data-step]'));
  const bar = root.querySelector<HTMLElement>('[data-bar]');
  const barWrap = root.querySelector<HTMLElement>('.quiz__bar');
  const stepNum = root.querySelector<HTMLElement>('[data-step-num]');
  const backBtn = root.querySelector<HTMLButtonElement>('[data-back]');
  const stage = root.querySelector<HTMLElement>('[data-stage]');
  const progress = root.querySelector<HTMLElement>('[data-progress]');
  const nav = root.querySelector<HTMLElement>('[data-nav]');
  const resultado = root.querySelector<HTMLElement>('[data-resultado]');
  const gate = root.querySelector<HTMLElement>('[data-gate]');
  const informe = root.querySelector<HTMLElement>('[data-informe]');

  const answers: Respuestas = {};
  const total = steps.length;
  let index = 0;

  function show(i: number) {
    index = Math.max(0, Math.min(i, total - 1));
    steps.forEach((s, n) => s.classList.toggle('is-active', n === index));
    if (stepNum) stepNum.textContent = String(index + 1);
    if (bar) bar.style.width = `${Math.round((index / total) * 100)}%`;
    if (barWrap) barWrap.setAttribute('aria-valuenow', String(index + 1));
    if (backBtn) backBtn.hidden = index === 0;
    const active = steps[index];
    const legend = active?.querySelector<HTMLElement>('.quiz__q');
    legend?.setAttribute('tabindex', '-1');
    legend?.focus({ preventScroll: true });
  }

  steps.forEach((step) => {
    const qid = step.dataset.qid!;
    step.querySelectorAll<HTMLButtonElement>('.opcion').forEach((btn) => {
      btn.addEventListener('click', () => {
        answers[qid] = btn.dataset.opt!;
        step.querySelectorAll('.opcion').forEach((b) => b.classList.remove('is-selected'));
        btn.classList.add('is-selected');
        window.setTimeout(() => {
          if (index < total - 1) show(index + 1);
          else finish();
        }, 260);
      });
    });
  });

  backBtn?.addEventListener('click', () => show(index - 1));

  function finish() {
    const puntajes = scoreQuiz(answers);
    const arq = archetypeFor(puntajes);

    setText(root, '[data-arq-emoji]', arq.emoji);
    setText(root, '[data-arq-label]', `${arq.label}`);
    setText(root, '[data-arq-resumen]', arq.resumen);
    setText(root, '[data-web-val]', String(puntajes.puntaje_web));
    setText(root, '[data-auto-val]', String(puntajes.puntaje_automatizacion));

    progress?.setAttribute('hidden', '');
    stage?.setAttribute('hidden', '');
    nav?.setAttribute('hidden', '');
    resultado?.removeAttribute('hidden');

    // Animar las barras en el siguiente frame.
    requestAnimationFrame(() => {
      const webBar = root.querySelector<HTMLElement>('[data-web-bar]');
      const autoBar = root.querySelector<HTMLElement>('[data-auto-bar]');
      if (webBar) webBar.style.width = `${puntajes.puntaje_web}%`;
      if (autoBar) autoBar.style.width = `${puntajes.puntaje_automatizacion}%`;
    });

    resultado?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // "Ver mi informe" → revela el gate.
  root.querySelector<HTMLButtonElement>('[data-ver-informe]')?.addEventListener('click', () => {
    gate?.removeAttribute('hidden');
    gate?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    gate?.querySelector<HTMLInputElement>('input[name="nombre"]')?.focus();
  });

  // Envío del gate → POST /api/lead → render del informe.
  const form = root.querySelector<HTMLFormElement>('#lead-form');
  const status = root.querySelector<HTMLElement>('[data-gate-status]');
  const submitBtn = form?.querySelector<HTMLButtonElement>('[data-submit]');

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    setStatus(status, '', null);
    if (submitBtn) submitBtn.disabled = true;

    const fd = new FormData(form);
    const payload = {
      nombre: String(fd.get('nombre') ?? ''),
      email: String(fd.get('email') ?? ''),
      negocio: String(fd.get('negocio') ?? ''),
      website: String(fd.get('website') ?? ''),
      tipo_negocio: answers['tipo'] ?? null,
      respuestas: answers,
    };

    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; informe?: Informe; error?: string };

      if (res.ok && data.ok) {
        gate?.setAttribute('hidden', '');
        if (data.informe) renderInforme(informe, data.informe);
        else setStatus(status, '¡Listo! Te contactaremos por correo. 🎉', null);
        informe?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        setStatus(status, data.error || 'No pudimos procesar tu solicitud. Intenta de nuevo.', 'error');
      }
    } catch {
      setStatus(status, 'Hubo un problema de conexión. Intenta de nuevo.', 'error');
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  show(0);
}

// --- helpers (todos usan textContent; nunca innerHTML) ---

function setText(root: ParentNode, sel: string, text: string) {
  const el = root.querySelector<HTMLElement>(sel);
  if (el) el.textContent = text;
}

function setStatus(el: HTMLElement | null, text: string, tone: 'error' | null) {
  if (!el) return;
  el.textContent = text;
  if (tone) el.setAttribute('data-tone', tone);
  else el.removeAttribute('data-tone');
}

function renderInforme(container: HTMLElement | null, informe: Informe) {
  if (!container) return;
  container.textContent = '';

  const eyebrow = document.createElement('span');
  eyebrow.className = 'eyebrow';
  eyebrow.textContent = 'Tu informe';
  container.appendChild(eyebrow);

  const h3 = document.createElement('h3');
  h3.className = 'informe__title';
  h3.textContent = `${informe.arquetipo.emoji} ${informe.arquetipo.label}: tu plan de acción`;
  container.appendChild(h3);

  const list = document.createElement('ol');
  list.className = 'informe__bloques';
  for (const b of informe.bloques) {
    const li = document.createElement('li');
    li.className = 'informe__bloque';
    const t = document.createElement('h4');
    t.textContent = b.titulo;
    const p = document.createElement('p');
    p.textContent = b.cuerpo;
    li.append(t, p);
    list.appendChild(li);
  }
  container.appendChild(list);

  const cierre = document.createElement('p');
  cierre.className = 'informe__cierre';
  cierre.textContent = informe.cierre;
  container.appendChild(cierre);

  container.removeAttribute('hidden');
}
