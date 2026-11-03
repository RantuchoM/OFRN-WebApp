/**
 * Fase 1 (decisiones): arma HTMLs interactivos en Downloads para decidir qué cargar de
 * `H:\Mi unidad\Archivo - para organizar` con para-acomodar-particellas.
 *
 *   node scripts/_tmp_inventory_para_organizar.mjs         # inventario -> %TEMP%\ofrn_inv\inventory.json
 *   (obras.json / comps.json en %TEMP%\ofrn_inv, via `supabase db query --linked`)
 *   node scripts/_tmp_build_archivo_para_organizar_carga.mjs [--dump]
 *
 * No procesa ni sube nada. Solo lectura de Drive local + BD.
 */
import fs from "fs";
import os from "os";
import path from "path";
import { pathToFileURL } from "url";

const TMP = path.join(os.tmpdir(), "ofrn_inv");
const DL = process.env.OUT_DIR || "C:\\Users\\marti\\Downloads";
const GENERAL = "H:\\Mi unidad\\Archivo General OFRN";
const PARA_ACOMODAR = path.join(GENERAL, "Para acomodar");
const dump = process.argv.includes("--dump");

const readJsonRows = (f) => {
  const t = fs.readFileSync(path.join(TMP, f), "utf8");
  return JSON.parse(t.slice(t.indexOf("{"))).rows;
};
const inv = JSON.parse(fs.readFileSync(path.join(TMP, "inventory.json"), "utf8"));
const OBRAS = readJsonRows("obras.json");
const COMPS = readJsonRows("comps.json");

// ───────────────────────── normalización ─────────────────────────
const strip = (s) => String(s ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const ALIAS = [
  [/malher/g, "mahler"],
  [/haendel|handell|handel|hendel/g, "handel"],
  [/mendelson/g, "mendelssohn"],
  [/strasuss|strauus/g, "strauss"],
  [/chaikovski|tchaikowsky|tchaikovski|tschaikowsky/g, "tchaikovsky"],
  [/shymphony|symphony|sinfonia|sinfonie/g, "sinfonia"],
  [/concerto/g, "concierto"],
  [/overture|obertura|ouverture/g, "obertura"],
  [/tammhauser|tannhauser/g, "tannhauser"],
  [/morttal/g, "mortal"],
  [/dancin\b/g, "dancing"],
  [/larlesienne|l arlesienne/g, "arlesienne"],
  [/messias/g, "messiah"],
  [/allelujah|alleluia|aleluya|hallelujah/g, "hallelujah"],
  [/romeo y julieta|romeo and juliet/g, "romeo julieta"],
  [/pression/g, "pressure"],
  [/consquest/g, "conquest"],
  [/favorities|favoritas|favourites|favorites/g, "favorites"],
  [/hirdaith/g, "hirdaith"],
  [/guestrin|guernin/g, "guestrin"],
  [/retamoza/g, "retamosa"],
  [/phanton/g, "phantom"],
  [/spasiuk|spaciuk/g, "spasiuk"],
];
const norm = (s) => {
  let t = strip(s).toLowerCase().replace(/&nbsp;|&amp;/g, " ").replace(/[´`'’‘]/g, "");
  for (const [rx, to] of ALIAS) t = t.replace(rx, to);
  return t.replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
};
const STOP = new Set(
  "para de del la el los las en con y e o a al un una por que the and of for from op opus nro no nº mayor menor major minor orquesta orquestal orquesta sola sola solo score partitura partituras partes parte completo completa completas full part parts particellas particella obras obra version versiones arreglo arr str string strings timp timb perc piano ver copia grupo del partifi photo mov movimiento movimientos tpt voz coro".split(
    " ",
  ),
);
const toks = (s) =>
  norm(s)
    .split(" ")
    .filter((t) => t.length > 2 && !STOP.has(t) && !/^\d+$/.test(t));
const same = (a, b) => a === b || (a.length >= 5 && b.length >= 5 && a.slice(0, 5) === b.slice(0, 5));

// ───────────────────────── completitud (SCORE + partes) ─────────────────────────
// Una obra es "completa" solo si hay >=1 PDF de SCORE y >=1 PDF de parte instrumental.
const INSTR_RX = /(?<![a-z])(violin|violines|viola|violas|cello|violoncello|violonchelo|contrabajo|bajo|flauta|flute|oboe|clarinete|clarinet|fagot|bassoon|corno|horn|trompeta|trumpet|trombon|trombone|tuba|arpa|harp|timbal|timpani|percusion|piano|vl|va|vc|cb|fl|ob|cl|fg|cor|tpt|tbn|tbn)(?![a-z])/;
const SCORE_FOLDER_RX = /^(scores?|full ?scores?|photo ?score|score .*|partituras? generales?|conductor)$/;
const SCORE_NAME_RX = /(?<![a-z])(full[\s_-]*score|fullscore|scores?|partituras?|partitur|partitions?|spartito|conductor|direttore|direccion)(?![a-z])/;
const COVER_RX = /(?<![a-z])(portada|portadilla|cover|tapa|caratula|index|indice|contenido|libreto|libretto|program|programa|texto|audio|reduccion|reduction|vocal part|manual|instrucciones|readme|foto|fotos)(?![a-z])/;
const PARTS_WORD_RX = /(?<![a-z])(parts?|partes|particellas?|particelle|stimmen|voces)(?![a-z])/;
function classifyFiles(files) {
  // files: rutas tipo "Carpeta\\Sub\\archivo.pdf" (la ruta ya es relativa a la obra)
  let nScore = 0, nParts = 0, nCover = 0;
  for (const f of files) {
    const segs = String(f).split(/[\\/]/);
    const file = norm(segs.pop().replace(/\.pdf$/i, ""));
    const folders = segs.map((s) => norm(s));
    const inScoreFolder = folders.some((s) => SCORE_FOLDER_RX.test(s));
    let isScore = inScoreFolder || (SCORE_NAME_RX.test(file) && !(/partitura/.test(file) && INSTR_RX.test(file)));
    const isPartsWord = PARTS_WORD_RX.test(file) || folders.some((s) => PARTS_WORD_RX.test(s));
    const isCover = COVER_RX.test(file) && !isScore;
    if (isCover) {
      nCover++;
      continue;
    }
    if (isScore) {
      nScore++;
      // "Score and parts" / "Partitura y partes" en un mismo PDF -> cuenta también como partes
      if (PARTS_WORD_RX.test(file) && SCORE_NAME_RX.test(file)) nParts++;
    } else nParts++;
  }
  return { nScore, nParts, nCover };
}
function applyCompleteness(r) {
  if (r.type === "comprimido") {
    const a = r.archive || {};
    if (!a.listed) {
      Object.assign(r, { hasScore: null, hasParts: null, nScore: null, nParts: null, compl: "desconocida", complWhy: "No se pudo listar el comprimido (incompleto_o_desconocido)" });
      return;
    }
  }
  const files = r._files || [];
  const c = classifyFiles(files);
  r.nScore = c.nScore;
  r.nParts = c.nParts;
  r.hasScore = c.nScore > 0;
  r.hasParts = c.nParts > 0;
  if (r.hasScore && r.hasParts) {
    r.compl = "completa";
    r.complWhy = "";
  } else {
    r.compl = "incompleta";
    r.complWhy = !files.length ? "Sin PDFs (solo " + (r.emptyInfo ? r.emptyInfo.replace(/^Solo contiene: /, "") : r.srcs || r.auds ? "fuentes .mus/.sib o audio" : "otros formatos / vacía") + ")" : !r.hasScore && !r.hasParts ? "Sin SCORE ni partes reconocibles (solo portadas u otros)" : !r.hasScore ? `Sin SCORE (${c.nParts} PDF de partes)` : `Solo SCORE (${c.nScore}), sin partes`;
  }
}

// ───────────────────────── BD ─────────────────────────
const compList = COMPS.map((c) => ({ ...c, n: norm(c.apellido) })).filter((c) => c.n.length >= 4);
const compByN = new Map();
for (const c of compList) if (!compByN.has(c.n)) compByN.set(c.n, c);
const DB = OBRAS.map((o) => {
  const text = `${o.titulo} ${o.comp || ""}`;
  return {
    ...o,
    tokens: [...new Set(toks(text))],
    titleToks: [...new Set(toks(o.titulo))],
    digits: new Set(norm(o.titulo).split(" ").filter((t) => /^\d{1,3}$/.test(t))),
    compN: norm(o.comp || ""),
    titulo1: String(o.titulo).replace(/\s+/g, " ").trim().slice(0, 70),
  };
});
// apellidos repetidos: preferir el compositor con más obras en BD
const compObras = new Map();
for (const o of OBRAS) for (const part of String(o.comp || "").split(" / ")) compObras.set(norm(part), (compObras.get(norm(part)) || 0) + 1);
{
  const byCount = (c) => compObras.get(norm(`${c.apellido}${c.nombre ? ", " + c.nombre : ""}`)) || 0;
  for (const c of compList) {
    const cur = compByN.get(c.n);
    if (cur && byCount(c) > byCount(cur)) compByN.set(c.n, c);
  }
}

const COMP_BLACKLIST = new Set(["gerez", "lema"]);
// apellidos de la BD que en nombres de carpeta suelen ser palabras comunes / intérpretes, no compositores
const NOT_COMP = new Set(["alas", "queen", "luna", "vera", "arcos", "brass", "gato", "carmen", "sinfonia", "gloria", "partes", "coro", "mayo", "ave", "espana"]);
function detectComposer(...names) {
  for (const name of names) {
    if (COMP_BLACKLIST.has(norm(name))) continue;
    const t = norm(name).split(" ");
    let best = null;
    for (let i = 0; i < t.length; i++) {
      const c = compByN.get(t[i]);
      if (c && !NOT_COMP.has(c.n) && (!best || c.n.length > best.n.length)) best = c;
    }
    if (best) return best;
  }
  return null;
}

function scoreAgainst(A0, comp, db, rawDigits) {
  // A0: tokens candidatos. Se quitan los del compositor detectado (se evalúan aparte).
  const cn = comp ? comp.n : null;
  let A = A0.filter((a) => !(cn && same(a, cn)));
  if (!A.length) A = A0;
  if (!A.length) return { s: 0, tm: 0, ac: 0, dt: 0, bonus: 0 };
  let m = 0,
    tm = 0;
  for (const a of A) {
    if (db.titleToks.some((b) => same(a, b))) {
      m++;
      tm++;
    } else if (db.tokens.some((b) => same(a, b))) m++;
  }
  let s = m / A.length;
  if (tm === 0) return { s: 0, tm, ac: A.length, dt: db.titleToks.length, bonus: 0 };
  if (m < 2 && A.length > 2) s *= 0.5;
  if (comp) {
    if (db.compN.includes(comp.n)) s += 0.1;
    else s -= 0.25;
  }
  if (rawDigits && rawDigits.length && !rawDigits.every((d) => db.digits.has(d))) s -= 0.3;
  const bonus = 0.1 * (tm / Math.max(db.titleToks.length, 1));
  return { s: Math.max(0, Math.min(1, s)), tm, ac: A.length, dt: db.titleToks.length, bonus };
}
function topMatches(A, comp, rawDigits, n = 3) {
  return DB.map((d) => ({ d, ...scoreAgainst(A, comp, d, rawDigits) }))
    .filter((x) => x.s >= 0.4)
    .sort((a, b) => b.s + b.bonus - (a.s + a.bonus))
    .slice(0, n);
}

// ───────────────────────── catálogo del lote 2026-10-30 (#3707–#3740) ─────────────────────────
const catMod = await import(pathToFileURL(path.resolve("scripts/lib/archivoParaOrganizarCatalog.mjs")).href);
const CAT_DONE = new Map(); // rel normalizado -> obra id
catMod.ARCHIVO_PARA_ORGANIZAR_WORKS.forEach((w, i) => CAT_DONE.set(norm(w.sourceRel.replace(/\\/g, "/")), 3707 + i));
const CAT_SKIPPED = [
  ["Falla Homenajes", /homenajes/i, 3529],
  ["Back to the Future", /back to the future/i, 2277],
  ["Avatar", /^avatar/i, 2014],
  ["Indiana Jones", /indiana jones/i, 2352],
  ["Take Five", /take five/i, 2691],
  ["Chicago", /^chicago/i, 1963],
  ["Sabre Dance", /sabre dance/i, 1134],
  ["Misión Imposible (Lema)", /^mission impossible/i, 3603],
  ["Across the Stars", /across the stars/i, 2350],
  ["Huayno del Diablo", /huayno del diablo/i, 2802],
];

// ───────────────────────── Archivo General / Para acomodar (solo nombres de carpeta) ─────────────────────────
function listDirsDepth(root, maxDepth, skipNames = new Set()) {
  const out = [];
  const rec = (p, d) => {
    let ents = [];
    try {
      ents = fs.readdirSync(p, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of ents) {
      if (!e.isDirectory() || skipNames.has(e.name)) continue;
      const fp = path.join(p, e.name);
      out.push({ name: e.name, full: fp });
      if (d < maxDepth) rec(fp, d + 1);
    }
  };
  rec(root, 1);
  return out;
}
const paDirs = listDirsDepth(PARA_ACOMODAR, 1).map((x) => ({ ...x, t: [...new Set(toks(x.name))], comp: detectComposer(x.name) }));
const genDirs = listDirsDepth(GENERAL, 4, new Set(["Para acomodar", "Scores sueltos"])).map((x) => ({
  ...x,
  rel: x.full.replace(GENERAL + "\\", ""),
  t: [...new Set(toks(x.name))],
  comp: detectComposer(x.name),
}));
function matchDirs(A, comp, dirs, minScore) {
  let best = null;
  for (const d of dirs) {
    if (!d.t.length) continue;
    let m = 0;
    for (const a of A) if (d.t.some((b) => same(a, b))) m++;
    let s = m / Math.max(A.length, 1);
    if (m < 2 && A.length > 2) s *= 0.5;
    // precisión: no matchear carpetas "contenedor" muy largas en texto
    const prec = m / Math.max(d.t.length, 1);
    s = Math.min(s, 0.4 + prec * 0.6);
    if (comp && d.comp && comp.n !== d.comp.n) s -= 0.25;
    if (!best || s > best.s) best = { d, s };
  }
  return best && best.s >= minScore ? best : null;
}

// ───────────────────────── agrupar unidades en "obras" ─────────────────────────
const GENERIC = /^(parts?|partes( coro| orquesta)?|particellas?|danza particellas|urupampa particellas|archivos? varios|reemplaz\w*|reemplazo \d+ movimiento|reducci[oó]n.*|partifi|photo score|obra completa|full score.*|scores?|audios?.*|pdfs?|alas (maderas|cuerdas|metales|coro|percusi[oó]n)|extras?|completo)$/i;
const MERGE_CONTAINERS = new Set([
  "archivo viejo\\mujeres somos!",
  "archivo viejo\\alas a malala",
  "archivo viejo\\malher sinfonía fin del mundo",
]);
// Carpetas "colección": sus PDFs directos son obras distintas -> una fila por obra (agrupadas por primer token)
const SPLIT_COLLECTIONS = /^(brass|inamu|para cortar|acomodar en drive|obras 2023|scores|revisar|revisar si ya est\w+|nueva carpeta|archivo viejo|ensamble|gerez)$/i;
const rel = (u) => u.rel;
const lc = (s) => s.toLowerCase();
const byRel = new Map(inv.units.map((u) => [lc(u.rel), u]));
const allRels = inv.units.map((u) => u.rel);

// ancestro "raíz de obra" saltando carpetas genéricas
function workRoot(u) {
  let r = u.rel;
  let cur = u;
  while (GENERIC.test(path.basename(r)) && !/^para cortar\\scores$/i.test(r)) {
    const p = path.dirname(r);
    if (!p || p === ".") break;
    r = p;
  }
  return r;
}
const groups = new Map();
for (const u of inv.units) {
  let key = workRoot(u);
  // merge containers manuales
  const lk = lc(key);
  for (const m of MERGE_CONTAINERS) if (lk === m || lk.startsWith(m + "\\")) key = key.slice(0, m.length);
  if (!groups.has(key)) groups.set(key, { key, units: [] });
  groups.get(key).units.push(u);
}
// plegar subcarpetas "misma obra" (comparten tokens con el padre y el padre tiene PDFs directos)
const keys = [...groups.keys()].sort((a, b) => b.length - a.length);
for (const k of keys) {
  const g = groups.get(k);
  if (!g) continue;
  const parent = path.dirname(k);
  if (!parent || parent === ".") continue;
  const pg = groups.get(parent);
  if (!pg) continue;
  const pHasPdf = pg.units.some((u) => u.rel === parent && u.pdfDirect > 0);
  if (!pHasPdf) continue;
  const tp = new Set(toks(path.basename(parent)));
  const tc = toks(path.basename(k));
  const overlap = tc.filter((t) => [...tp].some((p) => same(p, t))).length;
  const siblingsOfParent = [...groups.keys()].filter((x) => path.dirname(x) === parent).length;
  if (overlap >= 2 || (overlap >= 1 && siblingsOfParent <= 1)) {
    pg.units.push(...g.units);
    groups.delete(k);
  }
}

// ───────────────────────── nombre canónico sugerido ─────────────────────────
function cleanTitle(name) {
  const words = name.replace(/[_]+/g, " ").split(/\s+/);
  const keep = words.filter((w) => !(/^\d?[A-Za-z]*\d+[A-Za-z]*-\d{3,4}/.test(w) || /^\d?(Pic|EH)\d+-/.test(w) || /^Soprano-\d{4}/i.test(w) || /^\d{4}-\d{4}/.test(w)));
  return keep.join(" ").replace(/\s+/g, " ").replace(/^[\d.\-\s]+(?=[A-Za-zÁÉÍÓÚ])/, "").replace(/\s*[-–]\s*$/, "").trim();
}
function titleCase(s) {
  if (s === s.toUpperCase() && /[A-Z]{4}/.test(s)) return s.toLowerCase().replace(/(^|\s)([a-záéíóúñ])/g, (m, a, b) => a + b.toUpperCase());
  return s;
}
function suggestName(g) {
  const base = path.basename(g.key);
  const parentNames = g.key.split("\\").slice(0, -1);
  if (/^[^,]+,\s*[A-ZÁÉÍÓÚ][\w.]*\.?\s*-\s+\S/.test(base) || /^[A-ZÁÉÍÓÚa-záéíóúñ]+(-[A-ZÁÉÍÓÚa-záéíóúñ]+)+\s+-\s+\S/.test(base)) return { name: base, composer: null, canonical: true };
  const title0 = cleanTitle(base);
  const comp = detectComposer(title0, ...parentNames.slice().reverse());
  let title = title0;
  if (comp) {
    const firstN = new Set(norm(comp.nombre || "").split(" ").filter((t) => t.length > 2));
    const words = title.split(/\s+/);
    const kept = words.filter((w) => {
      const n = norm(w);
      return n !== comp.n && !(firstN.has(n) && words.some((x) => norm(x) === comp.n));
    });
    const nt = kept.join(" ").replace(/^\s*[-–,.]\s*|\s*[-–,]\s*$/g, "").trim();
    title = nt.length ? nt : title0;
  }
  title = titleCase(title.replace(/\s+/g, " ").trim());
  if (!comp) return { name: `[Compositor?] - ${title}`, composer: null, canonical: false };
  const ini = comp.nombre ? comp.nombre.trim().split(/\s+/).map((w) => w[0].toUpperCase() + ".").join("") : "";
  return { name: `${comp.apellido}${ini ? ", " + ini : ""} - ${title}`, composer: comp, canonical: false };
}

// ───────────────────────── construir filas ─────────────────────────
const rows = [];
let seq = 0;
const nextKey = () => `r${String(++seq).padStart(4, "0")}`;
const sum = (arr, f) => arr.reduce((s, x) => s + (f(x) || 0), 0);

function phaseOf(relPath, isArchive) {
  const top = relPath.split("\\")[0];
  if (isArchive) return "5";
  if (top === "GEREZ") return "2";
  if (top === "Archivo viejo") return null; // se reparte luego A/B
  return "1";
}

function evaluate(name, relPath, parentNames, extra = {}) {
  const base = name;
  const generic = GENERIC.test(base);
  const title0 = cleanTitle(generic ? parentNames[parentNames.length - 1] || base : base);
  const A = [...new Set(toks(title0))];
  const comp = detectComposer(title0, ...parentNames.slice().reverse());
  const digits = norm(title0).split(" ").filter((t) => /^\d{1,3}$/.test(t));
  return { A, comp, title0, digits };
}

for (const g of groups.values()) {
  const main = g.units.find((u) => u.rel === g.key) || g.units[0];
  const pdfs = sum(g.units, (u) => u.pdfDirect);
  const srcs = sum(g.units, (u) => u.srcDirect);
  const auds = sum(g.units, (u) => u.audioDirect);
  const folded = g.units.filter((u) => u.rel !== g.key).map((u) => u.rel.slice(g.key.length + 1));
  const sug = suggestName(g);
  const parentNames = g.key.split("\\").slice(0, -1);
  const ev = evaluate(path.basename(g.key), g.key, parentNames);
  rows.push({
    key: nextKey(),
    type: "carpeta",
    rel: g.key,
    path: path.join(inv.root, g.key),
    name: path.basename(g.key),
    pdfs,
    srcs,
    auds,
    folded,
    sample: g.units.flatMap((u) => u.sampleFiles || []).slice(0, 4),
    suggested: sug.name,
    canonical: sug.canonical,
    A: ev.A,
    comp: ev.comp || sug.composer,
    containerChildren: 0,
    _files: g.units.flatMap((u) => (u.pdfNames || []).map((n) => path.basename(u.rel) + "/" + n)),
  });
}

// PDFs sueltos en carpetas "colección" / contenedores: una fila por obra (agrupados por primer token del nombre)
const SIDE = /\b(score|scores|partes|partitura|parts|full|particellas|completo|gral|general|solo|tmp|vl|va|vc|cb|pn|guion|part)\b/gi;
function looseBucketKey(n) {
  const t = norm(n.replace(/\.pdf$/i, "").replace(SIDE, " "))
    .split(" ")
    .filter((x) => x.length >= 4 && !/^\d+$/.test(x) && !/^(imslp|pmlp)\d+/.test(x) && !STOP.has(x));
  return t[0] || "otros";
}
const isCollection = (r) => SPLIT_COLLECTIONS.test(path.basename(r.rel));
const containerRows = rows.filter((r) => {
  const u = byRel.get(lc(r.rel));
  if (!u || u.pdfDirect === 0) return false;
  const childGroups = [...groups.keys()].filter((k) => k.startsWith(r.rel + "\\"));
  return childGroups.length >= 2 || isCollection(r);
});
for (const r of containerRows) {
  const full = r.path;
  let files = [];
  try {
    files = fs.readdirSync(full, { withFileTypes: true }).filter((e) => e.isFile() && /\.pdf$/i.test(e.name)).map((e) => e.name);
  } catch {}
  const childGroups = [...groups.keys()].filter((k) => k.startsWith(r.rel + "\\"));
  const idx = rows.indexOf(r);
  rows.splice(idx, 1);
  // PDFs en subcarpetas genéricas plegadas (Partifi, Partes...) siguen siendo parte de esta carpeta
  const g0 = groups.get(r.rel);
  const genericUnits = g0 ? g0.units.filter((u) => u.rel !== r.rel && u.pdfDirect > 0) : [];
  const genericPdfs = sum(genericUnits, (u) => u.pdfDirect);
  if (genericPdfs > 0) {
    const ev = evaluate(path.basename(r.rel), r.rel, r.rel.split("\\").slice(0, -1));
    rows.push({ ...r, key: nextKey(), pdfs: genericPdfs, folded: genericUnits.map((u) => u.rel.slice(r.rel.length + 1)), sample: genericUnits.flatMap((u) => u.sampleFiles || []).slice(0, 4), A: ev.A, _files: genericUnits.flatMap((u) => (u.pdfNames || []).map((n) => path.basename(u.rel) + "/" + n)) });
  }
  const buckets = new Map();
  for (const f of files) {
    const tf = toks(f);
    const sib = childGroups.find((cg) => toks(path.basename(cg)).filter((t) => tf.some((x) => same(x, t))).length >= 2);
    const bk = sib ? "SIB:" + sib : looseBucketKey(f);
    if (!buckets.has(bk)) buckets.set(bk, []);
    buckets.get(bk).push(f);
  }
  const bucketOther = [];
  for (const [bk, fl] of buckets) {
    if (bk.startsWith("SIB:")) {
      const sibRow = rows.find((x) => x.rel === bk.slice(4));
      if (sibRow) {
        sibRow.pdfs += fl.length;
        sibRow._files.push(...fl);
        sibRow.folded.push(`(PDF combinado suelto en carpeta madre: ${fl.join("; ")})`);
        continue;
      }
    }
    const single = fl.length === 1;
    const nm = single ? fl[0].replace(/\.pdf$/i, "") : bk === "otros" ? `${path.basename(r.rel)} - PDFs sin nombre de obra` : bk;
    const parentNames = r.rel.split("\\");
    const ev = evaluate(nm, r.rel, parentNames);
    rows.push({
      key: nextKey(),
      type: "pdf-suelto",
      rel: r.rel + "\\" + (single ? fl[0] : `[${fl.length} PDFs sueltos: ${bk}]`),
      path: full,
      name: single ? fl[0] : `${bk} (${fl.length} PDFs sueltos)`,
      pdfs: fl.length,
      srcs: 0,
      auds: 0,
      folded: single ? [] : fl,
      _files: fl.slice(),
      sample: fl.slice(0, 4),
      suggested: suggestName({ key: r.rel + "\\" + nm }).name,
      canonical: false,
      A: ev.A,
      comp: ev.comp,
    });
  }
}

// Archivos sueltos en raíz
for (const l of inv.looseRoot) {
  if (l.type !== "pdf-suelto") continue;
  const nm = l.name.replace(/\.pdf$/i, "");
  const ev = evaluate(nm, l.rel, []);
  rows.push({
    key: nextKey(),
    type: "pdf-suelto",
    rel: l.rel,
    path: l.path,
    name: l.name,
    pdfs: 1,
    srcs: 0,
    auds: 0,
    folded: [],
    _files: [l.name],
    sample: [],
    suggested: suggestName({ key: nm }).name,
    canonical: false,
    A: ev.A,
    comp: ev.comp,
  });
}

// Archivos comprimidos
for (const a of inv.archives) {
  const nm = a.name.replace(/\.(zip|rar|7z|tar|gz|tgz)$/i, "").replace(/-\d{8}T\d{6}Z-\d{3}$/, "");
  const parents = a.rel.split("\\").slice(0, -1);
  const ev = evaluate(nm, a.rel, parents);
  const sibFolder = a.parentRel && byRel.get(lc(a.parentRel));
  rows.push({
    key: nextKey(),
    type: "comprimido",
    rel: a.rel,
    path: a.path,
    name: a.name,
    pdfs: a.listed ? a.pdfCount : null,
    srcs: a.listed ? a.srcCount : null,
    auds: a.listed ? a.audioCount : null,
    archive: { sizeMB: +(a.size / 1048576).toFixed(1), listed: a.listed, error: a.error, entries: a.entryCount, top: a.topLevel, sample: a.sampleEntries },
    folded: [],
    _files: a.pdfEntries || [],
    sample: a.sampleEntries || [],
    suggested: suggestName({ key: parents.concat(nm).join("\\") }).name,
    canonical: false,
    A: ev.A,
    comp: ev.comp,
    sameDirFolder: !!sibFolder,
  });
}

// Carpetas sin ningún PDF/fuente/audio (solo accesos directos, vacías, imágenes, etc.)
{
  const rowRels = [...rows.map((r) => r.rel), ...inv.units.map((u) => u.rel), ...inv.archives.map((a) => a.rel)].map((x) => x.toLowerCase());
  const covered = (rel) => rowRels.some((x) => x === rel.toLowerCase() || x.startsWith(rel.toLowerCase() + "\\"));
  const walk = (abs, rel, depth) => {
    let ents = [];
    try { ents = fs.readdirSync(abs, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      if (!e.isDirectory()) continue;
      const rr = rel ? rel + "\\" + e.name : e.name;
      const aa = path.join(abs, e.name);
      if (covered(rr)) { if (depth < 3) walk(aa, rr, depth + 1); continue; }
      let files = [];
      const stack = [aa];
      while (stack.length) { const d = stack.pop(); try { for (const x of fs.readdirSync(d, { withFileTypes: true })) { if (x.isDirectory()) stack.push(path.join(d, x.name)); else files.push(x.name); } } catch {} }
      const exts = {};
      files.forEach((f) => { const k = (path.extname(f) || "(sin ext)").toLowerCase(); exts[k] = (exts[k] || 0) + 1; });
      const ev = evaluate(e.name, rr, rel.split("\\").filter(Boolean));
      rows.push({ key: nextKey(), type: "carpeta", rel: rr, path: aa, name: e.name, pdfs: 0, srcs: 0, auds: 0, folded: [], _files: [], sample: files.slice(0, 4), suggested: suggestName({ key: rr }).name, canonical: false, A: ev.A, comp: ev.comp, emptyInfo: files.length ? "Solo contiene: " + Object.entries(exts).map(([k, v]) => `${v}×${k}`).join(", ") : "Carpeta vacía" });
    }
  };
  walk(inv.root, "", 0);
}

// ───────────────────────── estado: BD + Para acomodar + Archivo General ─────────────────────────
for (const r of rows) {
  const catId = [...CAT_DONE.entries()].find(([k]) => {
    const kk = norm(r.rel.replace(/\\/g, "/"));
    return kk === k || (r.type === "comprimido" && kk.startsWith(k));
  });
  const rawDigits = norm(cleanTitle(r.name.replace(/\.(pdf|zip|rar)$/i, "").replace(/^\s*\d+\s*[-.)]*\s*/, ""))).split(" ").filter((t) => /^\d{1,3}$/.test(t));
  r.matches = topMatches(r.A, r.comp, rawDigits).map((x) => ({ id: x.d.id, titulo: x.d.titulo1, comp: x.d.comp || "", parts: x.d.parts, drive: !!x.d.link_drive, score: +x.s.toFixed(2), tm: x.tm, ac: x.ac, dt: x.dt }));
  const skipHit = CAT_SKIPPED.find(([, rx]) => rx.test(r.name));
  r.notes = [];
  r.status = "nuevo";
  if (r.type === "carpeta" || r.type === "pdf-suelto") {
    if (catId) {
      r.status = "ya en BD";
      r.matches = [{ id: catId[1], titulo: "(lote 2026-10-30 Archivo-para-organizar)", comp: "", parts: null, drive: true, score: 1 }, ...r.matches.filter((m) => m.id !== catId[1])];
    } else if (skipHit) {
      r.status = "ya en BD";
      r.matches = [{ id: skipHit[2], titulo: `(${skipHit[0]}: omitida en el lote 10-30 por duplicado)`, comp: "", parts: null, drive: true, score: 1 }, ...r.matches.filter((m) => m.id !== skipHit[2])];
    } else if (r.matches[0] && r.matches[0].score >= 0.9 && ((r.matches[0].tm >= 2 && r.matches[0].ac >= 2) || (r.matches[0].ac <= 2 && r.matches[0].dt <= r.matches[0].ac && r.matches[0].score >= 1))) r.status = "ya en BD";
    else if (r.matches[0] && r.matches[0].score >= 0.6) r.status = "posible duplicado";
  } else if (r.type === "comprimido") {
    r.status = "comprimido";
    if (r.matches[0] && r.matches[0].score >= 0.6) r.notes.push("Coincide con obra en BD (ver match): puede ser duplicado ya cargado");
    if (catId) r.notes.push(`Ya cargado como #${catId[1]} (lote 10-30): el .rar es el original de la carpeta extraída`);
    if (r.sameDirFolder) r.notes.push("Hay una carpeta hermana ya descomprimida en la misma ruta");
    if (r.archive && !r.archive.listed) r.notes.push("No se pudo listar con tar: extraer a mano / 7-Zip");
    if (r.archive && r.archive.listed && !r.pdfs) r.notes.push("Sin PDFs en el contenido (solo " + (r.srcs ? "archivos Finale/Sibelius" : "otros formatos") + ")");
  }
  // un PDF suelto nunca es "ya en BD" por match difuso (puede ser un solo movimiento / otra edición)
  if (r.type === "pdf-suelto" && r.status === "ya en BD" && !catId && !skipHit) r.status = "posible duplicado";
  // sin PDFs
  if ((r.type === "carpeta") && !r.pdfs) {
    r.status = "skip";
    r.notes.push(r.emptyInfo ? `${r.emptyInfo}: sin material cargable` : `Sin PDFs (${r.srcs ? r.srcs + " archivos fuente .mus/.sib" : r.auds ? r.auds + " audios" : "otros formatos"}): requiere exportar PDF desde Finale/Sibelius`);
  }
  // Para acomodar (staged)
  const pa = matchDirs(r.A, r.comp, paDirs, 0.8);
  if (pa) r.notes.push(`Ya staged en Para acomodar: «${pa.d.name}» (${Math.round(pa.s * 100)}%)`);
  r.paStaged = pa ? pa.d.name : null;
  // Archivo General
  const ge = matchDirs(r.A, r.comp, genDirs, 0.85);
  if (ge) r.notes.push(`Parecida en Archivo General: ${ge.d.rel}`);
  r.genHit = ge ? ge.d.rel : null;
  if (r.status === "nuevo" && (pa || ge)) {
    r.status = "posible duplicado";
    r.notes.push("Estado subido a «posible duplicado» por coincidencia en Para acomodar / Archivo General");
  }
}

// Duplicados internos (misma obra en dos carpetas de la propia fuente)
for (let i = 0; i < rows.length; i++) {
  for (let j = i + 1; j < rows.length; j++) {
    const a = rows[i], b = rows[j];
    if (a.type === "comprimido" || b.type === "comprimido") continue;
    if (a.A.length < 2 || b.A.length < 2) continue;
    const inter = a.A.filter((t) => b.A.some((u) => same(t, u))).length;
    const jac = inter / (new Set([...a.A, ...b.A]).size);
    const dg = (x) => norm(cleanTitle(x.name.replace(/\.(pdf|zip|rar)$/i, ""))).split(" ").filter((t) => /^\d{1,3}$/.test(t)).join(",");
    if (jac >= 0.75 && dg(a) === dg(b) && !(a.rel.startsWith(b.rel + "\\") || b.rel.startsWith(a.rel + "\\"))) {
      a.notes.push(`Mismo nombre que otra carpeta de la fuente: ${b.rel} (${b.pdfs} PDFs)`);
      b.notes.push(`Mismo nombre que otra carpeta de la fuente: ${a.rel} (${a.pdfs} PDFs)`);
    }
  }
}

// ───────────────────────── fases ─────────────────────────
const COLL_4A = /^archivo viejo\\(guillo espel|jorge retamosa|malachevsky|el secreto|escalandrum|quinteto ramiro gallo|obras con chango spasiuk)(\\|$)/i;
const PHASES = [
  { id: "1", file: "archivo_para_organizar_carga_f1_raiz.html", title: "Raíz y carpetas chicas", desc: "Carpetas de primer nivel (REVISAR, Revisar si ya están, INAMU, Un Fueguito, Acomodar en Drive, Hay que completar, Para cortar, CONCERTO 2024, LEMA-Acomodar, El Escondido…) + PDFs sueltos de la raíz." },
  { id: "2", file: "archivo_para_organizar_carga_f2_gerez.html", title: "GEREZ (banda / ensamble / brass)", desc: "Material de banda y ensamble de GEREZ. Los .MUS/.sib sin PDF figuran como «skip» (hay que exportar PDF desde Finale/Sibelius)." },
  { id: "3a", file: "archivo_para_organizar_carga_f3a_archivo_viejo_A.html", title: "Archivo viejo · obras sueltas (A–L)", desc: "Carpetas de primer nivel de «Archivo viejo» (orden alfabético, primera mitad)." },
  { id: "3b", file: "archivo_para_organizar_carga_f3b_archivo_viejo_B.html", title: "Archivo viejo · obras sueltas (M–Z)", desc: "Carpetas de primer nivel de «Archivo viejo» (orden alfabético, segunda mitad)." },
  { id: "4a", file: "archivo_para_organizar_carga_f4a_colecciones_1.html", title: "Archivo viejo · colecciones 1", desc: "Guillo Espel, Jorge Retamosa, Malachevsky, El Secreto, Escalandrum, Quinteto Ramiro Gallo, Chango Spasiuk." },
  { id: "4b", file: "archivo_para_organizar_carga_f4b_colecciones_2.html", title: "Archivo viejo · colecciones 2", desc: "Obras OIANT, Nicoletti, Obras para solistas 2016–2019, Peer Gynt, SIN SCORE y subcarpetas varias." },
  { id: "5", file: "archivo_para_organizar_carga_f5_comprimidos.html", title: "Archivos comprimidos (.zip / .rar)", desc: "Todos los comprimidos del árbol. Hay que extraerlos antes de poder cargarlos; varios son el original de carpetas ya extraídas y cargadas." },
];
for (const r of rows) {
  const top = r.rel.split("\\")[0];
  if (r.type === "comprimido") r.phase = "5";
  else if (top === "GEREZ") r.phase = "2";
  else if (top === "Archivo viejo") {
    const depth = r.rel.split("\\").length;
    if (COLL_4A.test(r.rel)) r.phase = "4a";
    else if (depth >= 3 && !/^archivo viejo\\[^\\]+$/i.test(r.rel)) r.phase = "4b";
    else r.phase = "3";
  } else r.phase = "1";
}
// 3 -> 3a / 3b por orden alfabético (mitad)
{
  const f3 = rows.filter((r) => r.phase === "3").sort((a, b) => a.rel.localeCompare(b.rel, "es"));
  const half = Math.ceil(f3.length / 2);
  f3.forEach((r, i) => (r.phase = i < half ? "3a" : "3b"));
  const last = f3[half - 1], first = f3[half];
  PHASES.find((p) => p.id === "3a").title = `Archivo viejo · obras sueltas (${path.basename(f3[0].rel)[0].toUpperCase()}–${path.basename(last.rel)[0].toUpperCase()})`;
  PHASES.find((p) => p.id === "3b").title = `Archivo viejo · obras sueltas (${path.basename(first.rel)[0].toUpperCase()}–${path.basename(f3[f3.length - 1].rel)[0].toUpperCase()})`;
}
// Colecciones muy grandes (4b) -> ok. Marcas por defecto
for (const r of rows) {
  r.dupStrong = r.type === "comprimido" && ((r.matches[0] && r.matches[0].score >= 0.9) || r.notes.some((n) => n.startsWith("Ya cargado como")));
  r.defaultOnPrev = r.status === "nuevo" || (r.status === "comprimido" && !r.dupStrong);
  applyCompleteness(r);
  // Solo obras completas (SCORE + partes) quedan marcadas por defecto; incompletas/desconocidas arrancan OFF.
  r.defaultOn = r.defaultOnPrev && r.compl === "completa";
  r.exclIncompleto = r.defaultOnPrev && r.compl !== "completa";
}

// ───────────────────────── salida ─────────────────────────
rows.sort((a, b) => a.rel.localeCompare(b.rel, "es"));
if (dump) {
  for (const r of rows) {
    const m = r.matches[0];
    console.log(
      `${r.phase}|${r.status.padEnd(17)}|${r.type.slice(0, 4)}|${(r.compl || "?").slice(0, 4)} S${r.nScore}/P${r.nParts}|pdf=${r.pdfs}|${r.rel.slice(0, 80)} => ${r.suggested.slice(0, 60)} | ${m ? `#${m.id} ${m.titulo.slice(0, 35)} ${m.score}` : "-"}${r.notes.length ? " |N:" + r.notes.length : ""}`,
    );
  }
  const cnt = {};
  for (const r of rows) cnt[`${r.phase}:${r.status}`] = (cnt[`${r.phase}:${r.status}`] || 0) + 1;
  console.log(cnt, "rows", rows.length);
  process.exit(0);
}

fs.writeFileSync(path.join(TMP, "rows.json"), JSON.stringify(rows, null, 1));

// ───────────────────────── HTMLs ─────────────────────────
const TEMPLATE = fs.readFileSync(path.resolve("scripts/_tmp_archivo_para_organizar_carga_template.html"), "utf8");
const INDEX_FILE = "archivo_para_organizar_carga.html";
const inject = (tpl, data) => tpl.replace("/*__DATA__*/null", JSON.stringify(data).replace(/</g, "\\u003c").replace(/\u2028|\u2029/g, " "));
const slim = (r) => ({
  key: r.key, type: r.type, rel: r.rel, path: r.path, pdfs: r.pdfs, srcs: r.srcs, auds: r.auds, status: r.status, defaultOn: r.defaultOn, dupStrong: r.dupStrong,
  compl: r.compl, complWhy: r.complWhy, hasScore: r.hasScore, hasParts: r.hasParts, nScore: r.nScore, nParts: r.nParts, exclIncompleto: r.exclIncompleto,
  suggested: r.suggested, comp: r.comp ? { apellido: r.comp.apellido } : null, matches: r.matches.map(({ tm, ac, dt, ...m }) => m), notes: r.notes,
  folded: (r.folded || []).slice(0, 60), sample: (r.sample || []).slice(0, 5), archive: r.archive || null,
});
const summary = [];
for (const ph of PHASES) {
  const prow = rows.filter((r) => r.phase === ph.id).map(slim);
  const html = inject(TEMPLATE, { phase: ph.id, title: ph.title, desc: ph.desc, indexFile: INDEX_FILE, fuente: inv.root, rows: prow });
  fs.writeFileSync(path.join(DL, ph.file), html, "utf8");
  const cnt = {};
  prow.forEach((r) => (cnt[r.status] = (cnt[r.status] || 0) + 1));
  summary.push({ ...ph, total: prow.length, cnt, on: prow.filter((r) => r.defaultOn).length, completas: prow.filter((r) => r.compl === "completa").length, incompletas: prow.filter((r) => r.compl !== "completa").length, exclIncompleto: prow.filter((r) => r.exclIncompleto).length, nuevosCompletos: prow.filter((r) => r.status === "nuevo" && r.compl === "completa").length, pdfsOn: prow.filter((r) => r.defaultOn).reduce((s, r) => s + (r.pdfs || 0), 0), keys: prow.map((r) => ({ key: r.key, rel: r.rel, status: r.status, defaultOn: r.defaultOn, compl: r.compl, suggested: r.suggested })) });
}
fs.writeFileSync(path.join(DL, "archivo_para_organizar_carga_data.json"), JSON.stringify({ generado: new Date().toISOString(), fuente: inv.root, criterio_completa: "≥1 PDF SCORE y ≥1 PDF de parte; comprimido sin listado = desconocida (OFF)", fases: summary.map(({ keys, ...s }) => s), filas: rows.map(slim) }, null, 1), "utf8");

const TOT = {
  total: rows.length,
  completas: rows.filter((r) => r.compl === "completa").length,
  incompletas: rows.filter((r) => r.compl !== "completa").length,
  desconocidas: rows.filter((r) => r.compl === "desconocida").length,
  on: rows.filter((r) => r.defaultOn).length,
  nuevosCompletos: rows.filter((r) => r.status === "nuevo" && r.compl === "completa").length,
  exclIncompleto: rows.filter((r) => r.exclIncompleto).length,
  defaultOnPrev: rows.filter((r) => r.defaultOnPrev).length,
};
const indexHtml = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Cargar Archivo - para organizar · Índice</title><meta name="viewport" content="width=device-width, initial-scale=1">
<style>
:root{--bg:#0f1115;--card:#181b22;--line:#2a2f3a;--txt:#e8eaf0;--mut:#9aa3b5;--acc:#4f8cff;--ok:#2fbf71;--warn:#e0a526;--pur:#a07bff}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--txt);font:14px/1.5 system-ui,Segoe UI,Roboto,sans-serif}
main{max-width:1050px;margin:24px auto 80px;padding:0 16px}h1{font-size:20px;margin:0 0 4px}p.mut,.mut{color:var(--mut)}
table{width:100%;border-collapse:collapse;margin:14px 0;background:var(--card);border:1px solid var(--line);border-radius:8px;overflow:hidden}
th,td{padding:8px 10px;border-bottom:1px solid var(--line);text-align:left;vertical-align:top}th{background:#1f2430;color:var(--mut);font-size:12px;text-transform:uppercase}
td.n{text-align:right;white-space:nowrap}a{color:var(--acc);text-decoration:none}a:hover{text-decoration:underline}
.b{display:inline-block;font-size:11px;padding:1px 8px;border-radius:10px;font-weight:600;margin-right:4px}.nuevo{background:#14351f;color:#6be39b}.dup{background:#3a2f0e;color:#f0c75a}.bd{background:#162a4a;color:#8db5ff}.zip{background:#2b2147;color:#c3a8ff}.skip{background:#2a2a2a;color:#aaa}
.box{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 16px;margin:14px 0}ol li{margin:4px 0}
button{background:#4f8cff;border:1px solid #4f8cff;color:#fff;border-radius:6px;padding:6px 12px;font:inherit;cursor:pointer}
code{background:#222733;padding:0 5px;border-radius:4px}
</style></head><body><main>
<h1>Cargar «Archivo - para organizar» — decisiones (fase 1)</h1>
<p class="mut">Fuente: <code>${inv.root.replace(/\\/g, "\\\\")}</code> · generado ${new Date().toLocaleString("es-AR")} · solo lectura: nada se procesó ni se subió.</p>
<div class="box"><b>Orden recomendado de decisión</b>
<ol>
<li><b>Fase 1</b> – raíz y carpetas chicas (varias ya casi canónicas: Un Fueguito, Gianneo, Bizet-Borne…).</li>
<li><b>Fase 2</b> – GEREZ (banda/ensamble; varios .MUS necesitan PDF).</li>
<li><b>Fase 5</b> – comprimidos: decidir qué extraer; muchos son el original de carpetas ya cargadas.</li>
<li><b>Fases 3a / 3b</b> – Archivo viejo, obras sueltas (muchos duplicados con BD: revisar primero los «posible duplicado»).</li>
<li><b>Fases 4a / 4b</b> – Archivo viejo, colecciones (Espel, Retamosa, Nicoletti, solistas, OIANT…).</li>
</ol>
<div class="box" style="border-color:#4a1f1c"><b>Solo obras completas (SCORE + partes)</b><br>
Filas totales: <b>${TOT.total}</b> · <span class="b nuevo">completas ${TOT.completas}</span> <span class="b skip" style="background:#4a1f1c;color:#ffb3ad">incompletas / desconocidas ${TOT.incompletas}</span><br>
Marcadas por defecto (nuevo/comprimido <b>y completa</b>): <b>${TOT.on}</b> · nuevos completos: <b>${TOT.nuevosCompletos}</b> · excluidas por defecto solo por estar incompletas (antes iban marcadas): <b>${TOT.exclIncompleto}</b><br>
<span class="mut">Completa = ≥1 PDF de SCORE (Score / Partitura / Full score…) <u>y</u> ≥1 PDF de parte instrumental (no SCORE/portada/audio). Comprimidos: se usa el listado de <code>tar</code>; si no se pudo listar queda como <i>incompleto_o_desconocido</i>. En cada fase hay un filtro «Completitud» y un botón «Desmarcar incompletas»; podés tildar una incompleta a mano si querés cargarla igual.</span></div>
<span class="mut">Marcado por defecto: <span class="b nuevo">nuevo</span> y <span class="b zip">comprimido</span> sin match fuerte <b>y completos</b>. Desmarcado: <span class="b dup">incompletas</span>,  <span class="b dup">posible duplicado</span>, <span class="b bd">ya en BD</span>, <span class="b skip">skip</span> (tildalos a mano si querés cargarlos igual, p. ej. otra versión/arreglo).</span></div>
<table><thead><tr><th>Fase</th><th>Contenido</th><th class="n">Filas</th><th>Estados</th><th class="n">Completas</th><th class="n">Incompl.</th><th class="n">Marcadas</th><th class="n">PDFs marc.</th></tr></thead><tbody>
${summary
  .map(
    (s) =>
      `<tr><td><a href="${s.file}"><b>${s.id}</b></a></td><td><a href="${s.file}">${s.title}</a><div class="mut" style="font-size:12px">${s.desc}</div></td><td class="n">${s.total}</td><td>${["nuevo", "comprimido", "posible duplicado", "ya en BD", "skip"]
        .filter((k) => s.cnt[k])
        .map((k) => `<span class="b ${{ nuevo: "nuevo", comprimido: "zip", "posible duplicado": "dup", "ya en BD": "bd", skip: "skip" }[k]}">${k} ${s.cnt[k]}</span>`)
        .join("")}</td><td class="n">${s.completas}</td><td class="n">${s.incompletas}</td><td class="n" data-on="${s.id}">${s.on}</td><td class="n">${s.pdfsOn}</td></tr>`,
  )
  .join("\n")}
</tbody></table>
<div class="box"><b>Exportar todo junto</b> <span class="mut">(lee las decisiones guardadas en este navegador de cada fase; si abriste las fases en otro navegador/perfil, exportá cada fase por separado)</span><br><br>
<button id="all">Descargar decisiones combinadas (JSON)</button> <span id="msg" class="mut"></span></div>
</main>
<script>
const PH = ${JSON.stringify(summary.map((s) => ({ id: s.id, file: s.file, title: s.title, keys: s.keys }))).replace(/</g, "\\u003c")};
const read = (id) => { try { const v2 = localStorage.getItem('archivo_para_organizar_carga_v2_' + id); if (v2) return JSON.parse(v2); const v1 = JSON.parse(localStorage.getItem('archivo_para_organizar_carga_v1_' + id) || 'null'); if (v1) { const p = PH.find((x) => x.id === id); for (const k of p.keys) if (k.compl !== 'completa' && v1[k.key] && v1[k.key].on === true) delete v1[k.key].on; } return v1; } catch (e) { return null; } };
let touched = 0;
for (const p of PH) { const s = read(p.id); if (!s) continue; touched++; const on = p.keys.filter((k) => (s[k.key] && typeof s[k.key].on === 'boolean') ? s[k.key].on : k.defaultOn).length; const td = document.querySelector('[data-on="' + p.id + '"]'); if (td) td.textContent = on + ' *'; }
document.getElementById('msg').textContent = touched ? touched + ' fase(s) con decisiones guardadas (* = marcadas actuales)' : 'Todavía no hay decisiones guardadas en este navegador (se usan las marcas por defecto).';
document.getElementById('all').addEventListener('click', () => {
  const out = [];
  for (const p of PH) { const s = read(p.id) || {}; for (const k of p.keys) { const d = s[k.key] || {}; out.push({ fase: p.id, key: k.key, ruta_relativa: k.rel, estado: k.status, completitud: k.compl, cargar: typeof d.on === 'boolean' ? d.on : k.defaultOn, nombre_canonico: d.name || k.suggested, editado: !!(d.name || typeof d.on === 'boolean') }); } }
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([JSON.stringify({ exportado: new Date().toISOString(), decisiones: out }, null, 2)], { type: 'application/json' })); a.download = 'archivo_para_organizar_carga_decisiones_combinadas.json'; document.body.appendChild(a); a.click(); a.remove();
});
</script></body></html>`;
fs.writeFileSync(path.join(DL, INDEX_FILE), indexHtml, "utf8");
console.log("rows", rows.length, JSON.stringify(TOT));
for (const s of summary) console.log(s.id.padEnd(3), String(s.total).padStart(4), "marcadas", String(s.on).padStart(4), JSON.stringify(s.cnt));
