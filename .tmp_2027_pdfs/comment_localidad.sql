COMMENT ON TABLE public.ensamble_proyeccion_ensayos IS
  'Plantilla semanal de ensayos (iso_dow 1=lunes…7=domingo; id_localidad = localidad del ensayo) para proyección PCV/prestaciones; precarga desde semana modelo oct/2026.';

COMMENT ON COLUMN public.ensamble_proyeccion_ensayos.id_localidad IS
  'Localidad del ensayo (tabla localidades). En el seed: casa del ensamble (ensambles.id_localidad), porque eventos no tiene id_localidad.';
