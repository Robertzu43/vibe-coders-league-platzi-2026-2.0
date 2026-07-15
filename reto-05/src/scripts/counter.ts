/** Animate every [data-count] element from 0 to its target when it scrolls into view. */
export function initCounters(): void {
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-count]'));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const run = (el: HTMLElement) => {
    const target = Number(el.dataset.count || '0');
    if (reduce) { el.textContent = String(target); return; }
    const start = performance.now(), dur = 900;
    const tick = (t: number) => {
      const p = Math.min((t - start) / dur, 1);
      el.textContent = String(Math.round(p * target));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { run(e.target as HTMLElement); io.unobserve(e.target); }
  }, { threshold: 0.6 });
  els.forEach((el) => io.observe(el));
}
