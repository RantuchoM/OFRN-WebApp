select l.id, l.localidad, r.region
from localidades l
left join regiones r on r.id = l.id_region
where l.localidad ilike '%Bariloche%'
   or l.localidad ilike '%Frutillar%'
   or l.localidad ilike '%Regina%'
   or l.localidad ilike '%Viedma%'
   or l.localidad ilike '%Cipolletti%'
   or l.localidad ilike '%Roca%'
   or l.localidad ilike '%Bols%n%'
   or l.localidad ilike '%Choele%'
   or l.localidad ilike '%San Antonio%'
   or l.localidad ilike '%SAO%'
   or l.localidad ilike '%orquinco%'
   or l.localidad ilike '%orquinco%'
order by l.localidad;
