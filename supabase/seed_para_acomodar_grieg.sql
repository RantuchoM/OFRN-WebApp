-- Peer Gynt: 2 obras (Suite 1 y Suite 2)
-- Generado: 2026-06-13

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Grieg_Edvard bigint;
BEGIN
  SELECT id INTO _id_comp_Grieg_Edvard FROM compositores WHERE apellido = 'Grieg' AND (nombre = 'Edvard' OR (nombre IS NULL AND 'Edvard' IS NULL)) LIMIT 1;
  IF _id_comp_Grieg_Edvard IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Grieg', 'Edvard') RETURNING id INTO _id_comp_Grieg_Edvard;
  END IF;

  -- Peer Gynt (Suite 1)
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Peer Gynt (Suite 1)'
      AND o.observaciones = 'Para acomodar — Grieg, E. - Peer Gynt (Suite 1)'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Peer Gynt (Suite 1)',
      NULL,
      1888,
      877,
      'Oficial',
      'Para acomodar — Grieg, E. - Peer Gynt (Suite 1)',
      '3.2.2.2 - 4.2.3.1 - Timp.+2 - Str',
      'https://drive.google.com/drive/folders/1igMJPTxpRWAgv-wTuin3yXdw3In9R87K'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Grieg_Edvard, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1KTnf_u2TSR4lmepz4mXm5BjnndWk3dZb/view?usp=drivesdk","description":"Clarinete Bb - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1KCMFdOoFp1Bv0J3k3ESRcHmZodqwjanL/view?usp=drivesdk","description":"Clarinete Bb 2 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1KOOSX6xKaDjSsr7KI7eeye4QyAR8rV7y/view?usp=drivesdk","description":"Contrabajo - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1fSAnLTx93SpJpdPFuN35bKXNHKl5LEiG/view?usp=drivesdk","description":"Corno F - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/11UMvzVihHw8YYJaCMjlC4hpP9opzoXX8/view?usp=drivesdk","description":"Corno F 2 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1fyZDbMA7_f4UOGlwVoNSiHsEpYPIIfKD/view?usp=drivesdk","description":"Corno F 3 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1zQ6iJHfGxVZhG5yspSYUGfrxwdB-gLHu/view?usp=drivesdk","description":"Corno F 4 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1KGDEJAI8GjuVi0GGj0O0GnQno5ee5Yr3/view?usp=drivesdk","description":"Fagot - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1KSGtYx88wATmr4IOofvQYnF4eocCuNHc/view?usp=drivesdk","description":"Fagot 2 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1KvSQGr9Y2s95NgngfYM9hktz2b8LrxV0/view?usp=drivesdk","description":"Fl Piccolo - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1KB7G7y_ZlXf0EYO4joCr7liVq_sEwvxb/view?usp=drivesdk","description":"Flauta - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1KEqmwcCeXgxd7u-657u0hN0ex3cZup6n/view?usp=drivesdk","description":"Flauta 2 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1KEcrl49ZTSXJ6S-j2fS9L3uQEkvjwjRC/view?usp=drivesdk","description":"Oboe 1 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1KRtjjcZAxoB2do2-EnU9XvHUlmVSDGQ5/view?usp=drivesdk","description":"Oboe 2 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1KFCNA6hqsqXUQzUYbG2NYmw4UgMQMvsm/view?usp=drivesdk","description":"Perc Bombo - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1KsDy2TFmC5eGz4C0xafAtrmfvRGIP6KG/view?usp=drivesdk","description":"Perc Timbal - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1K_Vr1y0x0VVSKuaTY3zcBDQ2uzU1WATa/view?usp=drivesdk","description":"Perc Triángulo - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1KkL_Qb0L4b1G1jQMMvnk9BPW1HAn4LiX/view?usp=drivesdk","description":"Trombón - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1KXAsOsYmqQJGOue5ggoCiEQK0Y_Dyw3X/view?usp=drivesdk","description":"Trombón 2 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1Kb8KDKcPnit-2iudkdeJGeQX-f7551SH/view?usp=drivesdk","description":"Trombón 3 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1KiAeQ9pw8K2mTDtg_mxwasRQ1EUbr8gU/view?usp=drivesdk","description":"Trompeta - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1KVskzlHNO5Cj43OTSD44gbeEWd-k77U6/view?usp=drivesdk","description":"Trompeta 2 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1KcOefy1ZQjcViH7WMmq7EbSiIY61Rmq9/view?usp=drivesdk","description":"Tuba - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1L8QMln0wxXXrEdEXolhnNBa7O47ux2wM/view?usp=drivesdk","description":"Viola - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1Ky_5LkW9ofQ2wA3HobqfkZ9JUCuC9u0l/view?usp=drivesdk","description":"Violín 1 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1L3_WZxkeCwVnSh72vCBjXiSAFFnrR1Su/view?usp=drivesdk","description":"Violín 2 - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Ky4EK0ZpAcM3AutWnBpNfTI9J5RzVmKI/view?usp=drivesdk","description":"Violoncello - S-N. Peer Gynt (Suite 1) - Grieg, E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Peer Gynt (Suite 1)';
  END IF;

  -- Peer Gynt (Suite 2)
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Peer Gynt (Suite 2)'
      AND o.observaciones = 'Para acomodar — Grieg, E. - Peer Gynt (Suite 2)'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Peer Gynt (Suite 2)',
      NULL,
      1891,
      NULL,
      'Oficial',
      'Para acomodar — Grieg, E. - Peer Gynt (Suite 2)',
      '5.2.2.2 - 4.2.3.1 - Timp.+2 - Hp - Str',
      'https://drive.google.com/drive/folders/13wx5S99W5CoJLaxjHBBYJxk71BRNAZsR'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Grieg_Edvard, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1L9xHcAJSidTyOrure0CXwy98I5Oggx1T/view?usp=drivesdk","description":"Arpa - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1LUMjYvGJ-ETg0Thw_0avxMHDwa4uzMlk/view?usp=drivesdk","description":"Clarinete Bb - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1LAwBm3UZp2qO-qdsrDvsNvKlMplwOV-d/view?usp=drivesdk","description":"Clarinete Bb 2 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1LEuMIl_0QNmk7qkhcr0AT_yfHUbXs2yV/view?usp=drivesdk","description":"Contrabajo - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1LGMbb_1M4uLNwePjueKOJo2I57Egir8Q/view?usp=drivesdk","description":"Corno F - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1LUYbtEC7m28uVBOyxulO9BjxMiyjmhaS/view?usp=drivesdk","description":"Corno F 2 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1LcS0B4hYvY6jwU9YhAQaPeQslxXo7Tzr/view?usp=drivesdk","description":"Corno F 3 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1LVEl_x8wU8BL0S--1Ksprs9jaT5zYt_w/view?usp=drivesdk","description":"Corno F 4 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1Lq1c25T5tYifGd_ddbsBnGA-xdqZilsi/view?usp=drivesdk","description":"Fagot - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1M-X6SNL4oOX1HJenmam0UCcb1SsADSgI/view?usp=drivesdk","description":"Fagot 2 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1Lu8fza3EFA-j5IcJIk24rZGfKRRA5825/view?usp=drivesdk","description":"Fl Piccolo - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo 2', '[{"url":"https://drive.google.com/file/d/1MZjcp3Fznzl7llyIJ9ffqoscvQCwcBZC/view?usp=drivesdk","description":"Fl Piccolo 2 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo 3', '[{"url":"https://drive.google.com/file/d/1MWPE8sz2cTyTAilLij_-6rIewUHmtUS_/view?usp=drivesdk","description":"Fl Piccolo 3 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1LuH0e21MSSTjgxBhUB2DEM_wHRpRsFUo/view?usp=drivesdk","description":"Flauta - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1MEhlxMTgUetrR5B-lZn3PMvilal63im8/view?usp=drivesdk","description":"Flauta 2 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1MT4PcRL9Vh9vCGnXFQuDI6J5_5LZ-Pcl/view?usp=drivesdk","description":"Oboe 1 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1MRohfgERRLlk4T9MgD-zjJOnqdOchPJI/view?usp=drivesdk","description":"Oboe 2 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1LjVa2GNnCaEu1_DDkKK1TSue4acp3kkM/view?usp=drivesdk","description":"Perc Bombo - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/1MeO0T9GL1jknsV7dUuzVNpzBdjAFOUGv/view?usp=drivesdk","description":"Perc Tambor - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1MivPhSMO1gSoEaqO5hxkCmT7T7kB-pkE/view?usp=drivesdk","description":"Perc Timbal - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1MT_E3be4oRAWBYwRqLOZ2LRHwlQxjkAs/view?usp=drivesdk","description":"Trombón - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1MX0xEnmCmQlrwD6rWEp6aYUmlb2aUxkC/view?usp=drivesdk","description":"Trombón 2 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1ModZQ5mu9PHp89rBep8BJMQrP6nX1mJL/view?usp=drivesdk","description":"Trombón 3 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1MpvDMeiTyPt79iSNUV_3-Vwf_X1LY3bB/view?usp=drivesdk","description":"Trompeta - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1Md-anoKBBOG-FVH4xGp63SR4-66aBJ2S/view?usp=drivesdk","description":"Trompeta 2 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1MpUsNzI2kTnMe0k27i6YzZUY-BsvQaPp/view?usp=drivesdk","description":"Tuba - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1MxDVwTrDF_sG79jCaat1Y2n_fH7WhvUP/view?usp=drivesdk","description":"Viola - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1NLKbAHP4njhT-LpXNtwWVIpsFgqcka4h/view?usp=drivesdk","description":"Violín 1 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1N6JWyIKaPYj9HbjlLCSJvq2Kss2Wy5pA/view?usp=drivesdk","description":"Violín 2 - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1NN2_5Fbo7NHUa5raXM4R5hcJ81Ge-n5S/view?usp=drivesdk","description":"Violoncello - S-N. Peer Gynt (Suite 2) - Grieg, E.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Peer Gynt (Suite 2)';
  END IF;

END $$;
