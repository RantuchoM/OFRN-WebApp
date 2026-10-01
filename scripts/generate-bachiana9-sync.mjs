/**
 * Vincula las partes de Bachiana brasileira Nro. 9, W449 a la obra 3654.
 * No crea otra obra ni toca repertorio_obras.
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  BACHIANA9_WORK,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/bachiana9Catalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

const work = BACHIANA9_WORK;

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
  const link = driveFolderUrl(work.driveFolderId);
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

  let sql = `-- Villa-Lobos — Bachiana brasileira Nro. 9, W449 → obra ${work.obraId}
-- Partes de cuerdas IMSLP #569700–#569705 (PMLP898487).
-- Viola y contrabajo: se excluyó la portada de título (página 1).
-- No crea otra obra. No toca repertorio_obras ni la obra 3254 (solo el preludio).
-- Generado: ${new Date().toISOString().slice(0, 10)}

UPDATE obras
SET titulo = '${sqlEscape(work.tituloDb)}',
    link_drive = '${sqlEscape(link)}',
    observaciones = '${sqlEscape(
      "Para acomodar. Partes de cuerdas IMSLP #569700–#569705 (PMLP898487). Viola y contrabajo sin portada de título.",
    )}'
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
  const out = "supabase/seed_bachiana9_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`Seed: ${out}`);
  console.log(`Drive: ${link}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
