/**
 * Sync Mendelssohn Sinfonía para cuerdas Nro 1 — Para acomodar → BD.
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
  MENDELSSOHN_STRING_SYM1_DRIVE_FOLDER,
  MENDELSSOHN_STRING_SYM1_WORK,
} from "./lib/mendelssohnStringSym1Catalog.mjs";

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
  const instrumentos = await fetchInstrumentos();
  const parts = await buildParts(
    MENDELSSOHN_STRING_SYM1_DRIVE_FOLDER,
    instrumentos,
  );

  const fetched = await fetchWorkMetadata(
    MENDELSSOHN_STRING_SYM1_WORK.titulo,
    MENDELSSOHN_STRING_SYM1_WORK.compositor,
    "Felix Mendelssohn String Symphony No 1 C major MWV N 1",
  );
  let meta = {
    anio: fetched.anio ?? MENDELSSOHN_STRING_SYM1_WORK.anio,
    duracion_segundos: fetched.duracion_segundos,
  };
  if (meta.duracion_segundos != null && meta.duracion_segundos > 3600) {
    meta.duracion_segundos = null;
  }
  await sleep(300);

  const inst = calculateInstrumentation(parts);
  console.log(
    `INSERT ${MENDELSSOHN_STRING_SYM1_WORK.titulo}: ${parts.length} partes | ${inst}`,
  );

  const insertSql = buildSeedSql({
    outComment: `-- Mendelssohn — Sinfonía para Cuerdas Nro 1 en Do Mayor, MWV N 1`,
    workData: [
      {
        titulo: MENDELSSOHN_STRING_SYM1_WORK.titulo,
        compositors: [MENDELSSOHN_STRING_SYM1_WORK.compositor],
        arranger: null,
        observaciones: `Para acomodar — ${MENDELSSOHN_STRING_SYM1_WORK.targetFolder}`,
        link_drive: MENDELSSOHN_STRING_SYM1_DRIVE_FOLDER,
        instrumentacion: inst,
        parts,
        ...meta,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_mendelssohn_string_sym1_sync.sql", insertSql, [
    { titulo: MENDELSSOHN_STRING_SYM1_WORK.titulo },
  ]);
  console.log("\nSeed: supabase/seed_mendelssohn_string_sym1_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
