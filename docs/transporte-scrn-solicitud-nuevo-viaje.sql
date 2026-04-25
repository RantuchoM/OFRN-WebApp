-- Propuestas de nuevo recorrido: el usuario carga transporte, datos del viaje y pasajeros;
-- un administrador aprueba o rechaza. Ejecutar en Supabase (SQL editor).

CREATE TABLE IF NOT EXISTS public.scrn_solicitudes_nuevo_viaje (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario UUID NOT NULL REFERENCES public.scrn_perfiles (id) ON DELETE CASCADE,
  id_transporte BIGINT NOT NULL REFERENCES public.scrn_transportes (id) ON DELETE RESTRICT,
  motivo TEXT,
  origen TEXT NOT NULL,
  destino_final TEXT NOT NULL,
  fecha_salida TIMESTAMPTZ NOT NULL,
  fecha_llegada_estimada TIMESTAMPTZ NOT NULL,
  fecha_retorno TIMESTAMPTZ,
  observaciones TEXT,
  tramo TEXT NOT NULL DEFAULT 'ida',
  localidad_subida TEXT NOT NULL DEFAULT '',
  obs_subida TEXT,
  localidad_bajada TEXT NOT NULL DEFAULT '',
  obs_bajada TEXT,
  pasajeros_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  estado TEXT NOT NULL DEFAULT 'pendiente',
  id_viaje_creado BIGINT REFERENCES public.scrn_viajes (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scrn_solic_nuevo_estado_check CHECK (estado IN ('pendiente', 'aprobada', 'rechazada'))
);

CREATE INDEX IF NOT EXISTS scrn_solic_nuevo_estado_idx
  ON public.scrn_solicitudes_nuevo_viaje (estado);
CREATE INDEX IF NOT EXISTS scrn_solic_nuevo_user_idx
  ON public.scrn_solicitudes_nuevo_viaje (id_usuario);
CREATE INDEX IF NOT EXISTS scrn_solic_nuevo_transporte_idx
  ON public.scrn_solicitudes_nuevo_viaje (id_transporte);

ALTER TABLE public.scrn_solicitudes_nuevo_viaje ENABLE ROW LEVEL SECURITY;

-- Ver propias solicitudes
CREATE POLICY "scrn_solic_nuevo_select_propias"
  ON public.scrn_solicitudes_nuevo_viaje FOR SELECT
  USING (id_usuario = auth.uid());

-- Admins leen todo
CREATE POLICY "scrn_solic_nuevo_select_admin"
  ON public.scrn_solicitudes_nuevo_viaje FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.scrn_perfiles p WHERE p.id = auth.uid() AND p.es_admin = true));

-- Crear (solo a nombre propio)
CREATE POLICY "scrn_solic_nuevo_insert_solicitante"
  ON public.scrn_solicitudes_nuevo_viaje FOR INSERT
  WITH CHECK (id_usuario = auth.uid());

-- Actualizar solo admins (aprobar / rechazar)
CREATE POLICY "scrn_solic_nuevo_update_admin"
  ON public.scrn_solicitudes_nuevo_viaje FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.scrn_perfiles p WHERE p.id = auth.uid() AND p.es_admin = true));

-- Sin DELETE desde cliente (historial mínimo)

COMMENT ON TABLE public.scrn_solicitudes_nuevo_viaje IS
  'Solicitud de creación de recorrido + reserva del solicitante; pasajeros_json = acompañantes (sin titular).';
