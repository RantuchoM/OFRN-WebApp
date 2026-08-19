/**
 * Audios de obra (obras.audios) y playlist de repertorio.
 * El player no lista Drive: solo usa IDs ya persistidos o YouTube.
 */

export const AUDIO_FILE_EXT_RE = /\.(mp3|wav|m4a)$/i;

export function extractDriveFileId(urlOrId) {
  if (!urlOrId) return null;
  const s = String(urlOrId).trim();
  if (/^[-\w]{25,}$/.test(s)) return s;
  const match = s.match(/[-\w]{25,}/);
  return match ? match[0] : null;
}

export function isDriveAudioFile(file) {
  if (!file) return false;
  const mime = String(file.mimeType || "").toLowerCase();
  if (mime.startsWith("audio/")) return true;
  return AUDIO_FILE_EXT_RE.test(file.name || "");
}

export function audioLabelFromFilename(name) {
  let base = String(name || "").replace(/\.[^.]+$/, "");
  base = base.replace(/^AUDIO\s*[-–—:]?\s*/i, "").trim();
  return base || String(name || "Audio").trim();
}

export function driveFileToAudioEntry(file) {
  const id = file?.id || extractDriveFileId(file?.webViewLink);
  if (!id) return null;
  const name = file?.name || "Audio";
  return {
    drive_file_id: id,
    name,
    url: file?.webViewLink || `https://drive.google.com/file/d/${id}/view`,
    label: audioLabelFromFilename(name),
  };
}

export function normalizeObraAudios(raw) {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((item, i) => {
      if (!item) return null;
      const id = item.drive_file_id || extractDriveFileId(item.url);
      if (!id) return null;
      const name = item.name || `Audio ${i + 1}`;
      return {
        drive_file_id: id,
        name,
        url: item.url || `https://drive.google.com/file/d/${id}/view`,
        label: (item.label || "").trim() || audioLabelFromFilename(name),
      };
    })
    .filter(Boolean);
}

export function mergeObraAudios(current, incoming) {
  const base = normalizeObraAudios(current);
  const seen = new Set(base.map((a) => a.drive_file_id));
  const next = [...base];
  for (const item of normalizeObraAudios(incoming)) {
    if (seen.has(item.drive_file_id)) continue;
    seen.add(item.drive_file_id);
    next.push(item);
  }
  return next;
}

export function getYoutubeVideoId(url) {
  if (!url || typeof url !== "string") return null;
  const m = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^#&?]{11})/,
  );
  return m ? m[1] : null;
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

/** Primera línea visible del título (sin HTML ni entidades). */
function stripHtml(value) {
  const withBreaks = String(value || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]*>?/gm, " ");
  const lines = decodeHtmlEntities(withBreaks)
    .replace(/\u00a0/g, " ")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return lines[0] || "";
}

function formatObraCompositor(obra) {
  const ocs = (obra?.obras_compositores || []).filter(
    (oc) => (oc.rol === "compositor" || !oc.rol) && oc.compositores,
  );
  if (ocs.length) {
    return ocs
      .map((oc) => {
        const c = oc.compositores;
        return [c.apellido, c.nombre].filter(Boolean).join(", ");
      })
      .filter(Boolean)
      .join(" / ");
  }
  const raw = obra?.compositores;
  const c = Array.isArray(raw) ? raw[0] : raw;
  if (c) return [c.apellido, c.nombre].filter(Boolean).join(", ");
  return "";
}

export function workHasPlayableAudio(obra) {
  if (!obra) return false;
  if (normalizeObraAudios(obra.audios).length > 0) return true;
  return !!getYoutubeVideoId(obra.link_youtube);
}

/**
 * Playlist en orden de concierto. Varios ítems de `audios` = varios tracks seguidos.
 * Si no hay Drive, un track YouTube. Placeholders (sin obra) se omiten.
 */
export function buildRepertoireAudioTracks(repertorios) {
  const tracks = [];
  const blocks = [...(repertorios || [])].sort(
    (a, b) => (a.orden || 0) - (b.orden || 0),
  );

  for (const block of blocks) {
    const rows = [...(block.repertorio_obras || [])].sort(
      (a, b) => (a.orden || 0) - (b.orden || 0),
    );
    for (const row of rows) {
      const obra = row.obras;
      if (!obra?.id) continue;
      const title = stripHtml(obra.titulo) || "Obra";
      const compositor = formatObraCompositor(obra);
      const audios = normalizeObraAudios(obra.audios);

      if (audios.length > 0) {
        audios.forEach((audio, i) => {
          tracks.push({
            id: `drive-${obra.id}-${audio.drive_file_id}-${i}`,
            obraId: obra.id,
            blockId: block.id,
            source: "drive",
            driveFileId: audio.drive_file_id,
            title,
            subtitle: audio.label,
            compositor,
            blockNombre: block.nombre || "",
          });
        });
        continue;
      }

      const youtubeId = getYoutubeVideoId(obra.link_youtube);
      if (youtubeId) {
        tracks.push({
          id: `yt-${obra.id}-${youtubeId}`,
          obraId: obra.id,
          blockId: block.id,
          source: "youtube",
          youtubeId,
          title,
          subtitle: null,
          compositor,
          blockNombre: block.nombre || "",
        });
      }
    }
  }

  return tracks;
}

export function filterRepertoireAudioTracksByBlock(tracks, blockId) {
  if (blockId == null || blockId === "") return tracks || [];
  return (tracks || []).filter(
    (t) => String(t.blockId) === String(blockId),
  );
}

export function findBlockIdForObra(tracks, obraId) {
  if (obraId == null) return null;
  const hit = (tracks || []).find(
    (t) => String(t.obraId) === String(obraId),
  );
  return hit?.blockId ?? null;
}

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
export const PLAYBACK_RATE_STORAGE_KEY = "ofrn.repertoirePlaybackRate";
export const TRACK_PLAYBACK_STATE_KEY = "ofrn.repertoireTrackState";
export const MIN_PLAYBACK_RATE = 0.25;
export const MAX_PLAYBACK_RATE = 4;

export function clampPlaybackRate(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  const rounded = Math.round(n * 100) / 100;
  return Math.min(MAX_PLAYBACK_RATE, Math.max(MIN_PLAYBACK_RATE, rounded));
}

export function formatPlaybackRate(value) {
  return String(clampPlaybackRate(value));
}

function readAllTrackPlaybackState() {
  try {
    const raw = localStorage.getItem(TRACK_PLAYBACK_STATE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function readTrackPlaybackState(trackId) {
  if (!trackId) return { position: 0, rate: null };
  const saved = readAllTrackPlaybackState()[trackId];
  if (!saved || typeof saved !== "object") return { position: 0, rate: null };
  const position = Number(saved.position);
  const rate =
    saved.rate == null || saved.rate === ""
      ? null
      : clampPlaybackRate(saved.rate);
  return {
    position: Number.isFinite(position) && position > 0 ? position : 0,
    rate,
  };
}

export function writeTrackPlaybackState(trackId, { position, rate } = {}) {
  if (!trackId) return;
  try {
    const all = readAllTrackPlaybackState();
    const prev =
      all[trackId] && typeof all[trackId] === "object" ? all[trackId] : {};
    const nextPosition =
      position == null ? prev.position : Math.max(0, Number(position) || 0);
    const nextRate = rate == null ? prev.rate : clampPlaybackRate(rate);
    all[trackId] = { position: nextPosition, rate: nextRate };
    localStorage.setItem(TRACK_PLAYBACK_STATE_KEY, JSON.stringify(all));
  } catch {
    /* ignore quota / private mode */
  }
}
