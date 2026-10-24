-- Feriados nacionales y días no laborables Argentina 2027
-- Fuente: Ley 27.399 + calendario oficial (argentina.gob.ar/feriados).
-- Incluye: inamovibles, trasladables (art. 6), Jueves Santo (día no laborable).
-- Excluye: festividades religiosas opcionales (judías/islámicas art. 2–3).
-- Feriados turísticos art. 7: aún no fijados para 2027 (sin resolución BO).

INSERT INTO public.feriados (fecha, detalle, es_feriado)
VALUES
  -- Inamovibles
  ('2027-01-01', 'Año Nuevo', true),
  ('2027-02-08', 'Carnaval', true),
  ('2027-02-09', 'Carnaval', true),
  ('2027-03-24', 'Día Nacional de la Memoria por la Verdad y la Justicia', true),
  ('2027-03-26', 'Viernes Santo', true),
  ('2027-04-02', 'Día del Veterano y de los Caídos en la Guerra de Malvinas', true),
  ('2027-05-01', 'Día del Trabajador', true),
  ('2027-05-25', 'Día de la Revolución de Mayo', true),
  ('2027-06-20', 'Paso a la Inmortalidad del General Manuel Belgrano', true),
  ('2027-07-09', 'Día de la Independencia', true),
  ('2027-12-08', 'Día de la Inmaculada Concepción de María', true),
  ('2027-12-25', 'Navidad', true),
  -- Trasladables (art. 6 Ley 27.399)
  ('2027-06-21', 'Paso a la Inmortalidad del General Martín Miguel de Güemes', true),
  ('2027-08-16', 'Paso a la Inmortalidad del General José de San Martín', true),
  ('2027-10-11', 'Día del Respeto a la Diversidad Cultural', true),
  ('2027-11-20', 'Día de la Soberanía Nacional', true),
  -- Día no laborable (art. 2 — Jueves Santo; no feriado)
  ('2027-03-25', 'Jueves Santo', false)
ON CONFLICT (fecha) DO UPDATE
SET detalle = EXCLUDED.detalle,
    es_feriado = EXCLUDED.es_feriado;
