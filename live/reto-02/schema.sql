create table if not exists tickets (
  id integer primary key autoincrement,
  titulo text not null,
  detalle text not null,
  prioridad text not null default 'media',
  area text not null default 'general',
  autor text not null default 'equipo',
  estado text not null default 'nuevo',
  creado text not null default (datetime('now')),
  -- ¿la colmena puede resolverlo sola? la IA lo evalúa al entrar, el humano autoriza.
  automatizable integer not null default 0,
  accion text not null default '',
  resuelto text not null default '',
  -- chat de Telegram de quien lo reportó, para avisarle cuando quede listo (0 = sin chat)
  chat integer not null default 0
);
