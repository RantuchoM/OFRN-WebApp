-- Bloquear check-in / check-out / pases sobre ensayos soft-deleted (is_deleted).
-- Defensa en profundidad: además de ensayo_validar_evento_ensamble (RPC),
-- un trigger rechaza INSERT/UPDATE directos en tablas de check-in.

create or replace function public.ensayo_validar_evento_ensamble(
  p_evento_id bigint,
  p_solo_hoy boolean default false
)
returns public.eventos
language plpgsql
stable
as $$
declare
  v_evt public.eventos;
  v_any public.eventos;
begin
  select * into v_any
  from public.eventos e
  where e.id = p_evento_id;

  if v_any.id is null then
    raise exception 'Ensayo no encontrado o no es tipo ensamble (13)';
  end if;

  if v_any.id_tipo_evento is distinct from 13 then
    raise exception 'Ensayo no encontrado o no es tipo ensamble (13)';
  end if;

  if coalesce(v_any.is_deleted, false) then
    raise exception 'Este ensayo está eliminado; no se puede registrar asistencia';
  end if;

  v_evt := v_any;

  if p_solo_hoy and v_evt.fecha is distinct from public.ensayo_hoy_ar() then
    raise exception 'El check-in solo está habilitado el día del ensayo';
  end if;

  return v_evt;
end;
$$;

create or replace function public.ensayo_checkin_enforce_evento_activo()
returns trigger
language plpgsql
as $$
declare
  v_deleted boolean;
  v_tipo integer;
begin
  select coalesce(e.is_deleted, false), e.id_tipo_evento
    into v_deleted, v_tipo
  from public.eventos e
  where e.id = new.id_evento;

  if v_tipo is null then
    raise exception 'Ensayo no encontrado o no es tipo ensamble (13)';
  end if;

  if v_tipo is distinct from 13 then
    raise exception 'Ensayo no encontrado o no es tipo ensamble (13)';
  end if;

  if v_deleted then
    raise exception 'Este ensayo está eliminado; no se puede registrar asistencia';
  end if;

  return new;
end;
$$;

drop trigger if exists eventos_checkin_ensayo_enforce_activo on public.eventos_checkin_ensayo;
create trigger eventos_checkin_ensayo_enforce_activo
  before insert or update on public.eventos_checkin_ensayo
  for each row
  execute function public.ensayo_checkin_enforce_evento_activo();

drop trigger if exists eventos_checkin_pase_enforce_activo on public.eventos_checkin_pase;
create trigger eventos_checkin_pase_enforce_activo
  before insert or update on public.eventos_checkin_pase
  for each row
  execute function public.ensayo_checkin_enforce_evento_activo();

grant execute on function public.ensayo_validar_evento_ensamble(bigint, boolean) to anon, authenticated;
