-- Sync giras sinfónicas + ciclos de cámara 2027 desde Google Sheets (fuente de verdad).
-- Repertorio: vincula obras existentes; crea faltantes como estado Solicitud.
-- Directores/solistas: alta Invitado si no existen + rol en giras_integrantes.

BEGIN;

-- =============================================================================
-- 0) Helpers: invitados (idempotente por nombre+apellido)
-- =============================================================================
CREATE TEMP TABLE _inv (
  key text PRIMARY KEY,
  nombre text NOT NULL,
  apellido text NOT NULL,
  id_integrante bigint
);

INSERT INTO _inv (key, nombre, apellido) VALUES
  ('fraile', 'Martín', 'Fraile Milstein'),
  ('montoya', 'Jorge', 'Montoya'),
  ('gurevich', 'Elías', 'Gurevich'),
  ('munoz_ale', 'Alejandro', 'Muñoz'),
  ('silverstein', 'Ezequiel', 'Silverstein'),
  ('diaz_pablo', 'Pablo Dario', 'Diaz'),
  ('delpino', 'David', 'del Pino Glinke'),
  ('saltron', 'Joel', 'Saltrón'),
  ('santelices', 'Marko Andro', 'Santelices Skorin'),
  ('cunha', 'Felipe', 'Cunha'),
  ('ibanez', 'Arturo', 'Ibáñez'),
  ('salva', 'Luis', 'Salva'),
  ('peroni', 'Emilio', 'Peroni'),
  ('diniello', 'Mara', 'Diniello'),
  ('scarano_a', 'Alfonso', 'Scarano'),
  ('scarano_v', 'Valerio', 'Scarano'),
  ('falu', 'Juan', 'Falú'),
  ('spelzini', 'Leonardo', 'Spelzini'),
  ('lerner', 'Linus', 'Lerner'),
  ('altmann', 'Gimena', 'Altmann Beveraggi'),
  ('jair', 'Jair', 'Rodriguez'),
  ('lhez', 'Jorge', 'Lhez'),
  ('morgan', 'Darragh', 'Morgan'),
  ('gill', 'Tim', 'Gill'),
  ('dullea', 'Mary', 'Dullea');

-- Resolver existentes
UPDATE _inv i
SET id_integrante = x.id
FROM integrantes x
WHERE i.id_integrante IS NULL
  AND lower(trim(x.apellido)) = lower(trim(i.apellido))
  AND lower(trim(x.nombre)) = lower(trim(i.nombre));

-- Casos conocidos por id fijo
UPDATE _inv SET id_integrante = 4574063 WHERE key = 'fraile' AND id_integrante IS NULL;
UPDATE _inv SET id_integrante = 48028093 WHERE key = 'gurevich' AND id_integrante IS NULL;
UPDATE _inv SET id_integrante = 1767967586860 WHERE key = 'diaz_pablo' AND id_integrante IS NULL;
UPDATE _inv SET id_integrante = 1767967586872 WHERE key = 'santelices' AND id_integrante IS NULL;
UPDATE _inv SET id_integrante = 3511823 WHERE key = 'salva' AND id_integrante IS NULL;
UPDATE _inv SET id_integrante = 48028181 WHERE key = 'peroni' AND id_integrante IS NULL;
UPDATE _inv SET id_integrante = 48028061 WHERE key = 'falu' AND id_integrante IS NULL;
UPDATE _inv SET id_integrante = 1458710 WHERE key = 'spelzini' AND id_integrante IS NULL;
UPDATE _inv SET id_integrante = 48028117 WHERE key = 'lerner' AND id_integrante IS NULL;
UPDATE _inv SET id_integrante = 48027968 WHERE key = 'altmann' AND id_integrante IS NULL;
UPDATE _inv SET id_integrante = 2325804 WHERE key = 'jair' AND id_integrante IS NULL;

-- Crear faltantes como Invitado
INSERT INTO integrantes (nombre, apellido, condicion, es_simulacion, nota_interna)
SELECT i.nombre, i.apellido, 'Invitado', false, 'Alta automática sync Sheets 2027 (director/solista)'
FROM _inv i
WHERE i.id_integrante IS NULL;

UPDATE _inv i
SET id_integrante = x.id
FROM integrantes x
WHERE i.id_integrante IS NULL
  AND lower(trim(x.apellido)) = lower(trim(i.apellido))
  AND lower(trim(x.nombre)) = lower(trim(i.nombre));

CREATE OR REPLACE FUNCTION pg_temp.ensure_rol(p_gira bigint, p_int bigint, p_rol text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_gira IS NULL OR p_int IS NULL THEN
    RETURN;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM giras_integrantes
    WHERE id_gira = p_gira AND id_integrante = p_int AND rol = p_rol
  ) THEN
    INSERT INTO giras_integrantes (id_gira, id_integrante, rol, estado)
    VALUES (p_gira, p_int, p_rol, 'confirmado');
  ELSE
    UPDATE giras_integrantes
    SET estado = 'confirmado'
    WHERE id_gira = p_gira AND id_integrante = p_int AND rol = p_rol;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION pg_temp.inv(p_key text)
RETURNS bigint LANGUAGE sql STABLE AS $$
  SELECT id_integrante FROM _inv WHERE key = p_key
$$;

-- =============================================================================
-- 1) Actualizar / reutilizar giras sinfónicas-camerata
-- =============================================================================

-- P1 #201
UPDATE programas SET
  nombre_gira = 'Horizontes del romanticismo ruso',
  subtitulo = 'Apertura de temporada · Dir. Martín Fraile Milstein · Corno solista Jorge Montoya (GCC)',
  nomenclador = 'Sinf 01/27',
  fecha_desde = '2027-02-17',
  fecha_hasta = '2027-02-20',
  tipo = 'Sinfónico',
  zona = 'Andina',
  mes_letra = '02a'
WHERE id = 201;

-- Quitar repertorio incorrecto de #201 (no borra obras del catálogo)
DELETE FROM repertorio_obras
WHERE id_repertorio IN (SELECT id FROM programas_repertorios WHERE id_programa = 201);

-- P2 #202
UPDATE programas SET
  nombre_gira = 'Voces en la inmensidad',
  subtitulo = 'Vientos y percusión · Dir. Martín Fraile Milstein · Violín Elías Gurevich',
  nomenclador = 'Sinf 02/27',
  fecha_desde = '2027-03-03',
  fecha_hasta = '2027-03-06',
  tipo = 'Camerata Filarmónica',
  zona = 'Atlántica',
  mes_letra = '03a'
WHERE id = 202;

-- P3 #203 (antes Directora mujer)
UPDATE programas SET
  nombre_gira = 'Director invitado (a confirmar)',
  subtitulo = 'Full orquesta · Villa Regina / General Roca · director invitado a confirmar',
  nomenclador = 'Sinf 03/27',
  fecha_desde = '2027-03-17',
  fecha_hasta = '2027-03-20',
  tipo = 'Sinfónico',
  zona = 'Valle',
  mes_letra = '03b'
WHERE id = 203;

-- P4 #204 (antes Rusia) Festival Bariloche
UPDATE programas SET
  nombre_gira = 'Festival Internacional de Música Bariloche',
  subtitulo = 'Reposición Programa 2 y Programa 3 de la temporada',
  nomenclador = 'Sinf 04/27',
  fecha_desde = '2027-04-14',
  fecha_hasta = '2027-04-18',
  tipo = 'Sinfónico',
  zona = 'Andina',
  mes_letra = '04a'
WHERE id = 204;

-- P5 #206
UPDATE programas SET
  nombre_gira = 'Donde habita la nostalgia',
  subtitulo = 'Cuerdas · Dir. Alejandro Muñoz · Bariloche / El Bolsón',
  nomenclador = 'Sinf 05/27',
  fecha_desde = '2027-05-19',
  fecha_hasta = '2027-05-22',
  tipo = 'Camerata Filarmónica',
  zona = 'Andina',
  mes_letra = '05a'
WHERE id = 206;

-- P6 #207
UPDATE programas SET
  nombre_gira = 'Ecos del alma',
  subtitulo = 'Dir. Ezequiel Silverstein · Cello Pablo Díaz (GCC)',
  nomenclador = 'Sinf 06/27',
  fecha_desde = '2027-06-02',
  fecha_hasta = '2027-06-05',
  tipo = 'Sinfónico',
  zona = 'Atlántica',
  mes_letra = '06a'
WHERE id = 207;

-- P7 #205 (antes B y W.)
UPDATE programas SET
  nombre_gira = 'El fuego del romanticismo',
  subtitulo = 'Dir. David del Pino Glinke · Violín Joel Saltrón (GCC) · Cipolletti / Villa Regina',
  nomenclador = 'Sinf 07/27',
  fecha_desde = '2027-06-16',
  fecha_hasta = '2027-06-19',
  tipo = 'Sinfónico',
  zona = 'Valle',
  mes_letra = '06b'
WHERE id = 205;

-- P8 #208
UPDATE programas SET
  nombre_gira = 'Mannheim — Choele Choel y SAO',
  subtitulo = 'Dir. Marko Santelices · solistas internos · Ripper Matinas',
  nomenclador = 'Sinf 08/27',
  fecha_desde = '2027-07-07',
  fecha_hasta = '2027-07-10',
  tipo = 'Camerata Filarmónica',
  zona = 'Valle',
  mes_letra = '07a'
WHERE id = 208;

-- P9 #209
UPDATE programas SET
  nombre_gira = 'Donde habita el sonido',
  subtitulo = 'Dir. Felipe Cunha · Viola Arturo Ibáñez (GCC)',
  nomenclador = 'Sinf 09/27',
  fecha_desde = '2027-08-04',
  fecha_hasta = '2027-08-07',
  tipo = 'Camerata Filarmónica',
  zona = 'Atlántica',
  mes_letra = '08a'
WHERE id = 209;

-- P10 #210
UPDATE programas SET
  nombre_gira = 'Sueño y la luz',
  subtitulo = 'Dir. Martín Fraile Milstein · Salva / Peroni / vc a confirmar · Arpa Mara Diniello',
  nomenclador = 'Sinf 10/27',
  fecha_desde = '2027-08-18',
  fecha_hasta = '2027-08-21',
  tipo = 'Sinfónico',
  zona = 'Valle',
  mes_letra = '08b'
WHERE id = 210;

-- P11 #211 (antes FIMBA)
UPDATE programas SET
  nombre_gira = 'Beethoven 200 años',
  subtitulo = 'Festival Bariloche Clásica 2027 · Dir. Martín Fraile Milstein · The Fidelio Trio',
  nomenclador = 'Sinf 11/27',
  fecha_desde = '2027-09-15',
  fecha_hasta = '2027-09-18',
  tipo = 'Sinfónico',
  zona = 'Andina',
  mes_letra = '09a'
WHERE id = 211;

-- P12 #212 (antes Mannheim octubre)
-- nombre distinto de #165 «Feria del Libro Cipolletti» (2026) por UNIQUE(nombre_gira)
UPDATE programas SET
  nombre_gira = 'Feria del Libro Cipolletti 2027',
  subtitulo = 'Dir. Jorge Lhez · cuerdas · Roca / Cipolletti',
  nomenclador = 'Sinf 12/27',
  fecha_desde = '2027-10-07',
  fecha_hasta = '2027-10-10',
  tipo = 'Camerata Filarmónica',
  zona = 'Valle',
  mes_letra = '10a'
WHERE id = 212;

-- P13 #213
UPDATE programas SET
  nombre_gira = 'Euforia y Pasión',
  subtitulo = 'Dir. Alfonso Scarano · Violín Valerio Scarano · Viedma',
  nomenclador = 'Sinf 13/27',
  fecha_desde = '2027-11-03',
  fecha_hasta = '2027-11-06',
  tipo = 'Sinfónico',
  zona = 'Atlántica',
  mes_letra = '11a'
WHERE id = 213;

-- P14 #214
UPDATE programas SET
  nombre_gira = 'Música Argentina — Juan Falú',
  subtitulo = 'Dir. Martín Fraile Milstein · Juan Falú · Flauta Leonardo Spelzini · El Bolsón / Ñorquincó',
  nomenclador = 'Sinf 14/27',
  fecha_desde = '2027-11-17',
  fecha_hasta = '2027-11-20',
  tipo = 'Camerata Filarmónica',
  zona = 'Andina',
  mes_letra = '11b'
WHERE id = 214;

-- P15 #215
UPDATE programas SET
  nombre_gira = 'Beethoven — Novena Sinfonía',
  subtitulo = 'Dir. Linus Lerner · Coro OFRN / Gimena Altmann Beveraggi · solistas vocales a confirmar',
  nomenclador = 'Sinf 15/27',
  fecha_desde = '2027-12-01',
  fecha_hasta = '2027-12-04',
  tipo = 'Sinfónico',
  zona = 'Andina',
  mes_letra = '12a'
WHERE id = 215;

-- P17 #216 (contenido completo en Sheets)
UPDATE programas SET
  nombre_gira = 'Música para el Encuentro',
  subtitulo = 'Dir. Marko Sanfelices · Trompeta Jair Rodriguez (GCC) · Coro Municipal de Viedma',
  nomenclador = 'Sinf 17/27',
  fecha_desde = '2027-12-08',
  fecha_hasta = '2027-12-11',
  tipo = 'Camerata Filarmónica',
  zona = 'Atlántica',
  mes_letra = '12c'
WHERE id = 216;

-- P16 nueva (CFMon Bariloche)
INSERT INTO programas (nombre_gira, subtitulo, nomenclador, fecha_desde, fecha_hasta, tipo, zona, mes_letra, estado)
SELECT
  'CFMon Bariloche (Programa 16)',
  'CFmon · Bariloche · detalle de programa pendiente en planilla',
  'Sinf 16/27',
  '2027-12-06',
  '2027-12-08',
  'Camerata Filarmónica',
  'Andina',
  '12b',
  'Borrador'
WHERE NOT EXISTS (
  SELECT 1 FROM programas WHERE nomenclador = 'Sinf 16/27'
);

-- =============================================================================
-- 2) Ciclos de cámara — fechas y subtítulos
-- =============================================================================

-- Identificar lotes Ciclo I (mismo split de ensambles)
-- Lote A (antes 23-24 abr): ABRON BRAT ECAS PILTRI PV TREPUN VS
-- Lote B (antes 29-30 abr): CAV CEB CPAT ES VN

UPDATE programas SET
  fecha_desde = '2027-04-28',
  fecha_hasta = '2027-05-02',
  subtitulo = 'Nueva música argentina · ensambles de viento'
WHERE nombre_gira LIKE 'Ciclo de Cámara I — %'
  AND fecha_desde = '2027-04-23';

UPDATE programas SET
  fecha_desde = '2027-05-05',
  fecha_hasta = '2027-05-09',
  subtitulo = 'Nueva música argentina · ensambles de cuerdas'
WHERE nombre_gira LIKE 'Ciclo de Cámara I — %'
  AND fecha_desde = '2027-04-29';

-- Ciclo II: mover desde junio; split por mismo patrón de nombres que Ciclo I lote A/B
UPDATE programas p SET
  fecha_desde = '2027-08-25',
  fecha_hasta = '2027-08-29',
  subtitulo = 'Ciclo II · ensambles de viento'
WHERE p.nombre_gira LIKE 'Ciclo de Cámara II — %'
  AND EXISTS (
    SELECT 1 FROM programas p1
    WHERE p1.nombre_gira = replace(p.nombre_gira, 'II', 'I')
      AND p1.subtitulo ILIKE '%viento%'
  );

UPDATE programas p SET
  fecha_desde = '2027-09-01',
  fecha_hasta = '2027-09-05',
  subtitulo = 'Ciclo II · ensambles de cuerdas'
WHERE p.nombre_gira LIKE 'Ciclo de Cámara II — %'
  AND EXISTS (
    SELECT 1 FROM programas p1
    WHERE p1.nombre_gira = replace(p.nombre_gira, 'II', 'I')
      AND p1.subtitulo ILIKE '%cuerdas%'
  );

-- Fallback si algún II quedó en junio
UPDATE programas SET
  fecha_desde = '2027-08-25',
  fecha_hasta = '2027-08-29',
  subtitulo = COALESCE(NULLIF(subtitulo, 'Música Argentina'), 'Ciclo II')
WHERE nombre_gira LIKE 'Ciclo de Cámara II — %'
  AND fecha_desde = '2027-06-25';

-- Ciclo III
UPDATE programas SET
  fecha_desde = '2027-10-20',
  fecha_hasta = '2027-10-24',
  subtitulo = 'Música para crecer · presentaciones en escuelas'
WHERE nombre_gira LIKE 'Ciclo de Cámara III — %';

-- Ciclo IV
UPDATE programas SET
  fecha_desde = '2027-12-09',
  fecha_hasta = '2027-12-19',
  subtitulo = 'Tango, folklore o jazz o participación en conciertos con coros'
WHERE nombre_gira LIKE 'Ciclo de Cámara IV — %';

-- =============================================================================
-- 3) Directores / solistas en giras_integrantes
-- =============================================================================
SELECT pg_temp.ensure_rol(201, pg_temp.inv('fraile'), 'director');
SELECT pg_temp.ensure_rol(201, pg_temp.inv('montoya'), 'solista');
SELECT pg_temp.ensure_rol(202, pg_temp.inv('fraile'), 'director');
SELECT pg_temp.ensure_rol(202, pg_temp.inv('gurevich'), 'solista');
SELECT pg_temp.ensure_rol(204, pg_temp.inv('fraile'), 'director');
SELECT pg_temp.ensure_rol(204, pg_temp.inv('gurevich'), 'solista');
SELECT pg_temp.ensure_rol(206, pg_temp.inv('munoz_ale'), 'director');
SELECT pg_temp.ensure_rol(207, pg_temp.inv('silverstein'), 'director');
SELECT pg_temp.ensure_rol(207, pg_temp.inv('diaz_pablo'), 'solista');
SELECT pg_temp.ensure_rol(205, pg_temp.inv('delpino'), 'director');
SELECT pg_temp.ensure_rol(205, pg_temp.inv('saltron'), 'solista');
SELECT pg_temp.ensure_rol(208, pg_temp.inv('santelices'), 'director');
SELECT pg_temp.ensure_rol(209, pg_temp.inv('cunha'), 'director');
SELECT pg_temp.ensure_rol(209, pg_temp.inv('ibanez'), 'solista');
SELECT pg_temp.ensure_rol(210, pg_temp.inv('fraile'), 'director');
SELECT pg_temp.ensure_rol(210, pg_temp.inv('salva'), 'solista');
SELECT pg_temp.ensure_rol(210, pg_temp.inv('peroni'), 'solista');
SELECT pg_temp.ensure_rol(210, pg_temp.inv('diniello'), 'solista');
SELECT pg_temp.ensure_rol(211, pg_temp.inv('fraile'), 'director');
SELECT pg_temp.ensure_rol(211, pg_temp.inv('morgan'), 'solista');
SELECT pg_temp.ensure_rol(211, pg_temp.inv('gill'), 'solista');
SELECT pg_temp.ensure_rol(211, pg_temp.inv('dullea'), 'solista');
SELECT pg_temp.ensure_rol(212, pg_temp.inv('lhez'), 'director');
SELECT pg_temp.ensure_rol(213, pg_temp.inv('scarano_a'), 'director');
SELECT pg_temp.ensure_rol(213, pg_temp.inv('scarano_v'), 'solista');
SELECT pg_temp.ensure_rol(214, pg_temp.inv('fraile'), 'director');
SELECT pg_temp.ensure_rol(214, pg_temp.inv('falu'), 'solista');
SELECT pg_temp.ensure_rol(214, pg_temp.inv('spelzini'), 'solista');
SELECT pg_temp.ensure_rol(215, pg_temp.inv('lerner'), 'director');
SELECT pg_temp.ensure_rol(215, pg_temp.inv('altmann'), 'director');
SELECT pg_temp.ensure_rol(216, pg_temp.inv('santelices'), 'director');
SELECT pg_temp.ensure_rol(216, pg_temp.inv('jair'), 'solista');

-- =============================================================================
-- 4) Compositores faltantes
-- =============================================================================
INSERT INTO compositores (apellido, nombre)
SELECT 'Brotons', 'Salvador'
WHERE NOT EXISTS (SELECT 1 FROM compositores WHERE apellido = 'Brotons' AND coalesce(nombre,'') = 'Salvador');

INSERT INTO compositores (apellido, nombre)
SELECT 'Paganini', 'Niccolò'
WHERE NOT EXISTS (SELECT 1 FROM compositores WHERE apellido ILIKE 'Paganini' LIMIT 1);

INSERT INTO compositores (apellido, nombre)
SELECT 'Barshai', 'Rudolf'
WHERE NOT EXISTS (SELECT 1 FROM compositores WHERE apellido = 'Barshai' LIMIT 1);

INSERT INTO compositores (apellido, nombre)
SELECT 'Stravinsky', 'Igor'
WHERE NOT EXISTS (SELECT 1 FROM compositores WHERE apellido ILIKE 'Stravinsky' LIMIT 1);

INSERT INTO compositores (apellido, nombre)
SELECT 'Wagner', 'Richard'
WHERE NOT EXISTS (SELECT 1 FROM compositores WHERE apellido = 'Wagner' AND coalesce(nombre,'') ILIKE 'Richard' LIMIT 1);

INSERT INTO compositores (apellido, nombre)
SELECT 'Coppola', 'Germán Alfredo'
WHERE NOT EXISTS (SELECT 1 FROM compositores WHERE apellido ILIKE 'Coppola' LIMIT 1);

INSERT INTO compositores (apellido, nombre)
SELECT 'Ripper', 'João Guilherme'
WHERE NOT EXISTS (SELECT 1 FROM compositores WHERE apellido ILIKE 'Ripper' LIMIT 1);

-- =============================================================================
-- 5) Obras nuevas (Solicitud) + mapa de IDs
-- =============================================================================
CREATE TEMP TABLE _obra_map (
  key text PRIMARY KEY,
  id_obra bigint
);

-- Existentes
INSERT INTO _obra_map VALUES
  ('gliere_corno', 3649),
  ('beethoven_octeto', 3651),
  ('weill_vn', 3652),
  ('tchaik_serenata', 2299),
  ('grieg_peer1', 3497),
  ('bruch_kol', 2550),
  ('wieniawski_2', 3645),
  ('barber_adagio', 2439),
  ('casadesus_viola', 3647),
  ('benzecry_pajaro', 3213),
  ('beethoven_sym4', 2463),
  ('beethoven_coriolano', 2468),
  ('vivaldi_gloria_exc', 3349),
  ('bach_jesus', 2427),
  ('handel_hallelujah', 2961);

-- Crear faltantes
CREATE OR REPLACE FUNCTION pg_temp.new_obra(
  p_key text,
  p_titulo text,
  p_dur int,
  p_obs text,
  p_comp_ids bigint[]
) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE
  oid bigint;
  cid bigint;
BEGIN
  SELECT id_obra INTO oid FROM _obra_map WHERE key = p_key;
  IF oid IS NOT NULL THEN
    RETURN oid;
  END IF;

  INSERT INTO obras (titulo, duracion_segundos, estado, observaciones)
  VALUES (p_titulo, p_dur, 'Solicitud', p_obs)
  RETURNING id INTO oid;

  FOREACH cid IN ARRAY p_comp_ids LOOP
    IF cid IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM obras_compositores WHERE id_obra = oid AND id_compositor = cid
    ) THEN
      INSERT INTO obras_compositores (id_obra, id_compositor, rol)
      VALUES (oid, cid, 'compositor');
    END IF;
  END LOOP;

  INSERT INTO _obra_map (key, id_obra) VALUES (p_key, oid)
  ON CONFLICT (key) DO UPDATE SET id_obra = EXCLUDED.id_obra;
  RETURN oid;
END;
$$;

-- IDs compositor
DO $$
DECLARE
  c_borodin bigint;
  c_gliere bigint;
  c_beethoven bigint;
  c_brotons bigint;
  c_weill bigint;
  c_kal bigint;
  c_shost bigint;
  c_barshai bigint;
  c_tchaik bigint;
  c_grieg bigint;
  c_bruch bigint;
  c_wien bigint;
  c_barber bigint;
  c_casa bigint;
  c_mozart bigint;
  c_debussy bigint;
  c_benz bigint;
  c_sibelius bigint;
  c_paganini bigint;
  c_falu bigint;
  c_schubert bigint;
  c_haydn bigint;
  c_handel bigint;
  c_vivaldi bigint;
  c_purcell bigint;
  c_bach bigint;
  c_rutter bigint;
  c_strav bigint;
  c_wagner bigint;
  c_coppola bigint;
  c_ripper bigint;
  oid bigint;
  bid bigint;
  next_ord int;
  pid int;
BEGIN
  SELECT id INTO c_borodin FROM compositores WHERE apellido ILIKE 'Borodin' ORDER BY id LIMIT 1;
  SELECT id INTO c_gliere FROM compositores WHERE apellido ILIKE 'Glière' OR apellido ILIKE 'Gliere' ORDER BY id LIMIT 1;
  SELECT id INTO c_beethoven FROM compositores WHERE apellido ILIKE 'Beethoven' LIMIT 1;
  SELECT id INTO c_brotons FROM compositores WHERE apellido = 'Brotons' LIMIT 1;
  SELECT id INTO c_weill FROM compositores WHERE apellido ILIKE 'Weill' LIMIT 1;
  SELECT id INTO c_kal FROM compositores WHERE apellido ILIKE 'Kalinnikov' LIMIT 1;
  SELECT id INTO c_shost FROM compositores WHERE apellido ILIKE 'Shostakovich' LIMIT 1;
  SELECT id INTO c_barshai FROM compositores WHERE apellido = 'Barshai' LIMIT 1;
  SELECT id INTO c_tchaik FROM compositores WHERE apellido ILIKE 'Tchaikovsky' LIMIT 1;
  SELECT id INTO c_grieg FROM compositores WHERE apellido ILIKE 'Grieg' LIMIT 1;
  SELECT id INTO c_bruch FROM compositores WHERE apellido ILIKE 'Bruch' LIMIT 1;
  SELECT id INTO c_wien FROM compositores WHERE apellido ILIKE 'Wieniawski' LIMIT 1;
  SELECT id INTO c_barber FROM compositores WHERE apellido ILIKE 'Barber' LIMIT 1;
  SELECT id INTO c_casa FROM compositores WHERE apellido ILIKE 'Casadesus' LIMIT 1;
  SELECT id INTO c_mozart FROM compositores WHERE apellido ILIKE 'Mozart' AND nombre ILIKE '%Wolfgang%' LIMIT 1;
  SELECT id INTO c_debussy FROM compositores WHERE apellido ILIKE 'Debussy' LIMIT 1;
  SELECT id INTO c_benz FROM compositores WHERE apellido ILIKE 'Benzecry' LIMIT 1;
  SELECT id INTO c_sibelius FROM compositores WHERE apellido ILIKE 'Sibelius' LIMIT 1;
  SELECT id INTO c_paganini FROM compositores WHERE apellido ILIKE 'Paganini' LIMIT 1;
  SELECT id INTO c_falu FROM compositores WHERE apellido ILIKE 'Falú' AND nombre ILIKE 'Juan' LIMIT 1;
  SELECT id INTO c_schubert FROM compositores WHERE apellido ILIKE 'Schubert' LIMIT 1;
  SELECT id INTO c_haydn FROM compositores WHERE apellido ILIKE 'Haydn' AND nombre ILIKE '%Franz%' LIMIT 1;
  SELECT id INTO c_handel FROM compositores WHERE apellido ILIKE 'Händel' OR apellido ILIKE 'Handel' ORDER BY id LIMIT 1;
  SELECT id INTO c_vivaldi FROM compositores WHERE apellido ILIKE 'Vivaldi' LIMIT 1;
  SELECT id INTO c_purcell FROM compositores WHERE apellido ILIKE 'Purcell' LIMIT 1;
  SELECT id INTO c_bach FROM compositores WHERE apellido = 'Bach' AND nombre ILIKE '%Sebastian%' LIMIT 1;
  SELECT id INTO c_rutter FROM compositores WHERE apellido ILIKE 'Rutter' LIMIT 1;
  SELECT id INTO c_strav FROM compositores WHERE apellido ILIKE 'Stravinsky' LIMIT 1;
  SELECT id INTO c_wagner FROM compositores WHERE apellido = 'Wagner' AND nombre ILIKE 'Richard' LIMIT 1;
  IF c_wagner IS NULL THEN
    SELECT id INTO c_wagner FROM compositores WHERE apellido = 'Wagner' ORDER BY id LIMIT 1;
  END IF;
  SELECT id INTO c_coppola FROM compositores WHERE apellido ILIKE 'Coppola' LIMIT 1;
  SELECT id INTO c_ripper FROM compositores WHERE apellido ILIKE 'Ripper' LIMIT 1;

  PERFORM pg_temp.new_obra('borodin_sym2',
    'Sinfonía n.º 2 en si menor', 1800,
    'Temporada 2027 P1 · Solicitud · material estudio IMSLP previo a set definitivo',
    ARRAY[c_borodin]);

  PERFORM pg_temp.new_obra('brotons_sinfonietta',
    'Sinfonietta da camera, op. 38', 840,
    'Temporada 2027 P2 · Solicitud · derechos: contactar editorial/compositor',
    ARRAY[c_brotons]);

  PERFORM pg_temp.new_obra('kal_serenata',
    'Serenata para cuerdas en sol menor', 540,
    'Temporada 2027 P5 · Solicitud · IMSLP',
    ARRAY[c_kal]);

  PERFORM pg_temp.new_obra('shost_110a',
    'Sinfonía de cámara, op. 110a (arr. Rudolf Barshai)', 1320,
    'Temporada 2027 P5 · Solicitud · derechos Shostakóvich/Barshai · estudio IMSLP si hay score · alquiler posterior',
    ARRAY[c_shost, c_barshai]);

  PERFORM pg_temp.new_obra('kal_sym2',
    'Sinfonía n.º 2 en la mayor', 2340,
    'Temporada 2027 P6/P7 · Solicitud · IMSLP',
    ARRAY[c_kal]);

  PERFORM pg_temp.new_obra('mozart_40',
    'Sinfonía n.º 40 en sol menor, K. 550 (versión revisada con clarinetes)', 1980,
    'Temporada 2027 P9 · Solicitud · IMSLP',
    ARRAY[c_mozart]);

  PERFORM pg_temp.new_obra('debussy_fauno',
    'Preludio a la siesta de un fauno (versión orquestal)', 600,
    'Temporada 2027 P10 · Solicitud · IMSLP (no usar arr. 11 instr. #2056)',
    ARRAY[c_debussy]);

  PERFORM pg_temp.new_obra('beethoven_triple',
    'Triple concierto en do mayor, op. 56 (violín, violonchelo y piano)', 2100,
    'Temporada 2027 P10/P11 · Solicitud · IMSLP',
    ARRAY[c_beethoven]);

  PERFORM pg_temp.new_obra('sibelius_pelleas',
    'Pelléas et Mélisande, suite op. 46', 1620,
    'Temporada 2027 P13 · Solicitud · derechos Sibelius (†1957) · estudio IMSLP / alquiler',
    ARRAY[c_sibelius]);

  PERFORM pg_temp.new_obra('paganini_vn1',
    'Concierto para violín n.º 1, op. 6', 2280,
    'Temporada 2027 P13 · Solicitud · IMSLP (confirmar edición)',
    ARRAY[c_paganini]);

  PERFORM pg_temp.new_obra('beethoven_9',
    'Sinfonía n.º 9 en re menor, op. 125 «Coral»', 4200,
    'Temporada 2027 P15 · Solicitud · IMSLP + partes corales/solistas',
    ARRAY[c_beethoven]);

  PERFORM pg_temp.new_obra('schubert_rosamunda',
    'Rosamunda, D. 797 — entreacto n.º 3', 420,
    'Temporada 2027 P17 · Solicitud · IMSLP',
    ARRAY[c_schubert]);

  PERFORM pg_temp.new_obra('haydn_trumpet',
    'Concierto para trompeta, Hob. VIIe:1 (edición orquestal estándar)', 960,
    'Temporada 2027 P17 · Solicitud · no usar arr. Rondeau #3592 como set principal · IMSLP',
    ARRAY[c_haydn]);

  PERFORM pg_temp.new_obra('handel_glory',
    'And the Glory of the Lord (Messiah)', 180,
    'Temporada 2027 P17 · Solicitud · IMSLP / arr. coral+orq. a confirmar',
    ARRAY[c_handel]);

  PERFORM pg_temp.new_obra('mozart_magnificat',
    'Magnificat, K. 193', 180,
    'Temporada 2027 P17 · Solicitud · IMSLP',
    ARRAY[c_mozart]);

  PERFORM pg_temp.new_obra('purcell_come',
    'Come, ye sons of art (selección)', 180,
    'Temporada 2027 P17 · Solicitud · edición/arr. coral a confirmar · IMSLP base',
    ARRAY[c_purcell]);

  PERFORM pg_temp.new_obra('beethoven_elegischer',
    'Elegischer Gesang, op. 118', 360,
    'Temporada 2027 P17 · Solicitud · IMSLP',
    ARRAY[c_beethoven]);

  PERFORM pg_temp.new_obra('rutter_beauty',
    'For the Beauty of the Earth', 240,
    'Temporada 2027 P17 · Solicitud · derechos Rutter · editorial · estudio si hay score público',
    ARRAY[c_rutter]);

  PERFORM pg_temp.new_obra('bach_nun_danket',
    'Nun danket alle Gott', 180,
    'Temporada 2027 P17 · Solicitud · IMSLP (confirmar BWV/arr.)',
    ARRAY[c_bach]);

  PERFORM pg_temp.new_obra('falu_suites',
    'Suites orquestales (selección por confirmar)', NULL,
    'Temporada 2027 P14 · Solicitud · títulos/versiones por confirmar con compositor',
    ARRAY[c_falu]);

  PERFORM pg_temp.new_obra('falu_estreno',
    'Nueva composición / estreno (título por confirmar)', NULL,
    'Temporada 2027 P14 · Solicitud · material del compositor',
    ARRAY[c_falu]);

  PERFORM pg_temp.new_obra('stravinsky_danses',
    'Danses concertantes', NULL,
    'Temporada 2027 P12 · Solicitud · derechos Stravinsky · alquiler',
    ARRAY[c_strav]);

  PERFORM pg_temp.new_obra('wagner_idilio',
    'Idilio de Sigfrido', 1080,
    'Temporada 2027 P12 · Solicitud · IMSLP',
    ARRAY[c_wagner]);

  PERFORM pg_temp.new_obra('coppola_imaginarios',
    'Imaginarios sonoros argentinos (estreno)', NULL,
    'Temporada 2027 P12 · Solicitud · estreno Coppola',
    ARRAY[c_coppola]);

  PERFORM pg_temp.new_obra('ripper_matinas',
    'Matinas para cuerdas y oboe solista', NULL,
    'Temporada 2027 P8 · Solicitud · derechos Ripper',
    ARRAY[c_ripper]);

  -- Helper local para bloque + obras
  -- P1 201
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 201 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (201, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  next_ord := 1;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (bid, (SELECT id_obra FROM _obra_map WHERE key='borodin_sym2'), next_ord); next_ord := next_ord + 1;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES (bid, (SELECT id_obra FROM _obra_map WHERE key='gliere_corno'), next_ord);

  -- P2 202
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 202 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (202, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  next_ord := 1;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='beethoven_octeto'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='brotons_sinfonietta'), 2),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='weill_vn'), 3);

  -- P5 206
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 206 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (206, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='kal_serenata'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='shost_110a'), 2),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='tchaik_serenata'), 3);

  -- P6 207
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 207 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (207, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='grieg_peer1'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='bruch_kol'), 2),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='kal_sym2'), 3);

  -- P7 205
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 205 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (205, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='wieniawski_2'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='kal_sym2'), 2);

  -- P8 208
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 208 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (208, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='ripper_matinas'), 1);

  -- P9 209
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 209 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (209, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='barber_adagio'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='casadesus_viola'), 2),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='mozart_40'), 3);

  -- P10 210
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 210 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (210, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='debussy_fauno'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='benzecry_pajaro'), 2),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='beethoven_triple'), 3);

  -- P11 211
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 211 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (211, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='beethoven_triple'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='beethoven_sym4'), 2);

  -- P12 212
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 212 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (212, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='stravinsky_danses'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='wagner_idilio'), 2),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='coppola_imaginarios'), 3);

  -- P13 213
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 213 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (213, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='sibelius_pelleas'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='paganini_vn1'), 2);

  -- P14 214
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 214 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (214, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='falu_suites'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='falu_estreno'), 2);

  -- P15 215
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 215 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (215, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='beethoven_9'), 1);

  -- P17 216
  SELECT id INTO bid FROM programas_repertorios WHERE id_programa = 216 ORDER BY orden NULLS FIRST, id LIMIT 1;
  IF bid IS NULL THEN
    INSERT INTO programas_repertorios (id_programa, nombre, orden) VALUES (216, 'Repertorio', 0) RETURNING id INTO bid;
  END IF;
  DELETE FROM repertorio_obras WHERE id_repertorio = bid;
  INSERT INTO repertorio_obras (id_repertorio, id_obra, orden) VALUES
    (bid, (SELECT id_obra FROM _obra_map WHERE key='beethoven_coriolano'), 1),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='schubert_rosamunda'), 2),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='haydn_trumpet'), 3),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='handel_glory'), 4),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='vivaldi_gloria_exc'), 5),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='mozart_magnificat'), 6),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='purcell_come'), 7),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='beethoven_elegischer'), 8),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='bach_jesus'), 9),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='rutter_beauty'), 10),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='bach_nun_danket'), 11),
    (bid, (SELECT id_obra FROM _obra_map WHERE key='handel_hallelujah'), 12);

END;
$$;

COMMIT;
