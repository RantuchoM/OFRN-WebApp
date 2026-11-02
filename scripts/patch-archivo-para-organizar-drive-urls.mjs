/**
 * Tras paginar list_folder_files: actualiza link_drive + url_archivo de las
 * obras #3707–#3740 del lote Archivo-para-organizar que quedaron sin carpeta.
 *
 *   node scripts/patch-archivo-para-organizar-drive-urls.mjs [--dry-run]
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  ARCHIVO_PARA_ORGANIZAR_WORKS,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/archivoParaOrganizarCatalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sleep,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

const dryRun = process.argv.includes("--dry-run");

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[—–−]/g, "-")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function localWorkDir(work) {
  const target = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (existsSync(target)) return target;
  if (!existsSync(PARA_ACOMODAR_ROOT)) return null;
  const needle = foldName(work.targetFolder);
  const hit = readdirSync(PARA_ACOMODAR_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && foldName(d.name) === needle)
    .map((d) => d.name)[0];
  return hit ? join(PARA_ACOMODAR_ROOT, hit) : null;
}

function localPdfFiles(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

function mergeDriveLinks(localFiles, driveFiles) {
  const byName = new Map((driveFiles || []).map((f) => [foldName(f.name), f]));
  return localFiles.map((f) => {
    const hit = byName.get(foldName(f.name));
    if (!hit?.webViewLink) return f;
    return { ...f, webViewLink: hit.webViewLink, id: hit.id };
  });
}

function buildParts(files, instrumentos) {
  const parts = [];
  for (const file of files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"))) {
    appendSeedPartsFromFile(parts, file, instrumentos);
  }
  return parts;
}

async function main() {
  const parentFiles = await listFolder(driveFolderUrl(PARA_ACOMODAR_FOLDER_ID));
  console.log(`Para acomodar Drive: ${parentFiles.length} entradas`);
  const instrumentos = await fetchInstrumentos();

  const stmts = [];
  let updated = 0;
  let stillMissing = 0;

  for (const work of ARCHIVO_PARA_ORGANIZAR_WORKS) {
    const needle = foldName(work.targetFolder);
    let folder = parentFiles.find((f) => foldName(f.name) === needle);
    // Fallback: prefijo largo solo si es único entre candidatos
    if (!folder) {
      const prefix = needle.slice(0, Math.min(36, needle.length));
      const cands = parentFiles.filter((f) => foldName(f.name).startsWith(prefix));
      if (cands.length === 1) folder = cands[0];
    }
    if (!folder?.id) {
      console.warn(`  Sin carpeta Drive: ${work.targetFolder}`);
      stillMissing += 1;
      continue;
    }

    const dir = localWorkDir(work);
    let files = localPdfFiles(dir);
    try {
      const driveFiles = await listFolder(driveFolderUrl(folder.id));
      files = mergeDriveLinks(files, driveFiles);
      await sleep(150);
    } catch (e) {
      console.warn(`  list ${work.key}:`, e.message);
    }

    const withUrl = files.filter((f) => f.webViewLink).length;
    const parts = buildParts(files, instrumentos);
    const titulo = work.tituloHtml || work.titulo;
    const obs = work.observaciones;
    const link = driveFolderUrl(folder.id);

    console.log(
      `  ${work.key}: folder=${folder.id.slice(0, 8)}… pdfs=${files.length} urls=${withUrl} parts=${parts.length}`,
    );

    stmts.push(`-- ${work.key}`);
    stmts.push(`UPDATE obras
SET link_drive = '${sqlEscape(link)}'
WHERE observaciones = '${sqlEscape(obs)}'
  AND titulo = '${sqlEscape(titulo)}'
  AND (link_drive IS NULL OR link_drive LIKE '%${PARA_ACOMODAR_FOLDER_ID}%');`);

    for (const p of parts) {
      if (!p.url_archivo || p.url_archivo === "[]") continue;
      stmts.push(`UPDATE obras_particellas op
SET url_archivo = '${sqlEscape(p.url_archivo)}'
FROM obras o
WHERE op.id_obra = o.id
  AND o.observaciones = '${sqlEscape(obs)}'
  AND o.titulo = '${sqlEscape(titulo)}'
  AND op.nombre_archivo = '${sqlEscape(p.nombre_archivo)}'
  AND (op.url_archivo IS NULL OR op.url_archivo = '[]' OR op.url_archivo = '');`);
    }
    updated += 1;
  }

  const sql = `-- Patch Drive URLs lote Archivo-para-organizar
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- Carpetas vistas: ${parentFiles.length}; obras a parchear: ${updated}; aún sin carpeta: ${stillMissing}

BEGIN;
${stmts.join("\n\n")}
COMMIT;
`;

  const out = "supabase/patch_archivo_para_organizar_drive_urls.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`\nEscrito ${out} (${updated} obras, ${stillMissing} pendientes)`);
  if (dryRun) {
    console.log("[dry-run] no se aplica al linked");
    return;
  }
  console.log("Aplicar con: npx supabase db query --linked -f", out);
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
