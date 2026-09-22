-- Bernstein, L — Obertura Candide
-- Generado: 2026-09-21

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Bernstein_Leonard bigint;
BEGIN
  SELECT id INTO _id_comp_Bernstein_Leonard FROM compositores WHERE apellido = 'Bernstein' AND (nombre = 'Leonard' OR (nombre IS NULL AND 'Leonard' IS NULL)) LIMIT 1;
  IF _id_comp_Bernstein_Leonard IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Bernstein', 'Leonard') RETURNING id INTO _id_comp_Bernstein_Leonard;
  END IF;

  -- Obertura Candide
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Obertura Candide'
      AND o.observaciones = 'Para acomodar — Bernstein, L. - Obertura Candide'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Obertura Candide',
      NULL,
      1956,
      282,
      'Oficial',
      'Para acomodar — Bernstein, L. - Obertura Candide',
      '3.2.4.3 - 4.2.3.1 - Timp.+1 - Hp - Str',
      'https://drive.google.com/open?id=1OzJiBhVGdhiFU6-AkBpYeLSsLb69jaj3'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Bernstein_Leonard, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1Ry7kekn3CBoLkjIYeTq5MWAkz762VLmz/view?usp=drivesdk","description":"Arpa - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1_jaVkJ3C2J2CdrWwIBe7axeMrSxo4eVJ/view?usp=drivesdk","description":"Clarinete Bajo - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1bve3lwLtGWYnOiiHQJg8eaENAtrBIu8e/view?usp=drivesdk","description":"Clarinete Bb 1 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1DmuPQhr938Z0tSRb_PQWBvuYqg7ooEOv/view?usp=drivesdk","description":"Clarinete Bb 2 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Requinto', '[{"url":"https://drive.google.com/file/d/1WDaIoEzoZV5jyVirI7e3BHEPEiBMoh_d/view?usp=drivesdk","description":"Clarinete Requinto - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1r8Tm20HLsFgWI9ndHer2047lDCLQQiI-/view?usp=drivesdk","description":"Contrabajo - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1Lckw5q7DMCc9prNpsuDU0-cmrtBD76ts/view?usp=drivesdk","description":"Contrafagot - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 1', '[{"url":"https://drive.google.com/file/d/1PIcvHMj_TsYFbBolPvedjTUxRt2jHhsd/view?usp=drivesdk","description":"Corno F 1 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1IQVXQ7HqQXeQ_4ezfdca8yooeEOlZnyf/view?usp=drivesdk","description":"Corno F 2 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1jeFRd4iogzhM5QopA0GTKouokUYt9nrD/view?usp=drivesdk","description":"Corno F 3 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1KwzyvE8U7-A_lckC1PI06CmwDGDdQNk7/view?usp=drivesdk","description":"Corno F 4 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1ixWpRQ9s4L3xAOfJHceXdTe5O1RPgcmK/view?usp=drivesdk","description":"Fagot 1 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1FGdPMKdo1Je10B6Bi1Sge8sUhWnSQ_6Q/view?usp=drivesdk","description":"Fagot 2 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1E-Ott401CWNKAUsd3BeYYepnfkY3mPzl/view?usp=drivesdk","description":"Fl Piccolo - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1VLEE91lrdjJL1Z9z8eON6Gz1HZgi-CcM/view?usp=drivesdk","description":"Flauta 1 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1S-bz9BgzoQKVN1BZESz_EiDF3gA5Wbw4/view?usp=drivesdk","description":"Flauta 2 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1D6ZwmpCAq1JMGNmWVvYpcJc6nBfIcGKD/view?usp=drivesdk","description":"Oboe 1 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1mU9AKC8Ur9TGYpJmVZ6xJkU8TVr10t15/view?usp=drivesdk","description":"Oboe 2 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1Hw94hKFGS-YIe9O9wCQwItFXGIzZtlS9/view?usp=drivesdk","description":"Perc Percusión - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/10fNXMb1Xu8YVBnVK0jODLHcMwDWGbD99/view?usp=drivesdk","description":"Perc Timbal - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1uICySjnMqYzI4skqYUPei-8H2Rz06g7H/view?usp=drivesdk","description":"SCORE - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/17kH1bwXA4bE7GqZ9IzMS6Qj2iAPdIiWH/view?usp=drivesdk","description":"Trombón 1 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1Hm5w0LbvQ7VUn6GCMMJCEHAM3ym3p2SB/view?usp=drivesdk","description":"Trombón 2 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1VNNx8V_v85zxx4QGDYdRc_dlX_HVkExJ/view?usp=drivesdk","description":"Trombón 3 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1siEXXwHno6xt7aZ-DOexQuDoIHKmdtCa/view?usp=drivesdk","description":"Trompeta 1 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1ojnjoSe5EMFiiY2KYy1mkfnmUgXCBcnH/view?usp=drivesdk","description":"Trompeta 2 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1nCzYZxZeLJdRdlgtfY6uFXC52Il3QAHq/view?usp=drivesdk","description":"Tuba - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1JMmiqH7STafVWrMOLuCxOePeq9alJc4k/view?usp=drivesdk","description":"Viola - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1liL2ofxwq-eq-zLV7pAiwB1f9bXlbvz4/view?usp=drivesdk","description":"Violín 1 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/14TE7l83sgo-Gz4TMeppssmVN5Uxu22gE/view?usp=drivesdk","description":"Violín 2 - Obertura Candide - Bernstein, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Ho_XyxYATHIlcuYN1i_pwaTSj-iWpR4K/view?usp=drivesdk","description":"Violoncello - Obertura Candide - Bernstein, L.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Obertura Candide';
  END IF;

END $$;
