-- Beethoven / Carl Khym — Sonata Op. 17 (versión para quinteto)
-- Actualiza obra #3692: carpeta propia, título con movimientos, arreglador Khym.
-- SCORE IMSLP #607394 (Tremblay 2019; Corno en Fa + cuarteto; sin partes separadas en IMSLP).

DO $$
DECLARE
  _id_obra bigint := 3692;
  _id_beethoven bigint;
  _id_khym bigint;
BEGIN
  SELECT id INTO _id_beethoven
  FROM compositores
  WHERE apellido = 'Beethoven' AND nombre = 'Ludwig van'
  LIMIT 1;
  IF _id_beethoven IS NULL THEN
    INSERT INTO compositores (apellido, nombre)
    VALUES ('Beethoven', 'Ludwig van')
    RETURNING id INTO _id_beethoven;
  END IF;

  SELECT id INTO _id_khym
  FROM compositores
  WHERE apellido = 'Khym' AND (nombre = 'Carl' OR nombre = 'Charles')
  LIMIT 1;
  IF _id_khym IS NULL THEN
    INSERT INTO compositores (apellido, nombre)
    VALUES ('Khym', 'Carl')
    RETURNING id INTO _id_khym;
  END IF;

  UPDATE obras SET
    titulo =
      '<p>Sonata para Corno en Fa mayor, Op. 17 (versión para quinteto)</p>'
      || '<div>&nbsp; I. Allegro moderato</div>'
      || '<div>&nbsp; II. Poco Adagio, quasi Andante</div>'
      || '<div>&nbsp; III. Rondo. Allegro moderato</div>',
    id_arreglador = _id_khym,
    anio_composicion = 1800,
    duracion_segundos = 882,
    instrumentacion = '1.0.0.0 - 0.0.0.0 - Str',
    link_drive = 'https://drive.google.com/drive/folders/1d-YPDipBouCC5bz4gikOgHCtqaODMBoA',
    observaciones =
      'Para acomodar — Beethoven-Khym - Sonata Op. 17, versión para quinteto. '
      || 'Arr. Charles/Carl Khym (ed. Tremblay 2019, IMSLP #607394): Corno en Fa + Violín 1–2, Viola, Violoncello. '
      || 'IMSLP solo publica SCORE (sin particellas separadas).'
  WHERE id = _id_obra;

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_beethoven, 'compositor'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_beethoven AND oc.rol = 'compositor'
  );

  INSERT INTO obras_compositores (id_obra, id_compositor, rol)
  SELECT _id_obra, _id_khym, 'arreglador'
  WHERE NOT EXISTS (
    SELECT 1 FROM obras_compositores oc
    WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_khym AND oc.rol = 'arreglador'
  );

  UPDATE obras_particellas SET
    url_archivo =
      '[{"url":"https://drive.google.com/file/d/1oKN6shI9Mpbcy3SXnWU35EQompR8ed-E/view?usp=drivesdk","description":"SCORE - op.17. Sonata Op. 17 (quinteto) - Beethoven-Khym.pdf"}]'
  WHERE id_obra = _id_obra AND nombre_archivo = 'SCORE';
END $$;
