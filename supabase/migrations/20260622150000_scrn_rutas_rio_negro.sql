-- Catálogo de rutas SCRN (corredores con paradas ordenadas) para Río Negro.
-- Permite consultar paradas intermedias válidas entre origen y destino, con empalmes en hubs.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table if not exists public.scrn_rutas (
  id bigint generated always as identity primary key,
  codigo text not null unique,
  nombre text not null,
  bidireccional boolean not null default true,
  activa boolean not null default true,
  notas text,
  created_at timestamptz not null default now()
);

comment on table public.scrn_rutas is
  'Corredores nombrados de transporte SCRN. Varias rutas pueden compartir localidades (empalme).';

create table if not exists public.scrn_ruta_paradas (
  id bigint generated always as identity primary key,
  id_ruta bigint not null references public.scrn_rutas (id) on delete cascade,
  id_localidad bigint not null references public.localidades (id),
  orden integer not null check (orden >= 1),
  es_parada_pasajeros boolean not null default true,
  unique (id_ruta, orden),
  unique (id_ruta, id_localidad)
);

create index if not exists scrn_ruta_paradas_ruta_idx
  on public.scrn_ruta_paradas (id_ruta, orden);

create index if not exists scrn_ruta_paradas_localidad_idx
  on public.scrn_ruta_paradas (id_localidad);

comment on table public.scrn_ruta_paradas is
  'Paradas ordenadas de cada corredor SCRN. es_parada_pasajeros=false excluye subida/bajada en UI futura.';

-- ---------------------------------------------------------------------------
-- RLS: lectura pública, escritura admin
-- ---------------------------------------------------------------------------

alter table public.scrn_rutas enable row level security;
alter table public.scrn_ruta_paradas enable row level security;

drop policy if exists scrn_rutas_select_all on public.scrn_rutas;
create policy scrn_rutas_select_all
  on public.scrn_rutas for select
  using (true);

drop policy if exists scrn_rutas_admin_write on public.scrn_rutas;
create policy scrn_rutas_admin_write
  on public.scrn_rutas for all
  using (
    exists (
      select 1 from public.scrn_perfiles p
      where p.id = auth.uid() and p.es_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.scrn_perfiles p
      where p.id = auth.uid() and p.es_admin = true
    )
  );

drop policy if exists scrn_ruta_paradas_select_all on public.scrn_ruta_paradas;
create policy scrn_ruta_paradas_select_all
  on public.scrn_ruta_paradas for select
  using (true);

drop policy if exists scrn_ruta_paradas_admin_write on public.scrn_ruta_paradas;
create policy scrn_ruta_paradas_admin_write
  on public.scrn_ruta_paradas for all
  using (
    exists (
      select 1 from public.scrn_perfiles p
      where p.id = auth.uid() and p.es_admin = true
    )
  )
  with check (
    exists (
      select 1 from public.scrn_perfiles p
      where p.id = auth.uid() and p.es_admin = true
    )
  );

-- ---------------------------------------------------------------------------
-- Vista de aristas del grafo (tramos consecutivos por ruta)
-- ---------------------------------------------------------------------------

create or replace view public.scrn_ruta_aristas as
select
  r.id as id_ruta,
  r.codigo,
  r.bidireccional,
  p1.id_localidad as id_localidad_origen,
  p2.id_localidad as id_localidad_destino,
  p1.orden as orden_origen,
  p2.orden as orden_destino
from public.scrn_rutas r
join public.scrn_ruta_paradas p1 on p1.id_ruta = r.id
join public.scrn_ruta_paradas p2
  on p2.id_ruta = r.id
  and p2.orden = p1.orden + 1
where r.activa = true
union all
select
  r.id as id_ruta,
  r.codigo,
  r.bidireccional,
  p2.id_localidad as id_localidad_origen,
  p1.id_localidad as id_localidad_destino,
  p2.orden as orden_origen,
  p1.orden as orden_destino
from public.scrn_rutas r
join public.scrn_ruta_paradas p1 on p1.id_ruta = r.id
join public.scrn_ruta_paradas p2
  on p2.id_ruta = r.id
  and p2.orden = p1.orden + 1
where r.activa = true
  and r.bidireccional = true;

comment on view public.scrn_ruta_aristas is
  'Aristas dirigidas entre paradas consecutivas; rutas bidireccionales incluyen ambos sentidos.';

-- ---------------------------------------------------------------------------
-- Resolver nombre de localidad → id (alias Bariloche, preferir Río Negro)
-- ---------------------------------------------------------------------------

create or replace function public.scrn_resolve_localidad_id(p_nombre text)
returns bigint
language sql
stable
as $$
  with norm as (
    select lower(trim(coalesce(p_nombre, ''))) as q
  ),
  bariloche as (
    select q from norm where q in ('bariloche', 'san carlos de bariloche')
  )
  select l.id
  from public.localidades l
  cross join norm n
  where
    (
      exists (select 1 from bariloche)
      and lower(trim(l.localidad)) in ('bariloche', 'san carlos de bariloche')
    )
    or (
      not exists (select 1 from bariloche)
      and lower(trim(l.localidad)) = n.q
    )
  order by
    case when lower(trim(l.localidad)) = 'san carlos de bariloche' then 0 else 1 end,
    case when l.id_provincia = 15 then 0 else 1 end,
    l.id
  limit 1;
$$;

comment on function public.scrn_resolve_localidad_id(text) is
  'Resuelve texto de localidad a id. Unifica alias Bariloche; prioriza filas de Río Negro (id_provincia=15).';

-- ---------------------------------------------------------------------------
-- Paradas entre origen y destino (pathfinding con empalmes)
-- ---------------------------------------------------------------------------

create or replace function public.scrn_paradas_entre(
  p_origen text,
  p_destino text,
  p_max_transbordos integer default 1
)
returns table (
  id_camino integer,
  id_localidad bigint,
  localidad text,
  orden_en_camino integer,
  id_ruta bigint,
  codigo_ruta text,
  transbordos integer
)
language plpgsql
stable
as $$
declare
  v_origen_id bigint;
  v_destino_id bigint;
begin
  v_origen_id := public.scrn_resolve_localidad_id(p_origen);
  v_destino_id := public.scrn_resolve_localidad_id(p_destino);

  if v_origen_id is null then
    raise exception 'Localidad de origen no encontrada: %', p_origen;
  end if;
  if v_destino_id is null then
    raise exception 'Localidad de destino no encontrada: %', p_destino;
  end if;
  if v_origen_id = v_destino_id then
    return query
    select
      1,
      l.id,
      l.localidad,
      1,
      null::bigint,
      null::text,
      0
    from public.localidades l
    where l.id = v_origen_id;
    return;
  end if;

  return query
  with recursive search as (
    select
      p.id_localidad as loc,
      p.id_ruta as ruta,
      0 as transbordos,
      array[p.id_localidad]::bigint[] as path_locs,
      array[p.id_ruta]::bigint[] as path_rutas_per_loc,
      array[(p.id_localidad::text || ':' || p.id_ruta::text)]::text[] as visited
    from public.scrn_ruta_paradas p
    join public.scrn_rutas r on r.id = p.id_ruta and r.activa
    where p.id_localidad = v_origen_id

    union all

    -- Caminar al tramo adyacente en la misma ruta
    select
      a.id_localidad_destino,
      s.ruta,
      s.transbordos,
      s.path_locs || a.id_localidad_destino,
      s.path_rutas_per_loc || s.ruta,
      s.visited || (a.id_localidad_destino::text || ':' || s.ruta::text)
    from search s
    join public.scrn_ruta_aristas a
      on a.id_ruta = s.ruta
      and a.id_localidad_origen = s.loc
    where
      not ((a.id_localidad_destino::text || ':' || s.ruta::text) = any (s.visited))
      and cardinality(s.path_locs) < 40
      and s.transbordos <= coalesce(p_max_transbordos, 1)

    union all

    -- Transbordo: misma localidad, otra ruta activa
    select
      s.loc,
      p2.id_ruta,
      s.transbordos + 1,
      s.path_locs,
      s.path_rutas_per_loc[1:cardinality(s.path_rutas_per_loc) - 1] || p2.id_ruta,
      s.visited || (s.loc::text || ':' || p2.id_ruta::text)
    from search s
    join public.scrn_ruta_paradas p2
      on p2.id_localidad = s.loc
      and p2.id_ruta <> s.ruta
    join public.scrn_rutas r2 on r2.id = p2.id_ruta and r2.activa
    where
      not ((s.loc::text || ':' || p2.id_ruta::text) = any (s.visited))
      and s.transbordos < coalesce(p_max_transbordos, 1)
      and cardinality(s.path_locs) < 40
  ),
  caminos as (
    select
      row_number() over (order by transbordos, cardinality(path_locs))::integer as id_camino,
      s.path_locs,
      s.path_rutas_per_loc,
      s.transbordos
    from search s
    where s.loc = v_destino_id
  ),
  expandido as (
    select
      c.id_camino,
      loc_id,
      gs.ord as orden_en_camino,
      c.transbordos,
      c.path_rutas_per_loc[gs.ord] as id_ruta
    from caminos c
    cross join lateral unnest(c.path_locs) with ordinality as gs(loc_id, ord)
  )
  select
    e.id_camino::integer,
    e.loc_id,
    l.localidad,
    e.orden_en_camino::integer,
    e.id_ruta,
    r.codigo,
    e.transbordos::integer
  from expandido e
  join public.localidades l on l.id = e.loc_id
  left join public.scrn_rutas r on r.id = e.id_ruta
  order by e.id_camino, e.orden_en_camino;
end;
$$;

comment on function public.scrn_paradas_entre(text, text, integer) is
  'Devuelve caminos posibles (paradas ordenadas) entre dos localidades usando el grafo de rutas SCRN.';

create or replace function public.scrn_paradas_intermedias(
  p_origen text,
  p_destino text,
  p_max_transbordos integer default 1
)
returns table (
  id_camino integer,
  id_localidad bigint,
  localidad text,
  orden_en_camino integer,
  id_ruta bigint,
  codigo_ruta text,
  transbordos integer
)
language sql
stable
as $$
  with base as (
    select * from public.scrn_paradas_entre(p_origen, p_destino, p_max_transbordos)
  ),
  bounds as (
    select b.id_camino, max(b.orden_en_camino) as max_ord
    from base b
    group by b.id_camino
  )
  select
    b.id_camino,
    b.id_localidad,
    b.localidad,
    b.orden_en_camino,
    b.id_ruta,
    b.codigo_ruta,
    b.transbordos
  from base b
  join bounds x on x.id_camino = b.id_camino
  where b.orden_en_camino > 1
    and b.orden_en_camino < x.max_ord;
$$;

comment on function public.scrn_paradas_intermedias(text, text, integer) is
  'Paradas estrictamente intermedias (excluye origen y destino) para cada camino posible.';

-- ---------------------------------------------------------------------------
-- Seed: corredores Río Negro (+ Neuquén tránsito)
-- ---------------------------------------------------------------------------

insert into public.scrn_rutas (codigo, nombre, notas)
values
  (
    'rn22_costa',
    'RN22 — Costa Atlántica',
    'Viedma a Río Colorado por la costa. Empalme con Alto Valle en Río Colorado y con Línea Sur en San Antonio Oeste.'
  ),
  (
    'rn22_alto_valle',
    'RN22 — Alto Valle',
    'Río Colorado al Alto Valle. Hub hacia Neuquén/Bariloche en Cipolletti.'
  ),
  (
    'cipolletti_bariloche',
    'Cipolletti — Neuquén — Bariloche',
    'Corredor vía RN237; incluye Neuquén (provincia 14) como nodo de tránsito.'
  ),
  (
    'linea_sur',
    'Línea Sur — Meseta',
    'Alternativa Viedma–Bariloche por San Antonio Oeste y la meseta.'
  ),
  (
    'rn237_el_bolson',
    'RN237 — El Bolsón',
    'Rama andina Bariloche ↔ El Bolsón.'
  )
on conflict (codigo) do update set
  nombre = excluded.nombre,
  notas = excluded.notas,
  activa = true;

-- Helper inline: insert paradas por nombre de localidad
create or replace function pg_temp._scrn_seed_ruta_paradas(
  p_codigo text,
  p_nombres text[]
)
returns void
language plpgsql
as $$
declare
  v_id_ruta bigint;
  v_nombre text;
  v_orden integer := 0;
  v_id_loc bigint;
begin
  select id into v_id_ruta from public.scrn_rutas where codigo = p_codigo;
  if v_id_ruta is null then
    raise exception 'Ruta no encontrada: %', p_codigo;
  end if;

  delete from public.scrn_ruta_paradas where id_ruta = v_id_ruta;

  foreach v_nombre in array p_nombres loop
    v_orden := v_orden + 1;
    v_id_loc := public.scrn_resolve_localidad_id(v_nombre);
    if v_id_loc is null then
      raise exception 'Localidad no encontrada para ruta %: %', p_codigo, v_nombre;
    end if;
    insert into public.scrn_ruta_paradas (id_ruta, id_localidad, orden)
    values (v_id_ruta, v_id_loc, v_orden);
  end loop;
end;
$$;

select pg_temp._scrn_seed_ruta_paradas(
  'rn22_costa',
  array[
    'Viedma',
    'Villa Manzano',
    'Guardia Mitre',
    'Las Grutas',
    'San Antonio Oeste',
    'Sierra Grande',
    'Río Colorado'
  ]
);

select pg_temp._scrn_seed_ruta_paradas(
  'rn22_alto_valle',
  array[
    'Río Colorado',
    'Choele Choel',
    'Lamarque',
    'Catriel',
    'Villa Regina',
    'Cipolletti',
    'Allen',
    'General Roca'
  ]
);

select pg_temp._scrn_seed_ruta_paradas(
  'cipolletti_bariloche',
  array[
    'Cipolletti',
    'Neuquén',
    'Dina Huapi',
    'San Carlos de Bariloche'
  ]
);

select pg_temp._scrn_seed_ruta_paradas(
  'linea_sur',
  array[
    'San Antonio Oeste',
    'Sierra Colorada',
    'Valcheta',
    'Los Menucos',
    'Ing. Jacobacci',
    'Maquinchao',
    'Pilcaniyeu',
    'Dina Huapi',
    'San Carlos de Bariloche'
  ]
);

select pg_temp._scrn_seed_ruta_paradas(
  'rn237_el_bolson',
  array[
    'San Carlos de Bariloche',
    'Dina Huapi',
    'El Bolsón'
  ]
);
