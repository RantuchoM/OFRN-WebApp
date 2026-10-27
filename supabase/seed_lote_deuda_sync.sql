-- Lote deuda Para acomodar (orquestales + cámara + SCORE-only + Hammersmith)
-- Generado: 2026-10-27

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Onslow_George bigint;
  _id_comp_Liszt_Franz bigint;
  _id_comp_Rimsky_Korsakov_Nikolai bigint;
  _id_comp_Chausson_Ernest bigint;
  _id_comp_Dvo_k_Anton_n bigint;
  _id_comp_Stravinsky_Igor bigint;
  _id_comp_Borodin_Aleksandr bigint;
  _id_comp_Mahler_Gustav bigint;
  _id_comp_Holst_Gustav bigint;
  _id_comp_Williams_Alberto bigint;
  _id_comp_Honegger_Arthur bigint;
  _id_comp_Reger_Max bigint;
  _id_comp_Schoenberg_Arnold bigint;
  _id_comp_Beethoven_Ludwig_van bigint;
  _id_comp_Mozart_Wolfgang_Amadeus bigint;
  _id_comp_Puccini_Giacomo bigint;
  _id_comp_Grieg_Edvard bigint;
BEGIN
  SELECT id INTO _id_comp_Onslow_George FROM compositores WHERE apellido = 'Onslow' AND (nombre = 'George' OR (nombre IS NULL AND 'George' IS NULL)) LIMIT 1;
  IF _id_comp_Onslow_George IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Onslow', 'George') RETURNING id INTO _id_comp_Onslow_George;
  END IF;

  SELECT id INTO _id_comp_Liszt_Franz FROM compositores WHERE apellido = 'Liszt' AND (nombre = 'Franz' OR (nombre IS NULL AND 'Franz' IS NULL)) LIMIT 1;
  IF _id_comp_Liszt_Franz IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Liszt', 'Franz') RETURNING id INTO _id_comp_Liszt_Franz;
  END IF;

  SELECT id INTO _id_comp_Rimsky_Korsakov_Nikolai FROM compositores WHERE apellido = 'Rimsky-Korsakov' AND (nombre = 'Nikolai' OR (nombre IS NULL AND 'Nikolai' IS NULL)) LIMIT 1;
  IF _id_comp_Rimsky_Korsakov_Nikolai IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Rimsky-Korsakov', 'Nikolai') RETURNING id INTO _id_comp_Rimsky_Korsakov_Nikolai;
  END IF;

  SELECT id INTO _id_comp_Chausson_Ernest FROM compositores WHERE apellido = 'Chausson' AND (nombre = 'Ernest' OR (nombre IS NULL AND 'Ernest' IS NULL)) LIMIT 1;
  IF _id_comp_Chausson_Ernest IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Chausson', 'Ernest') RETURNING id INTO _id_comp_Chausson_Ernest;
  END IF;

  SELECT id INTO _id_comp_Dvo_k_Anton_n FROM compositores WHERE apellido = 'Dvořák' AND (nombre = 'Antonín' OR (nombre IS NULL AND 'Antonín' IS NULL)) LIMIT 1;
  IF _id_comp_Dvo_k_Anton_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Dvořák', 'Antonín') RETURNING id INTO _id_comp_Dvo_k_Anton_n;
  END IF;

  SELECT id INTO _id_comp_Stravinsky_Igor FROM compositores WHERE apellido = 'Stravinsky' AND (nombre = 'Igor' OR (nombre IS NULL AND 'Igor' IS NULL)) LIMIT 1;
  IF _id_comp_Stravinsky_Igor IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Stravinsky', 'Igor') RETURNING id INTO _id_comp_Stravinsky_Igor;
  END IF;

  SELECT id INTO _id_comp_Borodin_Aleksandr FROM compositores WHERE apellido = 'Borodin' AND (nombre = 'Aleksandr' OR (nombre IS NULL AND 'Aleksandr' IS NULL)) LIMIT 1;
  IF _id_comp_Borodin_Aleksandr IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Borodin', 'Aleksandr') RETURNING id INTO _id_comp_Borodin_Aleksandr;
  END IF;

  SELECT id INTO _id_comp_Mahler_Gustav FROM compositores WHERE apellido = 'Mahler' AND (nombre = 'Gustav' OR (nombre IS NULL AND 'Gustav' IS NULL)) LIMIT 1;
  IF _id_comp_Mahler_Gustav IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mahler', 'Gustav') RETURNING id INTO _id_comp_Mahler_Gustav;
  END IF;

  SELECT id INTO _id_comp_Holst_Gustav FROM compositores WHERE apellido = 'Holst' AND (nombre = 'Gustav' OR (nombre IS NULL AND 'Gustav' IS NULL)) LIMIT 1;
  IF _id_comp_Holst_Gustav IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Holst', 'Gustav') RETURNING id INTO _id_comp_Holst_Gustav;
  END IF;

  SELECT id INTO _id_comp_Williams_Alberto FROM compositores WHERE apellido = 'Williams' AND (nombre = 'Alberto' OR (nombre IS NULL AND 'Alberto' IS NULL)) LIMIT 1;
  IF _id_comp_Williams_Alberto IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Williams', 'Alberto') RETURNING id INTO _id_comp_Williams_Alberto;
  END IF;

  SELECT id INTO _id_comp_Honegger_Arthur FROM compositores WHERE apellido = 'Honegger' AND (nombre = 'Arthur' OR (nombre IS NULL AND 'Arthur' IS NULL)) LIMIT 1;
  IF _id_comp_Honegger_Arthur IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Honegger', 'Arthur') RETURNING id INTO _id_comp_Honegger_Arthur;
  END IF;

  SELECT id INTO _id_comp_Reger_Max FROM compositores WHERE apellido = 'Reger' AND (nombre = 'Max' OR (nombre IS NULL AND 'Max' IS NULL)) LIMIT 1;
  IF _id_comp_Reger_Max IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Reger', 'Max') RETURNING id INTO _id_comp_Reger_Max;
  END IF;

  SELECT id INTO _id_comp_Schoenberg_Arnold FROM compositores WHERE apellido = 'Schoenberg' AND (nombre = 'Arnold' OR (nombre IS NULL AND 'Arnold' IS NULL)) LIMIT 1;
  IF _id_comp_Schoenberg_Arnold IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Schoenberg', 'Arnold') RETURNING id INTO _id_comp_Schoenberg_Arnold;
  END IF;

  SELECT id INTO _id_comp_Beethoven_Ludwig_van FROM compositores WHERE apellido = 'Beethoven' AND (nombre = 'Ludwig van' OR (nombre IS NULL AND 'Ludwig van' IS NULL)) LIMIT 1;
  IF _id_comp_Beethoven_Ludwig_van IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Beethoven', 'Ludwig van') RETURNING id INTO _id_comp_Beethoven_Ludwig_van;
  END IF;

  SELECT id INTO _id_comp_Mozart_Wolfgang_Amadeus FROM compositores WHERE apellido = 'Mozart' AND (nombre = 'Wolfgang Amadeus' OR (nombre IS NULL AND 'Wolfgang Amadeus' IS NULL)) LIMIT 1;
  IF _id_comp_Mozart_Wolfgang_Amadeus IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mozart', 'Wolfgang Amadeus') RETURNING id INTO _id_comp_Mozart_Wolfgang_Amadeus;
  END IF;

  SELECT id INTO _id_comp_Puccini_Giacomo FROM compositores WHERE apellido = 'Puccini' AND (nombre = 'Giacomo' OR (nombre IS NULL AND 'Giacomo' IS NULL)) LIMIT 1;
  IF _id_comp_Puccini_Giacomo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Puccini', 'Giacomo') RETURNING id INTO _id_comp_Puccini_Giacomo;
  END IF;

  SELECT id INTO _id_comp_Grieg_Edvard FROM compositores WHERE apellido = 'Grieg' AND (nombre = 'Edvard' OR (nombre IS NULL AND 'Edvard' IS NULL)) LIMIT 1;
  IF _id_comp_Grieg_Edvard IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Grieg', 'Edvard') RETURNING id INTO _id_comp_Grieg_Edvard;
  END IF;

  -- <p>Quinteto Nro. 27 en Re mayor, Op. 68</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Scherzo. Allegro</div><div>&nbsp; III. Andantino</div><div>&nbsp; IV. Finale. Allegro</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Quinteto Nro. 27 en Re mayor, Op. 68</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Scherzo. Allegro</div><div>&nbsp; III. Andantino</div><div>&nbsp; IV. Finale. Allegro</div>'
      AND o.observaciones = 'Para acomodar — Onslow, G. - Quinteto Nro. 27 en Re mayor, Op. 68'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Quinteto Nro. 27 en Re mayor, Op. 68</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Scherzo. Allegro</div><div>&nbsp; III. Andantino</div><div>&nbsp; IV. Finale. Allegro</div>',
      NULL,
      1848,
      NULL,
      'Oficial',
      'Para acomodar — Onslow, G. - Quinteto Nro. 27 en Re mayor, Op. 68',
      'Str',
      'https://drive.google.com/drive/folders/1S_ADaNrOwDrkctsAxsFfxOdGGf9P4ZSG'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Onslow_George, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1d84ak4pBSsVBX7k61Xci9tGcAJaM-zFO/view?usp=drivesdk","description":"Contrabajo - op.68. Quinteto Nro. 27 en Re mayor - Onslow, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/17cnDG_QyC5331vobpLvDYSM70tf-qy7r/view?usp=drivesdk","description":"Viola - op.68. Quinteto Nro. 27 en Re mayor - Onslow, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Spb86a0-YgykfvCJtRtHAvVmds5HYmKz/view?usp=drivesdk","description":"Violín 1 - op.68. Quinteto Nro. 27 en Re mayor - Onslow, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1NFVNUkeln882kt_Klmf8uinSitR_VKwj/view?usp=drivesdk","description":"Violín 2 - op.68. Quinteto Nro. 27 en Re mayor - Onslow, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 1', '[{"url":"https://drive.google.com/file/d/1VklDglJYCc2T-ZXvEQ5iKCkaQMAwbh3t/view?usp=drivesdk","description":"Violoncello 1 - op.68. Quinteto Nro. 27 en Re mayor - Onslow, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello 2', '[{"url":"https://drive.google.com/file/d/1ACIOKbdI4rmicD40zKZPPHwAgL0s8k2I/view?usp=drivesdk","description":"Violoncello 2 - op.68. Quinteto Nro. 27 en Re mayor - Onslow, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Quinteto Nro. 27 en Re mayor, Op. 68</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Scherzo. Allegro</div><div>&nbsp; III. Andantino</div><div>&nbsp; IV. Finale. Allegro</div>';
  END IF;

  -- <p>Tasso. Lamento e Trionfo, S. 96</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Tasso. Lamento e Trionfo, S. 96</p>'
      AND o.observaciones = 'Para acomodar — Liszt, F. - Tasso. Lamento e Trionfo, S. 96'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Tasso. Lamento e Trionfo, S. 96</p>',
      NULL,
      1849,
      NULL,
      'Oficial',
      'Para acomodar — Liszt, F. - Tasso. Lamento e Trionfo, S. 96',
      '3.2.3.2 - 4.4.3.1 - Timp.+4 - Hp - Str',
      'https://drive.google.com/drive/folders/1Mv-cTAL2Zb9L6dEkMW5__-oChHPvfAib'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Liszt_Franz, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1GKefro8O0-ySeFfur1NoAtzLivZ5dEEP/view?usp=drivesdk","description":"Arpa - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1raURe6Gyq9dq4WBUXAyYxieGEV7f2LPp/view?usp=drivesdk","description":"Clarinete Bajo - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1X-ps9BUY6zKgeEmz7uw7YnRPtJh3CLIi/view?usp=drivesdk","description":"Clarinete Bb 1 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1EIDhBTVTThlG7efs4Xo7qdCdQBuKdoMz/view?usp=drivesdk","description":"Clarinete Bb 2 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Af1CXwxTebxby5wytXnDIl1y4szaXg0M/view?usp=drivesdk","description":"Contrabajo - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1tvAHE06bcCDCN91kpxweKffdziTFIyfm/view?usp=drivesdk","description":"Corno F 1 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/14uSEawLgvGvp1FIXyFQz1SFFxn8Hl9IK/view?usp=drivesdk","description":"Corno F 2 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1WAiE4PmBYp3dS-gjulSm3I28ppeXlSev/view?usp=drivesdk","description":"Corno F 3 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1LRM1lvouPQaq4tLVpOrNQvlp2h11LwBw/view?usp=drivesdk","description":"Corno F 4 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/10mKSzjMiLJWbaMIebQypPN-sFFXOG9FT/view?usp=drivesdk","description":"Fagot 1 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1_TzitztWCuFWzLhBaZZB9a8MzX739cK4/view?usp=drivesdk","description":"Fagot 2 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1Ubao_hsGCOpTpdsXySSdtAqg-eKeOZj2/view?usp=drivesdk","description":"Fl Piccolo - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1ryvqynbxqGzNA0EYcnDzewBObK4hVGji/view?usp=drivesdk","description":"Flauta 1 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1R-eiZ5DpDkXDvw07wALm0rH4sf912LIM/view?usp=drivesdk","description":"Flauta 2 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1fPw2ZdJyKuGG9zQFS0d1b9P7G68fPTxH/view?usp=drivesdk","description":"Oboe 1 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1qQikqVM9CkPqv7ytzGKg9U6_HNNMEoN5/view?usp=drivesdk","description":"Oboe 2 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1y-h13OPo5HnR1QoCUbUFiBqUTcTyQJpg/view?usp=drivesdk","description":"Perc Bombo - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1llj6C7k-PTqW8vfYVyQ_QikZdFiFtmQI/view?usp=drivesdk","description":"Perc Platillo - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/11B4R7HcwqwGbeXO0EyEeCYwaIgYSgNyR/view?usp=drivesdk","description":"Perc Tambor - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1Avi3AKsJgytv09fsn7rpXo80SY-vHiyX/view?usp=drivesdk","description":"Perc Timbal - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1TRcQ1v6GT_9EuvFSz4YC9fxeGEBsvgV8/view?usp=drivesdk","description":"Perc Triángulo - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1ePoLH00k9m_XVO2qBh98lLjYXdDMcHHC/view?usp=drivesdk","description":"SCORE - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1tmznXViI1hIj74QURAE-OB67O4r_-CKN/view?usp=drivesdk","description":"Trombón 1 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1Idmhs5obwmbkbj2q9rNGQzXY4qNG11TC/view?usp=drivesdk","description":"Trombón 2 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1A4bbj1A2r_uk-rQuT25Fj_IKvhLOlV0E/view?usp=drivesdk","description":"Trombón Bajo - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1pJfDyXkNG6VVGlmPfap8IjmlaNmXlWA3/view?usp=drivesdk","description":"Trompeta Bb 1 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1mE39aemC3JerGa3LwRthIQoLQBUpxfLm/view?usp=drivesdk","description":"Trompeta Bb 2 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta C 3', '[{"url":"https://drive.google.com/file/d/1zNWmJNoESYMFBaWppJOMwn3dltdcwu7F/view?usp=drivesdk","description":"Trompeta C 3 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta C 4', '[{"url":"https://drive.google.com/file/d/1-1wBfG6d-eZT5nqKHLiMnaWyjF6v-D13/view?usp=drivesdk","description":"Trompeta C 4 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1vM9eGAod1TkXlSorhuQWU1TY3MmDz92U/view?usp=drivesdk","description":"Tuba - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/16bvD-9NEWytsCR_GspWXKte7hO0rHoKs/view?usp=drivesdk","description":"Viola - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1q6sDfzSqY05IPZq946bZl2v9jKbQ5xbd/view?usp=drivesdk","description":"Violín 1 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1BpqYr-iMGNyOODNc9rutbjLxM81GSpbb/view?usp=drivesdk","description":"Violín 2 - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1X2sfl2AqUtjwQuHEzmYFonda0C4r25yM/view?usp=drivesdk","description":"Violoncello - S.96. Tasso. Lamento e Trionfo - Liszt, F.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Tasso. Lamento e Trionfo, S. 96</p>';
  END IF;

  -- <p>Sherezade, Op. 35</p><div>&nbsp; I. The Sea and Sinbad's Ship</div><div>&nbsp; II. The Kalendar Prince</div><div>&nbsp; III. The Young Prince and the Young Princess</div><div>&nbsp; IV. Festival at Baghdad. The Sea. The Ship Breaks against a Cliff Surmounted by a Bronze Horseman</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Sherezade, Op. 35</p><div>&nbsp; I. The Sea and Sinbad''s Ship</div><div>&nbsp; II. The Kalendar Prince</div><div>&nbsp; III. The Young Prince and the Young Princess</div><div>&nbsp; IV. Festival at Baghdad. The Sea. The Ship Breaks against a Cliff Surmounted by a Bronze Horseman</div>'
      AND o.observaciones = 'Para acomodar — Rimsky-Korsakov, N. - Sherezade, Op. 35'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Sherezade, Op. 35</p><div>&nbsp; I. The Sea and Sinbad''s Ship</div><div>&nbsp; II. The Kalendar Prince</div><div>&nbsp; III. The Young Prince and the Young Princess</div><div>&nbsp; IV. Festival at Baghdad. The Sea. The Ship Breaks against a Cliff Surmounted by a Bronze Horseman</div>',
      NULL,
      1888,
      NULL,
      'Oficial',
      'Para acomodar — Rimsky-Korsakov, N. - Sherezade, Op. 35',
      '3.3.2.2 - 4.2.3.1 - Timp.+5 - Hp - Str',
      'https://drive.google.com/drive/folders/1aiQViT1F5oZQpiKDF_zFf9Y3H0QmIbg2'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Rimsky_Korsakov_Nikolai, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/10nAZM0Bz7dr7q5bF7KuHuuocyaQsmUut/view?usp=drivesdk","description":"Arpa - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1IjX6xzH52d0mDN1hEq1Cr44GIehmn9_F/view?usp=drivesdk","description":"Clarinete 1 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1t8f6xR6Oh21YGfzGBF3ClaYobkWiT3Xl/view?usp=drivesdk","description":"Clarinete 2 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1c9mUOo3kWXe77RWdPTUmc2e8mmERjW5y/view?usp=drivesdk","description":"Contrabajo - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1mUiju_XbFhPnTJ-H7ZbbiEQT6R6EP_sr/view?usp=drivesdk","description":"Corno F 1 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1-4juUUbO8Xcwz_u1TYYtPdLVaKJxa-6W/view?usp=drivesdk","description":"Corno F 2 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1Urub6mI8yYZ_PSjfJE6msN2yT6Gh9P1x/view?usp=drivesdk","description":"Corno F 3 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1Uh7MJqiTBjIB7nOoHP06l8dKCDTgYgs3/view?usp=drivesdk","description":"Corno F 4 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/11ccJ3RmkI6d0csDk3SCWY5pPyBpVDweh/view?usp=drivesdk","description":"Fagot 1 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1M0W6DYtZTToDCrYodOSPnpTdh9KJdBWs/view?usp=drivesdk","description":"Fagot 2 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/14CHHP2xlcaiWdzp9WCY2bX5FHLAuy0t4/view?usp=drivesdk","description":"Fl Piccolo - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1wgz7SuGpF4vgFFjwQPRVwEejgER7sVT_/view?usp=drivesdk","description":"Flauta 1 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1JUP1Xv_LcwTV0Mi6SAiwjYE-sea3XAR1/view?usp=drivesdk","description":"Flauta 2 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1ybT1wYQymDipIgiXy-91Go0885dIgMGn/view?usp=drivesdk","description":"Ob EH - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1NQVBYUFo-4EmvAs9JpN3OXA8yVOI-N-O/view?usp=drivesdk","description":"Oboe 1 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1mUhuDYPNnbr6PQzEw1qME9jbXw_xQ_6O/view?usp=drivesdk","description":"Oboe 2 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1-CBipzocaY1X8K01Mo8ack4QNRQtuky_/view?usp=drivesdk","description":"Perc Bombo - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Pandereta', '[{"url":"https://drive.google.com/file/d/1blok3lQ1ns_P-pEyYEuhtKRzzn91AIgv/view?usp=drivesdk","description":"Perc Pandereta - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1XMRCoNFHFjgto8BSoncf8zAhzADWC5GG/view?usp=drivesdk","description":"Perc Platillo - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/178wEy6qrKZNkff9VVBdAtXA8uObOfHO5/view?usp=drivesdk","description":"Perc Tambor - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1c_o-_NuRBUaI6jNoGAqZ_onzgTiMxIul/view?usp=drivesdk","description":"Perc Timbal - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1dNSgnwkZvXJUsw5Uj18Upn2t3FcduauN/view?usp=drivesdk","description":"Perc Triángulo - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1S521wjbJWcZKk6PTjZn3xmmBuHe4SyAF/view?usp=drivesdk","description":"Trombón 1 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/13sDoLcbELK0IeNAxnBrWxaQCNrMWzDU2/view?usp=drivesdk","description":"Trombón 2 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1yKb8KENW5kEfsBK4k2TZwJzcTTy1NiVV/view?usp=drivesdk","description":"Trombón 3 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1DwY1cV0O-4zpbJrVvWqYl5Zm5SFfa_XM/view?usp=drivesdk","description":"Trompeta 1 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1TdkOQKOA2x3ZevFX21wpQGW8ED4v0ZyJ/view?usp=drivesdk","description":"Trompeta 2 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1i-G8n5vUbQk4ezTpXCmPut0hUqoO2DL5/view?usp=drivesdk","description":"Tuba - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1v9b8RLadX_tb9Ip6gIaX1rG0p4Mz7fC_/view?usp=drivesdk","description":"Viola - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1WkMG-Ot-Xnwl3IrNiNNKFIGjQXVaZxBj/view?usp=drivesdk","description":"Violín 1 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1OyzneUllAMnoNCw2FzcK5kbQ0Bw6Vtqs/view?usp=drivesdk","description":"Violín 2 - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1f8bbjH-M9IHSSbN0WYrLb-bwCARSdi-a/view?usp=drivesdk","description":"Violoncello - op.35. Sherezade - Rimsky-Korsakov, N.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Sherezade, Op. 35</p><div>&nbsp; I. The Sea and Sinbad''s Ship</div><div>&nbsp; II. The Kalendar Prince</div><div>&nbsp; III. The Young Prince and the Young Princess</div><div>&nbsp; IV. Festival at Baghdad. The Sea. The Ship Breaks against a Cliff Surmounted by a Bronze Horseman</div>';
  END IF;

  -- <p>Sinfonía en Sib mayor, Op. 20</p><div>&nbsp; I. Lent - Allegro vivo</div><div>&nbsp; II. Très lent</div><div>&nbsp; III. Animé</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Sinfonía en Sib mayor, Op. 20</p><div>&nbsp; I. Lent - Allegro vivo</div><div>&nbsp; II. Très lent</div><div>&nbsp; III. Animé</div>'
      AND o.observaciones = 'Para acomodar — Chausson, E. - Sinfonia en Sib, Op. 20'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Sinfonía en Sib mayor, Op. 20</p><div>&nbsp; I. Lent - Allegro vivo</div><div>&nbsp; II. Très lent</div><div>&nbsp; III. Animé</div>',
      NULL,
      1890,
      NULL,
      'Oficial',
      'Para acomodar — Chausson, E. - Sinfonia en Sib, Op. 20',
      '3.3.3.3 - 4.4.3.1 - Timp - 2Hp - Str',
      'https://drive.google.com/drive/folders/1Di0jbVLD51VR7PN94KMHaNftuidiW41_'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Chausson_Ernest, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa 1', '[{"url":"https://drive.google.com/file/d/1oIC8mxUigMMGy8sWyVIbQ4V7LfagJqjE/view?usp=drivesdk","description":"Arpa 1 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa 2', '[{"url":"https://drive.google.com/file/d/15I1aBiBU3gG5Uv7COQ5EiRnPQCvZDdnw/view?usp=drivesdk","description":"Arpa 2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1A1JeNXT8MoZQjRAmeiMkyJBUV7kE3kmf/view?usp=drivesdk","description":"Clarinete Bajo - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/11FB-lOORY6HEKb9NSt8sHM3ye2IkXULn/view?usp=drivesdk","description":"Clarinete Bb 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/11FB-lOORY6HEKb9NSt8sHM3ye2IkXULn/view?usp=drivesdk","description":"Clarinete Bb 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1XGqZmYNE4cOBfDMdAUD8KtDocrp4E7gs/view?usp=drivesdk","description":"Contrabajo - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1z-nCtFs34-JB7czUb61U9bvfZWCied2B/view?usp=drivesdk","description":"Corno F 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1z-nCtFs34-JB7czUb61U9bvfZWCied2B/view?usp=drivesdk","description":"Corno F 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1a3jv5vqUdNz8epXaKOHjqa9rGOw5xR_S/view?usp=drivesdk","description":"Corno F 3y4 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1a3jv5vqUdNz8epXaKOHjqa9rGOw5xR_S/view?usp=drivesdk","description":"Corno F 3y4 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1vIHtG5nkP7-SML8GBAoz4WqevSTothRV/view?usp=drivesdk","description":"Fagot 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1vIHtG5nkP7-SML8GBAoz4WqevSTothRV/view?usp=drivesdk","description":"Fagot 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 3', '[{"url":"https://drive.google.com/file/d/1XaW7SWtTuknkZP0vtYlk5dYE9ImPMq98/view?usp=drivesdk","description":"Fagot 3 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1iWwfxxpAhtc7WNRZmGWYhSXckH-SxaVM/view?usp=drivesdk","description":"Flauta 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1iWwfxxpAhtc7WNRZmGWYhSXckH-SxaVM/view?usp=drivesdk","description":"Flauta 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 3', '[{"url":"https://drive.google.com/file/d/1WFHzMd8i8fEq_JnDM4kvtN-sRpBQP7jI/view?usp=drivesdk","description":"Flauta 3 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1j77bugsZmUVdCtu6-ic6zl-ULGA1qnbq/view?usp=drivesdk","description":"Ob EH - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1hToDtiuLsgfguOCMP0O3cOm1ofY4am5g/view?usp=drivesdk","description":"Oboe 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1hToDtiuLsgfguOCMP0O3cOm1ofY4am5g/view?usp=drivesdk","description":"Oboe 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1nHi2evFbVkic8n2Cp65u26kIXJWH5kfe/view?usp=drivesdk","description":"Perc Timbal - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1LIg9GRWk3qjEk4h_araqEzxX95M6HzUy/view?usp=drivesdk","description":"SCORE - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1oevSen9jw_SZnD23i7nimNAO4oLa-p5A/view?usp=drivesdk","description":"Trombón 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1oevSen9jw_SZnD23i7nimNAO4oLa-p5A/view?usp=drivesdk","description":"Trombón 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1cvh0f9MfFOlWz_fC5Gh-qQgFBcoQH9Lq/view?usp=drivesdk","description":"Trombón 3 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/15QY8AlgRjp5kJVr-4gB7MFXR7uBO3IPf/view?usp=drivesdk","description":"Trompeta 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/15QY8AlgRjp5kJVr-4gB7MFXR7uBO3IPf/view?usp=drivesdk","description":"Trompeta 1y2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 3', '[{"url":"https://drive.google.com/file/d/1cvIh8w6u3MJyuQp5zdO2sBG4MnOMIoxY/view?usp=drivesdk","description":"Trompeta 3y4 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 4', '[{"url":"https://drive.google.com/file/d/1cvIh8w6u3MJyuQp5zdO2sBG4MnOMIoxY/view?usp=drivesdk","description":"Trompeta 3y4 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1tcS7P1Qb2Sy8VZQT0K9VBv5XvMOCB7hy/view?usp=drivesdk","description":"Tuba - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Ozb7KF4-4JXaH8BM0BeIuvLgbTcrqife/view?usp=drivesdk","description":"Viola - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ryjBg6ljY1WE_0yjOhOteUM4smslTeYo/view?usp=drivesdk","description":"Violín 1 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1UKAoqe9AGTcuZuOGO_JQ8IASOmVT_O3D/view?usp=drivesdk","description":"Violín 2 - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1q0yGrb5jSbSNxPjzalv5RdYRMJ2LXlXJ/view?usp=drivesdk","description":"Violoncello - op.20. Sinfonía en Sib - Chausson, E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Sinfonía en Sib mayor, Op. 20</p><div>&nbsp; I. Lent - Allegro vivo</div><div>&nbsp; II. Très lent</div><div>&nbsp; III. Animé</div>';
  END IF;

  -- <p>Obertura Carnival, Op. 92</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Obertura Carnival, Op. 92</p>'
      AND o.observaciones = 'Para acomodar — Dvorak, A. - Obertura Carnival, Op. 92'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Obertura Carnival, Op. 92</p>',
      NULL,
      1891,
      NULL,
      'Oficial',
      'Para acomodar — Dvorak, A. - Obertura Carnival, Op. 92',
      '3.3.2.2 - 4.2.3.1 - Timp.+3 - Hp - Str',
      'https://drive.google.com/drive/folders/1mPVs5hDtYPCgrbLHFHnp5CvlTcpqSnWp'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Dvo_k_Anton_n, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1-tF1ml_QzcJwEHFHAaRnJwN-Qt-Yxtcq/view?usp=drivesdk","description":"Arpa - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete A 1', '[{"url":"https://drive.google.com/file/d/17DAMN5HWN2pZ-trR0SrB2PufeE27qqR2/view?usp=drivesdk","description":"Clarinete A 1 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/13Cni4jGxabVik8l_WEFfeUDJ2B0JyK_a/view?usp=drivesdk","description":"Clarinete A 2 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1JmCkGDZtDJVeYZsnquGUl6AXszf_cnXF/view?usp=drivesdk","description":"Contrabajo - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno E 1', '[{"url":"https://drive.google.com/file/d/1vyspwkI4Ee4-FoIGp7VEjhOELMvOA9HM/view?usp=drivesdk","description":"Corno E 1 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno E 2', '[{"url":"https://drive.google.com/file/d/1e6wlD_rxxTR4xoqddPisWNJ4Bil4ipv7/view?usp=drivesdk","description":"Corno E 2 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno E 3', '[{"url":"https://drive.google.com/file/d/1cZFFnJ4QJH98IBwW69AvCVv8FUS1jIW_/view?usp=drivesdk","description":"Corno E 3 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno E 4', '[{"url":"https://drive.google.com/file/d/1RdI8Fzh6SSYUx15Vx9y4WE6f1k0PZrn0/view?usp=drivesdk","description":"Corno E 4 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1s41UBFk8bj8yb0sM3V-L4SZ8rO7bjqxK/view?usp=drivesdk","description":"Fagot 1 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1GYf0W7yZFFXfdXRA-EF_AGG8JgkJxeu0/view?usp=drivesdk","description":"Fagot 2 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1GioRv8yzQ7SpCsyi8JjVRhaJhdGMApSv/view?usp=drivesdk","description":"Fl Piccolo - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1J6Thx6tN6uWHFAr2HNh91gPlq12JUfSI/view?usp=drivesdk","description":"Flauta 1 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1YGAMiL3f4SVXl9fceYmteD8EebTGmO73/view?usp=drivesdk","description":"Flauta 2 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1t0WvPHsb1bJWNr8UtCEr6nEBWNHJ30HF/view?usp=drivesdk","description":"Ob EH - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1VoxK7A3l-eMbGhjZREHsQd8aeWj_vfu8/view?usp=drivesdk","description":"Oboe 1 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/19dHdWbfimozdI-Gs0yjuXpiDUPZy9Dl4/view?usp=drivesdk","description":"Oboe 2 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Pandereta', '[{"url":"https://drive.google.com/file/d/159FNbkHP1hE0zjNpxlDufSdr3y2JLdHO/view?usp=drivesdk","description":"Perc Pandereta - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1ZHMWaAWnZzTJl0jdO5dME3JYKQmJf18L/view?usp=drivesdk","description":"Perc Platillo - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1Np0E-VL6plzYqaLRzoSpr4E_p3rtlUTl/view?usp=drivesdk","description":"Perc Timbal - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1z7T96yWZneDzB14AzHbKJ5l2BeUjrUSj/view?usp=drivesdk","description":"Perc Triángulo - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/13i9QvV85ttyAb-UZ80EpmvEbyUBwr1Zz/view?usp=drivesdk","description":"Trombón 1 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/19nVHePJmuleVPvoegqj9d1EfugB6wQpV/view?usp=drivesdk","description":"Trombón 2 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1Bts3xtUXWZ-HRu6XSfoHGnyYWwPY_NXT/view?usp=drivesdk","description":"Trombón Bajo - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta D 1', '[{"url":"https://drive.google.com/file/d/1V301IpWl2Izzlroti6xaUnS7gAfw5pXI/view?usp=drivesdk","description":"Trompeta D 1 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta D 2', '[{"url":"https://drive.google.com/file/d/17Nkiseykv1XVcQGtQxNJrOk_YmwKetw_/view?usp=drivesdk","description":"Trompeta D 2 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1Kk6-MWriSsPdXyChSSYgJlnRGmx6faeI/view?usp=drivesdk","description":"Tuba - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1axfSw3dm1iTS0GL9dKLWjGzneg47najU/view?usp=drivesdk","description":"Viola - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1UG3Rwlo3g6mGuaDcto77l526ZStW8cH0/view?usp=drivesdk","description":"Violín 1 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1f39pj7wp2wM_MpMqLJi1-vwpaM5zf6u1/view?usp=drivesdk","description":"Violín 2 - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1xBdJzksYTtCustLlS6NRMPvE5BvQ2DR8/view?usp=drivesdk","description":"Violoncello - op.92. Obertura Carnival - Dvorak, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Obertura Carnival, Op. 92</p>';
  END IF;

  -- <p>Sinfonía en Mib mayor, Op. 1</p><div>&nbsp; I. Andante - Allegro moderato</div><div>&nbsp; II. Scherzo. Allegretto</div><div>&nbsp; III. Largo</div><div>&nbsp; IV. Finale. Allegro molto</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Sinfonía en Mib mayor, Op. 1</p><div>&nbsp; I. Andante - Allegro moderato</div><div>&nbsp; II. Scherzo. Allegretto</div><div>&nbsp; III. Largo</div><div>&nbsp; IV. Finale. Allegro molto</div>'
      AND o.observaciones = 'Para acomodar — Stravinsky, I. - Sinfonia en Mib mayor, Op. 1'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Sinfonía en Mib mayor, Op. 1</p><div>&nbsp; I. Andante - Allegro moderato</div><div>&nbsp; II. Scherzo. Allegretto</div><div>&nbsp; III. Largo</div><div>&nbsp; IV. Finale. Allegro molto</div>',
      NULL,
      1907,
      NULL,
      'Oficial',
      'Para acomodar — Stravinsky, I. - Sinfonia en Mib mayor, Op. 1',
      '4.2.3.2 - 4.3.3.1 - Timp.+3 - Str',
      'https://drive.google.com/drive/folders/1b1K3TrCaTZWW83cze2o79it4hgIIhQ2E'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Stravinsky_Igor, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1GDHbktGbl9Cgf2OqdhfRXIQVD1Q1nGom/view?usp=drivesdk","description":"Clarinete Bb 1 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1BpjtXGLxMdEmjLp4t4hi-ZeN7JRLFkz_/view?usp=drivesdk","description":"Clarinete Bb 2 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 3', '[{"url":"https://drive.google.com/file/d/1sgZQdHum9tdOeFoesoZ9ToO07fCXTbUX/view?usp=drivesdk","description":"Clarinete Bb 3 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/19OQvG12A-VZIEDVIZM3PzYDjDgQNXmhR/view?usp=drivesdk","description":"Contrabajo - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1kvEMLLGSHMUEu50Sm0CKhOvsxsBw5KeP/view?usp=drivesdk","description":"Corno F 1 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1mhLQ2JVk_pRywmYJkxR4MIbV9GvMUISo/view?usp=drivesdk","description":"Corno F 2 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/14haiiVrbv4RkiHE-avBvAVqQR7lj4OXp/view?usp=drivesdk","description":"Corno F 3 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1vklC_8Vm4YAR42zydGnHz_9tAutQtreF/view?usp=drivesdk","description":"Corno F 4 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1wofB4VbNch1u_X-Ws0FM4-tbqnlaAXUx/view?usp=drivesdk","description":"Fagot 1 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/12LibHjzXn0tZGkMAztEerUALU7SHK8pM/view?usp=drivesdk","description":"Fagot 2 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1Lez8HQgn8CAJMGOfL3PY6NhVrWI0HPLb/view?usp=drivesdk","description":"Fl Piccolo - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1PkuRhaMc3D7tT2CHuk-bbBAscySUE2GT/view?usp=drivesdk","description":"Flauta 1 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1Z7JtbCJFOnXvHcrHj4gMJYdliRR5YutL/view?usp=drivesdk","description":"Flauta 2 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 3', '[{"url":"https://drive.google.com/file/d/1H-Jo2GZIycPd8t4GiULkBw420BcyLH0H/view?usp=drivesdk","description":"Flauta 3 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1JhWsu3C7aPnyrj3BT2x4-AwNMu-nYz6i/view?usp=drivesdk","description":"Oboe 1 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1fJKxdMpB5mZIGJe6JtEDK4UAXzJyxnmb/view?usp=drivesdk","description":"Oboe 2 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1mHqB7Vv7jeH5TtGxtn00mivARBl2QRtJ/view?usp=drivesdk","description":"Perc Bombo - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1xhRqpBHYg2pk3fAOticlD4mv6EE1uPAe/view?usp=drivesdk","description":"Perc Platillo - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1UZXT_GzbSI1_5vheOtqpb4Urp2RyDJsK/view?usp=drivesdk","description":"Perc Timbal - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1_scvx70z-9rYg_KIWSJfXqUOWd1YeJ23/view?usp=drivesdk","description":"Perc Triángulo - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1W5-7mMXJ2Qp3CmbgAEo5cAyzHESV3-pr/view?usp=drivesdk","description":"SCORE - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1ZRtNUZRaQVBonC98_usxaqCq30f58jhU/view?usp=drivesdk","description":"Trombón 1 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1li0PEahU79Y2x1HVoCS2PM4FYOmJ9w3b/view?usp=drivesdk","description":"Trombón 2 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1l8v-FimUL6GmMBm34xVsZWGBkkGHL9OO/view?usp=drivesdk","description":"Trombón 3 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1BlzvV84huJxqjIJK-v5VAhNpN3AvY_vo/view?usp=drivesdk","description":"Trompeta Bb 1 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/1fiwLIma5-T1jhkzBdTRuzFPxfqaSuOHg/view?usp=drivesdk","description":"Trompeta Bb 2 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 3', '[{"url":"https://drive.google.com/file/d/1jm3UNGXD2mOm18QP1J2fzqOC_iBf4drB/view?usp=drivesdk","description":"Trompeta Bb 3 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1GWe6wV5rCS_E--067LYl_geKIe1eDQBK/view?usp=drivesdk","description":"Tuba - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1z1G5TTZEo3a-U4tg84P3vxQbotEbExDz/view?usp=drivesdk","description":"Viola - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Q92n-cN_muhVhOlRQOlgb-bx1yE3WObC/view?usp=drivesdk","description":"Violín 1 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1CQ00n4IohcEwbhteLtkR7xidtKLRker5/view?usp=drivesdk","description":"Violín 2 - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/15y0BwfDRt_6s7FwLvV84yn-JSUZXu6Dh/view?usp=drivesdk","description":"Violoncello - op.1. Sinfonía en Mib mayor - Stravinsky, I.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Sinfonía en Mib mayor, Op. 1</p><div>&nbsp; I. Andante - Allegro moderato</div><div>&nbsp; II. Scherzo. Allegretto</div><div>&nbsp; III. Largo</div><div>&nbsp; IV. Finale. Allegro molto</div>';
  END IF;

  -- <p>Danzas Polovtsianas (Príncipe Igor)</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Danzas Polovtsianas (Príncipe Igor)</p>'
      AND o.observaciones = 'Para acomodar — Borodin, A. - Danzas Polovtsianas (Principe Igor)'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Danzas Polovtsianas (Príncipe Igor)</p>',
      NULL,
      1890,
      NULL,
      'Oficial',
      'Para acomodar — Borodin, A. - Danzas Polovtsianas (Principe Igor)',
      '3.3.2.2 - 4.2.3.1 - Timp.+6 - Hp - Str',
      'https://drive.google.com/drive/folders/1wLw5Er_njPZSQuRHEdDo1K89pk7lbOtn'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Borodin_Aleksandr, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1DU68xf4ICikHxorK5wGmo9nNmHNtr_zo/view?usp=drivesdk","description":"Arpa - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1OqNUFfIrbv52kH8U2sI2jir_fzV_Pt6D/view?usp=drivesdk","description":"Clarinete Bb 1 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1MHBdsAVKwD-kfCo86AN-wmwakt7tD-Uq/view?usp=drivesdk","description":"Clarinete Bb 2 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1nDFFNIuDo3VkndGXtTGqDJ3O-CaL3Ao8/view?usp=drivesdk","description":"Contrabajo - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1NZ7W6sQOZ1UhUf7-i0y6M0srmLfWekAS/view?usp=drivesdk","description":"Corno F 1 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1B5P04y-ohEi7RPOY6sxQj3IA6Na0LBQt/view?usp=drivesdk","description":"Corno F 2 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1bozUTV2zNq8Rl-IjqKKKkx9kAuJCc9xo/view?usp=drivesdk","description":"Corno F 3 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/10NM0y1w1ag9DSgNLDgGvQ-8Mj45KRnxQ/view?usp=drivesdk","description":"Corno F 4 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1KXcq5Bh3sSRa5G7jdihnW45UQZTAIwaJ/view?usp=drivesdk","description":"Fagot 1 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1nGhSC96SYhiS0EOtwoPBV4mv3aEXUPrl/view?usp=drivesdk","description":"Fagot 2 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/13wfw1Cl0oV09VnxMq4Fo7tpEB-KI_HcH/view?usp=drivesdk","description":"Fl Piccolo - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1VaNYrHPiNNP7azsRsfJC4hlKBRYgZfC-/view?usp=drivesdk","description":"Flauta 1 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1tdk76VGz0-iABwTAgeNNPZpYsaZgGvmd/view?usp=drivesdk","description":"Flauta 2 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1tikN6UKEHBj6hMmeocKyxvagyYF6b3mC/view?usp=drivesdk","description":"Ob EH - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1Zo5NgxT_8kHTLgT2WiFxtPELQEMTWMU4/view?usp=drivesdk","description":"Oboe 1 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1DCfsA06ZjAKrjBM1dqsPm6ilZ95wgyNI/view?usp=drivesdk","description":"Oboe 2 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1lEWNKNckzDnJIaU9pcHlUeYY5g4Z2UzX/view?usp=drivesdk","description":"Perc Bombo - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Glockenspiel', '[{"url":"https://drive.google.com/file/d/1mMrabVQ0wxXNh0M_EoE3xyBe5A0BuX15/view?usp=drivesdk","description":"Perc Glockenspiel - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Pandereta', '[{"url":"https://drive.google.com/file/d/1uIj45pJrnWiHsYGVYZtWZUjm0KRbcbT4/view?usp=drivesdk","description":"Perc Pandereta - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/1BngFWGVo_xOAtDnCLE_iM5taJaQBJZ5G/view?usp=drivesdk","description":"Perc Platillo - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/1xWN_9iEyO70XurjPn3nyKXG-HJVZgpbt/view?usp=drivesdk","description":"Perc Tambor - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1-mgn8lBuzAYwvWIIQioSytkgqZJdQCDP/view?usp=drivesdk","description":"Perc Timbal - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1rcUUHWWIQOtWZ08jeMzDSXlv3AeZtiLZ/view?usp=drivesdk","description":"Perc Triángulo - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1w0C0nlSKj82-JHOs3Z1m9f17pBlc472q/view?usp=drivesdk","description":"Trombón 1 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1h6TUySqL37IVQ5KSVej5yHpnRXlxgjKn/view?usp=drivesdk","description":"Trombón 2 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1BJUMPAkx876QlXD6GqfC6hEH8WoIrJjo/view?usp=drivesdk","description":"Trombón 3 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 1', '[{"url":"https://drive.google.com/file/d/1icjYmLv8AgBYxAzCYllkm0lCnOG9i9U1/view?usp=drivesdk","description":"Trompeta Bb 1 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Bb 2', '[{"url":"https://drive.google.com/file/d/12S4RVqauJAXQIbjQEymqR-RUVopiudTv/view?usp=drivesdk","description":"Trompeta Bb 2 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1MT5WqSkg4Fg1gObw_XQi8QJB8ADhXtVv/view?usp=drivesdk","description":"Tuba - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1DHS9XkNvrrtjrgQiq5bwCStDIzJMp4sY/view?usp=drivesdk","description":"Viola - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1m82DhokYH8BR-LJ_nZsgik0KK1-QeUli/view?usp=drivesdk","description":"Violín 1 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1n8xeveZVcjiLPhhavF7RMRCAMpzv3114/view?usp=drivesdk","description":"Violín 2 - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1fHF21JAR9FwAB0Ge0uM_YFTRqmcDyCa9/view?usp=drivesdk","description":"Violoncello - Danzas Polovtsianas - Borodin, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Danzas Polovtsianas (Príncipe Igor)</p>';
  END IF;

  -- <p>Sinfonía Nro. 4 en Sol mayor</p><div>&nbsp; I. Bedächtig. Nicht eilen</div><div>&nbsp; II. In gemächlicher Bewegung. Ohne Hast</div><div>&nbsp; III. Ruhevoll (Poco adagio)</div><div>&nbsp; IV. Sehr behaglich</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Sinfonía Nro. 4 en Sol mayor</p><div>&nbsp; I. Bedächtig. Nicht eilen</div><div>&nbsp; II. In gemächlicher Bewegung. Ohne Hast</div><div>&nbsp; III. Ruhevoll (Poco adagio)</div><div>&nbsp; IV. Sehr behaglich</div>'
      AND o.observaciones = 'Para acomodar — Mahler, G. - Sinfonia Nro. 4'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Sinfonía Nro. 4 en Sol mayor</p><div>&nbsp; I. Bedächtig. Nicht eilen</div><div>&nbsp; II. In gemächlicher Bewegung. Ohne Hast</div><div>&nbsp; III. Ruhevoll (Poco adagio)</div><div>&nbsp; IV. Sehr behaglich</div>',
      NULL,
      1901,
      NULL,
      'Oficial',
      'Para acomodar — Mahler, G. - Sinfonia Nro. 4',
      '4.4.4.4 - 4.3.0.0 - Timp.+6 - Hp - Str + Voz',
      'https://drive.google.com/drive/folders/1M-xsbq64kgOOys-sd40tBoBJTCRS5gDK'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Mahler_Gustav, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1RYZm6FCEvddjKSKbxmN-SWYjL5-j8sLi/view?usp=drivesdk","description":"Arpa - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1lV165UO3W6jk5Uvd0tQerL6oqF5Hx3Wq/view?usp=drivesdk","description":"Clarinete 1 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1QdG1q4OU9UTqtPadXb7FaYRrE6twPodD/view?usp=drivesdk","description":"Clarinete 2 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 3', '[{"url":"https://drive.google.com/file/d/1nDbSPRKxjdExfWd-96KAPQ51qsC_I13D/view?usp=drivesdk","description":"Clarinete 3 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1zlYPHbYKTxtX829BhZVUemQXXoGxefyK/view?usp=drivesdk","description":"Clarinete Bajo - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/137qLX5FjG58KH7FsAOc1xEf9wgZq7C9v/view?usp=drivesdk","description":"Contrabajo - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1r3xUGFcvH-l21PzaYHq3HFI1cHRECXMC/view?usp=drivesdk","description":"Contrafagot - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1Ef6zrUeFeocy3X_YTNjzfPX0KgOSSbJo/view?usp=drivesdk","description":"Corno F 1 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1hQf5TCc6PlGjfJ5uDsaYUDfE5YxK30yB/view?usp=drivesdk","description":"Corno F 2 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1AUF1pQdwL71WNboaQczPTfKLrND-8iXS/view?usp=drivesdk","description":"Corno F 3 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1nQFyol3WQvxX_DyOnh-fDR-8QqWApGhx/view?usp=drivesdk","description":"Corno F 4 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1rrFwWszIc0LHs-nkLaR3L4EUYNiDwXtJ/view?usp=drivesdk","description":"Fagot 1 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1_hIlZz-TPvNQ7VQ6skgPFZPTSeQQ-_3b/view?usp=drivesdk","description":"Fagot 2 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 3', '[{"url":"https://drive.google.com/file/d/1V-lKWZyXhNLBVIT1M1RKvbbVbJbcavD2/view?usp=drivesdk","description":"Fagot 3 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1yngFqDCgtfxW89smSU4BAp24QKKF6D10/view?usp=drivesdk","description":"Flauta 1 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1j2grAvyXKkGlyUVtu0NsTpGGxhaDeXbM/view?usp=drivesdk","description":"Flauta 2 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 3', '[{"url":"https://drive.google.com/file/d/1CeTUp0G7FK14FY_zL2XTzO4YXdeHNBQr/view?usp=drivesdk","description":"Flauta 3 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 4', '[{"url":"https://drive.google.com/file/d/1eWluBwqhAvrj3LhccW7CMLs1pJbKyIKO/view?usp=drivesdk","description":"Flauta 4 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1rbAqdXNOrL9mQSdAn35Imjz6jxb9g1cZ/view?usp=drivesdk","description":"Ob EH - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/18q_OZbXruxRMVV_xADFiehvGCupcSATy/view?usp=drivesdk","description":"Oboe 1 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1sH5J1_BpmAsqWowMzdnTDZTnyj8EN8PN/view?usp=drivesdk","description":"Oboe 2 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 3', '[{"url":"https://drive.google.com/file/d/1_2Ieetnzde9KIV7EvHr1l61qyniwQGql/view?usp=drivesdk","description":"Oboe 3 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1ZL3BD0Su1lUh0utQBsyVLetN3ZrhaE5c/view?usp=drivesdk","description":"Perc Bombo - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Cascabeles', '[{"url":"https://drive.google.com/file/d/1rpVGkPBba3bP6mYZTo9xZcYg5OpF3W1f/view?usp=drivesdk","description":"Perc Cascabeles - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Glockenspiel', '[{"url":"https://drive.google.com/file/d/1sQS-HCaXoSxoTPsJ-GWhNHPCivkUWZ2j/view?usp=drivesdk","description":"Perc Glockenspiel - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Gong', '[{"url":"https://drive.google.com/file/d/1o7Nz-Sa_VGJ0UH1wgIzGJuct-lWMlevn/view?usp=drivesdk","description":"Perc Gong - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":"https://drive.google.com/file/d/12SRozcqQaUv1PsAPoOlgIdwPVu6Wx8zS/view?usp=drivesdk","description":"Perc Platillo - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1Ny47FGgkSjpUdsGtJqS-yMyOMbQFa2oR/view?usp=drivesdk","description":"Perc Timbal - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/13FAs-9sRbHWfvJqMWXxc5qvoBrmu7jHp/view?usp=drivesdk","description":"Perc Triángulo - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1lfaSJpy_QWAc8T9t56r_KtcNDdbLQZHx/view?usp=drivesdk","description":"SCORE - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta F 1', '[{"url":"https://drive.google.com/file/d/1VXtTKtsUZeqLt68PbYeLTsdPkee364Jj/view?usp=drivesdk","description":"Trompeta F 1 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta F 2', '[{"url":"https://drive.google.com/file/d/1vgdeQq5UH5vKu1LC4_VayU5ggyanoxQB/view?usp=drivesdk","description":"Trompeta F 2 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta F 3', '[{"url":"https://drive.google.com/file/d/1Q_Z9n93GhQ-T9dTQ8CXlvZ4F1zE8o_dF/view?usp=drivesdk","description":"Trompeta F 3 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1gZRf5KWUTLm3PKAfRtSPcje9tKsalbzt/view?usp=drivesdk","description":"Viola - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ww9eH4L5DH3f4-H2IXnfbNd3znUNO6tn/view?usp=drivesdk","description":"Violín 1 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Wj4s5Uce6-B6dLT6CzXCsCrTGIjC1CA2/view?usp=drivesdk","description":"Violín 2 - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1iSti18BYp6F3klJOlgDL11uJ-QrsGxFK/view?usp=drivesdk","description":"Violoncello - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/13R3Ifzk63kG1tMwmBF4kyN2zTBfWGH8V/view?usp=drivesdk","description":"Voz - Sinfonía Nro. 4 - Mahler, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Sinfonía Nro. 4 en Sol mayor</p><div>&nbsp; I. Bedächtig. Nicht eilen</div><div>&nbsp; II. In gemächlicher Bewegung. Ohne Hast</div><div>&nbsp; III. Ruhevoll (Poco adagio)</div><div>&nbsp; IV. Sehr behaglich</div>';
  END IF;

  -- <p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión banda]</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión banda]</div>'
      AND o.observaciones = 'Para acomodar — Holst, G. - Hammersmith, Op. 52 [banda]'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión banda]</div>',
      NULL,
      1930,
      NULL,
      'Oficial',
      'Para acomodar — Holst, G. - Hammersmith, Op. 52 [banda]',
      'Cl, Cb - 2.2.3.2 - 5.2.3.1 - Perc + Vibráfono, Saxofón x2',
      'https://drive.google.com/drive/folders/1RPJkzScnf696ZdCt-wnvB4GXF12IhaFI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Holst_Gustav, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13c', 'Barítono', '[{"url":"https://drive.google.com/file/d/1-Tkq_bjkZueNHRdoz_QtXVxRJC-GqkRF/view?usp=drivesdk","description":"Barítono - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1NBW1v4T2ZP18LhPHCfyaoOGPhVIfKQ-R/view?usp=drivesdk","description":"Clarinete Bb 1 - op.52. Hammersmith - Holst, G.pdf"},{"url":"https://drive.google.com/file/d/16NUG4VCmrc12hG4wuSm2HW7RzV_b84fz/view?usp=drivesdk","description":"Clarinete Eb 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1PT1Qx4MkY9XWEumH1BdbzsEFZTeeIzNM/view?usp=drivesdk","description":"Clarinete Bb 2 - op.52. Hammersmith - Holst, G.pdf"},{"url":"https://drive.google.com/file/d/16NUG4VCmrc12hG4wuSm2HW7RzV_b84fz/view?usp=drivesdk","description":"Clarinete Eb 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 3', '[{"url":"https://drive.google.com/file/d/1YY1htw9Fu12ZbMBpyPBILYT6LNbhvcnM/view?usp=drivesdk","description":"Clarinete Bb 3 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb Solo', '[{"url":"https://drive.google.com/file/d/1ev5qWya3gbGB9VtJISreP9ySI9iPtrEa/view?usp=drivesdk","description":"Clarinete Bb Solo - op.52. Hammersmith - Holst, G.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corneta Bb 2', '[{"url":"https://drive.google.com/file/d/1uw3EunBr-wPVQRks0aETjyC1bnh6Ty9i/view?usp=drivesdk","description":"Corneta Bb 2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Corneta Bb Solo', '[{"url":"https://drive.google.com/file/d/1iW-tQ_5KKVPnbMa4PTgZKJrEIdawnhuy/view?usp=drivesdk","description":"Corneta Bb Solo - op.52. Hammersmith - Holst, G.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/14gUZ9fxV5sMd4h4-1_n-HWV7sIlABHAM/view?usp=drivesdk","description":"Corno F 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/14gUZ9fxV5sMd4h4-1_n-HWV7sIlABHAM/view?usp=drivesdk","description":"Corno F 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1yA0T_qgqxA7kc0JWaMZEtLqW16lqOMxJ/view?usp=drivesdk","description":"Corno F 3y4 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1yA0T_qgqxA7kc0JWaMZEtLqW16lqOMxJ/view?usp=drivesdk","description":"Corno F 3y4 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1JmmTy3cd7VPPivfbZtpX9Hh0Hraszcp8/view?usp=drivesdk","description":"Fagot 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1JmmTy3cd7VPPivfbZtpX9Hh0Hraszcp8/view?usp=drivesdk","description":"Fagot 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1J8h5YoTcEspnENcKZ1Dsbn4g5Z13I4Hd/view?usp=drivesdk","description":"Flauta 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1J8h5YoTcEspnENcKZ1Dsbn4g5Z13I4Hd/view?usp=drivesdk","description":"Flauta 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1pM-Ps1_KSKj5niUnpqVyLkl0ZcR6iYtt/view?usp=drivesdk","description":"Oboe 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1pM-Ps1_KSKj5niUnpqVyLkl0ZcR6iYtt/view?usp=drivesdk","description":"Oboe 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1vLZAWTgAVdytc2JXsibFrLbhChBs7yb9/view?usp=drivesdk","description":"Perc Percusión - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Alto', '[{"url":"https://drive.google.com/file/d/1mBOu_iGLJrTB_emCUfPf7BggcMi4k405/view?usp=drivesdk","description":"Saxo Alto - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '16', 'Saxo Tenor', '[{"url":"https://drive.google.com/file/d/1CJ4G3k6op3w_Q8b1f7hClU9d8IGLWkWY/view?usp=drivesdk","description":"Saxo Tenor - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1i3BHYL4BQ1uZN-T262aRlaJ-IESdCy9g/view?usp=drivesdk","description":"SCORE - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1PmH6epvvRXwafFA9lGY8QLI0KNJOVoWh/view?usp=drivesdk","description":"Trombón 1 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1BSTK7SoB8iZg89WYEsMljx8htiCWDjw9/view?usp=drivesdk","description":"Trombón 2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1Ukxv8jn0TAP8xRppHPUqBb2_arph0kjL/view?usp=drivesdk","description":"Trombón 3 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1f-tutDP6F_ue-6y1ePfxh2h6s-0rkzlB/view?usp=drivesdk","description":"Trompeta Bb 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1f-tutDP6F_ue-6y1ePfxh2h6s-0rkzlB/view?usp=drivesdk","description":"Trompeta Bb 1y2 - op.52. Hammersmith - Holst, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1uCYRtAfVW_PK2ny0Q_IwKhqsaLIgaRSF/view?usp=drivesdk","description":"Tuba - op.52. Hammersmith - Holst, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión banda]</div>';
  END IF;

  -- <p>Obertura de Concierto Nro. 1 en La menor, Op. 15</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Obertura de Concierto Nro. 1 en La menor, Op. 15</p>'
      AND o.observaciones = 'Para acomodar — Williams, A. - Obertura de Concierto Nro. 1 en La menor, Op. 15'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Obertura de Concierto Nro. 1 en La menor, Op. 15</p>',
      NULL,
      1894,
      NULL,
      'Oficial',
      'Para acomodar — Williams, A. - Obertura de Concierto Nro. 1 en La menor, Op. 15',
      '3.2.2.2 - 4.2.3.1 - Timp.+1 - Str',
      'https://drive.google.com/drive/folders/10ap1aEjq3X9bFRB3z4DQ-F0fB7y3JutI'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Williams_Alberto, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":null,"description":"Clarinete Bb 1 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":null,"description":"Clarinete Bb 2 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":null,"description":"Contrabajo - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":null,"description":"Corno F 1 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":null,"description":"Corno F 2 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":null,"description":"Corno F 3 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":null,"description":"Corno F 4 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":null,"description":"Fagot 1 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":null,"description":"Fagot 2 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":null,"description":"Fl Piccolo - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":null,"description":"Flauta 1 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":null,"description":"Flauta 2 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":null,"description":"Oboe 1 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":null,"description":"Oboe 2 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Platillo', '[{"url":null,"description":"Perc Platillo - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":null,"description":"Perc Timbal - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":null,"description":"SCORE - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":null,"description":"Trombón 1 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":null,"description":"Trombón 2 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":null,"description":"Trombón 3 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta F 1', '[{"url":null,"description":"Trompeta F 1 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta F 2', '[{"url":null,"description":"Trompeta F 2 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":null,"description":"Tuba - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":null,"description":"Viola - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":null,"description":"Violín 1 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":null,"description":"Violín 2 - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":null,"description":"Violoncello - op.15. Obertura de Concierto Nro. 1 - Williams, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Obertura de Concierto Nro. 1 en La menor, Op. 15</p>';
  END IF;

  -- <p>Sinfonía Nro. 1, H. 75</p><div>&nbsp; I. Allegro marcato</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Presto</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Sinfonía Nro. 1, H. 75</p><div>&nbsp; I. Allegro marcato</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Presto</div>'
      AND o.observaciones = 'Para acomodar — Honegger, A. - Sinfonia Nro. 1, H. 75'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Sinfonía Nro. 1, H. 75</p><div>&nbsp; I. Allegro marcato</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Presto</div>',
      NULL,
      1930,
      NULL,
      'Oficial',
      'Para acomodar — Honegger, A. - Sinfonia Nro. 1, H. 75',
      '',
      'https://drive.google.com/drive/folders/1UsldJPccNPNwpsvePSlxt-rH5Ts4TcjA'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Honegger_Arthur, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1SDH7RzCw11jI2H630nYTEFoxkX9d3Yk0/view?usp=drivesdk","description":"SCORE - H.75. Sinfonía Nro. 1 - Honegger, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Sinfonía Nro. 1, H. 75</p><div>&nbsp; I. Allegro marcato</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Presto</div>';
  END IF;

  -- <p>Suite romántica, Op. 125</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Suite romántica, Op. 125</p>'
      AND o.observaciones = 'Para acomodar — Reger, M. - Suite romantica, Op. 125'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Suite romántica, Op. 125</p>',
      NULL,
      1912,
      NULL,
      'Oficial',
      'Para acomodar — Reger, M. - Suite romantica, Op. 125',
      '',
      'https://drive.google.com/drive/folders/1yDBKkkJPrl7W2yx-HkZ36UdcBer_L5Ug'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Reger_Max, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1fZwTDiC1f5yBhfhLGdylRGNsWeoDYu1r/view?usp=drivesdk","description":"SCORE - op.125. Suite romántica - Reger, M.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Suite romántica, Op. 125</p>';
  END IF;

  -- <p>Variaciones para orquesta, Op. 31</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Variaciones para orquesta, Op. 31</p>'
      AND o.observaciones = 'Para acomodar — Schoenberg, A. - Variaciones para orquesta, Op. 31'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Variaciones para orquesta, Op. 31</p>',
      NULL,
      1928,
      NULL,
      'Oficial',
      'Para acomodar — Schoenberg, A. - Variaciones para orquesta, Op. 31',
      '',
      'https://drive.google.com/drive/folders/1h8yGniF4Lgh_pDV1LBAg1tPeEMr3D5Rc'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Schoenberg_Arnold, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/14WA2JKMR1cayDX0QFbaDr5WPEdYJHJdv/view?usp=drivesdk","description":"SCORE - op.31. Variaciones para orquesta - Schoenberg, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Variaciones para orquesta, Op. 31</p>';
  END IF;

  -- <p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión orquesta — solo SCORE]</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión orquesta — solo SCORE]</div>'
      AND o.observaciones = 'Para acomodar — Holst, G. - Hammersmith, Op. 52 [orquesta SCORE]'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión orquesta — solo SCORE]</div>',
      NULL,
      1930,
      NULL,
      'Oficial',
      'Para acomodar — Holst, G. - Hammersmith, Op. 52 [orquesta SCORE]',
      '',
      'https://drive.google.com/drive/folders/1VeD41fEKpdISz-IPPcDSLevtbsIxcPDG'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Holst_Gustav, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1ifWJHxC8DaYGfre2PTI3lvuo03b9XRt1/view?usp=drivesdk","description":"SCORE - op.52. Hammersmith - Holst, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Hammersmith (Prelude and Scherzo), Op. 52</p><div>&nbsp; [versión orquesta — solo SCORE]</div>';
  END IF;

  -- <p>Sonata Op. 17 (versión para quinteto)</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Sonata Op. 17 (versión para quinteto)</p>'
      AND o.observaciones = 'Para acomodar — Beethoven-Khym - Sonata Op. 17, versión para quinteto'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Sonata Op. 17 (versión para quinteto)</p>',
      NULL,
      1800,
      NULL,
      'Oficial',
      'Para acomodar — Beethoven-Khym - Sonata Op. 17, versión para quinteto',
      '',
      'https://drive.google.com/drive/folders/1jEdxbiFSb6f8mZzZBAHLfsqJWgUPSAQd'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Beethoven_Ludwig_van, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1_GpGf1_REJ57LPNtMfDQlVvg9XeCWe4u/view?usp=drivesdk","description":"SCORE - op.17. Sonata Op. 17 (quinteto) - Beethoven-Khym.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Sonata Op. 17 (versión para quinteto)</p>';
  END IF;

  -- <p>Quinteto de cuerdas en Do mayor, Op. 29</p><div>&nbsp; I. Allegro moderato</div><div>&nbsp; II. Adagio molto espressivo</div><div>&nbsp; III. Scherzo. Allegro</div><div>&nbsp; IV. Presto</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Quinteto de cuerdas en Do mayor, Op. 29</p><div>&nbsp; I. Allegro moderato</div><div>&nbsp; II. Adagio molto espressivo</div><div>&nbsp; III. Scherzo. Allegro</div><div>&nbsp; IV. Presto</div>'
      AND o.observaciones = 'Para acomodar — Beethoven, L. - Quinteto de cuerdas en Do mayor, Op. 29'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Quinteto de cuerdas en Do mayor, Op. 29</p><div>&nbsp; I. Allegro moderato</div><div>&nbsp; II. Adagio molto espressivo</div><div>&nbsp; III. Scherzo. Allegro</div><div>&nbsp; IV. Presto</div>',
      NULL,
      1801,
      NULL,
      'Oficial',
      'Para acomodar — Beethoven, L. - Quinteto de cuerdas en Do mayor, Op. 29',
      'Str',
      'https://drive.google.com/drive/folders/1TGlS7mweOS3a5RUN8hlLS2cTK71ZKAHy'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Beethoven_Ludwig_van, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 1', '[{"url":"https://drive.google.com/file/d/14tW64RNgY1d-UQpjZwTC-jjddKrJdP0Y/view?usp=drivesdk","description":"Viola 1 - op.29. Quinteto de cuerdas - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 2', '[{"url":"https://drive.google.com/file/d/1F_YYUEcWwt7ckqaMwQYrPdr8PdVqj71l/view?usp=drivesdk","description":"Viola 2 - op.29. Quinteto de cuerdas - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1L62j87hmF-cuKOS_MdmU4KnEhiuG1cm5/view?usp=drivesdk","description":"Violín 1 - op.29. Quinteto de cuerdas - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1stM92-lK_hA0LUL8UqVLZy32IBR7sMO7/view?usp=drivesdk","description":"Violín 2 - op.29. Quinteto de cuerdas - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Lu-MPxE4OKc5haXpZB9qwAo0oUTt5quG/view?usp=drivesdk","description":"Violoncello - op.29. Quinteto de cuerdas - Beethoven, L.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Quinteto de cuerdas en Do mayor, Op. 29</p><div>&nbsp; I. Allegro moderato</div><div>&nbsp; II. Adagio molto espressivo</div><div>&nbsp; III. Scherzo. Allegro</div><div>&nbsp; IV. Presto</div>';
  END IF;

  -- <p>Trío de cuerdas en Re mayor, Op. 9 Nro. 2</p><div>&nbsp; I. Allegretto</div><div>&nbsp; II. Andante quasi Allegretto</div><div>&nbsp; III. Menuetto. Allegro</div><div>&nbsp; IV. Rondo. Allegro</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Trío de cuerdas en Re mayor, Op. 9 Nro. 2</p><div>&nbsp; I. Allegretto</div><div>&nbsp; II. Andante quasi Allegretto</div><div>&nbsp; III. Menuetto. Allegro</div><div>&nbsp; IV. Rondo. Allegro</div>'
      AND o.observaciones = 'Para acomodar — Beethoven, L. - Trío de cuerdas en Re mayor, Op. 9 Nro. 2'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Trío de cuerdas en Re mayor, Op. 9 Nro. 2</p><div>&nbsp; I. Allegretto</div><div>&nbsp; II. Andante quasi Allegretto</div><div>&nbsp; III. Menuetto. Allegro</div><div>&nbsp; IV. Rondo. Allegro</div>',
      NULL,
      1798,
      NULL,
      'Oficial',
      'Para acomodar — Beethoven, L. - Trío de cuerdas en Re mayor, Op. 9 Nro. 2',
      'Str',
      'https://drive.google.com/drive/folders/19mBcM9q2ztilMKgHLTqTZMnXUpHwb81f'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Beethoven_Ludwig_van, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/17y0t49LdsVWPjLBnpEZofOkhSq654Qby/view?usp=drivesdk","description":"Viola - op.9 nro.2. Trío de cuerdas - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín', '[{"url":"https://drive.google.com/file/d/1CZkm-Mi4V_iD-Ow9sdZdFncLRCRXDtn5/view?usp=drivesdk","description":"Violín - op.9 nro.2. Trío de cuerdas - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1CYx5gx4roNevZlvENIOqqwvzq5azPoWH/view?usp=drivesdk","description":"Violoncello - op.9 nro.2. Trío de cuerdas - Beethoven, L.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Trío de cuerdas en Re mayor, Op. 9 Nro. 2</p><div>&nbsp; I. Allegretto</div><div>&nbsp; II. Andante quasi Allegretto</div><div>&nbsp; III. Menuetto. Allegro</div><div>&nbsp; IV. Rondo. Allegro</div>';
  END IF;

  -- <p>Cuarteto de cuerdas en Sol mayor, Op. 18 Nro. 2</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Adagio cantabile</div><div>&nbsp; III. Scherzo. Allegro</div><div>&nbsp; IV. Allegro molto, quasi Presto</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Cuarteto de cuerdas en Sol mayor, Op. 18 Nro. 2</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Adagio cantabile</div><div>&nbsp; III. Scherzo. Allegro</div><div>&nbsp; IV. Allegro molto, quasi Presto</div>'
      AND o.observaciones = 'Para acomodar — Beethoven, L. - Cuarteto de cuerdas en Sol mayor, Op. 18 Nro. 2'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Cuarteto de cuerdas en Sol mayor, Op. 18 Nro. 2</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Adagio cantabile</div><div>&nbsp; III. Scherzo. Allegro</div><div>&nbsp; IV. Allegro molto, quasi Presto</div>',
      NULL,
      1800,
      NULL,
      'Oficial',
      'Para acomodar — Beethoven, L. - Cuarteto de cuerdas en Sol mayor, Op. 18 Nro. 2',
      'Str',
      'https://drive.google.com/drive/folders/1A7n4HN5C76YbWOq1fDeHbuvAP5UZS-Jg'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Beethoven_Ludwig_van, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Qx-X0vfNaIOutXAApu9F_ZaX43cqvCsX/view?usp=drivesdk","description":"Viola - op.18 nro.2. Cuarteto de cuerdas - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1f0F6TjVBmzUO4qA0-6mcsTyWSxQnJRwQ/view?usp=drivesdk","description":"Violín 1 - op.18 nro.2. Cuarteto de cuerdas - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1pDobD3tSAbTVZsEyEmPk_H2E2FJvZY5O/view?usp=drivesdk","description":"Violín 2 - op.18 nro.2. Cuarteto de cuerdas - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1muk6mjJKJINEsTjduVfJlTr1edF0jP1G/view?usp=drivesdk","description":"Violoncello - op.18 nro.2. Cuarteto de cuerdas - Beethoven, L.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Cuarteto de cuerdas en Sol mayor, Op. 18 Nro. 2</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Adagio cantabile</div><div>&nbsp; III. Scherzo. Allegro</div><div>&nbsp; IV. Allegro molto, quasi Presto</div>';
  END IF;

  -- <p>Cuarteto de cuerdas en Do mayor, K. 157</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Presto</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Cuarteto de cuerdas en Do mayor, K. 157</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Presto</div>'
      AND o.observaciones = 'Para acomodar — Mozart, W.A. - Cuarteto de cuerdas en Do mayor, K. 157'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Cuarteto de cuerdas en Do mayor, K. 157</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Presto</div>',
      NULL,
      1772,
      NULL,
      'Oficial',
      'Para acomodar — Mozart, W.A. - Cuarteto de cuerdas en Do mayor, K. 157',
      'Str',
      'https://drive.google.com/drive/folders/1Hmh8HM1VA9yem-hWpnnZywIcxFs44Xrf'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Mozart_Wolfgang_Amadeus, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ahDYmbBwmzSZQ4tWGjTKGShPyaSH6gMj/view?usp=drivesdk","description":"Viola - K.157. Cuarteto de cuerdas - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Aw7nIG9VvfuaVP8-TPnPt_pSyBq8kltZ/view?usp=drivesdk","description":"Violín 1 - K.157. Cuarteto de cuerdas - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/13MkN9AuUC60BeKAmkcGYqRQkElBR4hVq/view?usp=drivesdk","description":"Violín 2 - K.157. Cuarteto de cuerdas - Mozart, W.A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1lzCHLvtujhT9Dhv5g2AXOhyP3AcWf55I/view?usp=drivesdk","description":"Violoncello - K.157. Cuarteto de cuerdas - Mozart, W.A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Cuarteto de cuerdas en Do mayor, K. 157</p><div>&nbsp; I. Allegro</div><div>&nbsp; II. Andante</div><div>&nbsp; III. Presto</div>';
  END IF;

  -- <p>Crisantemi, SC 65</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Crisantemi, SC 65</p>'
      AND o.observaciones = 'Para acomodar — Puccini, G. - Crisantemi, SC 65'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Crisantemi, SC 65</p>',
      NULL,
      1890,
      NULL,
      'Oficial',
      'Para acomodar — Puccini, G. - Crisantemi, SC 65',
      'Str',
      'https://drive.google.com/drive/folders/1F3LCPJ82qZTz2FST8ds1cPWlGK3No-y5'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Puccini_Giacomo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1GEQS-MO6yxCASzONx1k75Tl8AZKRWvzZ/view?usp=drivesdk","description":"SCORE - SC 65. Crisantemi - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1C6QH68TSVbJcTjw4vz7pW1HEXpt5r-xb/view?usp=drivesdk","description":"Viola - SC 65. Crisantemi - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1SF5HBqtrgwtGs2SoDtKhznooaWi2qo8V/view?usp=drivesdk","description":"Violín 1 - SC 65. Crisantemi - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1tptKQ5WP8TcPSodWl3rjOMTRNP0Kdlv_/view?usp=drivesdk","description":"Violín 2 - SC 65. Crisantemi - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1KVpB2HwhO79HYsqoZxrXMvuHXNLYAssZ/view?usp=drivesdk","description":"Violoncello - SC 65. Crisantemi - Puccini, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Crisantemi, SC 65</p>';
  END IF;

  -- <p>Suite Holberg, Op. 40</p><div>&nbsp; I. Praeludium</div><div>&nbsp; II. Sarabande</div><div>&nbsp; III. Gavotte</div><div>&nbsp; IV. Air</div><div>&nbsp; V. Rigaudon</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Suite Holberg, Op. 40</p><div>&nbsp; I. Praeludium</div><div>&nbsp; II. Sarabande</div><div>&nbsp; III. Gavotte</div><div>&nbsp; IV. Air</div><div>&nbsp; V. Rigaudon</div>'
      AND o.observaciones = 'Para acomodar — Grieg, E. - Suite Holberg, Op. 40 [cuerdas]'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Suite Holberg, Op. 40</p><div>&nbsp; I. Praeludium</div><div>&nbsp; II. Sarabande</div><div>&nbsp; III. Gavotte</div><div>&nbsp; IV. Air</div><div>&nbsp; V. Rigaudon</div>',
      NULL,
      1885,
      NULL,
      'Oficial',
      'Para acomodar — Grieg, E. - Suite Holberg, Op. 40 [cuerdas]',
      'Str',
      'https://drive.google.com/drive/folders/1yNyWVCvL3qX5S2G3tYo7Ea9HQbxXQzcF'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Grieg_Edvard, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1TxMT6GxqgWpxan4AoSkNuwt_SKd6V0bu/view?usp=drivesdk","description":"Contrabajo - op.40. Suite Holberg - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1gxQfQ8VPcSKiypXZaOpA1wgpmT77-CxE/view?usp=drivesdk","description":"SCORE - op.40. Suite Holberg - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1oJ0mLGfoC7rbA4bV8nmTMaAgOWASmWS0/view?usp=drivesdk","description":"Viola - op.40. Suite Holberg - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ysJg-vzNXwGcIh3HZg9jhsBSouIQa_eT/view?usp=drivesdk","description":"Violín 1 - op.40. Suite Holberg - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1mGMbEWq3KcQHSeCnmdyZYoL5cmb5Qtei/view?usp=drivesdk","description":"Violín 2 - op.40. Suite Holberg - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1L1oCqxLN836SzB4JntR4X60GMmCiyLFH/view?usp=drivesdk","description":"Violoncello - op.40. Suite Holberg - Grieg, E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Suite Holberg, Op. 40</p><div>&nbsp; I. Praeludium</div><div>&nbsp; II. Sarabande</div><div>&nbsp; III. Gavotte</div><div>&nbsp; IV. Air</div><div>&nbsp; V. Rigaudon</div>';
  END IF;

  -- <p>Noche transfigurada, Op. 4</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Noche transfigurada, Op. 4</p>'
      AND o.observaciones = 'Para acomodar — Schoenberg, A. - Noche transfigurada, Op. 4 [cuerdas]'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Noche transfigurada, Op. 4</p>',
      NULL,
      1899,
      NULL,
      'Oficial',
      'Para acomodar — Schoenberg, A. - Noche transfigurada, Op. 4 [cuerdas]',
      'Str',
      'https://drive.google.com/drive/folders/1JcVQsJm6iDPsCpf730Ops82Xjh_dAlLW'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Schoenberg_Arnold, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1T5iJ3KWkK-wVQJUpaIgvHUWDfP38fqNz/view?usp=drivesdk","description":"Contrabajo - op.4. Noche transfigurada - Schoenberg, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1O5JHKgw45ZXvX1UYe82EmbAnDfVGoFXe/view?usp=drivesdk","description":"SCORE - op.4. Noche transfigurada - Schoenberg, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 1', '[{"url":"https://drive.google.com/file/d/1adFzYg2PzA_ap-Eg4Z5yWAOuZY_-LX4c/view?usp=drivesdk","description":"Viola 1 - op.4. Noche transfigurada - Schoenberg, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola 2', '[{"url":"https://drive.google.com/file/d/1WY4N4qMn6bI56RLoGiZj8DLbzv4cgj9W/view?usp=drivesdk","description":"Viola 2 - op.4. Noche transfigurada - Schoenberg, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1qUsff9DZuqUBAhkFZdgXt2C8-qfFQ0EZ/view?usp=drivesdk","description":"Violín 1 - op.4. Noche transfigurada - Schoenberg, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1kXXxNZJs7aP-yfzkY1y8VRKNkZEkD-Pq/view?usp=drivesdk","description":"Violín 2 - op.4. Noche transfigurada - Schoenberg, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/13e-0Yp_OjPULhRXyRqwz_rDAHlYmOIAU/view?usp=drivesdk","description":"Violoncello - op.4. Noche transfigurada - Schoenberg, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Noche transfigurada, Op. 4</p>';
  END IF;

END $$;
