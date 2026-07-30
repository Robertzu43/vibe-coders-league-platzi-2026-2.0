-- Migración 1: la colmena evalúa qué puede resolver sola.
alter table tickets add column automatizable integer not null default 0;
alter table tickets add column accion text not null default '';
alter table tickets add column resuelto text not null default '';

-- Migración 2: a quién le avisamos cuando queda listo.
alter table tickets add column chat integer not null default 0;
