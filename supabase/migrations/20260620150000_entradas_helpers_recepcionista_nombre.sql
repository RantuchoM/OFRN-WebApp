-- Helpers de nombre recepcionista (entrada_preview_qr los usa al escanear).

create or replace function public.entrada_usuario_display_short(p_user_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(
    (
      select trim(
        coalesce(nullif(trim(u.nombre), ''), 'Recepción')
        || case
          when nullif(trim(u.apellido), '') is not null
            then ' ' || upper(left(trim(u.apellido), 1)) || '.'
          else ''
        end
      )
      from public.entrada_usuario u
      where u.id = p_user_id
    ),
    ''
  );
$$;

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

grant execute on function public.entrada_usuario_display_short(uuid) to anon, authenticated;
grant execute on function public.entrada_recepcionista_nombre_entrada(bigint, bigint, uuid) to authenticated;
