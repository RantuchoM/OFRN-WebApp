/**
 * Sync Marcha de San Lorenzo [cuerdas] — Para acomodar → BD.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  listFolder,
  sleep,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import {
  PARA_ACOMODAR_DRIVE_ROOT,
  SAN_LORENZO_CUERDAS_WORK,
} from "./lib/sanLorenzoCuerdasCatalog.mjs";

async function findFolderUrl() {
  const items = await listFolder(PARA_ACOMODAR_DRIVE_ROOT);
  const hit = items.find(
    (f) =>
      f.mimeType?.includes("folder") &&
      f.name === SAN_LORENZO_CUERDAS_WORK.targetFolder,
  );
  if (!hit?.webViewLink) {
    throw new Error(
      `Carpeta no encontrada en Drive: ${SAN_LORENZO_CUERDAS_WORK.targetFolder}`,
    );
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
    const suggested = suggestPartFromDriveFile(file, instrumentos);
    if (!suggested) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    parts.push({
      ...suggested,
      url_archivo: JSON.stringify([
        { url: file.webViewLink, description: file.name },
      ]),
    });
  }
  return parts;
}

async function main() {
  const folderUrl = await findFolderUrl();
  const instrumentos = await fetchInstrumentos();
  const parts = await buildParts(folderUrl, instrumentos);

  const fetched = await fetchWorkMetadata(
    "Marcha de San Lorenzo",
    SAN_LORENZO_CUERDAS_WORK.compositor,
    "Cayetano Alberto Silva Marcha de San Lorenzo",
  );
  let meta = {
    anio: fetched.anio ?? SAN_LORENZO_CUERDAS_WORK.anio,
    duracion_segundos: fetched.duracion_segundos,
  };
  if (meta.duracion_segundos != null && meta.duracion_segundos > 900) {
    meta.duracion_segundos = null;
  }
  await sleep(300);

  const inst = calculateInstrumentation(parts);
  console.log(
    `INSERT ${SAN_LORENZO_CUERDAS_WORK.titulo}: ${parts.length} partes | ${inst}`,
  );
  console.log(`Drive: ${folderUrl}`);

  const insertSql = buildSeedSql({
    outComment: `-- Silva — Marcha de San Lorenzo [cuerdas]`,
    workData: [
      {
        titulo: SAN_LORENZO_CUERDAS_WORK.titulo,
        compositors: [SAN_LORENZO_CUERDAS_WORK.compositor],
        arranger: null,
        observaciones: `Para acomodar — ${SAN_LORENZO_CUERDAS_WORK.targetFolder}`,
        link_drive: folderUrl,
        instrumentacion: inst,
        parts,
        ...meta,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_san_lorenzo_cuerdas_sync.sql", insertSql, [
    { titulo: SAN_LORENZO_CUERDAS_WORK.titulo },
  ]);
  console.log("\nSeed: supabase/seed_san_lorenzo_cuerdas_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
