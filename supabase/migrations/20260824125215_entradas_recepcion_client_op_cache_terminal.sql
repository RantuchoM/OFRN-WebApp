-- Solo cachear resultados terminales en entrada_validar_y_consumir_qr_idem.
-- No persistir reserva_uso_parcial / warning (no consumen).

create or replace function public.entrada_validar_y_consumir_qr_idem(
  p_token text,
  p_modo text default 'auto',
  p_confirmar_parcial boolean default false,
  p_concierto_id bigint default null,
  p_ordenes_ingresar integer[] default null,
  p_client_op_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cached jsonb;
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  if p_client_op_id is not null then
    select o.result into v_cached
    from public.entrada_recepcion_client_op o
    where o.client_op_id = p_client_op_id;

    if v_cached is not null then
      return v_cached;
    end if;
  end if;

  v_result := public.entrada_validar_y_consumir_qr(
    p_token,
    p_modo,
    p_confirmar_parcial,
    p_concierto_id,
    p_ordenes_ingresar
  );

  if p_client_op_id is not null and v_result is not null then
    if coalesce((v_result->>'ok')::boolean, false)
       or coalesce(v_result->>'reason', '') in (
         'entrada_ya_usada',
         'reserva_totalmente_usada'
       )
    then
      insert into public.entrada_recepcion_client_op (
        client_op_id, concierto_id, scanner_user_id, result
      )
      values (
        p_client_op_id,
        p_concierto_id,
        auth.uid(),
        v_result
      )
      on conflict (client_op_id) do nothing;
    end if;
  end if;

  return v_result;
end;
$$;

comment on function public.entrada_validar_y_consumir_qr_idem(text, text, boolean, bigint, integer[], uuid) is
  'Consume QR con deduplicación por client_op_id; cachea solo ok / ya usada.';
