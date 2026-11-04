-- Función profesional del instrumento (p.ej. violinista) + snapshot editable en constancias

ALTER TABLE public.instrumentos
  ADD COLUMN IF NOT EXISTS funcion text;

COMMENT ON COLUMN public.instrumentos.funcion IS
  'Rol/función para textos formales (constancias): violinista, flautista, etc.';

UPDATE public.instrumentos SET funcion = v.funcion
FROM (VALUES
  ('01', 'violinista'),
  ('02', 'violista'),
  ('03', 'violonchelista'),
  ('04', 'contrabajista'),
  ('05', 'flautista'),
  ('06', 'oboísta'),
  ('06b', 'corno inglés'),
  ('07', 'clarinetista'),
  ('07b', 'clarinetista'),
  ('08', 'fagotista'),
  ('08b', 'contrafagotista'),
  ('09', 'cornista'),
  ('10', 'trompetista'),
  ('11', 'trombonista'),
  ('12', 'tubista'),
  ('13', 'percusionista'),
  ('13a', 'percusionista'),
  ('13b', 'percusionista'),
  ('13c', 'percusionista'),
  ('13d', 'percusionista'),
  ('13e', 'percusionista'),
  ('13f', 'percusionista'),
  ('13g', 'percusionista'),
  ('13h', 'percusionista'),
  ('14', 'arpista'),
  ('15', 'pianista'),
  ('16', 'saxofonista'),
  ('17', 'intérprete de celesta'),
  ('20', 'cantante soprano'),
  ('20a', 'cantante'),
  ('21', 'guitarrista'),
  ('22a', 'acordeonista'),
  ('22b', 'bandoneonista'),
  ('23', 'coralista'),
  ('29', 'solista'),
  ('30', 'administración'),
  ('31', 'audiovisual'),
  ('32', 'escenario'),
  ('33', 'iluminación'),
  ('34', 'sonido'),
  ('35', 'transporte'),
  ('36', 'producción general'),
  ('37', 'chofer'),
  ('38', 'cantante barítono'),
  ('40', 'archivo'),
  ('41', 'proveedor'),
  ('49', 'compositor'),
  ('50', 'director'),
  ('51', 'director musical'),
  ('80', 'cantante mezzo'),
  ('81', 'cantante tenor'),
  ('90', 'menor'),
  ('91', 'acompañante menor'),
  ('93', 'acompañante')
) AS v(id, funcion)
WHERE instrumentos.id::text = v.id
  AND (instrumentos.funcion IS NULL OR btrim(instrumentos.funcion) = '');

-- Fallback: minúsculas del nombre del instrumento si quedó vacío
UPDATE public.instrumentos
SET funcion = lower(btrim(instrumento))
WHERE funcion IS NULL OR btrim(funcion) = '';

ALTER TABLE public.constancias_solicitudes
  ADD COLUMN IF NOT EXISTS snap_funcion text;

COMMENT ON COLUMN public.constancias_solicitudes.snap_funcion IS
  'Texto editable «como …» para PDF de convocatoria (p.ej. violinista, concertino).';

-- Backfill desde instrumentos.funcion vía nombre de instrumento del snapshot
UPDATE public.constancias_solicitudes c
SET snap_funcion = i.funcion
FROM public.instrumentos i
WHERE c.snap_funcion IS NULL
  AND c.snap_instrumento IS NOT NULL
  AND lower(btrim(i.instrumento)) = lower(btrim(c.snap_instrumento));

UPDATE public.constancias_solicitudes
SET snap_funcion = lower(btrim(snap_instrumento))
WHERE snap_funcion IS NULL
  AND snap_instrumento IS NOT NULL
  AND btrim(snap_instrumento) <> '';
