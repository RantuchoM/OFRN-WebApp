/** Renombrado canónico de particellas PDF (reglas pdf-parts-renaming). */
import { existsSync, readdirSync, renameSync } from "fs";
import { join } from "path";

export function safeFileName(name) {
  return String(name ?? "")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "");
}

const AUDIO_EXT_RE = /\.(mp3|wav|m4a|flac)$/i;

/**
 * Audio en Para acomodar: `AUDIO - {resto del nombre}.mp3|wav`.
 * Idempotente si ya tiene prefijo AUDIO; quita un "Audio" suelto al final.
 */
export function canonicalAudioFilename(existingName) {
  const m = String(existingName || "").match(/^(.*?)(\.(mp3|wav|m4a|flac))$/i);
  if (!m) return null;
  let base = m[1].trim();
  const ext = m[2];
  base = base.replace(/^AUDIO\s*[-–—:]?\s*/i, "").trim();
  base = base.replace(/\s+Audio$/i, "").trim();
  if (!base) return null;
  return `${safeFileName(`AUDIO - ${base}`)}${ext}`;
}

export function renameAudioFilesInFolder(folderPath, { dryRun = false } = {}) {
  if (!folderPath || !existsSync(folderPath)) return [];
  const files = readdirSync(folderPath).filter((f) => AUDIO_EXT_RE.test(f));
  const results = [];
  const used = new Set();

  for (const file of files.sort((a, b) => a.localeCompare(b, "es"))) {
    const target = canonicalAudioFilename(file);
    if (!target) {
      results.push({ action: "skip-unknown", file });
      continue;
    }
    const key = target.toLowerCase();
    if (used.has(key)) {
      results.push({ action: "skip-dup", file, target });
      continue;
    }
    used.add(key);
    if (file === target || file.toLowerCase() === key) {
      results.push({ action: "ok", file: target });
      continue;
    }
    const dst = join(folderPath, target);
    if (existsSync(dst) && file.toLowerCase() !== key) {
      results.push({ action: "skip-collision", file, target });
      continue;
    }
    if (!dryRun) renameSync(join(folderPath, file), dst);
    results.push({ action: "rename", from: file, to: target });
  }
  return results;
}

/** Sufijo canónico para varias partes en un PDF: [1,2] → "1y2", [1,2,3] → "1y2y3". */
export function formatCombinedSlot(numbers) {
  return numbers.map(String).join("y");
}

/** Convierte "1-2", "1 y 2", "1&2" → "1y2"; rangos "1-3" → "1y2y3". */
export function canonicalCombinedSuffix(raw) {
  const s = String(raw || "").trim();
  const range = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (range) {
    const a = parseInt(range[1], 10);
    const b = parseInt(range[2], 10);
    if (b > a && b - a <= 4) {
      return formatCombinedSlot(
        Array.from({ length: b - a + 1 }, (_, i) => a + i),
      );
    }
  }
  return s
    .replace(/(\d+)\s*[-/&]\s*(\d+)/gi, "$1y$2")
    .replace(/(\d+)\s+y\s+(\d+)/gi, "$1y$2");
}

export function normalizeInstrumentLabel(rawName) {
  const base = String(rawName || "").replace(/\.pdf$/i, "");
  let name = base.replace(/_/g, " ").replace(/^\s*copia\s+de\s+/i, "");
  // Typo frecuente en PDFs Lema
  name = name.replace(/\btomb[oó]n\b/gi, "Trombón");

  const canonicalPrefix =
    /^\s*(.+?)\s*-\s*[^.]+\.\s*.+\s*-\s*.+\s*$/i;
  if (canonicalPrefix.test(name)) {
    return name.match(/^\s*(.+?)\s*-\s*[^.]+\./i)[1].trim();
  }

  if (/\bscore\b|partitura|full score/i.test(name)) return "SCORE";
  if (/\b[oó]rgano\b|\borgan\b/i.test(name) && !/orchestra/i.test(name))
    return "Órgano";
  if (/\btenor\b/i.test(name) && !/\bsax/i.test(name)) return "Voz";
  if (/\bsaxo\s*tenor\b|\btenor\s*sax/i.test(name)) return "Saxo Tenor";
  if (/\bsaxo\s*alto\b|\balto\s*sax/i.test(name)) return "Saxo Alto";
  if (/\bsaxo|\bsaxof/i.test(name)) return "Saxofón";
  if (/\bbater[ií]a\b|\bdrum\s*set\b/i.test(name)) return "Perc Batería";
  if (/\bkeyboard\b|\bcembalo\b|\bclave\b|\bharpsichord\b|\bklavier\b/i.test(name))
    return "Piano";
  if (/\bpiano\b/i.test(name)) return "Piano";
  if (/\bcoro\b|\bchoir\b|\bsatb\b/i.test(name) && !/gitanos/i.test(name))
    return "Coro";
  if (
    /\bacoustic\s+guitar\s*(?:v|5)\b|\bguitarra\s*5\b|\bguitar\s*(?:v|5)\b/i.test(
      name,
    )
  )
    return "Guitarra 5";
  if (
    /\bacoustic\s+guitar\s*(?:iv|4)\b|\bguitarra\s*4\b|\bguitar\s*(?:iv|4)\b/i.test(
      name,
    )
  )
    return "Guitarra 4";
  if (
    /\bacoustic\s+guitar\s*(?:iii|3)\b|\bguitarra\s*3\b|\bguitar\s*(?:iii|3)\b/i.test(
      name,
    )
  )
    return "Guitarra 3";
  if (
    /\bacoustic\s+guitar\s*(?:ii|2)\b|\bguitarra\s*2\b|\bguitar\s*(?:ii|2)\b/i.test(
      name,
    )
  )
    return "Guitarra 2";
  if (
    /\bacoustic\s+guitar\s*(?:i|1)\b|\bguitarra\s*1\b|\bguitar\s*(?:i|1)\b/i.test(
      name,
    )
  )
    return "Guitarra 1";
  if (/\bacoustic\s+guitar\b|\bguitarra\b|\bguitars?\b/i.test(name))
    return "Guitarra";

  const n = name.toLowerCase();

  if (/\bflutes?\b.*\bpiccolo\b|\bpiccolo\b|\bflauta\s*piccolo\b/i.test(name))
    return "Fl Piccolo";
  if (/\boboe\s*1[\s-]?y?\s*2\b|\boboe\s*1-2\b|\boboes?\s*1,\s*2\b/i.test(name))
    return "Oboe 1y2";
  if (/\bclarinete\s+a\s*1[\s-]?y?\s*2\b|\bclarinete\s+a\s*1-2\b|\bcl\s+a\s*1-2\b/i.test(name))
    return "Clarinete A 1y2";
  if (
    /\bclarinete\s*1y2\b|\bclarinete\s*1[\s-]?y?\s*2\b|\bclarinet(?:e|s)?\s*1-2\b|\bcl\s*1y2\b/i.test(
      name,
    )
  )
    return "Clarinete 1y2";
  if (/\bfagot\s*1[\s-]?y?\s*2\b|\bfagot\s*1-2\b|\bbassoon\s*1-2\b/i.test(name))
    return "Fagot 1y2";
  if (
    /\btrompa\s+(en\s+)?fa\s*1\s*[&y]\s*2\b|\btrompa\s*1\s*[&y]\s*2\b|\bcorno\s+f\s*1[\s-]?y?\s*2\b|\bcorno\s+f\s*1-2\b|\bhorn\s*1-2\b/i.test(
      name,
    )
  )
    return "Corno F 1y2";
  if (
    /\btrompa\s+(en\s+)?fa\s*3\s*[&y]\s*4\b|\btrompa\s*3\s*[&y]\s*4\b|\bcorno\s+f\s*3[\s-]?y?\s*4\b|\bcorno\s+f\s*3-4\b|\bhorn\s*3-4\b/i.test(
      name,
    )
  )
    return "Corno F 3y4";
  if (/\btrompeta\s*1[\s-]?y?\s*2\b|\btrompeta\s*1-2\b|\btrumpet\s*1-2\b/i.test(name))
    return "Trompeta 1y2";
  if (
    /\btromb[oó]n\s*1y2y3\b|\btromb[oó]n\s*1[\s-]?y?\s*2[\s-]?y?\s*3\b|\btromb[oó]n\s*1-3\b|\btrombone\s*1-3\b/i.test(
      name,
    )
  )
    return "Trombón 1y2y3";
  if (/\bcontrafagot\b/i.test(name)) return "Contrafagot";
  if (/\boboe\s*2\b/i.test(name) && !/\boboe\s*1\b/i.test(name)) return "Oboe 2";
  if (/\boboe\s*1\b/i.test(name)) return "Oboe 1";
  if (/\bcorno\s+ingles\b|\benglish\s+horn\b|\bcorno\s+inglés\b|\bob\s+eh\b/i.test(name))
    return "Ob EH";
  if (/\boboes?\b|\bob\b/i.test(name) && !/corno/i.test(name) && !/\bob\s*eh\b/i.test(name))
    return "Oboe";
  if (/\bclarinete\s+mib\s+piccolo\b|\bcl\s+piccolo\b/i.test(name))
    return "Cl Piccolo Eb";
  if (/\bclarinete\s+bajo\b|\bbass\s+clarinet\b/i.test(name))
    return "Clarinete Bajo";
  if (/\bclarinete\s+a\s*2\b|\bcl\s+a\s*2\b/i.test(name)) return "Clarinete A 2";
  if (/\bclarinete\s+a\s*1\b|\bcl\s+a\s*1\b/i.test(name)) return "Clarinete A 1";
  if (/\bclarinete\s+a\b|\bcl\s+a\b/i.test(name)) return "Clarinete A";
  if (
    /\bclarinete\s+(en\s+)?sib\s*2\b|\bclarinete\s+bb\s*2\b|\bclarinete\s*2\b|\bcl\s*2\b|\bclarinet\s*2\b/i.test(
      name,
    )
  )
    return "Clarinete Bb 2";
  if (
    /\bclarinete\s+(en\s+)?sib\s*1\b|\bclarinete\s+bb\s*1\b|\bclarinete\s*1\b|\bcl\s*1\b|\bclarinet\s*1\b/i.test(
      name,
    )
  )
    return "Clarinete Bb 1";
  if (/\bclarinete\s+(en\s+)?sib\b|\bclarinete\s+bb\b|\bclarinet\b|\bclarinete\b/i.test(name))
    return "Clarinete Bb";
  if (/\bfagot\s*2\b|\bbassoon\s*2\b/i.test(name)) return "Fagot 2";
  if (/\bfagot\s*1\b|\bbassoon\s*1\b/i.test(name)) return "Fagot 1";
  if (/\bbassoons?\b|\bfagot\b/i.test(name)) return "Fagot";
  if (/\bcorno\s*f\s*4\b|\bhorn\s*4\b|\bcorno\s*4\b/i.test(name)) return "Corno F 4";
  if (/\bcorno\s*f\s*3\b|\bhorn\s*3\b|\bcorno\s*3\b/i.test(name)) return "Corno F 3";
  if (/\bcorno\s*f\s*2\b|\bhorn\s*2\b|\bcorno\s*2\b|\bcorno\s+en\s+f(?:a)?\s*2\b/i.test(name))
    return "Corno F 2";
  if (/\bcorno\s*f\s*1\b|\bhorn\s*1\b|\bcorno\s*1\b|\bcorno\s+en\s+f(?:a)?\s*1\b/i.test(name))
    return "Corno F 1";
  if (/\bcorno\s+en\s+fa\b|\bhorns?\b|\bcornos?\b|\bcorno\b/i.test(name))
    return "Corno F";
  if (/\btrompeta\s*2\b|\btrumpet\s*2\b/i.test(name)) return "Trompeta 2";
  if (/\btrompeta\s*1\b|\btrumpet\s*1\b/i.test(name)) return "Trompeta 1";
  if (/\btrumpets?\b|\btrompeta\b/i.test(name)) return "Trompeta";
  if (/\btromb[oó]n\s*bajo\b|\bbass\s+trombone\b/i.test(name)) return "Trombón Bajo";
  if (/\btambor\s*piccolo\b|\btamburino\b/i.test(name)) return "Perc Tambor";
  if (/\btrombón\s*3\b|\btrombone\s*3\b|\btrombon\s*3\b/i.test(name))
    return "Trombón 3";
  if (/\btrombón\s*2\b|\btrombone\s*2\b|\btrombon\s*2\b/i.test(name))
    return "Trombón 2";
  if (/\bbass\s*drums?\b/i.test(name)) return "Perc Bombo";
  if (/\btrombón\s*1\b|\btrombone\s*1\b|\btrombon\s*1\b/i.test(name))
    return "Trombón 1";
  if (/\btrombones?\b|\btrombón\b|\btrombon\b/i.test(name)) return "Trombón";
  if (/\btuba\b/i.test(name)) return "Tuba";
  if (/\bglockenspiel\b|\bmetal[oó]fono\b/i.test(name)) return "Perc Glockenspiel";
  if (/\bmarimba\b/i.test(name)) return "Perc Marimba";
  if (/\btimpani\b|\btimbal\b|\btimbales\b|\bperc\s*timp\b/i.test(name))
    return "Perc Timbal";
  if (/\bbass\s*drum\b|\bbombo\b|\bgran\s+cassa\b/i.test(name)) return "Perc Bombo";
  if (/\bsnare\b|\btambor\b/i.test(name)) return "Perc Tambor";
  if (/\btriangulo\b|\btriángulo\b|\btriangle\b/i.test(name)) return "Perc Triángulo";
  if (/\btam[- ]?tam\b|\bcymbals?\b|\bplatillos?\b|\bpiatti\b/i.test(name))
    return "Perc Platillo";
  if (/\bgong\b/i.test(name)) return "Perc Gong";
  if (/\btubular\s+bells\b|\bcampanas\b/i.test(name)) return "Perc Campanas";
  if (
    /\bpercusi[oó]n\s*(?:ii|2)\b|\bpercussion\s*(?:ii|2)\b|\bperc\s*(?:ii|2)\b/i.test(
      name,
    )
  )
    return "Perc Percusión 2";
  if (
    /\bpercusi[oó]n\s*(?:i|1)\b|\bpercussion\s*(?:i|1)\b|\bperc\s*(?:i|1)\b/i.test(
      name,
    )
  )
    return "Perc Percusión 1";
  if (/\bpercussion\b|\bpercusión\b|\bpercusi[oó]n\b|\bperc\s*\d\b|\bperc\b/i.test(name))
    return "Perc Percusión";
  if (/\bharp\b|\barpa\s*2\b/i.test(name)) return "Arpa 2";
  if (/\bharp\b|\barpa\s*1\b|\barpa\b/i.test(name)) return "Arpa";
  if (/\bbandone[oó]n\b|\bbandoneon\b|\bband\s*\d*\b/i.test(name))
    return "Bandoneón";
  if (
    /\bsolista\s+cello\b|\bsoloist\s+cello\b|\bvioloncello\s+solista\b|\bcello\s+solo\b|\bvioloncello\s+solo\b/i.test(
      name,
    )
  )
    return "Violoncello Solo";
  if (/\bviolin\s*ii\b|\bviolín\s*2\b|\bviolins?\s*ii\b|\bviolin\s*2\b/i.test(name))
    return "Violín 2";
  if (/\bviolin\s*i\b|\bviolín\s*1\b|\bviolins?\s*i\b|\bviolin\s*1\b/i.test(name))
    return "Violín 1";
  if (/\bflauta\s*2\b|\bflute\s*2\b/i.test(name)) return "Flauta 2";
  if (/\bflauta\s*1\b|\bflute\s*1\b/i.test(name)) return "Flauta 1";
  if (/\bflutes?\b|\bflauta\b/i.test(name)) return "Flauta";
  if (/\bcontrabajo\s+y\s+vc\b|\bcontrabajo\s+y\s+violoncello\b/i.test(name))
    return "Contrabajo";
  if (/\bvioloncello\s+y\s+cb\b/i.test(name)) return "Violoncello";
  if (/\bviolas?\b/i.test(name)) return "Viola";
  if (/\bcelli\b|\bcello\b|\bvioloncello\b|\bviolonchelo\b|\bvc\b/i.test(name))
    return "Violoncello";
  if (/\bdouble\s+bass\b|\bcontrabajo\b|\bbasses\b/i.test(name)) return "Contrabajo";

  if (/\bflutes?\b/i.test(name) && !/piccolo/i.test(name)) return "Flauta";
  if (/\boboes?\b/i.test(name)) return "Oboe";
  if (/\bclarinets?\b/i.test(name)) return "Clarinete Bb";
  if (/\bbassoons?\b/i.test(name)) return "Fagot";
  if (/\bhorns?\b/i.test(name)) return "Corno F";
  if (/\btrumpets?\b/i.test(name)) return "Trompeta";
  if (/\btrombones?\b/i.test(name)) return "Trombón";
  if (/\bcelli\b/i.test(name)) return "Violoncello";
  if (/\bdouble basses\b/i.test(name)) return "Contrabajo";
  if (/\bviolins?\s*i\b/i.test(name)) return "Violín 1";
  if (/\bviolins?\s*ii\b/i.test(name)) return "Violín 2";
  if (/\bbass drum\b/i.test(name)) return "Perc Bombo";
  if (/\bsnare drum\b/i.test(name)) return "Perc Tambor";
  if (/\btubular bells\b/i.test(name)) return "Perc Campanas";

  let clean = name
    .replace(/^verdi\s+coro\s+de\s+gitanos\s*-\s*/i, "")
    .replace(/\s+la\s+fuerza\s+del\s+destino\s+obertura\s+verdi$/i, "")
    .replace(/\s+grieg\s+suite\s+\d+\s+completa?$/i, "")
    .replace(/\s+a\s+portrait\s+of\s+frida\s+kahlo\s*-\s*/i, "")
    .replace(/^\d+\s*[-–.]?\s*/, "")
    .trim();
  if (!clean) return "Parte";
  if (/\bmontevideana\b/i.test(clean) || /\bhomenaje\b.*\bpiazz/i.test(clean))
    return "SCORE";
  return clean.split(/\s+/).slice(0, 4).join(" ");
}

/** Vacío si no hay catálogo real (null, S/N, S-N, etc.). */
export function normalizeWorkNumberForFilename(workNo) {
  const raw = String(workNo ?? "").trim();
  if (!raw) return "";
  if (/^s[\s./-]*n\.?$/i.test(raw)) return "";
  return safeFileName(raw);
}

export function canonicalPartFilename(instrument, workNo, workTitle, composerTag) {
  const title = safeFileName(workTitle);
  const composer = safeFileName(composerTag);
  const inst = safeFileName(instrument);
  const num = normalizeWorkNumberForFilename(workNo);
  if (num) {
    return safeFileName(`${inst} - ${num}. ${title} - ${composer}.pdf`);
  }
  return safeFileName(`${inst} - ${title} - ${composer}.pdf`);
}

export function extractInstrumentFromExistingName(fileName) {
  let base = fileName.replace(/\.pdf$/i, "").replace(/\s*-\s*raw split$/i, "");
  base = base.replace(/^\s*copia\s+de\s+/i, "").trim();
  if (/^\s*SCORE\b/i.test(base)) return "SCORE";

  const mWorkNum = base.match(
    /^\s*(.+?)\s*-\s*(?:\d+\s+BIS|(?:op\.?\s*)?\d+[A-Za-z]?|MWV\s+N\s*\d+)\.\s+.+\s*-\s*.+\s*$/i,
  );
  if (mWorkNum) return mWorkNum[1].trim();

  const mSn = base.match(/^\s*(.+?)\s*-\s*S[-/]N\.\s*/i);
  if (mSn) return mSn[1].trim();

  const mNoNum = base.match(/^\s*(.+?)\s*-\s*.+\s*-\s*.+\s*$/i);
  if (mNoNum && !/^\d/.test(mNoNum[1])) return mNoNum[1].trim();

  const coro = base.match(/^Verdi\s+Coro\s+de\s+Gitanos\s*-\s*(.+)$/i);
  if (coro) return coro[1].trim();

  const sust = base.match(/^Viol[ií]?n\s*1\s+sustituto\s+Arpa\s*1\b/i);
  if (sust) return "Violín 1 (sust. Arpa)";

  const fuerza = base.match(
    /^(.+?)\s+La\s+Fuerza\s+del\s+Destino\s+Obertura\s+Verdi$/i,
  );
  if (fuerza && !/sustituto/i.test(fuerza[1])) return fuerza[1].trim();

  const frida = base.match(/^A portrait of Frida Kahlo\s*-\s*(?:\d+\s+)?(.+)$/i);
  if (frida) return frida[1].trim();

  const fridaPerc = base.match(/^A portrait of Frida Kahlo\s*-\s*(.+)$/i);
  if (fridaPerc) return fridaPerc[1].trim();

  const fridaScore = base.match(/^A Portrait of Frida Kahlo\s*\(Full Score\)/i);
  if (fridaScore) return "SCORE";

  const grieg = base.match(/^(.+?)\s+Grieg\s+Suite\s+\d+/i);
  if (grieg) return grieg[1].trim();
  const dash = base.indexOf(" - ");
  if (dash > 0) return base.slice(0, dash).trim();
  return base.trim();
}

export function renamePdfFilesInFolder(
  folderPath,
  { workNumber, workTitle, composerTag },
  { dryRun = false } = {},
) {
  const pdfs = readdirSync(folderPath)
    .filter((f) => /\.pdf$/i.test(f))
    .sort((a, b) => a.localeCompare(b, "es"));

  const used = new Map();
  const results = [];

  for (const file of pdfs) {
    const rawInstrument = extractInstrumentFromExistingName(file);
    let instrument = normalizeInstrumentLabel(rawInstrument);
    if (instrument === "Parte") instrument = normalizeInstrumentLabel(file);
    if (/sustituto\s+arpa/i.test(file)) {
      instrument = "Violín 1 (sust. Arpa)";
    }

    let target = canonicalPartFilename(
      instrument,
      workNumber,
      workTitle,
      composerTag,
    );

    if (used.has(target)) {
      const n = used.get(target) + 1;
      used.set(target, n);
      target = canonicalPartFilename(
        `${instrument} ${n}`,
        workNumber,
        workTitle,
        composerTag,
      );
    } else {
      used.set(target, 1);
    }

    const src = join(folderPath, file);
    const dst = join(folderPath, target);
    if (file === target) {
      results.push({ action: "ok", file: target });
      continue;
    }
    if (existsSync(dst)) {
      console.warn(`  Colisión omitida (destino existe): ${file} → ${target}`);
      results.push({ action: "skip-collision", file, target });
      continue;
    }
    if (dryRun) {
      results.push({ action: "rename", from: file, to: target });
    } else {
      renameSync(src, dst);
      results.push({ action: "rename", from: file, to: target });
    }
  }
  return results;
}

export function renameFolderIfNeeded(parentPath, oldName, newName, dryRun = false) {
  const src = join(parentPath, oldName);
  const dst = join(parentPath, newName);
  if (oldName === newName) return null;
  if (!existsSync(src)) throw new Error(`No existe: ${src}`);
  if (existsSync(dst)) throw new Error(`Destino ya existe: ${dst}`);
  if (dryRun) return { from: oldName, to: newName };
  renameSync(src, dst);
  return { from: oldName, to: newName };
}
