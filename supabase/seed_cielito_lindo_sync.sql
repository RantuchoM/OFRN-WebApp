-- Cielito Lindo ('Orquesta y Voz') — Mendoza y Cortés-Payán (Para acomodar)
-- Generado: 2026-08-17

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Mendoza_y_Cort_s_Quirino bigint;
  _id_arr_Pay_n_Oliverio bigint;
BEGIN
  SELECT id INTO _id_comp_Mendoza_y_Cort_s_Quirino FROM compositores WHERE apellido = 'Mendoza y Cortés' AND (nombre = 'Quirino' OR (nombre IS NULL AND 'Quirino' IS NULL)) LIMIT 1;
  IF _id_comp_Mendoza_y_Cort_s_Quirino IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Mendoza y Cortés', 'Quirino') RETURNING id INTO _id_comp_Mendoza_y_Cort_s_Quirino;
  END IF;

  SELECT id INTO _id_arr_Pay_n_Oliverio FROM compositores WHERE apellido = 'Payán' AND (nombre = 'Oliverio' OR (nombre IS NULL AND 'Oliverio' IS NULL)) LIMIT 1;
  IF _id_arr_Pay_n_Oliverio IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Payán', 'Oliverio') RETURNING id INTO _id_arr_Pay_n_Oliverio;
  END IF;

  -- Cielito Lindo ('Orquesta y Voz')
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        JOIN obras_compositores oc ON oc.id_obra = o.id AND oc.rol = 'arreglador'
    WHERE o.titulo = 'Cielito Lindo (''Orquesta y Voz'')' AND oc.id_compositor = _id_arr_Pay_n_Oliverio
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Cielito Lindo (''Orquesta y Voz'')',
      _id_arr_Pay_n_Oliverio,
      1882,
      280,
      'Oficial',
      'Para acomodar — Mendoza y Cortés-Payán - Cielito Lindo (''Orquesta y Voz''). Arr. Oliverio Payán. Voz tenor solista.',
      'voz - 1.1.1.1 - 1.1.0.0 - Timp.+3 - Hp - Str',
      'https://drive.google.com/open?id=1a0uX_4JhNVCMUkwCE8W7ypgMtogHmY1f'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Mendoza_y_Cort_s_Quirino, 'compositor');
    INSERT INTO obras_compositores (id_obra, id_compositor, rol)
    SELECT _id_obra, _id_arr_Pay_n_Oliverio, 'arreglador'
    WHERE NOT EXISTS (
      SELECT 1 FROM obras_compositores oc
      WHERE oc.id_obra = _id_obra AND oc.id_compositor = _id_arr_Pay_n_Oliverio
    );

    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1gnxgn_KEyFFM_9nJ2rpE_xfgN0YR1gyA/view?usp=drivesdk","description":"Arpa - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1AdzdZZzrU-Nn8Y4C0__mDpH34p_jHrne/view?usp=drivesdk","description":"Clarinete Bb - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1HItRpA41aB3kHHCsnsQosElaxbWlki7t/view?usp=drivesdk","description":"Contrabajo - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/19zFOkGCbVG6puSTy9-YayE-qiPDUu5uP/view?usp=drivesdk","description":"Corno F - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1ulDN3RAEtylk7LXH5A3OZrd5fU2c2uEu/view?usp=drivesdk","description":"Fagot - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1FKR5ua4U9rOKXrSEOybbtP_N50jK_oLn/view?usp=drivesdk","description":"Flauta - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1Fv20UBzXFLFBePNcThmX5aStzSjMoNpf/view?usp=drivesdk","description":"Oboe - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1P2IPJXYNPigeVqd16VAMqfkQb26YGyN3/view?usp=drivesdk","description":"Perc Percusión - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/18gM4oNltoKjgLOLRvSO0nF78CVJnej-Y/view?usp=drivesdk","description":"Perc Tambor - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/12bp2PLmg9uw4d56XNK2uatOgtczEC-m4/view?usp=drivesdk","description":"Perc Timbal - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1mZnW75uqGuxyoh73fEvm6I8v8A98HGYd/view?usp=drivesdk","description":"Perc Triángulo - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1sRJ6j_EnMVeIjipERQ825x_41cBWqvnA/view?usp=drivesdk","description":"SCORE - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1F0uOMECVOOOEoAk-skL3vvAS9IjZv8We/view?usp=drivesdk","description":"Trompeta - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1vZi1cvsJSssksq6sE0L0uUVuvijGCWId/view?usp=drivesdk","description":"Viola - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1_HQiwwdZCfolndCcRB1ObpCO1ZBepvTO/view?usp=drivesdk","description":"Violín 1 - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1UcOUlUdOCoEzkj2C1aT7VqwgdR7E_eSn/view?usp=drivesdk","description":"Violín 2 - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1qxY7mG8muNW5eOKutz4m7ae7HhstTCs8/view?usp=drivesdk","description":"Violoncello - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '20a', 'Voz', '[{"url":"https://drive.google.com/file/d/1QA1FTCVqU8iurbpNaISMlW-Rm17jscZa/view?usp=drivesdk","description":"Voz - Cielito Lindo (''Orquesta y Voz'') - Mendoza y Cortés-Payán.pdf"}]', true);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Cielito Lindo (''Orquesta y Voz'')';
  END IF;

END $$;
