interface Team { code: string; name: string; flag: string; titles: number; bestResult: string; appearances: number; topScorer: string; topScorerGoals: number; }

/** On team change, recompute the card and record the selection on #explora. */
export function initExplora(): void {
  const raw = document.getElementById('exp-data')?.textContent;
  const select = document.getElementById('exp-select') as HTMLSelectElement | null;
  const section = document.getElementById('explora');
  if (!raw || !select || !section) return;
  const teams: Team[] = JSON.parse(raw);
  const set = (id: string, v: string) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  const render = (code: string) => {
    const t = teams.find((x) => x.code === code); if (!t) return;
    set('exp-name', `${t.flag} ${t.name}`);
    set('exp-titles', String(t.titles));
    set('exp-best', t.bestResult);
    set('exp-apps', String(t.appearances));
    set('exp-scorer', `${t.topScorer} (${t.topScorerGoals})`);
    section.dataset.seleccion = code;
  };
  select.addEventListener('change', () => render(select.value));
}
