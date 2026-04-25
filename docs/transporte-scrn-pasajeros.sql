-- Pasajeros adicionales por reserva (acompañantes)
-- Cada reserva sigue asociada a un solicitante (scrn_reservas.id_usuario).
-- Plazas solicitadas = 1 (solicitante) + count(scrn_reserva_pasajeros).

CREATE TABLE IF NOT EXISTS public.scrn_reserva_pasajeros (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_reserva BIGINT NOT NULL REFERENCES public.scrn_reservas (id) ON DELETE CASCADE,
  id_perfil UUID NULL REFERENCES public.scrn_perfiles (id) ON DELETE SET NULL,
  nombre TEXT,
  apellido TEXT,
  email TEXT,
  notas TEXT,
  estado text NOT NULL DEFAULT 'pendiente',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT scrn_pasajero_nombre_limpio
    CHECK (
      id_perfil IS NOT NULL
      OR (coalesce(trim(nombre), '') <> '' AND coalesce(trim(apellido), '') <> '' AND coalesce(trim(email), '') <> '')
    )
);

ALTER TABLE public.scrn_reserva_pasajeros
  DROP CONSTRAINT IF EXISTS scrn_reserva_pasajeros_estado_check;
ALTER TABLE public.scrn_reserva_pasajeros
  ADD CONSTRAINT scrn_reserva_pasajeros_estado_check
  CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'cancelada'));

CREATE INDEX IF NOT EXISTS scrn_reserva_pasajeros_id_reserva_idx
  ON public.scrn_reserva_pasajeros (id_reserva);

-- Evitar el mismo perfil duplicado en la misma reserva
CREATE UNIQUE INDEX IF NOT EXISTS scrn_reserva_pasajeros_reserva_perfil
  ON public.scrn_reserva_pasajeros (id_reserva, id_perfil)
  WHERE id_perfil IS NOT NULL;

ALTER TABLE public.scrn_reserva_pasajeros ENABLE ROW LEVEL SECURITY;

-- El solicitante gestiona acompañantes de sus reservas
CREATE POLICY "Solicitante lee acompañantes de su reserva"
  ON public.scrn_reserva_pasajeros FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.scrn_reservas r
      WHERE r.id = id_reserva AND r.id_usuario = auth.uid()
    )
  );

CREATE POLICY "Solicitante inserta acompañantes de su reserva"
  ON public.scrn_reserva_pasajeros FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scrn_reservas r
      WHERE r.id = id_reserva AND r.id_usuario = auth.uid()
    )
  );

CREATE POLICY "Solicitante edita acompañantes de su reserva"
  ON public.scrn_reserva_pasajeros FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.scrn_reservas r
      WHERE r.id = id_reserva AND r.id_usuario = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.scrn_reservas r
      WHERE r.id = id_reserva AND r.id_usuario = auth.uid()
    )
  );

CREATE POLICY "Solicitante elimina acompañantes de su reserva"
  ON public.scrn_reserva_pasajeros FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.scrn_reservas r
      WHERE r.id = id_reserva AND r.id_usuario = auth.uid()
    )
  );

-- Admins: acceso completo (ajustá si usás otra comprobación de admin)
CREATE POLICY "Admins leen acompañantes"
  ON public.scrn_reserva_pasajeros FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.scrn_perfiles p WHERE p.id = auth.uid() AND p.es_admin = true)
  );

CREATE POLICY "Admins insertan acompañantes"
  ON public.scrn_reserva_pasajeros FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.scrn_perfiles p WHERE p.id = auth.uid() AND p.es_admin = true)
  );

CREATE POLICY "Admins actualizan acompañantes"
  ON public.scrn_reserva_pasajeros FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.scrn_perfiles p WHERE p.id = auth.uid() AND p.es_admin = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.scrn_perfiles p WHERE p.id = auth.uid() AND p.es_admin = true)
  );

CREATE POLICY "Admins eliminan acompañantes"
  ON public.scrn_reserva_pasajeros FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.scrn_perfiles p WHERE p.id = auth.uid() AND p.es_admin = true)
  );
