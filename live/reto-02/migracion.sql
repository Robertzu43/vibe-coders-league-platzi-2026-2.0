alter table tickets add column automatizable integer not null default 0;
alter table tickets add column accion text not null default '';
alter table tickets add column resuelto text not null default '';
