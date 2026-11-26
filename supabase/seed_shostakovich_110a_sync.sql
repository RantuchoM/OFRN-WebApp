-- Shostakovich, Sinfonía de cámara Op. 110a → obra 3894
-- Arreglo de Rudolf Barshai del Cuarteto n.º 8. SCORE + 5 cuerdas.

UPDATE obras SET
  titulo = '<p>Sinfonía de cámara en do menor, Op. 110a</p><div>&nbsp; I. Largo</div><div>&nbsp; II. Allegro molto</div><div>&nbsp; III. Allegretto</div><div>&nbsp; IV. Largo</div><div>&nbsp; V. Largo</div>',
  anio_composicion = 1960,
  duracion_segundos = 1457,
  link_youtube = 'https://www.youtube.com/watch?v=KFb81Ug_I70',
  link_drive = 'https://drive.google.com/open?id=105sbpfKd_UR15U5ty1eEPVhauNLIEjt9',
  instrumentacion = 'Str',
  id_arreglador = 891,
  estado = 'Oficial'
WHERE id = 3894;

UPDATE obras_compositores
SET rol = 'arreglador'
WHERE id_obra = 3894 AND id_compositor = 891 AND rol = 'compositor';

INSERT INTO obras_compositores (id_obra, id_compositor, rol)
SELECT 3894, 891, 'arreglador'
WHERE NOT EXISTS (
  SELECT 1 FROM obras_compositores
  WHERE id_obra = 3894 AND id_compositor = 891
);

DELETE FROM obras_particellas WHERE id_obra = 3894;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3894, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1XgqoaMvxwT-g6tUxOwPuCjsGExY4j2Ww/view?usp=drivesdk","description":"Contrabajo - Sinfonía de cámara - op.110a - Shostakovich, D.pdf"}]', false);
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3894, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/121T9Z49yIrp-V88E7EDEv-YeXNZojNkp/view?usp=drivesdk","description":"SCORE - Sinfonía de cámara - op.110a - Shostakovich, D.pdf"}]', false);
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3894, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1w0c-9vbJlmtXyGBVHGJn6cnF6V5lAfvc/view?usp=drivesdk","description":"Viola - Sinfonía de cámara - op.110a - Shostakovich, D.pdf"}]', false);
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3894, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1VFRp63IjIc5EoM_HTVmdoR4MRezih25i/view?usp=drivesdk","description":"Violín 1 - Sinfonía de cámara - op.110a - Shostakovich, D.pdf"}]', false);
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3894, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1yqs-uZ1hThVj9noposZLEcyC6V3NxofB/view?usp=drivesdk","description":"Violín 2 - Sinfonía de cámara - op.110a - Shostakovich, D.pdf"}]', false);
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3894, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1mzw08tRFtV2SEcEPf9psaxLhqppJLUx8/view?usp=drivesdk","description":"Violoncello - Sinfonía de cámara - op.110a - Shostakovich, D.pdf"}]', false);
