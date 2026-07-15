/** Highlight the clicked/focused venue bar and surface its note. */
export function initEstadios(): void {
  const note = document.getElementById('estadios-note');
  const bars = Array.from(document.querySelectorAll<HTMLElement>('#estadios-bars [data-note]'));
  const pick = (el: HTMLElement) => {
    bars.forEach((b) => b.classList.toggle('active', b === el));
    if (note) note.textContent = el.dataset.note || '';
  };
  bars.forEach((el) => {
    el.tabIndex = 0;
    el.addEventListener('click', () => pick(el));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(el); } });
  });
}
