const DAY_MS = 86_400_000;
const BOGOTA_OFFSET_MS = 5 * 60 * 60 * 1000; // America/Bogotá = UTC-5 (sin DST)

/** Índice de día calendario en Bogotá para un instante dado. */
function bogotaDayIndex(now: Date): number {
  return Math.floor((now.getTime() - BOGOTA_OFFSET_MS) / DAY_MS);
}

/** Día calendario del epoch (2026-07-20) según el reloj de pared. */
const EPOCH_DAY = Math.floor(Date.UTC(2026, 6, 20) / DAY_MS);

/** Número de puzzle: #1 el 2026-07-20 en Bogotá, +1 por cada día. */
export function puzzleNumber(now: Date): number {
  return bogotaDayIndex(now) - EPOCH_DAY + 1;
}

/** Índice determinista dentro de la lista (ya barajada) para el día de `now`. */
export function dailyIndex(now: Date, listLen: number): number {
  const n = puzzleNumber(now) - 1;
  return ((n % listLen) + listLen) % listLen; // seguro ante números negativos
}

/** PRNG determinista mulberry32. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher–Yates determinista: copia barajada con semilla fija (no muta la entrada). */
export function seededShuffle<T>(arr: readonly T[], seed: number): T[] {
  const a = arr.slice();
  const rand = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Índice al azar para práctica (evita `exclude` si se indica). */
export function pickPractice(listLen: number, exclude?: number): number {
  if (listLen <= 1) return 0;
  let i = Math.floor(Math.random() * listLen);
  if (exclude !== undefined) {
    while (i === exclude) i = Math.floor(Math.random() * listLen);
  }
  return i;
}
