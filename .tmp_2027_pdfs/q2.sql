select id, ensamble, id_familia, id_localidad
from ensambles
where ensamble ilike '%CF%'
   or ensamble ilike '%ECAS%'
   or ensamble ilike '%Jazz%'
   or ensamble ilike '%CAV%'
   or ensamble ilike '%Viento%'
   or ensamble ilike '%Piltri%'
   or ensamble ilike '%Prod%'
order by ensamble;
