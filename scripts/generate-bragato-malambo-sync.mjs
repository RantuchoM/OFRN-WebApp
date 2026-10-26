/**
 * Alta Bragato Ritmos de Malambo desde Para acomodar (solo archivo).
 *
 *   node scripts/generate-bragato-malambo-sync.mjs
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import {
  BRAGATO_MALAMBO_WORK,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
} from "./lib/bragatoMalamboCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const work = BRAGATO_MALAMBO_WORK;

function driveFolderUrl(folderId) {
  return `https://drive.google.com/open?id=${folderId}`;
}

async function discoverFolderId(targetFolder) {
  const files = await listFolder(driveFolderUrl(PARA_ACOMODAR_FOLDER_ID));
  const hit = files.find(
    (f) =>
      String(f.mimeType || "").includes("folder") && f.name === targetFolder,
  );
  if (!hit?.id) {
    throw new Error(
      `Drive todavía no lista «${targetFolder}». Esperá sync File Stream.`,
    );
  }
  return hit.id;
}

async function main() {
  const localDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  if (!existsSync(localDir)) throw new Error(`No existe ${localDir}`);

  const localFiles = readdirSync(localDir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));

  const instrumentos = await fetchInstrumentos();
  const driveId = await discoverFolderId(work.targetFolder);
  const linkDrive = driveFolderUrl(driveId);
  const driveFiles = (await listFolder(linkDrive)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  console.log(`local ${localFiles.length} / drive ${driveFiles.length}`);
  console.log(linkDrive);

  const byName = new Map(driveFiles.map((f) => [f.name, f]));
  const files = localFiles.map((f) => {
    const hit = byName.get(f.name);
    if (!hit?.webViewLink) throw new Error(`Sin URL Drive: ${f.name}`);
    return { ...f, webViewLink: hit.webViewLink, id: hit.id };
  });

  const parts = [];
  for (const file of [...files].sort((a, b) =>
    a.name.localeCompare(b.name, "es"),
  )) {
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) console.warn("Sin match:", file.name);
    else console.log(`${file.name} → +${n}`);
  }
  const collapsed = collapseSameChairTranspositions(parts);
  const inst = calculateInstrumentation(collapsed);
  console.log(`${collapsed.length} particellas | ${inst}`);

  const sql = buildSeedSql({
    outComment:
      "-- Bragato Ritmos de Malambo → catálogo (Para acomodar; sin repertorio)",
    workData: [
      {
        titulo: work.titulo,
        compositors: [work.compositor],
        arranger: null,
        observaciones: work.observaciones,
        link_drive: linkDrive,
        instrumentacion: inst,
        anio: work.anio,
        duracion_segundos: work.duracion_segundos,
        parts: collapsed,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_bragato_malambo_sync.sql", sql, [work]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
