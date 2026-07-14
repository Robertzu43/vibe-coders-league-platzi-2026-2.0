-- Tabla de leads capturados por Radar Digital
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  email text not null,
  negocio text,
  tipo_negocio text,
  respuestas jsonb not null,
  puntaje_web int not null,
  puntaje_automatizacion int not null,
  arquetipo text not null
);

-- Seguridad: RLS solo permite INSERT (no lectura/edición) con la publishable key
alter table public.leads enable row level security;

drop policy if exists "allow anon inserts" on public.leads;
create policy "allow anon inserts"
  on public.leads
  for insert
  to anon
  with check (true);
