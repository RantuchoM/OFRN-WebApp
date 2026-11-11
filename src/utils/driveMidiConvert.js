/**
 * Convierte MIDI de Drive a MP3 en el navegador (síntesis GM + ffmpeg) y sube el MP3
 * a la misma carpeta. Mismo patrón híbrido que WAV→MP3 (token Archivo + fetch/XHR).
 */

import {
  findExistingMp3,
  formatBytesForUi,
  getArchivoDriveAccessToken,
  getDriveFileMetadata,
  downloadDriveMedia,
  encodeWavBytesToMp3,
  resolveConvertMp3Name,
  uploadMp3ToDrive,
} from "./driveAudioConvert";
import { extractDriveFileId, isMidiDriveAudioFile } from "./repertoireAudioTracks";

export { isMidiDriveAudioFile };

export const MIDI_SOUNDFONT_URL = "/soundfonts/TimGM6mb.sf2";
export const MIDI_SAMPLE_RATE = 44100;
/** Cola de render (samples); 128 = intervalo de moduladores recomendado por SpessaSynth. */
const MIDI_RENDER_CHUNK = 128;
/** Yield al UI cada N chunks (~0.3 s de audio a 44.1 kHz). */
const MIDI_YIELD_EVERY_CHUNKS = 100;
/** Rechaza MIDI cuya duración renderizada exceda esto (RAM). */
export const MIDI_CONVERT_MAX_DURATION_SEC = 45 * 60;
/** Fade-out / cola tras el último evento de voz. */
const MIDI_TAIL_SEC = 1.5;

let soundfontBufferPromise = null;

export function isConvertibleToMp3DriveAudioFile(file) {
  return isMidiDriveAudioFile(file);
}

async function loadSoundfontArrayBuffer(onProgress) {
  if (soundfontBufferPromise) return soundfontBufferPromise;
  soundfontBufferPromise = (async () => {
    onProgress?.({
      stage: "synth",
      label: "Cargando soundfont…",
      indeterminate: true,
      ratio: null,
    });
    const res = await fetch(MIDI_SOUNDFONT_URL);
    if (!res.ok) {
      throw new Error(
        `No se pudo cargar el soundfont (${res.status}). Revisá /soundfonts/TimGM6mb.sf2.`,
      );
    }
    const total = Number(res.headers.get("content-length")) || 0;
    if (!res.body?.getReader) {
      return res.arrayBuffer();
    }
    const reader = res.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      onProgress?.({
        stage: "synth",
        label: "Cargando soundfont…",
        indeterminate: !(total > 0),
        ratio: total > 0 ? received / total : null,
        received,
        total: total > 0 ? total : received,
        bytesLabel:
          total > 0
            ? `${formatBytesForUi(received)} / ${formatBytesForUi(total)}`
            : formatBytesForUi(received),
      });
    }
    const out = new Uint8Array(received);
    let offset = 0;
    for (const c of chunks) {
      out.set(c, offset);
      offset += c.length;
    }
    return out.buffer;
  })();
  try {
    return await soundfontBufferPromise;
  } catch (err) {
    soundfontBufferPromise = null;
    throw err;
  }
}

function yieldToUi() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

/**
 * MIDI bytes → WAV ArrayBuffer (PCM) vía SpessaSynth.
 */
export async function renderMidiBytesToWav(midiBytes, onProgress) {
  const {
    audioToWav,
    BasicMIDI,
    SoundBankLoader,
    SpessaSynthProcessor,
    SpessaSynthSequencer,
  } = await import("spessasynth_core");

  const midiAb =
    midiBytes instanceof ArrayBuffer
      ? midiBytes
      : midiBytes.buffer.slice(
          midiBytes.byteOffset,
          midiBytes.byteOffset + midiBytes.byteLength,
        );

  const midi = BasicMIDI.fromArrayBuffer(midiAb);
  const duration = Number(midi.duration) || 0;
  if (duration <= 0) {
    throw new Error("El MIDI no tiene duración reproducible.");
  }
  if (duration > MIDI_CONVERT_MAX_DURATION_SEC) {
    throw new Error(
      `El MIDI dura ~${Math.round(duration / 60)} min y supera el límite del navegador (${Math.round(MIDI_CONVERT_MAX_DURATION_SEC / 60)} min). Convertí a MP3 en el PC.`,
    );
  }

  const sfBuffer = await loadSoundfontArrayBuffer(onProgress);
  onProgress?.({
    stage: "synth",
    label: "Sintetizando",
    ratio: 0,
    indeterminate: false,
  });

  const soundBank = SoundBankLoader.fromArrayBuffer(sfBuffer);
  const sampleRate = MIDI_SAMPLE_RATE;
  const synth = new SpessaSynthProcessor(sampleRate, { eventsEnabled: false });
  synth.soundBankManager.addSoundBank(soundBank, "main");
  await synth.ready;
  try {
    synth.setSystemParameter("autoAllocateVoices", true);
  } catch {
    /* ignore si la versión no lo expone */
  }

  const seq = new SpessaSynthSequencer(synth);
  seq.loopCount = 0;
  seq.loadNewSongList([midi]);
  seq.play();

  const sampleCount = Math.ceil(sampleRate * (duration + MIDI_TAIL_SEC));
  const outLeft = new Float32Array(sampleCount);
  const outRight = new Float32Array(sampleCount);
  let filled = 0;
  let chunkI = 0;

  while (filled < sampleCount) {
    seq.processTick();
    const bufferSize = Math.min(MIDI_RENDER_CHUNK, sampleCount - filled);
    synth.process(outLeft, outRight, filled, bufferSize);
    filled += bufferSize;
    chunkI += 1;
    if (chunkI % MIDI_YIELD_EVERY_CHUNKS === 0) {
      onProgress?.({
        stage: "synth",
        label: "Sintetizando",
        ratio: filled / sampleCount,
        indeterminate: false,
      });
      await yieldToUi();
    }
  }

  onProgress?.({
    stage: "synth",
    label: "Sintetizando",
    ratio: 1,
    indeterminate: false,
  });

  const wavAb = audioToWav([outLeft, outRight], sampleRate);
  return new Uint8Array(wavAb);
}

export async function convertDriveMidiToMp3({
  supabase,
  sourceFile,
  folderUrl,
  driveFiles,
  nameMode = "canonical",
  existingMp3File = null,
  onProgress,
}) {
  if (!isMidiDriveAudioFile(sourceFile)) {
    throw new Error("El archivo no es un MIDI (.mid / .midi).");
  }

  const sourceId =
    sourceFile?.id || extractDriveFileId(sourceFile?.webViewLink);
  if (!sourceId) throw new Error("Archivo de Drive sin id");

  const folderId = extractDriveFileId(folderUrl);
  if (!folderId) throw new Error("No se pudo resolver la carpeta de Drive");

  onProgress?.({ stage: "download", label: "Preparando", ratio: 0 });
  let token = await getArchivoDriveAccessToken(supabase);

  const meta = await getDriveFileMetadata(sourceId, token);
  const mediaId = meta?.shortcutDetails?.targetId || meta.id || sourceId;
  const sourceName = meta.name || sourceFile.name || "audio.mid";
  const size = Number(meta.size);

  const mp3Name = resolveConvertMp3Name(sourceName, driveFiles, nameMode);
  const existing =
    existingMp3File ||
    (nameMode === "canonical" ? findExistingMp3(driveFiles, mp3Name) : null);

  onProgress?.({ stage: "download", label: "Descargando", ratio: 0 });
  let midiBytes;
  try {
    midiBytes = await downloadDriveMedia(mediaId, token, (ratio) =>
      onProgress?.({ stage: "download", label: "Descargando", ratio }),
    );
  } catch (err) {
    const msg = String(err?.message || err);
    if (!/401|403/.test(msg)) throw err;
    token = await getArchivoDriveAccessToken(supabase);
    midiBytes = await downloadDriveMedia(mediaId, token, (ratio) =>
      onProgress?.({ stage: "download", label: "Descargando", ratio }),
    );
  }

  const wavBytes = await renderMidiBytesToWav(midiBytes, onProgress);
  midiBytes = null;

  onProgress?.({
    stage: "convert",
    label: "Codificando MP3",
    ratio: 0,
    indeterminate: false,
  });
  const mp3Blob = await encodeWavBytesToMp3(
    wavBytes,
    `${sourceName.replace(/\.[^.]+$/, "") || "audio"}.wav`,
    onProgress,
  );

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
    sourceSize: Number.isFinite(size) ? size : null,
  };
}
