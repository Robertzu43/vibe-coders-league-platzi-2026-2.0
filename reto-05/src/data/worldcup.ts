export type Confederation = 'UEFA' | 'CONMEBOL';

export interface Champion { code: string; name: string; flag: string; titles: number; confederation: Confederation; }
export interface Edition { year: number; host: string; matches: number; goals: number; teams: number; }
export interface Team { code: string; name: string; flag: string; titles: number; bestResult: string; appearances: number; topScorer: string; topScorerGoals: number; }
export interface Venue { name: string; city: string; year: number; attendance: number; note: string; }
export interface Scorer { name: string; country: string; flag: string; goals: number; }

// Campeones del Mundo (1930–2022): suma de títulos = 22 finales.
export const champions: Champion[] = [
  { code: 'BRA', name: 'Brasil',     flag: '🇧🇷', titles: 5, confederation: 'CONMEBOL' },
  { code: 'GER', name: 'Alemania',   flag: '🇩🇪', titles: 4, confederation: 'UEFA' },
  { code: 'ITA', name: 'Italia',     flag: '🇮🇹', titles: 4, confederation: 'UEFA' },
  { code: 'ARG', name: 'Argentina',  flag: '🇦🇷', titles: 3, confederation: 'CONMEBOL' },
  { code: 'URU', name: 'Uruguay',    flag: '🇺🇾', titles: 2, confederation: 'CONMEBOL' },
  { code: 'FRA', name: 'Francia',    flag: '🇫🇷', titles: 2, confederation: 'UEFA' },
  { code: 'ENG', name: 'Inglaterra', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',  titles: 1, confederation: 'UEFA' },
  { code: 'ESP', name: 'España',     flag: '🇪🇸', titles: 1, confederation: 'UEFA' },
];

// Goles y partidos por edición (fuente histórica; los tests fijan invariantes).
export const editions: Edition[] = [
  { year: 1930, host: 'Uruguay',        matches: 18, goals: 70,  teams: 13 },
  { year: 1934, host: 'Italia',         matches: 17, goals: 70,  teams: 16 },
  { year: 1938, host: 'Francia',        matches: 18, goals: 84,  teams: 15 },
  { year: 1950, host: 'Brasil',         matches: 22, goals: 88,  teams: 13 },
  { year: 1954, host: 'Suiza',          matches: 26, goals: 140, teams: 16 },
  { year: 1958, host: 'Suecia',         matches: 35, goals: 126, teams: 16 },
  { year: 1962, host: 'Chile',          matches: 32, goals: 89,  teams: 16 },
  { year: 1966, host: 'Inglaterra',     matches: 32, goals: 89,  teams: 16 },
  { year: 1970, host: 'México',         matches: 32, goals: 95,  teams: 16 },
  { year: 1974, host: 'Alemania Occ.',  matches: 38, goals: 97,  teams: 16 },
  { year: 1978, host: 'Argentina',      matches: 38, goals: 102, teams: 16 },
  { year: 1982, host: 'España',         matches: 52, goals: 146, teams: 24 },
  { year: 1986, host: 'México',         matches: 52, goals: 132, teams: 24 },
  { year: 1990, host: 'Italia',         matches: 52, goals: 115, teams: 24 },
  { year: 1994, host: 'Estados Unidos', matches: 52, goals: 141, teams: 24 },
  { year: 1998, host: 'Francia',        matches: 64, goals: 171, teams: 32 },
  { year: 2002, host: 'Corea/Japón',    matches: 64, goals: 161, teams: 32 },
  { year: 2006, host: 'Alemania',       matches: 64, goals: 147, teams: 32 },
  { year: 2010, host: 'Sudáfrica',      matches: 64, goals: 145, teams: 32 },
  { year: 2014, host: 'Brasil',         matches: 64, goals: 171, teams: 32 },
  { year: 2018, host: 'Rusia',          matches: 64, goals: 169, teams: 32 },
  { year: 2022, host: 'Catar',          matches: 64, goals: 172, teams: 32 },
];

// Selecciones destacadas para "Explora tú" (16 curadas).
export const teams: Team[] = [
  { code: 'BRA', name: 'Brasil',        flag: '🇧🇷', titles: 5, bestResult: 'Campeón (×5)',             appearances: 22, topScorer: 'Ronaldo',          topScorerGoals: 15 },
  { code: 'ARG', name: 'Argentina',     flag: '🇦🇷', titles: 3, bestResult: 'Campeón (×3)',             appearances: 18, topScorer: 'Lionel Messi',     topScorerGoals: 13 },
  { code: 'GER', name: 'Alemania',      flag: '🇩🇪', titles: 4, bestResult: 'Campeón (×4)',             appearances: 20, topScorer: 'Miroslav Klose',   topScorerGoals: 16 },
  { code: 'ITA', name: 'Italia',        flag: '🇮🇹', titles: 4, bestResult: 'Campeón (×4)',             appearances: 18, topScorer: 'Paolo Rossi',      topScorerGoals: 9 },
  { code: 'FRA', name: 'Francia',       flag: '🇫🇷', titles: 2, bestResult: 'Campeón (×2)',             appearances: 16, topScorer: 'Just Fontaine',    topScorerGoals: 13 },
  { code: 'URU', name: 'Uruguay',       flag: '🇺🇾', titles: 2, bestResult: 'Campeón (×2)',             appearances: 14, topScorer: 'Óscar Míguez',     topScorerGoals: 8 },
  { code: 'ESP', name: 'España',        flag: '🇪🇸', titles: 1, bestResult: 'Campeón (2010)',           appearances: 16, topScorer: 'David Villa',      topScorerGoals: 9 },
  { code: 'COL', name: 'Colombia',      flag: '🇨🇴', titles: 0, bestResult: 'Cuartos de final (2014)', appearances: 6,  topScorer: 'James Rodríguez',  topScorerGoals: 6 },
  { code: 'ENG', name: 'Inglaterra',    flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', titles: 1, bestResult: 'Campeón (1966)',        appearances: 16, topScorer: 'Gary Lineker',     topScorerGoals: 10 },
  { code: 'MEX', name: 'México',        flag: '🇲🇽', titles: 0, bestResult: 'Cuartos de final (1970, 1986)', appearances: 17, topScorer: 'Luis Hernández', topScorerGoals: 4 },
  { code: 'NED', name: 'Países Bajos',  flag: '🇳🇱', titles: 0, bestResult: 'Subcampeón (×3)',          appearances: 11, topScorer: 'Dennis Bergkamp',  topScorerGoals: 5 },
  { code: 'POR', name: 'Portugal',      flag: '🇵🇹', titles: 0, bestResult: 'Semifinal (1966, 2006)',   appearances: 8,  topScorer: 'Eusébio',          topScorerGoals: 9 },
  { code: 'CRO', name: 'Croacia',       flag: '🇭🇷', titles: 0, bestResult: 'Subcampeón (2018)',        appearances: 6,  topScorer: 'Davor Šuker',      topScorerGoals: 6 },
  { code: 'HUN', name: 'Hungría',       flag: '🇭🇺', titles: 0, bestResult: 'Subcampeón (1938, 1954)',  appearances: 9,  topScorer: 'Sándor Kocsis',    topScorerGoals: 11 },
  { code: 'USA', name: 'Estados Unidos',flag: '🇺🇸', titles: 0, bestResult: 'Tercer lugar (1930)',      appearances: 11, topScorer: 'Landon Donovan',   topScorerGoals: 5 },
  { code: 'BEL', name: 'Bélgica',       flag: '🇧🇪', titles: 0, bestResult: 'Tercer lugar (2018)',      appearances: 14, topScorer: 'Romelu Lukaku',    topScorerGoals: 5 },
];

// Máximos goleadores históricos de la Copa del Mundo (1930–2022), orden descendente.
export const scorers: Scorer[] = [
  { name: 'Miroslav Klose',    country: 'Alemania', flag: '🇩🇪', goals: 16 },
  { name: 'Ronaldo',           country: 'Brasil',   flag: '🇧🇷', goals: 15 },
  { name: 'Gerd Müller',       country: 'Alemania', flag: '🇩🇪', goals: 14 },
  { name: 'Just Fontaine',     country: 'Francia',  flag: '🇫🇷', goals: 13 },
  { name: 'Lionel Messi',      country: 'Argentina',flag: '🇦🇷', goals: 13 },
  { name: 'Pelé',              country: 'Brasil',   flag: '🇧🇷', goals: 12 },
  { name: 'Sándor Kocsis',     country: 'Hungría',  flag: '🇭🇺', goals: 11 },
  { name: 'Jürgen Klinsmann',  country: 'Alemania', flag: '🇩🇪', goals: 11 },
];

// Asistencias históricas notables (para la sección Estadios).
export const venues: Venue[] = [
  { name: 'Maracaná',     city: 'Río de Janeiro', year: 1950, attendance: 173850, note: 'Final Brasil–Uruguay (récord)' },
  { name: 'Azteca',       city: 'Ciudad de México', year: 1986, attendance: 114600, note: 'Final Argentina–Alemania' },
  { name: 'Wembley',      city: 'Londres',        year: 1966, attendance: 96924,  note: 'Final Inglaterra–Alemania' },
  { name: 'Lusail',       city: 'Lusail',         year: 2022, attendance: 88966,  note: 'Final Argentina–Francia' },
  { name: 'Rose Bowl',    city: 'Pasadena',       year: 1994, attendance: 94194,  note: 'Final Brasil–Italia' },
];

export const cup2026 = { edition: 23, teams: 48, matches: 104, hosts: ['Estados Unidos', 'Canadá', 'México'] };

export function totalTitles(): number {
  return champions.reduce((s, c) => s + c.titles, 0);
}
export function byConfederation(): Record<Confederation, number> {
  return champions.reduce((acc, c) => { acc[c.confederation] += c.titles; return acc; },
    { UEFA: 0, CONMEBOL: 0 } as Record<Confederation, number>);
}
export function teamByCode(code: string): Team | undefined {
  return teams.find(t => t.code === code);
}
