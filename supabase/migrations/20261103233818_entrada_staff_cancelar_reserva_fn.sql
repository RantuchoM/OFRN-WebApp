create or replace function public.entrada_staff_cancelar_reserva(p_reserva_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_n integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_can_terceros(auth.uid()) then
    raise exception 'Sin permiso';
  end if;

  update public.entrada_reserva r
  set
    estado = 'cancelada',
    cancelacion_origen = 'admin_suspension',
    updated_at = now()
  where r.id = p_reserva_id
    and r.estado = 'activa';

  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'Reserva no cancelable: no existe o ya estaba cancelada.';
  end if;

  update public.entrada_reserva_entrada e
  set
    estado_ingreso = 'anulada',
    anulacion_origen = 'admin_suspension',
    updated_at = now()
  where e.reserva_id = p_reserva_id
    and e.estado_ingreso = 'pendiente';
end;
$$;

comment on function public.entrada_staff_cancelar_reserva(bigint) is
  'Staff (entrada_can_terceros): cancela reserva activa y anula plazas pendientes.';

revoke all on function public.entrada_staff_cancelar_reserva(bigint) from public;
grant execute on function public.entrada_staff_cancelar_reserva(bigint) to authenticated;
