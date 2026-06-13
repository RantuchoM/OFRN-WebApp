/**
 * Compara particellas en BD vs archivos actuales en Drive.
 */
import { suggestPartFromDriveFile } from "./lib/drivePartMatcher.mjs";
import {
  fetchInstrumentos,
  headers,
  listFolder,
  SB_URL,
} from "./lib/repertoireSeedUtils.mjs";

const IDS = [
  3491, 3492, 3493, 3495, 3496, 3506, 3507, 3508, 3509, 3510, 3511, 3512,
  3513, 3514,
];

async function fetchObras() {
  const res = await fetch(
    `${SB_URL}/rest/v1/obras?id=in.(${IDS.join(",")})&select=id,titulo,link_drive,instrumentacion,obras_particellas(id,nombre_archivo,id_instrumento,url_archivo,instrumentos(instrumento))`,
    { headers: { Authorization: headers.Authorization, apikey: headers.apikey } },
  );
  return res.json();
}

function fileIdFromUrl(url) {
  const m = String(url || "").match(/\/file\/d\/([^/]+)/);
  return m?.[1] || null;
}

function descFromPart(p) {
  try {
    const arr = JSON.parse(p.url_archivo);
    return arr?.[0]?.description || arr?.[0]?.url || "";
  } catch {
    return p.url_archivo || "";
  }
}

const instrumentos = await fetchInstrumentos();
const obras = await fetchObras();

for (const obra of obras.sort((a, b) => a.id - b.id)) {
  const files = (await listFolder(obra.link_drive)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  const byFileId = new Map(files.map((f) => [f.id, f]));
  const suggested = new Map();
  for (const f of files) {
    const s = suggestPartFromDriveFile(f, instrumentos);
    if (s) suggested.set(f.id, s);
  }

  let staleDesc = 0;
  let wrongInst = 0;
  let missingInBd = 0;
  const bdIds = new Set();

  for (const p of obra.obras_particellas || []) {
    const desc = descFromPart(p);
    let url = "";
    try {
      url = JSON.parse(p.url_archivo)?.[0]?.url || "";
    } catch {
      url = p.url_archivo || "";
    }
    const fid = fileIdFromUrl(url);
    if (fid) bdIds.add(fid);
    const drive = fid ? byFileId.get(fid) : null;
    if (drive && desc !== drive.name) staleDesc++;
    const sug = fid ? suggested.get(fid) : null;
    if (sug && String(sug.id_instrumento) !== String(p.id_instrumento)) wrongInst++;
    if (sug && sug.nombre_archivo !== p.nombre_archivo) wrongInst++;
  }

  for (const f of files) {
    if (!bdIds.has(f.id)) missingInBd++;
  }

  const needs =
    staleDesc > 0 || wrongInst > 0 || missingInBd > 0 ||
    files.length !== (obra.obras_particellas?.length || 0);

  if (needs) {
    console.log(
      `\n[${obra.id}] ${obra.titulo} | drive:${files.length} bd:${obra.obras_particellas?.length || 0} | stale:${staleDesc} wrong:${wrongInst} missing:${missingInBd}`,
    );
  }
}
