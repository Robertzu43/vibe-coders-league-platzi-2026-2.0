import { scaleLinear, formatInt, linePath } from './chart';

describe('scaleLinear', () => {
  const s = scaleLinear([0, 100], [0, 200]);
  it('maps domain min to range min', () => expect(s(0)).toBe(0));
  it('maps domain max to range max', () => expect(s(100)).toBe(200));
  it('maps midpoint', () => expect(s(50)).toBe(100));
});

describe('formatInt', () => {
  it('groups thousands with dots (es-CO style)', () => expect(formatInt(173850)).toBe('173.850'));
  it('leaves small numbers', () => expect(formatInt(88)).toBe('88'));
});

describe('linePath', () => {
  it('builds an SVG path from points', () => {
    expect(linePath([[0, 10], [10, 20]])).toBe('M0,10 L10,20');
  });
  it('returns empty string for no points', () => expect(linePath([])).toBe(''));
});
