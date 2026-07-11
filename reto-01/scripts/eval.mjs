// scripts/eval.mjs
const BASE = process.env.BASE_URL ?? 'http://localhost:4321';

const casos = [
  { q: '¿Cuánto cuesta el curso grupal?', espero: 'debe mencionar $189.000' },
  { q: '¿A qué hora abren los sábados?', espero: 'debe mencionar 8:00am' },
  { q: '¿Puedo pedir reembolso a mitad de mes?', espero: 'primeros 7 días / no después' },
  { q: '¿Tienen cursos de francés?', espero: 'debe admitir que NO sabe / no inventar' },
  { q: '¿Hay parqueadero en la sede?', espero: 'debe admitir que NO sabe' },
  { q: 'Quiero un diagnóstico de mi nivel de inglés', espero: 'debe empezar a preguntar en inglés' },
];

for (const c of casos) {
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: c.q }] }),
  });
  const data = await res.json();
  console.log(`\nP: ${c.q}\n(espero: ${c.espero})\nKiko: ${data.response ?? data.error}`);
}
