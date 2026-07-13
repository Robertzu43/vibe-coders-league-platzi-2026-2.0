-- Tabla de pre-órdenes de Altura
create table if not exists public.preorders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  email text not null,
  ciudad text not null,
  cantidad int not null default 1 check (cantidad between 1 and 5),
  molido text not null check (molido in ('grano_entero','molido'))
);

-- Seguridad: RLS solo permite INSERT (no lectura/edición) con la publishable key
alter table public.preorders enable row level security;

drop policy if exists "allow anon inserts" on public.preorders;
create policy "allow anon inserts"
  on public.preorders
  for insert
  to anon
  with check (true);
