-- =============================================================================
-- Import Backline FIMBA 2026 desde Google Sheet
-- Fuente: Compilado Backlines FIMBA 2026
--   https://docs.google.com/spreadsheets/d/1xLQKbdMt3RUUWubKXaGwvJxQRBYQT0EhMvrpdXxEjYE
-- Edición 1 / gira 12 — ejecutado vía: npx supabase db query --linked -f …
-- Fecha: 2026-09-02
-- =============================================================================
-- Matching: artista (fuzzy) + venue alias + día-del-mes dentro del festival.
-- Aliases venue: La Baita→Teatro La Baita, CAMBA→Camping Musical…,
--   PSC→Puerto San Carlos, BS→Biblioteca Sarmiento, INVAP→Campus INVAP,
--   Catedral→Iglesia Catedral…, Asociacion Hot→Asociación Empresaria Hotelera…
-- Colores sheet → backline_estado: naranja / verde / amarillo (celeste no apareció).
-- Chips Drive: URLs resueltas por búsqueda en Drive (archivo OFRN); HH3 y algunos
--   chips no encontrados → planta_escenario_url NULL (parcial).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Helper: plain text → HTML mínimo para backline_descripcion
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION pg_temp.backline_html(t text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN t IS NULL OR btrim(t) = '' THEN NULL
    ELSE '<p>' || replace(replace(replace(btrim(t), '&', '&amp;'), '<', '&lt;'), E'\n', '<br>') || '</p>'
  END;
$$;

-- ---------------------------------------------------------------------------
-- CONCIERTOS
-- ---------------------------------------------------------------------------

-- Sheet R3: Alba | La Baita | 16 | planta AC_rider | monto $0 | blanco
-- → evento 3970 Alba Carmona / Teatro La Baita / 2026-09-16
UPDATE public.eventos SET
  backline_descripcion = NULL, -- descripción sheet = solo nombre del PDF (duplica planta)
  backline_monto = 0,
  planta_escenario_url = 'https://drive.google.com/file/d/1NZhtub07Rn_fT6jpcL2XY97Jj_Kp37ex/view',
  backline_estado = NULL,
  updated_at = now()
WHERE id = 3970;

-- Sheet R4: OJF Soijar | Catedral | 16 | verde + rider OIA
-- → 3969 Orquesta Infantil Argentina
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html(
$d$sillas, atriles, luces, contrabajos y chelos
.- set de cuatro timpanis: 32, 29, 26 y 23 pulgadas
.- Gran casa
.- platillos de choque
.- dos redoblantes
 - tamborin
.- Glockspiel
.- 3 toms
- Xilofono,
- plato suspendido$d$
  ),
  backline_monto = 0,
  planta_escenario_url = 'https://drive.google.com/file/d/1lsQI9lBJVRwmFPBCiqWK1cGRIMM6IvR7/view',
  backline_estado = 'verde',
  updated_at = now()
WHERE id = 3969;

-- Sheet R6: Hamilton | La Baita | 17 | planta HH3 (URL no resuelta en Drive)
-- → 3971 + 3975 (dos funciones mismo día/venue)
UPDATE public.eventos SET
  backline_descripcion = NULL,
  planta_escenario_url = NULL, -- chip HH3 Technical Rider Stage Plot V2.pdf sin URL localizable
  backline_estado = NULL,
  updated_at = now()
WHERE id IN (3971, 3975);

-- Sheet R7: Daniel Ruggiero | BS | 17 | amarillo
-- → 3974 Biblioteca Sarmiento
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html('Piano Electrico, contrabajo y bateria'),
  planta_escenario_url = NULL,
  backline_estado = 'amarillo',
  updated_at = now()
WHERE id = 3974;

-- Sheet R8–R10: Cápsula PSC 17 + La Ferni + TOBI (merge → un concierto)
-- → 3972
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html(
$d$Elizabeth Morris solista.pdf

Rider La Ferni

TOBI rider tecnico 2024.pdf$d$
  ),
  planta_escenario_url = 'https://drive.google.com/file/d/1weatR0cOOwzdIL40AOoNOQCIu-jMykIq/view',
  backline_estado = NULL,
  updated_at = now()
WHERE id = 3972;

-- Sheet R12: League | La Baita | 18 | concierto (+ planta CRIMSON)
-- → 3928 + 3929
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html(
    'The League of Crafty Guitarists DATA.docx Rider ensayo Asoc. Hotelera — mismo que para concierto, TARIMAS'
  ),
  planta_escenario_url = 'https://drive.google.com/file/d/1mKfYdkpXmyy5hCUlfza4IwaqSwUmVIP1/view',
  backline_estado = NULL,
  updated_at = now()
WHERE id IN (3928, 3929);

-- Sheet R13: Camarada | CAMBA | 18 | amarillo
-- → 3977
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html('Piano afinado, cello, Contrabajo'),
  planta_escenario_url = 'https://drive.google.com/file/d/1o60UfDnr-bksqkY0ZO0mj-8K9_JGX5Cu/view',
  backline_estado = 'amarillo',
  updated_at = now()
WHERE id = 3977;

-- Sheet R14: Coro Polifónico | Catedral | 18
-- → 3980
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html(
    'PIANO. Podio, atril de director, dispneser de agua y vasos y tacho de basura'
  ),
  planta_escenario_url = NULL, -- chip "1. Coro Polifónico Nacional" sin URL Drive
  backline_estado = NULL,
  updated_at = now()
WHERE id = 3980;

-- Sheet R15: Camerata Juvenil | PSC | 18
-- → 3978
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html(
    'Rider tecnicos FIMBA 2026  sillas, atriles y luces'
  ),
  planta_escenario_url = NULL,
  backline_estado = NULL,
  updated_at = now()
WHERE id = 3978;

-- Sheet R16: Raúl Traver - David Benítez | CAMBA | 19 | amarillo
-- → 3981
UPDATE public.eventos SET
  backline_descripcion = NULL,
  planta_escenario_url = NULL,
  backline_estado = 'amarillo',
  updated_at = now()
WHERE id = 3981;

-- Sheet R17: Viento Sur y Cuarteto Atlas | INVAP | 19 | amarillo
-- → 4302 (Cuarteto Atlas) + 3986 (grupo Viento Sur, sin propuesta)
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html('Atriles, cello para Cuarteto Atlas'),
  planta_escenario_url = NULL, -- chip "Viento Sur y Cuarteto Atlas" sin URL
  backline_estado = 'amarillo',
  updated_at = now()
WHERE id IN (4302, 3986);

-- Sheet R18: Chango Spasiuk | La Baita | 19
-- → 3982 + 3983
UPDATE public.eventos SET
  backline_descripcion = NULL,
  planta_escenario_url = NULL,
  backline_estado = NULL,
  updated_at = now()
WHERE id IN (3982, 3983);

-- Sheet R19: Sol Liebeskind | CAMBA | 19
-- → 3984
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html('Piano 1 micrófono 2 monitores'),
  planta_escenario_url = NULL,
  backline_estado = NULL,
  updated_at = now()
WHERE id = 3984;

-- Sheet R20–R22: Cápsula PSC 19 + Samantha + Sebastian
-- → 3973
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html(
$d$clarissa-ferreira-rider-tecnico.pdf

Samantha Navarro
Mic voz
1 linea guitarra
1 monitor

Sebastian Prada
Mic voz
1 linea guitarra
1 monitor$d$
  ),
  planta_escenario_url = NULL,
  backline_estado = NULL,
  updated_at = now()
WHERE id = 3973;

-- Sheet R23: Guillo Espel | BS | 19
-- → 3985
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html('Vibráfono, atriles'),
  planta_escenario_url = NULL, -- chip "17. Guillo Espel" sin URL
  backline_estado = NULL,
  updated_at = now()
WHERE id = 3985;

-- Sheet R24: Cuarteto Atlas | CAMBA | 20
-- → 3989
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html('cello'),
  planta_escenario_url = NULL,
  backline_estado = NULL,
  updated_at = now()
WHERE id = 3989;

-- Sheet R25: Niños y Jóvenes Cantores | Catedral | 20
-- → 3990
UPDATE public.eventos SET
  backline_descripcion = NULL,
  planta_escenario_url = NULL,
  backline_estado = NULL,
  updated_at = now()
WHERE id = 3990;

-- Sheet R26: Bob Marley sinfónico | La Baita | 20
-- → 3933 + 3934 Marley Sinfónico
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html('Marimba'),
  planta_escenario_url = NULL,
  backline_estado = NULL,
  updated_at = now()
WHERE id IN (3933, 3934);

-- Sheet R27: Daniela Salinas - Lilia Salsano | (sin venue) | 20
-- → 3993 DUO Salsano I Salinas @ CAMBA (match débil: artista+día, venue vacío en sheet)
UPDATE public.eventos SET
  backline_descripcion = pg_temp.backline_html('Dos pianos enfrentados'),
  planta_escenario_url = NULL,
  backline_estado = NULL,
  updated_at = now()
WHERE id = 3993;

-- ---------------------------------------------------------------------------
-- ENSAYOS (Asociación Hotelera) — incluir en Backline + datos sheet
-- ---------------------------------------------------------------------------

-- Sheet R2: Alba | Asociacion Hot | 15 | naranja
-- → ensayos 4008, 3920, 3921
UPDATE public.eventos SET
  backline_incluido = true,
  backline_descripcion = pg_temp.backline_html(
$d$Drum-set, atriles y sillas, amplificación voz y guitarra. Presupeusto 1 1EF2C64E-DD06-4229-ADC0-D6393701F32B.jpeg

1 mic
1 mic para guitarra acustica
2 monitores pequeños$d$
  ),
  planta_escenario_url = NULL,
  backline_estado = 'naranja',
  updated_at = now()
WHERE id IN (4008, 3920, 3921);

-- Sheet R5: League | Asociacion Hot | 16 | naranja + CRIMSON planta
-- → ensayos Crimson 4043, 4014
UPDATE public.eventos SET
  backline_incluido = true,
  backline_descripcion = pg_temp.backline_html(
    'The League of Crafty Guitarists DATA.docx mismo que para concierto, TARIMAS'
  ),
  planta_escenario_url = 'https://drive.google.com/file/d/1mKfYdkpXmyy5hCUlfza4IwaqSwUmVIP1/view',
  backline_estado = 'naranja',
  updated_at = now()
WHERE id IN (4043, 4014);

-- Sheet R11: League | Asociacion Hot | 17 | naranja
-- → ensayos 4017, 3926
UPDATE public.eventos SET
  backline_incluido = true,
  backline_descripcion = pg_temp.backline_html(
    'The League of Crafty Guitarists DATA.docx mismo que para concierto, TARIMAS'
  ),
  planta_escenario_url = 'https://drive.google.com/file/d/1mKfYdkpXmyy5hCUlfza4IwaqSwUmVIP1/view',
  backline_estado = 'naranja',
  updated_at = now()
WHERE id IN (4017, 3926);

COMMIT;

-- Verificación rápida
SELECT e.id, e.fecha, e.hora_inicio, e.id_tipo_evento,
  e.backline_estado, e.backline_monto,
  e.planta_escenario_url IS NOT NULL AS has_planta,
  e.backline_descripcion IS NOT NULL AS has_desc,
  e.backline_incluido,
  l.nombre AS venue,
  left(coalesce((
    SELECT string_agg(fp.nombre, ' | ')
    FROM eventos_fimba_propuestas efp
    JOIN fimba_propuestas fp ON fp.id = efp.id_propuesta
    WHERE efp.id_evento = e.id
  ), ''), 60) AS artistas
FROM eventos e
LEFT JOIN locaciones l ON l.id = e.id_locacion
WHERE e.id IN (
  3970,3969,3971,3975,3974,3972,3928,3929,3977,3980,3978,
  3981,4302,3986,3982,3983,3984,3973,3985,3989,3990,3933,3934,3993,
  4008,3920,3921,4043,4014,4017,3926
)
ORDER BY e.fecha, e.hora_inicio, e.id;
