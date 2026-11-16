-- Responder consulta de ayuda sin emitir entradas (p. ej. función agotada)
-- + purga de pendientes vinculadas a conciertos ya pasados.

alter table public.entrada_ayuda_consulta
  add column if not exists respuesta_staff text;

comment on column public.entrada_ayuda_consulta.respuesta_staff is
  'Mensaje enviado al consultante al resolver sin emitir reserva (p. ej. agotadas).';

create or replace function public.entrada_ayuda_responder_sin_emitir(
  p_id uuid,
  p_mensaje text
)
returns public.entrada_ayuda_consulta
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_ayuda_consulta;
  v_msg text := trim(coalesce(p_mensaje, ''));
begin
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'No autorizado';
  end if;
  if p_id is null then
    raise exception 'Falta la consulta';
  end if;
  if char_length(v_msg) < 8 then
    raise exception 'Escribí un mensaje para el consultante';
  end if;
  if char_length(v_msg) > 4000 then
    raise exception 'El mensaje es demasiado largo';
  end if;

  update public.entrada_ayuda_consulta
  set
    estado = 'resuelta',
    respuesta_staff = v_msg,
    resolved_at = now(),
    resolved_by = auth.uid()
  where id = p_id
    and estado = 'pendiente'
  returning * into v_row;

  if v_row.id is null then
    select * into v_row from public.entrada_ayuda_consulta where id = p_id;
    if v_row.id is null then
      raise exception 'Consulta no encontrada';
    end if;
    if v_row.estado <> 'pendiente' then
      raise exception 'La consulta ya no está pendiente';
    end if;
    raise exception 'No se pudo marcar la consulta como resuelta';
  end if;

  return v_row;
end;
$$;

comment on function public.entrada_ayuda_responder_sin_emitir(uuid, text) is
  'Marca consulta pendiente como resuelta sin reserva, guardando el mensaje al consultante.';

grant execute on function public.entrada_ayuda_responder_sin_emitir(uuid, text) to authenticated;

-- Purga one-shot / mantenimiento: pendientes cuyo concierto ya ocurrió.
create or replace function public.entrada_ayuda_purgar_pendientes_pasados()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted integer := 0;
begin
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'No autorizado';
  end if;

  with doomed as (
    select a.id
    from public.entrada_ayuda_consulta a
    join public.entrada_concierto c on c.id = a.concierto_id
    where a.estado = 'pendiente'
      and public.entrada_fecha_hora_desde_evento(c.ofrn_evento_id) is not null
      and public.entrada_fecha_hora_desde_evento(c.ofrn_evento_id) < now()
  ),
  deleted as (
    delete from public.entrada_ayuda_consulta a
    using doomed d
    where a.id = d.id
    returning a.id
  )
  select count(*)::integer into v_deleted from deleted;

  return coalesce(v_deleted, 0);
end;
$$;

comment on function public.entrada_ayuda_purgar_pendientes_pasados() is
  'Borra consultas pendientes vinculadas a conciertos cuya fecha/hora ya pasó.';

grant execute on function public.entrada_ayuda_purgar_pendientes_pasados() to authenticated;
