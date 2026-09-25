-- Votación Concerto Competition.
-- Configuración (ediciones, instancias, participantes) legible y escribible por la intranet.
-- Los votos no tienen privilegios para anon/authenticated/public: solo entran por funciones security definer.

-- ---------------------------------------------------------------------------
-- Tablas
-- ---------------------------------------------------------------------------

create table public.concerto_ediciones (
  id bigint generated always as identity primary key,
  nombre text not null,
  visible_desde timestamptz not null,
  visible_hasta timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.concerto_instancias (
  id bigint generated always as identity primary key,
  id_edicion bigint not null references public.concerto_ediciones (id) on delete cascade,
  id_gira bigint references public.programas (id),
  titulo text not null default '',
  abre_en timestamptz,
  cierra_en timestamptz,
  orden integer not null default 0
);

create table public.concerto_participantes (
  id bigint generated always as identity primary key,
  id_instancia bigint not null references public.concerto_instancias (id) on delete cascade,
  obra text not null default '',
  orden integer not null default 0
);

create table public.concerto_participante_integrantes (
  id_participante bigint not null references public.concerto_participantes (id) on delete cascade,
  id_integrante bigint not null references public.integrantes (id),
  primary key (id_participante, id_integrante)
);

create table public.concerto_votos (
  id bigint generated always as identity primary key,
  id_instancia bigint not null references public.concerto_instancias (id) on delete cascade,
  id_votante bigint not null references public.integrantes (id),
  id_participante bigint not null references public.concerto_participantes (id) on delete cascade,
  puntaje numeric(3, 1) not null,
  updated_at timestamptz not null default now(),
  unique (id_instancia, id_votante, id_participante),
  check (puntaje in (7, 7.5, 8, 8.5, 9, 9.5, 10))
);

create index concerto_instancias_edicion_idx
  on public.concerto_instancias (id_edicion);

create index concerto_instancias_gira_idx
  on public.concerto_instancias (id_gira);

create index concerto_participantes_instancia_idx
  on public.concerto_participantes (id_instancia, orden);

create index concerto_participante_integrantes_integrante_idx
  on public.concerto_participante_integrantes (id_integrante);

create index concerto_votos_instancia_idx
  on public.concerto_votos (id_instancia);

comment on table public.concerto_ediciones is
  'Ediciones de Concerto Competition y ventana de visibilidad en la intranet.';
comment on table public.concerto_instancias is
  'Instancias de votación. Sin abre_en/cierra_en la boleta permanece cerrada.';
comment on table public.concerto_participantes is
  'Participantes de una instancia. El dúo es una sola fila.';
comment on table public.concerto_participante_integrantes is
  'Integrantes vinculados a un participante. Quien figura acá no puede puntuarse.';
comment on table public.concerto_votos is
  'Boletas. Sin acceso directo para anon, authenticated ni public.';

-- ---------------------------------------------------------------------------
-- Privilegios
-- ---------------------------------------------------------------------------

alter table public.concerto_ediciones enable row level security;
alter table public.concerto_instancias enable row level security;
alter table public.concerto_participantes enable row level security;
alter table public.concerto_participante_integrantes enable row level security;
alter table public.concerto_votos enable row level security;

grant select, insert, update, delete on public.concerto_ediciones to anon, authenticated;
grant select, insert, update, delete on public.concerto_instancias to anon, authenticated;
grant select, insert, update, delete on public.concerto_participantes to anon, authenticated;
grant select, insert, update, delete on public.concerto_participante_integrantes to anon, authenticated;

grant usage, select on sequence public.concerto_ediciones_id_seq to anon, authenticated;
grant usage, select on sequence public.concerto_instancias_id_seq to anon, authenticated;
grant usage, select on sequence public.concerto_participantes_id_seq to anon, authenticated;

revoke all on table public.concerto_votos from public, anon, authenticated;
revoke all on sequence public.concerto_votos_id_seq from public, anon, authenticated;

create policy concerto_ediciones_rw
  on public.concerto_ediciones
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy concerto_instancias_rw
  on public.concerto_instancias
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy concerto_participantes_rw
  on public.concerto_participantes
  for all
  to anon, authenticated
  using (true)
  with check (true);

create policy concerto_participante_integrantes_rw
  on public.concerto_participante_integrantes
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Funciones
-- ---------------------------------------------------------------------------

create or replace function public.concerto_guardar_boleta(
  p_id_votante bigint,
  p_id_instancia bigint,
  p_puntajes jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
#variable_conflict use_column
declare
  v_inst public.concerto_instancias;
  v_ids bigint[];
  v_scores numeric[];
  v_escala numeric[] := array[7, 7.5, 8, 8.5, 9, 9.5, 10]::numeric[];
begin
  if p_puntajes is null or jsonb_typeof(p_puntajes) <> 'array' then
    return jsonb_build_object('ok', false, 'error', 'La boleta es inválida.');
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_puntajes) as elem
    where jsonb_typeof(elem) <> 'object'
       or jsonb_typeof(elem -> 'id_participante') not in ('number', 'string')
       or jsonb_typeof(elem -> 'puntaje') not in ('number', 'string')
  ) then
    return jsonb_build_object('ok', false, 'error', 'La boleta es inválida.');
  end if;

  begin
    select
      coalesce(array_agg(src.id_participante order by src.ord), '{}'::bigint[]),
      coalesce(array_agg(src.puntaje order by src.ord), '{}'::numeric[])
    into v_ids, v_scores
    from (
      select
        t.ord,
        (t.elem ->> 'id_participante')::bigint as id_participante,
        (t.elem ->> 'puntaje')::numeric as puntaje
      from jsonb_array_elements(p_puntajes) with ordinality as t(elem, ord)
    ) as src;
  exception
    when invalid_text_representation or numeric_value_out_of_range then
      return jsonb_build_object('ok', false, 'error', 'La boleta es inválida.');
  end;

  if v_ids is null then
    v_ids := '{}'::bigint[];
    v_scores := '{}'::numeric[];
  end if;

  select *
  into v_inst
  from public.concerto_instancias
  where id = p_id_instancia
  for update;

  if not found or v_inst.id_gira is null then
    return jsonb_build_object('ok', false, 'error', 'La instancia no existe o no tiene gira asociada.');
  end if;

  if v_inst.abre_en is null
     or v_inst.cierra_en is null
     or now() < v_inst.abre_en
     or now() > v_inst.cierra_en then
    return jsonb_build_object('ok', false, 'error', 'La votación no está abierta.');
  end if;

  if not exists (
    select 1
    from public.integrantes i
    where i.id = p_id_votante
      and i.condicion::text ilike 'estable'
      and i.es_simulacion is not true
      and exists (
        select 1
        from public.giras_integrantes gi
        where gi.id_gira = v_inst.id_gira
          and gi.id_integrante = i.id
          and coalesce(lower(gi.estado), '') <> 'ausente'
      )
  ) then
    return jsonb_build_object('ok', false, 'error', 'El votante no está habilitado para esta instancia.');
  end if;

  if (
    select count(*) from unnest(v_ids) as pid(id_participante)
  ) <> (
    select count(distinct pid.id_participante) from unnest(v_ids) as pid(id_participante)
  ) then
    return jsonb_build_object('ok', false, 'error', 'La boleta es inválida.');
  end if;

  if exists (
    select 1
    from unnest(v_ids) as pid(id_participante)
    join public.concerto_participante_integrantes pi
      on pi.id_participante = pid.id_participante
     and pi.id_integrante = p_id_votante
  ) then
    return jsonb_build_object('ok', false, 'error', 'No se puede puntuar un participante vinculado al votante.');
  end if;

  if exists (
    select pid.id_participante
    from unnest(v_ids) as pid(id_participante)
    except
    select p.id
    from public.concerto_participantes p
    where p.id_instancia = p_id_instancia
      and not exists (
        select 1
        from public.concerto_participante_integrantes pi
        where pi.id_participante = p.id
          and pi.id_integrante = p_id_votante
      )
  ) or exists (
    select p.id
    from public.concerto_participantes p
    where p.id_instancia = p_id_instancia
      and not exists (
        select 1
        from public.concerto_participante_integrantes pi
        where pi.id_participante = p.id
          and pi.id_integrante = p_id_votante
      )
    except
    select pid.id_participante
    from unnest(v_ids) as pid(id_participante)
  ) then
    return jsonb_build_object('ok', false, 'error', 'La boleta debe puntuar exactamente a los participantes habilitados.');
  end if;

  if exists (
    select 1
    from unnest(v_scores) as s(puntaje)
    where s.puntaje is null
       or not (s.puntaje = any (v_escala))
  ) then
    return jsonb_build_object('ok', false, 'error', 'Hay un puntaje fuera de la escala.');
  end if;

  delete from public.concerto_votos
  where id_instancia = p_id_instancia
    and id_votante = p_id_votante;

  insert into public.concerto_votos (id_instancia, id_votante, id_participante, puntaje)
  select p_id_instancia, p_id_votante, u.id_participante, u.puntaje
  from unnest(v_ids, v_scores) as u(id_participante, puntaje);

  return jsonb_build_object('ok', true, 'error', null);
exception
  when check_violation or unique_violation then
    return jsonb_build_object('ok', false, 'error', 'No se pudo guardar la boleta.');
end;
$func$;

create or replace function public.concerto_mi_boleta(
  p_id_votante bigint,
  p_id_instancia bigint
)
returns table (id_participante bigint, puntaje numeric)
language sql
stable
security definer
set search_path = public
as $func$
  select v.id_participante, v.puntaje
  from public.concerto_votos v
  where v.id_votante = p_id_votante
    and v.id_instancia = p_id_instancia
  order by v.id_participante;
$func$;

create or replace function public.concerto_promedios(
  p_id_viewer bigint,
  p_id_instancia bigint
)
returns table (id_participante bigint, promedio numeric, cantidad integer)
language plpgsql
stable
security definer
set search_path = public
as $func$
#variable_conflict use_column
begin
  if not exists (
    select 1
    from public.integrantes i
    cross join lateral unnest(coalesce(i.rol_sistema, '{}'::text[])) as rol(valor)
    where i.id = p_id_viewer
      and lower(rol.valor) in ('admin', 'editor')
  ) then
    raise exception 'No autorizado para ver promedios.'
      using errcode = '42501';
  end if;

  return query
  with participantes as (
    select p.id, p.orden
    from public.concerto_participantes p
    where p.id_instancia = p_id_instancia
  ),
  votantes as (
    select distinct v.id_votante
    from public.concerto_votos v
    where v.id_instancia = p_id_instancia
  ),
  requeridos as (
    select vt.id_votante, p.id as id_req
    from votantes vt
    cross join participantes p
    where not exists (
      select 1
      from public.concerto_participante_integrantes pi
      where pi.id_participante = p.id
        and pi.id_integrante = vt.id_votante
    )
  ),
  completas as (
    select r.id_votante
    from requeridos r
    left join public.concerto_votos v
      on v.id_instancia = p_id_instancia
     and v.id_votante = r.id_votante
     and v.id_participante = r.id_req
    group by r.id_votante
    having count(v.id) = count(*)
  )
  select
    p.id,
    avg(v.puntaje),
    count(v.id)::integer
  from participantes p
  left join public.concerto_votos v
    on v.id_instancia = p_id_instancia
   and v.id_participante = p.id
   and v.id_votante in (select c.id_votante from completas c)
   and not exists (
     select 1
     from public.concerto_participante_integrantes pi
     where pi.id_participante = v.id_participante
       and pi.id_integrante = v.id_votante
   )
  group by p.id, p.orden
  order by p.orden, p.id;
end;
$func$;

revoke all on function public.concerto_guardar_boleta(bigint, bigint, jsonb) from public;
revoke all on function public.concerto_mi_boleta(bigint, bigint) from public;
revoke all on function public.concerto_promedios(bigint, bigint) from public;

grant execute on function public.concerto_guardar_boleta(bigint, bigint, jsonb) to anon, authenticated;
grant execute on function public.concerto_mi_boleta(bigint, bigint) to anon, authenticated;
grant execute on function public.concerto_promedios(bigint, bigint) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Semilla (helpers locales, se eliminan al final)
-- ---------------------------------------------------------------------------

create or replace function public._concerto_fold(p_text text)
returns text
language sql
immutable
set search_path = public
as $func$
  select translate(
    coalesce(p_text, ''),
    'ÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇÝŸáàäâãéèëêíìïîóòöôõúùüûñçýÿABCDEFGHIJKLMNOPQRSTUVWXYZ',
    'aaaaaeeeeiiiiooooouuuuncyyaaaaaeeeeiiiiooooouuuuncyyabcdefghijklmnopqrstuvwxyz'
  );
$func$;

create or replace function public._concerto_pick_gira(p_patrones text[])
returns bigint
language sql
stable
set search_path = public
as $func$
  select case when count(*) = 1 then min(p.id) else null::bigint end
  from public.programas p
  where exists (
    select 1
    from unnest(coalesce(p_patrones, '{}'::text[])) as pat(pattern)
    where p.nombre_gira ilike pat.pattern
       or coalesce(p.nomenclador, '') ilike pat.pattern
  );
$func$;

create or replace function public._concerto_pick_integrante(p_nombre text, p_apellido text)
returns bigint
language plpgsql
stable
set search_path = public
as $func$
declare
  v_nombre text := public._concerto_fold(p_nombre);
  v_apellido text := public._concerto_fold(p_apellido);
  v_estables integer;
  v_total integer;
  v_id bigint;
begin
  if v_nombre = '' or v_apellido = '' then
    return null;
  end if;

  select
    count(*) filter (where i.condicion::text ilike 'estable'),
    count(*)
  into v_estables, v_total
  from public.integrantes i
  where i.es_simulacion is not true
    and public._concerto_fold(i.nombre) like '%' || v_nombre || '%'
    and public._concerto_fold(i.apellido) like '%' || v_apellido || '%';

  if v_estables = 1 then
    select i.id
    into v_id
    from public.integrantes i
    where i.es_simulacion is not true
      and i.condicion::text ilike 'estable'
      and public._concerto_fold(i.nombre) like '%' || v_nombre || '%'
      and public._concerto_fold(i.apellido) like '%' || v_apellido || '%'
    limit 1;
    return v_id;
  end if;

  if v_estables = 0 and v_total = 1 then
    select i.id
    into v_id
    from public.integrantes i
    where i.es_simulacion is not true
      and public._concerto_fold(i.nombre) like '%' || v_nombre || '%'
      and public._concerto_fold(i.apellido) like '%' || v_apellido || '%'
    limit 1;
    return v_id;
  end if;

  return null;
end;
$func$;

do $seed$
declare
  v_edicion bigint;
  v_inst bigint;
  v_part bigint;
  v_int bigint;
  v_inst_def jsonb;
  v_item jsonb;
  v_persona jsonb;
begin
  insert into public.concerto_ediciones (nombre, visible_desde, visible_hasta)
  values (
    'Concerto Competition 2026',
    timestamptz '2026-09-01 00:00:00-03',
    timestamptz '2026-11-30 23:59:00-03'
  )
  returning id into v_edicion;

  for v_inst_def in
    select value
    from jsonb_array_elements($json$[
      {
        "titulo": "La Fuerza del Legado",
        "orden": 1,
        "patrones": ["%fuerza del legado%"],
        "participantes": [
          {"orden": 1, "obra": "concierto para corno y orquesta de Reinhold Glière", "personas": [{"nombre": "Jorge", "apellido": "Montoya"}]},
          {"orden": 2, "obra": "Sinfonía española de Lalo", "personas": [{"nombre": "Sofía", "apellido": "Acosta"}]},
          {"orden": 3, "obra": "Concierto n.º 2 para violín y orquesta de Wieniawski", "personas": [{"nombre": "Joel", "apellido": "Saltrón"}]},
          {"orden": 4, "obra": "Concierto en do menor de J. Christian Bach / H. Casadesus", "personas": [{"nombre": "Arturo", "apellido": "Ibáñez"}]},
          {"orden": 5, "obra": "Haydn en do mayor", "personas": [{"nombre": "Oswaldo", "apellido": "Corro"}]},
          {"orden": 6, "obra": "Romanza para violín y orquesta n.º 2 de Beethoven en fa mayor", "personas": [{"nombre": "Enzo", "apellido": "Maldonado"}]}
        ]
      },
      {
        "titulo": "Brillo y Tempestad",
        "orden": 2,
        "patrones": ["%brillo y tempestad%"],
        "participantes": [
          {"orden": 1, "obra": "Concierto para violín en mi menor op. 64 de Mendelssohn", "personas": [{"nombre": "Nahuel", "apellido": "Godoy"}]},
          {"orden": 2, "obra": "Kol Nidrei de Max Bruch", "personas": [{"nombre": "Pablo", "apellido": "Díaz"}]},
          {"orden": 3, "obra": "Suite orquestal n.º 2 en si menor BWV 1067 de Bach", "personas": [{"nombre": "Nataly", "apellido": "Bustamante"}]},
          {"orden": 4, "obra": "Mozart para oboe (do mayor)", "personas": [{"nombre": "Martín", "apellido": "Katz"}]},
          {"orden": 5, "obra": "Concierto para flauta en sol mayor de W. A. Mozart", "personas": [{"nombre": "Leo", "apellido": "Spelzini"}]},
          {"orden": 6, "obra": "Concierto para fagot de Carl Maria von Weber en fa mayor", "personas": [{"nombre": "Tamara", "apellido": "Santander"}]}
        ]
      },
      {
        "titulo": "Réquiem de Mozart",
        "orden": 3,
        "patrones": ["%requiem%", "%réquiem%"],
        "participantes": [
          {"orden": 1, "obra": "Concierto para trompeta, trombón y orquesta de Jan Koetsier", "personas": [{"nombre": "Gastón", "apellido": "Basegio"}, {"nombre": "Luciana", "apellido": "Hernández"}]},
          {"orden": 2, "obra": "Concierto para trompeta de Haydn", "personas": [{"nombre": "Jair", "apellido": "Rodríguez"}]},
          {"orden": 3, "obra": "Dvořák para cello y orquesta", "personas": [{"nombre": "Nahuel", "apellido": "Rodríguez"}]}
        ]
      }
    ]$json$::jsonb)
  loop
    insert into public.concerto_instancias (
      id_edicion, id_gira, titulo, abre_en, cierra_en, orden
    )
    values (
      v_edicion,
      public._concerto_pick_gira(
        array(select jsonb_array_elements_text(v_inst_def -> 'patrones'))
      ),
      v_inst_def ->> 'titulo',
      null,
      null,
      (v_inst_def ->> 'orden')::integer
    )
    returning id into v_inst;

    for v_item in
      select value
      from jsonb_array_elements(v_inst_def -> 'participantes')
    loop
      insert into public.concerto_participantes (id_instancia, obra, orden)
      values (v_inst, v_item ->> 'obra', (v_item ->> 'orden')::integer)
      returning id into v_part;

      for v_persona in
        select value
        from jsonb_array_elements(v_item -> 'personas')
      loop
        v_int := public._concerto_pick_integrante(
          v_persona ->> 'nombre',
          v_persona ->> 'apellido'
        );
        if v_int is not null then
          insert into public.concerto_participante_integrantes (id_participante, id_integrante)
          values (v_part, v_int)
          on conflict do nothing;
        end if;
      end loop;
    end loop;
  end loop;
end
$seed$;

drop function public._concerto_pick_integrante(text, text);
drop function public._concerto_pick_gira(text[]);
drop function public._concerto_fold(text);

notify pgrst, 'reload schema';
