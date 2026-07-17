import { terms, type Term } from '../data/words';
import { evaluateGuess, isWin, type TileState } from '../lib/game';
import { puzzleNumber, dailyIndex, seededShuffle, pickPractice } from '../lib/daily';
import { buildShareText } from '../lib/share';

// Semilla fija: NO cambiar. Define el orden del diario. Nota: Fisher–Yates depende
// del largo del array, así que AGREGAR términos a words.ts rebaraja todo y cambiaría
// los puzzles pasados. Para v1 lo aceptamos (añade términos antes de publicar).
const SHUFFLE_SEED = 20260720;
const MAX_ATTEMPTS = 6;
const ORDER: Term[] = seededShuffle(terms, SHUFFLE_SEED);

type Mode = 'daily' | 'practice';
interface Stats { played: number; wins: number; currentStreak: number; maxStreak: number; distribution: number[]; }

const STATS_KEY = 'platzidle:stats';
const dailyKey = (n: number) => `platzidle:daily:${n}`;

// ---- persistencia (degrada a memoria si localStorage falla) ----
function readJSON<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) as T : fallback; }
  catch { return fallback; }
}
function writeJSON(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignora */ }
}
function loadStats(): Stats {
  return readJSON<Stats>(STATS_KEY, { played: 0, wins: 0, currentStreak: 0, maxStreak: 0, distribution: [0, 0, 0, 0, 0, 0] });
}
function saveStats(s: Stats): void { writeJSON(STATS_KEY, s); }

// ---- estado de juego ----
interface State { mode: Mode; term: Term; puzzleNo: number; guesses: string[]; current: string; status: 'playing' | 'won' | 'lost'; }
let state: State;

const $ = <T extends HTMLElement = HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

function startDaily(): State {
  const now = new Date();
  const puzzleNo = puzzleNumber(now);
  const term = ORDER[dailyIndex(now, ORDER.length)];
  const saved = readJSON<{ guesses: string[]; status: State['status'] }>(dailyKey(puzzleNo), { guesses: [], status: 'playing' });
  return { mode: 'daily', term, puzzleNo, guesses: saved.guesses, current: '', status: saved.status };
}
function startPractice(prevIndex?: number): State {
  const idx = pickPractice(ORDER.length, prevIndex);
  return { mode: 'practice', term: ORDER[idx], puzzleNo: 0, guesses: [], current: '', status: 'playing' };
}

// ---- render ----
function renderCategory(): void { $('#category-chip').textContent = `Categoría: ${state.term.category}`; $('#mode-label').textContent = state.mode === 'daily' ? 'Reto del día' : 'Práctica'; }

function renderBoard(): void {
  const board = $('#board');
  const len = state.term.word.length;
  board.style.setProperty('--cols', String(len));
  board.innerHTML = '';
  for (let r = 0; r < MAX_ATTEMPTS; r++) {
    const row = document.createElement('div');
    row.className = 'board-row';
    const guess = state.guesses[r];
    const isCurrentRow = r === state.guesses.length && state.status === 'playing';
    for (let c = 0; c < len; c++) {
      const tile = document.createElement('div');
      tile.className = 'tile';
      if (guess) {
        const states = evaluateGuess(state.term.word, guess);
        tile.textContent = guess[c];
        tile.classList.add(states[c], 'revealed');
      } else if (isCurrentRow && c < state.current.length) {
        tile.textContent = state.current[c];
        tile.classList.add('filled');
      }
      row.appendChild(tile);
    }
    board.appendChild(row);
  }
}

function renderKeyboard(): void {
  const best: Record<string, TileState> = {};
  const rank: Record<TileState, number> = { absent: 0, present: 1, correct: 2 };
  for (const g of state.guesses) {
    const st = evaluateGuess(state.term.word, g);
    for (let i = 0; i < g.length; i++) {
      const k = g[i];
      if (!(k in best) || rank[st[i]] > rank[best[k]]) best[k] = st[i];
    }
  }
  document.querySelectorAll<HTMLButtonElement>('.key').forEach((btn) => {
    const k = btn.dataset.key!;
    btn.classList.remove('correct', 'present', 'absent');
    if (best[k]) btn.classList.add(best[k]);
  });
}

let toastTimer: number | undefined;
function toast(msg: string): void {
  const el = $('#toast');
  el.textContent = msg; el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => { el.hidden = true; }, 1400);
}

// ---- input ----
function onKey(key: string): void {
  if (state.status !== 'playing') return;
  const len = state.term.word.length;
  if (key === 'ENTER') return submit();
  if (key === 'BACK') { state.current = state.current.slice(0, -1); return renderBoard(); }
  if (/^[A-Z]$/.test(key) && state.current.length < len) { state.current += key; renderBoard(); }
}

function submit(): void {
  const len = state.term.word.length;
  if (state.current.length !== len) {
    toast('Faltan letras');
    const rowEl = document.querySelectorAll('.board-row')[state.guesses.length];
    rowEl?.classList.add('shake');
    setTimeout(() => rowEl?.classList.remove('shake'), 300);
    return;
  }
  state.guesses.push(state.current);
  const won = isWin(evaluateGuess(state.term.word, state.current));
  state.current = '';
  if (won) state.status = 'won';
  else if (state.guesses.length >= MAX_ATTEMPTS) state.status = 'lost';
  if (state.mode === 'daily') writeJSON(dailyKey(state.puzzleNo), { guesses: state.guesses, status: state.status });
  renderBoard(); renderKeyboard();
  if (state.status !== 'playing') endGame(won, true);
}

// ---- fin de partida ----
// `record` es true solo en la transición real a fin de partida (desde submit);
// false al restaurar una partida diaria ya terminada, para no recontar estadísticas.
function endGame(won: boolean, record: boolean): void {
  if (record && state.mode === 'daily') recordStats(won);
  const stats = loadStats();
  $('#btn-share').hidden = false;
  $('#btn-again').hidden = false;
  $('#result-outcome').textContent = won ? '¡Correcto! 🎉' : 'Fin del juego';
  $('#result-title').textContent = state.term.word;
  $('#result-cat').textContent = `Categoría: ${state.term.category}`;
  $('#result-def').textContent = state.term.definition;
  const link = $<HTMLAnchorElement>('#result-course');
  link.textContent = `🎓 Aprende más: ${state.term.course.name}`;
  link.href = state.term.course.url;
  $('#st-played').textContent = String(stats.played);
  $('#st-winrate').textContent = stats.played ? String(Math.round((stats.wins / stats.played) * 100)) : '0';
  $('#st-streak').textContent = String(stats.currentStreak);
  $('#st-max').textContent = String(stats.maxStreak);
  renderDistribution(stats, won && state.mode === 'daily' ? state.guesses.length : -1);
  openModal('#result-modal');
}

/** Histograma de intentos (1–6); resalta la fila del resultado actual. */
function renderDistribution(s: Stats, highlight: number): void {
  const max = Math.max(1, ...s.distribution);
  $('#dist').innerHTML = s.distribution.map((count, i) => {
    const pct = Math.max(Math.round((count / max) * 100), 8);
    const hot = i + 1 === highlight ? ' hot' : '';
    return `<div class="dist-row"><span class="dist-n">${i + 1}</span>` +
           `<div class="dist-bar${hot}" style="width:${pct}%">${count}</div></div>`;
  }).join('');
}

function recordStats(won: boolean): void {
  const s = loadStats();
  s.played += 1;
  if (won) { s.wins += 1; s.currentStreak += 1; s.maxStreak = Math.max(s.maxStreak, s.currentStreak); s.distribution[state.guesses.length - 1] += 1; }
  else { s.currentStreak = 0; }
  saveStats(s);
}

// ---- modales ----
function openModal(sel: string): void { $(sel).hidden = false; }
function closeModal(sel: string): void { $(sel).hidden = true; }

// ---- compartir ----
async function share(): Promise<void> {
  const rows = state.guesses.map((g) => evaluateGuess(state.term.word, g));
  const text = buildShareText({ puzzleNumber: state.puzzleNo, rows, won: state.status === 'won', maxAttempts: MAX_ATTEMPTS, mode: state.mode });
  try {
    await navigator.clipboard.writeText(text);
    toast('¡Copiado!');
  } catch {
    const fb = $('#share-fallback'); fb.textContent = text; fb.hidden = false;
  }
}

// ---- init ----
export function initGame(): void {
  state = startDaily();
  renderCategory(); renderBoard(); renderKeyboard();
  if (state.status !== 'playing') endGame(state.status === 'won', false);

  document.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key === 'Enter' ? 'ENTER' : e.key === 'Backspace' ? 'BACK' : e.key.toUpperCase();
    if (k === 'ENTER' || k === 'BACK' || /^[A-Z]$/.test(k)) { e.preventDefault(); onKey(k); }
  });
  document.querySelectorAll<HTMLButtonElement>('.key').forEach((btn) =>
    btn.addEventListener('click', () => onKey(btn.dataset.key!)));

  $('#btn-help').addEventListener('click', () => openModal('#help-modal'));
  $('#help-close').addEventListener('click', () => closeModal('#help-modal'));
  $('#btn-stats').addEventListener('click', () => endGamePeek());
  $('#result-close').addEventListener('click', () => closeModal('#result-modal'));
  $('#btn-share').addEventListener('click', () => void share());
  $('#btn-again').addEventListener('click', () => {
    const prev = state.mode === 'practice' ? ORDER.indexOf(state.term) : undefined;
    state = startPractice(prev);
    closeModal('#result-modal');
    $('#share-fallback').hidden = true;
    renderCategory(); renderBoard(); renderKeyboard();
  });
}

/** Ver estadísticas sin terminar la partida (reusa el modal en modo lectura). */
function endGamePeek(): void {
  const stats = loadStats();
  $('#result-outcome').textContent = 'Tus estadísticas';
  $('#result-title').textContent = 'Platzidle';
  $('#result-cat').textContent = '';
  $('#result-def').textContent = '';
  const link = $<HTMLAnchorElement>('#result-course'); link.textContent = ''; link.removeAttribute('href');
  $('#btn-share').hidden = true;   // en modo lectura no se comparte una partida en curso
  $('#btn-again').hidden = true;
  $('#st-played').textContent = String(stats.played);
  $('#st-winrate').textContent = stats.played ? String(Math.round((stats.wins / stats.played) * 100)) : '0';
  $('#st-streak').textContent = String(stats.currentStreak);
  $('#st-max').textContent = String(stats.maxStreak);
  renderDistribution(stats, -1);
  openModal('#result-modal');
}
