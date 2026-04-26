-- No exigir pgcrypto: en algunos entornos no está habilitado; usamos md5() y random() (built-in).
do $$
begin
  if not exists (select 1 from pg_type where typname = 'entrada_rol') then
    create type public.entrada_rol as enum ('personal', 'recepcionista', 'admin');
  end if;
  if not exists (select 1 from pg_type where typname = 'entrada_reserva_estado') then
    create type public.entrada_reserva_estado as enum ('activa', 'cancelada');
  end if;
  if not exists (select 1 from pg_type where typname = 'entrada_ingreso_estado') then
    create type public.entrada_ingreso_estado as enum ('pendiente', 'ingresada', 'anulada');
  end if;
  if not exists (select 1 from pg_type where typname = 'entrada_tipo_qr') then
    create type public.entrada_tipo_qr as enum ('reserva', 'entrada');
  end if;
end
$$;

create or replace function public.entrada_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.entrada_programa (
  id bigint generated always as identity primary key,
  slug_publico text not null unique,
  nombre text not null,
  detalle_richtext text not null default '',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entrada_concierto (
  id bigint generated always as identity primary key,
  programa_id bigint not null references public.entrada_programa(id) on delete restrict,
  ofrn_programa_id bigint references public.programas(id) on delete restrict,
  ofrn_evento_id bigint not null unique references public.eventos(id) on delete restrict,
  slug_publico text not null unique,
  nombre text not null,
  fecha_hora timestamptz not null,
  lugar_nombre text,
  detalle_richtext text not null default '',
  imagen_drive_url text,
  capacidad_maxima integer not null check (capacidad_maxima > 0),
  reservas_habilitadas boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entrada_concierto
  add column if not exists ofrn_programa_id bigint,
  add column if not exists ofrn_evento_id bigint,
  add column if not exists lugar_nombre text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'entrada_concierto_ofrn_programa_id_fkey'
      and conrelid = 'public.entrada_concierto'::regclass
  ) then
    alter table public.entrada_concierto
      add constraint entrada_concierto_ofrn_programa_id_fkey
      foreign key (ofrn_programa_id) references public.programas(id) on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'entrada_concierto_ofrn_evento_id_fkey'
      and conrelid = 'public.entrada_concierto'::regclass
  ) then
    alter table public.entrada_concierto
      add constraint entrada_concierto_ofrn_evento_id_fkey
      foreign key (ofrn_evento_id) references public.eventos(id) on delete restrict;
  end if;
end
$$;

create table if not exists public.entrada_usuario (
  id uuid primary key references auth.users(id) on delete cascade,
  nombre text not null,
  apellido text not null,
  email text not null unique,
  rol public.entrada_rol not null default 'personal',
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entrada_reserva (
  id bigint generated always as identity primary key,
  concierto_id bigint not null references public.entrada_concierto(id) on delete restrict,
  usuario_id uuid not null references public.entrada_usuario(id) on delete restrict,
  cantidad_solicitada integer not null check (cantidad_solicitada between 1 and 5),
  estado public.entrada_reserva_estado not null default 'activa',
  codigo_reserva text not null unique,
  qr_reserva_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.entrada_reserva_entrada (
  id bigint generated always as identity primary key,
  reserva_id bigint not null references public.entrada_reserva(id) on delete cascade,
  concierto_id bigint not null references public.entrada_concierto(id) on delete restrict,
  orden integer not null check (orden between 1 and 5),
  estado_ingreso public.entrada_ingreso_estado not null default 'pendiente',
  ingresada_at timestamptz,
  ingresada_por uuid references public.entrada_usuario(id) on delete set null,
  qr_entrada_hash text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(reserva_id, orden)
);

create table if not exists public.entrada_ingreso_evento (
  id bigint generated always as identity primary key,
  tipo_qr public.entrada_tipo_qr not null,
  reserva_id bigint references public.entrada_reserva(id) on delete set null,
  reserva_entrada_id bigint references public.entrada_reserva_entrada(id) on delete set null,
  concierto_id bigint not null references public.entrada_concierto(id) on delete restrict,
  resultado text not null,
  detalle text,
  scanner_user_id uuid references public.entrada_usuario(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists entrada_concierto_programa_idx on public.entrada_concierto(programa_id);
create index if not exists entrada_concierto_ofrn_programa_idx on public.entrada_concierto(ofrn_programa_id);
create unique index if not exists entrada_concierto_ofrn_evento_uidx on public.entrada_concierto(ofrn_evento_id) where ofrn_evento_id is not null;
create index if not exists entrada_concierto_fecha_idx on public.entrada_concierto(fecha_hora);
create index if not exists entrada_reserva_concierto_idx on public.entrada_reserva(concierto_id);
create index if not exists entrada_reserva_usuario_idx on public.entrada_reserva(usuario_id);
create index if not exists entrada_reserva_entrada_estado_idx on public.entrada_reserva_entrada(estado_ingreso);
create index if not exists entrada_ingreso_evento_concierto_idx on public.entrada_ingreso_evento(concierto_id);

drop trigger if exists trg_entrada_programa_updated_at on public.entrada_programa;
create trigger trg_entrada_programa_updated_at
before update on public.entrada_programa
for each row execute procedure public.entrada_touch_updated_at();

drop trigger if exists trg_entrada_concierto_updated_at on public.entrada_concierto;
create trigger trg_entrada_concierto_updated_at
before update on public.entrada_concierto
for each row execute procedure public.entrada_touch_updated_at();

drop trigger if exists trg_entrada_usuario_updated_at on public.entrada_usuario;
create trigger trg_entrada_usuario_updated_at
before update on public.entrada_usuario
for each row execute procedure public.entrada_touch_updated_at();

drop trigger if exists trg_entrada_reserva_updated_at on public.entrada_reserva;
create trigger trg_entrada_reserva_updated_at
before update on public.entrada_reserva
for each row execute procedure public.entrada_touch_updated_at();

drop trigger if exists trg_entrada_reserva_entrada_updated_at on public.entrada_reserva_entrada;
create trigger trg_entrada_reserva_entrada_updated_at
before update on public.entrada_reserva_entrada
for each row execute procedure public.entrada_touch_updated_at();

create or replace function public.entrada_is_admin(check_user uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.entrada_usuario eu
    where eu.id = check_user and eu.rol = 'admin' and eu.activo = true
  );
$$;

create or replace function public.entrada_is_recepcion(check_user uuid default auth.uid())
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.entrada_usuario eu
    where eu.id = check_user and eu.activo = true and eu.rol in ('admin', 'recepcionista')
  );
$$;

create or replace function public.entrada_slugify(input_text text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(lower(coalesce(input_text, 'item')), '[^a-z0-9]+', '-', 'g'));
$$;

create or replace function public.entrada_qr_token_hash(p_token text)
returns text
language sql
immutable
as $$
  select md5('entrada-qr' || coalesce(p_token, ''));
$$;

create or replace function public.entrada_generar_codigo_reserva()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'ENT-' || upper(substring(md5(random()::text || clock_timestamp()::text || random()::text) from 1 for 8));
    exit when not exists (select 1 from public.entrada_reserva r where r.codigo_reserva = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.entrada_ensure_profile(
  p_nombre text,
  p_apellido text
)
returns public.entrada_usuario
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user auth.users;
  v_profile public.entrada_usuario;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;

  select * into v_user from auth.users where id = auth.uid();
  if v_user.id is null then
    raise exception 'Usuario auth no encontrado';
  end if;

  insert into public.entrada_usuario (id, nombre, apellido, email, rol)
  values (
    auth.uid(),
    nullif(trim(p_nombre), ''),
    nullif(trim(p_apellido), ''),
    lower(coalesce(v_user.email, '')),
    case
      when lower(coalesce(v_user.email, '')) = 'ofrn.archivo@gmail.com' then 'admin'::public.entrada_rol
      else 'personal'::public.entrada_rol
    end
  )
  on conflict (id) do update
  set
    nombre = excluded.nombre,
    apellido = excluded.apellido,
    email = excluded.email,
    rol = case
      when excluded.email = 'ofrn.archivo@gmail.com' then 'admin'::public.entrada_rol
      else public.entrada_usuario.rol
    end
  returning * into v_profile;

  return v_profile;
end;
$$;

create or replace function public.entrada_crear_reserva(
  p_concierto_id bigint,
  p_cantidad integer
)
returns table(
  reserva_id bigint,
  concierto_id bigint,
  codigo_reserva text,
  qr_reserva_token text,
  qr_entrada_tokens text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_concierto public.entrada_concierto;
  v_total_ocupado integer;
  v_reserva_id bigint;
  v_reserva_token text;
  v_entry_token text;
  v_tokens text[] := array[]::text[];
  i integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if p_cantidad < 1 or p_cantidad > 5 then
    raise exception 'Cantidad inválida (debe ser entre 1 y 5)';
  end if;

  perform 1 from public.entrada_usuario where id = auth.uid() and activo = true;
  if not found then
    raise exception 'Perfil de entradas inexistente o inactivo';
  end if;

  select * into v_concierto
  from public.entrada_concierto
  where id = p_concierto_id and activo = true and reservas_habilitadas = true
  for update;

  if v_concierto.id is null then
    raise exception 'Concierto no disponible para reservas';
  end if;

  if exists (
    select 1 from public.entrada_reserva r
    where r.concierto_id = p_concierto_id
      and r.usuario_id = auth.uid()
      and r.estado = 'activa'
  ) then
    raise exception 'Ya tenés una reserva activa para este concierto.';
  end if;

  select coalesce(sum(r.cantidad_solicitada), 0)
    into v_total_ocupado
  from public.entrada_reserva r
  where r.concierto_id = p_concierto_id and r.estado = 'activa';

  if v_total_ocupado + p_cantidad > v_concierto.capacidad_maxima then
    raise exception 'No hay capacidad disponible para esa cantidad';
  end if;

  v_reserva_token := 'ENTR-RSV-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.entrada_reserva (
    concierto_id,
    usuario_id,
    cantidad_solicitada,
    estado,
    codigo_reserva,
    qr_reserva_hash
  )
  values (
    p_concierto_id,
    auth.uid(),
    p_cantidad,
    'activa',
    public.entrada_generar_codigo_reserva(),
    public.entrada_qr_token_hash(v_reserva_token)
  )
  returning id into v_reserva_id;

  for i in 1..p_cantidad loop
    v_entry_token := 'ENTR-TCK-' || replace(gen_random_uuid()::text, '-', '');
    insert into public.entrada_reserva_entrada (
      reserva_id,
      concierto_id,
      orden,
      qr_entrada_hash
    )
    values (
      v_reserva_id,
      p_concierto_id,
      i,
      public.entrada_qr_token_hash(v_entry_token)
    );
    v_tokens := array_append(v_tokens, v_entry_token);
  end loop;

  return query
  select r.id, r.concierto_id, r.codigo_reserva, v_reserva_token, v_tokens
  from public.entrada_reserva r
  where r.id = v_reserva_id;
end;
$$;

create or replace function public.entrada_validar_y_consumir_qr(
  p_token text,
  p_modo text,
  p_confirmar_parcial boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_hash text;
  v_reserva public.entrada_reserva;
  v_entrada public.entrada_reserva_entrada;
  v_pendientes integer;
  v_ingresadas integer;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  if not public.entrada_is_recepcion(auth.uid()) then
    raise exception 'Sin permisos de recepción';
  end if;

  v_hash := public.entrada_qr_token_hash(coalesce(trim(p_token), ''));
  if coalesce(v_hash, '') = '' then
    raise exception 'Token inválido';
  end if;

  if p_modo = 'entrada' then
    select * into v_entrada
    from public.entrada_reserva_entrada
    where qr_entrada_hash = v_hash
    for update;

    if v_entrada.id is null then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
    if v_entrada.estado_ingreso <> 'pendiente' then
      return jsonb_build_object('ok', false, 'reason', 'entrada_ya_usada');
    end if;

    update public.entrada_reserva_entrada
      set estado_ingreso = 'ingresada', ingresada_at = now(), ingresada_por = auth.uid()
      where id = v_entrada.id;

    insert into public.entrada_ingreso_evento(tipo_qr, reserva_id, reserva_entrada_id, concierto_id, resultado, detalle, scanner_user_id)
    values ('entrada', v_entrada.reserva_id, v_entrada.id, v_entrada.concierto_id, 'ok', 'Ingreso individual registrado', auth.uid());

    return jsonb_build_object('ok', true, 'tipo', 'entrada', 'reserva_id', v_entrada.reserva_id, 'entrada_id', v_entrada.id);
  elsif p_modo = 'reserva' then
    select * into v_reserva
    from public.entrada_reserva
    where qr_reserva_hash = v_hash
    for update;

    if v_reserva.id is null then
      return jsonb_build_object('ok', false, 'reason', 'token_no_encontrado');
    end if;
    if v_reserva.estado <> 'activa' then
      return jsonb_build_object('ok', false, 'reason', 'reserva_no_activa');
    end if;

    select
      count(*) filter (where estado_ingreso = 'pendiente'),
      count(*) filter (where estado_ingreso = 'ingresada')
    into v_pendientes, v_ingresadas
    from public.entrada_reserva_entrada
    where reserva_id = v_reserva.id;

    if coalesce(v_pendientes, 0) = 0 then
      return jsonb_build_object('ok', false, 'reason', 'reserva_totalmente_usada');
    end if;

    if coalesce(v_ingresadas, 0) > 0 and not p_confirmar_parcial then
      return jsonb_build_object(
        'ok', false,
        'reason', 'reserva_uso_parcial',
        'warning', true,
        'pendientes', v_pendientes,
        'ingresadas', v_ingresadas
      );
    end if;

    update public.entrada_reserva_entrada
      set estado_ingreso = 'ingresada', ingresada_at = now(), ingresada_por = auth.uid()
      where reserva_id = v_reserva.id and estado_ingreso = 'pendiente';

    insert into public.entrada_ingreso_evento(tipo_qr, reserva_id, concierto_id, resultado, detalle, scanner_user_id)
    values ('reserva', v_reserva.id, v_reserva.concierto_id, 'ok', 'Ingreso por reserva completa', auth.uid());

    return jsonb_build_object('ok', true, 'tipo', 'reserva', 'reserva_id', v_reserva.id, 'pendientes_consumidas', v_pendientes);
  end if;

  return jsonb_build_object('ok', false, 'reason', 'modo_invalido');
end;
$$;

create or replace function public.entrada_admin_upsert_programa(
  p_id bigint,
  p_nombre text,
  p_detalle_richtext text,
  p_activo boolean default true
)
returns public.entrada_programa
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_programa;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_id is null then
    insert into public.entrada_programa(slug_publico, nombre, detalle_richtext, activo)
    values (
      public.entrada_slugify(p_nombre) || '-' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 4),
      trim(p_nombre),
      coalesce(p_detalle_richtext, ''),
      coalesce(p_activo, true)
    )
    returning * into v_row;
  else
    update public.entrada_programa
      set nombre = trim(p_nombre),
          detalle_richtext = coalesce(p_detalle_richtext, ''),
          activo = coalesce(p_activo, true)
    where id = p_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

create or replace function public.entrada_admin_upsert_concierto(
  p_id bigint,
  p_ofrn_evento_id bigint,
  p_nombre text,
  p_detalle_richtext text,
  p_imagen_drive_url text,
  p_capacidad_maxima integer,
  p_reservas_habilitadas boolean default true,
  p_activo boolean default true
)
returns public.entrada_concierto
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.entrada_concierto;
  v_evento record;
  v_programa_row public.entrada_programa;
  v_lugar_nombre text;
  v_fecha_hora timestamptz;
begin
  if not public.entrada_is_admin(auth.uid()) then
    raise exception 'Sin permisos admin';
  end if;

  if p_capacidad_maxima < 1 then
    raise exception 'La capacidad debe ser mayor a cero';
  end if;

  select
    e.id,
    e.id_gira,
    e.fecha,
    e.hora_inicio,
    e.id_locacion,
    te.nombre as tipo_evento_nombre
  into v_evento
  from public.eventos e
  left join public.tipos_evento te on te.id = e.id_tipo_evento
  where e.id = p_ofrn_evento_id
    and coalesce(e.is_deleted, false) = false
    and e.deleted_at is null;

  if v_evento.id is null then
    raise exception 'Evento OFRN no encontrado';
  end if;

  if v_evento.id_gira is null then
    raise exception 'El evento no está vinculado a un programa OFRN';
  end if;

  if coalesce(v_evento.tipo_evento_nombre, '') !~* 'concierto' then
    raise exception 'El evento seleccionado no es de tipo concierto';
  end if;

  v_fecha_hora := ((v_evento.fecha::text || ' ' || coalesce(v_evento.hora_inicio::text, '00:00:00'))::timestamp) at time zone 'America/Argentina/Buenos_Aires';

  select l.nombre into v_lugar_nombre
  from public.locaciones l
  where l.id = v_evento.id_locacion;

  insert into public.entrada_programa (slug_publico, nombre, detalle_richtext, activo)
  values (
    'ofrn-programa-' || v_evento.id_gira::text,
    coalesce((select p.nomenclador from public.programas p where p.id = v_evento.id_gira), 'Programa OFRN ' || v_evento.id_gira::text),
    coalesce((select p.subtitulo from public.programas p where p.id = v_evento.id_gira), ''),
    true
  )
  on conflict (slug_publico) do update
  set
    nombre = excluded.nombre,
    detalle_richtext = excluded.detalle_richtext
  returning * into v_programa_row;

  if p_id is null then
    insert into public.entrada_concierto(
      programa_id,
      ofrn_programa_id,
      ofrn_evento_id,
      slug_publico,
      nombre,
      fecha_hora,
      lugar_nombre,
      detalle_richtext,
      imagen_drive_url,
      capacidad_maxima,
      reservas_habilitadas,
      activo
    )
    values (
      v_programa_row.id,
      v_evento.id_gira,
      v_evento.id,
      public.entrada_slugify(p_nombre) || '-' || substring(md5(random()::text || clock_timestamp()::text) from 1 for 4),
      trim(p_nombre),
      v_fecha_hora,
      v_lugar_nombre,
      coalesce(p_detalle_richtext, ''),
      nullif(trim(p_imagen_drive_url), ''),
      p_capacidad_maxima,
      coalesce(p_reservas_habilitadas, true),
      coalesce(p_activo, true)
    )
    returning * into v_row;
  else
    update public.entrada_concierto
      set programa_id = v_programa_row.id,
          ofrn_programa_id = v_evento.id_gira,
          ofrn_evento_id = v_evento.id,
          nombre = trim(p_nombre),
          fecha_hora = v_fecha_hora,
          lugar_nombre = v_lugar_nombre,
          detalle_richtext = coalesce(p_detalle_richtext, ''),
          imagen_drive_url = nullif(trim(p_imagen_drive_url), ''),
          capacidad_maxima = p_capacidad_maxima,
          reservas_habilitadas = coalesce(p_reservas_habilitadas, true),
          activo = coalesce(p_activo, true)
    where id = p_id
    returning * into v_row;
  end if;

  return v_row;
end;
$$;

alter table public.entrada_programa enable row level security;
alter table public.entrada_concierto enable row level security;
alter table public.entrada_usuario enable row level security;
alter table public.entrada_reserva enable row level security;
alter table public.entrada_reserva_entrada enable row level security;
alter table public.entrada_ingreso_evento enable row level security;

drop policy if exists "entrada programas lectura publica" on public.entrada_programa;
create policy "entrada programas lectura publica"
on public.entrada_programa
for select
using (activo = true or public.entrada_is_admin(auth.uid()));

drop policy if exists "entrada programas admin crud" on public.entrada_programa;
create policy "entrada programas admin crud"
on public.entrada_programa
for all
using (public.entrada_is_admin(auth.uid()))
with check (public.entrada_is_admin(auth.uid()));

drop policy if exists "entrada conciertos lectura publica" on public.entrada_concierto;
create policy "entrada conciertos lectura publica"
on public.entrada_concierto
for select
using (activo = true or public.entrada_is_admin(auth.uid()) or public.entrada_is_recepcion(auth.uid()));

drop policy if exists "entrada conciertos admin crud" on public.entrada_concierto;
create policy "entrada conciertos admin crud"
on public.entrada_concierto
for all
using (public.entrada_is_admin(auth.uid()))
with check (public.entrada_is_admin(auth.uid()));

drop policy if exists "entrada usuario lee propio" on public.entrada_usuario;
create policy "entrada usuario lee propio"
on public.entrada_usuario
for select
using (id = auth.uid() or public.entrada_is_admin(auth.uid()));

drop policy if exists "entrada usuario update propio" on public.entrada_usuario;
create policy "entrada usuario update propio"
on public.entrada_usuario
for update
using (id = auth.uid() or public.entrada_is_admin(auth.uid()))
with check (id = auth.uid() or public.entrada_is_admin(auth.uid()));

drop policy if exists "entrada usuario insert propio" on public.entrada_usuario;
create policy "entrada usuario insert propio"
on public.entrada_usuario
for insert
with check (id = auth.uid() or public.entrada_is_admin(auth.uid()));

drop policy if exists "entrada reservas select propias" on public.entrada_reserva;
create policy "entrada reservas select propias"
on public.entrada_reserva
for select
using (
  usuario_id = auth.uid()
  or public.entrada_is_admin(auth.uid())
  or public.entrada_is_recepcion(auth.uid())
);

drop policy if exists "entrada reservas insert propias" on public.entrada_reserva;
create policy "entrada reservas insert propias"
on public.entrada_reserva
for insert
with check (usuario_id = auth.uid() or public.entrada_is_admin(auth.uid()));

drop policy if exists "entrada reservas update admin" on public.entrada_reserva;
create policy "entrada reservas update admin"
on public.entrada_reserva
for update
using (public.entrada_is_admin(auth.uid()))
with check (public.entrada_is_admin(auth.uid()));

drop policy if exists "entrada reserva entrada select" on public.entrada_reserva_entrada;
create policy "entrada reserva entrada select"
on public.entrada_reserva_entrada
for select
using (
  exists (
    select 1 from public.entrada_reserva r
    where r.id = reserva_id
      and (
        r.usuario_id = auth.uid()
        or public.entrada_is_admin(auth.uid())
        or public.entrada_is_recepcion(auth.uid())
      )
  )
);

drop policy if exists "entrada reserva entrada update recepcion" on public.entrada_reserva_entrada;
create policy "entrada reserva entrada update recepcion"
on public.entrada_reserva_entrada
for update
using (public.entrada_is_recepcion(auth.uid()))
with check (public.entrada_is_recepcion(auth.uid()));

drop policy if exists "entrada ingreso evento select recepcion" on public.entrada_ingreso_evento;
create policy "entrada ingreso evento select recepcion"
on public.entrada_ingreso_evento
for select
using (public.entrada_is_recepcion(auth.uid()) or public.entrada_is_admin(auth.uid()));

drop policy if exists "entrada ingreso evento insert recepcion" on public.entrada_ingreso_evento;
create policy "entrada ingreso evento insert recepcion"
on public.entrada_ingreso_evento
for insert
with check (public.entrada_is_recepcion(auth.uid()) or public.entrada_is_admin(auth.uid()));

update public.entrada_usuario
set rol = 'admin'
where lower(email) = 'ofrn.archivo@gmail.com';
