/**
 * Re-sincroniza particellas de King Crimson (programa 12, bloque 137)
 * desde las carpetas link_drive, reemplazando stubs sin URL.
 *
 * Uso:
 *   node scripts/sync-king-crimson-particellas.mjs           # dry-run
 *   node scripts/sync-king-crimson-particellas.mjs --apply   # escribe SQL + aplica vía REST
 */
import { writeFileSync } from "fs";
import { calculateInstrumentation } from "./lib/calculateInstrumentation.mjs";
import { appendSeedPartsFromFile } from "./lib/drivePartMatcher.mjs";
import {
  SB_URL,
  fetchInstrumentos,
  headers,
  listFolder,
  sqlEscape,
} from "./lib/repertoireSeedUtils.mjs";

const APPLY = process.argv.includes("--apply");
const SKIP_OBRA_IDS = new Set([3571]); // Larks ya OK

const WORKS = [
  { id: 1109, folder: "17BPkrbQdSPj_ZjcRCQijUyBVbTMMiXCQ" },
  { id: 1110, folder: "1EC1szLNMuDDyf-hCFh6rlwpLI2XLcu8y" },
  { id: 1111, folder: "1TcSrC3tS9_wrcPfu1daTf0e_DlcoFaTL" },
  { id: 1112, folder: "1GzB0v3Yk8MoFc_AT9vn2aKxF70yjtowz" },
  { id: 1114, folder: "1K5g2MnHkmE_9UDpLJgzjun30vi1UOVH4" },
  { id: 1115, folder: "1rxo2FEDyLdohMs8M-qv1IHBzDY6C1J8a" },
  { id: 1120, folder: "187WbY5XlLtt1y-IfFhBcpqBN5oKNkvtX" },
  { id: 1298, folder: "1ID8wBe-YrDiPKqSpVjSnMChyrKEdsIzi" },
  { id: 1300, folder: "1ytrIBfr07_D4DrpfDbZhQkMDIgzC0z5v" },
  { id: 2856, folder: "19ZPCqsyFR7zKxcDnmXpXdzuoCl9V2-WZ" },
  { id: 2857, folder: "1snTPYAVcqCUXlGnDGsCw2FCboNCEkWdH" },
];

function dedupeParts(parts) {
  const map = new Map();
  for (const p of parts) {
    const key = `${p.id_instrumento}|${p.nombre_archivo}`;
    if (map.has(key)) {
      const existing = map.get(key);
      const merged = [
        ...JSON.parse(existing.url_archivo),
        ...JSON.parse(p.url_archivo),
      ];
      // Preferir SCORE "principal" sin (Vertical) como description[0]
      existing.url_archivo = JSON.stringify(merged);
    } else {
      map.set(key, { ...p });
    }
  }
  return [...map.values()];
}

function normName(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

async function fetchObraMeta(ids) {
  const res = await fetch(
    `${SB_URL}/rest/v1/obras?id=in.(${ids.join(",")})&select=id,titulo,link_drive,instrumentacion,obras_particellas(id,nombre_archivo,id_instrumento)`,
    { headers: { Authorization: headers.Authorization, apikey: headers.apikey } },
  );
  return res.json();
}

async function fetchSeatingSnapshot(ids) {
  const res = await fetch(
    `${SB_URL}/rest/v1/seating_asignaciones?id_obra=in.(${ids.join(",")})&select=id,id_programa,id_obra,id_particella,id_contenedor,id_musicos_asignados,obras_particellas(nombre_archivo,id_instrumento)`,
    { headers: { Authorization: headers.Authorization, apikey: headers.apikey } },
  );
  return res.json();
}

async function buildPartsForFolder(folderId, instrumentos) {
  const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
  const files = (await listFolder(folderUrl)).filter((f) =>
    /\.pdf$/i.test(f.name || ""),
  );
  const parts = [];
  const unmatched = [];
  for (const file of files.sort((a, b) =>
    (a.name || "").localeCompare(b.name || "", "es"),
  )) {
    const n = appendSeedPartsFromFile(parts, file, instrumentos);
    if (!n) unmatched.push(file.name);
  }
  return { parts: dedupeParts(parts), unmatched, pdfCount: files.length };
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

async function restFetchParticellas(obraId) {
  const res = await fetch(
    `${SB_URL}/rest/v1/obras_particellas?id_obra=eq.${obraId}&select=id,nombre_archivo,id_instrumento`,
    { headers: { Authorization: headers.Authorization, apikey: headers.apikey } },
  );
  if (!res.ok) throw new Error(`fetch particellas ${obraId}: ${res.status}`);
  return res.json();
}

async function restInsertSeating(rows) {
  if (!rows.length) return;
  // Insertar de a lotes para no saturar
  const chunk = 40;
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const res = await fetch(`${SB_URL}/rest/v1/seating_asignaciones`, {
      method: "POST",
      headers: {
        ...headers,
        Prefer: "return=minimal",
      },
      body: JSON.stringify(slice),
    });
    if (!res.ok) {
      throw new Error(`INSERT seating: ${res.status} ${await res.text()}`);
    }
  }
}

async function applySqlViaLinked(sqlPath) {
  const { spawnSync } = await import("child_process");
  const r = spawnSync(
    "npx",
    ["supabase", "db", "query", "--linked", "-f", sqlPath],
    { encoding: "utf8", shell: true, cwd: process.cwd() },
  );
  if (r.status !== 0) {
    throw new Error(`db query failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout;
}

async function main() {
  const instrumentos = await fetchInstrumentos();
  const ids = WORKS.map((w) => w.id);
  const obras = await fetchObraMeta(ids);
  const obraById = new Map(obras.map((o) => [o.id, o]));
  const seatingSnap = await fetchSeatingSnapshot(ids);

  const plan = [];
  let sql = `-- King Crimson particellas sync (bloque 137, excl. Larks 3571)
-- Generado: ${new Date().toISOString().slice(0, 10)}
-- ${APPLY ? "APPLY mode" : "DRY-RUN"}

`;

  for (const work of WORKS) {
    if (SKIP_OBRA_IDS.has(work.id)) continue;
    const meta = obraById.get(work.id);
    const titulo = meta?.titulo?.replace(/<[^>]+>/g, "") || `obra ${work.id}`;
    const { parts, unmatched, pdfCount } = await buildPartsForFolder(
      work.folder,
      instrumentos,
    );
    const inst = calculateInstrumentation(parts);
    const oldCount = meta?.obras_particellas?.length || 0;

    console.log(
      `\n=== ${work.id} ${titulo.slice(0, 50)} | pdfs=${pdfCount} → parts=${parts.length} (antes ${oldCount}) inst="${inst}"`,
    );
    if (unmatched.length) {
      console.log("  UNMATCHED:", unmatched.join(" | "));
    }
    for (const p of parts) {
      console.log(
        `  ${String(p.id_instrumento).padStart(3)} | ${p.nombre_archivo}`,
      );
    }

    sql += `-- ${work.id} ${titulo.replace(/\n/g, " ").slice(0, 60)}
DELETE FROM obras_particellas WHERE id_obra = ${work.id};
`;
    for (const p of parts) {
      sql += `INSERT INTO obras_particellas (id_obra, id_instrumento, nombre_archivo, url_archivo, es_solista)
VALUES (${work.id}, '${sqlEscape(String(p.id_instrumento))}', '${sqlEscape(p.nombre_archivo)}', '${sqlEscape(p.url_archivo)}', ${p.es_solista ? "true" : "false"});
`;
    }
    sql += `UPDATE obras SET instrumentacion = '${sqlEscape(inst)}' WHERE id = ${work.id};

`;

    plan.push({ work, parts, inst, unmatched, pdfCount, titulo });
  }

  const outPath = "supabase/seed_king_crimson_particellas_sync.sql";
  writeFileSync(outPath, sql, "utf8");
  console.log(`\nSQL escrito: ${outPath}`);

  if (!APPLY) {
    console.log("\nDry-run OK. Re-ejecutá con --apply para escribir en BD.");
    return;
  }

  const seatingByObra = new Map();
  for (const row of seatingSnap || []) {
    if (!seatingByObra.has(row.id_obra)) seatingByObra.set(row.id_obra, []);
    seatingByObra.get(row.id_obra).push(row);
  }
  writeFileSync(
    "supabase/seed_king_crimson_seating_snapshot.json",
    JSON.stringify(seatingSnap || [], null, 2),
    "utf8",
  );
  console.log(
    `\nSnapshot seating: ${(seatingSnap || []).length} filas. Aplicando SQL via linked…`,
  );

  await applySqlViaLinked(outPath);
  console.log("SQL aplicado (particellas reemplazadas; seating cascaded).");

  for (const item of plan) {
    const { work, titulo } = item;
    const inserted = await restFetchParticellas(work.id);
    const oldSeat = seatingByObra.get(work.id) || [];
    if (!oldSeat.length) {
      console.log(`APPLY ${work.id}: particellas=${inserted.length}, sin seating previo`);
      continue;
    }
    const newRows = [];
    const usedParticella = new Set(); // unique (id_programa, id_particella)
    const usedContainer = new Set();
    for (const s of oldSeat) {
      const oldP = s.obras_particellas;
      const match = pickRematch(
        inserted,
        oldP?.nombre_archivo,
        oldP?.id_instrumento,
      );
      if (!match?.id) continue;
      const partKey = `${s.id_programa}|${match.id}`;
      if (usedParticella.has(partKey)) continue;
      const contKey = `${s.id_programa}|${s.id_obra}|${s.id_contenedor}|${JSON.stringify(s.id_musicos_asignados)}`;
      if (usedContainer.has(contKey)) continue;
      usedParticella.add(partKey);
      usedContainer.add(contKey);
      newRows.push({
        id_programa: s.id_programa,
        id_obra: s.id_obra,
        id_particella: match.id,
        id_contenedor: s.id_contenedor,
        id_musicos_asignados: s.id_musicos_asignados,
      });
    }
    try {
      await restInsertSeating(newRows);
      console.log(
        `APPLY ${work.id} ${titulo.slice(0, 35)}: parts=${inserted.length} seating ${newRows.length}/${oldSeat.length}`,
      );
    } catch (e) {
      console.error(`APPLY ${work.id} seating error:`, e.message);
    }
  }

  console.log("\nListo.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
