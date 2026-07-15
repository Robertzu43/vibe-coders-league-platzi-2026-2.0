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

/** [x,y] on a circle of radius r centered at (cx,cy), angle in degrees clockwise from 12 o'clock. */
export function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): [number, number] {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
}

/** SVG path 'd' for a donut segment (annular sector) from startDeg to endDeg. */
export function donutSlice(cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number): string {
  const largeArc = endDeg - startDeg > 180 ? 1 : 0;
  const [ox1, oy1] = polarToCartesian(cx, cy, rOuter, startDeg);
  const [ox2, oy2] = polarToCartesian(cx, cy, rOuter, endDeg);
  const [ix2, iy2] = polarToCartesian(cx, cy, rInner, endDeg);
  const [ix1, iy1] = polarToCartesian(cx, cy, rInner, startDeg);
  return [
    `M${ox1},${oy1}`,
    `A${rOuter},${rOuter} 0 ${largeArc} 1 ${ox2},${oy2}`,
    `L${ix2},${iy2}`,
    `A${rInner},${rInner} 0 ${largeArc} 0 ${ix1},${iy1}`,
    'Z',
  ].join(' ');
}
