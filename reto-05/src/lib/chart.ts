/** Linear scale from [d0,d1] domain to [r0,r1] range. */
export function scaleLinear([d0, d1]: [number, number], [r0, r1]: [number, number]) {
  return (x: number) => (d1 === d0 ? r0 : r0 + ((x - d0) / (d1 - d0)) * (r1 - r0));
}

/** Integer with dot thousands separators (es-CO). */
export function formatInt(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** SVG path "M x,y L x,y ..." from [x,y] points. */
export function linePath(points: Array<[number, number]>): string {
  if (points.length === 0) return '';
  return points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x},${y}`).join(' ');
}
