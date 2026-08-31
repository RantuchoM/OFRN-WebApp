/**
 * Rematch seating desde snapshot tras sync de particellas King Crimson.
 * node scripts/rematch-king-crimson-seating.mjs
 */
import { readFileSync } from "fs";
import { SB_URL, headers } from "./lib/repertoireSeedUtils.mjs";

const snapshot = JSON.parse(
  readFileSync("supabase/seed_king_crimson_seating_snapshot.json", "utf8"),
);

function normName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function pickRematch(newParts, oldNombre, oldInstr) {
  const sameInstr = newParts.filter(
    (p) => String(p.id_instrumento) === String(oldInstr),
  );
  if (!sameInstr.length) return null;
  const target = normName(oldNombre);
  let best = null;
  let bestScore = -1;
  for (const p of sameInstr) {
    const n = normName(p.nombre_archivo);
    let score = 0;
    if (n === target) score = 100;
    else if (n.includes(target) || target.includes(n)) score = 80;
    else {
      const ta = new Set(target.split(" "));
      const tb = new Set(n.split(" "));
      let inter = 0;
      for (const t of ta) if (tb.has(t)) inter++;
      score = inter;
    }
    if (score > bestScore) {
      bestScore = score;
      best = p;
    }
  }
  return bestScore >= 1 ? best : sameInstr[0];
}

async function fetchParticellas(obraId) {
  const res = await fetch(
    `${SB_URL}/rest/v1/obras_particellas?id_obra=eq.${obraId}&select=id,nombre_archivo,id_instrumento`,
    { headers: { Authorization: headers.Authorization, apikey: headers.apikey } },
  );
  return res.json();
}

async function existingSeating(obraId) {
  const res = await fetch(
    `${SB_URL}/rest/v1/seating_asignaciones?id_obra=eq.${obraId}&select=id,id_particella`,
    { headers: { Authorization: headers.Authorization, apikey: headers.apikey } },
  );
  return res.json();
}

async function insertSeating(rows) {
  if (!rows.length) return;
  const res = await fetch(`${SB_URL}/rest/v1/seating_asignaciones`, {
    method: "POST",
    headers: { ...headers, Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
}

const byObra = new Map();
for (const row of snapshot) {
  if (!byObra.has(row.id_obra)) byObra.set(row.id_obra, []);
  byObra.get(row.id_obra).push(row);
}

for (const [obraId, oldSeat] of byObra) {
  const existing = await existingSeating(obraId);
  if (existing.length >= oldSeat.length) {
    console.log(`${obraId}: ya tiene ${existing.length} seating, skip`);
    continue;
  }
  const inserted = await fetchParticellas(obraId);
  const usedPart = new Set(existing.map((e) => `12|${e.id_particella}`));
  const usedCont = new Set();
  const newRows = [];
  for (const s of oldSeat) {
    const match = pickRematch(
      inserted,
      s.obras_particellas?.nombre_archivo,
      s.obras_particellas?.id_instrumento,
    );
    if (!match?.id) continue;
    const partKey = `${s.id_programa}|${match.id}`;
    if (usedPart.has(partKey)) continue;
    const contKey = `${s.id_programa}|${s.id_obra}|${s.id_contenedor}|${JSON.stringify(s.id_musicos_asignados)}`;
    if (usedCont.has(contKey)) continue;
    usedPart.add(partKey);
    usedCont.add(contKey);
    newRows.push({
      id_programa: s.id_programa,
      id_obra: s.id_obra,
      id_particella: match.id,
      id_contenedor: s.id_contenedor,
      id_musicos_asignados: s.id_musicos_asignados,
    });
  }
  await insertSeating(newRows);
  console.log(
    `${obraId}: rematch ${newRows.length}/${oldSeat.length} (previas ${existing.length})`,
  );
}
