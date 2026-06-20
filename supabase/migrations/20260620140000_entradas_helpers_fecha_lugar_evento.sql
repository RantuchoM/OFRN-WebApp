-- Helpers de fecha/lugar desde eventos OFRN (requeridos por entrada_preview_qr en recepción).
-- Idempotente: algunos entornos aplicaron recepción sin 20260520120000_entradas_fecha_lugar_desde_evento.

create or replace function public.entrada_fecha_hora_desde_evento(p_evento_id bigint)
returns timestamptz
language sql
stable
set search_path = public
as $$
  select ((e.fecha::text || ' ' || coalesce(e.hora_inicio::text, '00:00:00'))::timestamp)
    at time zone 'America/Argentina/Buenos_Aires'
  from public.eventos e
  where e.id = p_evento_id
    and coalesce(e.is_deleted, false) = false
    and e.deleted_at is null;
$$;

create or replace function public.entrada_lugar_nombre_desde_evento(p_evento_id bigint)
returns text
language sql
stable
set search_path = public
as $$
  select l.nombre
  from public.eventos e
  left join public.locaciones l on l.id = e.id_locacion
  where e.id = p_evento_id
    and coalesce(e.is_deleted, false) = false
    and e.deleted_at is null;
$$;

grant execute on function public.entrada_fecha_hora_desde_evento(bigint) to anon, authenticated;
grant execute on function public.entrada_lugar_nombre_desde_evento(bigint) to anon, authenticated;
