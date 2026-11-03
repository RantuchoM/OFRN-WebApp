-- Dvořák — Serenata para Cuerdas en Mi mayor, Op. 22
-- Generado: 2026-11-03

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Dvorak_Antonin bigint;
BEGIN
  SELECT id INTO _id_comp_Dvorak_Antonin FROM compositores WHERE apellido = 'Dvorak' AND (nombre = 'Antonin' OR (nombre IS NULL AND 'Antonin' IS NULL)) LIMIT 1;
  IF _id_comp_Dvorak_Antonin IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Dvorak', 'Antonin') RETURNING id INTO _id_comp_Dvorak_Antonin;
  END IF;

  -- <p>Serenata para Cuerdas en Mi mayor, Op. 22</p><div>&nbsp; I. Moderato</div><div>&nbsp; II. Tempo di Valse</div><div>&nbsp; III. Scherzo. Vivace</div><div>&nbsp; IV. Larghetto</div><div>&nbsp; V. Finale. Allegro vivace</div>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Serenata para Cuerdas en Mi mayor, Op. 22</p><div>&nbsp; I. Moderato</div><div>&nbsp; II. Tempo di Valse</div><div>&nbsp; III. Scherzo. Vivace</div><div>&nbsp; IV. Larghetto</div><div>&nbsp; V. Finale. Allegro vivace</div>'
      AND o.observaciones = 'Para acomodar — Dvorak, A. - Serenata para Cuerdas en Mi Mayor Op. 22'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Serenata para Cuerdas en Mi mayor, Op. 22</p><div>&nbsp; I. Moderato</div><div>&nbsp; II. Tempo di Valse</div><div>&nbsp; III. Scherzo. Vivace</div><div>&nbsp; IV. Larghetto</div><div>&nbsp; V. Finale. Allegro vivace</div>',
      NULL,
      1875,
      1701,
      'Oficial',
      'Para acomodar — Dvorak, A. - Serenata para Cuerdas en Mi Mayor Op. 22',
      'Str',
      'https://drive.google.com/open?id=1Uv4vvVa0b0qMMWbgM8MjD2E0dxeML9Ve'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Dvorak_Antonin, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1VODriYQxXjzkUnZRYFj70uDOvBjCdWRE/view?usp=drivesdk","description":"Contrabajo - Serenata para Cuerdas en Mi Mayor Op. 22 - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Uv6PGmHaHxDIuZMiGrDyfemnCwQmmC4p/view?usp=drivesdk","description":"SCORE - Serenata para Cuerdas en Mi Mayor Op. 22 - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1VDQjtXObJsGJ6a9HhzinV78cbCWuKVaF/view?usp=drivesdk","description":"Viola - Serenata para Cuerdas en Mi Mayor Op. 22 - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/167ZDCzhgc7wJWfFwjVZyY-WQRj0ByeKt/view?usp=drivesdk","description":"Violín 1 - Serenata para Cuerdas en Mi Mayor Op. 22 - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1VCDy6WuColAyqsvxLp_bQIHTaOjJCbsA/view?usp=drivesdk","description":"Violín 2 - Serenata para Cuerdas en Mi Mayor Op. 22 - Dvorak, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1VMqZVoar5204CGSgE8cjgMhjZLkWgRCd/view?usp=drivesdk","description":"Violoncello - Serenata para Cuerdas en Mi Mayor Op. 22 - Dvorak, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Serenata para Cuerdas en Mi mayor, Op. 22</p><div>&nbsp; I. Moderato</div><div>&nbsp; II. Tempo di Valse</div><div>&nbsp; III. Scherzo. Vivace</div><div>&nbsp; IV. Larghetto</div><div>&nbsp; V. Finale. Allegro vivace</div>';
  END IF;

END $$;
