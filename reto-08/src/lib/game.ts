export type TileState = 'correct' | 'present' | 'absent';

/**
 * Evalúa un intento contra la respuesta con el algoritmo por conteo:
 *   1) marca 'correct' las letras en su posición exacta y las descuenta del pool,
 *   2) marca 'present' las que aún quedan en el pool (por ocurrencia); el resto 'absent'.
 * `answer` y `guess` deben tener el mismo largo, en mayúsculas A–Z.
 */
export function evaluateGuess(answer: string, guess: string): TileState[] {
  const n = answer.length;
  const states: TileState[] = new Array(n).fill('absent');
  const pool: Record<string, number> = {};
  for (const ch of answer) pool[ch] = (pool[ch] ?? 0) + 1;

  // Paso 1: verdes (posición exacta).
  for (let i = 0; i < n; i++) {
    if (guess[i] === answer[i]) {
      states[i] = 'correct';
      pool[guess[i]]--;
    }
  }
  // Paso 2: amarillos (existe pero en otra posición, mientras quede en el pool).
  for (let i = 0; i < n; i++) {
    if (states[i] === 'correct') continue;
    const ch = guess[i];
    if ((pool[ch] ?? 0) > 0) {
      states[i] = 'present';
      pool[ch]--;
    }
  }
  return states;
}

/** ¿El intento acertó por completo? */
export function isWin(states: TileState[]): boolean {
  return states.length > 0 && states.every((s) => s === 'correct');
}
