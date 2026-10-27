-- Beethoven — Obertura Las Criaturas de Prometeo, Op. 43 (catálogo; Para acomodar)
-- Generado: 2026-10-27

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Beethoven_Ludwig_van bigint;
BEGIN
  SELECT id INTO _id_comp_Beethoven_Ludwig_van FROM compositores WHERE apellido = 'Beethoven' AND (nombre = 'Ludwig van' OR (nombre IS NULL AND 'Ludwig van' IS NULL)) LIMIT 1;
  IF _id_comp_Beethoven_Ludwig_van IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Beethoven', 'Ludwig van') RETURNING id INTO _id_comp_Beethoven_Ludwig_van;
  END IF;

  -- <p>Obertura Las Criaturas de Prometeo, Op. 43</p>
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = '<p>Obertura Las Criaturas de Prometeo, Op. 43</p>'
      AND o.observaciones = 'Para acomodar — Beethoven, L. - Obertura. Las Criaturas de Prometeo, Op. 43'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      '<p>Obertura Las Criaturas de Prometeo, Op. 43</p>',
      NULL,
      1801,
      NULL,
      'Oficial',
      'Para acomodar — Beethoven, L. - Obertura. Las Criaturas de Prometeo, Op. 43',
      '2.2.2.2 - 2.2.0.0 - Timp - Str',
      'https://drive.google.com/drive/folders/1bQTBvmzcugtZ2YE8HM-LToKO0nLWnH85'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Beethoven_Ludwig_van, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 1', '[{"url":"https://drive.google.com/file/d/1BuHqstsZn_0f1SltN2HnjfTlr1C3zsYc/view?usp=drivesdk","description":"Clarinete Bb 1 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"},{"url":"https://drive.google.com/file/d/1Ox4Lm7vG0afn1BfPM8lIhe9Y6IvxQh90/view?usp=drivesdk","description":"Clarinete C 1 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete 2', '[{"url":"https://drive.google.com/file/d/1izQoYymLOD2hAwXixA6b0Ri_xLLTInzN/view?usp=drivesdk","description":"Clarinete Bb 2 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"},{"url":"https://drive.google.com/file/d/1clBxqdogoN_8cWjA6Lj1rSXIwsiVyo6j/view?usp=drivesdk","description":"Clarinete C 2 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1xU4zWU4CcFQU9nsPvhbPmj4eQyyQLNs1/view?usp=drivesdk","description":"Contrabajo - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 1', '[{"url":"https://drive.google.com/file/d/186ca--a--PC1v6ycfoZ8ed2z7r0CDnUA/view?usp=drivesdk","description":"Corno C 1 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"},{"url":"https://drive.google.com/file/d/1feBQJxbtVQ6ZPMQNiyezUMuajraicXVD/view?usp=drivesdk","description":"Corno F 1 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno 2', '[{"url":"https://drive.google.com/file/d/1PCwJV-qZn9N6WzQoihK6-LgTRbRNe-B2/view?usp=drivesdk","description":"Corno C 2 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"},{"url":"https://drive.google.com/file/d/1GUYKDyro1zjWifrrcgS-7rR8jlHPywsp/view?usp=drivesdk","description":"Corno F 2 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1_j1advLWDGiUHgLbDAB5fGUVSUu3j2hH/view?usp=drivesdk","description":"Fagot 1 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1uY7MGbMCd_WeeUq9fK7eH852DMbRbctn/view?usp=drivesdk","description":"Fagot 2 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1SVK5cUn2UKqtA9bCRxUNoHqtDWpuLyz6/view?usp=drivesdk","description":"Flauta 1 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1awYo2oqZVJKUKadSdgs8EXCF0bAozwdA/view?usp=drivesdk","description":"Flauta 2 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1Clyi5-CFAcFjrn9bGVucDvFY4FcuhApE/view?usp=drivesdk","description":"Oboe 1 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1R503M1ROtlK8sZf5ofjeBwaFx5akOjjf/view?usp=drivesdk","description":"Oboe 2 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13a', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1xT58stFuMzYpbW4YeMx-pt2MmxDJ9ByF/view?usp=drivesdk","description":"Perc Timbal - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/16fzq_lrMs-Qxvx_OLKo1c1tMUN_n63pm/view?usp=drivesdk","description":"SCORE - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 1', '[{"url":"https://drive.google.com/file/d/1x7jyJpC13KGYfduDauCXxrShLcRG9Qr9/view?usp=drivesdk","description":"Trompeta Bb 1 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"},{"url":"https://drive.google.com/file/d/1IpaRiagwVneDn6-Jg-ubW6xsLXtRVxK8/view?usp=drivesdk","description":"Trompeta C 1 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1u0sBSxeaPNv_U5j1_AUx3ZTChkNKd8gY/view?usp=drivesdk","description":"Trompeta Bb 2 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"},{"url":"https://drive.google.com/file/d/14O7WxYHCZwEOhw60UlwkJpig_xbHfUMz/view?usp=drivesdk","description":"Trompeta C 2 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1zNhk2HBy8gRMrjD_pApDqn-Jj0QQNRPt/view?usp=drivesdk","description":"Viola - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1mVYaiddtJpqlTndJlRVdi_kFUepPdL45/view?usp=drivesdk","description":"Violín 1 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1U5EPIBmLhLrJTTIH0gPfMtLaR4tyV882/view?usp=drivesdk","description":"Violín 2 - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1so2azO-DKGTnIcphwcOYAv-8N2lUPnIo/view?usp=drivesdk","description":"Violoncello - op.43. Obertura. Las Criaturas de Prometeo - Beethoven, L.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): <p>Obertura Las Criaturas de Prometeo, Op. 43</p>';
  END IF;

END $$;
