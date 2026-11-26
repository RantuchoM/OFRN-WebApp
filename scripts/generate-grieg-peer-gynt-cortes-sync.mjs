/**
 * Dos obras nuevas desde los recortes de Peer Gynt, y el Programa 6 las usa
 * en lugar de la suite completa.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  GRIEG_COMPOSITOR,
  GRIEG_CORTES,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  PROGRAMA6_ID,
  PROGRAMA6_REPERTORIO_ID,
  SUITE1_OBRA_ID,
  driveFolderUrl,
} from "./lib/griegPeerGyntCortesCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function discoverDriveFolderId(folderName) {
  const files = await listFolder(driveFolderUrl(PARA_ACOMODAR_FOLDER_ID));
  const needle = foldName(folderName);
  const hit = files.find((f) => {
    const isFolder = String(f.mimeType || "").includes("folder");
    return isFolder && foldName(f.name) === needle;
  });
  if (!hit?.id) {
    throw new Error(`Drive no lista «${folderName}». Esperá el sync y reintentá.`);
  }
  console.log(`  Drive: ${hit.name} (${hit.id})`);
  return hit.id;
}

function localPdfs(dir) {
  return readdirSync(dir)
    .filter((name) => /\.pdf$/i.test(name))
    .sort((a, b) => a.localeCompare(b, "es"))
    .map((name) => ({ name, webViewLink: null }));
}

function withDriveUrls(localFiles, driveFiles) {
  const byName = new Map(driveFiles.map((f) => [foldName(f.name), f]));
  return localFiles.map((file) => {
    const hit = byName.get(foldName(file.name));
    if (!hit?.webViewLink) return file;
    return { ...file, webViewLink: hit.webViewLink, id: hit.id };
  });
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const workData = [];

  for (const work of GRIEG_CORTES) {
    const dir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
    if (!existsSync(dir)) throw new Error(`No existe ${dir}`);
    const local = localPdfs(dir);
    if (local.length !== work.fileCount) {
      throw new Error(`${work.workTitle}: ${local.length} PDFs, se esperaban ${work.fileCount}`);
    }
    const driveId = await discoverDriveFolderId(work.targetFolder);
    const link = driveFolderUrl(driveId);
    const driveFiles = (await listFolder(link)).filter((f) => /\.pdf$/i.test(f.name || ""));
    const files = withDriveUrls(local, driveFiles);
    const missing = files.filter((f) => !f.webViewLink);
    if (missing.length) {
      throw new Error(
        `Sin URL (${work.workTitle}): ${missing.map((f) => f.name).join("; ")}`,
      );
    }
    const parts = [];
    for (const file of files) {
      const before = parts.length;
      appendSeedPartsFromFile(parts, file, instrumentos);
      if (parts.length === before) console.warn("  Sin match:", file.name);
    }
    if (parts.length !== work.partCount) {
      throw new Error(`${work.workTitle}: ${parts.length} particellas, se esperaban ${work.partCount}`);
    }
    const inst = calculateInstrumentation(parts);
    console.log(`${work.workTitle}: ${parts.length} particellas | ${inst}`);
    workData.push({
      titulo: work.titulo,
      compositors: [GRIEG_COMPOSITOR],
      observaciones: `Para acomodar — ${work.targetFolder}. Recorte por páginas de la Suite 1 (obra ${SUITE1_OBRA_ID}).`,
      link_drive: link,
      instrumentacion: inst,
      anio: 1875,
      duracion_segundos: null,
      parts,
    });
  }

  let sql = buildSeedSql({
    outComment: `-- Grieg — La mañana y La muerte de Åse, recortes de Peer Gynt Suite 1
-- Programa ${PROGRAMA6_ID} deja la suite completa y usa estas dos obras.`,
    workData,
    resolveArrangerVar: () => "NULL",
  });

  const manana = sqlEscape(GRIEG_CORTES[0].titulo);
  const ase = sqlEscape(GRIEG_CORTES[1].titulo);
  const obsManana = sqlEscape(workData[0].observaciones);
  const obsAse = sqlEscape(workData[1].observaciones);
  sql += `
-- Programa 6 (Ecos del alma): la suite completa pasa a estos dos recortes.
DO $$
DECLARE
  _manana bigint;
  _ase bigint;
BEGIN
  SELECT id INTO _manana FROM obras
  WHERE titulo = '${manana}' AND observaciones = '${obsManana}'
  ORDER BY id DESC LIMIT 1;
  SELECT id INTO _ase FROM obras
  WHERE titulo = '${ase}' AND observaciones = '${obsAse}'
  ORDER BY id DESC LIMIT 1;
  IF _manana IS NULL OR _ase IS NULL THEN
    RAISE EXCEPTION 'No se encontraron las obras recortadas';
  END IF;

  IF EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = ${PROGRAMA6_REPERTORIO_ID} AND id_obra = ${SUITE1_OBRA_ID}
  ) THEN
    UPDATE repertorio_obras
    SET id_obra = _manana
    WHERE id_repertorio = ${PROGRAMA6_REPERTORIO_ID} AND id_obra = ${SUITE1_OBRA_ID};
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM repertorio_obras
    WHERE id_repertorio = ${PROGRAMA6_REPERTORIO_ID} AND id_obra = _ase
  ) THEN
    UPDATE repertorio_obras
    SET orden = orden + 1
    WHERE id_repertorio = ${PROGRAMA6_REPERTORIO_ID} AND orden >= 2;
    INSERT INTO repertorio_obras (id_repertorio, id_obra, orden)
    VALUES (${PROGRAMA6_REPERTORIO_ID}, _ase, 2);
  END IF;
END $$;
`;

  writeSeed("supabase/seed_grieg_peer_gynt_cortes_sync.sql", sql, workData);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
