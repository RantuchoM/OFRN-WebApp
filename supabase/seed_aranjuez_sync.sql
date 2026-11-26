-- Rodrigo, Concierto de Aranjuez. Alquiler Schott. No se agrega a un programa.

DO $$
DECLARE
  _id_obra bigint;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM obras o
    JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.id_compositor = 869 AND oc.rol = 'compositor'
    WHERE o.titulo = '<p>Concierto de Aranjuez</p><div>&nbsp; I. Allegro con spirito</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Allegro gentile</div>'
  ) THEN
    INSERT INTO obras (titulo, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive, link_youtube)
    VALUES (
      '<p>Concierto de Aranjuez</p><div>&nbsp; I. Allegro con spirito</div><div>&nbsp; II. Adagio</div><div>&nbsp; III. Allegro gentile</div>',
      1939,
      1297,
      'Oficial',
      'Alquiler Schott / Barry Editorial. No programada. Cuerdas con márgenes recortados (no se archivó «Cuerda sin recortar»). Reducción de piano incluida, fuera del orgánico.',
      'Gtr - 2(Picc).2(E.H.).2.2 - 2.2.0.0 - Str',
      'https://drive.google.com/open?id=1QX7YZyA1_b74zuMhGDBt7pC8jPmTnZjd',
      'https://www.youtube.com/watch?v=Zy8QKwTeMGo'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    VALUES (_id_obra, 869, 'compositor');

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1uw-e10JWVkY4UG90aGyggtYgYePWbK_n/view?usp=drivesdk","description":"Clarinete 1 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1kliIPCzenhWcJsxM0zyyzXqMVba8zLR5/view?usp=drivesdk","description":"Clarinete 2 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/17y9dY0G-7zQvF8jhnTbb6JAUButu06Uh/view?usp=drivesdk","description":"Contrabajo - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/13xguSZdExtla-kDJuW9QNZkcFkmi3WhN/view?usp=drivesdk","description":"Corno 1 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/12xepSujF6o1HVNu9_L55W_Jh7d9AeVit/view?usp=drivesdk","description":"Corno 2 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1Me2b9WHFNf34IGCzpWjKu-hbpHAhDgd4/view?usp=drivesdk","description":"Fagot 1 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1eb5Z3lsdOnh6eM-J4ZLJj4xAIrfBfGmR/view?usp=drivesdk","description":"Fagot 2 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1Hm29IIVUrF_s4kubG098gm8h0AMXg3Ik/view?usp=drivesdk","description":"Flauta 1 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1D-mU5iVtqem-4CR-YlbbfMKzN5XP-_mW/view?usp=drivesdk","description":"Flauta 2 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, 'Picc');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '21', 'Guitarra', '[{"url":"https://drive.google.com/file/d/1a76eJwLDksb0ZOVo2_kWeXi5knk7iqTl/view?usp=drivesdk","description":"Guitarra - Concierto de Aranjuez - Rodrigo, J.pdf"}]', true, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1zSzVbadfCcBr8Ry5GYNi66nUq21uqUoG/view?usp=drivesdk","description":"Oboe 1 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/12GzgWJALZU8EVtFq4jV6WwPNP1OdkRtb/view?usp=drivesdk","description":"Oboe 2 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, 'E.H.');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '15', 'Piano', '[{"url":"https://drive.google.com/file/d/1dajVPCJyIv-THkLwHnnexksU4ydAHqGJ/view?usp=drivesdk","description":"Piano - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1qUm74JwWs_PX8YYPf4P-DE5cig_kjCsJ/view?usp=drivesdk","description":"SCORE - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1hhdorgFtLBSenZ6mABFgFoVLX4UT2QQA/view?usp=drivesdk","description":"Trompeta 1 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1gDvK_KWKlk33ehZmsrtgYTdcGk-ZGbCM/view?usp=drivesdk","description":"Trompeta 2 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1xF79-qlgpPQqhx-Do0nqj_RjqPbea_Ud/view?usp=drivesdk","description":"Viola - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1qOk_q9uW8ao5nwnbuFcdjzIsiz7Y_ldH/view?usp=drivesdk","description":"Violín 1 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1OK34WyUwU--Cpq4BpJyH2oAx_opwk6jF/view?usp=drivesdk","description":"Violín 2 - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1p5fleF8OF_5e-_I_PQ_xX499hBnhXQ0q/view?usp=drivesdk","description":"Violoncello - Concierto de Aranjuez - Rodrigo, J.pdf"}]', false, NULL);

    -- El trigger suma la reducción de piano como Key. El orgánico de la obra no la incluye.
    UPDATE obras SET instrumentacion = 'Gtr - 2(Picc).2(E.H.).2.2 - 2.2.0.0 - Str' WHERE id = _id_obra;

    RAISE NOTICE 'Obra creada: %', _id_obra;
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Concierto de Aranjuez';
  END IF;
END $$;
