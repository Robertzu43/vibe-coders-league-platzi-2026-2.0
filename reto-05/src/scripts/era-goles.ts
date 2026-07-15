/** Show a tooltip with the edition detail on hover/focus of each data point. */
export function initEraGoles(): void {
  const tip = document.getElementById('goles-tip');
  const dots = Array.from(document.querySelectorAll<SVGElement>('#goles-svg [data-year]'));
  if (!tip) return;
  const show = (el: SVGElement) => {
    const { year, goals, matches, avg } = (el as any).dataset;
    tip.innerHTML = `<strong>${year}</strong> · ${goals} goles / ${matches} partidos · <strong>${avg}</strong> por partido`;
    tip.classList.add('on');
    dots.forEach((d) => d.classList.toggle('active', d === el));
  };
  const hide = () => { tip.classList.remove('on'); dots.forEach((d) => d.classList.remove('active')); };
  dots.forEach((el) => {
    el.addEventListener('mouseenter', () => show(el));
    el.addEventListener('focus', () => show(el));
    el.addEventListener('mouseleave', hide);
    el.addEventListener('blur', hide);
  });
}
