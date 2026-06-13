-- Para acomodar → Archivo: 7 obras
-- Generado: 2026-06-13

DO $$
DECLARE
  _id_obra bigint;
  _id_comp_Rey_Venus bigint;
  _id_comp_Medoza_y_Cort_s_Quint_n bigint;
  _id_comp_Verdi_Giuseppe bigint;
  _id_comp_Gounod_Charles bigint;
  _id_comp_Puccini_Giacomo bigint;
BEGIN
  SELECT id INTO _id_comp_Rey_Venus FROM compositores WHERE apellido = 'Rey' AND (nombre = 'Venus' OR (nombre IS NULL AND 'Venus' IS NULL)) LIMIT 1;
  IF _id_comp_Rey_Venus IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Rey', 'Venus') RETURNING id INTO _id_comp_Rey_Venus;
  END IF;

  SELECT id INTO _id_comp_Medoza_y_Cort_s_Quint_n FROM compositores WHERE apellido = 'Medoza y Cortés' AND (nombre = 'Quintín' OR (nombre IS NULL AND 'Quintín' IS NULL)) LIMIT 1;
  IF _id_comp_Medoza_y_Cort_s_Quint_n IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Medoza y Cortés', 'Quintín') RETURNING id INTO _id_comp_Medoza_y_Cort_s_Quint_n;
  END IF;

  SELECT id INTO _id_comp_Verdi_Giuseppe FROM compositores WHERE apellido = 'Verdi' AND (nombre = 'Giuseppe' OR (nombre IS NULL AND 'Giuseppe' IS NULL)) LIMIT 1;
  IF _id_comp_Verdi_Giuseppe IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Verdi', 'Giuseppe') RETURNING id INTO _id_comp_Verdi_Giuseppe;
  END IF;

  SELECT id INTO _id_comp_Gounod_Charles FROM compositores WHERE apellido = 'Gounod' AND (nombre = 'Charles' OR (nombre IS NULL AND 'Charles' IS NULL)) LIMIT 1;
  IF _id_comp_Gounod_Charles IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Gounod', 'Charles') RETURNING id INTO _id_comp_Gounod_Charles;
  END IF;

  SELECT id INTO _id_comp_Puccini_Giacomo FROM compositores WHERE apellido = 'Puccini' AND (nombre = 'Giacomo' OR (nombre IS NULL AND 'Giacomo' IS NULL)) LIMIT 1;
  IF _id_comp_Puccini_Giacomo IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('Puccini', 'Giacomo') RETURNING id INTO _id_comp_Puccini_Giacomo;
  END IF;

  -- A portrait of Frida Kahlo
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'A portrait of Frida Kahlo'
      AND o.observaciones = 'Para acomodar — Rey Jr., V. - A portrait of Frida Kahlo'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'A portrait of Frida Kahlo',
      NULL,
      2019,
      196,
      'Oficial',
      'Para acomodar — Rey Jr., V. - A portrait of Frida Kahlo',
      '1.1.1.1 - 1.1.1.1 - Timp.+6 - Str',
      'https://drive.google.com/drive/folders/1uf2qAGjKK6d4cts1i8Q3WbqJknSF69Js'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Rey_Venus, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/12ZfhHZHlOfOHAjWL_iyVd74T0TITDH6I/view?usp=drivesdk","description":"Clarinete Bb - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/12iy_ECiwsXKHoldNlI-sQx3mp2TFqYzc/view?usp=drivesdk","description":"Contrabajo - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/11FxfGk_VCdrgBqO2X9M66lIITfbM8LOv/view?usp=drivesdk","description":"Corno F - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/11tUGXleYyO3h76wgr0I6HBflS687ZmVR/view?usp=drivesdk","description":"Fagot - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/11TMR9tk6AlQJyK_gsk9ZpmKP6GfmGdHh/view?usp=drivesdk","description":"Flauta - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/13E4_-Bk2pLuP6tkHj9_Zgjr00JexNZs5/view?usp=drivesdk","description":"Oboe - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/11JHqqNkZjM3noKNQnG-p3PkHg9kcDg3c/view?usp=drivesdk","description":"Perc Bombo - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Campanas', '[{"url":"https://drive.google.com/file/d/11em8Gmht6N5zlAgJZJRYR7-qrllRzpXr/view?usp=drivesdk","description":"Perc Campanas - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Gong', '[{"url":"https://drive.google.com/file/d/11L4Nv5tA7buMse2EFjXG-e084eOnlwXI/view?usp=drivesdk","description":"Perc Gong - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Marimba', '[{"url":"https://drive.google.com/file/d/113r9ktQju8UHk0hbCqq_eWV6Y3tQVNnH/view?usp=drivesdk","description":"Perc Marimba - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/11rd2Lx7m0ZgP3ER5msd_OVSML3s0MECD/view?usp=drivesdk","description":"Perc Percusión - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Tambor', '[{"url":"https://drive.google.com/file/d/12SHIrudFpJw82uAtz4TvEtxeElK8v0uc/view?usp=drivesdk","description":"Perc Tambor - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/11Wh_nx8yNz7LvvFa7dlTv2QAjaT6CZjp/view?usp=drivesdk","description":"Perc Timbal - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/14RySetE6RiRa8zod5gOCw3rk48S7kC10/view?usp=drivesdk","description":"SCORE - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1188nL22JnrnoBcsghg4IQzSqY5m50mFq/view?usp=drivesdk","description":"Trombón - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/12F_XO_DPeGnqLxiFAld6kGMbHOXMMI4g/view?usp=drivesdk","description":"Trompeta - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/12PFPwbI-aMejgt_eob1dD3oN6cGDqH_Z/view?usp=drivesdk","description":"Tuba - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/11rBKnZluDzCnvLxLd_8lL0g-XNQ4HUYW/view?usp=drivesdk","description":"Viola - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1215u-alIpMylMK6opP6D_6BqWp6Ns4uE/view?usp=drivesdk","description":"Violín 1 - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/12jS5-Wv9WK5iRO7T8s9MM5_XK5mM_zRq/view?usp=drivesdk","description":"Violín 2 - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/11BGnB3CUSS4adg7Yvg4XMp5F4HxgVkdc/view?usp=drivesdk","description":"Violoncello - S-N. A portrait of Frida Kahlo - Rey Jr., V.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): A portrait of Frida Kahlo';
  END IF;

  -- Cielito Lindo
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Cielito Lindo'
      AND o.observaciones = 'Para acomodar — Medoza y Cortés, Q. - Cielito Lindo'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Cielito Lindo',
      NULL,
      NULL,
      NULL,
      'Oficial',
      'Para acomodar — Medoza y Cortés, Q. - Cielito Lindo',
      '2.2.2.1 - 2.2.2.1 - Timp.+2 - Str',
      'https://drive.google.com/drive/folders/1tQJypuhjLfgYiZ0uDBo12SV4d03T8YM-'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Medoza_y_Cort_s_Quint_n, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1PlWhLaib60k0lg2rsoApThtFp4_7ilKH/view?usp=drivesdk","description":"Clarinete Bb - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1gegf5K9Z1sncV5i7aerccPkmXVQWFSjT/view?usp=drivesdk","description":"Clarinete Bb 1 - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1jRCyvn5fzLqDYC53cajYmXqWEs5lCqDb/view?usp=drivesdk","description":"Contrabajo - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1xqXbIkIZGscFwbboo0KsQ0skGVcRfN_c/view?usp=drivesdk","description":"Corno F - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1geldaWvrXD10U0jJibKnrPgLP65ehHDT/view?usp=drivesdk","description":"Corno F 2 - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1KgajhXv0MN3pwSnkUXXUyZCmPfY8AzEt/view?usp=drivesdk","description":"Fagot - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1Fm-ztWWOUuyiL8RiCnEAaC-v3e90mp6U/view?usp=drivesdk","description":"Flauta - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1TD-RCeaFvKPTo4AKHN6HCjYKb5fjeWpG/view?usp=drivesdk","description":"Flauta 2 - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1p0q9fnsdWUKEgSSJQzITPiuTs8gAqKGH/view?usp=drivesdk","description":"Oboe 1 - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1FMdr1dfjeIVfJuEQ_oPb_0nOVTB9Zt4E/view?usp=drivesdk","description":"Oboe 2 - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión', '[{"url":"https://drive.google.com/file/d/1lhz7vo68pX2zpDzu8mZmr2qahrjRCDAZ/view?usp=drivesdk","description":"Perc Percusión - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Percusión 2', '[{"url":"https://drive.google.com/file/d/1BD3Q_RGYO-2gLab0C8hhLlukXWG-FlQQ/view?usp=drivesdk","description":"Perc Percusión 2 - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1hxe422ZI1ZSar49PYU_v0fgPraR9OUby/view?usp=drivesdk","description":"Perc Timbal - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1-BhdJEyIB5DQMumeMRF_mioHnbxJt74O/view?usp=drivesdk","description":"SCORE - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1rKzJzFdV78xwChcSvnhWESRJdHjGdhyY/view?usp=drivesdk","description":"Trombón - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1hK756hXXR0bCk49ygK-B81Va7E7AcLY4/view?usp=drivesdk","description":"Trombón 2 - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1ophnqnW2mE-3ylcW_y-pDDnOYzXEhTwU/view?usp=drivesdk","description":"Trompeta - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1Ji-II1qjmY0jRDQHWbvvVgHK-Ikp1dMv/view?usp=drivesdk","description":"Trompeta 2 - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1wedSkcWgxMjOcgtKWXNiCFBV605ZtTI_/view?usp=drivesdk","description":"Tuba - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1ZHXKpsh_bfhbM6acwYSIOS94ExqDB5r_/view?usp=drivesdk","description":"Viola - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1UHQ2r5y3dl5wZeg0JB3TSYredNraf52Q/view?usp=drivesdk","description":"Violín 1 - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1p2B9SpweZ898oQekelcijKDmBIgWBFqU/view?usp=drivesdk","description":"Violín 2 - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1iOKx6Oo09U0OqXVnnx4ZnSy3U9-eqp8v/view?usp=drivesdk","description":"Violoncello - S-N. Cielito Lindo - Medoza y Cortés, Q.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Cielito Lindo';
  END IF;

  -- Il Trovatore, Coro de gitanos
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Il Trovatore, Coro de gitanos'
      AND o.observaciones = 'Para acomodar — Verdi, G. - Il Trovatore, Coro de gitanos'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Il Trovatore, Coro de gitanos',
      NULL,
      1853,
      199,
      'Oficial',
      'Para acomodar — Verdi, G. - Il Trovatore, Coro de gitanos',
      '2.2.2.2 - 4.2.3.1 - Timp.+2 - Str',
      'https://drive.google.com/drive/folders/1iKa4QiNnw_4G1kVswTYM7vndmXmt2T47'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Verdi_Giuseppe, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/1QF3BBiumI5dSfTEw51OSMxEyqOFjCZU2/view?usp=drivesdk","description":"Clarinete Bb - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1QCvnIKWr8jZdLiND-1cp8XPA9R4QHEFL/view?usp=drivesdk","description":"Clarinete Bb 2 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Qaz1bp7eP87jCg2i3vBzxngTogEIZute/view?usp=drivesdk","description":"Contrabajo - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1QXDG2EG76tb_Eysk3FSegIovSbdiMGHH/view?usp=drivesdk","description":"Corno F - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1QpRSj1GsVaPqHYGfIQZlhVSDxKuVxPQV/view?usp=drivesdk","description":"Corno F 2 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1QUqcYxu6DconI1W7hdW4i0Bj3l2U-ZkK/view?usp=drivesdk","description":"Corno F 3 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1R-FlBEo0oGgR6j8Wd2N8yTFbDOZLP2zW/view?usp=drivesdk","description":"Corno F 4 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1Qdurjl_9zoumdV6SzcwTYXGoRyTmDkiq/view?usp=drivesdk","description":"Fagot - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1Qlkvbhq0IfM2sx4kqfhC1embPWqcWN5_/view?usp=drivesdk","description":"Fagot 2 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1R9zqDLBrHqvn7ooZiqmYddfmYW8yrkHd/view?usp=drivesdk","description":"Fl Piccolo - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1R2mjMJhm_tNMDwGQRT756DupU5JtJk_O/view?usp=drivesdk","description":"Flauta - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1R8OHhUFLpQMXt8L1haDYN3Ke1TPbLGNk/view?usp=drivesdk","description":"Oboe 1 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1R3eOmM5iYq3Lc6gwkXtGoogSfSkPWtuJ/view?usp=drivesdk","description":"Oboe 2 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/1QOSziZ18Iri__M2pF_sj-uIuBIzxphg0/view?usp=drivesdk","description":"Perc Bombo - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1RANlo_4oCE5-FLjWDfi9PZiMBErMb8xu/view?usp=drivesdk","description":"Perc Timbal - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1RCidmCWOJRE23yrKKi0FXcEgHO_KlieO/view?usp=drivesdk","description":"Perc Triángulo - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/1RDSMz0gJw41eBnsa61hlrHn-bocfGdHa/view?usp=drivesdk","description":"Trombón - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1RSED8bGH_NaahwWaXSj1_rQjE3JXAZjg/view?usp=drivesdk","description":"Trombón 2 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1RFoS4LPAa3fmwLdXSsZrw_rMhZZsxiHz/view?usp=drivesdk","description":"Trombón 3 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1RtpNx6ZQ4IQ7HQvPLa1ilgX83nEVpc1S/view?usp=drivesdk","description":"Trompeta - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/1RYbvr-Tu4wb7mGqAFfhd8yOpW6wMYhwj/view?usp=drivesdk","description":"Trompeta 2 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/1SZm424h-TFXaNEbq0W2PZMM7_P2DdSRW/view?usp=drivesdk","description":"Tuba - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Rxi7qTBxnn0RhPi--XUvrNAuni645cck/view?usp=drivesdk","description":"Viola - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1SIJptWpEiuigSG9rff2fVhvOS6bLw8HR/view?usp=drivesdk","description":"Violín 1 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Sb7mFSdIHUya7MALy7ewdNAJTiVUQBT7/view?usp=drivesdk","description":"Violín 2 - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1Sg5ZG9jU8J0bdvDQJQDWRRflno90Slc9/view?usp=drivesdk","description":"Violoncello - S-N. Il Trovatore, Coro de gitanos - Verdi, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Il Trovatore, Coro de gitanos';
  END IF;

  -- Je veux vivre ('Roméo et Juliette')
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Je veux vivre (''Roméo et Juliette'')'
      AND o.observaciones = 'Para acomodar — Gounod, C. - Je veux vivre (''Roméo et Juliette'')'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Je veux vivre (''Roméo et Juliette'')',
      NULL,
      1867,
      274,
      'Oficial',
      'Para acomodar — Gounod, C. - Je veux vivre (''Roméo et Juliette'')',
      '3.2.2.2 - 4.2.3.0 - Timp.+1 - Hp - Str',
      'https://drive.google.com/drive/folders/1SObCovl0erN5DVrwt_oIwJd8o3kKUQup'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Gounod_Charles, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1aaVieVgecKBjzJgFFg86qzFhiGDLmBw8/view?usp=drivesdk","description":"Arpa - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1bid4pJK3jRB0ZZ8Az8dX6K688NSnfSPR/view?usp=drivesdk","description":"Clarinete Bb 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/1bdqvCMFJc8vVnsLOIeK9lNpQLrKG2euD/view?usp=drivesdk","description":"Clarinete Bb 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1bb9LxqzcOcbfwrGhgdSlzPtEU6TFS1bj/view?usp=drivesdk","description":"Contrabajo - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno C 1', '[{"url":"https://drive.google.com/file/d/1bZaZXb2mXiC1m2razh83TEeaZ6QyqBXt/view?usp=drivesdk","description":"Corno C 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno C 2', '[{"url":"https://drive.google.com/file/d/1bPzZjjsCDS_iXLVMT4cU7piwlEG5REHL/view?usp=drivesdk","description":"Corno C 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno D 1', '[{"url":"https://drive.google.com/file/d/1bMRR6y05w6HpZD5NBRUOac7rupvHtpmx/view?usp=drivesdk","description":"Corno D 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno D 2', '[{"url":"https://drive.google.com/file/d/1bFeRabfaWjA82EqNM2l_rNINr3jtyZIN/view?usp=drivesdk","description":"Corno D 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 1', '[{"url":"https://drive.google.com/file/d/1b7gPCijo3PLzffH9XzCBL_zUK4XcEZ1S/view?usp=drivesdk","description":"Fagot 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1b3EtV6-Gmx2lFVRnET42gkhWVBYn4rk3/view?usp=drivesdk","description":"Fagot 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/1azEVpjBRZ8Pdmq0m8fwcbH6E9Q20lZpc/view?usp=drivesdk","description":"Fl Piccolo - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 1', '[{"url":"https://drive.google.com/file/d/1av8DHaP_4IJOaQs-MYNTAFwkw4HkROll/view?usp=drivesdk","description":"Flauta 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1au_I7kqolZIL80uqeH26hTTOmbWZqvvU/view?usp=drivesdk","description":"Flauta 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1arYj4qovYLhOKOiU5oseLMdvcL1P9io2/view?usp=drivesdk","description":"Oboe 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1arDbA_ny0YKmqAjKU2MlCh-uKLEbY0rh/view?usp=drivesdk","description":"Oboe 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbales', '[{"url":"https://drive.google.com/file/d/1afocwsB34n3fuEnrwIUf9BXovp9v9JDr/view?usp=drivesdk","description":"Perc Timbales - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Triángulo', '[{"url":"https://drive.google.com/file/d/1cW6ULyPJenjnHsBT_pWK6JMSJjeGmeGL/view?usp=drivesdk","description":"Perc Triángulo - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1cPCW5mtwiVfQAqlGumylP2_AJxAD-U9T/view?usp=drivesdk","description":"SCORE - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 1', '[{"url":"https://drive.google.com/file/d/1cMD7eOh3jwrEELP7FUfQLNbSPpSfkapJ/view?usp=drivesdk","description":"Trombón 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/1cJ7Q3CYZnwmqTUMSyJR3pMGAvSag0a0O/view?usp=drivesdk","description":"Trombón 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/1cGLUFjd10wKvuys19zBjMGvgUaEnGF5s/view?usp=drivesdk","description":"Trombón 3 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta D 1', '[{"url":"https://drive.google.com/file/d/1cDX1ikJEiDWxneWyqiUjdGIRwRIF2-T3/view?usp=drivesdk","description":"Trompeta D 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta D 2', '[{"url":"https://drive.google.com/file/d/1cDM_bKRK3LkXDEO7wjdieuN37oyD0_aR/view?usp=drivesdk","description":"Trompeta D 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1c8KSUb7aReVLNIKbvVZQsR4irekKcu2y/view?usp=drivesdk","description":"Viola - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1bsZgf7xf9ZVbU82yJNE2iV_WqPNbDOE6/view?usp=drivesdk","description":"Violín 1 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1brhIh7Xh4bt5iZViAM9yz8Z5PlLDD-Z_/view?usp=drivesdk","description":"Violín 2 - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1c4FBtwM_NC9R-bFr6eQ-oJV0-jIcQnzh/view?usp=drivesdk","description":"Violoncello - Je veux Vivre, ''Romeo y Julieta'' - Gounod, C.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Je veux vivre (''Roméo et Juliette'')';
  END IF;

  -- La forza del destino, Obertura
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'La forza del destino, Obertura'
      AND o.observaciones = 'Para acomodar — Verdi, G. - La forza del destino, Obertura'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'La forza del destino, Obertura',
      NULL,
      1862,
      426,
      'Oficial',
      'Para acomodar — Verdi, G. - La forza del destino, Obertura',
      '2.2.2.2 - 4.2.3.1 - Timp.+1 - 2Hp - Str',
      'https://drive.google.com/drive/folders/1320-8NjiLCLkLoMaSuZR4Su-XQC6R_US'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Verdi_Giuseppe, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/14PgCmC6H-00Fyr34BQaagdN2lScsYCAD/view?usp=drivesdk","description":"Arpa - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa 2', '[{"url":"https://drive.google.com/file/d/14M0ylpdJb6HevqI9EVNovjGf8-ui8XWn/view?usp=drivesdk","description":"Arpa 2 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb', '[{"url":"https://drive.google.com/file/d/14SOFkImTxoSEZSM4YeNKsrrlVss3uudG/view?usp=drivesdk","description":"Clarinete Bb - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 2', '[{"url":"https://drive.google.com/file/d/14R75X5lN91vZBoeE-QZTPjZI8qtq1lwN/view?usp=drivesdk","description":"Clarinete Bb 2 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/14XWfuIULDnnI4I1p-6ZfIM8KDLlx3Lua/view?usp=drivesdk","description":"Contrabajo - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/14cPhpOG7h2TAZa_he9T7rkS5A6G74u4K/view?usp=drivesdk","description":"Corno F - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/14a6qEglLV6gLZroI2jvinSkxgWoag1SO/view?usp=drivesdk","description":"Corno F 2 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/14dqt2qGUsZQuUT9GSobi7mDsW30GsaGa/view?usp=drivesdk","description":"Corno F 3 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/14dlrEYgjm5tUmtZ2arlghWWDIi_irxs9/view?usp=drivesdk","description":"Corno F 4 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/14qEXwKOgXMXscbcX6oTTjb07rKfoUB-B/view?usp=drivesdk","description":"Fagot - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/14mKWieVAWvIQWNKtRoo1Pz_JaUZSHNpl/view?usp=drivesdk","description":"Fagot 2 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Fl Piccolo', '[{"url":"https://drive.google.com/file/d/14th_wiebJvHkasRfi_LXmEDph745mq_X/view?usp=drivesdk","description":"Fl Piccolo - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/14ueI-J54xjGsZ5MqSrrfv73Qc9P4gx_P/view?usp=drivesdk","description":"Flauta - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/14s3dtZjgSHIeOrVWfZvkEcuJQit2p8Ps/view?usp=drivesdk","description":"Oboe 1 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/15CvYeV2ycBrZqimC8EZCKv9UCPHbJzJN/view?usp=drivesdk","description":"Oboe 2 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Bombo', '[{"url":"https://drive.google.com/file/d/14WVy-WnlOEcgMHmqBJwA6fcvYYzzNykY/view?usp=drivesdk","description":"Perc Bombo - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/157sHrnOt12g0zX-g4sbbB-C53PW23rx-/view?usp=drivesdk","description":"Perc Timbal - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón', '[{"url":"https://drive.google.com/file/d/14wLqniuphSyJCxhUs9N4aXinix_iwaFC/view?usp=drivesdk","description":"Trombón - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 2', '[{"url":"https://drive.google.com/file/d/15OIDnKEpvrH2oU07o5_PJeRi5CvC-Y7Z/view?usp=drivesdk","description":"Trombón 2 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '11', 'Trombón 3', '[{"url":"https://drive.google.com/file/d/15JkvMw1xK_maEVYd9gkxE3ayttBNuuLC/view?usp=drivesdk","description":"Trombón 3 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/15I2wmx7RcMXPTWlsZFSKz_8wJ0gywWSq/view?usp=drivesdk","description":"Trompeta - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta 2', '[{"url":"https://drive.google.com/file/d/15QbtclL56qNPZ-BCBIp88Vt0j8XrcTxL/view?usp=drivesdk","description":"Trompeta 2 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '12', 'Tuba', '[{"url":"https://drive.google.com/file/d/15cmD2sQLUMs9AO3yv_m13QKf1inhhCZA/view?usp=drivesdk","description":"Tuba - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/15qGHulSKAYh0WC_BVrRTFwBpzX2tJzAj/view?usp=drivesdk","description":"Viola - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/15rJShqNUHxV9Qp4Q-mq1VwzjG4YV_vL0/view?usp=drivesdk","description":"Violín 1 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1 (sust', '[{"url":"https://drive.google.com/file/d/15hSFDUt8Y46yEL-Bmc9dv-mq4KPJFIlz/view?usp=drivesdk","description":"Violín 1 (sust. Arpa) - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/15qgBwothVqz8LGz33c11F7ngUQih7hL-/view?usp=drivesdk","description":"Violín 2 - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/15vZaO1p6OvbPcRyLFwUlocLfciHsoDMO/view?usp=drivesdk","description":"Violoncello - S-N. La forza del destino, Obertura - Verdi, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): La forza del destino, Obertura';
  END IF;

  -- Quando m'en vo (Vals de Musetta, 'La Bohème')
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Quando m''en vo (Vals de Musetta, ''La Bohème'')'
      AND o.observaciones = 'Para acomodar — Puccini, G. - Quando m''en vo (Vals de Musetta, ''La Bohème'')'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Quando m''en vo (Vals de Musetta, ''La Bohème'')',
      NULL,
      1896,
      191,
      'Oficial',
      'Para acomodar — Puccini, G. - Quando m''en vo (Vals de Musetta, ''La Bohème'')',
      '2.3.3.2 - 4.0.0.0 - Timp - Hp - Str',
      'https://drive.google.com/drive/folders/1YzjjV51Dd7vZ-Lhyfs0MFFyXJ-s8VlY1'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Puccini_Giacomo, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '14', 'Arpa', '[{"url":"https://drive.google.com/file/d/1qVc8XHsH9I3cpeSWzh-MB76ETfNlRVAf/view?usp=drivesdk","description":"Arpa - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete A', '[{"url":"https://drive.google.com/file/d/1qVP-iJKBzykCzvMI3xDqIuYlRBJoR1hA/view?usp=drivesdk","description":"Clarinete A - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete A 2', '[{"url":"https://drive.google.com/file/d/1qTv6XTdJU3QCphDN-BaAO_PnCVOI1-bw/view?usp=drivesdk","description":"Clarinete A 2 - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bajo', '[{"url":"https://drive.google.com/file/d/1qS9QInVcbjBc8Y6YMohUmC0UfZW0G6Py/view?usp=drivesdk","description":"Clarinete Bajo - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1qPVzJQNs-dNa9EyhYuxhzniLCz9cGnf4/view?usp=drivesdk","description":"Contrabajo - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1qPIjrCYs3c6amE3qScncSzQx4LezFIGF/view?usp=drivesdk","description":"Corno F - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1qP61VYd3plv5ZM4l7MJIhcnLYYNEbR0g/view?usp=drivesdk","description":"Corno F 2 - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1qNG1W0gHqFZrrnTFIgsX6NbK7RfZidv_/view?usp=drivesdk","description":"Corno F 3 - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1qMWLHSiyPwvJHjs6vPiYqk-ufCyv3MTu/view?usp=drivesdk","description":"Corno F 4 - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1qK1tUvs3yGVwxcb5uqE4TPYHWtmHbkeW/view?usp=drivesdk","description":"Fagot - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot 2', '[{"url":"https://drive.google.com/file/d/1qJJDv7k7LlA_0LYMPe4ABg3DnMVupWwm/view?usp=drivesdk","description":"Fagot 2 - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1qH4FXNh193_HZQNUHegTPEbNFEF-5VI_/view?usp=drivesdk","description":"Flauta - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta 2', '[{"url":"https://drive.google.com/file/d/1q5t97T_5Y_ItwxbaSK_K570LC1LKOhw1/view?usp=drivesdk","description":"Flauta 2 - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe', '[{"url":"https://drive.google.com/file/d/1q3eBOJWx6MW5zYR2MLxCkYy9c4tc3dtt/view?usp=drivesdk","description":"Oboe - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1q1aMpiPMrEOj9h9xRLOhGDsTJy21Yj30/view?usp=drivesdk","description":"Oboe 1 - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 2', '[{"url":"https://drive.google.com/file/d/1q-I-B4mN3Rl7qD-6UyBYZZrRpxOMcW4D/view?usp=drivesdk","description":"Oboe 2 - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '13', 'Perc Timbal', '[{"url":"https://drive.google.com/file/d/1pr9pLOHIJ0T1hj52WqA77tDFvjHG0bEh/view?usp=drivesdk","description":"Perc Timbal - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1pp1nAG4EanmJZwR2b-EFDClsMmom2KWn/view?usp=drivesdk","description":"Viola - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1pkJSu7uEw47Qyn28F846eHjq1fpDGTWl/view?usp=drivesdk","description":"Violín 1 - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1piN52LjTpqSFlUlKzMmXBHGzQAuWg7dk/view?usp=drivesdk","description":"Violín 2 - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1poj3JazxWDuT7P8Z-H1M18RM0i9rUprb/view?usp=drivesdk","description":"Violoncello - S-N. Quando m''en vo (Vals de Musetta, ''La Bohème'') - Puccini, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Quando m''en vo (Vals de Musetta, ''La Bohème'')';
  END IF;

  -- Sí, vendetta ('Rigoletto')
  IF NOT EXISTS (
    SELECT 1 FROM obras o
        WHERE o.titulo = 'Sí, vendetta (''Rigoletto'')'
      AND o.observaciones = 'Para acomodar — Verdi, G. - Sí, vendetta (''Rigoletto'')'
  ) THEN
    INSERT INTO obras (titulo, id_arreglador, anio_composicion, duracion_segundos, estado, observaciones, instrumentacion, link_drive)
    VALUES (
      'Sí, vendetta (''Rigoletto'')',
      NULL,
      1851,
      392,
      'Oficial',
      'Para acomodar — Verdi, G. - Sí, vendetta (''Rigoletto'')',
      '1.1.1.1 - 4.1.0.0 - Str',
      'https://drive.google.com/drive/folders/1rW9Z4FeD2T-z6eTxvJSDh27fRS0scPQP'
    )
    RETURNING id INTO _id_obra;

    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _id_comp_Verdi_Giuseppe, 'compositor');
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '07', 'Clarinete Bb 1', '[{"url":"https://drive.google.com/file/d/1WKFDE31K2tbEAG02zL97ka5hYezHxYyn/view?usp=drivesdk","description":"Clarinete Bb 1 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1WB9Bzo5brulR87e_38bOwAIX2X_nQ2QB/view?usp=drivesdk","description":"Contrabajo - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F', '[{"url":"https://drive.google.com/file/d/1W7AKNwGhRzb6RZJsThYIOAL1KjmvIVZm/view?usp=drivesdk","description":"Corno F - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 2', '[{"url":"https://drive.google.com/file/d/1W0ApcmFeCacpSkJZzb0ZGIlU-3Ghbawe/view?usp=drivesdk","description":"Corno F 2 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 3', '[{"url":"https://drive.google.com/file/d/1VwNTio65n7P1rNsvTdSGSuAfXUJKwvQV/view?usp=drivesdk","description":"Corno F 3 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '09', 'Corno F 4', '[{"url":"https://drive.google.com/file/d/1Vv3MFH928c1viRJUxqWuZ3EAZIbO1-oU/view?usp=drivesdk","description":"Corno F 4 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '08', 'Fagot', '[{"url":"https://drive.google.com/file/d/1VuuNJKA3UI-YmyrgQOD1teQy6zPnHSd1/view?usp=drivesdk","description":"Fagot - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '05', 'Flauta', '[{"url":"https://drive.google.com/file/d/1Vs_qhUEQ35aab5dK80KLSZlsjqLKml88/view?usp=drivesdk","description":"Flauta - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '06', 'Oboe 1', '[{"url":"https://drive.google.com/file/d/1VoKadA2sS9dXSg_rVSzr11QV4jceDAo0/view?usp=drivesdk","description":"Oboe 1 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1Vh909OflNsvZpXgkrCY0SX0-f3s_Ak9R/view?usp=drivesdk","description":"SCORE - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '10', 'Trompeta', '[{"url":"https://drive.google.com/file/d/1V_Stjs6OwYpjKToSXmp067QO44AAdgyB/view?usp=drivesdk","description":"Trompeta - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1VZ91ec-lJpPpEI9CIyppukCs3kAevgHV/view?usp=drivesdk","description":"Viola - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1VW0yPGrLQvyaNnqYSGvXN00mZ1IeZw9e/view?usp=drivesdk","description":"Violín 1 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1VVUz_MuMDsxhztXTpl7dZ3XExXAs1Vzo/view?usp=drivesdk","description":"Violín 2 - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1VXbKFxnsfMF236iKBkvpAckvFkRTK7OQ/view?usp=drivesdk","description":"Violoncello - 04. Sí, vendetta (''Rigoletto'') - Verdi, G.pdf"}]', false);
  ELSE
    RAISE NOTICE 'Obra ya existente (omitida): Sí, vendetta (''Rigoletto'')';
  END IF;

END $$;
