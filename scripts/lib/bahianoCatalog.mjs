/**
 * Bahiano — 16 arreglos sinfónicos de Bob Marley (Para acomodar).
 * Drive: https://drive.google.com/open?id=16qBZqcQVQ9IF09xmB1AG_skRBpk5UfYE
 * Origen: Partes / Scores / Audios Refe (una carpeta por obra tras unificar).
 */
export const PARA_ACOMODAR_ROOT =
  process.env.PARA_ACOMODAR_ROOT ||
  "H:\\Mi unidad\\Archivo General OFRN\\Para acomodar";

export const BAHIANO_PARENT_FOLDER = "Bahiano";

export const BAHIANO_PARENT_DRIVE_ID = "16qBZqcQVQ9IF09xmB1AG_skRBpk5UfYE";

export const COMPOSER_TAG = "Marley, B";

export const MARLEY = { apellido: "Marley", nombre: "Bob" };

export const GIRA_ID = 12;

export const BLOQUE_NOMBRE = "Bahiano";

export function driveFolderUrl(id) {
  return id ? `https://drive.google.com/drive/folders/${id}` : "";
}

export function targetFolderName(work) {
  return `${COMPOSER_TAG}. - ${work.titulo}`;
}

/**
 * PDFs origen: "TITLE sinfonico - Instrument.pdf" o "N_TITLE - Full Score.pdf".
 * El instrumento está DESPUÉS del último " - ".
 */
export function inferInstrumentFromFilename(fileName) {
  const n = String(fileName || "").replace(/\.pdf$/i, "");
  if (/\bfull\s*score\b|\bpartitura\b/i.test(n)) return "SCORE";
  const tail = n.includes(" - ")
    ? n.slice(n.lastIndexOf(" - ") + 3).trim()
    : n;
  const t = tail.normalize("NFC").toLowerCase();

  if (/flute\s*1|flauta\s*1/.test(t)) return "Flauta 1";
  if (/flute|flauta/.test(t)) return "Flauta 1";
  if (/oboe\s*1/.test(t)) return "Oboe 1";
  if (/oboe/.test(t)) return "Oboe 1";
  if (/clarinet/.test(t) || /clarinete/.test(t)) return "Clarinete Bb 1";
  if (/horn|corno|trompa/.test(t)) return "Corno F 1";
  if (/trumpet|trompeta/.test(t)) return "Trompeta 1";
  if (/trombone|tromb[oó]n/.test(t)) return "Trombón 1";
  if (/sax/.test(t)) return "Saxo Tenor";
  if (/marimba/.test(t)) return "Perc Marimba";
  if (/\bvoz\b|voice|vocal/.test(t)) return "Voz";
  if (/violin\s*ii\b|viol[ií]n\s*2\b|violin ii/.test(t)) return "Violín 2";
  if (/violin\s*i\b|viol[ií]n\s*1\b/.test(t)) return "Violín 1";
  if (/viola/.test(t)) return "Viola";
  if (/cello|violoncell/.test(t)) return "Violoncello";
  return null;
}

export function canonicalAudioBase(work) {
  return `${work.titulo} (Orq REFE)`;
}

/**
 * @typedef {{
 *   orden: number,
 *   key: string,
 *   partesFolder: string,
 *   scoreFile: string,
 *   audioFile: string,
 *   titulo: string,
 *   anio: number|null,
 * }} BahianoWork
 */

/** Orden del set (1–16) = orden en el bloque de repertorio. */
export const BAHIANO_WORKS = [
  {
    orden: 1,
    key: "one-drop",
    partesFolder: "1- One Drop",
    scoreFile: "1_ONE DROP sinfonico - Full Score.pdf",
    audioFile: "1_One drop (orq REFE)_master.mp3",
    titulo: "One Drop",
    anio: 1979,
  },
  {
    orden: 2,
    key: "so-much-trouble",
    partesFolder: "2- So much Troubles",
    scoreFile: "2_So Much Trouble in the world SINFONICO - Full Score.pdf",
    audioFile: "2_So Much Trouble in the world (ORQ REFE).mp3",
    titulo: "So Much Trouble in the World",
    anio: 1979,
  },
  {
    orden: 3,
    key: "small-axe",
    partesFolder: "3- Small Axe",
    scoreFile: "3_SMALL AXE sinfonico - Full Score.pdf",
    audioFile: "3_Small axe (Orq REFE).mp3",
    titulo: "Small Axe",
    anio: 1973,
  },
  {
    orden: 4,
    key: "positive-vibration",
    partesFolder: "4- Positive Vibrations",
    scoreFile: "4_POSITIVE VIBATION Sinfonico - Full Score.pdf",
    audioFile: "4_positive vibration (Orq REFE).mp3",
    titulo: "Positive Vibration",
    anio: 1976,
  },
  {
    orden: 5,
    key: "stir-it-up",
    partesFolder: "5- Stirt it up",
    scoreFile: "5_STIR IT UP sinfonico - Full Score.pdf",
    audioFile: "5_Stir it up (orq REFE).mp3",
    titulo: "Stir It Up",
    anio: 1973,
  },
  {
    orden: 6,
    key: "no-more-trouble",
    partesFolder: "6- No more troubles",
    scoreFile: "6_NO MORE TROUBLE sinfonco - Full Score.pdf",
    audioFile: "6_No more trouble (orq REFE).mp3",
    titulo: "No More Trouble",
    anio: 1973,
  },
  {
    orden: 7,
    key: "waiting-in-vain",
    partesFolder: "7- Waiting in vain",
    scoreFile: "7_waiting in vain sinfonico - Full Score.pdf",
    audioFile: "7_Waiting In Vain (ORQ REFE).mp3",
    titulo: "Waiting in Vain",
    anio: 1977,
  },
  {
    orden: 8,
    key: "is-this-love",
    partesFolder: "8- Is this love",
    scoreFile: "8_Is this love Sinfonico - Full Score.pdf",
    audioFile: "8_is this love (ORQ. REFE).mp3",
    titulo: "Is This Love",
    anio: 1978,
  },
  {
    orden: 9,
    key: "one-love",
    partesFolder: "9- One love",
    scoreFile: "9_ONE LOVE sinfonico - Full Score.pdf",
    audioFile: "9_ONE LOVE (orq refe).mp3",
    titulo: "One Love",
    anio: 1977,
  },
  {
    orden: 10,
    key: "concrete-jungle",
    partesFolder: "10- Concrete Jungle",
    scoreFile: "10_CONCRETE JUNGLE sinfonico - Full Score.pdf",
    audioFile: "10_CONCRETE JUNGLE (Orq Refe)_Master.mp3",
    titulo: "Concrete Jungle",
    anio: 1973,
  },
  {
    orden: 11,
    key: "jah-live",
    partesFolder: "11- Jah live",
    scoreFile: "11_JAH LIVE sinfonico - Full Score.pdf",
    audioFile: "11_Jah Live (orq REFE).mp3",
    titulo: "Jah Live",
    anio: 1975,
  },
  {
    orden: 12,
    key: "get-up-stand-up",
    partesFolder: "12- Get up stand up",
    scoreFile: "12_GET UP STAND UP sinfonico - Full Score.pdf",
    audioFile: "12_Get up stand up (orq REFE).mp3",
    titulo: "Get Up Stand Up",
    anio: 1973,
  },
  {
    orden: 13,
    key: "three-little-birds",
    partesFolder: "13- Three litle birds",
    scoreFile: "13_three little birds sinfonico - Full Score.pdf",
    audioFile: "13_Three Little Birds (ORQ REFE).mp3",
    titulo: "Three Little Birds",
    anio: 1977,
  },
  {
    orden: 14,
    key: "coming-in-from-the-cold",
    partesFolder: "14- Coming in from the cold",
    scoreFile: "14_COMING IN FROM THE COLD sinfonico - Full Score.pdf",
    audioFile: "14_Coming In From The Cold (orq REFE).mp3",
    titulo: "Coming in from the Cold",
    anio: 1980,
  },
  {
    orden: 15,
    key: "exodus",
    partesFolder: "15- Exudus",
    scoreFile: "15_EXODUS sinfonico - Full Score.pdf",
    audioFile: "15_EXODUS (orq REFE).mp3",
    titulo: "Exodus",
    anio: 1977,
  },
  {
    orden: 16,
    key: "jamming",
    partesFolder: "16- Jamming",
    scoreFile: "16_jamming sinfonico - Full Score.pdf",
    audioFile: "16_Jamming (ORQ REFE).mp3",
    titulo: "Jamming",
    anio: 1977,
  },
];
