interface Team { code: string; name: string; flag: string; titles: number; appearances: number; topScorer: string; topScorerGoals: number; }

/** Build the shareable card from the current explorer selection (default ARG). */
export function initComparte(): void {
  const raw = document.getElementById('share-data')?.textContent;
  const btn = document.getElementById('share-btn');
  const card = document.getElementById('share-card');
  if (!raw || !btn || !card) return;
  const teams: Team[] = JSON.parse(raw);
  btn.addEventListener('click', () => {
    const code = document.getElementById('explora')?.dataset.seleccion || 'ARG';
    const t = teams.find((x) => x.code === code) || teams[0];
    card.innerHTML = `<div class="sticker"><span class="big">${t.flag}</span>
      <strong>${t.name}</strong><span>${t.titles} títulos · ${t.appearances} Mundiales</span>
      <span>⚽ ${t.topScorer} (${t.topScorerGoals})</span></div>`;
    card.classList.add('on');
    card.setAttribute('tabindex', '-1'); (card as HTMLElement).focus();
  });
}
