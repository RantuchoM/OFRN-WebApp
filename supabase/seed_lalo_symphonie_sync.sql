-- Lalo — Sinfonía española, Op. 21 (catálogo; sin programa ni gira)
-- Generado: 2026-09-24

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Lalo_douard bigint;
BEGIN
  SELECT id INTO _id_comp_Lalo_douard FROM compositores WHERE apellido = 'Lalo' AND (nombre = 'Édouard' OR (nombre IS NULL AND 'Édouard' IS NULL)) LIMIT 1;
  IF _id_comp_Lalo_douard IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Lalo', 'Édouard') RETURNING id INTO _id_comp_Lalo_douard;
  END IF;

  -- Sinfonía española
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Sinfonía española'
      AND o.observaciones = 'Para acomodar — Lalo, E. - Sinfonía española, Op. 21'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Sinfonía española',
      NULL,
      1874,
      NULL,
      'Oficial',
      'Para acomodar — Lalo, E. - Sinfonía española, Op. 21',
      'Vn - 3.2.2.2 - 4.2.3.0 - Timp.+2 - Hp - Str',
      'https://drive.google.com/open?id=1ctPxdJcuRxwuO75GZgExyQUWHWa3fBM3'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Lalo_douard, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/158B0qNf6E7E_1ALsfC7DYlW6D0xidgaa/view?usp=drivesdk","description":"Arpa - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1WKup1MI1BZyiKpZVR-B1zwLs3E25FxB8/view?usp=drivesdk","description":"Clarinete Bb 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1WKup1MI1BZyiKpZVR-B1zwLs3E25FxB8/view?usp=drivesdk","description":"Clarinete Bb 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1zBJ3pVttOsdOa9-1MHCs5CH9HMe2W0eE/view?usp=drivesdk","description":"Contrabajo - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1q3hEzGuJNVZ2UhrS4u7253im_mZTwpQ2/view?usp=drivesdk","description":"Corno F 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1q3hEzGuJNVZ2UhrS4u7253im_mZTwpQ2/view?usp=drivesdk","description":"Corno F 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1-BhYmD8cTT2MT6PJTtSsTlMcWKklEJE5/view?usp=drivesdk","description":"Corno F 3y4 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1-BhYmD8cTT2MT6PJTtSsTlMcWKklEJE5/view?usp=drivesdk","description":"Corno F 3y4 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1PLKkkKTV8mx_Kn7PtwhcNC8z4wLIVuEQ/view?usp=drivesdk","description":"Fagot 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1PLKkkKTV8mx_Kn7PtwhcNC8z4wLIVuEQ/view?usp=drivesdk","description":"Fagot 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1xbksAJxiw1UkFwA02BPiZntMQDlYLTR_/view?usp=drivesdk","description":"Fl Piccolo - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/11WAAD_DGieZpaJPG9qCImodrZlKv4SLA/view?usp=drivesdk","description":"Flauta 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/11WAAD_DGieZpaJPG9qCImodrZlKv4SLA/view?usp=drivesdk","description":"Flauta 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1XUr4_vP5dZYJgEFjbxxVo8m_ef-35p3S/view?usp=drivesdk","description":"Oboe 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1XUr4_vP5dZYJgEFjbxxVo8m_ef-35p3S/view?usp=drivesdk","description":"Oboe 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1RJuG-nGuvh7kpmRM1LdhGnPHQuforcmq/view?usp=drivesdk","description":"Perc Timbal - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1ioibvLJkxgRb7UJH3XsnZEPcrATgIBqt/view?usp=drivesdk","description":"Perc Triángulo y Tambor - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/1ioibvLJkxgRb7UJH3XsnZEPcrATgIBqt/view?usp=drivesdk","description":"Perc Triángulo y Tambor - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1S4Mzg429PEI9Dk_-Po5GA9D_iSo5WmhZ/view?usp=drivesdk","description":"SCORE - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1CXNlAuuWLV_KhdDBoY9VXXVTyrCNo7wh/view?usp=drivesdk","description":"Trombón 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1CXNlAuuWLV_KhdDBoY9VXXVTyrCNo7wh/view?usp=drivesdk","description":"Trombón 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1b1jDcBMChsOw4hrQ9TbjFwGCfJn7b1am/view?usp=drivesdk","description":"Trombón Bajo - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1HcapTsVlk9oyovwSBT4ba3Kq-wHoh6_O/view?usp=drivesdk","description":"Trompeta D 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1HcapTsVlk9oyovwSBT4ba3Kq-wHoh6_O/view?usp=drivesdk","description":"Trompeta D 1y2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1N-M-VJQzMD0pCO5QDlrJ64kHdyXEEvey/view?usp=drivesdk","description":"Viola - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/17RCfH-_X5dqCrC6IMScwcielslQkn20L/view?usp=drivesdk","description":"Violín 1 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1YjwWq7y9w-Q9nWpHEO1uAO59YhjecHqC/view?usp=drivesdk","description":"Violín 2 - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín Solo', '[{"url":"https://drive.google.com/file/d/1_8wypR8YCnH9gaLZTBwXuubp93iCbe9G/view?usp=drivesdk","description":"Violín Solo - op.21. Sinfonía española - Lalo, E.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1hwhE6AOwPa8xIOxwVqNgFBQlM2Ud0JRs/view?usp=drivesdk","description":"Violoncello - op.21. Sinfonía española - Lalo, E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Sinfonía española';
  END IF;

END $$;
