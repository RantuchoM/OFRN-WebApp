/**
 * Media Session del reproductor de repertorio (lock screen / shade de Android).
 * El tap en la tarjeta lo resuelve el SO: enfoca la ventana que está reproduciendo
 * (PWA standalone o pestaña de Chrome), no hay handler web de "abrir app".
 */

function artworkList() {
  const origin = window.location.origin;
  return [
    { src: `${origin}/pwa-192x192.png`, sizes: "192x192", type: "image/png" },
    { src: `${origin}/pwa-512x512.png`, sizes: "512x512", type: "image/png" },
  ];
}

export function hasMediaSession() {
  return typeof navigator !== "undefined" && "mediaSession" in navigator;
}

export function focusMediaOwnerWindow() {
  try {
    window.focus();
  } catch {
    /* ignore */
  }
}

/**
 * @param {{ current: Record<string, Function> }} handlersRef
 * @returns {() => void}
 */
export function bindRepertoireMediaSession(handlersRef) {
  if (!hasMediaSession()) return () => {};
  const ms = navigator.mediaSession;
  const run = (key, details) => {
    focusMediaOwnerWindow();
    handlersRef.current?.[key]?.(details);
  };
  const bindings = [
    ["play", () => run("play")],
    ["pause", () => run("pause")],
    ["stop", () => run("stop")],
    ["previoustrack", () => run("previoustrack")],
    ["nexttrack", () => run("nexttrack")],
    ["seekto", (details) => run("seekto", details)],
    ["seekbackward", (details) => run("seekbackward", details)],
    ["seekforward", (details) => run("seekforward", details)],
  ];
  for (const [action, fn] of bindings) {
    try {
      ms.setActionHandler(action, fn);
    } catch {
      /* acción no soportada en este motor */
    }
  }
  return () => {
    for (const [action] of bindings) {
      try {
        ms.setActionHandler(action, null);
      } catch {
        /* ignore */
      }
    }
    try {
      ms.playbackState = "none";
      ms.metadata = null;
    } catch {
      /* ignore */
    }
  };
}

export function updateRepertoireMediaSession({
  title,
  artist,
  playing,
  duration,
  position,
  playbackRate,
} = {}) {
  if (!hasMediaSession()) return;
  const ms = navigator.mediaSession;
  try {
    ms.metadata = new window.MediaMetadata({
      title: title || "Repertorio",
      artist: artist || "OFRN",
      album: "OFRN",
      artwork: artworkList(),
    });
  } catch {
    /* ignore */
  }
  try {
    ms.playbackState = playing ? "playing" : "paused";
  } catch {
    /* ignore */
  }
  try {
    if (Number.isFinite(duration) && duration > 0) {
      const rate =
        Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1;
      const pos = Math.max(0, Math.min(Number(position) || 0, duration));
      ms.setPositionState({ duration, playbackRate: rate, position: pos });
    }
  } catch {
    /* ignore */
  }
}
