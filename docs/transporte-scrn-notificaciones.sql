-- =============================================================================
-- Transporte SCRN: notificaciones internas + registro de lectura (leida_at)
-- =============================================================================
-- Ejecutar en Supabase (SQL editor) o como migración.
-- PostgreSQL 11+: triggers usan EXECUTE PROCEDURE (equivalente a FUNCTION en PG14+).
-- Requiere: scrn_perfiles, scrn_reservas, scrn_viajes, scrn_solicitudes_paquete,
--           scrn_solicitudes_nuevo_viaje (según docs del proyecto).
--
-- Comportamiento:
--   - Al cambiar estado de una reserva (→ aceptada / rechazada / cancelada): notifica al solicitante.
--   - Al resolver una solicitud de paquete (→ aceptada / rechazada): notifica al solicitante.
--   - Al resolver una propuesta de nuevo viaje (→ aprobada / rechazada): notifica al solicitante.
-- Los INSERT los hacen triggers SECURITY DEFINER (bypass RLS); el usuario solo SELECT/UPDATE leida_at.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Tabla
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.scrn_notificaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  id_usuario uuid NOT NULL REFERENCES public.scrn_perfiles (id) ON DELETE CASCADE,
  tipo text NOT NULL,
  id_reserva bigint NULL REFERENCES public.scrn_reservas (id) ON DELETE CASCADE,
  id_solicitud_paquete bigint NULL REFERENCES public.scrn_solicitudes_paquete (id) ON DELETE CASCADE,
  id_solicitud_nuevo_viaje bigint NULL REFERENCES public.scrn_solicitudes_nuevo_viaje (id) ON DELETE CASCADE,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  creada_at timestamptz NOT NULL DEFAULT now(),
  leida_at timestamptz NULL,
  CONSTRAINT scrn_notif_tipo_check CHECK (
    tipo IN ('reserva_estado', 'paquete_estado', 'propuesta_viaje_estado')
  ),
  CONSTRAINT scrn_notif_ref_check CHECK (
    (
      tipo = 'reserva_estado'
      AND id_reserva IS NOT NULL
      AND id_solicitud_paquete IS NULL
      AND id_solicitud_nuevo_viaje IS NULL
    )
    OR (
      tipo = 'paquete_estado'
      AND id_solicitud_paquete IS NOT NULL
      AND id_reserva IS NULL
      AND id_solicitud_nuevo_viaje IS NULL
    )
    OR (
      tipo = 'propuesta_viaje_estado'
      AND id_solicitud_nuevo_viaje IS NOT NULL
      AND id_reserva IS NULL
      AND id_solicitud_paquete IS NULL
    )
  )
);

COMMENT ON TABLE public.scrn_notificaciones IS
  'Notificaciones in-app para usuarios SCRN; leida_at = registro de lectura (null = no leída).';

COMMENT ON COLUMN public.scrn_notificaciones.metadata IS
  'JSON con contexto: estado, id_viaje, origen/destino, etc., para armar el mensaje en el cliente.';

CREATE INDEX IF NOT EXISTS scrn_notif_usuario_no_leidas_idx
  ON public.scrn_notificaciones (id_usuario, creada_at DESC)
  WHERE leida_at IS NULL;

CREATE INDEX IF NOT EXISTS scrn_notif_usuario_feed_idx
  ON public.scrn_notificaciones (id_usuario, creada_at DESC);

CREATE INDEX IF NOT EXISTS scrn_notif_reserva_idx
  ON public.scrn_notificaciones (id_reserva)
  WHERE id_reserva IS NOT NULL;

CREATE INDEX IF NOT EXISTS scrn_notif_paquete_idx
  ON public.scrn_notificaciones (id_solicitud_paquete)
  WHERE id_solicitud_paquete IS NOT NULL;

CREATE INDEX IF NOT EXISTS scrn_notif_propuesta_idx
  ON public.scrn_notificaciones (id_solicitud_nuevo_viaje)
  WHERE id_solicitud_nuevo_viaje IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 2. RLS
-- -----------------------------------------------------------------------------

ALTER TABLE public.scrn_notificaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "scrn_notif_select_propias" ON public.scrn_notificaciones;
CREATE POLICY "scrn_notif_select_propias"
  ON public.scrn_notificaciones FOR SELECT
  USING (id_usuario = auth.uid());

DROP POLICY IF EXISTS "scrn_notif_update_marcar_leida" ON public.scrn_notificaciones;
CREATE POLICY "scrn_notif_update_marcar_leida"
  ON public.scrn_notificaciones FOR UPDATE
  USING (id_usuario = auth.uid())
  WITH CHECK (id_usuario = auth.uid());

-- Sin INSERT/DELETE desde cliente: solo triggers (SECURITY DEFINER) insertan; borrado en cascada por FK.

-- -----------------------------------------------------------------------------
-- 2b. Solo permitir marcar leída (cambiar leida_at), no el resto de columnas
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.scrn_notif_trg_update_solo_leida()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (
    NEW.id,
    NEW.id_usuario,
    NEW.tipo,
    NEW.id_reserva,
    NEW.id_solicitud_paquete,
    NEW.id_solicitud_nuevo_viaje,
    NEW.metadata,
    NEW.creada_at
  ) IS DISTINCT FROM (
    OLD.id,
    OLD.id_usuario,
    OLD.tipo,
    OLD.id_reserva,
    OLD.id_solicitud_paquete,
    OLD.id_solicitud_nuevo_viaje,
    OLD.metadata,
    OLD.creada_at
  ) THEN
    RAISE EXCEPTION 'scrn_notificaciones: solo se puede actualizar leida_at';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS scrn_notif_solo_leida_trg ON public.scrn_notificaciones;
CREATE TRIGGER scrn_notif_solo_leida_trg
  BEFORE UPDATE ON public.scrn_notificaciones
  FOR EACH ROW
  EXECUTE PROCEDURE public.scrn_notif_trg_update_solo_leida();

-- -----------------------------------------------------------------------------
-- 3. Funciones trigger (SECURITY DEFINER; search_path fijo)
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.scrn_notif_trg_reserva_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viaje record;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.estado IS NOT DISTINCT FROM NEW.estado THEN
    RETURN NEW;
  END IF;

  IF NEW.estado NOT IN ('aceptada', 'rechazada', 'cancelada') THEN
    RETURN NEW;
  END IF;

  SELECT v.id, v.origen, v.destino_final, v.fecha_salida
  INTO v_viaje
  FROM public.scrn_viajes v
  WHERE v.id = NEW.id_viaje;

  INSERT INTO public.scrn_notificaciones (
    id_usuario,
    tipo,
    id_reserva,
    metadata
  )
  VALUES (
    NEW.id_usuario,
    'reserva_estado',
    NEW.id,
    jsonb_build_object(
      'estado', NEW.estado,
      'id_viaje', NEW.id_viaje,
      'origen', COALESCE(v_viaje.origen, ''),
      'destino_final', COALESCE(v_viaje.destino_final, ''),
      'fecha_salida', v_viaje.fecha_salida
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.scrn_notif_trg_paquete_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_viaje record;
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.estado IS NOT DISTINCT FROM NEW.estado THEN
    RETURN NEW;
  END IF;

  IF NEW.estado NOT IN ('aceptada', 'rechazada', 'cancelada') THEN
    RETURN NEW;
  END IF;

  SELECT v.id, v.origen, v.destino_final, v.fecha_salida
  INTO v_viaje
  FROM public.scrn_viajes v
  WHERE v.id = NEW.id_viaje;

  INSERT INTO public.scrn_notificaciones (
    id_usuario,
    tipo,
    id_solicitud_paquete,
    metadata
  )
  VALUES (
    NEW.id_usuario,
    'paquete_estado',
    NEW.id,
    jsonb_build_object(
      'estado', NEW.estado,
      'id_viaje', NEW.id_viaje,
      'id_transporte', NEW.id_transporte,
      'origen', COALESCE(v_viaje.origen, ''),
      'destino_final', COALESCE(v_viaje.destino_final, ''),
      'fecha_salida', v_viaje.fecha_salida
    )
  );

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.scrn_notif_trg_propuesta_viaje_estado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF OLD.estado IS NOT DISTINCT FROM NEW.estado THEN
    RETURN NEW;
  END IF;

  IF NEW.estado NOT IN ('aprobada', 'rechazada') THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.scrn_notificaciones (
    id_usuario,
    tipo,
    id_solicitud_nuevo_viaje,
    metadata
  )
  VALUES (
    NEW.id_usuario,
    'propuesta_viaje_estado',
    NEW.id,
    jsonb_build_object(
      'estado', NEW.estado,
      'id_viaje_creado', NEW.id_viaje_creado,
      'origen', COALESCE(NEW.origen, ''),
      'destino_final', COALESCE(NEW.destino_final, ''),
      'fecha_salida', NEW.fecha_salida
    )
  );

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- 4. Triggers (idempotente al re-ejecutar)
-- -----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS scrn_notif_reserva_estado_trg ON public.scrn_reservas;
CREATE TRIGGER scrn_notif_reserva_estado_trg
  AFTER UPDATE OF estado ON public.scrn_reservas
  FOR EACH ROW
  EXECUTE PROCEDURE public.scrn_notif_trg_reserva_estado();

DROP TRIGGER IF EXISTS scrn_notif_paquete_estado_trg ON public.scrn_solicitudes_paquete;
CREATE TRIGGER scrn_notif_paquete_estado_trg
  AFTER UPDATE OF estado ON public.scrn_solicitudes_paquete
  FOR EACH ROW
  EXECUTE PROCEDURE public.scrn_notif_trg_paquete_estado();

DROP TRIGGER IF EXISTS scrn_notif_propuesta_viaje_estado_trg ON public.scrn_solicitudes_nuevo_viaje;
CREATE TRIGGER scrn_notif_propuesta_viaje_estado_trg
  AFTER UPDATE OF estado ON public.scrn_solicitudes_nuevo_viaje
  FOR EACH ROW
  EXECUTE PROCEDURE public.scrn_notif_trg_propuesta_viaje_estado();

-- -----------------------------------------------------------------------------
-- 5. Permisos (Supabase PostgREST: anon/authenticated según cómo expongas SCRN)
-- -----------------------------------------------------------------------------

GRANT SELECT, UPDATE ON public.scrn_notificaciones TO authenticated;
-- Si usás rol anon para SCRN, descomentá:
-- GRANT SELECT, UPDATE ON public.scrn_notificaciones TO anon;

REVOKE INSERT, DELETE ON public.scrn_notificaciones FROM authenticated;
REVOKE INSERT, DELETE ON public.scrn_notificaciones FROM anon;

-- service_role puede todo por defecto en Supabase (no hace falta GRANT explícito para notificaciones).

-- =============================================================================
-- Fin. Prueba manual (como admin, tras UPDATE de estado en scrn_reservas):
--   SELECT * FROM scrn_notificaciones ORDER BY creada_at DESC LIMIT 10;
-- Marcar leída (como el usuario destinatario):
--   UPDATE scrn_notificaciones SET leida_at = now() WHERE id = '...' AND id_usuario = auth.uid();
-- =============================================================================
