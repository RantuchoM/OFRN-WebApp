-- SCRN controles de viaje:
-- - Compleción automática de control previo/final según datos requeridos
-- - Auditoría de último editor (timestamp + nombre/apellido)

alter table public.scrn_viajes_controles
  add column if not exists last_edited_at timestamp with time zone,
  add column if not exists last_edited_by uuid,
  add column if not exists last_edited_by_nombre text;

comment on column public.scrn_viajes_controles.last_edited_at is
  'Última edición de datos de control de viaje.';
comment on column public.scrn_viajes_controles.last_edited_by is
  'Usuario (auth uid) que realizó la última edición.';
comment on column public.scrn_viajes_controles.last_edited_by_nombre is
  'Nombre visible del usuario que realizó la última edición.';

create or replace function public.scrn_control_has_estado(items jsonb, key text)
returns boolean
language plpgsql
immutable
as $$
declare
  v text;
begin
  if items is null then
    return false;
  end if;
  v := lower(coalesce(items -> key ->> 'estado', ''));
  return v in ('bien', 'regular', 'mal');
end;
$$;

create or replace function public.scrn_viajes_controles_autocomplete()
returns trigger
language plpgsql
as $$
declare
  p jsonb := coalesce(new.acroform_payload, '{}'::jsonb);
  g jsonb := coalesce(p -> 'general', '{}'::jsonb);
  previo_meta jsonb := coalesce(p -> 'previo' -> 'meta', '{}'::jsonb);
  post_meta jsonb := coalesce(p -> 'posterior' -> 'meta', '{}'::jsonb);
  previo_items jsonb := coalesce(p -> 'previo' -> 'items', '{}'::jsonb);
  post_items jsonb := coalesce(p -> 'posterior' -> 'items', '{}'::jsonb);
  v_user uuid;
  v_nombre text;
  prev_ok boolean;
  post_ok boolean;
begin
  -- Sincronizar payload general con columnas km
  if coalesce(g ->> 'km_retiro', '') = '' and new.km_retiro is not null then
    p := jsonb_set(p, '{general,km_retiro}', to_jsonb(new.km_retiro::text), true);
  end if;
  if coalesce(g ->> 'km_entrega', '') = '' and new.km_entrega is not null then
    p := jsonb_set(p, '{general,km_entrega}', to_jsonb(new.km_entrega::text), true);
  end if;
  new.acroform_payload := p;
  g := coalesce(p -> 'general', '{}'::jsonb);
  previo_meta := coalesce(p -> 'previo' -> 'meta', '{}'::jsonb);
  post_meta := coalesce(p -> 'posterior' -> 'meta', '{}'::jsonb);
  previo_items := coalesce(p -> 'previo' -> 'items', '{}'::jsonb);
  post_items := coalesce(p -> 'posterior' -> 'items', '{}'::jsonb);

  -- Requisitos PREVIO: fecha/hora/km de retiro + radiales previos
  prev_ok :=
    coalesce(previo_meta ->> 'fecha_retiro', g ->> 'fecha_control', '') <> '' and
    coalesce(previo_meta ->> 'hora_retiro', g ->> 'hora_retiro', '') <> '' and
    coalesce(new.km_retiro::text, previo_meta ->> 'km_retiro', g ->> 'km_retiro', '') <> '' and
    public.scrn_control_has_estado(previo_items, 'aceite') and
    public.scrn_control_has_estado(previo_items, 'agua_refrigerante') and
    public.scrn_control_has_estado(previo_items, 'combustible') and
    public.scrn_control_has_estado(previo_items, 'luces_delanteras') and
    public.scrn_control_has_estado(previo_items, 'luces_traseras') and
    public.scrn_control_has_estado(previo_items, 'luces_giro') and
    public.scrn_control_has_estado(previo_items, 'parabrisas') and
    public.scrn_control_has_estado(previo_items, 'espejos') and
    public.scrn_control_has_estado(previo_items, 'limpiaparabrisas') and
    public.scrn_control_has_estado(previo_items, 'cubiertas') and
    public.scrn_control_has_estado(previo_items, 'rueda_auxilio') and
    public.scrn_control_has_estado(previo_items, 'gato_llave') and
    public.scrn_control_has_estado(previo_items, 'documentacion');

  -- Requisitos FINAL: fecha/hora/km de entrega + radiales finales
  post_ok :=
    coalesce(post_meta ->> 'fecha_entrega', g ->> 'fecha_control', '') <> '' and
    coalesce(post_meta ->> 'hora_entrega', g ->> 'hora_entrega', '') <> '' and
    coalesce(new.km_entrega::text, post_meta ->> 'km_entrega', g ->> 'km_entrega', '') <> '' and
    public.scrn_control_has_estado(post_items, 'aceite') and
    public.scrn_control_has_estado(post_items, 'agua_refrigerante') and
    public.scrn_control_has_estado(post_items, 'combustible') and
    public.scrn_control_has_estado(post_items, 'luces_delanteras') and
    public.scrn_control_has_estado(post_items, 'luces_traseras') and
    public.scrn_control_has_estado(post_items, 'luces_giro') and
    public.scrn_control_has_estado(post_items, 'parabrisas') and
    public.scrn_control_has_estado(post_items, 'espejos') and
    public.scrn_control_has_estado(post_items, 'limpiaparabrisas') and
    public.scrn_control_has_estado(post_items, 'cubiertas') and
    public.scrn_control_has_estado(post_items, 'rueda_auxilio') and
    public.scrn_control_has_estado(post_items, 'interior');

  new.control_previo_completo := prev_ok;
  new.control_posterior_completo := post_ok;
  new.control_previo_completado_at := case when prev_ok then coalesce(new.control_previo_completado_at, now()) else null end;
  new.control_posterior_completado_at := case when post_ok then coalesce(new.control_posterior_completado_at, now()) else null end;

  -- Auditoría del último editor
  v_user := auth.uid();
  if v_user is not null then
    select trim(concat_ws(' ', coalesce(sp.nombre, ''), coalesce(sp.apellido, '')))
      into v_nombre
    from public.scrn_perfiles sp
    where sp.id = v_user
    limit 1;
  end if;

  new.last_edited_at := now();
  new.last_edited_by := v_user;
  new.last_edited_by_nombre := nullif(v_nombre, '');

  return new;
end;
$$;

drop trigger if exists aa_scrn_viajes_controles_autocomplete on public.scrn_viajes_controles;
create trigger aa_scrn_viajes_controles_autocomplete
before insert or update on public.scrn_viajes_controles
for each row
execute function public.scrn_viajes_controles_autocomplete();

