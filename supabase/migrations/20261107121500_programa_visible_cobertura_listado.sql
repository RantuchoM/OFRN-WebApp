-- Ausente con cobertura: visible en listado personal de Giras aunque
-- p_incluir_ausente_con_abono = false (Agenda sigue ocultándolo por estado).
-- Abono R/L sigue requiriendo el flag (year summary).

CREATE OR REPLACE FUNCTION public.programa_visible_para_integrante(
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
  v_cobertura_id bigint;
  v_cobertura_nombre text;
  v_tiene_cobertura boolean;
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

  select
    gi.estado,
    coalesce(gi.abona_reemplazo, false),
    coalesce(gi.abona_licencia, false),
    gi.cobertura_id_integrante,
    gi.cobertura_nombre
  into
    v_override_estado,
    v_abona_reemplazo,
    v_abona_licencia,
    v_cobertura_id,
    v_cobertura_nombre
  from public.giras_integrantes gi
  where gi.id_gira = p_programa_id
    and gi.id_integrante = p_integrante_id
  limit 1;

  if found then
    if v_override_estado = 'ausente' then
      v_tiene_cobertura :=
        v_cobertura_id is not null
        or nullif(btrim(coalesce(v_cobertura_nombre, '')), '') is not null;
      -- Cobertura: siempre visible en Giras (el ausente ve la gira con tag).
      if v_tiene_cobertura then
        return true;
      end if;
      -- R/L: solo year summary / conteos con el flag.
      if p_incluir_ausente_con_abono
         and (v_abona_reemplazo or v_abona_licencia) then
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
  '¿El programa aparece en el listado personal? Ausente con cobertura: siempre visible. Ausente con R/L: solo si p_incluir_ausente_con_abono. Agenda oculta ausentes por estado.';
