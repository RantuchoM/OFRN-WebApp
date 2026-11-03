-- Gira 2022 Marzo 9-12 (Ópera a la carta) + Lin Calel: obras + particellas + legacy
-- Generado: 2026-11-03
-- Idempotente: no inserta si ya existe obras.link_drive = carpeta.
BEGIN;
DO $$
DECLARE
  _id_obra bigint;
  _p_Puccini_Giacomo bigint;
  _p_Massenet_Jules bigint;
  _p_Wagner_Richard bigint;
  _p_D_Esposito_Arnaldo bigint;
  _p_L_pez_Manzitti_ bigint;
BEGIN
  SELECT id INTO _p_Puccini_Giacomo FROM compositores WHERE apellido = 'Puccini' AND (nombre = 'Giacomo' OR (nombre IS NULL AND 'Giacomo' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Puccini_Giacomo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Puccini', 'Giacomo') RETURNING id INTO _p_Puccini_Giacomo;
  END IF;
  SELECT id INTO _p_Massenet_Jules FROM compositores WHERE apellido = 'Massenet' AND (nombre = 'Jules' OR (nombre IS NULL AND 'Jules' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Massenet_Jules IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Massenet', 'Jules') RETURNING id INTO _p_Massenet_Jules;
  END IF;
  SELECT id INTO _p_Wagner_Richard FROM compositores WHERE apellido = 'Wagner' AND (nombre = 'Richard' OR (nombre IS NULL AND 'Richard' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_Wagner_Richard IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Wagner', 'Richard') RETURNING id INTO _p_Wagner_Richard;
  END IF;
  SELECT id INTO _p_D_Esposito_Arnaldo FROM compositores WHERE apellido = 'D''Esposito' AND (nombre = 'Arnaldo' OR (nombre IS NULL AND 'Arnaldo' IS NULL)) ORDER BY id LIMIT 1;
  IF _p_D_Esposito_Arnaldo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('D''Esposito', 'Arnaldo') RETURNING id INTO _p_D_Esposito_Arnaldo;
  END IF;
  SELECT id INTO _p_L_pez_Manzitti_ FROM compositores WHERE apellido = 'López Manzitti' AND (nombre = NULL OR (nombre IS NULL AND NULL IS NULL)) ORDER BY id LIMIT 1;
  IF _p_L_pez_Manzitti_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('López Manzitti', NULL) RETURNING id INTO _p_L_pez_Manzitti_;
  END IF;

  -- 01b. Preludio del Acto III ('Edgar')
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1VF7khpcGQUekJkiaArMK0QgyRaSVRjln') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Preludio del Acto III (''Edgar'')', NULL, 'Oficial', 'Gira 2022 Marzo 9-12 (Ópera a la carta), grupo 01b. Copia canónica en Para acomodar desde GIRAS 2022 / PARTICELLAS + SCORES.', '3.2.2.2 - 4.3.3.0 - Timp.+1 - Hp - Str', 'https://drive.google.com/open?id=1VF7khpcGQUekJkiaArMK0QgyRaSVRjln')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Puccini_Giacomo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1BpLMfjDEt2RBXTrx-TT_o7Iv5yBk8cwN/view?usp=drivesdk","description":"Arpa - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1pAp8I_IeJflTaL88xFHkZPqXNhJXgB0M/view?usp=drivesdk","description":"Clarinete Bb 1 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1oUzK7ge0pxBVruBOBbb_H6Y2wI80F8KF/view?usp=drivesdk","description":"Clarinete Bb 2 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1fUKS06-xd0hFVwT_1BXN1_jNvwdWm9mq/view?usp=drivesdk","description":"Corno F 1 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/15Nj-qsJlfEkC4Vdp52rSjAS3r_jOgGy8/view?usp=drivesdk","description":"Corno F 2 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/198gnL8TZI87QjG1nGuXeLH4vTf4N5iRG/view?usp=drivesdk","description":"Corno F 3 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1t0fY_gQS_0PPdc8vwGIX-FbgiSwCTaLl/view?usp=drivesdk","description":"Corno F 4 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1UXT7YWoBs3kbnHfKzSd-kjMKvHovQsiX/view?usp=drivesdk","description":"Fagot 1 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1FtYdd99UiItgphZIJuZiIVchpmitkVqA/view?usp=drivesdk","description":"Fagot 2 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1kHi2wg2jATPNF1RfiPy8FsLvd6VUm6vL/view?usp=drivesdk","description":"Fl Piccolo - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1y5YNHw37BIAM2-lQ4rIJ5DsCVk6PWjHE/view?usp=drivesdk","description":"Flauta 1 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1UqJJrIkf4EVQCIWBHbuSisyGPLqCDVlc/view?usp=drivesdk","description":"Flauta 2 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1_wW65wR-rrmq7abSo6uaH82Fxo0rV9h3/view?usp=drivesdk","description":"Oboe 1 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1n6Zw7k-ksTHb51-UgO16-Muowzbu2H9l/view?usp=drivesdk","description":"Oboe 2 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1gg0p7Wy3tAFbw1MM0AHXtsN7fc4uaiLx/view?usp=drivesdk","description":"Perc Percusión - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1-zopibqtNe5GJnVwdO6Qc_2BJjuybBB4/view?usp=drivesdk","description":"Perc Timbales - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Y5OgN6Pv4px_ftl6013Mh4TdIxtO4o1C/view?usp=drivesdk","description":"SCORE - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1qN7L3KmmgVjBXqhDPnexOsiFsjLd0FqR/view?usp=drivesdk","description":"Trombón 1 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1ln89hlsqhwDLhDVoAMhDdzhpioXtiS42/view?usp=drivesdk","description":"Trombón 2 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1sIy1hkQ4Ihl1EdtLcjUuQXbhgSHbYt8d/view?usp=drivesdk","description":"Trombón 3 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1rdOasIAgE1n7tsks3gpax-T3ELAGPL4U/view?usp=drivesdk","description":"Trompeta 1 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1HyBSXFGyPaFj4cT0d3HFaRb6c6ZXaR6r/view?usp=drivesdk","description":"Trompeta 2 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 3', '[{"url":"https://drive.google.com/file/d/1J1qvXa7DyEPeBdbEaXynDlZYzxGy8HET/view?usp=drivesdk","description":"Trompeta 3 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1RLCFuEG32TFKyPSx4_ZvMpD-UDSsoQOK/view?usp=drivesdk","description":"Viola - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1umYNIZe6P3MrG2VZVzI1Te3EcYPQX50A/view?usp=drivesdk","description":"Violín 1 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1L4ZmGjD3fh-u5xNiLJIp6yiqcPiVdDUx/view?usp=drivesdk","description":"Violín 2 - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1JDBR0kgllDLC3fntZB05t-H-cmTfZuD9/view?usp=drivesdk","description":"Violoncello y Contrabajo - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1JDBR0kgllDLC3fntZB05t-H-cmTfZuD9/view?usp=drivesdk","description":"Violoncello y Contrabajo - Edgar. Preludio Acto III - Puccini, G.pdf"}]', false);
  END IF;

  -- 02. Toi! Vous! ('Manon')
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1y3eiracZL0W2Hc_yVZPJx12jmqhC5Iqc') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Toi! Vous! (''Manon'')', NULL, 'Oficial', 'Gira 2022 Marzo 9-12 (Ópera a la carta), grupo 02. Copia canónica en Para acomodar desde GIRAS 2022 / PARTICELLAS + SCORES.', '2.2.2.2 - 4.2.3.0 - Timp - Hp - Str', 'https://drive.google.com/open?id=1y3eiracZL0W2Hc_yVZPJx12jmqhC5Iqc')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Massenet_Jules, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1deyvRL0efbK9szhYphwteofq3DReqx9W/view?usp=drivesdk","description":"Arpa - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/11C2uYuGXKIPL-7hN8T436NjRCLtkDr3Y/view?usp=drivesdk","description":"Clarinete Bb 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/11C2uYuGXKIPL-7hN8T436NjRCLtkDr3Y/view?usp=drivesdk","description":"Clarinete Bb 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1rjEVjz_qus1ktixqnqDkTs0AJ0I8YKMx/view?usp=drivesdk","description":"Corno F 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1rjEVjz_qus1ktixqnqDkTs0AJ0I8YKMx/view?usp=drivesdk","description":"Corno F 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1zYKx-ZA5HV-1FLVF9on1S-xeHWiioGX4/view?usp=drivesdk","description":"Corno F 3y4 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1zYKx-ZA5HV-1FLVF9on1S-xeHWiioGX4/view?usp=drivesdk","description":"Corno F 3y4 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1Kr9aa2PM8RE9NaOPUwM3-fMBhxO9B1pi/view?usp=drivesdk","description":"Fagot 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1Kr9aa2PM8RE9NaOPUwM3-fMBhxO9B1pi/view?usp=drivesdk","description":"Fagot 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1i-bZPr-6JJCj3_grlQRdphE6sc2U2Qy1/view?usp=drivesdk","description":"Flauta 1 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1n3XdYC6avSxcDOWHeX7Hk4PxeAouuXYD/view?usp=drivesdk","description":"Flauta 2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1etn7IT2u7yvr4jYeqZCuW2JAPc4ca3YT/view?usp=drivesdk","description":"Oboe 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1etn7IT2u7yvr4jYeqZCuW2JAPc4ca3YT/view?usp=drivesdk","description":"Oboe 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1EipYGpPolaFiDs94sQqOH23FidoqUWqu/view?usp=drivesdk","description":"Perc Timbales - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1pgmbh_WoLfWL-lhuera6V3Srs4lSwqCL/view?usp=drivesdk","description":"SCORE - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1vU7pFi1AzXmReaR8wmZxDgHkVspJ0uJt/view?usp=drivesdk","description":"Trombón 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1vU7pFi1AzXmReaR8wmZxDgHkVspJ0uJt/view?usp=drivesdk","description":"Trombón 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1r1dgoWcasg3z4ReMenZPsZh_OYzihioQ/view?usp=drivesdk","description":"Trombón 3 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1HhOrlc-Kc1lbmCV7WDiSO2npqU55dIOe/view?usp=drivesdk","description":"Trompeta 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1HhOrlc-Kc1lbmCV7WDiSO2npqU55dIOe/view?usp=drivesdk","description":"Trompeta 1y2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1S_n2n8oDHApaezuxNMa9jYXLTPwoG0G7/view?usp=drivesdk","description":"Viola - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1nnIPA2pnkYLuMBk6BUFRDrSgsi8lhV2t/view?usp=drivesdk","description":"Violín 1 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1gQq_gPNepu3dC371zw2gMELaxzSLuW5K/view?usp=drivesdk","description":"Violín 2 - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1bk5jKiHWgHCzWZuw0eV5gkkcEZKhoq8Y/view?usp=drivesdk","description":"Violoncello y Contrabajo - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1bk5jKiHWgHCzWZuw0eV5gkkcEZKhoq8Y/view?usp=drivesdk","description":"Violoncello y Contrabajo - Manon. Toi, vous! - Massenet, J.pdf"}]', false);
  END IF;

  -- 04. Donna non vidi mai ('Manon Lescaut')
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1vrgdFzzdh9-CaOgsSIZBpkBn4aCuy-_7') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Donna non vidi mai (''Manon Lescaut'')', NULL, 'Oficial', 'Gira 2022 Marzo 9-12 (Ópera a la carta), grupo 04. Copia canónica en Para acomodar desde GIRAS 2022 / PARTICELLAS + SCORES.', '3.3.3.2 - 4.0.2.0 - Timp - Hp - Str', 'https://drive.google.com/open?id=1vrgdFzzdh9-CaOgsSIZBpkBn4aCuy-_7')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Puccini_Giacomo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1TOiLTBaAJrBhLptUpzEOTZXyFE03047J/view?usp=drivesdk","description":"Arpa - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1faT9JHl0jhzAAEKraNijxT23yLaFu-b9/view?usp=drivesdk","description":"Clarinete Bajo - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1LJp12dzTPO6O9BRtiVugyMDw6rp2LPWV/view?usp=drivesdk","description":"Clarinete Bb 1 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1yCEKLQ9aMxBtbaZ5X5oiZuEmeiGE_xTf/view?usp=drivesdk","description":"Clarinete Bb 2 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1Ij8lRJDVhr3xuwVOaC8e0vtgl_RO0awi/view?usp=drivesdk","description":"Corno F 1 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1s9pVP1Y5jT_8SiCej3geZsyOGxtkcapd/view?usp=drivesdk","description":"Corno F 2 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1MkfrXQdjrZ9MSC5Xm0RoBOhKUBphXjuI/view?usp=drivesdk","description":"Corno F 3 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1i3j5COLBg1ONWLHP9bzEJJ651Q-jEqlS/view?usp=drivesdk","description":"Corno F 4 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Corno Inglés', '[{"url":"https://drive.google.com/file/d/1nyomKgl0PGdG_xjceRy2plgvLhNltnZn/view?usp=drivesdk","description":"Corno Inglés - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/18M1ABby6j6ecmuPuOY7KIQzhcTqiK_Sx/view?usp=drivesdk","description":"Fagot 1y2 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/18M1ABby6j6ecmuPuOY7KIQzhcTqiK_Sx/view?usp=drivesdk","description":"Fagot 1y2 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1pVhI1fV6vol-Cu8dQKjixt8mgp5s1dQY/view?usp=drivesdk","description":"Flauta 1 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/15Ea9otOX1QmmTnSztYid4O07hFqlPtFu/view?usp=drivesdk","description":"Flauta 2 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 3', '[{"url":"https://drive.google.com/file/d/15lYIu1vxTw6kiWw0IgIFiakXUTzf29f6/view?usp=drivesdk","description":"Flauta 3 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1R1PzwmyJlZ-Ve23XjkFawGxaJHHICa87/view?usp=drivesdk","description":"Oboe 1 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1DM28AapjiBKJGrnQBwarIc0pgVCUVq-s/view?usp=drivesdk","description":"Oboe 2 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1YfsiG_Zw6bJiwhfr2Vjiphr0t8WaWF8Z/view?usp=drivesdk","description":"Perc Timbales - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1lHXGvxI6tfe7dOyDx3_xCGpK5hSHSzEt/view?usp=drivesdk","description":"SCORE - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/12gF5oFDUsBNaBfu2anoJtC5EqiQQ9Xbj/view?usp=drivesdk","description":"Trombón 2 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/19wCy8zHp_Ux8kvsbzYl-42EeguexIBef/view?usp=drivesdk","description":"Trombón 3 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1fSI-J8vi5pVuyQYAsfePexlBcyFbMk24/view?usp=drivesdk","description":"Viola - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1g-B2GLpfhT8GeMcxvphdyZu_bDzZXE78/view?usp=drivesdk","description":"Violín 1 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1lNiYUfE504nelFyoLm5nBxSv5DbORxwN/view?usp=drivesdk","description":"Violín 2 - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1QU_iexIXRG1Ag9J4rNdexfn_bwKGBufR/view?usp=drivesdk","description":"Violoncello y Contrabajo - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1QU_iexIXRG1Ag9J4rNdexfn_bwKGBufR/view?usp=drivesdk","description":"Violoncello y Contrabajo - Manon Lescaut. Donna non vidi mai - Puccini, G.pdf"}]', false);
  END IF;

  -- 06. Pourquoi me réveiller ('Werther')
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1nkgNDeDbYcNfGPVNol8Od4NvsicW1oTQ') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Pourquoi me réveiller (''Werther'')', NULL, 'Oficial', 'Gira 2022 Marzo 9-12 (Ópera a la carta), grupo 06. Copia canónica en Para acomodar desde GIRAS 2022 / PARTICELLAS + SCORES.', '2.3.3.2 - 4.0.3.1 - Timp - Hp - Str', 'https://drive.google.com/open?id=1nkgNDeDbYcNfGPVNol8Od4NvsicW1oTQ')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Massenet_Jules, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1e15IY1m2QdJ_jzOdc-4mdmVU-2xqOBUg/view?usp=drivesdk","description":"Arpa - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1eNWZ0p_5epV6u0C9g6bsTcMVtjDdkwAD/view?usp=drivesdk","description":"Clarinete Bajo - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1R_4k7hXKiTeZm8dINu1GHVwwdiHuxgDn/view?usp=drivesdk","description":"Clarinete Bb 1y2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1R_4k7hXKiTeZm8dINu1GHVwwdiHuxgDn/view?usp=drivesdk","description":"Clarinete Bb 1y2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1bsO0XmMRtZfvnCjvmAgiDsM7_OyKWP_C/view?usp=drivesdk","description":"Corno F 1y2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1bsO0XmMRtZfvnCjvmAgiDsM7_OyKWP_C/view?usp=drivesdk","description":"Corno F 1y2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1bz2D8QmkrwaBUwKRynZw5ci0r2fWYvRL/view?usp=drivesdk","description":"Corno F 3y4 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1bz2D8QmkrwaBUwKRynZw5ci0r2fWYvRL/view?usp=drivesdk","description":"Corno F 3y4 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/13y7-MNlJlR_O7QrMDY52c6eWDdGcXWIX/view?usp=drivesdk","description":"Fagot 1y2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/13y7-MNlJlR_O7QrMDY52c6eWDdGcXWIX/view?usp=drivesdk","description":"Fagot 1y2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1j7o6G0EAivQY1fwBzuLgm-MdMGLsmzRH/view?usp=drivesdk","description":"Flauta 1y2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1j7o6G0EAivQY1fwBzuLgm-MdMGLsmzRH/view?usp=drivesdk","description":"Flauta 1y2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1GImmDqXHG6X6gnCDJuSc8WAdIKlI5I08/view?usp=drivesdk","description":"Oboe 1 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1dvEbzaxCI0mD75jqPr6X_oEmLSJ9SRTR/view?usp=drivesdk","description":"Oboe 2 y Corno Inglés - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06b', 'Corno Inglés', '[{"url":"https://drive.google.com/file/d/1dvEbzaxCI0mD75jqPr6X_oEmLSJ9SRTR/view?usp=drivesdk","description":"Oboe 2 y Corno Inglés - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1UzTxpr5Wm_Az7smInlRk8-tXK6XsmlJh/view?usp=drivesdk","description":"Perc Timbales - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1GXqRLdsT1ndIq9j6Ez-qgeN1ppKiK3kR/view?usp=drivesdk","description":"SCORE - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1V6qfqeuVos0WW5BGsFq09X420fAjJblk/view?usp=drivesdk","description":"Trombón 1y2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1V6qfqeuVos0WW5BGsFq09X420fAjJblk/view?usp=drivesdk","description":"Trombón 1y2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1K3hdeeKEC-dIUJdQBH1wQPKy2oCSeunc/view?usp=drivesdk","description":"Trombón 3 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1FXkennL7wm2DJgeQ-uowrKy0F6tRVBMC/view?usp=drivesdk","description":"Tuba - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1xRS9RlhKb5Y5hLBJdVBU-yV3lVGBzESI/view?usp=drivesdk","description":"Viola - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1doAiUgj8IvENf2BskDm5O03uO9enUP7c/view?usp=drivesdk","description":"Violín 1 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1a4iKAzvaHulipSqFJVrD7pGGPVHdP75p/view?usp=drivesdk","description":"Violín 2 - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1KUeX5pfWirUFxuXNcZwGbQ890Bg_QhPa/view?usp=drivesdk","description":"Violoncello y Contrabajo - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1KUeX5pfWirUFxuXNcZwGbQ890Bg_QhPa/view?usp=drivesdk","description":"Violoncello y Contrabajo - Werther. Pourquoi me réveiller - Massenet, J.pdf"}]', false);
  END IF;

  -- 09. Gepriesen sei die Stunde ('Tannhäuser')
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1Cjn-Qc_y1EkuJam7z3WdI90_ui70waba') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Gepriesen sei die Stunde (''Tannhäuser'')', NULL, 'Oficial', 'Gira 2022 Marzo 9-12 (Ópera a la carta), grupo 09. Copia canónica en Para acomodar desde GIRAS 2022 / PARTICELLAS + SCORES.', '2.2.2.2 - 4.2.0.0 - Timp - Str', 'https://drive.google.com/open?id=1Cjn-Qc_y1EkuJam7z3WdI90_ui70waba')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_Wagner_Richard, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1VlJIXCAtpKnOqG6Rb1hge7Y7yuCFAV_x/view?usp=drivesdk","description":"Clarinete Bb 1 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1YRfcX7dMPPaUV1JzUUZWJcfC2oCHQMc0/view?usp=drivesdk","description":"Clarinete Bb 2 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1edJWa7b8blfVLK3e97m5O39Ev6KT5dRs/view?usp=drivesdk","description":"Contrabajo - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1cqWn_pF2eLlLYFBvOt6zNCN7lR22NIJM/view?usp=drivesdk","description":"Corno F 1 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1CJyEyiloyLY0-nnz7cX0Fvldhc-OLVEV/view?usp=drivesdk","description":"Corno F 2 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1MzU4p4E8cKQgms66ejdEw_fEs297UcIo/view?usp=drivesdk","description":"Corno F 3 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1jb0gQi5PO8vL71pvvWeS2R4oPcXL3xGZ/view?usp=drivesdk","description":"Corno F 4 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1C9hZJtx4jONjxEH4pHs-6xEAb7X0ah8c/view?usp=drivesdk","description":"Fagot 1 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1hS5MyUSoszlaTUD_AIi4lB2Qwzz14SYK/view?usp=drivesdk","description":"Fagot 2 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1LOxLSCXvyHCM2mrTAWPGcFHH-2uNZL63/view?usp=drivesdk","description":"Flauta 1 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1xEQaaTzZSIFcvMdPGLkACfwQ_qIRV0wj/view?usp=drivesdk","description":"Flauta 2 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1ItqboMWIDrahcD1YgjrOPq39B4PIRsAn/view?usp=drivesdk","description":"Oboe 1 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/10AVNjuX63xzen3k_8SVFk7fyRTyIyf0W/view?usp=drivesdk","description":"Oboe 2 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1Rfs0x5YamTDDpvyxCUQJAJ9vucURbqwV/view?usp=drivesdk","description":"Perc Timbales - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1E065SyoTlz3y7SrTRKW2d6rZMhOU2R6E/view?usp=drivesdk","description":"SCORE - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1lDO3j4RS29NTUnBK_sdA8S9DeAaiQWk-/view?usp=drivesdk","description":"Trompeta 1 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/16Bfdit1DUx1V22AgHtDzKVIU14jKtSiq/view?usp=drivesdk","description":"Trompeta 2 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1azC8PRcH9NQwrO2VPYk1crwwzcN0A8ju/view?usp=drivesdk","description":"Viola - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1k8LmTt0y4BaCxz5zxrstfDaZBqwgy0Dm/view?usp=drivesdk","description":"Violín 1 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1mCaW0xz9b4hr3jPaS7EARTaKpdEwCfr3/view?usp=drivesdk","description":"Violín 2 - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1ej3XY3iF6DX4owrgMVGt-bA6zu4BZyS1/view?usp=drivesdk","description":"Violoncello - Tannhäuser. Gepriesen sei die Stunde - Wagner, R.pdf"}]', false);
  END IF;

  -- 10. Dúo de amor ('Lin Calel')
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1WgW6oi126tWnRw5d-ab_KREpxBoiePeQ') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('Dúo de amor (''Lin Calel'')', _p_L_pez_Manzitti_, 'Oficial', 'Gira 2022 Marzo 9-12 (Ópera a la carta). Ópera Lin Calel de Arnaldo D''Esposito; edición/orquestación López Manzitti (arreglador según nombre de carpeta Drive).', '3.2.2.2 - 4.2.2.1 - Timp - Hp - Str', 'https://drive.google.com/open?id=1WgW6oi126tWnRw5d-ab_KREpxBoiePeQ')
    RETURNING id INTO _id_obra;
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_D_Esposito_Arnaldo, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_L_pez_Manzitti_, 'arreglador');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1YiYaZj9T6hfS9BhCW7pg1N6SgwttFXgk/view?usp=drivesdk","description":"Arpa - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1Y5_lZBBDb8wd_jl4pxKvD2XKjd2M_sXt/view?usp=drivesdk","description":"Clarinete Bb 1 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1Y3t-Sq5QqcImcBkddXAEnC6x84WhCBiO/view?usp=drivesdk","description":"Clarinete Bb 2 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Z2-lmUSw0MCAxfNk0XN4BxW-VCZhPEOL/view?usp=drivesdk","description":"Contrabajo - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1Y29p5Wb5z5tnyJ8x98Y6TEQM6-JsrVyt/view?usp=drivesdk","description":"Corno F 1y2 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1Y29p5Wb5z5tnyJ8x98Y6TEQM6-JsrVyt/view?usp=drivesdk","description":"Corno F 1y2 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1Z0erXJJxh65dGiAorCln3fcTDWmIlOjI/view?usp=drivesdk","description":"Corno F 3y4 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1Z0erXJJxh65dGiAorCln3fcTDWmIlOjI/view?usp=drivesdk","description":"Corno F 3y4 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1Y3lYIkoLXCIPa9z9ol_3vsaLM_VDtAc-/view?usp=drivesdk","description":"Fagot 1 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1Y37mpFP81mGKn6q_6eayn4PuXQPIQwW3/view?usp=drivesdk","description":"Fagot 2 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1YZgcMEGgkCsqdzY1dv-HWByfLsWv3m2s/view?usp=drivesdk","description":"Fl Piccolo - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1YQ8klA7RLtbcdP73ntMwgbHSeBBvWvTL/view?usp=drivesdk","description":"Flauta 1 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1YO-9Cvrbfd0mXfxls4TZ6OJtuzPTQNkY/view?usp=drivesdk","description":"Flauta 2 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1YHkxsAXJQwc3TMQEjivgJL4Tm3w8zE_t/view?usp=drivesdk","description":"Oboe 1 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1Y7kLJAlyeXxzbpKv-zzpjs5JhfQTENJr/view?usp=drivesdk","description":"Oboe 2 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1XwaSfBr9cyYQ9ppzgNWpXYwQ3mou4RJW/view?usp=drivesdk","description":"Perc Timbales - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Z4ZlZqpGLISEpg7bFpu6_GcBMISZiBi4/view?usp=drivesdk","description":"SCORE - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1YrmM_O0-jn1EvI0dFqjKFqXSBOTeMimU/view?usp=drivesdk","description":"Trombón 1 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1YoxPEm8L23Hnvaem_kD_Hfg07yYXB46z/view?usp=drivesdk","description":"Trombón 2 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1Z-EHyi82jAojKfduzDArWN5i3w9APf2B/view?usp=drivesdk","description":"Trompeta Bb 1 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1YutFKuR-hSuDOhzVxLYE3cgeaj3GGsCY/view?usp=drivesdk","description":"Trompeta Bb 2 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1YjKzikwscwtKBKCq4d-7QNc9tyjfSSvJ/view?usp=drivesdk","description":"Tuba - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Ye86XnbkxumU_MxVQczUY8H654tkTirb/view?usp=drivesdk","description":"Viola - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Yh8l6xx3RJskVBDNHUD_z0Gm_31LRS-X/view?usp=drivesdk","description":"Violín 1 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1YeOWC37YxbbcAMI6IUKk9BhuNrcpn5A4/view?usp=drivesdk","description":"Violín 2 - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1YbegJemyjeNPUCy_V5MfmK4hvEFEk5t_/view?usp=drivesdk","description":"Violoncello - Lin Calel - Dúo de amor - D''Esposito-López Manzitti.pdf"}]', false);
  END IF;

END $$;

INSERT INTO obras_repertorios_legacy (id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles, fuente) SELECT (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1VF7khpcGQUekJkiaArMK0QgyRaSVRjln' ORDER BY id LIMIT 1), '1VF7khpcGQUekJkiaArMK0QgyRaSVRjln', 'https://drive.google.com/open?id=1VF7khpcGQUekJkiaArMK0QgyRaSVRjln', 'Marzo 9-12 - Alto Valle - Ópera a la carta', '2022-03-09'::date, '2022-03-12'::date, 'Sinfónico', 'Alto Valle', 'Gira 1', '03a', 'Cuerdas;Maderas;Bronces;Percusión', 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)' WHERE (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1VF7khpcGQUekJkiaArMK0QgyRaSVRjln' ORDER BY id LIMIT 1) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM obras_repertorios_legacy x WHERE x.id_obra = (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1VF7khpcGQUekJkiaArMK0QgyRaSVRjln' ORDER BY id LIMIT 1) AND x.nombre_gira = 'Marzo 9-12 - Alto Valle - Ópera a la carta' AND x.fecha_desde = '2022-03-09'::date AND x.fuente = 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)');
INSERT INTO obras_repertorios_legacy (id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles, fuente) SELECT (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1y3eiracZL0W2Hc_yVZPJx12jmqhC5Iqc' ORDER BY id LIMIT 1), '1y3eiracZL0W2Hc_yVZPJx12jmqhC5Iqc', 'https://drive.google.com/open?id=1y3eiracZL0W2Hc_yVZPJx12jmqhC5Iqc', 'Marzo 9-12 - Alto Valle - Ópera a la carta', '2022-03-09'::date, '2022-03-12'::date, 'Sinfónico', 'Alto Valle', 'Gira 1', '03a', 'Cuerdas;Maderas;Bronces;Percusión', 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)' WHERE (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1y3eiracZL0W2Hc_yVZPJx12jmqhC5Iqc' ORDER BY id LIMIT 1) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM obras_repertorios_legacy x WHERE x.id_obra = (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1y3eiracZL0W2Hc_yVZPJx12jmqhC5Iqc' ORDER BY id LIMIT 1) AND x.nombre_gira = 'Marzo 9-12 - Alto Valle - Ópera a la carta' AND x.fecha_desde = '2022-03-09'::date AND x.fuente = 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)');
INSERT INTO obras_repertorios_legacy (id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles, fuente) SELECT (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1vrgdFzzdh9-CaOgsSIZBpkBn4aCuy-_7' ORDER BY id LIMIT 1), '1vrgdFzzdh9-CaOgsSIZBpkBn4aCuy-_7', 'https://drive.google.com/open?id=1vrgdFzzdh9-CaOgsSIZBpkBn4aCuy-_7', 'Marzo 9-12 - Alto Valle - Ópera a la carta', '2022-03-09'::date, '2022-03-12'::date, 'Sinfónico', 'Alto Valle', 'Gira 1', '03a', 'Cuerdas;Maderas;Bronces;Percusión', 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)' WHERE (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1vrgdFzzdh9-CaOgsSIZBpkBn4aCuy-_7' ORDER BY id LIMIT 1) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM obras_repertorios_legacy x WHERE x.id_obra = (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1vrgdFzzdh9-CaOgsSIZBpkBn4aCuy-_7' ORDER BY id LIMIT 1) AND x.nombre_gira = 'Marzo 9-12 - Alto Valle - Ópera a la carta' AND x.fecha_desde = '2022-03-09'::date AND x.fuente = 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)');
INSERT INTO obras_repertorios_legacy (id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles, fuente) SELECT (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1nkgNDeDbYcNfGPVNol8Od4NvsicW1oTQ' ORDER BY id LIMIT 1), '1nkgNDeDbYcNfGPVNol8Od4NvsicW1oTQ', 'https://drive.google.com/open?id=1nkgNDeDbYcNfGPVNol8Od4NvsicW1oTQ', 'Marzo 9-12 - Alto Valle - Ópera a la carta', '2022-03-09'::date, '2022-03-12'::date, 'Sinfónico', 'Alto Valle', 'Gira 1', '03a', 'Cuerdas;Maderas;Bronces;Percusión', 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)' WHERE (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1nkgNDeDbYcNfGPVNol8Od4NvsicW1oTQ' ORDER BY id LIMIT 1) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM obras_repertorios_legacy x WHERE x.id_obra = (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1nkgNDeDbYcNfGPVNol8Od4NvsicW1oTQ' ORDER BY id LIMIT 1) AND x.nombre_gira = 'Marzo 9-12 - Alto Valle - Ópera a la carta' AND x.fecha_desde = '2022-03-09'::date AND x.fuente = 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)');
INSERT INTO obras_repertorios_legacy (id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles, fuente) SELECT (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1Cjn-Qc_y1EkuJam7z3WdI90_ui70waba' ORDER BY id LIMIT 1), '1Cjn-Qc_y1EkuJam7z3WdI90_ui70waba', 'https://drive.google.com/open?id=1Cjn-Qc_y1EkuJam7z3WdI90_ui70waba', 'Marzo 9-12 - Alto Valle - Ópera a la carta', '2022-03-09'::date, '2022-03-12'::date, 'Sinfónico', 'Alto Valle', 'Gira 1', '03a', 'Cuerdas;Maderas;Bronces;Percusión', 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)' WHERE (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1Cjn-Qc_y1EkuJam7z3WdI90_ui70waba' ORDER BY id LIMIT 1) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM obras_repertorios_legacy x WHERE x.id_obra = (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1Cjn-Qc_y1EkuJam7z3WdI90_ui70waba' ORDER BY id LIMIT 1) AND x.nombre_gira = 'Marzo 9-12 - Alto Valle - Ópera a la carta' AND x.fecha_desde = '2022-03-09'::date AND x.fuente = 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)');
INSERT INTO obras_repertorios_legacy (id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles, fuente) SELECT (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1WgW6oi126tWnRw5d-ab_KREpxBoiePeQ' ORDER BY id LIMIT 1), '1WgW6oi126tWnRw5d-ab_KREpxBoiePeQ', 'https://drive.google.com/open?id=1WgW6oi126tWnRw5d-ab_KREpxBoiePeQ', 'Marzo 9-12 - Alto Valle - Ópera a la carta', '2022-03-09'::date, '2022-03-12'::date, 'Sinfónico', 'Alto Valle', 'Gira 1', '03a', 'Cuerdas;Maderas;Bronces;Percusión', 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)' WHERE (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1WgW6oi126tWnRw5d-ab_KREpxBoiePeQ' ORDER BY id LIMIT 1) IS NOT NULL AND NOT EXISTS (SELECT 1 FROM obras_repertorios_legacy x WHERE x.id_obra = (SELECT id FROM obras WHERE link_drive = 'https://drive.google.com/open?id=1WgW6oi126tWnRw5d-ab_KREpxBoiePeQ' ORDER BY id LIMIT 1) AND x.nombre_gira = 'Marzo 9-12 - Alto Valle - Ópera a la carta' AND x.fecha_desde = '2022-03-09'::date AND x.fuente = 'Giras 2022 Rep (Marzo 9-12, carga Drive manual)');
COMMIT;
