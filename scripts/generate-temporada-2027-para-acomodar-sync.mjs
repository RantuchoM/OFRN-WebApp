/**
 * Sync obras temporada 2027 desde Para acomodar (pipeline completo).
 *   node scripts/generate-temporada-2027-para-acomodar-sync.mjs
 *   node scripts/generate-temporada-2027-para-acomodar-sync.mjs Mozart Debussy --allow-empty-urls
 */
import { existsSync, readdirSync, writeFileSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import {
  BEETHOVEN_9_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA11,
  driveFolderUrl as drive11,
} from "./lib/beethoven9Catalog.mjs";
import {
  BEETHOVEN_ELEGISCHER_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA1,
  driveFolderUrl as drive1,
} from "./lib/beethovenElegischerCatalog.mjs";
import {
  BORODIN_SYM2_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA5,
  driveFolderUrl as drive5,
} from "./lib/borodinSym2Catalog.mjs";
import {
  DEBUSSY_FAUNO_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA7,
  driveFolderUrl as drive7,
} from "./lib/debussyFaunoCatalog.mjs";
import {
  KALINNIKOV_SERENATA_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA2,
  driveFolderUrl as drive2,
} from "./lib/kalinnikovSerenataCatalog.mjs";
import {
  KALINNIKOV_SYM2_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA3,
  driveFolderUrl as drive3,
} from "./lib/kalinnikovSym2Catalog.mjs";
import {
  MOZART_40_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA8,
  driveFolderUrl as drive8,
} from "./lib/mozart40Catalog.mjs";
import {
  NUN_DANKET_BWV192_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA10,
  driveFolderUrl as drive10,
} from "./lib/nunDanketBwv192Catalog.mjs";
import {
  PAGANINI_OP6_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA9,
  driveFolderUrl as drive9,
} from "./lib/paganiniOp6Catalog.mjs";
import {
  SCHUBERT_ROSAMUNDA_E3_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA6,
  driveFolderUrl as drive6,
} from "./lib/schubertRosamundaE3Catalog.mjs";
import {
  SIBELIUS_PELLEAS_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA12,
  driveFolderUrl as drive12,
} from "./lib/sibeliusPelleasCatalog.mjs";
import {
  WAGNER_IDILIO_WORK,
  PARA_ACOMODAR_FOLDER_ID as PA4,
  driveFolderUrl as drive4,
} from "./lib/wagnerIdilioCatalog.mjs";
import {
  fetchInstrumentos,
  listFolder,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

const WORKS = [
  { ...BORODIN_SYM2_WORK, parentId: PA5, driveUrl: drive5 },
  { ...KALINNIKOV_SERENATA_WORK, parentId: PA2, driveUrl: drive2 },
  { ...KALINNIKOV_SYM2_WORK, parentId: PA3, driveUrl: drive3 },
  { ...MOZART_40_WORK, parentId: PA8, driveUrl: drive8 },
  { ...DEBUSSY_FAUNO_WORK, parentId: PA7, driveUrl: drive7 },
  {
    ...PAGANINI_OP6_WORK,
    parentId: PA9,
    driveUrl: drive9,
    estado: "Solicitud",
    observacionesExtra:
      "Set Generoso D major: faltan cuerdas orquestales (solo vientos/metales + Violín Solo + SCORE).",
  },
  { ...SCHUBERT_ROSAMUNDA_E3_WORK, parentId: PA6, driveUrl: drive6 },
  { ...BEETHOVEN_ELEGISCHER_WORK, parentId: PA1, driveUrl: drive1 },
  { ...BEETHOVEN_9_WORK, parentId: PA11, driveUrl: drive11 },
  { ...NUN_DANKET_BWV192_WORK, parentId: PA10, driveUrl: drive10 },
  { ...SIBELIUS_PELLEAS_WORK, parentId: PA12, driveUrl: drive12 },
  { ...WAGNER_IDILIO_WORK, parentId: PA4, driveUrl: drive4 },
];

const ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

function foldName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

async function discoverDriveFolderId(work) {
  if (work.driveFolderId) return work.driveFolderId;
  const files = await listFolder(work.driveUrl(work.parentId));
  const needle = foldName(work.targetFolder);
  const hit = files.find(
    (f) =>
      String(f.mimeType || "").includes("folder") &&
      foldName(f.name) === needle,
  );
  if (!hit?.id) {
    throw new Error(`Drive no lista «${work.targetFolder}». Esperá File Stream.`);
  }
  return hit.id;
}

function buildParts(files, instrumentos) {
  const parts = [];
  for (const file of files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"))) {
    const before = parts.length;
    appendSeedPartsFromFile(parts, file, instrumentos);
    if (parts.length === before) console.warn("  Sin match:", file.name);
    else console.log(`  ${file.name}`);
  }
  return collapseSameChairTranspositions(parts);
}

async function loadWork(work, instrumentos, allowEmpty) {
  const localDir = join(ROOT, work.targetFolder);
  if (!existsSync(localDir)) throw new Error(`No existe ${localDir}`);
  const localFiles = readdirSync(localDir)
    .filter((f) => /\.pdf$/i.test(f) && !/raw split/i.test(f))
    .map((name) => ({ name, webViewLink: null }));

  const driveId = await discoverDriveFolderId(work);
  const linkDrive = work.driveUrl(driveId);
  let driveFiles = [];
  try {
    driveFiles = (await listFolder(linkDrive)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
  } catch (e) {
    console.warn(`  listFolder: ${e.message}`);
  }

  const byName = new Map(driveFiles.map((f) => [foldName(f.name), f]));
  const files = localFiles.map((f) => {
    const hit = byName.get(foldName(f.name));
    return hit?.webViewLink
      ? { ...f, webViewLink: hit.webViewLink, id: hit.id }
      : f;
  });
  const withUrl = files.filter((f) => f.webViewLink).length;
  console.log(
    `\n${work.targetFolder}: local ${localFiles.length} / drive ${driveFiles.length} / urls ${withUrl}`,
  );
  if (withUrl < localFiles.length && !allowEmpty) {
    throw new Error(
      `URLs incompletas ${withUrl}/${localFiles.length}. Sync o --allow-empty-urls.`,
    );
  }

  const parts = buildParts(files, instrumentos);
  const inst = calculateInstrumentation(parts);
  return { work, linkDrive, parts, inst };
}

function workSql({ work, linkDrive, parts, inst }) {
  const estado = work.estado || "Oficial";
  const obs = work.observacionesExtra
    ? `Para acomodar — ${work.targetFolder}. ${work.observacionesExtra}`
    : `Para acomodar — ${work.targetFolder}.`;
  let sql = `
-- ${work.targetFolder} → obra ${work.obraId}
DO $$
BEGIN
  UPDATE obras SET
    titulo = '${sqlEscape(work.titulo)}',
    link_drive = '${sqlEscape(linkDrive)}',
    observaciones = '${sqlEscape(obs)}',
    instrumentacion = '${sqlEscape(inst)}',
    anio_composicion = ${work.anio},
    duracion_segundos = ${work.duracion_segundos ?? "NULL"},
    estado = '${sqlEscape(estado)}'
  WHERE id = ${work.obraId};

  DELETE FROM obras_particellas WHERE id_obra = ${work.obraId};
`;
  for (const p of parts) {
    sql += `
  INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
  VALUES (${work.obraId}, '${sqlEscape(p.id_instrumento)}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${p.es_solista ? "true" : "false"});
`;
  }
  sql += `END $$;\n`;
  return sql;
}

async function main() {
  const allowEmpty = process.argv.includes("--allow-empty-urls");
  const scriptIdx = process.argv.findIndex((a) => a.includes("generate-temporada-2027"));
  const only = process.argv
    .slice(scriptIdx + 1)
    .filter((a) => !a.startsWith("-"));
  const instrumentos = await fetchInstrumentos();
  let sql = `-- Temporada 2027 — Para acomodar sync (pipeline completo)
-- Generado: ${new Date().toISOString().slice(0, 10)}

`;
  for (const work of WORKS) {
    if (
      only.length &&
      !only.some((o) =>
        work.targetFolder.toLowerCase().includes(o.toLowerCase()),
      )
    ) {
      continue;
    }
    // Skip serenata if already done unless forced
    const loaded = await loadWork(work, instrumentos, allowEmpty);
    console.log(`  → ${loaded.parts.length} partes | ${loaded.inst}`);
    sql += workSql(loaded);
  }
  const out = "supabase/seed_temporada_2027_para_acomodar_sync.sql";
  writeFileSync(out, sql, "utf8");
  console.log(`\nSeed: ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
