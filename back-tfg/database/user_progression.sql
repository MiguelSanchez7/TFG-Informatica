-- Sistema de progresion de usuarios.
-- Ejecutar en Supabase SQL Editor si la tabla users aun no tiene estos campos.

alter table public.users
  add column if not exists xp integer not null default 0,
  add column if not exists level integer not null default 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_xp_non_negative'
  ) then
    alter table public.users
      add constraint users_xp_non_negative check (xp >= 0) not valid;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_level_positive'
  ) then
    alter table public.users
      add constraint users_level_positive check (level >= 1) not valid;
  end if;
end $$;

create index if not exists users_level_idx on public.users(level);
create index if not exists users_xp_idx on public.users(xp);

-- Si existe una columna antigua llamada points, se puede migrar asi:
-- update public.users
-- set xp = points
-- where xp = 0 and points is not null;
