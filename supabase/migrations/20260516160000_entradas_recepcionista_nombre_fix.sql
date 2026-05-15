-- Backfill ingresada_por desde logs (para ingresos ya registrados sin recepcionista en la fila)

update public.entrada_reserva_entrada e
set ingresada_por = sub.scanner_user_id
from (
  select distinct on (ie.reserva_entrada_id)
    ie.reserva_entrada_id,
    ie.scanner_user_id
  from public.entrada_ingreso_evento ie
  where ie.reserva_entrada_id is not null
    and ie.resultado = 'ok'
    and ie.scanner_user_id is not null
  order by ie.reserva_entrada_id, ie.created_at desc
) sub
where e.id = sub.reserva_entrada_id
  and e.estado_ingreso = 'ingresada'
  and e.ingresada_por is null;

update public.entrada_reserva_entrada e
set ingresada_por = ie.scanner_user_id
from public.entrada_ingreso_evento ie
where e.reserva_id = ie.reserva_id
  and ie.tipo_qr = 'reserva'
  and ie.reserva_entrada_id is null
  and ie.resultado = 'ok'
  and ie.scanner_user_id is not null
  and e.estado_ingreso = 'ingresada'
  and e.ingresada_por is null;

-- Re-aplicar RPC por si 161501 no llegó a desplegarse (idempotente)
create or replace function public.entrada_recepcionista_nombre_entrada(
  p_entrada_id bigint,
  p_reserva_id bigint,
  p_ingresada_por uuid default null
)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select public.entrada_usuario_display_short(coalesce(
    p_ingresada_por,
    (
      select ie.scanner_user_id
      from public.entrada_ingreso_evento ie
      where ie.reserva_entrada_id = p_entrada_id
        and ie.resultado = 'ok'
        and ie.scanner_user_id is not null
      order by ie.created_at desc
      limit 1
    ),
    (
      select ie.scanner_user_id
      from public.entrada_ingreso_evento ie
      where p_reserva_id is not null
        and ie.reserva_id = p_reserva_id
        and ie.reserva_entrada_id is null
        and ie.tipo_qr = 'reserva'
        and ie.resultado = 'ok'
        and ie.scanner_user_id is not null
      order by ie.created_at desc
      limit 1
    )
  ));
$$;

grant execute on function public.entrada_recepcionista_nombre_entrada(bigint, bigint, uuid) to authenticated;
