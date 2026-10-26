/**
 * Aplica giras Sinfónico / Camerata Filarmónica 2027 (Borrador) a la DB linked.
 * Idempotente: si ya existe el primer programa del listado en 2027, aborta.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { PROGRAMAS } from "./preview-giras-2027.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outSql = path.join(__dirname, "..", "supabase", "seed_giras_2027_sinf_cf.sql");

function sqlStr(v) {
  if (v == null) return "NULL";
  return `'${String(v).replace(/'/g, "''")}'`;
}

function addMinutes(hhmm, mins) {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + mins;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

const lines = [];
const firstNombre = PROGRAMAS[0]?.nombre || "Apertura de temporada: Mahler y Wagner";

lines.push(`-- Giras Sinfónico / Camerata Filarmónica 2027`);
lines.push(`-- Generado por scripts/apply-giras-2027.mjs — ${new Date().toISOString()}`);
lines.push(`DO $$`);
lines.push(`DECLARE`);
lines.push(`  v_existing int;`);
lines.push(`  v_gid bigint;`);
lines.push(`BEGIN`);
lines.push(`  SELECT count(*) INTO v_existing`);
lines.push(`  FROM public.programas`);
lines.push(`  WHERE nombre_gira = ${sqlStr(firstNombre)}`);
lines.push(`    AND fecha_desde >= DATE '2027-01-01'`);
lines.push(`    AND fecha_desde <= DATE '2027-12-31';`);
lines.push(`  IF v_existing > 0 THEN`);
lines.push(`    RAISE EXCEPTION 'Ya existe programa % en 2027 — aborto (idempotencia)', ${sqlStr(firstNombre)};`);
lines.push(`  END IF;`);
lines.push(``);

for (const p of PROGRAMAS) {
  const subtitulo = p.nota_localia || null;

  lines.push(`  -- Programa #${p.num}: ${p.nombre.replace(/'/g, "''")}`);
  lines.push(`  INSERT INTO public.programas (`);
  lines.push(`    nombre_gira, fecha_desde, fecha_hasta, tipo, zona, estado, subtitulo`);
  lines.push(`  ) VALUES (`);
  lines.push(`    ${sqlStr(p.nombre)},`);
  lines.push(`    ${sqlStr(p.desde)}::date,`);
  lines.push(`    ${sqlStr(p.hasta)}::date,`);
  lines.push(`    ${sqlStr(p.tipo)}::tipo_programa,`);
  lines.push(`    ${sqlStr(p.zona)},`);
  lines.push(`    'Borrador'::estado_gira,`);
  lines.push(`    ${sqlStr(subtitulo)}`);
  lines.push(`  ) RETURNING id INTO v_gid;`);
  lines.push(``);

  for (const loc of p.localias) {
    if (loc.id == null) continue;
    lines.push(
      `  INSERT INTO public.giras_localidades (id_gira, id_localidad) VALUES (v_gid, ${loc.id});`,
    );
  }
  lines.push(``);

  for (const f of p.fuentes) {
    if (f.tipo === "FAMILIA") {
      lines.push(
        `  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'FAMILIA', NULL, ${sqlStr(f.label)});`,
      );
    } else if (f.tipo === "ENSAMBLE") {
      lines.push(
        `  INSERT INTO public.giras_fuentes (id_gira, tipo, valor_id, valor_texto) VALUES (v_gid, 'ENSAMBLE', ${f.id}, NULL);`,
      );
    }
  }
  lines.push(``);

  for (const per of p.personas || []) {
    lines.push(`  INSERT INTO public.giras_integrantes (id_gira, id_integrante, estado, rol)`);
    lines.push(
      `  VALUES (v_gid, ${per.id}, ${sqlStr(per.estado || "confirmado")}, ${sqlStr(per.rol || "musico")});`,
    );
  }
  if ((p.personas || []).length) lines.push(``);

  for (const c of p.conciertos) {
    const hora = c.hora_inicio || "20:00";
    const horaFin = addMinutes(hora, 90);
    const obs = c.nota || null;
    lines.push(`  INSERT INTO public.eventos (`);
    lines.push(
      `    id_gira, id_tipo_evento, fecha, hora_inicio, hora_fin, descripcion,`,
    );
    lines.push(
      `    observaciones_internas, is_deleted, visible_agenda, tecnica`,
    );
    lines.push(`  ) VALUES (`);
    lines.push(`    v_gid,`);
    lines.push(`    1,`);
    lines.push(`    ${sqlStr(c.fecha)}::date,`);
    lines.push(`    ${sqlStr(hora)}::time,`);
    lines.push(`    ${sqlStr(horaFin)}::time,`);
    lines.push(`    ${sqlStr(c.descripcion || "Concierto Principal")},`);
    lines.push(`    ${sqlStr(obs)},`);
    lines.push(`    false,`);
    lines.push(`    true,`);
    lines.push(`    false`);
    lines.push(`  );`);
  }
  lines.push(``);
}

lines.push(`END $$;`);

fs.writeFileSync(outSql, lines.join("\n"), "utf8");
console.log("Wrote", outSql);

const r = spawnSync(
  "npx",
  ["supabase", "db", "query", "--linked", "-f", outSql],
  { encoding: "utf8", shell: true, cwd: path.join(__dirname, "..") },
);
if (r.stdout) console.log(r.stdout);
if (r.stderr) console.error(r.stderr);
if (r.status !== 0) {
  console.error("apply failed", r.status);
  process.exit(r.status || 1);
}
console.log("OK applied");

const verifySql = path.join(__dirname, "..", ".tmp_2027_pdfs", "verify_giras_2027.sql");
fs.writeFileSync(
  verifySql,
  `SELECT p.id, p.nombre_gira, p.tipo::text, p.zona, p.fecha_desde::text, p.fecha_hasta::text, p.estado::text,
    (SELECT count(*) FROM giras_fuentes gf WHERE gf.id_gira = p.id) AS n_fuentes,
    (SELECT count(*) FROM giras_localidades gl WHERE gl.id_gira = p.id) AS n_localias,
    (SELECT count(*) FROM eventos e WHERE e.id_gira = p.id AND e.id_tipo_evento = 1 AND coalesce(e.is_deleted,false)=false) AS n_conciertos
  FROM public.programas p
  WHERE coalesce(p.subtitulo, '') LIKE '%${SEED_TAG.replace(/'/g, "''")}%'
  ORDER BY p.fecha_desde, p.id;`,
  "utf8",
);
const v = spawnSync(
  "npx",
  ["supabase", "db", "query", "--linked", "-f", verifySql],
  { encoding: "utf8", shell: true, cwd: path.join(__dirname, "..") },
);
if (v.stdout) console.log(v.stdout);
if (v.stderr) console.error(v.stderr);
if (v.status !== 0) process.exit(v.status || 1);
