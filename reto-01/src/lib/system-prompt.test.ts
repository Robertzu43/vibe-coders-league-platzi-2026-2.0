import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, MODEL } from './system-prompt';

describe('buildSystemPrompt', () => {
  const prompt = buildSystemPrompt();

  it('incluye datos clave de la base de conocimiento', () => {
    expect(prompt).toContain('$189.000');           // precio curso grupal
    expect(prompt).toContain('6:00am');              // horario
    expect(prompt).toContain('primeros 7 días');     // política de reembolso
    expect(prompt).toContain('+57 300 123 4567');    // contacto
  });

  it('define el tono/persona de Kiko', () => {
    expect(prompt).toMatch(/Kiko/);
    expect(prompt.toLowerCase()).toMatch(/loro|divertid/);
  });

  it('incluye la regla anti-invención', () => {
    expect(prompt.toLowerCase()).toMatch(/no inventes|no sabes|no está en/);
  });

  it('describe el modo diagnóstico', () => {
    expect(prompt.toLowerCase()).toMatch(/diagn[oó]stico/);
    expect(prompt).toMatch(/A1|C2|MCER/);
  });
});

describe('MODEL', () => {
  it('apunta a un modelo de Workers AI', () => {
    expect(MODEL).toContain('@cf/');
  });
});
