/**
 * Particellas manuscritas de Glière corno Op. 91 sobre la obra 3649.
 * No crea otra obra. No toca concerto_participantes, votos ni ventanas.
 * Ignora la subcarpeta «Versión alternativa».
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import { driveFolderUrl, PARA_ACOMODAR_FOLDER_ID } from "./lib/haydnBachCatalog.mjs";
import {
  ALTERNATE_FOLDER_NAME,
  GLIERE_CORNO_WORK,
  PARA_ACOMODAR_ROOT,
} from "./lib/gliereCornoCatalog.mjs";
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

function localPdfFiles(dir) {
  return readdirSync(dir)
    .filter((name) => /\.pdf$/i.test(name))
    .map((name) => ({ name, webViewLink: null }));
}

async function discoverChildFolder(parentUrl, folderName) {
  const files = await listFolder(parentUrl);
  const needle = foldName(folderName);
  const hit = files.find((file) => {
    const isFolder = String(file.mimeType || "").includes("folder");
    return isFolder && foldName(file.name) === needle;
  });
  return hit || null;
}

async function discoverDriveFolderId() {
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  const hit = await discoverChildFolder(parentUrl, GLIERE_CORNO_WORK.targetFolder);
  if (!hit?.id) {
    throw new Error(
      `Drive todavía no lista ${GLIERE_CORNO_WORK.targetFolder}. Esperá el sync de Para acomodar.`,
    );
  }
  console.log(`Drive folder: ${hit.name} (${hit.id})`);
  return hit.id;
}

function mergeDriveLinks(localFiles, driveFiles) {
  const byName = new Map();
  for (const file of driveFiles) {
    const key = foldName(file.name);
    if (byName.has(key)) {
      throw new Error(`Nombre duplicado en la carpeta de la obra: ${file.name}`);
    }
    byName.set(key, file);
  }
  return localFiles.map((file) => {
    const hit = byName.get(foldName(file.name));
    if (!hit?.webViewLink) return file;
    return { ...file, webViewLink: hit.webViewLink, id: hit.id };
  });
}

function expandSharedPerc(parts, file, instrumentos) {
  const name = foldName(file.name || "");
  const pairs = [];
  if (name.includes("triangulo") && name.includes("tambor")) {
    pairs.push(["Perc Triángulo", "Perc Tambor"]);
  }
  if (name.includes("platillo") && name.includes("bombo")) {
    pairs.push(["Perc Platillos", "Perc Bombo"]);
  }
  if (!pairs.length) return;
  const perc = (instrumentos || []).find((item) => /percusi/i.test(item.instrumento || ""));
  const url = JSON.stringify([{ url: file.webViewLink, description: file.name }]);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const label = foldName(parts[i].nombre_archivo);
    if (
      (label.includes("triangulo") && label.includes("tambor")) ||
      (label.includes("platillo") && label.includes("bombo"))
    ) {
      parts.splice(i, 1);
    }
  }
  if (!perc) {
    console.warn("  Sin instrumento de percusión");
    return;
  }
  for (const [left, right] of pairs) {
    for (const label of [left, right]) {
      parts.push({
        id_instrumento: perc.id,
        nombre_archivo: label,
        instrumento_nombre: perc.instrumento,
        instrumento_abreviatura: perc.abreviatura ?? null,
        es_solista: false,
        url_archivo: file.webViewLink ? url : "[]",
      });
    }
  }
}

async function main() {
  const workDir = join(PARA_ACOMODAR_ROOT, GLIERE_CORNO_WORK.targetFolder);
  if (!existsSync(workDir)) throw new Error(`No existe ${workDir}`);
  const localFiles = localPdfFiles(workDir);
  const mitteldorfLeft = localFiles.filter((file) =>
    /^(SCORE|Corno Solo)\b|1y2|Pandereta/i.test(file.name),
  );
  if (mitteldorfLeft.length) {
    throw new Error(
      `Quedó edición Mitteldorf en la raíz: ${mitteldorfLeft.map((file) => file.name).join("; ")}`,
    );
  }
  console.log(`${localFiles.length} PDFs locales (raíz)`);
  const driveId = await discoverDriveFolderId();
  const link = driveFolderUrl(driveId);
  const driveEntries = await listFolder(link);
  const altFolder = driveEntries.find((file) => {
    const isFolder = String(file.mimeType || "").includes("folder");
    return isFolder && foldName(file.name) === foldName(ALTERNATE_FOLDER_NAME);
  });
  if (!altFolder?.id) {
    throw new Error("Drive no lista la carpeta Versión alternativa.");
  }
  const altUrl = driveFolderUrl(altFolder.id);
  const altFiles = await listFolder(altUrl);
  const altIds = new Set(altFiles.map((file) => file.id).filter(Boolean));
  const driveFiles = driveEntries.filter((file) => /\.pdf$/i.test(file.name || ""));
  const files = mergeDriveLinks(localFiles, driveFiles);
  const leaked = files.filter((file) => file.id && altIds.has(file.id));
  if (leaked.length) {
    throw new Error(
      `El seed iba a vincular archivos de Versión alternativa: ${leaked.map((file) => file.name).join("; ")}`,
    );
  }
  const missing = files.filter((file) => !file.webViewLink);
  if (missing.length) {
    throw new Error(
      `Faltan URLs de Drive (${missing.length}): ${missing.map((file) => file.name).join("; ")}`,
    );
  }

  const instrumentos = await fetchInstrumentos();
  const parts = [];
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name, "es"))) {
    const before = parts.length;
    appendSeedPartsFromFile(parts, file, instrumentos);
    expandSharedPerc(parts, file, instrumentos);
    if (parts.length === before) console.warn("  Sin match:", file.name);
  }
  if (parts.some((part) => part.es_solista || /score|pandereta|1y2/i.test(part.nombre_archivo || ""))) {
    throw new Error("El seed incluye score, solo, 1y2 o pandereta de la edición anterior.");
  }
  const inst = calculateInstrumentation(parts);
  console.log(`${parts.length} particellas | ${inst}`);
  console.log(`Versión alternativa: ${altUrl}`);

  let sql = `-- Glière corno Op. 91: particellas manuscritas de la obra 3649.
-- Mitteldorf/Maximov queda en «Versión alternativa» y no entra a obras_particellas.
-- No crea otra obra. No toca concerto_participantes, votos ni ventanas.
-- Generado: ${new Date().toISOString().slice(0, 10)}

UPDATE obras
SET link_drive = '${sqlEscape(link)}',
    observaciones = 'Edición manuscrita IMSLP #903959-#903985. Mitteldorf/Maximov quedó en la subcarpeta Versión alternativa, sin filas en obras_particellas.'
WHERE id = ${GLIERE_CORNO_WORK.obraId};

DELETE FROM obras_particellas WHERE id_obra = ${GLIERE_CORNO_WORK.obraId};

`;
  for (const part of parts) {
    sql += `INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (${GLIERE_CORNO_WORK.obraId}, '${sqlEscape(part.id_instrumento)}', '${sqlEscape(part.nombre_archivo)}', '${sqlEscape(part.url_archivo)}', ${part.es_solista ? "true" : "false"});
`;
  }
  sql += `
-- El trigger obras_particellas_sync_instrumentacion recalcula obras.instrumentacion.
-- Esperado por calculateInstrumentation: ${inst}
`;
  const out = "supabase/seed_gliere_corno_op91_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`Seed: ${out}`);
  console.log(`link_drive: ${link}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
