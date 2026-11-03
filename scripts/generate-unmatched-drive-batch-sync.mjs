/**
 * Lote «legacy sin match con Drive» (2024): crea obras + particellas desde carpetas Drive
 * y genera filas obras_repertorios_legacy para cada obra creada / rematcheada.
 *
 * Salidas:
 *   supabase/seed_unmatched_drive_batch_sync.sql                      (obras + compositores + particellas)
 *   supabase/.temp/import_obras_repertorios_legacy_unmatched_drive.sql (legacy, idempotente)
 *   supabase/.temp/unmatched_drive_batch_report.json
 *
 * Insumos: supabase/.temp/unmatched_drive_rows.json (xlsx «NO matcheadas» con link Drive)
 *          supabase/.temp/legacy_gira_meta_2024.json (scripts/_tmp_gira_meta.py)
 */
import fs from "node:fs";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartsFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
  sleep,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";
import {
  BATCH_WORKS,
  PRE_LABORDE_REMATCH,
  REMATCH_EXISTING,
} from "./lib/unmatchedDriveBatchCatalog.mjs";

const rows = JSON.parse(
  fs.readFileSync("supabase/.temp/unmatched_drive_rows.json", "utf8"),
);
const giraMeta = JSON.parse(
  fs.readFileSync("supabase/.temp/legacy_gira_meta_2024.json", "utf8"),
);
const FUENTE_2024 = "Partituras 2024 Rep";
const driveUrl = (id) => `https://drive.google.com/open?id=${id}`;

/** URL estable: si es shortcut, apuntar al archivo destino. */
function fileUrl(f) {
  const t = f.shortcutDetails?.targetId;
  return t ? `https://drive.google.com/file/d/${t}/view?usp=drivesdk` : f.webViewLink;
}
function isPdfFile(f) {
  if (!/\.pdf$/i.test(f.name || "")) return false;
  if (f.mimeType === "application/vnd.google-apps.folder") return false;
  return true;
}

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

async function buildParts(driveId, instrumentos, report) {
  const files = (await listFolder(driveUrl(driveId))).filter(isPdfFile);
  const parts = [];
  const unmatched = [];
  for (const file of files.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const list = suggestPartsFromDriveFile(file, instrumentos);
    if (!list.length) {
      unmatched.push(file.name);
      continue;
    }
    for (const s of list)
      parts.push({
        ...s,
        url_archivo: JSON.stringify([
          { url: fileUrl(file), description: file.name },
        ]),
      });
  }
  report.pdfs = files.length;
  report.sinMatch = unmatched;
  return dedupeParts(parts);
}

function personVars(people) {
  const m = new Map();
  for (const p of people) m.set(personKey(p), p);
  return m;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const report = { creadas: [], rematch: [], sinParticellas: [] };

  const allPeople = [];
  for (const w of BATCH_WORKS) {
    allPeople.push(...w.comps);
    if (w.arr) allPeople.push(w.arr);
  }
  const people = personVars(allPeople);

  let sql = `-- Lote legacy sin match con Drive (2024): obras + particellas
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- Idempotente: no inserta si ya existe obras.link_drive = carpeta original.

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

  for (const w of BATCH_WORKS) {
    const entry = { driveId: w.driveId, titulo: w.titulo };
    const parts = await buildParts(w.driveId, instrumentos, entry);
    entry.particellas = parts.length;
    await sleep(120);
    if (!parts.length) {
      report.sinParticellas.push(entry);
      console.warn("SIN PARTES", w.titulo);
      continue;
    }
    if (entry.sinMatch.length)
      console.warn(`  ${w.titulo}: sin match`, entry.sinMatch);
    const inst = calculateInstrumentation(parts);
    const link = driveUrl(w.driveId);
    const obs = w.obs
      ? `Legacy sin match (Drive). ${w.obs}`
      : "Legacy sin match (Drive) — carga automática lote 2024";
    const arrVar = w.arr ? `_p_${personVarSafe(personKey(w.arr))}` : "NULL";
    sql += `  -- ${w.titulo}
  IF NOT EXISTS (SELECT 1 FROM obras WHERE link_drive = '${sqlEscape(link)}') THEN
    INSERT INTO obras (titulo, id_arreglador, estado, observaciones, instrumentacion, link_drive)
    VALUES ('${sqlEscape(w.titulo)}', ${arrVar}, 'Oficial', '${sqlEscape(obs)}', '${sqlEscape(inst)}', '${sqlEscape(link)}')
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
    entry.instrumentacion = inst;
    report.creadas.push(entry);
    console.log(`${w.titulo}: ${parts.length} partes | ${inst}`);
  }
  sql += "END $$;\n";
  fs.writeFileSync("supabase/seed_unmatched_drive_batch_sync.sql", sql, "utf8");

  // ---------- legacy ----------
  const created = new Set(report.creadas.map((e) => e.driveId));
  const byId = new Map(BATCH_WORKS.map((w) => [w.driveId, w]));
  const rematchById = new Map(REMATCH_EXISTING.map((r) => [r.driveId, r]));
  const preLab = new Map(PRE_LABORDE_REMATCH.map((r) => [r.titulo, r.idObra]));

  const legacy = [
    "-- Legacy programas para el lote Drive sin match (2024). Idempotente.",
    "BEGIN;",
  ];
  const legacyReport = { ok: [], fail: [] };
  const esc = (s) => (s == null || s === "" ? "NULL" : `'${sqlEscape(s)}'`);

  for (const r of rows) {
    if (r.anio !== 2024) {
      legacyReport.fail.push({
        gira: r.gira,
        titulo: r.titulo,
        motivo:
          "2023: el id Drive es un archivo AUDIO (.mp3) suelto, sin particellas/PDF → no se creó obra",
      });
      continue;
    }
    const meta = giraMeta[r.gira];
    if (!meta) {
      legacyReport.fail.push({ gira: r.gira, titulo: r.titulo, motivo: "sin metadatos de gira" });
      continue;
    }
    let idExpr = null;
    let driveCols = ["NULL", "NULL"];
    let via = "";
    if (created.has(r.id)) {
      idExpr = `(SELECT id FROM obras WHERE link_drive = '${sqlEscape(driveUrl(r.id))}' ORDER BY id LIMIT 1)`;
      driveCols = [esc(r.id), esc(driveUrl(r.id))];
      via = "obra creada";
    } else if (rematchById.has(r.id)) {
      idExpr = String(rematchById.get(r.id).idObra);
      via = "rematch obra existente";
    } else if (preLab.has(r.titulo) && /Pre-Laborde/.test(r.gira)) {
      idExpr = String(preLab.get(r.titulo));
      via = "rematch compositor+título (link del Excel = carpeta raíz de la gira)";
    }
    if (!idExpr) {
      let motivo = "sin obra";
      if (/Pre-Laborde/.test(r.gira))
        motivo = "Pre-Laborde: link = carpeta raíz de la gira y hay 2+ obras candidatas (Himno RN cuerdas 1405/1410, Himno Nacional cuerdas 1495/1496) → ambiguo";
      else if (byId.has(r.id)) motivo = "obra no creada (sin particellas)";
      else motivo = "carpeta Drive no accesible (service account: File not found)";
      legacyReport.fail.push({ gira: r.gira, titulo: r.titulo, motivo });
      continue;
    }
    const idSqlWhere = idExpr.startsWith("(") ? idExpr : idExpr;
    legacy.push(
      `INSERT INTO obras_repertorios_legacy (id_obra, drive_folder_id, link_drive, nombre_gira, fecha_desde, fecha_hasta, tipo, zona, nomenclador, mes_letra, ensambles, fuente) ` +
        `SELECT ${idSqlWhere}, ${driveCols[0]}, ${driveCols[1]}, ${esc(r.gira)}, '${meta.fecha_desde}'::date, '${meta.fecha_hasta}'::date, ${esc(meta.tipo)}, ${esc(meta.zona)}, ${esc(meta.nomenclador)}, ${esc(meta.mes_letra)}, ${esc(meta.ensambles)}, ${esc(FUENTE_2024)} ` +
        `WHERE ${idSqlWhere} IS NOT NULL AND NOT EXISTS (SELECT 1 FROM obras_repertorios_legacy x WHERE x.id_obra = ${idSqlWhere} AND x.nombre_gira = ${esc(r.gira)} AND x.fecha_desde IS NOT DISTINCT FROM '${meta.fecha_desde}'::date AND x.fuente = ${esc(FUENTE_2024)});`,
    );
    legacyReport.ok.push({ gira: r.gira, titulo: r.titulo, via, id: idExpr.slice(0, 12) });
  }
  legacy.push("COMMIT;");
  fs.writeFileSync(
    "supabase/.temp/import_obras_repertorios_legacy_unmatched_drive.sql",
    legacy.join("\n") + "\n",
    "utf8",
  );
  report.legacy = legacyReport;
  fs.writeFileSync(
    "supabase/.temp/unmatched_drive_batch_report.json",
    JSON.stringify(report, null, 1),
  );
  console.log(
    `\nObras a crear: ${report.creadas.length}; sin partes: ${report.sinParticellas.length}; legacy ok: ${legacyReport.ok.length}; legacy fail: ${legacyReport.fail.length}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
