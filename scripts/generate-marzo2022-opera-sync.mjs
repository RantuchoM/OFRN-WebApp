/**
 * Gira 2022 Marzo 9-12 (Ópera a la carta) + Lin Calel: obras + particellas + legacy.
 * Lee carpetas canónicas desde Drive (service account vía manage-drive) y genera:
 *   supabase/seed_marzo2022_opera_sync.sql   (obras, compositores, particellas, legacy; idempotente)
 *
 * Uso: tras process-marzo2022-opera-local.mjs y el sync de Drive File Stream:
 *   node scripts/generate-marzo2022-opera-sync.mjs
 */
import fs from "node:fs";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartsFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";
import {
  COPY_WORKS,
  GIRA_LEGACY,
  LIN_CALEL_WORK,
  PARA_ACOMODAR_DRIVE_ROOT,
  foldName,
} from "./lib/marzo2022OperaCatalog.mjs";

const driveUrl = (id) => `https://drive.google.com/open?id=${id}`;
const fileUrl = (f) => {
  const t = f.shortcutDetails?.targetId;
  return t ? `https://drive.google.com/file/d/${t}/view?usp=drivesdk` : f.webViewLink;
};

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (map.has(key)) {
      const ex = map.get(key);
      ex.url_archivo = JSON.stringify([
        ...JSON.parse(ex.url_archivo),
        ...JSON.parse(p.url_archivo),
      ]);
    } else map.set(key, { ...p });
  }
  return [...map.values()];
}

/** Hojas compartidas por dos sillas distintas que el matcher no divide. */
function manualExpansion(file, instrumentos) {
  const n = foldName(file.name);
  const byId = (id) => instrumentos.find((i) => String(i.id) === id);
  const mk = (id, nombre) => ({
    id_instrumento: id,
    nombre_archivo: nombre,
    instrumento_nombre: byId(id)?.instrumento,
    es_solista: false,
  });
  if (/^violoncello y contrabajo - /.test(n))
    return [mk("03", "Violoncello"), mk("04", "Contrabajo")];
  if (/^oboe 2 y corno ingles - /.test(n))
    return [mk("06", "Oboe 2"), mk("06b", "Corno Inglés")];
  return null;
}

async function buildParts(folderId, instrumentos, entry) {
  const files = (await listFolder(driveUrl(folderId))).filter(
    (f) => /\.pdf$/i.test(f.name || "") && f.mimeType !== "application/vnd.google-apps.folder",
  );
  const parts = [];
  entry.sinMatch = [];
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name, "es"))) {
    const list = manualExpansion(file, instrumentos) || suggestPartsFromDriveFile(file, instrumentos);
    if (!list.length) {
      entry.sinMatch.push(file.name);
      continue;
    }
    for (const s of list)
      parts.push({
        ...s,
        url_archivo: JSON.stringify([{ url: fileUrl(file), description: file.name }]),
      });
  }
  entry.pdfs = files.length;
  return dedupeParts(parts);
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const root = await listFolder(PARA_ACOMODAR_DRIVE_ROOT);

  const works = [];
  for (const w of COPY_WORKS) {
    const hit = root.find(
      (f) => f.mimeType?.includes("folder") && foldName(f.name) === foldName(w.targetFolder),
    );
    if (!hit) {
      console.error("Carpeta no visible en Drive todavía:", w.targetFolder);
      works.push({ ...w, driveId: null });
      continue;
    }
    works.push({
      ...w,
      driveId: hit.id,
      obs: `Gira 2022 Marzo 9-12 (Ópera a la carta), grupo ${w.prefix}. Copia canónica en Para acomodar desde GIRAS 2022 / PARTICELLAS + SCORES.`,
    });
  }
  works.push({ ...LIN_CALEL_WORK, prefix: "10" });

  const people = new Map();
  for (const w of works) {
    for (const c of w.comps) people.set(personKey(c), c);
    if (w.arr) people.set(personKey(w.arr), w.arr);
  }

  let sql = `-- Gira 2022 Marzo 9-12 (Ópera a la carta) + Lin Calel: obras + particellas + legacy
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- Idempotente: no inserta si ya existe obras.link_drive = carpeta.
BEGIN;
DO $$
DECLARE
  _id_obra bigint;
  ${[...people.keys()].map((k) => `_p_${personVarSafe(k)} bigint`).join(";\n  ")};
BEGIN
`;
  for (const [key, c] of people) {
    const safe = personVarSafe(key);
    const ap = sqlEscape(c.apellido);
    const nom = c.nombre ? `'${sqlEscape(c.nombre)}'` : "NULL";
    sql += `  SELECT id INTO _p_${safe} FROM compositores WHERE apellido = '${ap}' AND (nombre = ${nom} OR (nombre IS NULL AND ${nom} IS NULL)) ORDER BY id LIMIT 1;
  IF _p_${safe} IS NULL THEN
    INSERT INTO compositores (apellido, nombre) VALUES ('${ap}', ${nom}) RETURNING id INTO _p_${safe};
  END IF;
`;
  }
  sql += "\n";

  const report = { creadas: [], fallidas: [] };
  const linkByPrefix = {};
  for (const w of works) {
    const entry = { prefix: w.prefix, titulo: w.titulo, driveId: w.driveId };
    if (!w.driveId) {
      report.fallidas.push({ ...entry, motivo: "carpeta no visible en Drive" });
      continue;
    }
    const parts = await buildParts(w.driveId, instrumentos, entry);
    if (!parts.length) {
      report.fallidas.push({ ...entry, motivo: "sin particellas" });
      continue;
    }
    const inst = calculateInstrumentation(parts);
    const link = driveUrl(w.driveId);
    linkByPrefix[w.prefix] = link;
    const arrVar = w.arr ? `_p_${personVarSafe(personKey(w.arr))}` : "NULL";
    sql += `  -- ${w.prefix}. ${w.titulo}
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = '${sqlEscape(link)}') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('${sqlEscape(w.titulo)}', ${arrVar}, 'Oficial', '${sqlEscape(w.obs)}', '${sqlEscape(inst)}', '${sqlEscape(link)}')
    RETURNING id INTO _id_obra;
`;
    for (const c of w.comps)
      sql += `    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, _p_${personVarSafe(personKey(c))}, 'compositor');\n`;
    if (w.arr)
      sql += `    INSERT INTO obras_compositores (id_obra, id_compositor, rol) VALUES (_id_obra, ${arrVar}, 'arreglador');\n`;
    for (const p of parts)
      sql += `    INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
    VALUES (_id_obra, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${p.es_solista ? "true" : "false"});\n`;
    sql += `  END IF;\n\n`;
    Object.assign(entry, { particellas: parts.length, instrumentacion: inst });
    report.creadas.push(entry);
    console.log(`${w.prefix} ${w.titulo}: ${entry.pdfs} PDFs → ${parts.length} particellas | ${inst}`);
    if (entry.sinMatch.length) console.warn("  sin match:", entry.sinMatch);
  }
  sql += "END $$;\n\n";

  // ---------- legacy ----------
  const g = GIRA_LEGACY;
  const esc = (s) => (s == null || s === "" ? "NULL" : `'${sqlEscape(s)}'`);
  for (const e of report.creadas) {
    const link = linkByPrefix[e.prefix];
    const idExpr = `(SELECT id FROM obras WHERE link_drive = '${sqlEscape(link)}' ORDER BY id LIMIT 1)`;
    sql += `INSERT INTO obras_repertorios_legacy (id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles, fuente) ` +
      `SELECT ${idExpr}, ${esc(e.driveId)}, ${esc(link)}, ${esc(g.nombre_gira)}, '${g.fecha_desde}'::date, '${g.fecha_hasta}'::date, ${esc(g.tipo)}, ${esc(g.zona)}, ${esc(g.nomenclador)}, ${esc(g.mes_letra)}, ${esc(g.ensambles)}, ${esc(g.fuente)} ` +
      `WHERE ${idExpr} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM obras_repertorios_legacy x WHERE x.id_obra = ${idExpr} AND x.nombre_gira = ${esc(g.nombre_gira)} AND x.fecha_desde = '${g.fecha_desde}'::date AND x.fuente = ${esc(g.fuente)});\n`;
  }
  sql += "COMMIT;\n";
  fs.writeFileSync("supabase/seed_marzo2022_opera_sync.sql", sql, "utf8");
  fs.writeFileSync("supabase/.temp/marzo2022_opera_report.json", JSON.stringify(report, null, 1));
  console.log(`\nCreadas: ${report.creadas.length}; fallidas: ${report.fallidas.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
