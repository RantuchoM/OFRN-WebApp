-- Gira 305 «Con el coro UNRN» — arreglos Garcia (cuerdas)
-- UPDATE in-place obras 3886, 3887, 3888, 3889.
-- No crea obras nuevas. No toca repertorio_obras.
-- Generado: 2026-11-11

DO $$
DECLARE
  _id_arr_Garcia_Anibal bigint;
BEGIN
  SELECT id INTO _id_arr_Garcia_Anibal
  FROM compositores
  WHERE apellido = 'Garcia'
    AND nombre = 'Anibal'
  LIMIT 1;
  IF _id_arr_Garcia_Anibal IS NULL THEN
    RAISE EXCEPTION 'No se encontró arreglador Garcia, Anibal';
  END IF;
END $$;

-- Tu Nombre y el Mio → obra 3886 (6 partes | Str)
UPDATE obras
SET estado = 'Oficial',
    id_arreglador = (SELECT id FROM compositores WHERE apellido = 'Garcia' AND nombre = 'Anibal' LIMIT 1),
    link_drive = 'https://drive.google.com/open?id=1enRX6JyN6R884RNFShwWiddqSsNtVNRS',
    observaciones = 'Para acomodar — Aristimuño-Garcia - Tu Nombre y el Mio. Arreglo cuerdas Aníbal Garcia (gira 305).',
    instrumentacion = 'Str'
WHERE id = 3886;

DELETE FROM obras_particellas WHERE id_obra = 3886;

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3886, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1ew5ssQlA7MJ0Wn3pZad1JdTQvUcOLXRI/view?usp=drivesdk","description":"Contrabajo - Tu Nombre y el Mio - Aristimuño-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3886, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1vYTr5kdR4DUKGZzK-FzAAuc3JbPpOf2P/view?usp=drivesdk","description":"SCORE - Tu Nombre y el Mio - Aristimuño-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3886, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1zK-Wfiu9lJDl2_Iep2DLj6VfsR34Bp9_/view?usp=drivesdk","description":"Viola - Tu Nombre y el Mio - Aristimuño-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3886, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1gSemluhl4zoM6WLr13TahSdVbat1qDJ5/view?usp=drivesdk","description":"Violín 1 - Tu Nombre y el Mio - Aristimuño-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3886, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1Nne-v_PfFY4hRjjYEUY6MvUJqJF6b_Aw/view?usp=drivesdk","description":"Violín 2 - Tu Nombre y el Mio - Aristimuño-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3886, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1a2nFjtKZvyMt83mxArBuLmfqX37bIOXN/view?usp=drivesdk","description":"Violoncello - Tu Nombre y el Mio - Aristimuño-Garcia.pdf"}]', false);

-- Mariposa Technicolor → obra 3887 (6 partes | Str)
UPDATE obras
SET estado = 'Oficial',
    id_arreglador = (SELECT id FROM compositores WHERE apellido = 'Garcia' AND nombre = 'Anibal' LIMIT 1),
    link_drive = 'https://drive.google.com/open?id=1ljR-adf_oRttAjOfdeMGYLlgwP3KBGWX',
    observaciones = 'Para acomodar — Páez-Garcia - Mariposa Technicolor. Arreglo cuerdas Aníbal Garcia (gira 305).',
    instrumentacion = 'Str'
WHERE id = 3887;

DELETE FROM obras_particellas WHERE id_obra = 3887;

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3887, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/11M_JhkTCyTsakqfGLCEgCvq9GgmRhaE5/view?usp=drivesdk","description":"Contrabajo - Mariposa Technicolor - Páez-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3887, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1dtUCXSsBMQ85_daztIcTywT7Xk3FslNZ/view?usp=drivesdk","description":"SCORE - Mariposa Technicolor - Páez-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3887, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/173CFIkPNGfVNvsI7dLIBYqTMbUKIvIYr/view?usp=drivesdk","description":"Viola - Mariposa Technicolor - Páez-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3887, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1lKij7escPJJdF3jFP3I0V5t9pe9gBSSK/view?usp=drivesdk","description":"Violín 1 - Mariposa Technicolor - Páez-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3887, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1D7LqZlau4R06aTIQDqwy3_WatRmyTHgt/view?usp=drivesdk","description":"Violín 2 - Mariposa Technicolor - Páez-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3887, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1onmYLgrcYzZ_oK66IeBxV8xuGdEPt9vd/view?usp=drivesdk","description":"Violoncello - Mariposa Technicolor - Páez-Garcia.pdf"}]', false);

-- Libros Sapiensales → obra 3888 (6 partes | Str)
UPDATE obras
SET estado = 'Oficial',
    id_arreglador = (SELECT id FROM compositores WHERE apellido = 'Garcia' AND nombre = 'Anibal' LIMIT 1),
    link_drive = 'https://drive.google.com/open?id=1ntN3NsjbJrbrzpFi6q6FMpCsPxy0ObTd',
    observaciones = 'Para acomodar — Dei-Garcia - Libros Sapiensales. Arreglo cuerdas Aníbal Garcia (gira 305).',
    instrumentacion = 'Str'
WHERE id = 3888;

DELETE FROM obras_particellas WHERE id_obra = 3888;

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3888, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1Pq2i9cJQD2UoZxFzu0tv70thZPhOoK6g/view?usp=drivesdk","description":"Contrabajo - Libros Sapiensales - Dei-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3888, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/13U-YYY6przwJmQLccxBLoSSyjTyobL_h/view?usp=drivesdk","description":"SCORE - Libros Sapiensales - Dei-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3888, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1Hkp7OLdIRrid64El1ifArJRcEuSOHbU-/view?usp=drivesdk","description":"Viola - Libros Sapiensales - Dei-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3888, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1ftUEGsThCgS-cXieyZNXNCH6XK2gUIjo/view?usp=drivesdk","description":"Violín 1 - Libros Sapiensales - Dei-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3888, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1KjeYhAROGtpBopMQ0fU10EG-VwuvzJ7B/view?usp=drivesdk","description":"Violín 2 - Libros Sapiensales - Dei-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3888, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1peEr8IzKIkTUJulwhnjkC-TP2JdbFuEp/view?usp=drivesdk","description":"Violoncello - Libros Sapiensales - Dei-Garcia.pdf"}]', false);

-- Desarma y Sangra → obra 3889 (6 partes | Str)
UPDATE obras
SET estado = 'Oficial',
    id_arreglador = (SELECT id FROM compositores WHERE apellido = 'Garcia' AND nombre = 'Anibal' LIMIT 1),
    link_drive = 'https://drive.google.com/open?id=16VcTd9ZaXVu5zEecGvcTuV-x_OmMib2Z',
    observaciones = 'Para acomodar — Giran-Garcia - Desarma y Sangra. Arreglo cuerdas Aníbal Garcia (gira 305).',
    instrumentacion = 'Str'
WHERE id = 3889;

DELETE FROM obras_particellas WHERE id_obra = 3889;

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3889, '04', 'Contrabajo', '[{"url":"https://drive.google.com/file/d/1rYKcyz8zdOWUKtYRW20OuVbYiGCIjMI0/view?usp=drivesdk","description":"Contrabajo - Desarma y Sangra - Giran-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3889, '50', 'SCORE', '[{"url":"https://drive.google.com/file/d/1dRELhG92kVxqPLKGE9sxtaVRpgRVsqOM/view?usp=drivesdk","description":"SCORE - Desarma y Sangra - Giran-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3889, '02', 'Viola', '[{"url":"https://drive.google.com/file/d/1KdgW83lLQZz8GOJTPbCmYBXUrJbL4CHo/view?usp=drivesdk","description":"Viola - Desarma y Sangra - Giran-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3889, '01', 'Violín 1', '[{"url":"https://drive.google.com/file/d/1qkkUDwdjGaPGU3brYKct6h033BRQVX0C/view?usp=drivesdk","description":"Violín 1 - Desarma y Sangra - Giran-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3889, '01', 'Violín 2', '[{"url":"https://drive.google.com/file/d/1D4UAvhD0iPRsJBbppPcsDuRuqi6gWyw0/view?usp=drivesdk","description":"Violín 2 - Desarma y Sangra - Giran-Garcia.pdf"}]', false);
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (3889, '03', 'Violoncello', '[{"url":"https://drive.google.com/file/d/1VUXuMOPZvCkeGSjnHSpNF4D61Rv8a11C/view?usp=drivesdk","description":"Violoncello - Desarma y Sangra - Giran-Garcia.pdf"}]', false);

-- Trigger obras_particellas_sync_instrumentacion puede recalcular instrumentacion.
