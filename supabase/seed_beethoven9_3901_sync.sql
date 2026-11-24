-- Beethoven, L. - Sinfonia Nro 9 Op.125 → obra 3901
DO $$
BEGIN
  UPDATE obras SET
    titulo = '<p>Sinfonía Nro. 9 en re menor, Op. 125</p><div>&nbsp; I. Allegro ma non troppo, un poco maestoso</div><div>&nbsp; II. Molto vivace</div><div>&nbsp; III. Adagio molto e cantabile</div><div>&nbsp; IV. Presto - Allegro assai</div>',
    link_drive = 'https://drive.google.com/open?id=1tEW3ilWi9T07uLfBW5ckwG88hXKQcL9e',
    observaciones = 'Para acomodar — Beethoven, L. - Sinfonia Nro 9 Op.125.',
    instrumentacion = '3.2.2.3 - 4.2.3.0 - Timp.+1 - Str + Coro',
    anio_composicion = 1824,
    duracion_segundos = 4200,
    estado = 'Oficial'
  WHERE id = 3901;

  DELETE FROM obras_particellas WHERE id_obra = 3901;

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1NJoxRKiw6XB74UUD0pxY_RwmwlmhjCiH/view?usp=drivesdk","description":"Clarinete 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1oNZlxppIIWPWxn1U52tTlcv2Y2XgI48o/view?usp=drivesdk","description":"Clarinete 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/14bPFpKUF9B-53o_52KajQwKY1xpCNg9y/view?usp=drivesdk","description":"Contrabajo - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '08b', 'Contrafagot', '[{"url":"https://drive.google.com/file/d/1b_6s5zpdr7IJU2eiPV252Zbeq8uq16Lv/view?usp=drivesdk","description":"Contrafagot - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1-3djt2Sw3q7IeOWeqkmysH0xXg8-PnPI/view?usp=drivesdk","description":"Corno 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1XqAY8Prn2FTYEYMydZjiXluPCwdeAgUS/view?usp=drivesdk","description":"Corno 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1pp0Bs1kjEDtKvYMZibYZ70pWkanSWWo8/view?usp=drivesdk","description":"Corno 3 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/1oWInFAxjpSgflzAuZkWNWTLqV3Lov3kK/view?usp=drivesdk","description":"Corno 4 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '23', 'Coro', '[{"url":"https://drive.google.com/file/d/1l96R0npTlAlMxQjUnU8ObEsQbUVhWUY0/view?usp=drivesdk","description":"Coro - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/12e0oSXyBlzWR80Jwt1wuBbimgk4dYo63/view?usp=drivesdk","description":"Fagot 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1_njsAyuYcRmyjP5GRo3IU9BC1Eqd7o8d/view?usp=drivesdk","description":"Fagot 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1Fd3HRTTWYNhP8SP7PnTTEs5YT3ryycUA/view?usp=drivesdk","description":"Fl Piccolo - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/19gZjfDG2JmtEsZ-WNuZZJzzgMhh69Fns/view?usp=drivesdk","description":"Flauta 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1xB8avdmIbWxfCpl_AJcReMX5rjEve_FM/view?usp=drivesdk","description":"Flauta 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1oHnnkLdccw7xaW81aRBaIAR8utJ7lCze/view?usp=drivesdk","description":"Oboe 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1zteNJ6WkGU8Dip2TRvm2kjaLTJB5BjHz/view?usp=drivesdk","description":"Oboe 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '13', 'Percusión', '[{"url":"https://drive.google.com/file/d/1KMYSuqz1aWaBnv7etHxSBQgXyGY2df-P/view?usp=drivesdk","description":"Percusión - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/18ej3P_LNV08p04BwUn-MPGbhkelXLMwQ/view?usp=drivesdk","description":"SCORE - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '13a', 'Timbales', '[{"url":"https://drive.google.com/file/d/1oqAPMhI3OTjkoyzkVlYKnWdXEmQqZvcc/view?usp=drivesdk","description":"Timbales - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1PzVzSzHlTnxWtCv28ZT2TYsY6iwuOnvW/view?usp=drivesdk","description":"Trombón 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1rmdAh5jG_sU5cAM6MKDdiNyX5rAwFcfu/view?usp=drivesdk","description":"Trombón 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/12fXOhpXEFfqgEYWdCiHXntXrfIAtEtNu/view?usp=drivesdk","description":"Trombón 3 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1nJgyrHHHvgUxf2081-vq7RsYQBr_Q9d-/view?usp=drivesdk","description":"Trompeta 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1xRdXDB1UQjAU8LqpV0NEKLHSt1ssslUY/view?usp=drivesdk","description":"Trompeta 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/16nCcgXaNUrAyV1RantlMrTBTXmr4CrPA/view?usp=drivesdk","description":"Viola - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ODXjF_fLgxfq0FV-5nsJ40zf8o1mbqqR/view?usp=drivesdk","description":"Violín 1 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/16tGFbOcJZFpixQt07I-4uHrfDOrY9gVv/view?usp=drivesdk","description":"Violín 2 - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);

  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (3901, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1K_X8KYgI806MweJt3aMyVdxe7uMXwJAa/view?usp=drivesdk","description":"Violoncello - op.125. Sinfonia Nro 9 - Beethoven, L.pdf"}]', false);
END $$;
