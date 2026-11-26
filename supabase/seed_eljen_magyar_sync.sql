-- Strauss Jr. — Éljen a Magyar!, Op. 332 (catálogo; Para acomodar)
-- Set incompleto: SCORE, cuerdas y percusión (caja, bombo y platillos). Sin vientos, metales ni timbales.
-- bajo.pdf duplicaba el contrabajo y no se sube.
-- Generado: 2026-11-18

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Strauss_Johann_Jr_ bigint;
BEGIN
  SELECT id INTO _id_comp_Strauss_Johann_Jr_ FROM compositores WHERE apellido = 'Strauss' AND (nombre = 'Johann Jr.' OR (nombre IS NULL AND 'Johann Jr.' IS NULL)) LIMIT 1;
  IF _id_comp_Strauss_Johann_Jr_ IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Strauss', 'Johann Jr.') RETURNING id INTO _id_comp_Strauss_Johann_Jr_;
  END IF;

  -- <p>Éljen a Magyar! Polka schnell en mi menor, Op. 332</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Éljen a Magyar! Polka schnell en mi menor, Op. 332</p>'
      AND o.observaciones = 'Para acomodar — Strauss Jr., J. - Éljen a Magyar!, Op. 332. Edición Doblinger (Nischkauer). Set incompleto: faltan vientos, metales y timbales.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Éljen a Magyar! Polka schnell en mi menor, Op. 332</p>',
      NULL,
      1869,
      150,
      'Oficial',
      'Para acomodar — Strauss Jr., J. - Éljen a Magyar!, Op. 332. Edición Doblinger (Nischkauer). Set incompleto: faltan vientos, metales y timbales.',
      'Perc - Str',
      'https://drive.google.com/open?id=1RvVVg82fu1UnZND27PujLCxp2QDMm-ZW'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Strauss_Johann_Jr_, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Xsaqz-L-lRxemNnje3tzxzDXA9u3yERR/view?usp=drivesdk","description":"Contrabajo - Éljen a Magyar! - op.332 - Strauss Jr., J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1fbqvWM48_dIIjzjJ4oiiKE35Gu08JDrA/view?usp=drivesdk","description":"Perc Percusión - Éljen a Magyar! - op.332 - Strauss Jr., J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1F2RRkkYjGWVZnDnjnvjKLCrvwFlK4Xpr/view?usp=drivesdk","description":"SCORE - Éljen a Magyar! - op.332 - Strauss Jr., J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1P1KcX7JyLkNU7ngJ3d1sAtSq7nAHwSCp/view?usp=drivesdk","description":"Viola - Éljen a Magyar! - op.332 - Strauss Jr., J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1su5DJiROB2xz95FhmjbHo_DBWhHFUE5F/view?usp=drivesdk","description":"Violín 1 - Éljen a Magyar! - op.332 - Strauss Jr., J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1V6uc-KEqepD_4p9rfaC6cXfAXxcPJqzW/view?usp=drivesdk","description":"Violín 2 - Éljen a Magyar! - op.332 - Strauss Jr., J.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1C_Zi-PkAEp0LbgClkWKPgTtHEsMB4suw/view?usp=drivesdk","description":"Violoncello - Éljen a Magyar! - op.332 - Strauss Jr., J.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Éljen a Magyar! Polka schnell en mi menor, Op. 332</p>';
  END IF;

END $$;
