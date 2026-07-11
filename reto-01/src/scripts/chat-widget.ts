type Msg = { role: 'user' | 'assistant'; content: string };

const modal = document.getElementById('chat-modal')!;
const panel = modal.querySelector('.chat-panel') as HTMLElement;
const messagesEl = document.getElementById('chat-messages')!;
const form = document.getElementById('chat-form') as HTMLFormElement;
const input = document.getElementById('chat-input') as HTMLInputElement;
const submitBtn = form.querySelector('button[type="submit"]') as HTMLButtonElement;
const closeBtn = document.getElementById('chat-close')!;

const history: Msg[] = [];
let lastFocused: HTMLElement | null = null;

const WELCOME =
  '¡Hola! Soy Kiko 🦜 el loro de Parla. Puedo contarte de precios, horarios y políticas, o hacerte un diagnóstico de tu nivel. ¿Qué necesitas?';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function prefersReducedMotion(): boolean {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getFocusableElements(): HTMLElement[] {
  return Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

// Atrapa el foco (Tab / Shift+Tab) dentro del panel mientras el modal está abierto.
function trapFocus(e: KeyboardEvent) {
  if (e.key !== 'Tab' || modal.hidden) return;

  const focusable = getFocusableElements();
  if (focusable.length === 0) return;

  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (e.shiftKey) {
    if (active === first || !panel.contains(active)) {
      e.preventDefault();
      last.focus();
    }
  } else {
    if (active === last || !panel.contains(active)) {
      e.preventDefault();
      first.focus();
    }
  }
}

function open() {
  lastFocused = document.activeElement as HTMLElement | null;
  modal.hidden = false;
  document.body.style.overflow = 'hidden';
  if (messagesEl.childElementCount === 0) addBubble('assistant', WELCOME);
  input.focus();
}

function close() {
  modal.hidden = true;
  document.body.style.overflow = '';
  lastFocused?.focus();
}

function addBubble(role: Msg['role'], text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = `bubble ${role}`;
  el.textContent = text;
  messagesEl.appendChild(el);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return el;
}

async function typeInto(el: HTMLElement, text: string) {
  // Oculta la burbuja de AT mientras se anima carácter a carácter para evitar
  // que el lector de pantalla anuncie cada mutación individual del aria-live.
  el.setAttribute('aria-hidden', 'true');

  if (prefersReducedMotion()) {
    el.textContent = text;
  } else {
    el.textContent = '';
    for (const ch of text) {
      el.textContent += ch;
      messagesEl.scrollTop = messagesEl.scrollHeight;
      await new Promise((r) => setTimeout(r, 12));
    }
  }

  messagesEl.scrollTop = messagesEl.scrollHeight;
  // Revela el texto final completo: se anuncia una sola vez, de forma limpia.
  el.removeAttribute('aria-hidden');
}

// Abre el modal desde cualquier botón/enlace marcado con [data-open-chat],
// sin importar en qué sección de la landing viva (Hero, Diagnóstico, …).
document.querySelectorAll('[data-open-chat]').forEach((btn) => {
  btn.addEventListener('click', open);
});

closeBtn.addEventListener('click', close);

// Cerrar con Escape.
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !modal.hidden) close();
});

// Cerrar al hacer clic en el fondo (fuera del panel).
modal.addEventListener('mousedown', (e) => {
  if (!panel.contains(e.target as Node)) close();
});

// Atrapa el foco dentro del panel mientras el modal está abierto.
modal.addEventListener('keydown', trapFocus);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;

  input.value = '';
  input.disabled = true;
  submitBtn.disabled = true;

  addBubble('user', text);
  history.push({ role: 'user', content: text });

  const typing = addBubble('assistant', 'Kiko está escribiendo…');
  typing.classList.add('pensando');

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history }),
    });
    const data = await res.json();
    const reply = data.response ?? data.error ?? '¡Uy! Algo salió mal 🦜';
    history.push({ role: 'assistant', content: reply });
    typing.classList.remove('pensando');
    await typeInto(typing, reply);
  } catch {
    typing.classList.remove('pensando');
    typing.textContent = '¡Uy! No pude responder 🦜. Intenta de nuevo.';
  } finally {
    input.disabled = false;
    submitBtn.disabled = false;
    input.focus();
  }
});
