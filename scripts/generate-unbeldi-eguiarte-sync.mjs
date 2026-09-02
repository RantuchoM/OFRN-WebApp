/**
 * Sync Un bel di vedremo [recorte Eguiarte] → BD (insert + particellas).
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  LOCAL_ARIAS,
  UNBELDI_EGUIARTE_WORK,
  driveFolderUrl,
} from "./lib/unbeldiEguiarteCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
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

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (map.has(key)) {
      const existing = map.get(key);
      const merged = [
        ...JSON.parse(existing.url_archivo || "[]"),
        ...JSON.parse(p.url_archivo || "[]"),
      ];
      existing.url_archivo = JSON.stringify(merged);
    } else {
      map.set(key, { ...p });
    }
  }
  return [...map.values()];
}

function buildPartsFromFiles(files, instrumentos) {
  const parts = [];
  const pdfs = files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  for (const file of pdfs) {
    const before = parts.length;
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    if (!file.webViewLink) {
      for (let i = before; i < parts.length; i += 1) {
        parts[i].url_archivo = "[]";
      }
    }
    console.log(`  ${file.name} → ${n} particella(s)`);
  }
  return dedupeParts(parts);
}

async function main() {
  const work = UNBELDI_EGUIARTE_WORK;
  const instrumentos = await fetchInstrumentos();
  const localDir = join(LOCAL_ARIAS, work.targetFolder);
  const localFiles = existsSync(localDir)
    ? readdirSync(localDir)
        .filter((f) => /\.pdf$/i.test(f))
        .map((name) => ({ name, webViewLink: null }))
    : [];

  console.log(`\n=== ${work.titulo} ===`);
  console.log(`  Local: ${localDir} (${localFiles.length} PDFs)`);

  const linkDrive = driveFolderUrl(work.driveFolderId);
  let driveFiles = [];
  try {
    driveFiles = (await listFolder(linkDrive)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    console.log(`  Drive: ${linkDrive} (${driveFiles.length} PDFs)`);
  } catch (e) {
    console.warn("  list_folder:", e.message);
  }

  const byName = new Map(
    (driveFiles || []).map((f) => [foldName(f.name), f]),
  );
  const files = (
    localFiles.length
      ? localFiles.map((f) => {
          const hit = byName.get(foldName(f.name));
          return hit?.webViewLink
            ? { ...f, webViewLink: hit.webViewLink, id: hit.id }
            : f;
        })
      : driveFiles
  );

  const parts = buildPartsFromFiles(files, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`  ${parts.length} partes | ${inst}`);

  const workData = [
    {
      titulo: work.tituloDb || work.titulo,
      compositors: [work.compositor],
      arranger: null,
      observaciones: work.observaciones,
      link_drive: linkDrive,
      instrumentacion: inst,
      parts,
      anio: work.anio,
      duracion_segundos: work.duracion_segundos,
    },
  ];

  const insertSql = buildSeedSql({
    outComment:
      "-- Un bel di vedremo [recorte Eguiarte] — Puccini (ARIAS; variante de 3199)",
    workData,
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_unbeldi_eguiarte_sync.sql", insertSql, workData);
  console.log("\nSeed: supabase/seed_unbeldi_eguiarte_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
