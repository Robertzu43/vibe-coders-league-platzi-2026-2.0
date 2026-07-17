import { evaluateGuess, isWin } from './game';

describe('evaluateGuess', () => {
  it('marks every tile correct on an exact match', () => {
    expect(evaluateGuess('REACT', 'REACT')).toEqual(
      ['correct', 'correct', 'correct', 'correct', 'correct']);
  });

  it('marks a letter present when it exists in another position', () => {
    // answer LINUX, guess NXILU: all letters exist, none in place
    expect(evaluateGuess('LINUX', 'NXILU')).toEqual(
      ['present', 'present', 'present', 'present', 'present']);
  });

  it('marks absent letters', () => {
    // answer DATOS, guess PYQWK: none present
    expect(evaluateGuess('DATOS', 'PYQWK')).toEqual(
      ['absent', 'absent', 'absent', 'absent', 'absent']);
  });

  it('handles a duplicate in the guess against a single in the answer', () => {
    // answer LINUX (one L), guess LLAMA: first L correct, second L absent
    expect(evaluateGuess('LINUX', 'LLAMA')).toEqual(
      ['correct', 'absent', 'absent', 'absent', 'absent']);
  });

  it('handles duplicates in the answer (ARRAY vs RADAR)', () => {
    // answer A R R A Y, guess R A D A R
    expect(evaluateGuess('ARRAY', 'RADAR')).toEqual(
      ['present', 'present', 'absent', 'correct', 'present']);
  });
});

describe('isWin', () => {
  it('is true when all tiles are correct', () => {
    expect(isWin(['correct', 'correct', 'correct'])).toBe(true);
  });
  it('is false when any tile is not correct', () => {
    expect(isWin(['correct', 'present', 'correct'])).toBe(false);
  });
  it('is false for an empty array', () => {
    expect(isWin([])).toBe(false);
  });
});
