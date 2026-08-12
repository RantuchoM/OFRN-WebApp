/**
 * Sync Mozart — Dies Irae. Requiem, K. 626 (obra 3563) desde Para acomodar.
 */
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";
import {
  MOZART_DIES_IRAE_DRIVE_FOLDER,
  MOZART_DIES_IRAE_WORK,
} from "./lib/mozartDiesIraeCatalog.mjs";

function remapOrganToPiano(parts, instrumentos) {
  const piano = instrumentos.find((i) => /^piano$/i.test(i.instrumento || ""));
  if (!piano) return;
  for (const p of parts) {
    if (!/[oó]rgano/i.test(`${p.nombre_archivo || ""} ${p.instrumento_nombre || ""}`)) {
      continue;
    }
    if (String(p.id_instrumento) === String(piano.id)) continue;
    console.warn(
      `  Órgano: catálogo sin órgano → Piano (${p.id_instrumento} → ${piano.id})`,
    );
    p.id_instrumento = piano.id;
    p.instrumento_nombre = "Piano";
  }
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
    if (!n) console.warn("  Sin match:", file.name);
    else console.log(`  ${file.name} → ${n} particella(s)`);
  }
  remapOrganToPiano(parts, instrumentos);
  return parts;
}

async function main() {
  const work = MOZART_DIES_IRAE_WORK;
  const instrumentos = await fetchInstrumentos();
  const parts = await buildParts(MOZART_DIES_IRAE_DRIVE_FOLDER, instrumentos);
  const inst = calculateInstrumentation(parts);

  console.log(`\nUPDATE obra ${work.obraId}: ${parts.length} partes | ${inst}`);

  const durSql =
    work.duracionSegundos != null ? String(work.duracionSegundos) : "NULL";

  let sql = `-- Mozart — Dies Irae. Requiem, K. 626 → obra ${work.obraId}
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- Fragmento III. Sequenz / 1. Dies irae (hasta Tuba mirum). Requiem sin tilde.

DO $$
BEGIN
  UPDATE obras SET
    titulo = '${sqlEscape(work.tituloDb)}',
    link_drive = '${sqlEscape(MOZART_DIES_IRAE_DRIVE_FOLDER)}',
    observaciones = '${sqlEscape(`Para acomodar — ${work.targetFolder}`)}',
    instrumentacion = '${sqlEscape(inst)}',
    anio_composicion = ${work.anio},
    duracion_segundos = ${durSql}
  WHERE id = ${work.obraId};

  DELETE FROM obras_particellas WHERE id_obra = ${work.obraId};

`;

  for (const p of parts) {
    const solista = p.es_solista ? "true" : "false";
    sql += `  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${work.obraId}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${solista});

`;
  }

  sql += `END $$;
`;

  writeSeed("supabase/seed_mozart_dies_irae_sync.sql", sql, []);
  console.log("\nSeed: supabase/seed_mozart_dies_irae_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
