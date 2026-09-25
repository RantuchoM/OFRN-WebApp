-- Un click guarda ese puntaje. No borra el resto de la boleta del votante.
-- concerto_promedios no cambia: solo entran boletas completas.

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

  if not exists (
    select 1
    from public.integrantes i
    where i.id = p_id_votante
      and i.condicion::text ilike 'estable'
      and i.es_simulacion is not true
  ) then
    return jsonb_build_object('ok', false, 'error', 'El votante no está habilitado para esta instancia.');
  end if;

  if exists (
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
  'Upsert de uno o más puntajes. No borra el resto de la boleta. Exige estable y no vacante, y rechaza ausente en giras_integrantes. Quién está convocado lo decide el cliente con fetchRosterForGira. El promedio sigue en concerto_promedios y solo cuenta boletas completas.';
