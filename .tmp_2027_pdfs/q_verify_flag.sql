SELECT ensamble, es_ensamble_local
FROM public.ensambles
ORDER BY ensamble;

SELECT anio, servicios_por_gira, tramos
FROM public.ensamble_proyeccion_config;

SELECT localidad, alias
FROM public.localidades
WHERE alias IS NOT NULL
ORDER BY localidad;
