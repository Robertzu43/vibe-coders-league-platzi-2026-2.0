import { terms } from './words';

// Nombres de archivo realmente empaquetados en public/courses (resuelto por Vite en build time).
const bundledCourseImages = new Set(
  Object.keys(import.meta.glob('../../public/courses/*')).map((p) => p.split('/').pop()),
);

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

  it('every term has a bundled share image that exists in /public', () => {
    for (const t of terms) {
      expect(t.share).toMatch(/^\/courses\/.+\.(jpg|png|webp)$/);
      const file = t.share.split('/').pop();
      expect(bundledCourseImages.has(file), `falta la imagen ${t.share} de ${t.word}`).toBe(true);
    }
  });
});
