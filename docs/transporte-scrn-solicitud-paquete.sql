-- Enviar un paquete: solicitudes vinculadas a un transporte y a un recorrido (scrn_viajes).
-- Cada fila se aprueba o rechaza por separado. El admin marca bodega llena **por recorrido**; mientras
-- esté llena, no se aceptan nuevas solicitudes de paquetería para ese viaje.
-- Si ya ejecutaste una versión previa con la columna en scrn_transportes, esta migración la quita
-- y la define en scrn_viajes.
-- Ejecutar en Supabase (SQL editor).

-- Quitar indicador de la versión anterior (transporte a nivel vehículo)
ALTER TABLE public.scrn_transportes
  DROP COLUMN IF EXISTS paquetes_bodega_llena;

-- Indicador operativo: no hay más lugar en bodega **en este recorrido concreto**
ALTER TABLE public.scrn_viajes
  ADD COLUMN IF NOT EXISTS paquetes_bodega_llena boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.scrn_viajes.paquetes_bodega_llena IS
  'Si true, no se aceptan nuevas solicitudes de paquetería para este viaje (RLS e interfaz).';

CREATE TABLE IF NOT EXISTS public.scrn_solicitudes_paquete (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  id_usuario uuid NOT NULL REFERENCES public.scrn_perfiles (id) ON DELETE CASCADE,
  id_transporte bigint NOT NULL REFERENCES public.scrn_transportes (id) ON DELETE RESTRICT,
  id_viaje bigint NOT NULL REFERENCES public.scrn_viajes (id) ON DELETE RESTRICT,
  dimensiones_aprox text NOT NULL,
  peso_kg numeric(12, 3) NOT NULL,
  descripcion text NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scrn_solic_paq_peso_pos CHECK (peso_kg > 0),
  CONSTRAINT scrn_solic_paq_estado_check CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'cancelada'))
);

-- Si la tabla ya existía, actualizar constraint de estado (CREATE TABLE IF NOT EXISTS no modifica checks previos)
ALTER TABLE public.scrn_solicitudes_paquete
  DROP CONSTRAINT IF EXISTS scrn_solic_paq_estado_check;
ALTER TABLE public.scrn_solicitudes_paquete
  ADD CONSTRAINT scrn_solic_paq_estado_check
  CHECK (estado IN ('pendiente', 'aceptada', 'rechazada', 'cancelada'));

-- Si la tabla se creó antes con id_viaje NULL, fijar NOT NULL a mano (sin filas nulas) y reintentar:
--   ALTER TABLE public.scrn_solicitudes_paquete ALTER COLUMN id_viaje SET NOT NULL;

CREATE INDEX IF NOT EXISTS scrn_solic_paq_transporte_idx
  ON public.scrn_solicitudes_paquete (id_transporte);
CREATE INDEX IF NOT EXISTS scrn_solic_paq_estado_idx
  ON public.scrn_solicitudes_paquete (estado);
CREATE INDEX IF NOT EXISTS scrn_solic_paq_usuario_idx
  ON public.scrn_solicitudes_paquete (id_usuario);
CREATE INDEX IF NOT EXISTS scrn_solic_paq_viaje_idx
  ON public.scrn_solicitudes_paquete (id_viaje);

COMMENT ON TABLE public.scrn_solicitudes_paquete IS
  'Solicitud de envío de paquete: dimensiones aprox. (texto), peso en kg, descripción; aprobación por fila; por viaje.';

COMMENT ON COLUMN public.scrn_solicitudes_paquete.dimensiones_aprox IS
  'Tamaño aprox. libre, ej. "40x30x20 cm" o "maleta mediana".';
COMMENT ON COLUMN public.scrn_solicitudes_paquete.peso_kg IS
  'Peso en kilogramos (número).';
COMMENT ON COLUMN public.scrn_solicitudes_paquete.id_viaje IS
  'Recorrido concreto; debe coincidir con id_transporte (validado en RLS y en la app).';

ALTER TABLE public.scrn_solicitudes_paquete ENABLE ROW LEVEL SECURITY;

-- Idempotente al re-ejecutar: policies
DROP POLICY IF EXISTS "scrn_solic_paq_select_propias" ON public.scrn_solicitudes_paquete;
DROP POLICY IF EXISTS "scrn_solic_paq_select_admin" ON public.scrn_solicitudes_paquete;
DROP POLICY IF EXISTS "scrn_solic_paq_insert_solicitante" ON public.scrn_solicitudes_paquete;
DROP POLICY IF EXISTS "scrn_solic_paq_update_admin" ON public.scrn_solicitudes_paquete;

-- Ver propias solicitudes
CREATE POLICY "scrn_solic_paq_select_propias"
  ON public.scrn_solicitudes_paquete FOR SELECT
  USING (id_usuario = auth.uid());

-- Admins leen todo
CREATE POLICY "scrn_solic_paq_select_admin"
  ON public.scrn_solicitudes_paquete FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.scrn_perfiles p WHERE p.id = auth.uid() AND p.es_admin = true));

-- Crear: a nombre propio, coherente transporte↔viaje, y el viaje no puede tener bodega llena
CREATE POLICY "scrn_solic_paq_insert_solicitante"
  ON public.scrn_solicitudes_paquete FOR INSERT
  WITH CHECK (
    id_usuario = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.scrn_viajes v
      WHERE v.id = id_viaje
        AND v.id_transporte = id_transporte
        AND v.paquetes_bodega_llena = false
    )
  );

-- Actualizar: solo administradores (aprobar / rechazar, etc.)
CREATE POLICY "scrn_solic_paq_update_admin"
  ON public.scrn_solicitudes_paquete FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.scrn_perfiles p WHERE p.id = auth.uid() AND p.es_admin = true));

-- Marcar bodega llena: usar las mismas reglas de permisos con las que ya actualizan scrn_viajes
-- (gestión de recorridos / admin). No añadimos policy nueva sobre scrn_viajes en este script.
