-- Un bel di vedremo [recorte Eguiarte] — Puccini (ARIAS; variante de 3199)
-- Generado: 2026-09-02

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Puccini_Giacomo bigint;
BEGIN
  SELECT id INTO _id_comp_Puccini_Giacomo FROM compositores WHERE apellido = 'Puccini' AND (nombre = 'Giacomo' OR (nombre IS NULL AND 'Giacomo' IS NULL)) LIMIT 1;
  IF _id_comp_Puccini_Giacomo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Puccini', 'Giacomo') RETURNING id INTO _id_comp_Puccini_Giacomo;
  END IF;

  -- Un bel di vedremo. <i>'Madama Butterfly'</i> [recorte Eguiarte]
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Un bel di vedremo. <i>''Madama Butterfly''</i> [recorte Eguiarte]'
      AND o.observaciones = 'ARIAS — Puccini, G. - Un bel di vedremo [recorte Eguiarte]. Recorte CORCUDEC/Eguiarte; versión distinta de obra 3199 ([aria]). Falta Fagot 1 en el set.'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Un bel di vedremo. <i>''Madama Butterfly''</i> [recorte Eguiarte]',
      NULL,
      1904,
      300,
      'Oficial',
      'ARIAS — Puccini, G. - Un bel di vedremo [recorte Eguiarte]. Recorte CORCUDEC/Eguiarte; versión distinta de obra 3199 ([aria]). Falta Fagot 1 en el set.',
      '3.3.3.1 - 4.3.4.0 - Timp.+1 - Hp - Str',
      'https://drive.google.com/open?id=1NGTb2jX5gGZ09qzikVJsD39Pln4q_qFy'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Puccini_Giacomo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1gSwVSKpEseg_bxkW6akh0xld8RYJBOwc/view?usp=drivesdk","description":"Arpa - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1VfzEfbJK4CDcy4W6XMiAdtu4MRQXAIhG/view?usp=drivesdk","description":"Clarinete 1 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1EfutFOE6qZ5T78f0VC9St4lko5mthsVi/view?usp=drivesdk","description":"Clarinete 2 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07b', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/10tm3331g89kEWP2h1rznofBBvs2srxZE/view?usp=drivesdk","description":"Clarinete Bajo - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1N4haLVII0N4m9uQSuJXSYwSigFCM0LDn/view?usp=drivesdk","description":"Contrabajo - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/1JafUGVrEEEx8zfGDRhJzLNt5r6qElrR4/view?usp=drivesdk","description":"Corno 1 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1ruTR09zDVH2hk8e3mQfaqu1GSlmn4AI0/view?usp=drivesdk","description":"Corno 2 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 3', '[{"url":"https://drive.google.com/file/d/1OOc3NUCpHsTU3wSo_XS1zcOxVtPjqa-B/view?usp=drivesdk","description":"Corno 3 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 4', '[{"url":"https://drive.google.com/file/d/15P9RR8-Al8-PdaucwlcZWptajwn1a7mK/view?usp=drivesdk","description":"Corno 4 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1xJ8i29OFgwmoG4_SXdGFMr_kVp2whB2j/view?usp=drivesdk","description":"Fagot 2 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1cVwuOKbJOi8lu534ANZE2N-AXSGupTqL/view?usp=drivesdk","description":"Fl Piccolo - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1m6cXBKiQPT85cpwElLIkic0pUZHDpD_g/view?usp=drivesdk","description":"Flauta 1 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1phRWuXxa382ME3VpzVL9c2Rt-0x7JMq4/view?usp=drivesdk","description":"Flauta 2 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Ob EH', '[{"url":"https://drive.google.com/file/d/1HNxEc1TuuIXLXCRIr9F3qYLHmqWxETXV/view?usp=drivesdk","description":"Ob EH - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1ZC8hOM5wIr57D-692T3R50AHgGoVdR3w/view?usp=drivesdk","description":"Oboe 1 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1w1hq88JcP8V6B_75Gl9AA9Kmc7BQeHac/view?usp=drivesdk","description":"Oboe 2 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc 1', '[{"url":"https://drive.google.com/file/d/1_N-dlWdbX40MGb2gUgrQDUqaHjeQctUt/view?usp=drivesdk","description":"Perc 1 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timp', '[{"url":"https://drive.google.com/file/d/1QYLQOlUJcuIp6CRpMFZumH0sURt2hPxL/view?usp=drivesdk","description":"Perc Timp - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/16HvfQSr6pqh8eJjE_xRdglCKpP9fPzir/view?usp=drivesdk","description":"SCORE - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"},{"url":"https://drive.google.com/file/d/1C63_6foXmgruG_tyf6HomytaGT5vz6q_/view?usp=drivesdk","description":"SCORE 2 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1kua0MFHB4uZSrHvLKNbLIwgsovtYPlMI/view?usp=drivesdk","description":"Trombón 1 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1QEVg9nvmEVFI0u6n861LjnlheYSRkA0x/view?usp=drivesdk","description":"Trombón 2 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1Z-xwloRc4epP5NLkDZkJc79JZt7ucsUr/view?usp=drivesdk","description":"Trombón 3 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón Bajo', '[{"url":"https://drive.google.com/file/d/1wbPJy-QsI0sHhmq38UkkxG-6GlSyaTor/view?usp=drivesdk","description":"Trombón Bajo - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1S7qo8ug3hkVDFBy4WvQiZFP7DW416K9a/view?usp=drivesdk","description":"Trompeta 1 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1hZVupHlj8mHJa5cvAroRWf2SUhS99fNX/view?usp=drivesdk","description":"Trompeta 2 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 3', '[{"url":"https://drive.google.com/file/d/1hITbk0LTWhGkpDz-pcUzPBgD8XoxjIxZ/view?usp=drivesdk","description":"Trompeta 3 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1bMwL7FoetjpFJ4OnOxq3Rr-sp-8CK0Uv/view?usp=drivesdk","description":"Viola - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1MhkK-xhmlfxjZrQLW0tziJM_uWYXi6Je/view?usp=drivesdk","description":"Violín 1 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1L6c-6OA6UqTgma0DQNjZAA9rj7zN94fz/view?usp=drivesdk","description":"Violín 2 - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Q0Wi58S6rcogGqlErJa6fvqzENJA9NaO/view?usp=drivesdk","description":"Violoncello - Un bel di vedremo [recorte Eguiarte] - Puccini, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Un bel di vedremo. <i>''Madama Butterfly''</i> [recorte Eguiarte]';
  END IF;

END $$;
