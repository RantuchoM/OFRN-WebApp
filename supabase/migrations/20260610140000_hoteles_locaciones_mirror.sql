-- Espejo bidireccional hoteles ↔ locaciones (nombre, dirección, localidad, Google Maps, contacto).
-- Corrige desincronización histórica de id_localidad y expone link_mapa en hoteles para Datos.
-- Triggers AFTER (no BEFORE) para evitar ERROR 27000 en propagación cruzada.

alter table public.hoteles
  add column if not exists link_mapa text;

comment on column public.hoteles.link_mapa is
  'URL Google Maps; espejada con locaciones.link_mapa vía trigger.';

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.hotel_loc_mirror_guard_active()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('app.hotel_loc_mirror', true), '') = 'on';
$$;

create or replace function public.hotel_loc_mirror_guard_on()
returns void
language plpgsql
as $$
begin
  perform set_config('app.hotel_loc_mirror', 'on', true);
end;
$$;

create or replace function public.hotel_loc_mirror_guard_off()
returns void
language plpgsql
as $$
begin
  perform set_config('app.hotel_loc_mirror', 'off', true);
end;
$$;

create or replace function public.hotel_telefono_to_locacion(p_telefono text)
returns bigint
language plpgsql
immutable
as $$
declare
  v_digits text;
begin
  if p_telefono is null or btrim(p_telefono) = '' then
    return null;
  end if;
  v_digits := regexp_replace(p_telefono, '\D', '', 'g');
  if v_digits = '' then
    return null;
  end if;
  return v_digits::bigint;
exception
  when others then
    return null;
end;
$$;

create or replace function public.locacion_telefono_to_hotel(p_telefono bigint)
returns text
language sql
immutable
as $$
  select case when p_telefono is null then null else p_telefono::text end;
$$;

-- ---------------------------------------------------------------------------
-- Backfill (sin triggers activos)
-- ---------------------------------------------------------------------------

-- Hoteles sin locación: reutilizar locación coincidente sin hotel vinculado
update public.hoteles h
set id_locacion = l.id
from public.locaciones l
where h.id_locacion is null
  and l.nombre = h.nombre
  and coalesce(l.direccion, '') = coalesce(h.direccion, '')
  and not exists (
    select 1 from public.hoteles h2 where h2.id_locacion = l.id
  );

-- Huérfanos restantes: crear locación dedicada por fila
do $$
declare
  r record;
  v_loc_id bigint;
begin
  for r in
    select h.id, h.nombre, h.direccion, h.id_localidad, h.link_mapa, h.telefono, h.email
    from public.hoteles h
    where h.id_locacion is null
  loop
    insert into public.locaciones (
      nombre, direccion, id_localidad, link_mapa, telefono, mail
    )
    values (
      r.nombre,
      r.direccion,
      r.id_localidad,
      r.link_mapa,
      public.hotel_telefono_to_locacion(r.telefono),
      r.email
    )
    returning id into v_loc_id;

    update public.hoteles set id_locacion = v_loc_id where id = r.id;
  end loop;
end;
$$;

-- Fuente de verdad para localidad en pares vinculados: hoteles (hotelería)
update public.locaciones l
set id_localidad = h.id_localidad
from public.hoteles h
where h.id_locacion = l.id
  and l.id_localidad is distinct from h.id_localidad;

-- Alinear link_mapa desde locación si el hotel no lo tenía
update public.hoteles h
set link_mapa = l.link_mapa
from public.locaciones l
where h.id_locacion = l.id
  and h.link_mapa is null
  and l.link_mapa is not null;

-- Espejar campos compartidos restantes (hotel como referencia de contacto)
update public.locaciones l
set
  nombre = h.nombre,
  direccion = h.direccion,
  link_mapa = coalesce(h.link_mapa, l.link_mapa),
  telefono = coalesce(public.hotel_telefono_to_locacion(h.telefono), l.telefono),
  mail = coalesce(h.email, l.mail)
from public.hoteles h
where h.id_locacion = l.id
  and (
    l.nombre is distinct from h.nombre
    or l.direccion is distinct from h.direccion
    or l.link_mapa is distinct from coalesce(h.link_mapa, l.link_mapa)
    or l.telefono is distinct from coalesce(public.hotel_telefono_to_locacion(h.telefono), l.telefono)
    or l.mail is distinct from coalesce(h.email, l.mail)
  );

update public.hoteles h
set link_mapa = l.link_mapa
from public.locaciones l
where h.id_locacion = l.id
  and h.link_mapa is distinct from l.link_mapa;

-- ---------------------------------------------------------------------------
-- Hotel → Locación (AFTER)
-- ---------------------------------------------------------------------------

create or replace function public.hoteles_sync_locacion_row(
  p_hotel public.hoteles
)
returns bigint
language plpgsql
as $$
declare
  v_loc_id bigint;
begin
  if p_hotel.id_locacion is null then
    insert into public.locaciones (
      nombre,
      direccion,
      id_localidad,
      link_mapa,
      telefono,
      mail
    )
    values (
      p_hotel.nombre,
      p_hotel.direccion,
      p_hotel.id_localidad,
      p_hotel.link_mapa,
      public.hotel_telefono_to_locacion(p_hotel.telefono),
      p_hotel.email
    )
    returning id into v_loc_id;

    perform public.hotel_loc_mirror_guard_on();
    update public.hoteles
    set id_locacion = v_loc_id
    where id = p_hotel.id;
    perform public.hotel_loc_mirror_guard_off();

    return v_loc_id;
  end if;

  update public.locaciones
  set
    nombre = p_hotel.nombre,
    direccion = p_hotel.direccion,
    id_localidad = p_hotel.id_localidad,
    link_mapa = p_hotel.link_mapa,
    telefono = public.hotel_telefono_to_locacion(p_hotel.telefono),
    mail = p_hotel.email
  where id = p_hotel.id_locacion;

  return p_hotel.id_locacion;
end;
$$;

create or replace function public.hoteles_mirror_to_locacion()
returns trigger
language plpgsql
as $$
begin
  if public.hotel_loc_mirror_guard_active() then
    return new;
  end if;

  perform public.hotel_loc_mirror_guard_on();
  perform public.hoteles_sync_locacion_row(new);
  perform public.hotel_loc_mirror_guard_off();

  return new;
end;
$$;

drop trigger if exists hoteles_mirror_to_locacion_bi on public.hoteles;
drop trigger if exists hoteles_mirror_to_locacion_ai on public.hoteles;
create trigger hoteles_mirror_to_locacion_ai
  after insert or update on public.hoteles
  for each row
  execute function public.hoteles_mirror_to_locacion();

-- ---------------------------------------------------------------------------
-- Locación → Hotel (AFTER)
-- ---------------------------------------------------------------------------

create or replace function public.locaciones_mirror_to_hotel()
returns trigger
language plpgsql
as $$
begin
  if public.hotel_loc_mirror_guard_active() then
    return new;
  end if;

  perform public.hotel_loc_mirror_guard_on();

  update public.hoteles
  set
    nombre = new.nombre,
    direccion = new.direccion,
    id_localidad = new.id_localidad,
    link_mapa = new.link_mapa,
    telefono = public.locacion_telefono_to_hotel(new.telefono),
    email = new.mail
  where id_locacion = new.id;

  perform public.hotel_loc_mirror_guard_off();
  return new;
end;
$$;

drop trigger if exists locaciones_mirror_to_hotel_au on public.locaciones;
create trigger locaciones_mirror_to_hotel_au
  after update on public.locaciones
  for each row
  execute function public.locaciones_mirror_to_hotel();
