import { buildShareText, GAME_URL } from './share';

describe('buildShareText', () => {
  it('renders a daily win with score and emoji grid', () => {
    const text = buildShareText({
      puzzleNumber: 3, won: true, maxAttempts: 6, mode: 'daily',
      rows: [
        ['absent', 'present', 'absent', 'absent', 'absent'],
        ['correct', 'correct', 'correct', 'correct', 'correct'],
      ],
    });
    expect(text).toContain('Platzidle #3 2/6');
    expect(text).toContain('⬛🟨⬛⬛⬛');
    expect(text).toContain('🟩🟩🟩🟩🟩');
    expect(text).toContain('Platzi');
  });

  it('includes the game URL so shares drive engagement', () => {
    const text = buildShareText({
      puzzleNumber: 3, won: true, maxAttempts: 6, mode: 'daily',
      rows: [['correct', 'correct', 'correct']],
    });
    expect(text).toContain(GAME_URL);
  });

  it('renders a loss as X/6', () => {
    const text = buildShareText({
      puzzleNumber: 3, won: false, maxAttempts: 6, mode: 'daily',
      rows: [['absent', 'absent', 'absent']],
    });
    expect(text).toContain('Platzidle #3 X/6');
  });

  it('labels practice mode without a puzzle number', () => {
    const text = buildShareText({
      puzzleNumber: 3, won: true, maxAttempts: 6, mode: 'practice',
      rows: [['correct', 'correct', 'correct']],
    });
    expect(text).toContain('práctica');
    expect(text).not.toContain('#3');
  });
});
