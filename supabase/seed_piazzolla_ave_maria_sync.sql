-- Piazzolla Ave Maria (Amici della Sabina) → catálogo + gira 22 / Repertorio / excluir
-- Generado: 2026-10-08

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Piazzolla_Astor bigint;
BEGIN
  SELECT id INTO _id_comp_Piazzolla_Astor FROM compositores WHERE apellido = 'Piazzolla' AND (nombre = 'Astor' OR (nombre IS NULL AND 'Astor' IS NULL)) LIMIT 1;
  IF _id_comp_Piazzolla_Astor IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Piazzolla', 'Astor') RETURNING id INTO _id_comp_Piazzolla_Astor;
  END IF;

  -- <p>Ave Maria</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Ave Maria</p>'
      AND o.observaciones = 'Para acomodar — Piazzolla, A. - Ave Maria. Arreglo Orchestra Amici della Sabina (Moderato, negra = 84). Score en dos tamaños del mismo contenido. La parte solista impresa es flauta en Do, anotada a mano «Para tromba»; se carga como Trompeta Solo.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Ave Maria</p>',
      NULL,
      1984,
      NULL,
      'Oficial',
      'Para acomodar — Piazzolla, A. - Ave Maria. Arreglo Orchestra Amici della Sabina (Moderato, negra = 84). Score en dos tamaños del mismo contenido. La parte solista impresa es flauta en Do, anotada a mano «Para tromba»; se carga como Trompeta Solo.',
      'Tp - Str',
      'https://drive.google.com/open?id=1piq7AZUPrIBZODd01_tm07awBo4ufsGZ'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Piazzolla_Astor, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1bsJ9iNlmOH0o2sQDvtYvqKu9FSJSnx9w/view?usp=drivesdk","description":"Contrabajo - Ave Maria - Piazzolla, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/11D2yfC6MHGTUt1-3BedhIY2rP92z6Eax/view?usp=drivesdk","description":"SCORE - Ave Maria - Piazzolla, A.pdf"},{"url":"https://drive.google.com/file/d/1ewZokYA3qalXcI5gxkye0wQWF6GZpxly/view?usp=drivesdk","description":"SCORE 2 - Ave Maria - Piazzolla, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta Solo', '[{"url":"https://drive.google.com/file/d/1m9y4ohF_dEro1NqSfMuCKn8iZGXY29Ir/view?usp=drivesdk","description":"Trompeta Solo - Ave Maria - Piazzolla, A.pdf"}]', true);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/16A4aa46MckrwQteiyH3sxNchDNK4jBOu/view?usp=drivesdk","description":"Viola - Ave Maria - Piazzolla, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ORm0NIrhfcvNMIQx0nVGuLnjy1f4dYDB/view?usp=drivesdk","description":"Violín 1 - Ave Maria - Piazzolla, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1uW7r05nG38WJLgw8biNQn1Q-BudgX6Mo/view?usp=drivesdk","description":"Violín 2 - Ave Maria - Piazzolla, A.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1GvIKYmBIpQ9i6PZ--gNaOHrXv-9PKtz3/view?usp=drivesdk","description":"Violoncello - Ave Maria - Piazzolla, A.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Ave Maria</p>';
  END IF;

END $$;


-- Gira 22, bloque «Repertorio», al final, excluir = true
DO $$
DECLARE
  _id_obra bigint;
  _block_id bigint;
  _next_orden integer;
BEGIN
  SELECT id INTO _block_id
  FROM programas_repertorios
  WHERE id_programa = 22 AND nombre = 'Repertorio'
  ORDER BY orden
  LIMIT 1;
  IF _block_id IS NULL THEN
    RAISE EXCEPTION 'No hay bloque Repertorio en la gira 22';
  END IF;

  SELECT o.id INTO _id_obra
  FROM obras o
  WHERE o.titulo = '<p>Ave Maria</p>'
    AND o.observaciones = 'Para acomodar — Piazzolla, A. - Ave Maria. Arreglo Orchestra Amici della Sabina (Moderato, negra = 84). Score en dos tamaños del mismo contenido. La parte solista impresa es flauta en Do, anotada a mano «Para tromba»; se carga como Trompeta Solo.'
  ORDER BY o.id DESC
  LIMIT 1;
  IF _id_obra IS NULL THEN
    RAISE EXCEPTION 'No se encontró Ave Maria de Piazzolla recién cargada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = _block_id AND id_obra = _id_obra
  ) THEN
    SELECT COALESCE(MAX(orden), 0) + 1 INTO _next_orden
    FROM repertorio_obras
    WHERE id_repertorio = _block_id;

    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden, excluir)
    VALUES (_block_id, _id_obra, _next_orden, true);
  ELSE
    UPDATE repertorio_obras
    SET excluir = true
    WHERE id_repertorio = _block_id AND id_obra = _id_obra;
  END IF;
END $$;
