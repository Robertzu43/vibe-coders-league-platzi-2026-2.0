/** Toggle the bars container between per-country and per-confederation coloring. */
export function initDinastias(): void {
  const bars = document.getElementById('din-bars');
  const legend = document.getElementById('din-legend');
  const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.toggle .btn'));
  if (!bars) return;
  buttons.forEach((btn) => btn.addEventListener('click', () => {
    const mode = btn.dataset.mode || 'pais';
    bars.dataset.mode = mode;
    if (legend) legend.hidden = mode !== 'conf';
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
  }));
}
