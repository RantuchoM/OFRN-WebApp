/**
 * Sync Lalo — Sinfonía española, Op. 21 → catálogo (obra nueva, sin programa).
 * link_drive = carpeta en Para acomodar. No copia a Archivo.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  LALO_SYMPHONIE_WORK,
  PARA_ACOMODAR_FOLDER_ID,
  PARA_ACOMODAR_ROOT,
  driveFolderUrl,
} from "./lib/laloSymphonieCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (!map.has(key)) map.set(key, { ...p });
  }
  return [...map.values()];
}

function localPdfFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

async function discoverDriveFolderId() {
  if (LALO_SYMPHONIE_WORK.driveFolderId) return LALO_SYMPHONIE_WORK.driveFolderId;
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  const files = await listFolder(parentUrl);
  const hit = files.find((f) => {
    const name = String(f.name || "").toLowerCase();
    const isFolder = String(f.mimeType || "").includes("folder");
    return (
      isFolder &&
      name.includes("lalo") &&
      (name.includes("sinfon") || name.includes("españ"))
    );
  });
  if (!hit?.id) {
    throw new Error(
      "Para acomodar Drive no lista la carpeta Lalo — Sinfonía española. Esperá el sync y reintentá.",
    );
  }
  console.log(`  Drive folder: ${hit.name} (${hit.id})`);
  return hit.id;
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

function foldName(name) {
  return String(name || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Triángulo y tambor comparten las mismas páginas (TRIANGOLO e TAMBURO). */
function expandTriangleSnare(parts, file, instrumentos) {
  const n = foldName(file.name || "");
  if (!n.includes("triangulo") || !n.includes("tambor")) return;
  const perc = (instrumentos || []).find((i) =>
    /percusi/i.test(i.instrumento || ""),
  );
  const url = JSON.stringify([
    { url: file.webViewLink, description: file.name },
  ]);
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const label = foldName(parts[i].nombre_archivo);
    if (label.includes("triangulo") && label.includes("tambor")) {
      parts.splice(i, 1);
    }
  }
  if (!perc) {
    console.warn("  Sin instrumento de percusión para triángulo/tambor");
    return;
  }
  for (const label of ["Perc Triángulo", "Perc Tambor"]) {
    parts.push({
      id_instrumento: perc.id,
      nombre_archivo: label,
      instrumento_nombre: perc.instrumento,
      es_solista: false,
      url_archivo: file.webViewLink ? url : "[]",
    });
  }
}

function buildPartsFromFiles(files, instrumentos) {
  const parts = [];
  const pdfs = files
    .filter((f) => /\.pdf$/i.test(f.name || ""))
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));
  for (const file of pdfs) {
    const before = parts.length;
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    expandTriangleSnare(parts, file, instrumentos);
    const added = parts.length - before;
    if (!added && !n) {
      console.warn("  Sin match:", file.name);
      continue;
    }
    if (!file.webViewLink) {
      for (let i = before; i < parts.length; i += 1) {
        if (!parts[i].url_archivo || parts[i].url_archivo === "[]") {
          parts[i].url_archivo = "[]";
        }
      }
    }
    console.log(`  ${file.name} → ${parts.length - before} particella(s)`);
  }
  return dedupeParts(parts);
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const localDir = join(PARA_ACOMODAR_ROOT, LALO_SYMPHONIE_WORK.targetFolder);
  const localFiles = localPdfFiles(localDir);
  console.log(`Local PDFs: ${localFiles.length} en ${localDir}`);

  const driveId = await discoverDriveFolderId();
  const linkDrive = driveFolderUrl(driveId);
  console.log(`Drive: ${linkDrive}`);
  const driveFiles = (await listFolder(linkDrive)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  console.log(`  Drive PDFs: ${driveFiles.length} / local ${localFiles.length}`);

  const files = mergeDriveLinks(localFiles, driveFiles);
  const withUrl = files.filter((f) => f.webViewLink).length;
  if (withUrl < localFiles.length) {
    throw new Error(
      `URLs Drive incompletas (${withUrl}/${localFiles.length}). Reintentá tras el sync.`,
    );
  }

  const parts = buildPartsFromFiles(files, instrumentos);
  const inst = calculateInstrumentation(parts);
  console.log(`\nINSERT ${LALO_SYMPHONIE_WORK.titulo}: ${parts.length} partes | ${inst}`);
  const solo = parts.filter((p) => p.es_solista);
  console.log(
    `  Solista: ${solo.map((p) => p.nombre_archivo).join(", ") || "(ninguno)"}`,
  );

  const compKey = personKey(LALO_SYMPHONIE_WORK.compositor);
  const sql = buildSeedSql({
    outComment: `-- Lalo — Sinfonía española, Op. 21 (catálogo; sin programa ni gira)`,
    workData: [
      {
        titulo: LALO_SYMPHONIE_WORK.titulo,
        compositors: [LALO_SYMPHONIE_WORK.compositor],
        observaciones: `Para acomodar — ${LALO_SYMPHONIE_WORK.targetFolder}`,
        link_drive: linkDrive,
        instrumentacion: inst,
        anio: LALO_SYMPHONIE_WORK.anio,
        duracion_segundos: null,
        parts,
      },
    ],
    resolveArrangerVar: () => "NULL",
  });

  writeSeed("supabase/seed_lalo_symphonie_sync.sql", sql, [
    { titulo: LALO_SYMPHONIE_WORK.titulo },
  ]);
  console.log(`Drive folder id: ${driveId}`);
  console.log(`Compositor var: _id_comp_${personVarSafe(compKey)}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
