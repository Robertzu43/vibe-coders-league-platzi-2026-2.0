import { terms, type Term } from './words';

describe('terms data integrity', () => {
  it('has a healthy number of terms', () => {
    expect(terms.length).toBeGreaterThanOrEqual(25);
  });

  it('every word is UPPERCASE A–Z only (no Ñ/accents/spaces)', () => {
    for (const t of terms) expect(t.word).toMatch(/^[A-Z]+$/);
  });

  it('every term has non-empty definition, category and course', () => {
    for (const t of terms) {
      expect(t.definition.trim().length).toBeGreaterThan(0);
      expect(t.category.trim().length).toBeGreaterThan(0);
      expect(t.course.name.trim().length).toBeGreaterThan(0);
      expect(t.course.url).toMatch(/^https:\/\/platzi\.com\//);
    }
  });

  it('has no duplicate words', () => {
    const seen = new Set<string>();
    for (const t of terms) {
      expect(seen.has(t.word)).toBe(false);
      seen.add(t.word);
    }
  });

  it('words are between 3 and 10 letters (board stays reasonable)', () => {
    for (const t of terms) {
      expect(t.word.length).toBeGreaterThanOrEqual(3);
      expect(t.word.length).toBeLessThanOrEqual(10);
    }
  });
});
