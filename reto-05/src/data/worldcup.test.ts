import { champions, editions, teams, scorers, cup2026, totalTitles, byConfederation, teamByCode } from './worldcup';
import type { Edition } from './worldcup';

describe('champions', () => {
  it('titles sum to 22 finals (1930–2022)', () => {
    expect(totalTitles()).toBe(22);
  });
  it('has 8 unique champions', () => {
    expect(champions.length).toBe(8);
  });
  it('splits UEFA 12 / CONMEBOL 10', () => {
    const c = byConfederation();
    expect(c.UEFA).toBe(12);
    expect(c.CONMEBOL).toBe(10);
  });
  it("England's flag is the St George's cross, not the bare black flag", () => {
    const eng = champions.find(c => c.code === 'ENG');
    expect(eng?.flag).toBe('🏴󠁧󠁢󠁥󠁮󠁧󠁿');
    expect(eng?.flag).not.toBe('🏴');
  });
});

describe('editions', () => {
  it('covers 22 editions', () => expect(editions.length).toBe(22));
  it('1954 has the highest goals-per-match (~5.38)', () => {
    const avg = (e: Edition) => e.goals / e.matches;
    const max = editions.reduce((a, b) => (avg(b) > avg(a) ? b : a));
    expect(max.year).toBe(1954);
    expect(avg(max)).toBeCloseTo(5.38, 1);
  });
  it('every edition has positive goals and matches', () => {
    for (const e of editions) { expect(e.goals).toBeGreaterThan(0); expect(e.matches).toBeGreaterThan(0); }
  });
  it('1930 had 13 participating teams', () => {
    const e = editions.find(e => e.year === 1930);
    expect(e?.teams).toBe(13);
  });
  it('2022 had 32 participating teams', () => {
    const e = editions.find(e => e.year === 2022);
    expect(e?.teams).toBe(32);
  });
  it('every edition has a positive team count', () => {
    for (const e of editions) { expect(e.teams).toBeGreaterThan(0); }
  });
});

describe('teams (explorer)', () => {
  it('has 16 curated teams each with required fields', () => {
    expect(teams.length).toBe(16);
    for (const t of teams) {
      expect(t.code).toMatch(/^[A-Z]{3}$/);
      expect(t.name).toBeTruthy();
      expect(t.flag).toBeTruthy();
      expect(typeof t.titles).toBe('number');
      expect(t.bestResult).toBeTruthy();
      expect(t.appearances).toBeGreaterThan(0);
      expect(t.topScorer).toBeTruthy();
      expect(t.topScorerGoals).toBeGreaterThan(0);
    }
  });
  it('includes Colombia and Argentina', () => {
    const codes = teams.map(t => t.code);
    expect(codes).toContain('COL');
    expect(codes).toContain('ARG');
  });
  it('includes England and Mexico', () => {
    const codes = teams.map(t => t.code);
    expect(codes).toContain('ENG');
    expect(codes).toContain('MEX');
  });
});

describe('scorers', () => {
  it('has 8 top scorers', () => {
    expect(scorers.length).toBe(8);
  });
  it('is sorted descending by goals', () => {
    for (let i = 1; i < scorers.length; i++) {
      expect(scorers[i].goals).toBeLessThanOrEqual(scorers[i - 1].goals);
    }
  });
  it('top scorer is Klose with 16 goals', () => {
    expect(scorers[0].name).toBe('Miroslav Klose');
    expect(scorers[0].goals).toBe(16);
  });
});

describe('teamByCode', () => {
  it('returns the matching team for a known code', () => {
    const col = teamByCode('COL');
    expect(col?.code).toBe('COL');
    expect(col?.name).toBe('Colombia');
  });
  it('returns undefined for an unknown code', () => {
    expect(teamByCode('XXX')).toBeUndefined();
  });
});

describe('cup2026', () => {
  it('is the 23rd Cup with 48 teams and 104 matches', () => {
    expect(cup2026.edition).toBe(23);
    expect(cup2026.teams).toBe(48);
    expect(cup2026.matches).toBe(104);
  });
});
