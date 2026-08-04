/**
 * Sync Massenet — Méditation de Thaïs — Para acomodar → BD.
 * PDFs ya canónicos; combina Corno 1y2 / 3y4 vía matcher.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  listFolder,
  sleep,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import {
  MASSENET_MEDITATION_DRIVE_FOLDER,
  MASSENET_MEDITATION_WORK,
} from "./lib/massenetMeditationCatalog.mjs";

async function buildParts(folderUrl, instrumentos) {
  const files = (await listFolder(folderUrl)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  const parts = [];
  for (const file of files.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) console.warn("  Sin match:", file.name);
  }
  return parts;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const parts = await buildParts(
    MASSENET_MEDITATION_DRIVE_FOLDER,
    instrumentos,
  );

  const fetched = await fetchWorkMetadata(
    MASSENET_MEDITATION_WORK.titulo,
    MASSENET_MEDITATION_WORK.compositor,
    "Jules Massenet Méditation de Thaïs violin solo",
  );
  let meta = {
    anio: fetched.anio ?? MASSENET_MEDITATION_WORK.anio,
    duracion_segundos: fetched.duracion_segundos,
  };
  // Evitar matches de grabaciones enteras de la ópera
  if (meta.duracion_segundos != null && meta.duracion_segundos > 600) {
    meta.duracion_segundos = null;
  }
  await sleep(300);

  const inst = calculateInstrumentation(parts);
  console.log(
    `INSERT ${MASSENET_MEDITATION_WORK.titulo}: ${parts.length} partes | ${inst}`,
  );
  console.log(`Drive: ${MASSENET_MEDITATION_DRIVE_FOLDER}`);

  const insertSql = buildSeedSql({
    outComment: `-- Massenet — Méditation de Thaïs`,
    workData: [
      {
        titulo: MASSENET_MEDITATION_WORK.titulo,
        compositors: [MASSENET_MEDITATION_WORK.compositor],
        arranger: null,
        observaciones: `Para acomodar — ${MASSENET_MEDITATION_WORK.targetFolder}`,
        link_drive: MASSENET_MEDITATION_DRIVE_FOLDER,
        instrumentacion: inst,
        parts,
        ...meta,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_massenet_meditation_sync.sql", insertSql, [
    { titulo: MASSENET_MEDITATION_WORK.titulo },
  ]);
  console.log("\nSeed: supabase/seed_massenet_meditation_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
