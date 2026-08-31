/**
 * Sync Lockhart — Montevideana Nro. 1 + Homenaje a Astor Piazzolla → BD.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  suggestPartFromDriveFile,
} from "./lib/drivePartMatcher.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  listFolder,
  sleep,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import {
  HOMENAJE_PIAZZOLLA_WORK,
  MONTEVIDEANA_WORK,
  PARA_ACOMODAR_DRIVE_ROOT,
} from "./lib/lockhartCatalog.mjs";

function driveUrl(id) {
  return `https://drive.google.com/drive/folders/${id}`;
}

async function resolveFolderUrl(work) {
  if (work.driveFolderId) return driveUrl(work.driveFolderId);
  const items = await listFolder(PARA_ACOMODAR_DRIVE_ROOT);
  const hit = items.find(
    (f) =>
      f.mimeType?.includes("folder") &&
      (f.name === work.targetFolder || f.name === work.sourceFolder),
  );
  if (!hit?.webViewLink) {
    throw new Error(`Carpeta no encontrada en Drive: ${work.targetFolder}`);
  }
  return hit.webViewLink;
}

async function buildParts(folderUrl, instrumentos) {
  const files = (await listFolder(folderUrl)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  const parts = [];
  for (const file of files.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) {
      const one = suggestPartFromDriveFile(file, instrumentos);
      if (!one) console.warn("  Sin match:", file.name);
    }
  }
  return parts;
}

async function buildWorkEntry(work, instrumentos) {
  const folderUrl = await resolveFolderUrl(work);
  const parts = await buildParts(folderUrl, instrumentos);
  const fetched = await fetchWorkMetadata(
    work.titulo,
    work.compositor,
    `Beatriz Lockhart ${work.titulo}`,
  );
  let anio = fetched.anio ?? work.anio;
  let duracion_segundos = fetched.duracion_segundos;
  if (duracion_segundos != null && duracion_segundos > 1200) {
    duracion_segundos = null;
  }
  await sleep(300);

  const inst = calculateInstrumentation(parts);
  console.log(
    `INSERT ${work.titulo}: ${parts.length} partes | ${inst}`,
  );
  console.log(`Drive: ${folderUrl}`);
  for (const p of parts) {
    console.log(`  - ${p.nombre_archivo || p.id_instrumento}`);
  }

  return {
    titulo: work.tituloDb || work.titulo,
    compositors: [work.compositor],
    arranger: null,
    observaciones: `Para acomodar — ${work.targetFolder}`,
    link_drive: folderUrl,
    instrumentacion: inst,
    parts,
    anio,
    duracion_segundos,
  };
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const workData = [];
  for (const work of [MONTEVIDEANA_WORK, HOMENAJE_PIAZZOLLA_WORK]) {
    workData.push(await buildWorkEntry(work, instrumentos));
  }

  const sql = buildSeedSql({
    outComment: `-- Lockhart — Montevideana Nro. 1 + Homenaje a Astor Piazzolla (Para acomodar)`,
    workData,
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_lockhart_sync.sql", sql, workData);
  console.log("\nSeed: supabase/seed_lockhart_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
