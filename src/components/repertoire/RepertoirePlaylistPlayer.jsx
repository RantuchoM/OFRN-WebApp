import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconChevronDown,
  IconChevronUp,
  IconDrive,
  IconLoader,
  IconMaximize,
  IconPause,
  IconPlay,
  IconRepeat,
  IconSkipBack,
  IconSkipForward,
  IconX,
  IconYoutube,
  IconExternalLink,
} from "../ui/Icons";
import {
  PLAYBACK_RATE_STORAGE_KEY,
  PLAYBACK_RATES,
  clampPlaybackRate,
  formatPlaybackRate,
  readTrackPlaybackState,
  writeTrackPlaybackState,
} from "../../utils/repertoireAudioTracks";
import {
  ensureDriveAudioCachePruned,
  readCachedDriveAudioBlob,
  writeCachedDriveAudioBlob,
} from "../../utils/repertoireDriveAudioCache";

function findPlayRequestIndex(tracks, playRequest) {
  if (!playRequest || !tracks?.length) return 0;
  if (playRequest.obraId != null) {
    const idx = tracks.findIndex(
      (t) => String(t.obraId) === String(playRequest.obraId),
    );
    if (idx >= 0) return idx;
  }
  if (playRequest.blockId != null) {
    const idx = tracks.findIndex(
      (t) => String(t.blockId) === String(playRequest.blockId),
    );
    return idx < 0 ? 0 : idx;
  }
  return 0;
}

function playAudioElement(el, playPromiseRef) {
  if (!el?.src) return;
  const next = el.play();
  playPromiseRef.current = next;
  if (next?.catch) {
    next.catch((err) => {
      if (err?.name === "AbortError") return;
    });
  }
}

function pauseAudioElement(el, playPromiseRef) {
  if (!el) return;
  const pending = playPromiseRef.current;
  if (pending?.then) {
    pending
      .then(() => {
        el.pause();
      })
      .catch(() => {});
    playPromiseRef.current = null;
    return;
  }
  el.pause();
}

function waitForAudioCanPlay(el, timeoutMs = 8000) {
  if (!el) return Promise.resolve();
  if (el.readyState >= 3) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      el.removeEventListener("canplay", done);
      el.removeEventListener("error", done);
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(done, timeoutMs);
    el.addEventListener("canplay", done);
    el.addEventListener("error", done);
  });
}

function RateControl({ rate, onChange, id, className = "" }) {
  const [draft, setDraft] = useState(formatPlaybackRate(rate));

  useEffect(() => {
    setDraft(formatPlaybackRate(rate));
  }, [rate]);

  const commit = () => {
    const next = clampPlaybackRate(String(draft).replace(",", "."));
    setDraft(formatPlaybackRate(next));
    onChange(next);
  };

  return (
    <div className={`flex items-center gap-0.5 shrink-0 ${className}`}>
      <button
        type="button"
        onClick={() => onChange(clampPlaybackRate(rate - 0.05))}
        className="h-7 w-6 rounded border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
        title="Más lento"
      >
        −
      </button>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        list={`${id}-presets`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="h-7 w-14 rounded border border-slate-200 bg-white px-1 text-center text-[11px] font-bold text-slate-600"
        title="Velocidad (ej. 0.78 o 1.8)"
        aria-label="Velocidad de reproducción"
      />
      <datalist id={`${id}-presets`}>
        {PLAYBACK_RATES.map((r) => (
          <option key={r} value={formatPlaybackRate(r)} />
        ))}
      </datalist>
      <span className="text-[10px] font-bold text-slate-400">×</span>
      <button
        type="button"
        onClick={() => onChange(clampPlaybackRate(rate + 0.05))}
        className="h-7 w-6 rounded border border-slate-200 text-[11px] font-bold text-slate-500 hover:bg-slate-50"
        title="Más rápido"
      >
        +
      </button>
    </div>
  );
}

function formatClock(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, "0")}`;
}

function youtubeWatchUrl(videoId) {
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null;
}

/** 101/150 = el dueño deshabilitó embed. No hay forma legítima de reproducirlo en la app. */
function interpretYoutubeError(code) {
  if (code === 101 || code === 150) {
    return {
      embedBlocked: true,
      text: "El autor no permite reproducir este video fuera de YouTube.",
    };
  }
  if (code === 100) {
    return { embedBlocked: false, text: "El video no existe o es privado." };
  }
  if (code === 2) {
    return { embedBlocked: false, text: "El enlace de YouTube no es válido." };
  }
  return {
    embedBlocked: false,
    text: "No se pudo reproducir el video de YouTube.",
  };
}

function loadYoutubeApi() {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return new Promise((resolve) => {
    const existing = document.querySelector("script[data-ofrn-youtube-api]");
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === "function") prev();
      resolve(window.YT);
    };
    if (!existing) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.dataset.ofrnYoutubeApi = "1";
      document.head.appendChild(tag);
    } else if (window.YT?.Player) {
      resolve(window.YT);
    }
  });
}

export default function RepertoirePlaylistPlayer({
  supabase,
  tracks = [],
  playRequest = null,
}) {
  const audioRef = useRef(null);
  const ytHostRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const blobUrlsRef = useRef(new Map());
  const tokenRef = useRef(null);
  const indexRef = useRef(0);
  const loopRef = useRef(false);
  const rateRef = useRef(1);
  const playingRef = useRef(false);
  const tracksRef = useRef(tracks);
  const playNextRef = useRef(() => {});
  const persistCurrentRef = useRef(() => {});
  const pendingSeekRef = useRef(0);
  const playPromiseRef = useRef(null);
  const getDriveBlobUrlRef = useRef(null);

  const [index, setIndex] = useState(() =>
    findPlayRequestIndex(tracks, playRequest),
  );
  const [playing, setPlaying] = useState(() => Boolean(playRequest));
  const [rate, setRate] = useState(() => {
    const idx = findPlayRequestIndex(tracks, playRequest);
    const saved = readTrackPlaybackState(tracks[idx]?.id);
    return saved.rate != null ? saved.rate : 1;
  });
  const [loop, setLoop] = useState(false);
  const [expanded, setExpanded] = useState(() => Boolean(playRequest));
  const [fullscreen, setFullscreen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loadingAudio, setLoadingAudio] = useState(false);
  const [error, setError] = useState(null);
  const [ytEmbedBlocked, setYtEmbedBlocked] = useState(false);

  const current = tracks[index] || null;
  tracksRef.current = tracks;
  indexRef.current = index;
  loopRef.current = loop;
  rateRef.current = rate;
  playingRef.current = playing;

  const ensureToken = useCallback(
    async (forceRefresh = false) => {
      if (!forceRefresh && tokenRef.current) return tokenRef.current;
      const { data, error: fnError } = await supabase.functions.invoke(
        "manage-drive",
        { body: { action: "get_temp_token" } },
      );
      if (fnError || !data?.accessToken) {
        throw new Error(
          fnError?.message || data?.error || "No se pudo obtener acceso a Drive.",
        );
      }
      tokenRef.current = data.accessToken;
      return tokenRef.current;
    },
    [supabase],
  );

  const getDriveBlobUrl = useCallback(
    async (fileId) => {
      const mem = blobUrlsRef.current.get(fileId);
      if (mem) return mem;
      ensureDriveAudioCachePruned();

      try {
        const cached = await Promise.race([
          readCachedDriveAudioBlob(fileId),
          new Promise((resolve) => setTimeout(() => resolve(null), 400)),
        ]);
        if (cached) {
          const url = URL.createObjectURL(cached);
          blobUrlsRef.current.set(fileId, url);
          return url;
        }
      } catch {
        /* seguir a Drive */
      }

      const fetchMedia = async (token) =>
        fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
          headers: { Authorization: `Bearer ${token}` },
        });

      let token = await ensureToken();
      let response = await fetchMedia(token);
      if (response.status === 401) {
        token = await ensureToken(true);
        response = await fetchMedia(token);
      }
      if (!response.ok) {
        throw new Error("No se pudo descargar el audio de Drive.");
      }
      const blob = await response.blob();
      void writeCachedDriveAudioBlob(fileId, blob);
      const url = URL.createObjectURL(blob);
      blobUrlsRef.current.set(fileId, url);
      return url;
    },
    [ensureToken],
  );
  getDriveBlobUrlRef.current = getDriveBlobUrl;

  const goTo = useCallback((nextIndex, { autoplay = true } = {}) => {
    persistCurrentRef.current();
    if (!tracksRef.current.length) return;
    const len = tracksRef.current.length;
    const wrapped = ((nextIndex % len) + len) % len;
    const track = tracksRef.current[wrapped];
    const saved = readTrackPlaybackState(track?.id);
    const nextRate = saved.rate != null ? saved.rate : 1;
    pendingSeekRef.current = saved.position || 0;
    setIndex(wrapped);
    setProgress(saved.position || 0);
    setDuration(0);
    setError(null);
    setYtEmbedBlocked(false);
    setRate(nextRate);
    setPlaying(autoplay);
  }, []);

  const persistCurrent = useCallback(() => {
    const track = tracksRef.current[indexRef.current];
    if (!track) return;
    let position = 0;
    if (track.source === "drive") {
      position = audioRef.current?.currentTime || 0;
    } else {
      try {
        position = ytPlayerRef.current?.getCurrentTime?.() || 0;
      } catch {
        position = 0;
      }
    }
    const durationNow =
      track.source === "drive"
        ? audioRef.current?.duration
        : ytPlayerRef.current?.getDuration?.();
    if (
      Number.isFinite(durationNow) &&
      durationNow > 0 &&
      position >= durationNow - 1.25
    ) {
      position = 0;
    }
    writeTrackPlaybackState(track.id, {
      position,
      rate: rateRef.current,
    });
  }, []);

  persistCurrentRef.current = persistCurrent;

  const playNext = useCallback(() => {
    const list = tracksRef.current;
    if (!list.length) return;
    const i = indexRef.current;
    if (i >= list.length - 1) {
      if (loopRef.current) goTo(0, { autoplay: true });
      else {
        const track = list[i];
        if (track?.id) {
          writeTrackPlaybackState(track.id, {
            position: 0,
            rate: rateRef.current,
          });
        }
        setPlaying(false);
        setProgress(0);
      }
      return;
    }
    goTo(i + 1, { autoplay: true });
  }, [goTo]);

  playNextRef.current = playNext;

  const playPrev = useCallback(() => {
    const el = audioRef.current;
    let t = 0;
    if (current?.source === "drive") t = el?.currentTime || 0;
    else {
      try {
        t = ytPlayerRef.current?.getCurrentTime?.() || 0;
      } catch {
        t = 0;
      }
    }
    if (t > 2) {
      if (current?.source === "drive" && el) el.currentTime = 0;
      else ytPlayerRef.current?.seekTo?.(0, true);
      setProgress(0);
      return;
    }
    goTo(indexRef.current - 1, { autoplay: true });
  }, [current, goTo]);

  useEffect(() => {
    const el = document.createElement("audio");
    el.preload = "auto";
    audioRef.current = el;
    const onEnded = () => playNextRef.current();
    const onTime = () => {
      setProgress(el.currentTime || 0);
      setDuration(Number.isFinite(el.duration) ? el.duration : 0);
    };
    const onLoaded = () => {
      onTime();
      const seek = pendingSeekRef.current;
      if (seek > 0 && Number.isFinite(el.duration) && seek < el.duration - 0.5) {
        el.currentTime = seek;
        setProgress(seek);
      }
    };
    el.addEventListener("ended", onEnded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("pause", () => persistCurrentRef.current());
    const onUnload = () => persistCurrentRef.current();
    window.addEventListener("beforeunload", onUnload);
    return () => {
      persistCurrentRef.current();
      el.pause();
      el.removeEventListener("ended", onEnded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onLoaded);
      window.removeEventListener("beforeunload", onUnload);
      audioRef.current = null;
      blobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      blobUrlsRef.current.clear();
      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }
      ytPlayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!playRequest) return;
    const idx = findPlayRequestIndex(tracks, playRequest);
    if (tracks.length === 0) return;
    setExpanded(true);
    if (idx === indexRef.current && playingRef.current) return;
    goTo(idx, { autoplay: true });
  }, [playRequest, tracks, goTo]);

  useEffect(() => {
    if (index >= tracks.length && tracks.length > 0) {
      goTo(0, { autoplay: playingRef.current });
    }
  }, [tracks, index, goTo]);

  useEffect(() => {
    const el = audioRef.current;
    if (el) el.playbackRate = rate;
    try {
      ytPlayerRef.current?.setPlaybackRate?.(rate);
    } catch {
      /* YouTube solo aplica tasas discretas */
    }
    const track = tracksRef.current[indexRef.current];
    if (track?.id) {
      writeTrackPlaybackState(track.id, { rate });
    }
    try {
      localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(rate));
    } catch {
      /* ignore */
    }
  }, [rate]);

  useEffect(() => {
    let cancelled = false;
    const track = tracks[index];

    const run = async () => {
      if (!track) {
        audioRef.current?.pause();
        try {
          ytPlayerRef.current?.pauseVideo?.();
        } catch {
          /* ignore */
        }
        return;
      }

      if (track.source === "drive") {
        try {
          ytPlayerRef.current?.pauseVideo?.();
        } catch {
          /* ignore */
        }
        const el = audioRef.current;
        if (!el) return;
        setLoadingAudio(true);
        setError(null);
        try {
          const url = await getDriveBlobUrlRef.current(track.driveFileId);
          if (cancelled) return;
          const pending = playPromiseRef.current;
          if (pending?.then) {
            try {
              await Promise.race([
                pending,
                new Promise((resolve) => setTimeout(resolve, 250)),
              ]);
            } catch {
              /* AbortError / autoplay */
            }
            playPromiseRef.current = null;
          }
          if (el.src !== url) {
            el.src = url;
          }
          el.playbackRate = rateRef.current;
          const seek = pendingSeekRef.current;
          await waitForAudioCanPlay(el);
          if (cancelled) return;
          if (
            seek > 0 &&
            Number.isFinite(el.duration) &&
            seek < el.duration - 0.5
          ) {
            el.currentTime = seek;
            setProgress(seek);
          }
          setPlaying(true);
          playingRef.current = true;
          playAudioElement(el, playPromiseRef);
        } catch (e) {
          if (!cancelled) {
            setError(e.message || "Error al reproducir el audio.");
            setPlaying(false);
          }
        } finally {
          if (!cancelled) setLoadingAudio(false);
        }
        return;
      }

      audioRef.current?.pause();
      setLoadingAudio(true);
      setError(null);
      setYtEmbedBlocked(false);
      try {
        const YT = await loadYoutubeApi();
        if (cancelled || !YT || !ytHostRef.current) return;

        const onEnded = () => playNextRef.current();
        if (!ytPlayerRef.current) {
          ytPlayerRef.current = new YT.Player(ytHostRef.current, {
            width: "160",
            height: "90",
            videoId: track.youtubeId,
            playerVars: {
              rel: 0,
              modestbranding: 1,
              playsinline: 1,
              origin: window.location.origin,
            },
            events: {
              onReady: (event) => {
                try {
                  event.target.setPlaybackRate(rateRef.current);
                } catch {
                  /* ignore */
                }
                const seek = pendingSeekRef.current;
                if (seek > 0) {
                  try {
                    event.target.seekTo(seek, true);
                    setProgress(seek);
                  } catch {
                    /* ignore */
                  }
                }
                if (playingRef.current) event.target.playVideo();
                setLoadingAudio(false);
              },
              onStateChange: (event) => {
                if (event.data === window.YT?.PlayerState?.ENDED) onEnded();
                if (event.data === window.YT?.PlayerState?.PLAYING) {
                  setPlaying(true);
                  setDuration(event.target.getDuration?.() || 0);
                  setYtEmbedBlocked(false);
                  setError(null);
                }
                if (event.data === window.YT?.PlayerState?.PAUSED) {
                  setPlaying(false);
                }
              },
              onError: (event) => {
                const info = interpretYoutubeError(event?.data);
                setYtEmbedBlocked(info.embedBlocked);
                setError(info.text);
                setPlaying(false);
                setLoadingAudio(false);
              },
            },
          });
        } else {
          const currentId = ytPlayerRef.current.getVideoData?.()?.video_id;
          if (currentId !== track.youtubeId) {
            if (playingRef.current) {
              ytPlayerRef.current.loadVideoById({
                videoId: track.youtubeId,
                startSeconds: pendingSeekRef.current || 0,
              });
            } else {
              ytPlayerRef.current.cueVideoById({
                videoId: track.youtubeId,
                startSeconds: pendingSeekRef.current || 0,
              });
            }
          } else if (playingRef.current) {
            ytPlayerRef.current.playVideo();
          } else {
            ytPlayerRef.current.pauseVideo();
          }
          try {
            ytPlayerRef.current.setPlaybackRate(rateRef.current);
          } catch {
            /* ignore */
          }
          setLoadingAudio(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message || "Error al cargar YouTube.");
          setPlaying(false);
          setLoadingAudio(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [index, current?.id, current?.source, current?.driveFileId, current?.youtubeId]);

  useEffect(() => {
    const track = tracks[index];
    if (!track) return;
    if (track.source === "drive") {
      const el = audioRef.current;
      if (!el?.src) return;
      if (playing) playAudioElement(el, playPromiseRef);
      else pauseAudioElement(el, playPromiseRef);
      return;
    }
    try {
      if (playing) ytPlayerRef.current?.playVideo?.();
      else ytPlayerRef.current?.pauseVideo?.();
    } catch {
      /* ignore */
    }
  }, [playing]);

  useEffect(() => {
    if (!playing) return undefined;
    const id = setInterval(() => persistCurrentRef.current(), 2000);
    return () => clearInterval(id);
  }, [playing, index]);

  useEffect(() => {
    if (current?.source !== "youtube" || !playing) return undefined;
    const id = setInterval(() => {
      try {
        const t = ytPlayerRef.current?.getCurrentTime?.() || 0;
        const d = ytPlayerRef.current?.getDuration?.() || 0;
        setProgress(t);
        setDuration(d);
      } catch {
        /* ignore */
      }
    }, 250);
    return () => clearInterval(id);
  }, [current?.source, playing, index]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [fullscreen]);

  useEffect(() => {
    const player = ytPlayerRef.current;
    if (!player?.setSize || current?.source !== "youtube") return;
    try {
      if (fullscreen) player.setSize(640, 360);
      else player.setSize(96, 54);
    } catch {
      /* ignore */
    }
  }, [fullscreen, current?.source]);

  useEffect(() => {
    if (!tracks.length) {
      delete document.documentElement.dataset.repertoirePlayer;
      return undefined;
    }
    document.documentElement.dataset.repertoirePlayer = fullscreen
      ? "full"
      : "mini";
    return () => {
      delete document.documentElement.dataset.repertoirePlayer;
    };
  }, [fullscreen, tracks.length]);

  const togglePlay = () => {
    if (!current) return;
    setPlaying((v) => !v);
  };

  const onSeek = (value) => {
    const next = Number(value);
    setProgress(next);
    if (current?.source === "drive" && audioRef.current) {
      audioRef.current.currentTime = next;
    } else {
      ytPlayerRef.current?.seekTo?.(next, true);
    }
    pendingSeekRef.current = next;
    persistCurrentRef.current();
  };

  if (!tracks.length) return null;

  const renderTrackList = (dense = true) =>
    tracks.map((track, i) => {
      const active = i === index;
      return (
        <button
          key={track.id}
          type="button"
          onClick={() => goTo(i, { autoplay: true })}
          className={`flex w-full min-w-0 max-w-full items-center gap-2 overflow-hidden px-3 py-1.5 text-left hover:bg-indigo-50 ${
            dense ? "text-xs" : "text-sm py-2.5"
          } ${active ? "bg-indigo-50 text-indigo-800" : "text-slate-700"}`}
        >
          <span className="w-5 shrink-0 text-[10px] font-bold text-slate-400">
            {i + 1}
          </span>
          {track.source === "youtube" ? (
            <IconYoutube size={12} className="shrink-0 text-red-500" />
          ) : (
            <IconDrive size={12} className="shrink-0 text-emerald-600" />
          )}
          <span className="min-w-0 flex-1 truncate font-medium">
            {track.title}
            {track.subtitle ? (
              <span className="font-normal text-slate-500">
                {" "}
                · {track.subtitle}
              </span>
            ) : null}
          </span>
          {track.compositor ? (
            <span className="hidden max-w-[10rem] shrink-0 truncate text-[10px] text-slate-400 sm:inline-block">
              {track.compositor}
            </span>
          ) : null}
        </button>
      );
    });

  const transport = (
    <div className="flex shrink-0 items-center gap-0.5">
      <button
        type="button"
        onClick={playPrev}
        className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
        title="Anterior"
      >
        <IconSkipBack size={fullscreen ? 22 : 16} />
      </button>
      <button
        type="button"
        onClick={togglePlay}
        disabled={loadingAudio}
        className={`flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 ${
          fullscreen ? "h-14 w-14" : "h-8 w-8"
        }`}
        title={playing ? "Pausar" : "Reproducir"}
      >
        {loadingAudio ? (
          <IconLoader size={fullscreen ? 22 : 14} className="animate-spin" />
        ) : playing ? (
          <IconPause size={fullscreen ? 22 : 14} />
        ) : (
          <IconPlay size={fullscreen ? 22 : 14} />
        )}
      </button>
      <button
        type="button"
        onClick={playNext}
        className="rounded p-1.5 text-slate-600 hover:bg-slate-100"
        title="Siguiente"
      >
        <IconSkipForward size={fullscreen ? 22 : 16} />
      </button>
    </div>
  );

  const seekBar = (
    <div className="mt-0.5 flex items-center gap-2">
      <span className="w-8 shrink-0 text-[10px] tabular-nums text-slate-400">
        {formatClock(progress)}
      </span>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={Math.min(progress, duration || 0)}
        onChange={(e) => onSeek(e.target.value)}
        className="h-1 w-full cursor-pointer accent-indigo-600"
        aria-label="Progreso"
      />
      <span className="w-8 shrink-0 text-right text-[10px] tabular-nums text-slate-400">
        {formatClock(duration)}
      </span>
    </div>
  );

  const chrome = (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[100] flex flex-col bg-slate-100"
          : "repertoire-player-dock fixed bottom-0 z-40 flex max-w-none flex-col overflow-hidden border-t border-slate-200 bg-white shadow-[0_-6px_20px_rgba(15,23,42,0.08)]"
      }
      role={fullscreen ? "dialog" : undefined}
      aria-modal={fullscreen ? true : undefined}
      aria-label="Reproductor de repertorio"
    >
      {fullscreen && (
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-3 py-2.5">
          <p className="text-sm font-bold text-slate-800">Reproductor</p>
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
            title="Cerrar pantalla completa"
            aria-label="Cerrar pantalla completa"
          >
            <IconX size={20} />
          </button>
        </div>
      )}

      {expanded && !fullscreen && (
        <div className="max-h-52 w-full min-w-0 overflow-x-hidden overflow-y-auto border-b border-slate-100 bg-slate-50">
          {renderTrackList(true)}
        </div>
      )}

      <div
        className={
          fullscreen
            ? "flex min-h-0 flex-1 flex-col md:flex-row"
            : "flex min-w-0 w-full items-center gap-2 px-2 py-1.5 pr-14 md:gap-3 md:px-3 md:pr-16"
        }
      >
        <div
          className={
            fullscreen
              ? "flex w-full shrink-0 flex-col items-center gap-3 bg-white p-4 md:w-[min(28rem,42%)] md:justify-center"
              : "flex shrink-0 items-center gap-1"
          }
        >
          <div
            className={`relative overflow-hidden rounded bg-slate-900 ${
              current?.source === "youtube"
                ? fullscreen
                  ? "aspect-video w-full max-w-xl"
                  : "h-[54px] w-[96px] max-w-[96px] shrink-0"
                : "hidden"
            }`}
          >
            <div ref={ytHostRef} className="h-full w-full" />
            {ytEmbedBlocked && current?.youtubeId ? (
              <a
                href={youtubeWatchUrl(current.youtubeId)}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1 bg-slate-950/90 px-2 text-center text-white hover:bg-slate-950"
                title="Abrir en YouTube"
              >
                <IconYoutube size={fullscreen ? 28 : 16} className="text-red-500" />
                {fullscreen ? (
                  <>
                    <span className="text-xs font-medium leading-snug">
                      No se puede incrustar este video
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-300">
                      Abrir en YouTube <IconExternalLink size={12} />
                    </span>
                  </>
                ) : (
                  <IconExternalLink size={10} className="text-slate-300" />
                )}
              </a>
            ) : null}
          </div>

          {fullscreen && current?.source !== "youtube" && (
            <div className="flex h-40 w-full max-w-xl items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <IconDrive size={48} />
            </div>
          )}

          {fullscreen && (
            <div className="w-full max-w-xl text-center">
              <p className="text-base font-bold text-slate-900">
                {current?.title || "—"}
                {current?.subtitle ? (
                  <span className="block text-sm font-medium text-slate-500">
                    {current.subtitle}
                  </span>
                ) : null}
              </p>
              {current?.compositor ? (
                <p className="mt-1 text-xs text-slate-500">{current.compositor}</p>
              ) : null}
              {error ? (
                ytEmbedBlocked && current?.youtubeId ? (
                  <a
                    href={youtubeWatchUrl(current.youtubeId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-700"
                  >
                    Abrir en YouTube <IconExternalLink size={12} />
                  </a>
                ) : (
                  <p className="mt-1 text-xs text-red-600">{error}</p>
                )
              ) : null}
            </div>
          )}

          {transport}

          {fullscreen && (
            <div className="w-full max-w-xl">
              {seekBar}
              <div className="mt-3 flex items-center justify-center gap-3">
                <RateControl
                  rate={rate}
                  onChange={setRate}
                  id="repertoire-rate-full"
                />
                <button
                  type="button"
                  onClick={() => setLoop((v) => !v)}
                  className={`rounded p-1.5 ${
                    loop
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-400 hover:bg-slate-100"
                  }`}
                  title="Repetir playlist"
                >
                  <IconRepeat size={18} />
                </button>
              </div>
            </div>
          )}
        </div>

        {!fullscreen && (
          <>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                {current?.source === "youtube" ? (
                  <IconYoutube size={12} className="shrink-0 text-red-500" />
                ) : (
                  <IconDrive size={12} className="shrink-0 text-emerald-600" />
                )}
                <p className="truncate text-xs font-bold text-slate-800">
                  {current?.title || "—"}
                  {current?.subtitle ? (
                    <span className="font-medium text-slate-500">
                      {" "}
                      · {current.subtitle}
                    </span>
                  ) : null}
                </p>
              </div>
              {seekBar}
              {error ? (
                ytEmbedBlocked && current?.youtubeId ? (
                  <a
                    href={youtubeWatchUrl(current.youtubeId)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex max-w-full items-center gap-1 truncate text-[10px] font-bold text-red-600 hover:underline"
                  >
                    Abrir en YouTube <IconExternalLink size={10} className="shrink-0" />
                  </a>
                ) : (
                  <p className="truncate text-[10px] text-red-600">{error}</p>
                )
              ) : current?.compositor ? (
                <p className="truncate text-[10px] text-slate-400">
                  {current.compositor}
                </p>
              ) : null}
            </div>

            <RateControl
              rate={rate}
              onChange={setRate}
              id="repertoire-rate-desktop"
              className="hidden sm:flex"
            />

            <button
              type="button"
              onClick={() => setLoop((v) => !v)}
              className={`hidden rounded p-1.5 sm:inline-flex ${
                loop
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-400 hover:bg-slate-100"
              }`}
              title="Repetir playlist"
            >
              <IconRepeat size={15} />
            </button>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
              title={expanded ? "Ocultar lista" : "Ver playlist"}
            >
              {expanded ? (
                <IconChevronDown size={16} />
              ) : (
                <IconChevronUp size={16} />
              )}
            </button>
          </>
        )}

        {fullscreen && (
          <div className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto border-t border-slate-200 bg-white md:border-l md:border-t-0">
            <p className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50 px-3 py-2 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Playlist
            </p>
            {renderTrackList(false)}
          </div>
        )}
      </div>

      {!fullscreen && (
        <>
          <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-2 py-1 sm:hidden">
            <RateControl
              rate={rate}
              onChange={setRate}
              id="repertoire-rate-mobile"
            />
            <button
              type="button"
              onClick={() => setLoop((v) => !v)}
              className={`rounded p-1.5 ${
                loop ? "bg-indigo-50 text-indigo-700" : "text-slate-400"
              }`}
              title="Repetir playlist"
            >
              <IconRepeat size={15} />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="flex w-full items-center justify-center gap-1.5 border-t border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-indigo-700 hover:bg-indigo-50"
          >
            <IconMaximize size={13} />
            Pantalla completa
          </button>
        </>
      )}

      {fullscreen && (
        <button
          type="button"
          onClick={() => setFullscreen(false)}
          className="flex w-full shrink-0 items-center justify-center gap-1.5 border-t border-slate-200 bg-white px-3 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          Cerrar pantalla completa
        </button>
      )}
    </div>
  );

  return (
    <>
      {!fullscreen ? (
        <div className="h-[7.25rem] shrink-0 sm:h-[5rem]" aria-hidden />
      ) : null}
      {createPortal(chrome, document.body)}
    </>
  );
}
