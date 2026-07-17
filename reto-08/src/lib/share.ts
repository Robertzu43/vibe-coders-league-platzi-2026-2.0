import type { TileState } from './game';

const EMOJI: Record<TileState, string> = { correct: '🟩', present: '🟨', absent: '⬛' };

/** URL pública del juego, se incluye al compartir para generar engagement. */
export const GAME_URL = 'https://platzidle.robertzu43.workers.dev';

export interface ShareInput {
  puzzleNumber: number;
  rows: TileState[][];   // una fila por intento
  won: boolean;
  maxAttempts: number;   // 6
  mode: 'daily' | 'practice';
}

/** Arma el texto para compartir: encabezado + grilla de emojis + guiño a Platzi + link al juego. */
export function buildShareText({ puzzleNumber, rows, won, maxAttempts, mode }: ShareInput): string {
  const score = won ? `${rows.length}/${maxAttempts}` : `X/${maxAttempts}`;
  const head = mode === 'daily'
    ? `Platzidle #${puzzleNumber} ${score}`
    : `Platzidle (práctica) ${score}`;
  const grid = rows.map((r) => r.map((s) => EMOJI[s]).join('')).join('\n');
  return `${head}\n${grid}\n🎓 Aprende tech y juega en Platzidle:\n${GAME_URL}`;
}
