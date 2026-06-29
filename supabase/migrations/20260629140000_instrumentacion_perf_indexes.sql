-- Índices para acelerar Auditoría de Instrumentación, Sandbox y fetchRosterForGira.
-- Patrones: WHERE id_gira = ?, WHERE id_programa IN (...), WHERE id_obra IN (...).

-- Convocatoria por gira (fetchRosterForGira, cloneProductionConvocatoria)
CREATE INDEX IF NOT EXISTS giras_fuentes_id_gira_idx
  ON public.giras_fuentes (id_gira);

CREATE INDEX IF NOT EXISTS giras_integrantes_id_gira_idx
  ON public.giras_integrantes (id_gira);

-- Upsert/aplicar borrador: onConflict id_gira + id_integrante
DELETE FROM public.giras_integrantes gi
WHERE gi.id IN (
  SELECT t.id
  FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY id_gira, id_integrante
        ORDER BY id DESC
      ) AS rn
    FROM public.giras_integrantes
    WHERE id_gira IS NOT NULL
      AND id_integrante IS NOT NULL
  ) t
  WHERE t.rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS giras_integrantes_gira_integrante_uidx
  ON public.giras_integrantes (id_gira, id_integrante);

-- Repertorio e instrumentación de obras
CREATE INDEX IF NOT EXISTS programas_repertorios_id_programa_idx
  ON public.programas_repertorios (id_programa);

CREATE INDEX IF NOT EXISTS repertorio_obras_id_repertorio_orden_idx
  ON public.repertorio_obras (id_repertorio, orden);

CREATE INDEX IF NOT EXISTS obras_particellas_id_obra_idx
  ON public.obras_particellas (id_obra);

-- Seating por programa
CREATE INDEX IF NOT EXISTS seating_asignaciones_id_programa_idx
  ON public.seating_asignaciones (id_programa);

CREATE INDEX IF NOT EXISTS seating_asignaciones_programa_obra_idx
  ON public.seating_asignaciones (id_programa, id_obra);

CREATE INDEX IF NOT EXISTS seating_contenedores_id_programa_idx
  ON public.seating_contenedores (id_programa);

-- Filtro de programas (Sandbox / Audit)
CREATE INDEX IF NOT EXISTS programas_tipo_fecha_desde_idx
  ON public.programas (tipo, fecha_desde);

CREATE INDEX IF NOT EXISTS programas_sinf_cf_fechas_idx
  ON public.programas (fecha_desde, fecha_hasta)
  WHERE tipo IN ('Sinfónico', 'Camerata Filarmónica');

-- Convocatoria por familia (integrantes estables + instrumentos.familia)
CREATE INDEX IF NOT EXISTS integrantes_condicion_id_instr_idx
  ON public.integrantes (condicion, id_instr)
  WHERE condicion = 'Estable';

CREATE INDEX IF NOT EXISTS instrumentos_familia_idx
  ON public.instrumentos (familia);

CREATE INDEX IF NOT EXISTS giras_localidades_id_gira_idx
  ON public.giras_localidades (id_gira);
