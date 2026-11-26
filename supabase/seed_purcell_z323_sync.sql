-- Purcell, Come, ye sons of art, Z.323 → obra 3906
-- Score completo (Calebe Barros). Sin particellas de esta edición en IMSLP.

UPDATE obras SET
  titulo = '<p>Oda Come, ye sons of art, Z.323</p><div>&nbsp; I. Symphony</div><div>&nbsp; II. Come, ye sons of art</div><div>&nbsp; III. Sound the Trumpet</div><div>&nbsp; IV. Come, ye sons of art (reprise)</div><div>&nbsp; V. Strike the Viol</div><div>&nbsp; VI. The Day, that such a blessing</div><div>&nbsp; VII. Bid the virtues</div><div>&nbsp; VIII. These are the Sacred charms</div><div>&nbsp; IX. See Nature rejoicing</div>',
  anio_composicion = 1694,
  duracion_segundos = 1561,
  link_youtube = 'https://www.youtube.com/watch?v=euKk6rMHVKg',
  link_drive = 'https://drive.google.com/open?id=1_6alYgj4y4zyYafUyUzGcvUJnPJIufht',
  observaciones = 'Temporada 2027 P17 · Score completo, edición Calebe Barros (2021, CC BY-SA). IMSLP no tiene particellas de esta edición.'
WHERE id = 3906;

DELETE FROM obras_particellas WHERE id_obra = 3906;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3906, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1fQY5ajSJd9x8p_FdaPcouiVEBlWhyecu/view?usp=drivesdk","description":"SCORE - Come, ye sons of art - Z.323 - Purcell, H.pdf"}]', false);

-- Después del INSERT: el trigger deja el orgánico vacío porque solo hay SCORE.
UPDATE obras SET instrumentacion = '0.2.0.0 - 0.2.0.0 - Timp - Key - Str + Coro' WHERE id = 3906;
