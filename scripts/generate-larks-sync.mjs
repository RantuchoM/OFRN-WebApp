/**
 * Sync Fripp — Larks' Tongues in Aspic [The LCG] → BD (insert + particellas).
 * Preferir Drive (list_folder) tras sync; si no hay ID, arma partes desde PDFs locales.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  LARKS_ARRANGER,
  LARKS_WORK,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/larksCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  listFolder,
  personKey,
  personVarSafe,
  sleep,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

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

function localPdfFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

async function discoverDriveFolderId() {
  if (LARKS_WORK.driveFolderId) return LARKS_WORK.driveFolderId;
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  try {
    const files = await listFolder(parentUrl);
    const needle = LARKS_WORK.targetFolder.toLowerCase();
    const hit = files.find((f) =>
      String(f.name || "")
        .toLowerCase()
        .includes("larks"),
    );
    if (hit?.id) {
      console.log(`  Drive folder descubierto: ${hit.name} (${hit.id})`);
      return hit.id;
    }
    const hit2 = files.find((f) =>
      String(f.name || "").toLowerCase().includes(needle.slice(0, 20)),
    );
    if (hit2?.id) {
      console.log(`  Drive folder descubierto: ${hit2.name} (${hit2.id})`);
      return hit2.id;
    }
    console.warn("  Para acomodar Drive aún no lista la carpeta Larks.");
  } catch (e) {
    console.warn("  No se pudo listar Para acomodar:", e.message);
  }
  return null;
}

function mergeDriveLinks(localFiles, driveFiles) {
  const byName = new Map(
    (driveFiles || []).map((f) => [String(f.name || "").toLowerCase(), f]),
  );
  return localFiles.map((f) => {
    const hit = byName.get(String(f.name || "").toLowerCase());
    if (!hit?.webViewLink) return f;
    return { ...f, webViewLink: hit.webViewLink, id: hit.id };
  });
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const localDir = join(PARA_ACOMODAR_ROOT, LARKS_WORK.targetFolder);
  const localFiles = localPdfFiles(localDir);

  let driveId = await discoverDriveFolderId();
  let linkDrive = driveFolderUrl(driveId) || "";
  let driveFiles = [];

  if (driveId) {
    console.log(`Drive: ${linkDrive}`);
    try {
      driveFiles = (await listFolder(linkDrive)).filter((f) =>
        /\.pdf$/i.test(f.name || ""),
      );
      console.log(`  Drive PDFs: ${driveFiles.length} / local ${localFiles.length}`);
    } catch (e) {
      console.warn("  list_folder falló:", e.message);
    }
  } else {
    console.log(`Sin Drive ID aún — partes desde local: ${localDir}`);
  }

  const files = mergeDriveLinks(localFiles, driveFiles);
  const withUrl = files.filter((f) => f.webViewLink).length;
  if (localFiles.length && withUrl < localFiles.length) {
    console.warn(
      `  URLs Drive incompletas (${withUrl}/${localFiles.length}). Re-ejecutar tras sync File Stream.`,
    );
  }
  const parts = buildPartsFromFiles(files, instrumentos);

  const fetched = await fetchWorkMetadata(
    LARKS_WORK.titulo,
    LARKS_WORK.compositor,
    "King Crimson Larks Tongues in Aspic Fripp",
  );
  let meta = {
    anio: fetched.anio ?? LARKS_WORK.anio,
    duracion_segundos: fetched.duracion_segundos,
  };
  if (meta.duracion_segundos != null && meta.duracion_segundos > 900) {
    meta.duracion_segundos = null;
  }
  await sleep(300);

  const inst = calculateInstrumentation(parts);
  console.log(
    `\nINSERT ${LARKS_WORK.titulo}: ${parts.length} partes | ${inst}`,
  );

  const arrKey = personKey(LARKS_ARRANGER);
  const insertSql = buildSeedSql({
    outComment: `-- Fripp — Larks' Tongues in Aspic [The LCG] (arr. Cucchiarelli&Guevara)`,
    workData: [
      {
        titulo: LARKS_WORK.titulo,
        compositors: [LARKS_WORK.compositor],
        arranger: LARKS_ARRANGER,
        observaciones: `Para acomodar — ${LARKS_WORK.targetFolder}`,
        link_drive: linkDrive,
        instrumentacion: inst,
        parts,
        ...meta,
      },
    ],
    resolveArrangerVar: () => `_id_arr_${personVarSafe(arrKey)}`,
  });

  writeSeed("supabase/seed_larks_sync.sql", insertSql, [
    { titulo: LARKS_WORK.titulo },
  ]);
  console.log("\nSeed: supabase/seed_larks_sync.sql");
  if (!driveId || withUrl < localFiles.length) {
    console.log(
      "Nota: re-ejecutar `node scripts/generate-larks-sync.mjs` tras sync Drive para completar url_archivo, luego correr el seed.",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
