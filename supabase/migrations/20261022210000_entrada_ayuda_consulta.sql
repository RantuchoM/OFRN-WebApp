-- Cola de consultas del formulario de ayuda de Entradas (staff terceros).

create table if not exists public.entrada_ayuda_consulta (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nombre text not null,
  email text not null,
  telefono text,
  cantidad integer,
  concierto_id bigint references public.entrada_concierto (id) on delete set null,
  funcion_label text,
  comentarios text,
  estado text not null default 'pendiente'
    check (estado = any (array['pendiente'::text, 'resuelta'::text, 'descartada'::text])),
  reserva_id bigint references public.entrada_reserva (id) on delete set null,
  resolved_at timestamptz,
  resolved_by uuid,
  constraint entrada_ayuda_consulta_cantidad_chk
    check (cantidad is null or (cantidad >= 1 and cantidad <= 4))
);

create index if not exists entrada_ayuda_consulta_estado_created_idx
  on public.entrada_ayuda_consulta (estado, created_at desc);

create index if not exists entrada_ayuda_consulta_email_idx
  on public.entrada_ayuda_consulta (email);

comment on table public.entrada_ayuda_consulta is
  'Consultas del formulario público ¿Necesitás ayuda?; staff las abre desde Terceros.';

alter table public.entrada_ayuda_consulta enable row level security;

drop policy if exists "entrada ayuda consulta select terceros" on public.entrada_ayuda_consulta;
create policy "entrada ayuda consulta select terceros"
  on public.entrada_ayuda_consulta
  for select
  to authenticated
  using (public.entrada_can_terceros(auth.uid()));

drop policy if exists "entrada ayuda consulta update terceros" on public.entrada_ayuda_consulta;
create policy "entrada ayuda consulta update terceros"
  on public.entrada_ayuda_consulta
  for update
  to authenticated
  using (public.entrada_can_terceros(auth.uid()))
  with check (public.entrada_can_terceros(auth.uid()));

-- Insert solo vía service role (Edge Function); denegar a authenticated/anon.
drop policy if exists "entrada ayuda consulta deny insert client" on public.entrada_ayuda_consulta;
create policy "entrada ayuda consulta deny insert client"
  on public.entrada_ayuda_consulta
  for insert
  to authenticated, anon
  with check (false);

create or replace function public.entrada_ayuda_listar(p_estado text default 'pendiente')
returns setof public.entrada_ayuda_consulta
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  if p_estado is null or trim(p_estado) = '' or lower(trim(p_estado)) = 'todas' then
    return query
      select *
      from public.entrada_ayuda_consulta
      order by created_at desc
      limit 200;
  else
    return query
      select *
      from public.entrada_ayuda_consulta
      where estado = lower(trim(p_estado))
      order by created_at desc
      limit 200;
  end if;
end;
$$;

comment on function public.entrada_ayuda_listar(text) is
  'Lista consultas de ayuda (terceros). p_estado: pendiente|resuelta|descartada|todas.';

grant execute on function public.entrada_ayuda_listar(text) to authenticated;

create or replace function public.entrada_ayuda_get(p_id uuid)
returns public.entrada_ayuda_consulta
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_ayuda_consulta;
begin
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  select * into v_row from public.entrada_ayuda_consulta where id = p_id;
  if v_row.id is null then
    raise exception 'Consulta no encontrada';
  end if;
  return v_row;
end;
$$;

grant execute on function public.entrada_ayuda_get(uuid) to authenticated;

create or replace function public.entrada_ayuda_marcar_resuelta(
  p_id uuid,
  p_reserva_id bigint default null
)
returns public.entrada_ayuda_consulta
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_ayuda_consulta;
begin
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  update public.entrada_ayuda_consulta
  set
    estado = 'resuelta',
    reserva_id = coalesce(p_reserva_id, reserva_id),
    resolved_at = now(),
    resolved_by = auth.uid()
  where id = p_id
  returning * into v_row;
  if v_row.id is null then
    raise exception 'Consulta no encontrada';
  end if;
  return v_row;
end;
$$;

grant execute on function public.entrada_ayuda_marcar_resuelta(uuid, bigint) to authenticated;

create or replace function public.entrada_ayuda_descartar(p_id uuid)
returns public.entrada_ayuda_consulta
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_ayuda_consulta;
begin
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  update public.entrada_ayuda_consulta
  set
    estado = 'descartada',
    resolved_at = now(),
    resolved_by = auth.uid()
  where id = p_id
  returning * into v_row;
  if v_row.id is null then
    raise exception 'Consulta no encontrada';
  end if;
  return v_row;
end;
$$;

grant execute on function public.entrada_ayuda_descartar(uuid) to authenticated;
