-- Sillas vacías (sin PDF) para obras de Temporada 2027 que no tienen partes.
-- Sirven al seating y al conteo. No se inventa plantilla cuando no hay fuente.

-- Stravinsky, Danses concertantes (3912). Schott: 1.1.1.1 - 2.1.1.0 - Timp, cuerdas 6·0·4·3·2.
UPDATE obras SET
  titulo = '<p>Danses concertantes</p><div>&nbsp; I. Marche – Introduction</div><div>&nbsp; II. Pas d''action – Con moto</div><div>&nbsp; III. Thème varié – Lento</div><div>&nbsp; IV. Pas de deux</div><div>&nbsp; V. Marche – Conclusion</div>',
  anio_composicion = 1942,
  duracion_segundos = 1200,
  observaciones = 'Temporada 2027 P12 · Alquiler Schott. Derechos (Stravinsky †1971): no hay PDF en el archivo. Sillas vacías de la plantilla publicada: 1.1.1.1 - 2.1.1.0 - Timp y cuerdas 6·0·4·3·2 (6 violines, sin segundos).'
WHERE id = 3912
  AND NOT EXISTS (SELECT 1 FROM obras_particellas WHERE id_obra = 3912);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3912, v.id_instr, v.nombre, NULL, false
FROM (VALUES
  ('05', 'Flauta'),
  ('06', 'Oboe'),
  ('07', 'Clarinete'),
  ('08', 'Fagot'),
  ('09', 'Corno 1'),
  ('09', 'Corno 2'),
  ('10', 'Trompeta'),
  ('11', 'Trombón'),
  ('13a', 'Timbales'),
  ('01', 'Violín ·1'),
  ('01', 'Violín ·2'),
  ('01', 'Violín ·3'),
  ('01', 'Violín ·4'),
  ('01', 'Violín ·5'),
  ('01', 'Violín ·6'),
  ('02', 'Viola ·1'),
  ('02', 'Viola ·2'),
  ('02', 'Viola ·3'),
  ('02', 'Viola ·4'),
  ('03', 'Violoncello ·1'),
  ('03', 'Violoncello ·2'),
  ('03', 'Violoncello ·3'),
  ('04', 'Contrabajo ·1'),
  ('04', 'Contrabajo ·2')
) AS v(id_instr, nombre)
WHERE NOT EXISTS (SELECT 1 FROM obras_particellas WHERE id_obra = 3912 AND nombre_archivo = v.nombre);

-- Brotons, Sinfonietta da camera op. 38 (3892). 14 músicos, editorial.
UPDATE obras SET
  anio_composicion = 1985,
  duracion_segundos = 840,
  observaciones = 'Temporada 2027 P2 · Alquiler Brotons & Mercadal. Derechos: no hay PDF. Sillas vacías de la plantilla editada: 2 flautas (las dos doblan piccolo), 2 oboes, 2 clarinetes, 2 fagotes, 2 cornos, trompeta, trombón, tuba y 1 percusión (incluye timbal).'
WHERE id = 3892
  AND NOT EXISTS (SELECT 1 FROM obras_particellas WHERE id_obra = 3892);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista, nota_organico)
SELECT 3892, v.id_instr, v.nombre, NULL, false, v.nota
FROM (VALUES
  ('05', 'Flauta 1', 'Picc'),
  ('05', 'Flauta 2', 'Picc'),
  ('06', 'Oboe 1', NULL),
  ('06', 'Oboe 2', NULL),
  ('07', 'Clarinete 1', NULL),
  ('07', 'Clarinete 2', NULL),
  ('08', 'Fagot 1', NULL),
  ('08', 'Fagot 2', NULL),
  ('09', 'Corno 1', NULL),
  ('09', 'Corno 2', NULL),
  ('10', 'Trompeta', NULL),
  ('11', 'Trombón', NULL),
  ('12', 'Tuba', NULL),
  ('13', 'Percusión', NULL)
) AS v(id_instr, nombre, nota)
WHERE NOT EXISTS (SELECT 1 FROM obras_particellas WHERE id_obra = 3892 AND nombre_archivo = v.nombre);

UPDATE obras SET instrumentacion = '2(Picc).2.2.2 - 2.1.1.1 - Perc' WHERE id = 3892;

-- Mozart, Magnificat K.193 (3905). Plantilla NMA / Bärenreiter. Coro sin número de cantantes.
UPDATE obras SET
  observaciones = 'Temporada 2027 P17 · Sin PDF de partes (IMSLP no trae el set). Plantilla de la NMA (Bärenreiter): solistas SATB, coro SATB, 2 trompetas, 3 trombones, timbal, cuerdas sin viola, órgano. El coro no tiene un número de cantantes: una sola silla Coro. Cuerdas: una silla por parte, no por atril.'
WHERE id = 3905
  AND NOT EXISTS (SELECT 1 FROM obras_particellas WHERE id_obra = 3905);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3905, v.id_instr, v.nombre, NULL, v.solista
FROM (VALUES
  ('10', 'Trompeta 1', false),
  ('10', 'Trompeta 2', false),
  ('11', 'Trombón 1', false),
  ('11', 'Trombón 2', false),
  ('11', 'Trombón 3', false),
  ('13a', 'Timbales', false),
  ('01', 'Violín 1', false),
  ('01', 'Violín 2', false),
  ('03', 'Violoncello', false),
  ('04', 'Contrabajo', false),
  ('15', 'Órgano', false),
  ('20', 'Cantante Soprano', true),
  ('80', 'Cantante Mezzo', true),
  ('81', 'Cantante Tenor', true),
  ('38', 'Cantante Baritono', true),
  ('23', 'Coro', false)
) AS v(id_instr, nombre, solista)
WHERE NOT EXISTS (SELECT 1 FROM obras_particellas WHERE id_obra = 3905 AND nombre_archivo = v.nombre);

-- Ripper, Matinas (3915). Edición Jeanne: orquesta 4-4-3-2-1, también existe quinteto.
UPDATE obras SET
  duracion_segundos = 540,
  observaciones = 'Temporada 2027 P8 · Derechos Ripper: no hay PDF. La edición Jeanne ofrece quinteto (1-1-1-1-1) u orquesta (4-4-3-2-1), las dos con oboe solista. Sillas vacías de la versión orquesta.'
WHERE id = 3915
  AND NOT EXISTS (SELECT 1 FROM obras_particellas WHERE id_obra = 3915);

INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3915, v.id_instr, v.nombre, NULL, v.solista
FROM (VALUES
  ('06', 'Oboe', true),
  ('01', 'Violín 1 ·1', false),
  ('01', 'Violín 1 ·2', false),
  ('01', 'Violín 1 ·3', false),
  ('01', 'Violín 1 ·4', false),
  ('01', 'Violín 2 ·1', false),
  ('01', 'Violín 2 ·2', false),
  ('01', 'Violín 2 ·3', false),
  ('01', 'Violín 2 ·4', false),
  ('02', 'Viola ·1', false),
  ('02', 'Viola ·2', false),
  ('02', 'Viola ·3', false),
  ('03', 'Violoncello ·1', false),
  ('03', 'Violoncello ·2', false),
  ('04', 'Contrabajo', false)
) AS v(id_instr, nombre, solista)
WHERE NOT EXISTS (SELECT 1 FROM obras_particellas WHERE id_obra = 3915 AND nombre_archivo = v.nombre);

-- Purcell 3906: ya está el SCORE. Sillas de orquesta según ese score. Coro sin número.
INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
SELECT 3906, v.id_instr, v.nombre, NULL, false
FROM (VALUES
  ('06', 'Oboe 1'),
  ('06', 'Oboe 2'),
  ('10', 'Trompeta 1'),
  ('10', 'Trompeta 2'),
  ('13a', 'Timbales'),
  ('01', 'Violín 1'),
  ('01', 'Violín 2'),
  ('02', 'Viola'),
  ('03', 'Violoncello'),
  ('04', 'Contrabajo'),
  ('15', 'Órgano'),
  ('23', 'Coro')
) AS v(id_instr, nombre)
WHERE NOT EXISTS (SELECT 1 FROM obras_particellas WHERE id_obra = 3906 AND nombre_archivo = v.nombre);

UPDATE obras SET
  instrumentacion = '0.2.0.0 - 0.2.0.0 - Timp - Key - Str + Coro',
  observaciones = 'Temporada 2027 P17 · Solo hay SCORE (Calebe Barros, 2021). IMSLP no publica las particellas de esa edición. Sillas vacías según el score: 2 oboes, 2 trompetas, timbal, cuerdas y órgano. El coro no tiene un número de cantantes: una sola silla Coro.'
WHERE id = 3906;

-- Notas, sin sillas: no hay plantilla que no sea un invento.
UPDATE obras SET observaciones = 'Temporada 2027 P17 · Derechos Rutter. No hay PDF. Hay versión con piano y versión orquestal, y no está definido cuál se toca. Sin sillas.'
WHERE id = 3908;

UPDATE obras SET observaciones = 'Temporada 2027 P14 · Falú: la selección de suites no está confirmada. Sin PDF y sin plantilla. Sin sillas.'
WHERE id = 3910;

UPDATE obras SET observaciones = 'Temporada 2027 P14 · Estreno Falú, título sin confirmar. Sin material del compositor. Sin sillas.'
WHERE id = 3911;

UPDATE obras SET observaciones = 'Temporada 2027 P12 · Estreno Coppola. No hay partitura pública ni plantilla. Sin sillas hasta que llegue el material.'
WHERE id = 3914;

UPDATE obras SET observaciones = 'Temporada 2027 P17 · Hay cuerdas y órgano (recorte del Messiah). No hay partes de coro. El coro SATB no tiene un número de cantantes: no se crearon sillas de coro.'
WHERE id = 3904;

UPDATE obras SET observaciones = 'Temporada 2027 P5 · Partes cargadas: arreglo Barshai, solo cuerdas (SCORE + 5).'
WHERE id = 3894;

-- El trigger en vivo rotula un Timbales suelto (id 13a, nombre_archivo Timbales) como Perc.
-- Estas dos líneas van al final para que un re-seed deje Timp. Una edición posterior de
-- particellas vuelve a disparar el trigger y pisa el valor a Perc.
UPDATE obras SET instrumentacion = '1.1.1.1 - 2.1.1.0 - Timp - Str' WHERE id = 3912;
UPDATE obras SET instrumentacion = 'M., Bar., T., S. - 0.0.0.0 - 0.2.3.0 - Timp - Key - Str + Coro' WHERE id = 3905;
