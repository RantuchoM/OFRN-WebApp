import fs from "node:fs";

const sql = `select id, ensamble from ensambles
where id in (195467, 226257, 525765, 583032)
order by ensamble;

select p.id, p.nombre_gira, p.fecha_desde::text,
  coalesce((
    select string_agg(
      gf.tipo || ':' || coalesce(e.ensamble, gf.valor_texto, gf.valor_id::text),
      ' | ' order by gf.tipo, coalesce(e.ensamble, gf.valor_texto)
    )
    from giras_fuentes gf
    left join ensambles e on e.id = gf.valor_id
    where gf.id_gira = p.id
  ), '') as fuentes
from programas p
where coalesce(p.subtitulo,'') like '%[seed:giras2027-sinf-cf]%'
order by p.fecha_desde;
`;
const path = new URL("./q_cf_names.sql", import.meta.url);
fs.writeFileSync(path, sql);
const buf = fs.readFileSync(path);
if (buf[0] === 0xef) fs.writeFileSync(path, buf.slice(3));
console.log("ok");
