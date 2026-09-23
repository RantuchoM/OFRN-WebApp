-- Auditar locación (id_locacion) junto a fecha/horas en eventos_logs.
-- Categorías 1 (Conciertos), 2 (Ensayos), 6 (Transporte), igual que el resto.
-- Se guarda el nombre de locaciones.nombre; si no hay fila, el id como texto.

CREATE OR REPLACE FUNCTION public.fn_audit_event_changes()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_id_categoria BIGINT;
  v_old_loc TEXT;
  v_new_loc TEXT;
BEGIN
  SELECT te.id_categoria
    INTO v_id_categoria
  FROM public.tipos_evento te
  WHERE te.id = NEW.id_tipo_evento;

  IF v_id_categoria IN (1, 2, 6) THEN
    IF (OLD.fecha IS DISTINCT FROM NEW.fecha) THEN
      INSERT INTO public.eventos_logs (id_evento, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, 'fecha', OLD.fecha::text, NEW.fecha::text);
    END IF;

    IF (OLD.hora_inicio IS DISTINCT FROM NEW.hora_inicio) THEN
      INSERT INTO public.eventos_logs (id_evento, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, 'hora_inicio', OLD.hora_inicio::text, NEW.hora_inicio::text);
    END IF;

    IF (OLD.hora_fin IS DISTINCT FROM NEW.hora_fin) THEN
      INSERT INTO public.eventos_logs (id_evento, campo, valor_anterior, valor_nuevo)
      VALUES (NEW.id, 'hora_fin', OLD.hora_fin::text, NEW.hora_fin::text);
    END IF;

    IF (OLD.id_locacion IS DISTINCT FROM NEW.id_locacion) THEN
      SELECT loc.nombre
        INTO v_old_loc
      FROM public.locaciones loc
      WHERE loc.id = OLD.id_locacion;

      SELECT loc.nombre
        INTO v_new_loc
      FROM public.locaciones loc
      WHERE loc.id = NEW.id_locacion;

      INSERT INTO public.eventos_logs (id_evento, campo, valor_anterior, valor_nuevo)
      VALUES (
        NEW.id,
        'locacion',
        COALESCE(v_old_loc, OLD.id_locacion::text),
        COALESCE(v_new_loc, NEW.id_locacion::text)
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fn_audit_event_changes() IS
  'Al actualizar un evento de categoría 1/2/6, loguea fecha, horas y locación (nombre) si cambiaron.';
