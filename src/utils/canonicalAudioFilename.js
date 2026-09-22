/**
 * Nombres canónicos de audio (Para acomodar / Drive matcher).
 * Misma regla que `scripts/lib/pdfPartsRenaming.mjs` reexporta desde aquí.
 */

export function safeFileName(name) {
  return String(name ?? "")
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.$/, "");
}

const AUDIO_EXT_CAPTURE_RE = /^(.*?)(\.(mp3|wav|m4a|flac|aiff|aif))$/i;

/**
 * Audio en Para acomodar: `AUDIO - {resto del nombre}.mp3|wav|…`.
 * Idempotente si ya tiene prefijo AUDIO; quita un "Audio" suelto al final.
 */
export function canonicalAudioFilename(existingName) {
  const m = String(existingName || "").match(AUDIO_EXT_CAPTURE_RE);
  if (!m) return null;
  let base = m[1].trim();
  const ext = m[2];
  base = base.replace(/^AUDIO\s*[-–—:]?\s*/i, "").trim();
  base = base.replace(/\s+Audio$/i, "").trim();
  if (!base) return null;
  return `${safeFileName(`AUDIO - ${base}`)}${ext}`;
}

/** Igual que `canonicalAudioFilename` pero siempre `.mp3` (WAV de archivo → MP3 de playback). */
export function canonicalMp3Filename(existingName) {
  const audio = canonicalAudioFilename(existingName);
  if (audio) return audio.replace(/\.(mp3|wav|m4a|flac|aiff|aif)$/i, ".mp3");
  const raw = String(existingName || "").trim();
  let base = raw.replace(/\.[^.]+$/, "").trim();
  base = base.replace(/^AUDIO\s*[-–—:]?\s*/i, "").trim();
  base = base.replace(/\s+Audio$/i, "").trim();
  if (!base) return null;
  return `${safeFileName(`AUDIO - ${base}`)}.mp3`;
}

export function uniqueAudioFilename(desiredName, existingNames) {
  const wanted = String(desiredName || "").trim();
  if (!wanted) return wanted;
  const used = new Set(
    (existingNames || []).map((n) => String(n || "").trim().toLowerCase()),
  );
  if (!used.has(wanted.toLowerCase())) return wanted;
  const m = wanted.match(/^(.*)(\.[^.]+)$/);
  const base = m ? m[1] : wanted;
  const ext = m ? m[2] : "";
  for (let i = 2; i < 200; i += 1) {
    const candidate = `${base} (${i})${ext}`;
    if (!used.has(candidate.toLowerCase())) return candidate;
  }
  return `${base} (${Date.now()})${ext}`;
}
