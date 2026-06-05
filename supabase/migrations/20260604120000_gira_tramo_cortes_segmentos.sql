-- Cortes de tijera, segmentos materializados y localía por segmento.
-- Backfill: 0 cortes, 1 segmento por gira, localidades desde giras_localidades.

CREATE TABLE IF NOT EXISTS public.giras_tramo_segmentos (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint NOT NULL,
  indice integer NOT NULL,
  fecha_desde date NOT NULL,
  fecha_hasta date NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT giras_tramo_segmentos_pkey PRIMARY KEY (id),
  CONSTRAINT giras_tramo_segmentos_id_gira_fkey
    FOREIGN KEY (id_gira) REFERENCES public.programas(id) ON DELETE CASCADE,
  CONSTRAINT giras_tramo_segmentos_id_gira_indice_key UNIQUE (id_gira, indice)
);

CREATE TABLE IF NOT EXISTS public.giras_tramo_cortes (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_gira bigint NOT NULL,
  orden integer NOT NULL,
  fecha date NOT NULL,
  hora time without time zone NOT NULL DEFAULT '12:00:00',
  fecha_checkout date,
  hora_checkout time without time zone DEFAULT '10:00:00',
  fecha_checkin date,
  hora_checkin time without time zone DEFAULT '14:00:00',
  id_evento integer,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT giras_tramo_cortes_pkey PRIMARY KEY (id),
  CONSTRAINT giras_tramo_cortes_id_gira_fkey
    FOREIGN KEY (id_gira) REFERENCES public.programas(id) ON DELETE CASCADE,
  CONSTRAINT giras_tramo_cortes_id_gira_orden_key UNIQUE (id_gira, orden),
  CONSTRAINT giras_tramo_cortes_id_evento_fkey
    FOREIGN KEY (id_evento) REFERENCES public.eventos(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.giras_tramo_localidades (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  id_segmento bigint NOT NULL,
  id_localidad bigint NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  CONSTRAINT giras_tramo_localidades_pkey PRIMARY KEY (id),
  CONSTRAINT giras_tramo_localidades_id_segmento_fkey
    FOREIGN KEY (id_segmento) REFERENCES public.giras_tramo_segmentos(id) ON DELETE CASCADE,
  CONSTRAINT giras_tramo_localidades_id_localidad_fkey
    FOREIGN KEY (id_localidad) REFERENCES public.localidades(id),
  CONSTRAINT giras_tramo_localidades_segmento_localidad_key
    UNIQUE (id_segmento, id_localidad)
);

ALTER TABLE public.programas_hospedajes
  ADD COLUMN IF NOT EXISTS id_segmento bigint,
  ADD COLUMN IF NOT EXISTS fecha_checkin date,
  ADD COLUMN IF NOT EXISTS fecha_checkout date,
  ADD COLUMN IF NOT EXISTS hora_checkin time without time zone DEFAULT '14:00:00',
  ADD COLUMN IF NOT EXISTS hora_checkout time without time zone DEFAULT '10:00:00';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'programas_hospedajes_id_segmento_fkey'
  ) THEN
    ALTER TABLE public.programas_hospedajes
      ADD CONSTRAINT programas_hospedajes_id_segmento_fkey
      FOREIGN KEY (id_segmento) REFERENCES public.giras_tramo_segmentos(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS giras_tramo_cortes_id_gira_idx
  ON public.giras_tramo_cortes (id_gira);

CREATE INDEX IF NOT EXISTS giras_tramo_segmentos_id_gira_idx
  ON public.giras_tramo_segmentos (id_gira);

COMMENT ON TABLE public.giras_tramo_cortes IS
  'Cortes de tijera en la timeline de la gira. fecha/hora = cambio de localía; checkout/checkin = transición hotelera global.';

COMMENT ON TABLE public.giras_tramo_segmentos IS
  'Segmentos materializados entre cortes (o segmento único si no hay cortes).';

-- Backfill: un segmento por programa con fechas
INSERT INTO public.giras_tramo_segmentos (id_gira, indice, fecha_desde, fecha_hasta)
SELECT p.id, 0, p.fecha_desde, p.fecha_hasta
FROM public.programas p
WHERE p.fecha_desde IS NOT NULL
  AND p.fecha_hasta IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.giras_tramo_segmentos s
    WHERE s.id_gira = p.id AND s.indice = 0
  );

-- Localidades del segmento 0 desde giras_localidades
INSERT INTO public.giras_tramo_localidades (id_segmento, id_localidad)
SELECT s.id, gl.id_localidad
FROM public.giras_localidades gl
JOIN public.giras_tramo_segmentos s
  ON s.id_gira = gl.id_gira AND s.indice = 0
WHERE gl.id_localidad IS NOT NULL
ON CONFLICT (id_segmento, id_localidad) DO NOTHING;

-- Hoteles al segmento 0
UPDATE public.programas_hospedajes ph
SET id_segmento = s.id
FROM public.giras_tramo_segmentos s
WHERE s.id_gira = ph.id_programa
  AND s.indice = 0
  AND ph.id_segmento IS NULL;
