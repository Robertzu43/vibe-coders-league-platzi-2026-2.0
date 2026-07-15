-- reto-06 · Pulso — acceso de solo-lectura a conteos SIN exponer la service_role.
-- Ejecutar en el SQL Editor de Supabase (el proyecto compartido de reto-02/03).
-- Después: Settings → API → Exposed schemas → agrega `pulso` para que PostgREST lo sirva.
-- Requiere que public.leads y public.preorders tengan columna created_at (timestamptz).

create schema if not exists pulso;
grant usage on schema pulso to anon;

create or replace function pulso.weekly_counts(win_start timestamptz, win_end timestamptz)
returns table (leads bigint, preorders bigint)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from public.leads     where created_at >= win_start and created_at < win_end) as leads,
    (select count(*) from public.preorders where created_at >= win_start and created_at < win_end) as preorders;
$$;

grant execute on function pulso.weekly_counts(timestamptz, timestamptz) to anon;
