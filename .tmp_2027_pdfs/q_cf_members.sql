select e.ensamble, count(ie.id_integrante) as miembros
from ensambles e
left join integrantes_ensambles ie on ie.id_ensamble = e.id
  and (ie.fecha_hasta is null or ie.fecha_hasta >= '2027-01-01')
where e.id in (583032, 195467, 226257, 1, 4, 7, 34640, 11, 10, 5)
group by e.ensamble
order by e.ensamble;
