-- Contador compartido en recepción: personas que ingresan sin entrada/reserva (cuenta manual).
-- Sincronización en tiempo real vía supabase_realtime + postgres_changes.

create table if not exists public.entrada_concierto_sin_entrada (
  entrada_concierto_id bigint primary key references public.entrada_concierto (id) on delete cascade,
  cantidad integer not null default 0 check (cantidad >= 0),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_entrada_concierto_sin_entrada_updated_at on public.entrada_concierto_sin_entrada;
create trigger trg_entrada_concierto_sin_entrada_updated_at
before update on public.entrada_concierto_sin_entrada
for each row execute function public.entrada_touch_updated_at();

alter table public.entrada_concierto_sin_entrada enable row level security;

drop policy if exists "entrada sin entrada select recepcion" on public.entrada_concierto_sin_entrada;
create policy "entrada sin entrada select recepcion"
on public.entrada_concierto_sin_entrada
for select
to authenticated
using (public.entrada_is_recepcion(auth.uid()));

-- Sin insert/update directo: solo RPC security definer.

create or replace function public.entrada_sin_entrada_delta(p_concierto_id bigint, p_delta integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cantidad integer;
begin
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'no autorizado';
  end if;
  if p_delta is null or p_delta not in (-1, 1) then
    raise exception 'delta invalido';
  end if;

  insert into public.entrada_concierto_sin_entrada (entrada_concierto_id, cantidad)
  values (p_concierto_id, greatest(0, p_delta))
  on conflict (entrada_concierto_id) do update
  set cantidad = greatest(0, entrada_concierto_sin_entrada.cantidad + p_delta),
      updated_at = now()
  returning cantidad into v_cantidad;

  return v_cantidad;
end;
$$;

revoke all on function public.entrada_sin_entrada_delta(bigint, integer) from public;
grant execute on function public.entrada_sin_entrada_delta(bigint, integer) to authenticated;

grant select on public.entrada_concierto_sin_entrada to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'entrada_concierto_sin_entrada'
  ) then
    alter publication supabase_realtime add table public.entrada_concierto_sin_entrada;
  end if;
exception
  when undefined_object then
    null;
end
$$;
