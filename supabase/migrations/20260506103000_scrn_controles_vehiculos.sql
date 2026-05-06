-- Controles SCRN por viaje y controles regulares por vehículo.
-- Incluye:
-- - Control pre/post viaje (AcroForm + odómetro + limpieza post-viaje)
-- - Controles regulares por fecha
-- - Controles regulares por kilometraje
-- - Reglas de negocio y vistas de alertas

create table if not exists public.scrn_viajes_controles (
  id bigint generated always as identity primary key,
  id_viaje bigint not null unique references public.scrn_viajes(id) on delete cascade,
  id_transporte bigint not null references public.scrn_transportes(id) on delete cascade,

  -- Estado operativo
  control_previo_completo boolean not null default false,
  control_posterior_completo boolean not null default false,
  control_previo_completado_at timestamp with time zone,
  control_posterior_completado_at timestamp with time zone,

  -- Odómetro principal del viaje
  km_retiro integer,
  km_entrega integer,

  -- Limpieza post-viaje
  limpieza_turno_at timestamp with time zone,
  limpieza_estado text not null default 'pendiente'
    check (limpieza_estado in ('pendiente', 'programado', 'realizado', 'cancelado')),
  limpieza_notas text,
  limpieza_google_calendar_event_id text,
  limpieza_google_calendar_synced_at timestamp with time zone,

  -- Payload completo del acroform para no rigidizar el esquema
  acroform_payload jsonb not null default '{}'::jsonb,

  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

comment on table public.scrn_viajes_controles is
  'Control técnico pre/post por viaje SCRN, incluyendo datos de AcroForm, odómetro y turno de limpieza.';
comment on column public.scrn_viajes_controles.acroform_payload is
  'Snapshot completo de los datos del formulario de control del vehículo.';

create index if not exists idx_scrn_viajes_controles_transporte
  on public.scrn_viajes_controles (id_transporte);
create index if not exists idx_scrn_viajes_controles_limpieza_at
  on public.scrn_viajes_controles (limpieza_turno_at);

create table if not exists public.scrn_controles_vehiculos_fecha (
  id bigint generated always as identity primary key,
  id_transporte bigint not null references public.scrn_transportes(id) on delete cascade,
  tipo text not null,
  descripcion text,
  vence_at date not null,
  alertar_dias_antes integer not null default 30 check (alertar_dias_antes >= 0),
  activo boolean not null default true,
  ultimo_hecho_at timestamp with time zone,
  ultimo_hecho_nota text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_scrn_controles_fecha_transporte
  on public.scrn_controles_vehiculos_fecha (id_transporte);
create index if not exists idx_scrn_controles_fecha_vence
  on public.scrn_controles_vehiculos_fecha (vence_at);

create table if not exists public.scrn_controles_vehiculos_kilometros (
  id bigint generated always as identity primary key,
  id_transporte bigint not null references public.scrn_transportes(id) on delete cascade,
  tipo text not null,
  descripcion text,
  proximo_km integer not null check (proximo_km >= 0),
  alertar_km_antes integer not null default 0 check (alertar_km_antes >= 0),
  activo boolean not null default true,
  ultimo_hecho_at timestamp with time zone,
  ultimo_hecho_km integer check (ultimo_hecho_km is null or ultimo_hecho_km >= 0),
  ultimo_hecho_nota text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

create index if not exists idx_scrn_controles_km_transporte
  on public.scrn_controles_vehiculos_kilometros (id_transporte);
create index if not exists idx_scrn_controles_km_proximo
  on public.scrn_controles_vehiculos_kilometros (proximo_km);

create or replace function public.scrn_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists tr_scrn_viajes_controles_updated_at on public.scrn_viajes_controles;
create trigger tr_scrn_viajes_controles_updated_at
before update on public.scrn_viajes_controles
for each row
execute function public.scrn_set_updated_at();

drop trigger if exists tr_scrn_controles_fecha_updated_at on public.scrn_controles_vehiculos_fecha;
create trigger tr_scrn_controles_fecha_updated_at
before update on public.scrn_controles_vehiculos_fecha
for each row
execute function public.scrn_set_updated_at();

drop trigger if exists tr_scrn_controles_km_updated_at on public.scrn_controles_vehiculos_kilometros;
create trigger tr_scrn_controles_km_updated_at
before update on public.scrn_controles_vehiculos_kilometros
for each row
execute function public.scrn_set_updated_at();

create or replace function public.scrn_viajes_controles_set_transport()
returns trigger
language plpgsql
as $$
declare
  v_transporte_id bigint;
begin
  select v.id_transporte
    into v_transporte_id
  from public.scrn_viajes v
  where v.id = new.id_viaje;

  if v_transporte_id is null then
    raise exception 'No existe viaje SCRN % o no tiene transporte asignado', new.id_viaje;
  end if;

  new.id_transporte := v_transporte_id;
  return new;
end;
$$;

drop trigger if exists tr_scrn_viajes_controles_set_transport on public.scrn_viajes_controles;
create trigger tr_scrn_viajes_controles_set_transport
before insert or update of id_viaje on public.scrn_viajes_controles
for each row
execute function public.scrn_viajes_controles_set_transport();

create or replace function public.scrn_viajes_controles_validate_km()
returns trigger
language plpgsql
as $$
declare
  v_prev_max_km integer;
begin
  if new.km_retiro is not null and new.km_retiro < 0 then
    raise exception 'km_retiro no puede ser negativo';
  end if;
  if new.km_entrega is not null and new.km_entrega < 0 then
    raise exception 'km_entrega no puede ser negativo';
  end if;
  if new.km_retiro is not null and new.km_entrega is not null and new.km_entrega < new.km_retiro then
    raise exception 'km_entrega no puede ser menor a km_retiro';
  end if;

  select max(c.km_entrega)
    into v_prev_max_km
  from public.scrn_viajes_controles c
  where c.id_transporte = new.id_transporte
    and c.id <> coalesce(new.id, -1)
    and c.km_entrega is not null;

  if v_prev_max_km is not null then
    if new.km_retiro is not null and new.km_retiro < v_prev_max_km then
      raise exception 'km_retiro (%) no puede ser menor al último km de vehículo (%)', new.km_retiro, v_prev_max_km;
    end if;
    if new.km_entrega is not null and new.km_entrega < v_prev_max_km then
      raise exception 'km_entrega (%) no puede ser menor al último km de vehículo (%)', new.km_entrega, v_prev_max_km;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_scrn_viajes_controles_validate_km on public.scrn_viajes_controles;
create trigger tr_scrn_viajes_controles_validate_km
before insert or update on public.scrn_viajes_controles
for each row
execute function public.scrn_viajes_controles_validate_km();

create or replace function public.scrn_viajes_controles_validate_prev_trip()
returns trigger
language plpgsql
as $$
declare
  v_fecha_salida timestamp with time zone;
  v_prev_viaje_id bigint;
  v_prev_ok boolean;
begin
  if not coalesce(new.control_previo_completo, false) then
    return new;
  end if;

  select v.fecha_salida
    into v_fecha_salida
  from public.scrn_viajes v
  where v.id = new.id_viaje;

  if v_fecha_salida is null then
    return new;
  end if;

  select v2.id
    into v_prev_viaje_id
  from public.scrn_viajes v2
  where v2.id_transporte = new.id_transporte
    and v2.id <> new.id_viaje
    and v2.fecha_salida < v_fecha_salida
  order by v2.fecha_salida desc
  limit 1;

  if v_prev_viaje_id is null then
    return new;
  end if;

  select coalesce(c.control_posterior_completo, false)
    into v_prev_ok
  from public.scrn_viajes_controles c
  where c.id_viaje = v_prev_viaje_id;

  if not coalesce(v_prev_ok, false) then
    raise exception 'No se puede completar control previo: el viaje anterior (%) no tiene control posterior completo', v_prev_viaje_id;
  end if;

  return new;
end;
$$;

drop trigger if exists tr_scrn_viajes_controles_validate_prev_trip on public.scrn_viajes_controles;
create trigger tr_scrn_viajes_controles_validate_prev_trip
before insert or update of control_previo_completo on public.scrn_viajes_controles
for each row
execute function public.scrn_viajes_controles_validate_prev_trip();

create or replace view public.scrn_v_alertas_controles_fecha as
select
  c.id,
  c.id_transporte,
  t.nombre as transporte_nombre,
  t.patente as transporte_patente,
  c.tipo,
  c.descripcion,
  c.vence_at,
  c.alertar_dias_antes,
  (c.vence_at - current_date) as dias_para_vencer,
  (current_date >= (c.vence_at - c.alertar_dias_antes)) as en_alerta,
  (current_date > c.vence_at) as vencido
from public.scrn_controles_vehiculos_fecha c
join public.scrn_transportes t on t.id = c.id_transporte
where c.activo = true;

create or replace view public.scrn_v_km_actual_por_transporte as
select
  t.id as id_transporte,
  t.nombre as transporte_nombre,
  t.patente as transporte_patente,
  (
    select max(c.km_entrega)
    from public.scrn_viajes_controles c
    where c.id_transporte = t.id
      and c.km_entrega is not null
  ) as km_actual
from public.scrn_transportes t;

create or replace view public.scrn_v_alertas_controles_km as
select
  c.id,
  c.id_transporte,
  t.transporte_nombre,
  t.transporte_patente,
  c.tipo,
  c.descripcion,
  c.proximo_km,
  c.alertar_km_antes,
  t.km_actual,
  (c.proximo_km - coalesce(t.km_actual, 0)) as km_restantes,
  (coalesce(t.km_actual, 0) >= (c.proximo_km - c.alertar_km_antes)) as en_alerta,
  (coalesce(t.km_actual, 0) >= c.proximo_km) as vencido
from public.scrn_controles_vehiculos_kilometros c
join public.scrn_v_km_actual_por_transporte t on t.id_transporte = c.id_transporte
where c.activo = true;

create or replace view public.scrn_v_viajes_sin_limpieza as
select
  v.id as id_viaje,
  v.id_transporte,
  v.motivo,
  v.origen,
  v.destino_final,
  v.fecha_salida,
  v.fecha_llegada_estimada,
  c.id as id_control,
  c.limpieza_turno_at,
  c.limpieza_estado
from public.scrn_viajes v
left join public.scrn_viajes_controles c on c.id_viaje = v.id
where coalesce(c.limpieza_turno_at, null) is null
  and v.fecha_salida >= (now() - interval '90 days');

