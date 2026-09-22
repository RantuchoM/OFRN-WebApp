/**
 * Convierte WAV/FLAC/AIFF de Drive a MP3 en el navegador y sube el MP3
 * a la misma carpeta. Los bytes NO pasan por Edge (`upload_file` / `get_file_content`).
 *
 * Auth: `manage-drive` `get_temp_token` (cuenta Archivo) + fetch/XHR directo a Drive.
 */

import {
  canonicalMp3Filename,
  uniqueAudioFilename,
} from "./canonicalAudioFilename";
import {
  driveFileToAudioEntry,
  extractDriveFileId,
  mergeObraAudios,
  normalizeObraAudios,
} from "./repertoireAudioTracks";

export const WAV_CONVERT_WARN_BYTES = 150 * 1024 * 1024;
export const WAV_CONVERT_REFUSE_BYTES = 400 * 1024 * 1024;
export const MP3_BITRATE_K = 192;
export const FFMPEG_LOAD_TIMEOUT_MS = 60 * 1000;

/** Core ST servido por Vite desde node_modules (@ffmpeg/core dist/esm). No jsDelivr. */
const FFMPEG_CORE_BASE = "/ffmpeg";

const UNCOMPRESSED_EXT_RE = /\.(wav|flac|aiff|aif)$/i;
const UNCOMPRESSED_MIME_RE =
  /^(audio\/(wav|x-wav|wave|vnd\.wave|flac|x-flac|aiff|x-aiff|aifc))(;|$)/i;

let ffmpegSingleton = null;
let ffmpegLoadPromise = null;

export function isUncompressedDriveAudioFile(file) {
  if (!file) return false;
  const name = String(file.name || "");
  if (UNCOMPRESSED_EXT_RE.test(name)) return true;
  const mime = String(file.mimeType || "").toLowerCase();
  if (UNCOMPRESSED_MIME_RE.test(mime)) return true;
  return false;
}

export function formatBytesForUi(bytes) {
  const n = Number(bytes);
  if (!Number.isFinite(n) || n < 0) return "";
  if (n < 1024) return `${n} B`;
  const mb = n / (1024 * 1024);
  if (mb < 1) return `${Math.round(n / 1024)} KB`;
  if (mb < 10) return `${mb.toFixed(1)} MB`;
  return `${Math.round(mb)} MB`;
}

function findExistingMp3(driveFiles, mp3Name) {
  const target = String(mp3Name || "").toLowerCase();
  if (!target) return null;
  return (
    (driveFiles || []).find(
      (f) => String(f?.name || "").toLowerCase() === target,
    ) || null
  );
}

export function resolveConvertMp3Name(sourceName, driveFiles, mode) {
  const canonical = canonicalMp3Filename(sourceName);
  if (!canonical) {
    throw new Error("No se pudo armar el nombre canónico AUDIO - ….mp3");
  }
  if (mode === "unique") {
    return uniqueAudioFilename(
      canonical,
      (driveFiles || []).map((f) => f.name),
    );
  }
  return canonical;
}

/**
 * Si el WAV (o el MP3 destino) ya estaba en `obras.audios`, deja el MP3 en ese slot.
 * No borra el WAV de Drive; solo cambia el `drive_file_id` de playback.
 */
export function switchObraAudiosToMp3(current, wavFileId, mp3File) {
  const entry = driveFileToAudioEntry(mp3File);
  if (!entry) return normalizeObraAudios(current);
  const list = normalizeObraAudios(current);
  const mp3Id = entry.drive_file_id;
  const wavIdx = list.findIndex((a) => a.drive_file_id === wavFileId);
  const existingMp3Idx = list.findIndex((a) => a.drive_file_id === mp3Id);

  if (wavIdx === -1 && existingMp3Idx === -1) {
    return mergeObraAudios(list, [entry]);
  }

  const next = list.filter((a) => a.drive_file_id !== wavFileId);
  const keepIdx = next.findIndex((a) => a.drive_file_id === mp3Id);
  const preservedLabel =
    (wavIdx >= 0 ? list[wavIdx].label : "") ||
    (existingMp3Idx >= 0 ? list[existingMp3Idx].label : "") ||
    entry.label;

  if (keepIdx >= 0) {
    next[keepIdx] = { ...next[keepIdx], ...entry, label: preservedLabel };
    return next;
  }
  const insertAt = wavIdx >= 0 ? Math.min(wavIdx, next.length) : next.length;
  next.splice(insertAt, 0, { ...entry, label: preservedLabel });
  return next;
}

export async function getArchivoDriveAccessToken(supabase) {
  const { data, error } = await supabase.functions.invoke("manage-drive", {
    body: { action: "get_temp_token" },
  });
  if (error || !data?.accessToken) {
    throw new Error(
      error?.message || data?.error || "No se pudo obtener token de Drive",
    );
  }
  return data.accessToken;
}

async function fetchDriveJson(url, token) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Drive ${res.status}: ${text.slice(0, 280)}`);
  }
  return text ? JSON.parse(text) : {};
}

export async function getDriveFileMetadata(fileId, token) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId,
  )}?fields=id,name,size,mimeType,parents,webViewLink,shortcutDetails&supportsAllDrives=true`;
  return fetchDriveJson(url, token);
}

function concatChunks(chunks, totalLength) {
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

async function fetchWithProgress(url, token, onProgress) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Error descargando (${res.status}) ${errText.slice(0, 180)}`);
  }
  const total = Number(res.headers.get("content-length")) || 0;
  if (!res.body?.getReader) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onProgress?.(1, buf.byteLength, total || buf.byteLength);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.byteLength;
    onProgress?.(total ? received / total : 0, received, total);
  }
  const buf = concatChunks(chunks, received);
  onProgress?.(1, received, total || received);
  return buf;
}

export async function downloadDriveMedia(fileId, token, onProgress) {
  const url = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
    fileId,
  )}?alt=media&supportsAllDrives=true`;
  return fetchWithProgress(url, token, onProgress);
}

async function toBlobUrlWithProgress(url, mime, onProgress) {
  const buf = await fetchWithProgress(url, null, onProgress);
  return URL.createObjectURL(new Blob([buf], { type: mime }));
}

function withTimeout(promise, ms, message) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function reportConverterLoad(onProgress, patch) {
  onProgress?.({
    stage: "convert",
    label: "Cargando conversor…",
    indeterminate: true,
    ratio: null,
    ...patch,
  });
}

async function ensureFfmpeg(onProgress) {
  if (ffmpegSingleton?.loaded) return ffmpegSingleton;
  if (ffmpegLoadPromise) return ffmpegLoadPromise;

  ffmpegLoadPromise = (async () => {
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const ffmpeg = ffmpegSingleton || new FFmpeg();
    ffmpegSingleton = ffmpeg;

    reportConverterLoad(onProgress, {
      label: "Cargando conversor…",
      indeterminate: true,
    });

    const onAssetProgress = (label) => (ratio, received, total) => {
      const hasTotal = Number(total) > 0;
      reportConverterLoad(onProgress, {
        label,
        indeterminate: !hasTotal,
        ratio: hasTotal ? ratio : null,
        received,
        total: hasTotal ? total : received,
        bytesLabel: hasTotal
          ? `${formatBytesForUi(received)} / ${formatBytesForUi(total)}`
          : received
            ? formatBytesForUi(received)
            : "",
      });
    };

    let coreURL;
    let wasmURL;
    try {
      coreURL = await toBlobUrlWithProgress(
        `${FFMPEG_CORE_BASE}/ffmpeg-core.js`,
        "text/javascript",
        onAssetProgress("Cargando conversor…"),
      );
      wasmURL = await toBlobUrlWithProgress(
        `${FFMPEG_CORE_BASE}/ffmpeg-core.wasm`,
        "application/wasm",
        onAssetProgress("Cargando conversor…"),
      );
    } catch (err) {
      const msg = String(err?.message || err);
      throw new Error(
        `No se pudieron cargar los archivos del conversor. ${msg}`,
      );
    }

    reportConverterLoad(onProgress, {
      label: "Inicializando conversor…",
      indeterminate: true,
      ratio: null,
      bytesLabel: "",
    });

    try {
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      // Worker estático: Vite no debe inyectar env.mjs (rompe con `window`).
      const classWorkerURL = `${origin}${FFMPEG_CORE_BASE}/worker.js`;
      await withTimeout(
        ffmpeg.load({ classWorkerURL, coreURL, wasmURL }),
        FFMPEG_LOAD_TIMEOUT_MS,
        "El conversor no terminó de cargar en 60 s. Recargá la pestaña e intentá de nuevo.",
      );
    } catch (err) {
      try {
        ffmpeg.terminate();
      } catch {
        /* ignore */
      }
      throw err;
    }
    return ffmpeg;
  })();

  try {
    return await ffmpegLoadPromise;
  } catch (err) {
    ffmpegLoadPromise = null;
    ffmpegSingleton = null;
    throw err;
  }
}

function sourceExtFromName(name) {
  const m = String(name || "").match(/\.([a-z0-9]+)$/i);
  const ext = (m?.[1] || "wav").toLowerCase();
  if (["wav", "flac", "aiff", "aif", "m4a", "mp3"].includes(ext)) return ext;
  return "wav";
}

export async function encodeWavBytesToMp3(inputBytes, sourceName, onProgress) {
  const ffmpeg = await ensureFfmpeg(onProgress);
  const ext = sourceExtFromName(sourceName);
  const inName = `input.${ext}`;
  const outName = "output.mp3";

  const onFfmpegProgress = ({ progress }) => {
    const p = Number(progress);
    const ratio = Number.isFinite(p) ? Math.min(1, Math.max(0, p)) : 0;
    onProgress?.({
      stage: "convert",
      label: "Convirtiendo",
      ratio,
      indeterminate: false,
    });
  };
  ffmpeg.on("progress", onFfmpegProgress);

  try {
    await ffmpeg.writeFile(inName, inputBytes);
    onProgress?.({
      stage: "convert",
      label: "Convirtiendo",
      ratio: 0,
      indeterminate: false,
    });
    const code = await ffmpeg.exec([
      "-i",
      inName,
      "-vn",
      "-codec:a",
      "libmp3lame",
      "-b:a",
      `${MP3_BITRATE_K}k`,
      outName,
    ]);
    if (code !== 0) {
      throw new Error(`ffmpeg terminó con código ${code}`);
    }
    const data = await ffmpeg.readFile(outName);
    onProgress?.({ stage: "convert", label: "Convirtiendo", ratio: 1 });
    return new Blob([data], { type: "audio/mpeg" });
  } catch (err) {
    const msg = String(err?.message || err);
    throw new Error(
      msg.includes("ffmpeg") || msg.includes("WASM") || msg.includes("worker")
        ? `No se pudo convertir el audio: ${msg}`
        : msg,
    );
  } finally {
    ffmpeg.off("progress", onFfmpegProgress);
    try {
      await ffmpeg.deleteFile(inName);
    } catch {
      /* ignore */
    }
    try {
      await ffmpeg.deleteFile(outName);
    } catch {
      /* ignore */
    }
  }
}

function xhrSend(method, url, { token, body, contentType, onUploadProgress }) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.responseType = "text";
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (contentType) xhr.setRequestHeader("Content-Type", contentType);
    if (onUploadProgress && xhr.upload) {
      xhr.upload.onprogress = (ev) => {
        if (ev.lengthComputable && ev.total > 0) {
          onUploadProgress(ev.loaded / ev.total, ev.loaded, ev.total);
        }
      };
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          status: xhr.status,
          text: xhr.responseText || "",
          location: xhr.getResponseHeader("Location"),
        });
      } else {
        reject(
          new Error(
            `Error subiendo a Drive (${xhr.status}) ${(xhr.responseText || "").slice(0, 280)}`,
          ),
        );
      }
    };
    xhr.onerror = () => reject(new Error("Error de red al subir a Drive"));
    xhr.send(body);
  });
}

/**
 * Subida directa a Drive (multipart, mismo patrón que Viaticos / particellas).
 * `existingFileId`: reemplazo in-place del MP3 ya existente.
 */
export async function uploadMp3ToDrive({
  token,
  blob,
  fileName,
  parentFolderId,
  existingFileId,
  onProgress,
}) {
  const metadata = existingFileId
    ? { name: fileName, mimeType: "audio/mpeg" }
    : {
        name: fileName,
        mimeType: "audio/mpeg",
        parents: parentFolderId ? [parentFolderId] : undefined,
      };

  const form = new FormData();
  form.append(
    "metadata",
    new Blob([JSON.stringify(metadata)], { type: "application/json" }),
  );
  form.append("file", blob, fileName);

  const fields = "id,name,webViewLink,mimeType";
  const url = existingFileId
    ? `https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(
        existingFileId,
      )}?uploadType=multipart&fields=${fields}&supportsAllDrives=true`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=${fields}&supportsAllDrives=true`;

  const method = existingFileId ? "PATCH" : "POST";
  const { text } = await xhrSend(method, url, {
    token,
    body: form,
    onUploadProgress: (ratio) =>
      onProgress?.({ stage: "upload", label: "Subiendo", ratio }),
  });
  const data = text ? JSON.parse(text) : {};
  if (!data.id) throw new Error("Drive no devolvió el id del MP3");
  return data;
}

export async function convertDriveWavToMp3({
  supabase,
  sourceFile,
  folderUrl,
  driveFiles,
  nameMode = "canonical",
  existingMp3File = null,
  onProgress,
}) {
  const sourceId =
    sourceFile?.id || extractDriveFileId(sourceFile?.webViewLink);
  if (!sourceId) throw new Error("Archivo de Drive sin id");

  const folderId = extractDriveFileId(folderUrl);
  if (!folderId) throw new Error("No se pudo resolver la carpeta de Drive");

  onProgress?.({ stage: "download", label: "Preparando", ratio: 0 });
  let token = await getArchivoDriveAccessToken(supabase);

  const meta = await getDriveFileMetadata(sourceId, token);
  const mediaId = meta?.shortcutDetails?.targetId || meta.id || sourceId;
  const sourceName = meta.name || sourceFile.name || "audio.wav";
  const size = Number(meta.size);
  if (Number.isFinite(size) && size > WAV_CONVERT_REFUSE_BYTES) {
    throw new Error(
      `El archivo pesa ${formatBytesForUi(size)} y supera el límite del navegador (${formatBytesForUi(WAV_CONVERT_REFUSE_BYTES)}). Convertí el WAV en el PC e subí el MP3 a la misma carpeta.`,
    );
  }

  const mp3Name = resolveConvertMp3Name(sourceName, driveFiles, nameMode);
  const existing =
    existingMp3File ||
    (nameMode === "canonical" ? findExistingMp3(driveFiles, mp3Name) : null);

  onProgress?.({ stage: "download", label: "Descargando", ratio: 0 });
  let wavBytes;
  try {
    wavBytes = await downloadDriveMedia(mediaId, token, (ratio) =>
      onProgress?.({ stage: "download", label: "Descargando", ratio }),
    );
  } catch (err) {
    const msg = String(err?.message || err);
    if (!/401|403/.test(msg)) throw err;
    token = await getArchivoDriveAccessToken(supabase);
    wavBytes = await downloadDriveMedia(mediaId, token, (ratio) =>
      onProgress?.({ stage: "download", label: "Descargando", ratio }),
    );
  }

  const sourceSize = Number.isFinite(size) ? size : wavBytes?.byteLength || null;
  const mp3Blob = await encodeWavBytesToMp3(wavBytes, sourceName, onProgress);
  wavBytes = null;

  onProgress?.({ stage: "upload", label: "Subiendo", ratio: 0 });
  token = await getArchivoDriveAccessToken(supabase);
  const uploaded = await uploadMp3ToDrive({
    token,
    blob: mp3Blob,
    fileName: mp3Name,
    parentFolderId: folderId,
    existingFileId: existing?.id || null,
    onProgress,
  });

  return {
    file: uploaded,
    mp3Name,
    replacedFileId: existing?.id || null,
    sourceSize,
  };
}

export { findExistingMp3 };
