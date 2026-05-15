-- Borrado admin de concierto / programa solo si no hay reservas activas ni entradas con ingreso registrado.
-- Las reservas canceladas y los intentos de ingreso en log se eliminan en cascada lógica antes del concierto.

create or replace function public.entrada_admin_delete_concierto(p_concierto_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_concierto_id is null or p_concierto_id <= 0 then
    raise exception 'Concierto inválido';
  end if;

  if not exists (select 1 from public.entrada_concierto c where c.id = p_concierto_id) then
    raise exception 'Concierto no encontrado';
  end if;

  if exists (
    select 1
    from public.entrada_reserva r
    where r.concierto_id = p_concierto_id
      and r.estado = 'activa'
  ) then
    raise exception 'No se puede eliminar: hay reservas activas. Cancelalas antes o contactá soporte.';
  end if;

  if exists (
    select 1
    from public.entrada_reserva_entrada e
    inner join public.entrada_reserva r on r.id = e.reserva_id
    where e.concierto_id = p_concierto_id
      and e.estado_ingreso = 'ingresada'
  ) then
    raise exception 'No se puede eliminar: hay entradas con ingreso a sala registrado.';
  end if;

  delete from public.entrada_ingreso_evento
  where concierto_id = p_concierto_id
     or reserva_id in (select r.id from public.entrada_reserva r where r.concierto_id = p_concierto_id)
     or reserva_entrada_id in (
       select e.id
       from public.entrada_reserva_entrada e
       inner join public.entrada_reserva r on r.id = e.reserva_id
       where r.concierto_id = p_concierto_id
     );

  delete from public.entrada_reserva
  where concierto_id = p_concierto_id;

  delete from public.entrada_concierto
  where id = p_concierto_id;
end;
$$;

create or replace function public.entrada_admin_delete_programa(p_programa_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_programa_id is null or p_programa_id <= 0 then
    raise exception 'Programa inválido';
  end if;

  if not exists (select 1 from public.entrada_programa p where p.id = p_programa_id) then
    raise exception 'Programa no encontrado';
  end if;

  if exists (
    select 1
    from public.entrada_reserva r
    inner join public.entrada_concierto c on c.id = r.concierto_id
    where c.programa_id = p_programa_id
      and r.estado = 'activa'
  ) then
    raise exception 'No se puede eliminar el programa: algún concierto tiene reservas activas.';
  end if;

  if exists (
    select 1
    from public.entrada_reserva_entrada e
    inner join public.entrada_reserva r on r.id = e.reserva_id
    inner join public.entrada_concierto c on c.id = r.concierto_id
    where c.programa_id = p_programa_id
      and e.estado_ingreso = 'ingresada'
  ) then
    raise exception 'No se puede eliminar el programa: hay entradas con ingreso a sala en algún concierto.';
  end if;

  delete from public.entrada_ingreso_evento i
  where i.concierto_id in (select c.id from public.entrada_concierto c where c.programa_id = p_programa_id)
     or i.reserva_id in (
       select r.id
       from public.entrada_reserva r
       inner join public.entrada_concierto c on c.id = r.concierto_id
       where c.programa_id = p_programa_id
     )
     or i.reserva_entrada_id in (
       select e.id
       from public.entrada_reserva_entrada e
       inner join public.entrada_reserva r on r.id = e.reserva_id
       inner join public.entrada_concierto c on c.id = r.concierto_id
       where c.programa_id = p_programa_id
     );

  delete from public.entrada_reserva r
  using public.entrada_concierto c
  where r.concierto_id = c.id
    and c.programa_id = p_programa_id;

  delete from public.entrada_concierto
  where programa_id = p_programa_id;

  delete from public.entrada_programa
  where id = p_programa_id;
end;
$$;

grant execute on function public.entrada_admin_delete_concierto(bigint) to authenticated;
grant execute on function public.entrada_admin_delete_programa(bigint) to authenticated;
