/**
 * Reemplaza obras_particellas de Weber fagot op.75 (obra 2337).
 * No inserta otra obra y no toca programas, giras ni playlists.
 */
import { readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import {
  WEBER_FAGOT_DIR,
  WEBER_FAGOT_DRIVE_FOLDER_ID,
  WEBER_FAGOT_WORK,
} from "./lib/weberFagotCatalog.mjs";
import {
  driveFolderUrl,
} from "./lib/haydnBachCatalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isCelloBassCombined(fileName) {
  return /violoncello y contrabajo/.test(foldName(fileName));
}

function pickInstr(instrumentos, pred) {
  return (instrumentos || []).find((i) => pred(i)) || null;
}

function ensureCelloAndBass(parts, file, instrumentos) {
  if (!isCelloBassCombined(file.name || "")) return;
  const url = JSON.stringify([
    { url: file.webViewLink, description: file.name },
  ]);
  const cello = pickInstr(instrumentos, (i) => /violoncello/i.test(i.instrumento || ""));
  const bass = pickInstr(instrumentos, (i) => /contrabajo/i.test(i.instrumento || ""));
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    if (foldName(parts[i].nombre_archivo).includes("violoncello y contrabajo")) {
      parts.splice(i, 1);
    }
  }
  const pushPart = (instr, label) => {
    if (!instr) return;
    parts.push({
      id_instrumento: instr.id,
      nombre_archivo: label,
      instrumento_nombre: instr.instrumento,
      instrumento_abreviatura: instr.abreviatura ?? null,
      es_solista: false,
      url_archivo: file.webViewLink ? url : "[]",
    });
  };
  pushPart(cello, "Violoncello");
  pushPart(bass, "Contrabajo");
}

function buildParts(files, instrumentos) {
  const parts = [];
  const pdfs = files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  for (const file of pdfs) {
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    ensureCelloAndBass(parts, file, instrumentos);
    console.log(`  ${file.name} → ${n} particella(s)`);
  }
  return collapseSameChairTranspositions(parts);
}

async function driveFiles() {
  const link = driveFolderUrl(WEBER_FAGOT_DRIVE_FOLDER_ID);
  const files = await listFolder(link);
  return { link, files: files.filter((f) => /\.pdf$/i.test(f.name || "")) };
}

function localFiles() {
  return readdirSync(WEBER_FAGOT_DIR)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

function mergeLinks(local, drive) {
  const byName = new Map(drive.map((f) => [foldName(f.name), f]));
  return local.map((f) => {
    const hit = byName.get(foldName(f.name));
    if (!hit?.webViewLink) return f;
    return { ...f, webViewLink: hit.webViewLink, id: hit.id };
  });
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const local = localFiles();
  console.log(`Local: ${local.length} PDFs`);
  const { link, files: drive } = await driveFiles();
  console.log(`Drive: ${drive.length} PDFs`);
  const files = mergeLinks(local, drive);
  const missing = files.filter((f) => !f.webViewLink).map((f) => f.name);
  if (missing.length) {
    console.error("Sin URL Drive:\n" + missing.join("\n"));
    process.exit(2);
  }
  const parts = buildParts(files, instrumentos);
  const solos = parts.filter((p) => p.es_solista);
  if (!solos.some((p) => /fagot/i.test(p.nombre_archivo))) {
    throw new Error("Falta el fagot solo en las particellas");
  }
  const ripieno = parts.filter(
    (p) => /fagot/i.test(p.nombre_archivo) && !p.es_solista,
  );
  if (ripieno.length < 2) {
    throw new Error(`Fagotes ripieno incompletos: ${ripieno.length}`);
  }
  const inst = calculateInstrumentation(parts);
  console.log(`${parts.length} particellas | ${inst}`);
  console.log(
    "Fagotes:",
    parts
      .filter((p) => /fagot/i.test(p.nombre_archivo))
      .map((p) => `${p.nombre_archivo}${p.es_solista ? " (solo)" : ""}`)
      .join(", "),
  );

  let sql = `-- Weber fagot op.75: reemplaza particellas de la obra 2337 (Breitkopf O.B. 4867).
-- No crea obra, no toca programas, giras ni playlists.
-- Generado: ${new Date().toISOString().slice(0, 10)}

DELETE FROM obras_particellas WHERE id_obra = 2337;

`;
  for (const p of parts) {
    const solista = p.es_solista ? "true" : "false";
    sql += `INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (2337, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});
`;
  }
  sql += `
-- El trigger obras_particellas_sync_instrumentacion recalcula obras.instrumentacion.
-- Esperado por calculateInstrumentation: ${inst}
`;
  const out = "supabase/seed_weber_fagot_op75_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`Seed: ${out}`);
  console.log(`link_drive: ${link}`);
  console.log("obra", WEBER_FAGOT_WORK.obraId);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
