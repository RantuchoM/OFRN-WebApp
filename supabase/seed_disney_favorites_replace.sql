-- Disney Favorites (obra 3630): reemplazo MuseScore Wood arr. Adrian Wagner
-- PDFs sobrescritos in-place en Drive (mismos file ids). No tocar particellas (seating).
-- Generado: 2026-09-09

DO $$
DECLARE
  _id_arr bigint;
BEGIN
  SELECT id INTO _id_arr FROM compositores
  WHERE apellido = 'Wagner' AND (nombre = 'Adrian' OR (nombre IS NULL AND 'Adrian' IS NULL))
  LIMIT 1;
  IF _id_arr IS NULL THEN
    INSERT INTO compositores (apellido, nombre)
    VALUES ('Wagner', 'Adrian')
    RETURNING id INTO _id_arr;
  END IF;

  UPDATE obras SET
    id_arreglador = _id_arr,
    observaciones = 'Para acomodar — Varios - Disney Favorites [quinteto de vientos]. Quinteto de vientos arr. Adrian Wagner (Flauta, Oboe, Clarinete Bb, Corno F, Fagot). MuseScore Wood + MusicXML.',
    link_drive = 'https://drive.google.com/open?id=1vBQIAqhX9LWzajNuH7EaB0tA31oQ5m9I'
  WHERE id = 3630;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT 3630, _id_arr, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores
    WHERE id_obra = 3630 AND id_compositor = _id_arr AND rol = 'arreglador'
  );
END $$;
