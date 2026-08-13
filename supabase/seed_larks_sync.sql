-- Fripp — Larks' Tongues in Aspic [The LCG] (arr. Cucchiarelli&Guevara)
-- Generado: 2026-08-13

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Fripp_Robert bigint;
  _id_arr_Cucchiarelli_Guevara_ bigint;
BEGIN
  SELECT id INTO _id_comp_Fripp_Robert FROM compositores WHERE apellido = 'Fripp' AND (nombre = 'Robert' OR (nombre IS NULL AND 'Robert' IS NULL)) LIMIT 1;
  IF _id_comp_Fripp_Robert IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Fripp', 'Robert') RETURNING id INTO _id_comp_Fripp_Robert;
  END IF;

  SELECT id INTO _id_arr_Cucchiarelli_Guevara_ FROM compositores WHERE apellido = 'Cucchiarelli&Guevara' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) LIMIT 1;
  IF _id_arr_Cucchiarelli_Guevara_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Cucchiarelli&Guevara', NULL) RETURNING id INTO _id_arr_Cucchiarelli_Guevara_;
  END IF;

  -- Larks' Tongues in Aspic [The LCG]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Larks'' Tongues in Aspic [The LCG]' AND oc.id_compositor = _id_arr_Cucchiarelli_Guevara_
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Larks'' Tongues in Aspic [The LCG]',
      _id_arr_Cucchiarelli_Guevara_,
      1973,
      831,
      'Oficial',
      'Para acomodar — Fripp, R. - Larks'' Tongues in Aspic [The LCG]',
      '2.2.3.2 - 4.2.3.1 - Timp.+2 - Str + Guitarra x5',
      'https://drive.google.com/open?id=1DKNjjnw51jgx9TcWWskunnBlucqwqQqP'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Fripp_Robert, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Cucchiarelli_Guevara_, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Cucchiarelli_Guevara_
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/18uGxWMuIrciV_dG76EqibIMqpm_aijTr/view?usp=drivesdk","description":"Clarinete Bajo - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1uL3ouDxXv3mzY52GOXFKbr9wYaGNcsOW/view?usp=drivesdk","description":"Clarinete Bb 1 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1-ZXOhg5ikxrcoIa0EDaPCChan402Eqcq/view?usp=drivesdk","description":"Clarinete Bb 2 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1WVwrTfNn4GmxBj-x1xs_3n-bl5PPYjZh/view?usp=drivesdk","description":"Contrabajo - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1vjBGw0eVhSk-M6xaLxzC4Qi_KOOKiRf9/view?usp=drivesdk","description":"Corno F 1y2 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1vjBGw0eVhSk-M6xaLxzC4Qi_KOOKiRf9/view?usp=drivesdk","description":"Corno F 1y2 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1I52AP4VrlGKhwoH3Hig6cAvN9TrLz7L0/view?usp=drivesdk","description":"Corno F 3y4 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1I52AP4VrlGKhwoH3Hig6cAvN9TrLz7L0/view?usp=drivesdk","description":"Corno F 3y4 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1ySk1UsKZonQ8jF5NFzNUpVO_bpCpQn3V/view?usp=drivesdk","description":"Fagot 1 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1F1N445X0MFjv_7t3bMr78rXvrjux-FfJ/view?usp=drivesdk","description":"Fagot 2 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1X88EsDUtS0N03OLJKf361j2FW3MvhfFd/view?usp=drivesdk","description":"Flauta 1 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1YB9joKhp1Yb1pgqHc2GcTHMZR3t2bh6B/view?usp=drivesdk","description":"Flauta 2 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra 1', '[{"url":"https://drive.google.com/file/d/1Q_8I3or7db_u-voq4UeoVz4FOfDuhYjt/view?usp=drivesdk","description":"Guitarra 1 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra 2', '[{"url":"https://drive.google.com/file/d/1l53g9tPYRwIS7-YVTNjeUVD1Sr9e8jt4/view?usp=drivesdk","description":"Guitarra 2 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra 3', '[{"url":"https://drive.google.com/file/d/1LAGkhoIOlASgexBdMlGeiAEE2P9Mh65z/view?usp=drivesdk","description":"Guitarra 3 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra 4', '[{"url":"https://drive.google.com/file/d/1tAXzpRvFN_avn2tT-5i6CFrXefY-UIsj/view?usp=drivesdk","description":"Guitarra 4 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '21', 'Guitarra 5', '[{"url":"https://drive.google.com/file/d/1CXnkpBTZcc4y4V7QMxupi497gSVtBNYu/view?usp=drivesdk","description":"Guitarra 5 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1Pj0VoWMoL6XMh2a5c90kA3TJt48BlIQw/view?usp=drivesdk","description":"Oboe 1 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1Bv8wWlju9ZE5J3ARME-pwvXc4sYZMkDx/view?usp=drivesdk","description":"Oboe 2 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1lvThd166QKLqFtM6-nVAp_DFYvTR69nT/view?usp=drivesdk","description":"Perc Percusión - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/1iykDGCwyZyhCUaPhWyF9suXiKzmpsp-9/view?usp=drivesdk","description":"Perc Tambor - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/17Hhu9ntGjqETHLfl_k3QclBiQGELQsr2/view?usp=drivesdk","description":"Perc Timbal - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1MYlXrv5Cg87Vq7hfCLkhUtkgGtIF-a3z/view?usp=drivesdk","description":"SCORE - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1XcC2JbDKtC8_Ja_cehIJhxso_rORkKVt/view?usp=drivesdk","description":"Trombón 1 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/15nIH9DxD8orJRe0sBAF7ZRTDcgB3qfRU/view?usp=drivesdk","description":"Trombón 2 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1yg5QkT48GgjqPaj5uR3G-hKtQU997_wT/view?usp=drivesdk","description":"Trombón Bajo - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1D1z9Q45Usi6kO-eOrcCX90a-AdI-QPo_/view?usp=drivesdk","description":"Trompeta 1 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1QzaKfcy68RGqyUGcB6OK7I8OzrXzLKX-/view?usp=drivesdk","description":"Trompeta 2 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1GOixlbWeUjFq64HZQjMCvvyWfPYnye1e/view?usp=drivesdk","description":"Tuba - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1dVtHffh-HS8Q_W6t6aRH4Qs8dAQB481i/view?usp=drivesdk","description":"Viola - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1vc_WOIz1EfDdOjQoFyRCGZST-L9msswy/view?usp=drivesdk","description":"Violín 1 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Jkq79FrkBeatsKuTapkl4l1R7T5PcmFV/view?usp=drivesdk","description":"Violín 2 - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1KKJI1g0OOWK_qUdb1jcvR9qIMhG3SGSX/view?usp=drivesdk","description":"Violoncello - Larks'' Tongues in Aspic [The LCG] - Fripp, R.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Larks'' Tongues in Aspic [The LCG]';
  END IF;

END $$;
