UPDATE public.ensamble_proyeccion_config
SET
  tramos = '[
    {"desde":"2027-02-01","hasta":"2027-07-05","nota":null},
    {"desde":"2027-07-26","hasta":"2027-12-13","nota":"Vacaciones / corte"}
  ]'::jsonb,
  updated_at = now()
WHERE anio = 2027
RETURNING anio, tramos::text;
