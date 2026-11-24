-- Asigna tipos_evento a filas que quedaron sin tipo.
-- Solo pisa id_tipo_evento nulo. No mueve fechas ni marca la fila como editada.
-- Criterio: la misma descripción ya usada en la agenda, o el tipo de catálogo que nombra el hecho.
--   1  Concierto            — «Concierto» del 14/05/2026 en Fernández Oro
--   2  Ensayo               — «Ensayo tutti», «Temperamento y afinación»
--  11  Traslado             — carga de camión, partidas, salida de camioneta, regreso
--  12  Traslado logístico   — llevar merienda / viandas
--  16  Nuevo evento         — relevamiento de espacios y visita a la UNRN
--  17  Armado de sala       — armado de técnica y de espacios para seccionales
--  21  Descanso             — «Pausa»
--  22  Check-in             — check-in de hotel
--  29  Reunión              — reunión con Mariana Prgich
--  30  Presentarse en sala  — incluye el typo «Persentarse en sala»
--  38  Apertura de sala     — apertura / ingreso del público

ALTER TABLE public.eventos DISABLE TRIGGER tr_eventos_update_timestamp;
ALTER TABLE public.eventos DISABLE TRIGGER tr_set_eventos_updated_at;

UPDATE public.eventos AS e
SET id_tipo_evento = v.id_tipo_evento
FROM (
  VALUES
    (2821::bigint, 1::bigint),
    (3034::bigint, 2::bigint),
    (3647::bigint, 2::bigint),
    (3648::bigint, 2::bigint),
    (5029::bigint, 2::bigint),
    (2210::bigint, 11::bigint),
    (3013::bigint, 11::bigint),
    (3619::bigint, 11::bigint),
    (3638::bigint, 11::bigint),
    (3640::bigint, 11::bigint),
    (4062::bigint, 11::bigint),
    (5540::bigint, 11::bigint),
    (5732::bigint, 11::bigint),
    (5774::bigint, 11::bigint),
    (792::bigint, 11::bigint),
    (796::bigint, 11::bigint),
    (2205::bigint, 12::bigint),
    (3803::bigint, 12::bigint),
    (4198::bigint, 12::bigint),
    (790::bigint, 16::bigint),
    (793::bigint, 16::bigint),
    (794::bigint, 16::bigint),
    (795::bigint, 16::bigint),
    (2199::bigint, 17::bigint),
    (2281::bigint, 17::bigint),
    (2610::bigint, 17::bigint),
    (2723::bigint, 17::bigint),
    (2756::bigint, 17::bigint),
    (3591::bigint, 17::bigint),
    (3621::bigint, 17::bigint),
    (3639::bigint, 17::bigint),
    (3914::bigint, 17::bigint),
    (5026::bigint, 17::bigint),
    (3031::bigint, 21::bigint),
    (3432::bigint, 22::bigint),
    (3653::bigint, 22::bigint),
    (791::bigint, 29::bigint),
    (3893::bigint, 30::bigint),
    (3894::bigint, 30::bigint),
    (5030::bigint, 30::bigint),
    (5031::bigint, 30::bigint),
    (5538::bigint, 30::bigint),
    (5731::bigint, 30::bigint),
    (5773::bigint, 30::bigint),
    (2135::bigint, 38::bigint),
    (2137::bigint, 38::bigint),
    (2138::bigint, 38::bigint)
) AS v(id, id_tipo_evento)
WHERE e.id = v.id
  AND e.id_tipo_evento IS NULL;

ALTER TABLE public.eventos ENABLE TRIGGER tr_eventos_update_timestamp;
ALTER TABLE public.eventos ENABLE TRIGGER tr_set_eventos_updated_at;

DO $$
DECLARE
  v_left integer;
BEGIN
  SELECT count(*) INTO v_left
  FROM public.eventos
  WHERE id_tipo_evento IS NULL;
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'siguen % eventos sin tipo', v_left;
  END IF;
END $$;
