create table if not exists tickets (
  id integer primary key autoincrement,
  titulo text not null,
  detalle text not null,
  prioridad text not null default 'media',
  area text not null default 'general',
  autor text not null default 'equipo',
  estado text not null default 'nuevo',
  creado text not null default (datetime('now'))
);
