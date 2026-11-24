-- ECAS y PILTRI son cuerdas: pasar del lote "viento" al lote "cuerdas" en Ciclo I y II.

UPDATE programas SET
  fecha_desde = '2027-05-05',
  fecha_hasta = '2027-05-09',
  subtitulo = 'Nueva música argentina · ensambles de cuerdas'
WHERE id IN (273, 281);

UPDATE programas SET
  fecha_desde = '2027-09-01',
  fecha_hasta = '2027-09-05',
  subtitulo = 'Ciclo II · ensambles de cuerdas'
WHERE id IN (274, 282);
