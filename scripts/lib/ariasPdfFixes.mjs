/** Mapeo IMSLP → instrumento (Va pensiero, Feduol scan, orden en página IMSLP). */
export const NABUCCO_IMSLP_INSTRUMENTS = {
  902434: "SCORE",
  902438: "Oboe 1-2",
  902440: "Clarinete A 1-2",
  902436: "Fagot 1-2",
  902435: "Corno F 1-2",
  902439: "Corno F 3-4",
  902444: "Trompeta 1-2",
  902442: "Trombón 1-3",
  902441: "Tuba",
  902443: "Perc Timbal",
  902447: "Violín 1",
  902448: "Violín 2",
  902445: "Viola",
  902446: "Violoncello",
  902437: "Contrabajo",
};

/** Normaliza encabezado de partitura Tosca (PT/ES) a etiqueta canónica. */
export function normalizeToscaInstrument(raw) {
  let s = String(raw || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();

  if (/PARTITURA|SCORE|FULL\s*SCORE/i.test(s)) return "SCORE";
  if (/OBOE\s*1/i.test(s)) return "Oboe 1";
  if (/OBOE\s*2/i.test(s)) return "Oboe 2";
  if (/CORNE\s+INGLES|CORNO\s+INGLES/i.test(s)) return "Ob EH";
  if (/FLAUTA\s*1|FLUTE\s*1/i.test(s)) return "Flauta 1";
  if (/FLAUTA\s*2|FLUTE\s*2/i.test(s)) return "Flauta 2";
  if (/FLAUTA\s*3|FLUTE\s*3/i.test(s)) return "Flauta 3";
  if (/CLARINETE\s+BAIXO|CLARINETE\s+BAJO|BASS\s+CLAR/i.test(s)) return "Clarinete Bajo";
  if (/CLARINETE\s+(IN\s+)?A\s*1|CL\s+A\s*1/i.test(s)) return "Clarinete A 1";
  if (/CLARINETE\s+(IN\s+)?A\s*2|CL\s+A\s*2/i.test(s)) return "Clarinete A 2";
  if (/CONTRAFAGOTE|CONTRAFAGOT/i.test(s)) return "Contrafagot";
  if (/FAGOTE\s*1\s*E\s*2|FAGOT\s*1\s*Y\s*2/i.test(s)) return "Fagot 1-2";
  if (/FAGOTE\s*1|FAGOT\s*1/i.test(s)) return "Fagot";
  if (/TROMPA\s+F\s*1|CORNO\s+F\s*1|HORN\s*1/i.test(s)) return "Corno F 1";
  if (/TROMPA\s+F\s*2|CORNO\s+F\s*2|HORN\s*2/i.test(s)) return "Corno F 2";
  if (/TROMPA\s+F\s*3|CORNO\s+F\s*3|HORN\s*3/i.test(s)) return "Corno F 3";
  if (/TROMBONE\s*1\s*E\s*2|TROMBON\s*1\s*Y\s*2/i.test(s)) return "Trombón 1-2";
  if (/TROMBONE\s*3|TROMBON\s*3/i.test(s)) return "Trombón 3";
  if (/TIMPANOS|TIMBALES|TIMPANI/i.test(s)) return "Perc Timbal";
  if (/BUMBO|BOMBO|BASS\s+DRUM/i.test(s)) return "Perc Bombo";
  if (/HARPA|HARPI/i.test(s)) return "Arpa";
  if (/VIOLINO\s*1|VIOLIN\s*1/i.test(s)) return "Violín 1";
  if (/VIOLINO\s*2|VIOLIN\s*2/i.test(s)) return "Violín 2";
  if (/VIOLA\b/i.test(s)) return "Viola";
  if (/VIOLONCELO|CELLO|CONTRABAIXO|CONTRABAJO/i.test(s)) return "Violoncello";

  return s
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

export function parseToscaHeader(text) {
  const t = String(text || "").replace(/\s+/g, " ").trim();
  let m = t.match(/TOSCA E lucevan le stelle\s+(.+?)\s+G\.\s*PUCCINI/i);
  if (m) return normalizeToscaInstrument(m[1]);
  m = t.match(/TOSCA E lucevan le stelle\s+G\.\s*PUCCINI\s+(.+)/i);
  if (m) return normalizeToscaInstrument(m[1]);
  return null;
}

export function extractImslpId(fileName) {
  const m = String(fileName || "").match(/\bIMSLP(\d{6})\b/i);
  return m ? Number(m[1]) : null;
}

export function instrumentFromProblematicPdf(fileName, firstPageText) {
  const imslpId = extractImslpId(fileName);
  if (imslpId && NABUCCO_IMSLP_INSTRUMENTS[imslpId]) {
    return NABUCCO_IMSLP_INSTRUMENTS[imslpId];
  }
  if (/^Tosca E lucevan le/i.test(fileName)) {
    return parseToscaHeader(firstPageText);
  }
  return null;
}
