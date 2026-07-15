import { scaleLinear, formatInt, linePath, polarToCartesian, donutSlice } from './chart';

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

describe('polarToCartesian', () => {
  it('12 o\'clock (0deg) is straight up from center', () => {
    const [x, y] = polarToCartesian(0, 0, 10, 0);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(-10, 5);
  });
  it('3 o\'clock (90deg) is to the right of center', () => {
    const [x, y] = polarToCartesian(0, 0, 10, 90);
    expect(x).toBeCloseTo(10, 5);
    expect(y).toBeCloseTo(0, 5);
  });
});

describe('donutSlice', () => {
  it('returns a non-empty SVG path with a moveto and two arc commands', () => {
    const d = donutSlice(50, 50, 40, 20, 0, 90);
    expect(d.length).toBeGreaterThan(0);
    expect(d.startsWith('M')).toBe(true);
    const arcCount = (d.match(/A/g) || []).length;
    expect(arcCount).toBe(2);
  });
});
