select i.id, i.apellido, i.nombre, i.condicion, inst.instrumento, inst.familia
from integrantes i
left join instrumentos inst on inst.id = i.id_instr
where i.nombre ilike '%natacha%' or i.apellido ilike '%natacha%'
   or (i.nombre ilike '%natasha%') or (i.apellido || ' ' || i.nombre) ilike '%natacha%'
order by i.apellido, i.nombre
limit 20;
