/**
 * Vincula las 4 partes del Cuarteto Nro. 1 de Villa-Lobos a la solicitud 3650.
 * No crea otra obra ni la asocia a programa/gira.
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  VILLA_LOBOS_SQ1_WORK,
  driveFolderUrl,
} from "./lib/villaLobosSq1Catalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

const work = VILLA_LOBOS_SQ1_WORK;

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

async function discoverDriveFolderId() {
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  const files = await listFolder(parentUrl);
  const needle = foldName(work.targetFolder);
  const hit = files.find((file) => {
    const isFolder = String(file.mimeType || "").includes("folder");
    return isFolder && foldName(file.name) === needle;
  });
  if (!hit?.id) {
    throw new Error(
      `Drive todavía no lista ${work.targetFolder}. Esperá el sync de Para acomodar.`,
    );
  }
  console.log(`Drive folder: ${hit.name} (${hit.id})`);
  return hit.id;
}

function mergeDriveLinks(localFiles, driveFiles) {
  const byName = new Map(
    (driveFiles || []).map((file) => [foldName(file.name), file]),
  );
  return localFiles.map((file) => {
    const hit = byName.get(foldName(file.name));
    if (!hit?.webViewLink) return file;
    return { ...file, webViewLink: hit.webViewLink, id: hit.id };
  });
}

async function main() {
  const workDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (!existsSync(workDir)) throw new Error(`No existe ${workDir}`);
  const localFiles = localPdfFiles(workDir);
  console.log(`${localFiles.length} PDFs locales`);
  const driveId = await discoverDriveFolderId();
  const link = driveFolderUrl(driveId);
  const driveFiles = (await listFolder(link)).filter((file) =>
    /\.pdf$/i.test(file.name || ""),
  );
  const files = mergeDriveLinks(localFiles, driveFiles);
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
    if (parts.length === before) console.warn("  Sin match:", file.name);
    else console.log(`  ${file.name} → ${parts.length - before}`);
  }
  const inst = calculateInstrumentation(parts);
  console.log(`${parts.length} particellas | ${inst}`);

  let sql = `-- Villa-Lobos — Cuarteto de Cuerdas Nro. 1, W099 → obra ${work.obraId}
-- Partes IMSLP #608902–#608905 (Mvrasaki, CC BY 4.0).
-- SCORE Southern 1953 IMSLP #327723 (PD en esta jurisdicción; IMSLP lo marca Non-PD US/EU).
-- No crea otra obra. No toca repertorio_obras ni seating.
-- Generado: ${new Date().toISOString().slice(0, 10)}

UPDATE obras
SET titulo = '${sqlEscape(work.tituloDb)}',
    link_drive = '${sqlEscape(link)}',
    observaciones = '${sqlEscape(
      "Para acomodar. Partes IMSLP #608902–#608905 (Mvrasaki, CC BY 4.0). SCORE Southern 1953 #327723.",
    )}',
    anio_composicion = ${work.anio},
    duracion_segundos = ${work.duracionSegundos},
    estado = 'Oficial'
WHERE id = ${work.obraId};

DELETE FROM obras_particellas WHERE id_obra = ${work.obraId};

`;
  for (const part of parts) {
    sql += `INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (${work.obraId}, '${sqlEscape(part.id_instrumento)}', '${sqlEscape(part.nombre_archivo)}', '${sqlEscape(part.url_archivo)}', ${part.es_solista ? "true" : "false"});
`;
  }
  sql += `
-- El trigger obras_particellas_sync_instrumentacion recalcula obras.instrumentacion.
-- Esperado por calculateInstrumentation: ${inst}
`;
  const out = "supabase/seed_villa_lobos_sq1_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`Seed: ${out}`);
  console.log(`Drive: ${link}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
