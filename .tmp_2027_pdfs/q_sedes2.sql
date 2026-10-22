select gl.id_gira, p.nomenclador, p.zona, l.id as id_loc, l.localidad
from giras_localidades gl
join programas p on p.id = gl.id_gira
join localidades l on l.id = gl.id_localidad
where p.id in (4, 2, 21, 5, 12, 15)
order by p.id, l.localidad;
