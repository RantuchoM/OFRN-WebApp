/**
 * Catálogo de las 4 obras del Concerto Competition descargadas a Para acomodar.
 * Inserta obras + compositores + particellas. No toca programas, giras ni setlists.
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  collapseSameChairTranspositions,
} from "./lib/drivePartMatcher.mjs";
import { canonicalPartFilename } from "./lib/pdfPartsRenaming.mjs";
import {
  CONCERTO_COMPETICION_WORKS,
  PARA_ACOMODAR_ROOT,
} from "./lib/concertoCompeticionCatalog.mjs";
import {
  PARA_ACOMODAR_FOLDER_ID,
  driveFolderUrl,
} from "./lib/haydnBachCatalog.mjs";
import {
  buildSeedSql,
  fetchInstrumentos,
  listFolder,
  personKey,
  personVarSafe,
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

function isCelloBassCombined(fileName) {
  const n = foldName(fileName);
  return /violoncello y contrabajo/.test(n);
}

function pickInstr(instrumentos, pred) {
  return (instrumentos || []).find((i) => pred(i)) || null;
}

function ensureCelloAndBass(parts, file, instrumentos) {
  if (!isCelloBassCombined(file.name || "")) return;
  const url = JSON.stringify([
    { url: file.webViewLink, description: file.name },
  ]);
  const cello = pickInstr(instrumentos, (i) =>
    /violoncello/i.test(i.instrumento || ""),
  );
  const bass = pickInstr(instrumentos, (i) =>
    /contrabajo/i.test(i.instrumento || ""),
  );
  for (let i = parts.length - 1; i >= 0; i -= 1) {
    const n = foldName(parts[i].nombre_archivo);
    if (n.includes("violoncello y contrabajo")) parts.splice(i, 1);
  }
  const pushPart = (instr, label) => {
    if (!instr) return;
    parts.push({
      id_instrumento: instr.id,
      nombre_archivo: label,
      instrumento_nombre: instr.instrumento,
      es_solista: false,
      url_archivo: file.webViewLink ? url : "[]",
    });
  };
  pushPart(cello, "Violoncello");
  pushPart(bass, "Contrabajo");
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
    ensureCelloAndBass(parts, file, instrumentos);
    console.log(`  ${file.name} → ${n} particella(s)`);
  }
  // Re y Sib de la misma silla: una parte, dos links. 1y2 sigue siendo sillas distintas.
  return dedupeParts(collapseSameChairTranspositions(parts));
}

function localPdfFiles(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null }));
}

async function discoverDriveFolderId(work) {
  if (work.driveFolderId) return work.driveFolderId;
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  const files = await listFolder(parentUrl);
  const needle = foldName(work.targetFolder);
  const hit =
    files.find((f) => foldName(f.name) === needle) ||
    files.find((f) => foldName(f.name).includes(needle.slice(0, 24)));
  if (!hit?.id) {
    throw new Error(`Carpeta Drive no encontrada: ${work.targetFolder}`);
  }
  console.log(`  Drive folder: ${hit.name} (${hit.id})`);
  return hit.id;
}

function inferInstrument(fileName, work) {
  const n = foldName(fileName);
  const hit = (work.renames || []).find(
    (r) =>
      foldName(r.pdf) === n ||
      foldName(
        canonicalPartFilename(
          r.instrument,
          work.workNumber,
          work.titulo,
          work.composerTag,
        ),
      ) === n ||
      n.startsWith(foldName(`${r.instrument} - `)),
  );
  return hit?.instrument || null;
}

function mergeDriveLinks(localFiles, driveFiles, work) {
  const byName = new Map(
    (driveFiles || []).map((f) => [foldName(f.name), f]),
  );
  const used = new Set();
  return localFiles.map((f) => {
    const exact = byName.get(foldName(f.name));
    if (exact?.webViewLink) {
      used.add(exact.id || exact.name);
      return { ...f, webViewLink: exact.webViewLink, id: exact.id };
    }
    const inst = inferInstrument(f.name, work);
    if (!inst) return f;
    const driveHit = (driveFiles || []).find((d) => {
      if (used.has(d.id || d.name)) return false;
      return inferInstrument(d.name, work) === inst;
    });
    if (!driveHit?.webViewLink) return f;
    used.add(driveHit.id || driveHit.name);
    return { ...f, webViewLink: driveHit.webViewLink, id: driveHit.id };
  });
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const workData = [];

  for (const work of CONCERTO_COMPETICION_WORKS) {
    const localDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
    const localFiles = localPdfFiles(localDir);
    console.log(`\n=== ${work.titulo} ===`);
    console.log(`  Local: ${localDir} (${localFiles.length} PDFs)`);
    if (!localFiles.length) {
      throw new Error(`Sin PDFs locales: ${work.targetFolder}`);
    }

    const driveId = await discoverDriveFolderId(work);
    const linkDrive = driveFolderUrl(driveId);
    const driveFiles = (await listFolder(linkDrive)).filter((f) =>
      /\.pdf$/i.test(f.name || ""),
    );
    console.log(`  Drive: ${linkDrive} (${driveFiles.length} PDFs)`);

    const files = mergeDriveLinks(localFiles, driveFiles, work);
    const withUrl = files.filter((f) => f.webViewLink).length;
    if (withUrl < localFiles.length) {
      const missing = files.filter((f) => !f.webViewLink).map((f) => f.name);
      throw new Error(
        `URLs Drive incompletas (${withUrl}/${localFiles.length}): ${missing.join("; ")}`,
      );
    }

    const parts = buildPartsFromFiles(files, instrumentos);
    const solos = parts.filter((p) => p.es_solista);
    if (!solos.length) {
      throw new Error(`Sin particella solista: ${work.titulo}`);
    }
    const inst = calculateInstrumentation(parts);
    console.log(`  ${parts.length} partes | solo: ${solos.map((s) => s.nombre_archivo).join(", ")} | ${inst}`);

    workData.push({
      titulo: work.titulo,
      compositors: [work.compositor],
      arranger: work.arranger || null,
      observaciones: work.observaciones,
      link_drive: linkDrive,
      instrumentacion: inst,
      parts,
      anio: work.anio,
      duracion_segundos: null,
    });
  }

  const insertSql = buildSeedSql({
    outComment:
      "-- Concerto Competition: solo catálogo (obras + particellas). Sin programas.",
    workData,
    resolveArrangerVar: (w) =>
      w.arranger ? `_id_arr_${personVarSafe(personKey(w.arranger))}` : "NULL",
  });

  writeSeed("supabase/seed_concerto_competicion_sync.sql", insertSql, workData);
  console.log("\nSeed: supabase/seed_concerto_competicion_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
