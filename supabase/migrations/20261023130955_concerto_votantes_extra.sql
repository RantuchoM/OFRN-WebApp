-- Votantes invitados por instancia (fase).
-- No son el electorado estable de la gira: un admin o editor los suma a mano
-- desde el listado general, y solo votan en esa instancia.

create table public.concerto_instancia_votantes (
  id_instancia bigint not null references public.concerto_instancias (id) on delete cascade,
  id_integrante bigint not null references public.integrantes (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (id_instancia, id_integrante)
);

create index concerto_instancia_votantes_integrante_idx
  on public.concerto_instancia_votantes (id_integrante);

comment on table public.concerto_instancia_votantes is
  'Votantes agregados a mano a una instancia. No son músicos estables. Ven el menú y votan solo en esa instancia.';

alter table public.concerto_instancia_votantes enable row level security;

grant select, insert, delete on public.concerto_instancia_votantes to anon, authenticated;

create policy concerto_instancia_votantes_rw
  on public.concerto_instancia_votantes
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------------
-- Solo músicos reales que no son estables.
-- ---------------------------------------------------------------------------

create or replace function public.concerto_validar_votante_extra()
returns trigger
language plpgsql
set search_path = public
as $func$
declare
  v_condicion text;
  v_simulacion boolean;
begin
  select i.condicion::text, coalesce(i.es_simulacion, false)
  into v_condicion, v_simulacion
  from public.integrantes i
  where i.id = new.id_integrante;

  if not found then
    raise exception 'El músico no existe.';
  end if;

  if v_simulacion then
    raise exception 'Una vacante no puede votar.';
  end if;

  if lower(btrim(coalesce(v_condicion, ''))) = 'estable' then
    raise exception 'Los músicos estables ya votan por la convocatoria de la gira.';
  end if;

  return new;
end;
$func$;

comment on function public.concerto_validar_votante_extra() is
  'Rechaza vacantes y músicos estables en concerto_instancia_votantes.';

revoke all on function public.concerto_validar_votante_extra() from public, anon, authenticated;

create trigger concerto_instancia_votantes_validar
  before insert or update of id_integrante
  on public.concerto_instancia_votantes
  for each row
  execute function public.concerto_validar_votante_extra();

create or replace function public.concerto_soltar_votante_extra_si_estable()
returns trigger
language plpgsql
set search_path = public
as $func$
begin
  if lower(btrim(coalesce(new.condicion::text, ''))) = 'estable'
     or coalesce(new.es_simulacion, false) then
    delete from public.concerto_instancia_votantes
    where id_integrante = new.id;
  end if;
  return new;
end;
$func$;

comment on function public.concerto_soltar_votante_extra_si_estable() is
  'Si la persona pasa a estable o a vacante, deja de ser votante invitado.';

revoke all on function public.concerto_soltar_votante_extra_si_estable() from public, anon, authenticated;

create trigger concerto_integrantes_soltar_votante_extra
  after update of condicion, es_simulacion
  on public.integrantes
  for each row
  when (
    lower(btrim(coalesce(new.condicion::text, '')))
      is distinct from lower(btrim(coalesce(old.condicion::text, '')))
    or coalesce(new.es_simulacion, false) is distinct from coalesce(old.es_simulacion, false)
  )
  execute function public.concerto_soltar_votante_extra_si_estable();

-- Al fusionar fichas, la invitación sigue a la persona que queda.
do $patch$
declare
  src text;
  marker text := 'DELETE FROM public.integrantes WHERE id = p_source_id;';
  moved text := $sql$PERFORM public.merge_integrantes_move_scalar_fk('concerto_instancia_votantes', 'id_integrante', p_source_id, p_target_id, ARRAY['id_instancia']);
  DELETE FROM public.integrantes WHERE id = p_source_id;$sql$;
begin
  src := pg_get_functiondef('public.merge_integrantes(bigint, bigint)'::regprocedure);
  if src like '%concerto_instancia_votantes%' then
    return;
  end if;
  if position(marker in src) = 0 then
    raise exception 'merge_integrantes: no se encontró el DELETE final del integrante';
  end if;
  src := replace(src, marker, moved);
  execute src;
end;
$patch$;

-- ---------------------------------------------------------------------------
-- Boleta: estable convocado, o votante invitado de esta instancia.
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
  v_es_estable boolean;
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

  if v_ids is null or cardinality(v_ids) = 0 then
    return jsonb_build_object('ok', false, 'error', 'La boleta es inválida.');
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

  select exists (
    select 1
    from public.integrantes i
    where i.id = p_id_votante
      and i.condicion::text ilike 'estable'
      and i.es_simulacion is not true
  )
  into v_es_estable;

  if not v_es_estable and not exists (
    select 1
    from public.concerto_instancia_votantes v
    where v.id_instancia = p_id_instancia
      and v.id_integrante = p_id_votante
  ) then
    return jsonb_build_object('ok', false, 'error', 'El votante no está habilitado para esta instancia.');
  end if;

  if v_es_estable and exists (
    select 1
    from public.giras_integrantes gi
    where gi.id_gira = v_inst.id_gira
      and gi.id_integrante = p_id_votante
      and lower(coalesce(gi.estado, '')) = 'ausente'
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
  ) then
    return jsonb_build_object('ok', false, 'error', 'Hay un participante que no se puede puntuar.');
  end if;

  if exists (
    select 1
    from unnest(v_scores) as s(puntaje)
    where s.puntaje is null
       or not (s.puntaje = any (v_escala))
  ) then
    return jsonb_build_object('ok', false, 'error', 'Hay un puntaje fuera de la escala.');
  end if;

  insert into public.concerto_votos (id_instancia, id_votante, id_participante, puntaje)
  select p_id_instancia, p_id_votante, u.id_participante, u.puntaje
  from unnest(v_ids, v_scores) as u(id_participante, puntaje)
  on conflict (id_instancia, id_votante, id_participante)
  do update set
    puntaje = excluded.puntaje,
    updated_at = now();

  return jsonb_build_object('ok', true, 'error', null);
exception
  when check_violation or unique_violation then
    return jsonb_build_object('ok', false, 'error', 'No se pudo guardar la boleta.');
end;
$func$;

comment on function public.concerto_guardar_boleta(bigint, bigint, jsonb) is
  'Upsert de uno o más puntajes. No borra el resto de la boleta. Habilita a un estable no vacante que no figure ausente en giras_integrantes, o a un votante invitado de esta instancia. Quién está convocado entre los estables lo decide el cliente con fetchRosterForGira.';

create or replace function public.concerto_borrar_puntaje(
  p_id_votante bigint,
  p_id_instancia bigint,
  p_id_participante bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func$
declare
  v_inst public.concerto_instancias;
  v_deleted integer;
  v_es_estable boolean;
begin
  select *
  into v_inst
  from public.concerto_instancias
  where id = p_id_instancia
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'La instancia no existe.');
  end if;

  if v_inst.abre_en is null
     or v_inst.cierra_en is null
     or now() < v_inst.abre_en
     or now() > v_inst.cierra_en then
    return jsonb_build_object('ok', false, 'error', 'La votación no está abierta.');
  end if;

  select exists (
    select 1
    from public.integrantes i
    where i.id = p_id_votante
      and i.condicion::text ilike 'estable'
      and i.es_simulacion is not true
  )
  into v_es_estable;

  if not v_es_estable and not exists (
    select 1
    from public.concerto_instancia_votantes v
    where v.id_instancia = p_id_instancia
      and v.id_integrante = p_id_votante
  ) then
    return jsonb_build_object('ok', false, 'error', 'El votante no está habilitado para esta instancia.');
  end if;

  delete from public.concerto_votos
  where id_instancia = p_id_instancia
    and id_votante = p_id_votante
    and id_participante = p_id_participante;

  get diagnostics v_deleted = row_count;

  if v_deleted = 0 then
    return jsonb_build_object('ok', false, 'error', 'No hay un puntaje para borrar.');
  end if;

  return jsonb_build_object('ok', true, 'error', null);
end;
$func$;

comment on function public.concerto_borrar_puntaje(bigint, bigint, bigint) is
  'Borra el puntaje de un votante para un participante. Solo si la ventana está abierta y el votante es estable no vacante o votante invitado de esa instancia.';

notify pgrst, 'reload schema';
