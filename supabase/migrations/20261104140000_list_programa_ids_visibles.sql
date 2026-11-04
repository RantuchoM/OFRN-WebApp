-- Visibilidad de programas para listado personal (espejo del filter JS en useGirasList).
-- No recrea useGiraRoster: solo responde "¿este programa es visible para este integrante?".

create or replace function public.membership_active_on_program_date(
  p_fecha_desde date,
  p_fecha_hasta date,
  p_ref date
) returns boolean
language sql
immutable
as $$
  select
    p_ref is not null
    and p_fecha_desde is not null
    and p_fecha_desde <= p_ref
    and (p_fecha_hasta is null or p_fecha_hasta >= p_ref);
$$;

comment on function public.membership_active_on_program_date(date, date, date) is
  'Membresía de ensamble activa en el día ref (igual que membershipActiveOnProgramDate en JS).';

create or replace function public.programa_visible_para_integrante(
  p_programa_id bigint,
  p_integrante_id bigint,
  p_coord_ensamble_ids bigint[] default '{}'::bigint[],
  p_incluir_ausente_con_abono boolean default false
) returns boolean
language plpgsql
stable
as $$
declare
  v_override_estado text;
  v_abona_reemplazo boolean;
  v_abona_licencia boolean;
  v_prog_ref date;
  v_familia text;
  v_condicion text;
  v_familia_ok boolean;
  v_included boolean := false;
  v_excl_hit boolean := false;
begin
  if p_programa_id is null or p_integrante_id is null then
    return false;
  end if;

  select gi.estado, coalesce(gi.abona_reemplazo, false), coalesce(gi.abona_licencia, false)
  into v_override_estado, v_abona_reemplazo, v_abona_licencia
  from public.giras_integrantes gi
  where gi.id_gira = p_programa_id
    and gi.id_integrante = p_integrante_id
  limit 1;

  if found then
    if v_override_estado = 'ausente' then
      if p_incluir_ausente_con_abono and (v_abona_reemplazo or v_abona_licencia) then
        return true;
      end if;
      return false;
    end if;
    return true;
  end if;

  select p.fecha_desde into v_prog_ref
  from public.programas p
  where p.id = p_programa_id;

  select lower(trim(i.condicion::text)), instr.familia
  into v_condicion, v_familia
  from public.integrantes i
  left join public.instrumentos instr on instr.id::text = i.id_instr::text
  where i.id = p_integrante_id;

  if not found then
    return false;
  end if;

  v_familia_ok := v_condicion in ('estable', 'contratado');

  select exists (
    select 1
    from public.giras_fuentes gf
    where gf.id_gira = p_programa_id
      and (
        (
          gf.tipo = 'ENSAMBLE'
          and gf.valor_id is not null
          and (
            gf.valor_id = any (coalesce(p_coord_ensamble_ids, '{}'::bigint[]))
            or exists (
              select 1
              from public.integrantes_ensambles ie
              where ie.id_integrante = p_integrante_id
                and ie.id_ensamble = gf.valor_id
                and public.membership_active_on_program_date(
                  ie.fecha_desde, ie.fecha_hasta, v_prog_ref
                )
            )
          )
        )
        or (
          gf.tipo = 'FAMILIA'
          and v_familia_ok
          and gf.valor_texto is not null
          and gf.valor_texto = v_familia
        )
      )
  ) into v_included;

  if not v_included then
    return false;
  end if;

  select exists (
    select 1
    from public.giras_fuentes gf
    join public.integrantes_ensambles ie
      on ie.id_integrante = p_integrante_id
     and ie.id_ensamble = gf.valor_id
    where gf.id_gira = p_programa_id
      and gf.tipo = 'EXCL_ENSAMBLE'
      and gf.valor_id is not null
      and public.membership_active_on_program_date(
        ie.fecha_desde, ie.fecha_hasta, v_prog_ref
      )
  ) into v_excl_hit;

  return not v_excl_hit;
end;
$$;

comment on function public.programa_visible_para_integrante(bigint, bigint, bigint[], boolean) is
  '¿El programa aparece en el listado personal del integrante? Espejo de useGirasList (no useGiraRoster).';

create or replace function public.list_programa_ids_visibles(
  p_integrante_id bigint,
  p_fecha_desde date,
  p_fecha_hasta date,
  p_coord_ensamble_ids bigint[] default '{}'::bigint[],
  p_incluir_ausente_con_abono boolean default false
) returns setof bigint
language sql
stable
as $$
  with candidates as (
    select p.id
    from public.programas p
    where (p_fecha_hasta is null or p.fecha_desde is null or p.fecha_desde <= p_fecha_hasta)
      and (
        p_fecha_desde is null
        or p.fecha_hasta is null
        or p.fecha_hasta >= p_fecha_desde
      )
    union
    select distinct e.id_gira
    from public.eventos e
    where e.id_gira is not null
      and e.id_tipo_evento = 1
      and coalesce(e.is_deleted, false) = false
      and (p_fecha_desde is null or e.fecha >= p_fecha_desde)
      and (p_fecha_hasta is null or e.fecha <= p_fecha_hasta)
  )
  select c.id
  from candidates c
  where public.programa_visible_para_integrante(
    c.id,
    p_integrante_id,
    coalesce(p_coord_ensamble_ids, '{}'::bigint[]),
    coalesce(p_incluir_ausente_con_abono, false)
  )
  order by c.id;
$$;

comment on function public.list_programa_ids_visibles(bigint, date, date, bigint[], boolean) is
  'IDs de programas visibles para un integrante en un rango (listado / year summary personal).';

grant execute on function public.membership_active_on_program_date(date, date, date)
  to anon, authenticated;

grant execute on function public.programa_visible_para_integrante(bigint, bigint, bigint[], boolean)
  to anon, authenticated;

grant execute on function public.list_programa_ids_visibles(bigint, date, date, bigint[], boolean)
  to anon, authenticated;
