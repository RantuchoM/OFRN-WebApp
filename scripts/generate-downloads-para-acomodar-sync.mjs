/**
 * Seed Drive → BD para las 4 obras de Downloads/Para acomodar.
 *
 *   node scripts/generate-downloads-para-acomodar-sync.mjs
 */
import { existsSync, readdirSync } from "fs";
import { join } from "path";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import {
  appendSeedPartsFromFile,
  attachDriveLinksByFilename,
  parsePartSlot,
  suggestPartsFromDriveFile,
} from "./lib/drivePartMatcher.mjs";
import {
  BERNSTEIN_CANDIDE_WORK,
  PARA_ACOMODAR_FOLDER_ID as CANDIDE_PARENT,
  PARA_ACOMODAR_ROOT as CANDIDE_ROOT,
  driveFolderUrl as candideUrl,
} from "./lib/bernsteinCandideCatalog.mjs";
import { canonicalNameForItem, foldName } from "./lib/processParaAcomodarWork.mjs";
import {
  PROKOFIEV_ROMEO_WORKS,
  PARA_ACOMODAR_FOLDER_ID as ROMEO_PARENT,
  PARA_ACOMODAR_ROOT as ROMEO_ROOT,
  driveFolderUrl as romeoUrl,
} from "./lib/prokofievRomeoCatalog.mjs";
import {
  ROSSINI_BARBERO_WORK,
  PARA_ACOMODAR_FOLDER_ID as BARBERO_PARENT,
  PARA_ACOMODAR_ROOT as BARBERO_ROOT,
  driveFolderUrl as barberoUrl,
} from "./lib/rossiniBarberoCatalog.mjs";
import {
  SB_URL,
  buildSeedSql,
  fetchInstrumentos,
  fetchWorkMetadata,
  headers,
  listFolder,
  personKey,
  personVarSafe,
  sleep,
  sqlEscape,
  writeSeed,
} from "./lib/repertoireSeedUtils.mjs";

const PARA_ACOMODAR_ROOT = CANDIDE_ROOT || ROMEO_ROOT || BARBERO_ROOT;
const PARA_ACOMODAR_FOLDER_ID =
  CANDIDE_PARENT || ROMEO_PARENT || BARBERO_PARENT;
const driveFolderUrl = (id) =>
  candideUrl(id) || romeoUrl(id) || barberoUrl(id);

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

function slotKey(name) {
  const slot = parsePartSlot(name);
  const base = String(slot.baseNorm || "")
    .replace(/\btimbal(es)?\b/g, "timp")
    .replace(/\btimpani\b/g, "timp")
    .replace(/\bviolonchelo\b/g, "violoncello")
    .replace(/\s+/g, " ")
    .trim();
  const num = slot.slotNumber != null ? String(slot.slotNumber) : "x";
  return `${base}|${num}`;
}

function localPdfFiles(dir) {
  if (!dir || !existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => /\.pdf$/i.test(f))
    .map((name) => ({ name, webViewLink: null, id: `local:${name}` }));
}

function mergeDriveLinks(localFiles, driveFiles) {
  const byName = new Map(
    (driveFiles || []).map((f) => [foldName(f.name), f]),
  );
  return localFiles.map((f) => {
    const hit = byName.get(foldName(f.name));
    if (!hit?.webViewLink) return f;
    return { ...f, webViewLink: hit.webViewLink, id: hit.id };
  });
}

function isSinArcos(name) {
  return /\(sin arcos\)/i.test(name || "");
}

function buildInsertParts(files, instrumentos, work) {
  const mains = files.filter((f) => !isSinArcos(f.name));
  const extras = files.filter((f) => isSinArcos(f.name));
  const parts = [];
  for (const file of mains.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
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

  for (const file of extras) {
    const suggested = suggestPartsFromDriveFile(file, instrumentos)[0];
    if (!suggested) {
      console.warn("  Extra sin match:", file.name);
      continue;
    }
    const key = `${suggested.id_instrumento}|${suggested.nombre_archivo}`;
    const host = parts.find(
      (p) => `${p.id_instrumento}|${p.nombre_archivo}` === key,
    );
    if (!host) {
      console.warn("  Extra sin host:", file.name);
      continue;
    }
    if (!file.webViewLink) continue;
    const links = JSON.parse(host.url_archivo || "[]");
    links.push({ url: file.webViewLink, description: file.name });
    host.url_archivo = JSON.stringify(links);
    console.log(`  extra arcos → ${suggested.nombre_archivo}: ${file.name}`);
  }

  for (const item of work.renames || []) {
    if (!item.alsoInstruments?.length) continue;
    const pianoName = foldName(canonicalNameForItem(work, item));
    const pianoFile = files.find((f) => foldName(f.name) === pianoName);
    if (!pianoFile) continue;
    for (const extraInst of item.alsoInstruments) {
      const fake = {
        name: canonicalNameForItem(work, { instrument: extraInst }),
        webViewLink: pianoFile.webViewLink,
      };
      const n = appendSeedPartsFromFile(parts, fake, instrumentos);
      console.log(
        `  also ${extraInst} ← ${pianoFile.name} (${n} particella(s))`,
      );
    }
  }

  return dedupeParts(parts);
}

async function discoverDriveFolderId(work) {
  if (work.driveFolderId) return work.driveFolderId;
  const parentUrl = driveFolderUrl(PARA_ACOMODAR_FOLDER_ID);
  try {
    const files = await listFolder(parentUrl);
    const needle = foldName(work.targetFolder);
    const hit =
      files.find((f) => foldName(f.name) === needle) ||
      files.find((f) => foldName(f.name).includes(needle.slice(0, 22)));
    if (hit?.id) {
      console.log(`  Drive folder: ${hit.name} (${hit.id})`);
      return hit.id;
    }
    console.warn(`  Para acomodar Drive aún no lista: ${work.targetFolder}`);
  } catch (e) {
    console.warn("  list_folder parent:", e.message);
  }
  return null;
}

async function filesForWork(work) {
  const localDir = join(PARA_ACOMODAR_ROOT, work.targetFolder);
  const localFiles = localPdfFiles(localDir);
  console.log(`  Local: ${localDir} (${localFiles.length} PDFs)`);
  const folderId = await discoverDriveFolderId(work);
  let driveFiles = [];
  if (folderId) {
    try {
      driveFiles = (await listFolder(driveFolderUrl(folderId))).filter((f) =>
        /\.pdf$/i.test(f.name || ""),
      );
      console.log(`  Drive PDFs: ${driveFiles.length}`);
    } catch (e) {
      console.warn("  list_folder work:", e.message);
    }
  }
  const files = mergeDriveLinks(localFiles, driveFiles);
  const withUrl = files.filter((f) => f.webViewLink).length;
  if (localFiles.length && withUrl < localFiles.length) {
    console.warn(
      `  URLs Drive incompletas (${withUrl}/${localFiles.length}). Re-ejecutar tras sync File Stream.`,
    );
  }
  return { files, folderId, withUrl, localCount: localFiles.length };
}

async function fetchExistingParts(obraId) {
  const res = await fetch(
    `${SB_URL}/rest/v1/obras_particellas?id_obra=eq.${obraId}&select=id,id_instrumento,nombre_archivo,url_archivo,es_solista,instrumentos(instrumento)`,
    { headers: { Authorization: headers.Authorization, apikey: headers.apikey } },
  );
  const rows = await res.json();
  return (rows || []).map((p) => ({
    ...p,
    instrumento_nombre: p.instrumentos?.instrumento || "",
    links: [],
  }));
}

async function seedInsertWork(work, instrumentos) {
  console.log(`\n=== INSERT ${work.titulo} ===`);
  const { files, folderId, withUrl, localCount } = await filesForWork(work);
  const parts = buildInsertParts(files, instrumentos, work);
  const inst = calculateInstrumentation(parts);
  const fetched = await fetchWorkMetadata(
    work.titulo,
    work.compositor,
    `${work.compositor.nombre || ""} ${work.compositor.apellido} ${work.titulo}`.trim(),
  );
  await sleep(250);
  const anio = work.anio ?? fetched.anio ?? null;
  let duracion = fetched.duracion_segundos ?? null;
  if (
    duracion != null &&
    /suite/i.test(work.titulo) &&
    (duracion < 900 || duracion > 2400)
  ) {
    duracion = null;
  }
  if (duracion != null && duracion > 1800 && !/suite/i.test(work.titulo)) {
    duracion = null;
  }
  console.log(
    `  ${parts.length} partes | ${inst} | anio=${anio ?? "null"} dur=${duracion ?? "null"}s | urls=${withUrl}/${localCount}`,
  );

  const linkDrive = folderId ? driveFolderUrl(folderId) : "";
  const workData = [
    {
      titulo: work.titulo,
      compositors: [work.compositor],
      arranger: work.arranger || null,
      observaciones: `Para acomodar — ${work.targetFolder}`,
      link_drive: linkDrive,
      instrumentacion: inst,
      parts,
      anio,
      duracion_segundos: duracion,
    },
  ];
  const resolveArrangerVar = work.arranger
    ? () => `_id_arr_${personVarSafe(personKey(work.arranger))}`
    : () => "NULL";
  return {
    sql: buildSeedSql({
      outComment: `-- ${work.composerTag} — ${work.titulo}`,
      workData,
      resolveArrangerVar,
    }),
    work,
    folderId,
    parts,
    inst,
    withUrl,
    localCount,
  };
}

async function seedUpdateBarbero(instrumentos) {
  const work = ROSSINI_BARBERO_WORK;
  console.log(`\n=== UPDATE in-place ${work.titulo} (obra ${work.obraId}) ===`);
  const existing = await fetchExistingParts(work.obraId);
  console.log(`  Placeholders: ${existing.length}`);
  const { files, folderId, withUrl, localCount } = await filesForWork(work);
  const linked = attachDriveLinksByFilename(existing, files);

  const usedFileIds = new Set();
  for (const p of linked) {
    for (const l of p.links || []) {
      const hit = files.find((f) => f.webViewLink === l.url);
      if (hit?.id) usedFileIds.add(hit.id);
    }
  }
  const existingByKey = new Map(
    linked.map((p) => [slotKey(p.nombre_archivo), p]),
  );
  for (const file of files) {
    if (usedFileIds.has(file.id) || !file.webViewLink) continue;
    const key = slotKey(file.name);
    const part = existingByKey.get(key);
    if (!part || (part.links || []).length) continue;
    part.links = [{ url: file.webViewLink, description: file.name }];
    usedFileIds.add(file.id);
  }

  const matched = linked.filter((p) => (p.links || []).length);
  const unmatched = linked.filter((p) => !(p.links || []).length);
  const extraFiles = files.filter((f) => !usedFileIds.has(f.id));
  console.log(`  Matched: ${matched.length}/${existing.length}`);
  for (const p of matched) {
    console.log(`  ✓ ${p.id} ${p.nombre_archivo} ← ${p.links[0]?.description}`);
  }
  for (const p of unmatched) {
    console.log(`  • sin PDF: ${p.id} ${p.nombre_archivo}`);
  }
  for (const f of extraFiles) {
    console.log(`  • extra Drive: ${f.name}`);
  }

  const inst = calculateInstrumentation(
    matched.length ? matched : existing,
  );
  const linkDrive = folderId ? driveFolderUrl(folderId) : null;
  const obs = `Para acomodar — ${work.targetFolder} (arr. Bergler, quinteto de bronces).`;

  let sql = `-- Rossini — El Barbero de Sevilla → obra ${work.obraId}
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- UPDATE in-place. NO borra particellas ni seating.

DO $$
BEGIN
  UPDATE obras SET
`;
  if (linkDrive) {
    sql += `    link_drive = '${sqlEscape(linkDrive)}',\n`;
  }
  sql += `    observaciones = '${sqlEscape(obs)}',
    instrumentacion = '${sqlEscape(inst || work.instrumentacion || "0.0.0.0 - 1.2.1.1")}'
  WHERE id = ${work.obraId};

`;
  for (const p of matched) {
    const url = JSON.stringify(p.links);
    sql += `  UPDATE obras_particellas SET
    url_archivo = '${sqlEscape(url)}'
  WHERE id = ${p.id} AND id_obra = ${work.obraId};

`;
  }
  sql += `END $$;
`;
  return { sql, work, folderId, matched, unmatched, withUrl, localCount };
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  if (!Array.isArray(instrumentos)) {
    throw new Error("No se pudo leer instrumentos");
  }

  const candide = await seedInsertWork(BERNSTEIN_CANDIDE_WORK, instrumentos);
  writeSeed("supabase/seed_bernstein_candide_sync.sql", candide.sql, [
    BERNSTEIN_CANDIDE_WORK,
  ]);

  const barbero = await seedUpdateBarbero(instrumentos);
  writeSeed("supabase/seed_rossini_barbero_sync.sql", barbero.sql, [
    ROSSINI_BARBERO_WORK,
  ]);

  const romeoBits = [];
  for (const work of PROKOFIEV_ROMEO_WORKS) {
    romeoBits.push(await seedInsertWork(work, instrumentos));
  }
  writeSeed(
    "supabase/seed_prokofiev_romeo_sync.sql",
    romeoBits.map((r) => r.sql).join("\n"),
    PROKOFIEV_ROMEO_WORKS,
  );

  console.log("\nSeeds:");
  console.log("  supabase/seed_bernstein_candide_sync.sql");
  console.log("  supabase/seed_rossini_barbero_sync.sql");
  console.log("  supabase/seed_prokofiev_romeo_sync.sql");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
