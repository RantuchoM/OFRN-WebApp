-- fuentes de CF 01/26 (id 15) y un sinf full tipico
select p.id, p.nomenclador, p.nombre_gira, gf.tipo, gf.valor_id, gf.valor_texto, e.ensamble
from programas p
join giras_fuentes gf on gf.id_gira = p.id
left join ensambles e on e.id = gf.valor_id
where p.id in (15, 4, 5, 165)
order by p.id, gf.tipo, coalesce(e.ensamble, gf.valor_texto);
