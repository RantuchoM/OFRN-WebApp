-- Cobertura: ausente que manda a otra persona (sin abonar).
-- El servicio cuenta para el ausente (C roja). Quien cubre (integrante) entra
-- presente con es_cobertura y no suma (C verde). Externo = solo nombre.

ALTER TABLE public.giras_integrantes
  ADD COLUMN IF NOT EXISTS cobertura_id_integrante bigint,
  ADD COLUMN IF NOT EXISTS cobertura_nombre text,
  ADD COLUMN IF NOT EXISTS es_cobertura boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.giras_integrantes.cobertura_id_integrante IS
  'Si estado=ausente: integrante que cubre (C roja para el ausente; el cubridor tiene es_cobertura). Mutuamente excluyente con cobertura_nombre, abona_reemplazo y abona_licencia.';

COMMENT ON COLUMN public.giras_integrantes.cobertura_nombre IS
  'Si estado=ausente: nombre de quien cubre cuando no es integrante de la orquesta. Mutuamente excluyente con cobertura_id_integrante.';

COMMENT ON COLUMN public.giras_integrantes.es_cobertura IS
  'Si true: presente solo para cubrir a un ausente; no cuenta servicio (C verde). Distinto de funcion=reemplazo.';

ALTER TABLE public.giras_integrantes
  DROP CONSTRAINT IF EXISTS giras_integrantes_cobertura_id_integrante_fkey;

ALTER TABLE public.giras_integrantes
  ADD CONSTRAINT giras_integrantes_cobertura_id_integrante_fkey
  FOREIGN KEY (cobertura_id_integrante) REFERENCES public.integrantes(id);

ALTER TABLE public.giras_integrantes
  DROP CONSTRAINT IF EXISTS giras_integrantes_abona_reemplazo_licencia_excl;

ALTER TABLE public.giras_integrantes
  DROP CONSTRAINT IF EXISTS giras_integrantes_cobertura_abono_excl;

ALTER TABLE public.giras_integrantes
  ADD CONSTRAINT giras_integrantes_cobertura_abono_excl
  CHECK (
    NOT (
      (COALESCE(abona_reemplazo, false) OR COALESCE(abona_licencia, false))
      AND (
        cobertura_id_integrante IS NOT NULL
        OR NULLIF(BTRIM(cobertura_nombre), '') IS NOT NULL
        OR COALESCE(es_cobertura, false)
      )
    )
    AND NOT (COALESCE(abona_reemplazo, false) AND COALESCE(abona_licencia, false))
  );

ALTER TABLE public.giras_integrantes
  DROP CONSTRAINT IF EXISTS giras_integrantes_cobertura_xor;

ALTER TABLE public.giras_integrantes
  ADD CONSTRAINT giras_integrantes_cobertura_xor
  CHECK (
    NOT (
      cobertura_id_integrante IS NOT NULL
      AND NULLIF(BTRIM(cobertura_nombre), '') IS NOT NULL
    )
  );

ALTER TABLE public.giras_integrantes
  DROP CONSTRAINT IF EXISTS giras_integrantes_cobertura_estado;

ALTER TABLE public.giras_integrantes
  ADD CONSTRAINT giras_integrantes_cobertura_estado
  CHECK (
    (
      cobertura_id_integrante IS NULL
      AND NULLIF(BTRIM(cobertura_nombre), '') IS NULL
    )
    OR estado = 'ausente'
  );

ALTER TABLE public.giras_integrantes
  DROP CONSTRAINT IF EXISTS giras_integrantes_es_cobertura_estado;

ALTER TABLE public.giras_integrantes
  ADD CONSTRAINT giras_integrantes_es_cobertura_estado
  CHECK (
    NOT COALESCE(es_cobertura, false)
    OR (
      estado IS DISTINCT FROM 'ausente'
      AND cobertura_id_integrante IS NULL
      AND NULLIF(BTRIM(cobertura_nombre), '') IS NULL
      AND NOT COALESCE(abona_reemplazo, false)
      AND NOT COALESCE(abona_licencia, false)
    )
  );

CREATE UNIQUE INDEX IF NOT EXISTS giras_integrantes_cobertura_id_integrante_uidx
  ON public.giras_integrantes (id_gira, cobertura_id_integrante)
  WHERE cobertura_id_integrante IS NOT NULL;

CREATE INDEX IF NOT EXISTS giras_integrantes_es_cobertura_idx
  ON public.giras_integrantes (id_gira)
  WHERE es_cobertura = true;

-- Visibilidad year-summary: ausente con cobertura cuenta como abono.
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
      if p_incluir_ausente_con_abono
         and (v_abona_reemplazo or v_abona_licencia or v_tiene_cobertura) then
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
  '¿El programa aparece en el listado personal del integrante? Espejo de useGirasList (no useGiraRoster). Ausente con cobertura cuenta si p_incluir_ausente_con_abono.';
