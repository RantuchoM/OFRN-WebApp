select id, nombre_gira, fecha_desde::text
from programas
where nombre_gira in (
  'Apertura de temporada: Mahler y Wagner',
  'Beethoven 200 años',
  'Directora mujer: Andrea Vela / Cinthia Aliretti',
  'Rusia',
  'B y W.',
  'Cuerdas CFMon',
  'Gala lírica italiana / Strauss',
  'Mannheim — Choele Choel y SAO',
  'Mannheim — Viedma (agosto)',
  'Beethoven 200 años x 3',
  'FIMBA 2027',
  'Mannheim — Viedma (octubre)',
  'Director invitado — Cipolletti y Regina',
  'Obras Juan Falú',
  'Linues Lerner',
  'Sinfónico-Coral'
)
order by nombre_gira;