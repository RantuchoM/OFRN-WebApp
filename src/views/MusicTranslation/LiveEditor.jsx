import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import "../../utils/imageUtils";
import { updateSegment } from "../../services/translationService";
import { Languages, Loader2, LayoutGrid, FileText } from "lucide-react";
import { toast } from "sonner";
import StructureEditor from "./StructureEditor";
import MusicTranslationFittingTextarea from "./MusicTranslationFittingTextarea";
import {
  compareSegmentsByPdfVisualOrder,
} from "../../utils/segmentVisualOrder";
import { splitMusicTranslationPaste } from "../../utils/musicTranslationPaste";
import {
  controlFlujoButtonLabel,
  controlFlujoInlineSuffix,
  controlFlujoNext,
  controlFlujoPdfGlyphClasses,
  controlFlujoPdfInlineSuffixClasses,
  normalizeControlFlujo,
} from "../../utils/musicTranslationFlow";
import {
  normalizeRepeticion,
  normalizeRima,
  segmentRimaFieldClasses,
} from "../../utils/musicTranslationPoetics";
import MusicTranslationSegmentContextMenu from "./MusicTranslationSegmentContextMenu";

const DEBOUNCE_MS = 500;
/** Separación en puntos PDF (72 dpi) entre caja ES y caja EN */
const PDF_BILINGUAL_GAP_PT = 12;
/** Sube la capa EN hacia el español (eje Y PDF hacia arriba = más positivo). */
const PDF_EN_NUDGE_UP_PT = 6;
const SAVE_FLASH_MS = 1000;
/** Ajuste fino del tamaño base de letra en capa PDF (A− / A+). */
const PDF_FONT_STEP_MIN = -5;
const PDF_FONT_STEP_MAX = 6;

function viewportRectForPdfBox(viewport, x, y, w, h) {
  const [x1, y1, x2, y2] = viewport.convertToViewportRectangle([
    x,
    y,
    x + w,
    y + h,
  ]);
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  return { left, top, width, height };
}

/** Rectángulo PDF para la capa EN debajo de la caja ES (eje Y PDF hacia arriba). */
function englishPdfRectBelowSpanish(seg, spanishText, showBilingual) {
  const gap = showBilingual
    ? PDF_BILINGUAL_GAP_PT +
      Math.min(28, Math.max(0, (String(spanishText).split("\n").length - 1) * 5))
    : PDF_BILINGUAL_GAP_PT;
  const enH = Math.max(seg.rect_h * (showBilingual ? 1.12 : 1), 18);
  const yEn = seg.rect_y - gap - enH + PDF_EN_NUDGE_UP_PT;
  return {
    x: seg.rect_x,
    y: yEn,
    w: seg.rect_w,
    h: enH,
  };
}

/** Extra ancho en viewport px (proporcional + mínimo) para campos sobre el PDF */
function pdfFieldViewportWidth(baseW) {
  return baseW + Math.max(8, baseW * 0.12);
}

function PdfPageLayer({
  pdf,
  pageNumber,
  scale,
  segmentsOrdered,
  spanishById,
  englishById,
  controlFlujoById,
  showEnglish,
  onSpanishChange,
  onEnglishChange,
  scheduleSaveSpanish,
  scheduleSaveEnglish,
  onCycleControlFlow,
  onPdfFieldKeyDown,
  onMusicTranslationPaste,
  focusNextSegment,
  pdfMinFontPx,
  pdfMaxFontPx,
  flashKeys,
  rimaById,
  repeticionById,
  onSegmentContextMenu,
  onSpanishSegmentFocus,
}) {
  const canvasRef = useRef(null);
  const [viewport, setViewport] = useState(null);
  const [renderErr, setRenderErr] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setRenderErr(null);
    (async () => {
      try {
        const page = await pdf.getPage(pageNumber);
        const vp = page.getViewport({ scale });
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = vp.width;
        canvas.height = vp.height;
        await page.render({ canvasContext: ctx, viewport: vp }).promise;
        if (!cancelled) setViewport(vp);
      } catch (e) {
        if (!cancelled) setRenderErr(e?.message || "Error al renderizar página");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pdf, pageNumber, scale]);

  const pageSegs = segmentsOrdered.filter((s) => s.page_number === pageNumber);

  const baseTa =
    "absolute z-10 box-border resize-none overflow-hidden break-words rounded-sm border p-0.5 transition-colors duration-300 focus:z-[35] focus:outline-none focus:ring-1 ";

  return (
    <div className="mb-8 flex flex-col items-center">
      <span className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400">
        Página {pageNumber}
      </span>
      <div
        className="relative shadow-xl rounded-sm ring-1 ring-slate-700/30 dark:ring-slate-600/40 bg-white dark:bg-slate-900"
        style={
          viewport
            ? { width: viewport.width, height: viewport.height }
            : { minWidth: 200, minHeight: 280 }
        }
      >
        <canvas ref={canvasRef} className="block rounded-sm" />
        {renderErr && (
          <div className="absolute inset-0 flex items-center justify-center bg-rose-950/80 text-rose-200 text-xs p-4 text-center">
            {renderErr}
          </div>
        )}
        {viewport &&
          pageSegs.map((seg) => {
            const spVal = spanishById[seg.id] ?? seg.segment_spanish ?? "";
            const { left, top, width, height } = viewportRectForPdfBox(
              viewport,
              seg.rect_x,
              seg.rect_y,
              seg.rect_w,
              seg.rect_h,
            );
            const enRect = englishPdfRectBelowSpanish(
              seg,
              spVal,
              showEnglish,
            );
            const enBox = viewportRectForPdfBox(
              viewport,
              enRect.x,
              enRect.y,
              enRect.w,
              enRect.h,
            );
            const tw = pdfFieldViewportWidth(width);
            const th = Math.max(height, 24);
            const enTw = pdfFieldViewportWidth(enBox.width);
            const enTh = Math.max(enBox.height, 22);
            const flow = normalizeControlFlujo(controlFlujoById[seg.id]);
            const inlineSf = controlFlujoInlineSuffix(flow);
            const wEs = Math.max(tw, 32);
            const rimaTint = segmentRimaFieldClasses(rimaById?.[seg.id]);
            const repCode = normalizeRepeticion(repeticionById?.[seg.id]);
            const rimaBorder = rimaTint
              ? `${rimaTint} border`
              : "border-transparent bg-transparent hover:border-slate-400/50 dark:border-transparent dark:hover:border-slate-600/45";
            return (
              <React.Fragment key={seg.id}>
                {repCode && (
                  <span
                    className="pointer-events-none absolute z-[28] rounded-br bg-slate-800 px-1 py-px text-[10px] font-bold leading-none text-white shadow-sm dark:bg-slate-700"
                    style={{ left, top }}
                  >
                    {repCode}
                  </span>
                )}
                <MusicTranslationFittingTextarea
                  id={`music-tr-pdf-es-${seg.id}`}
                  tabIndex={0}
                  data-mt-pdf-lang="es"
                  fitHeightOnly
                  minFontPx={pdfMinFontPx}
                  maxFontPx={pdfMaxFontPx}
                  segmentLang="es"
                  segmentId={seg.id}
                  focusNextSegment={focusNextSegment}
                  aria-label={`Traducción ES: ${seg.segment_name}`}
                  value={spVal}
                  onFocus={() => onSpanishSegmentFocus?.(seg.id)}
                  onChange={(e) => {
                    onSpanishChange(seg.id, e.target.value);
                    scheduleSaveSpanish(seg.id, e.target.value);
                  }}
                  onKeyDown={(e) =>
                    onPdfFieldKeyDown(e, "es", seg.id)
                  }
                  onPaste={(e) =>
                    onMusicTranslationPaste?.(e, "es", seg.id)
                  }
                  onContextMenu={(e) => {
                    e.preventDefault();
                    onSegmentContextMenu?.(e, seg.id);
                  }}
                  spellCheck={false}
                  className={`${baseTa} ${rimaBorder} text-slate-900 dark:text-slate-100 placeholder:text-slate-500/60 focus:border-violet-500/60 focus:bg-transparent focus:ring-violet-500/40 ${
                    flashKeys.has(`sp-${seg.id}`)
                      ? "ring-2 ring-green-500/50 dark:ring-green-400/45"
                      : ""
                  } ${
                    flashKeys.has(`box-${seg.id}`)
                      ? "ring-2 ring-green-500/40 dark:ring-green-400/35"
                      : ""
                  }`}
                  style={{
                    left,
                    top,
                    width: wEs,
                    height: th,
                  }}
                />
                {inlineSf && (
                  <span
                    className={`pointer-events-none absolute z-[25] select-none rounded px-0.5 text-[10px] font-bold leading-none ${controlFlujoPdfInlineSuffixClasses(flow)}`}
                    style={{
                      left: left + wEs - 17,
                      top: top + th - 14,
                    }}
                  >
                    {inlineSf}
                  </span>
                )}
                <button
                  type="button"
                  tabIndex={-1}
                  title="Ciclar control de flujo (· ↵ ¶ | “)"
                  aria-label={`Control de flujo tras ${seg.segment_name}`}
                  onClick={() => onCycleControlFlow(seg.id)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onSegmentContextMenu?.(e, seg.id);
                  }}
                  className={controlFlujoPdfGlyphClasses(flow)}
                  style={{
                    left: left + wEs - 26,
                    top: top + th - 18,
                  }}
                >
                  {controlFlujoButtonLabel(flow)}
                </button>
                {showEnglish && (
                  <MusicTranslationFittingTextarea
                    id={`music-tr-pdf-en-${seg.id}`}
                    tabIndex={0}
                    data-mt-pdf-lang="en"
                    fitHeightOnly
                    minFontPx={pdfMinFontPx}
                    maxFontPx={pdfMaxFontPx}
                    segmentLang="en"
                    segmentId={seg.id}
                    focusNextSegment={focusNextSegment}
                    aria-label={`Original EN: ${seg.segment_name}`}
                    value={
                      englishById[seg.id] ?? seg.segment_english ?? ""
                    }
                    onChange={(e) => {
                      onEnglishChange(seg.id, e.target.value);
                      scheduleSaveEnglish(seg.id, e.target.value);
                    }}
                    onKeyDown={(e) =>
                      onPdfFieldKeyDown(e, "en", seg.id)
                    }
                    onPaste={(e) =>
                      onMusicTranslationPaste?.(e, "en", seg.id)
                    }
                    onContextMenu={(e) => {
                      e.preventDefault();
                      onSegmentContextMenu?.(e, seg.id);
                    }}
                    spellCheck={false}
                    className={`${baseTa} ${
                      rimaTint
                        ? `${rimaTint} border italic`
                        : "border-transparent bg-transparent italic hover:border-slate-400/45 dark:border-transparent dark:hover:border-slate-600/45 dark:bg-transparent"
                    } text-slate-600 shadow-sm dark:text-slate-300 focus:border-violet-400/60 focus:bg-transparent focus:ring-violet-400/30 ${
                      flashKeys.has(`en-${seg.id}`)
                        ? "ring-2 ring-green-500/50 dark:ring-green-400/45"
                        : ""
                    } ${
                      flashKeys.has(`box-${seg.id}`)
                        ? "ring-2 ring-green-500/40 dark:ring-green-400/35"
                        : ""
                    }`}
                    style={{
                      left: enBox.left,
                      top: enBox.top,
                      width: Math.max(enTw, 32),
                      height: enTh,
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
      </div>
    </div>
  );
}

/**
 * @param {object} props
 * @param {string} props.pdfUrl
 * @param {object[]} props.segments
 * @param {() => Promise<void>} [props.onSegmentsRefresh]
 */
export default function LiveEditor({
  pdfUrl,
  segments,
  onSegmentsRefresh,
  onSpanishDraftChange,
  onSpanishSegmentFocus,
}) {
  const [pdf, setPdf] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [scale, setScale] = useState(1.25);
  const [pdfFontDelta, setPdfFontDelta] = useState(0);
  const [editorMode, setEditorMode] = useState("pdf");
  const [showEnglish, setShowEnglish] = useState(true);

  const [spanishById, setSpanishById] = useState({});
  const [englishById, setEnglishById] = useState({});
  const [controlFlujoById, setControlFlujoById] = useState({});
  const controlFlujoRef = useRef(controlFlujoById);
  controlFlujoRef.current = controlFlujoById;

  const [rimaById, setRimaById] = useState({});
  const [repeticionById, setRepeticionById] = useState({});
  const [poeticsMenu, setPoeticsMenu] = useState(null);

  const [flashKeys, setFlashKeys] = useState(() => new Set());
  const flashTimersRef = useRef(new Map());
  const debouncersRef = useRef(new Map());

  const segmentsOrdered = useMemo(
    () => [...segments].sort(compareSegmentsByPdfVisualOrder),
    [segments],
  );

  const pdfMaxFontPx = useMemo(
    () => Math.min(26, Math.max(9, 14 + pdfFontDelta)),
    [pdfFontDelta],
  );
  const pdfMinFontPx = useMemo(
    () => Math.max(6, pdfMaxFontPx - 6),
    [pdfMaxFontPx],
  );

  useEffect(() => {
    const sp = {};
    const en = {};
    const cf = {};
    const rm = {};
    const rp = {};
    for (const s of segments) {
      sp[s.id] = s.segment_spanish ?? "";
      en[s.id] = s.segment_english ?? "";
      cf[s.id] = normalizeControlFlujo(s.control_flujo);
      rm[s.id] = normalizeRima(s.rima);
      rp[s.id] = normalizeRepeticion(s.repeticion);
    }
    setSpanishById(sp);
    setEnglishById(en);
    setControlFlujoById(cf);
    setRimaById(rm);
    setRepeticionById(rp);
  }, [segments]);

  const triggerFlash = useCallback((key) => {
    setFlashKeys((prev) => new Set(prev).add(key));
    const old = flashTimersRef.current.get(key);
    if (old) clearTimeout(old);
    const t = setTimeout(() => {
      setFlashKeys((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
      flashTimersRef.current.delete(key);
    }, SAVE_FLASH_MS);
    flashTimersRef.current.set(key, t);
  }, []);

  useEffect(() => {
    return () => {
      for (const t of flashTimersRef.current.values()) clearTimeout(t);
      flashTimersRef.current.clear();
      for (const t of debouncersRef.current.values()) clearTimeout(t);
      debouncersRef.current.clear();
    };
  }, []);

  const runDebounced = useCallback(
    (debounceKey, fn) => {
      const prev = debouncersRef.current.get(debounceKey);
      if (prev) clearTimeout(prev);
      const t = setTimeout(() => {
        debouncersRef.current.delete(debounceKey);
        fn();
      }, DEBOUNCE_MS);
      debouncersRef.current.set(debounceKey, t);
    },
    [],
  );

  const scheduleSaveSpanish = useCallback(
    (segmentId, text) => {
      const key = `${segmentId}:sp`;
      runDebounced(key, async () => {
        try {
          await updateSegment(segmentId, { segment_spanish: text });
          triggerFlash(`sp-${segmentId}`);
        } catch (e) {
          console.error(e);
          toast.error(e?.message || "No se pudo guardar la traducción.");
        }
      });
    },
    [runDebounced, triggerFlash],
  );

  const scheduleSaveEnglish = useCallback(
    (segmentId, text) => {
      const key = `${segmentId}:en`;
      runDebounced(key, async () => {
        try {
          await updateSegment(segmentId, { segment_english: text });
          triggerFlash(`en-${segmentId}`);
        } catch (e) {
          console.error(e);
          toast.error(e?.message || "No se pudo guardar el texto en inglés.");
        }
      });
    },
    [runDebounced, triggerFlash],
  );

  const onSpanishChange = useCallback(
    (id, text) => {
      setSpanishById((prev) => ({ ...prev, [id]: text }));
      onSpanishDraftChange?.(id, text);
    },
    [onSpanishDraftChange],
  );

  const onEnglishChange = useCallback((id, text) => {
    setEnglishById((prev) => ({ ...prev, [id]: text }));
  }, []);

  const openSegmentPoeticsMenu = useCallback((e, segmentId) => {
    e.preventDefault();
    e.stopPropagation();
    setPoeticsMenu({
      x: e.clientX,
      y: e.clientY,
      segmentId,
    });
  }, []);

  const closePoeticsMenu = useCallback(() => setPoeticsMenu(null), []);

  const handleSaveRima = useCallback(
    async (segmentId, value) => {
      const normalized = value == null ? null : normalizeRima(value);
      setRimaById((prev) => ({ ...prev, [segmentId]: normalized }));
      try {
        await updateSegment(segmentId, { rima: normalized });
        triggerFlash(`box-${segmentId}`);
        await onSegmentsRefresh?.();
      } catch (e) {
        console.error(e);
        toast.error(e?.message || "No se pudo guardar la rima.");
        await onSegmentsRefresh?.();
      }
    },
    [onSegmentsRefresh, triggerFlash],
  );

  const handleSaveRepeticion = useCallback(
    async (segmentId, value) => {
      const normalized = value == null ? null : normalizeRepeticion(value);
      setRepeticionById((prev) => ({ ...prev, [segmentId]: normalized }));
      try {
        await updateSegment(segmentId, { repeticion: normalized });
        triggerFlash(`box-${segmentId}`);
        await onSegmentsRefresh?.();
      } catch (e) {
        console.error(e);
        toast.error(e?.message || "No se pudo guardar la repetición.");
        await onSegmentsRefresh?.();
      }
    },
    [onSegmentsRefresh, triggerFlash],
  );

  const handleCycleControlFlow = useCallback(
    async (segmentId) => {
      const cur = normalizeControlFlujo(controlFlujoRef.current[segmentId]);
      const nextValue = controlFlujoNext(cur);
      setControlFlujoById((prev) => ({ ...prev, [segmentId]: nextValue }));
      try {
        await updateSegment(segmentId, { control_flujo: nextValue });
        triggerFlash(`box-${segmentId}`);
        await onSegmentsRefresh?.();
      } catch (e) {
        console.error(e);
        toast.error(
          e?.message || "No se pudo guardar el control de flujo.",
        );
        await onSegmentsRefresh?.();
      }
    },
    [onSegmentsRefresh, triggerFlash],
  );

  useEffect(() => {
    let cancelled = false;
    setLoadError(null);
    setPdf(null);
    const task = pdfjs.getDocument({ url: pdfUrl, withCredentials: false });
    task.promise
      .then((doc) => {
        if (!cancelled) setPdf(doc);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e?.message || "No se pudo cargar el PDF");
      });
    return () => {
      cancelled = true;
      task.destroy?.();
    };
  }, [pdfUrl]);

  const numPages = pdf?.numPages ?? 0;
  const pages = useMemo(
    () => Array.from({ length: numPages }, (_, i) => i + 1),
    [numPages],
  );

  /** Orden visual global: Tab en ES solo recorre ES; Tab en EN solo EN. */
  const pdfEsFocusOrderIds = useMemo(
    () => segmentsOrdered.map((s) => s.id),
    [segmentsOrdered],
  );
  const pdfEnFocusOrderIds = useMemo(
    () => (showEnglish ? segmentsOrdered.map((s) => s.id) : []),
    [segmentsOrdered, showEnglish],
  );

  const segmentIdOrder = useMemo(
    () => segmentsOrdered.map((s) => s.id),
    [segmentsOrdered],
  );

  const focusNextPdfSegment = useCallback(
    (lang, segId) => {
      if (lang === "en" && !showEnglish) return;
      const idx = segmentIdOrder.indexOf(segId);
      if (idx < 0 || idx + 1 >= segmentIdOrder.length) return;
      const nextId = segmentIdOrder[idx + 1];
      requestAnimationFrame(() => {
        document.getElementById(`music-tr-pdf-${lang}-${nextId}`)?.focus();
      });
    },
    [segmentIdOrder, showEnglish],
  );

  const focusNextStructureSegment = useCallback(
    (lang, segId) => {
      const idx = segmentIdOrder.indexOf(segId);
      if (idx < 0 || idx + 1 >= segmentIdOrder.length) return;
      const nextId = segmentIdOrder[idx + 1];
      requestAnimationFrame(() => {
        document.getElementById(`music-tr-structure-${lang}-${nextId}`)?.focus();
      });
    },
    [segmentIdOrder],
  );

  const handleMusicTranslationPaste = useCallback(
    (e, lang, segId) => {
      const raw = e.clipboardData?.getData("text/plain");
      if (raw == null || raw === "") return;

      const fragments = splitMusicTranslationPaste(raw);

      const flowBreakDashRe = /[-\u2010\u2011\u2013\u2014\u2015\u2212\u00AD]/u;
      const dashTokenIdx = fragments.findIndex((t) => {
        const last = String(t ?? "").slice(-1);
        return flowBreakDashRe.test(last);
      });

      // Si no generó “cadena” (<=1 fragmento), mantenemos el paste normal,
      // excepto cuando incluye guion alto: ahí debe saltar al siguiente segmento.
      if (fragments.length <= 1) {
        if (dashTokenIdx === -1) return;

        e.preventDefault();
        const start = segmentIdOrder.indexOf(segId);
        if (start < 0) return;

        const onlyText = fragments[0] ?? "";
        if (lang === "es") {
          onSpanishChange(segId, onlyText);
          scheduleSaveSpanish(segId, onlyText);
        } else {
          onEnglishChange(segId, onlyText);
          scheduleSaveEnglish(segId, onlyText);
        }

        const focusOffset = dashTokenIdx + 1;
        const nextId = segmentIdOrder[start + focusOffset];
        if (nextId) {
          requestAnimationFrame(() => {
            const id =
              editorMode === "pdf"
                ? `music-tr-pdf-${lang}-${nextId}`
                : `music-tr-structure-${lang}-${nextId}`;
            document.getElementById(id)?.focus();
          });
        }
        return;
      }

      e.preventDefault();
      const start = segmentIdOrder.indexOf(segId);
      if (start < 0) return;

      const room = segmentIdOrder.length - start;
      if (fragments.length > room) {
        toast.message(
          `Solo caben ${room} segmento(s) desde aquí; se omitieron ${fragments.length - room} fragmento(s).`,
        );
      }

      for (
        let i = 0;
        i < fragments.length && start + i < segmentIdOrder.length;
        i++
      ) {
        const id = segmentIdOrder[start + i];
        const text = fragments[i];
        if (lang === "es") {
          onSpanishChange(id, text);
          scheduleSaveSpanish(id, text);
        } else {
          onEnglishChange(id, text);
          scheduleSaveEnglish(id, text);
        }
      }

      // Si el pegado incluye guion alto, saltamos al segmento que contiene
      // el texto posterior al guion.
      if (dashTokenIdx !== -1) {
        const focusOffset = dashTokenIdx + 1;
        const nextId = segmentIdOrder[start + focusOffset];
        if (nextId) {
          requestAnimationFrame(() => {
            const id =
              editorMode === "pdf"
                ? `music-tr-pdf-${lang}-${nextId}`
                : `music-tr-structure-${lang}-${nextId}`;
            document.getElementById(id)?.focus();
          });
        }
      }
    },
    [
      segmentIdOrder,
      onSpanishChange,
      onEnglishChange,
      scheduleSaveSpanish,
      scheduleSaveEnglish,
      editorMode,
    ],
  );

  const handlePdfFieldKeyDown = useCallback(
    (e, lang, segId) => {
      if (e.key === "Tab") {
        const list =
          lang === "es" ? pdfEsFocusOrderIds : pdfEnFocusOrderIds;
        if (!list.length) return;
        e.preventDefault();
        const idx = list.indexOf(segId);
        if (idx < 0) return;
        const n = list.length;
        const nextIdx = (idx + (e.shiftKey ? -1 : 1) + n) % n;
        const nextId = list[nextIdx];
        requestAnimationFrame(() => {
          document
            .getElementById(`music-tr-pdf-${lang}-${nextId}`)
            ?.focus();
        });
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleCycleControlFlow(segId);
      }
    },
    [
      pdfEsFocusOrderIds,
      pdfEnFocusOrderIds,
      handleCycleControlFlow,
    ],
  );

  if (loadError) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-rose-500/30 bg-rose-950/20 p-8 text-rose-200">
        {loadError}
      </div>
    );
  }

  if (!pdf) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <span className="text-sm font-medium">Cargando documento…</span>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-slate-100/80 dark:bg-slate-950/50">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 dark:border-slate-800 px-4 py-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <Languages className="h-4 w-4 text-violet-500" />
            <span className="text-sm font-semibold leading-snug">
              Autoguardado ~{DEBOUNCE_MS}ms · Clic derecho en segmento = rima / repetición · Foco =
              texto seleccionado · Espacio o guión alto → siguiente campo (Shift+ = no saltar) · Pegar
              varios: solo espacio/tab/saltos · // ignorado · Letra se reduce si no cabe
            </span>
          </div>
          <div className="flex rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
            <button
              type="button"
              onClick={() => setEditorMode("pdf")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                editorMode === "pdf"
                  ? "bg-violet-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => setEditorMode("structure")}
              className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold uppercase tracking-wide ${
                editorMode === "structure"
                  ? "bg-violet-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              Estructura
            </button>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
            <input
              type="checkbox"
              checked={showEnglish}
              onChange={(e) => setShowEnglish(e.target.checked)}
              className="accent-violet-600"
            />
            Mostrar inglés en PDF
          </label>
        </div>
        {editorMode === "pdf" && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-700 dark:bg-slate-900">
              <span className="hidden pl-1.5 text-[11px] font-bold uppercase text-slate-500 sm:inline dark:text-slate-400">
                Letra PDF
              </span>
              <button
                type="button"
                disabled={pdfFontDelta <= PDF_FONT_STEP_MIN}
                onClick={() => setPdfFontDelta((d) => d - 1)}
                className="rounded-md px-2 py-1 text-sm font-bold tabular-nums text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-35 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Reducir tamaño de letra en vista PDF"
              >
                A−
              </button>
              <button
                type="button"
                disabled={pdfFontDelta >= PDF_FONT_STEP_MAX}
                onClick={() => setPdfFontDelta((d) => d + 1)}
                className="rounded-md px-2 py-1 text-sm font-bold tabular-nums text-slate-700 hover:bg-slate-100 disabled:pointer-events-none disabled:opacity-35 dark:text-slate-200 dark:hover:bg-slate-800"
                aria-label="Aumentar tamaño de letra en vista PDF"
              >
                A+
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Zoom
              <input
                type="range"
                min={0.85}
                max={2}
                step={0.05}
                value={scale}
                onChange={(e) => setScale(Number(e.target.value))}
                className="w-28 accent-violet-600"
              />
            </label>
          </div>
        )}
      </div>

      {editorMode === "structure" ? (
        <StructureEditor
          segmentsOrdered={segmentsOrdered}
          spanishById={spanishById}
          englishById={englishById}
          controlFlujoById={controlFlujoById}
          rimaById={rimaById}
          repeticionById={repeticionById}
          onSpanishChange={onSpanishChange}
          onEnglishChange={onEnglishChange}
          scheduleSaveSpanish={scheduleSaveSpanish}
          scheduleSaveEnglish={scheduleSaveEnglish}
          onCycleControlFlow={handleCycleControlFlow}
          onMusicTranslationPaste={handleMusicTranslationPaste}
          focusNextSegment={focusNextStructureSegment}
          flashKeys={flashKeys}
          onSegmentContextMenu={openSegmentPoeticsMenu}
          onSpanishSegmentFocus={onSpanishSegmentFocus}
        />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-4 py-6">
          <div className="mx-auto flex max-w-[100%] flex-col items-center pb-20">
            {pages.map((p) => (
              <PdfPageLayer
                key={`${pdfUrl}-${p}-${scale}-${showEnglish}`}
                pdf={pdf}
                pageNumber={p}
                scale={scale}
                segmentsOrdered={segmentsOrdered}
                spanishById={spanishById}
                englishById={englishById}
                controlFlujoById={controlFlujoById}
                showEnglish={showEnglish}
                onSpanishChange={onSpanishChange}
                onEnglishChange={onEnglishChange}
                scheduleSaveSpanish={scheduleSaveSpanish}
                scheduleSaveEnglish={scheduleSaveEnglish}
                onCycleControlFlow={handleCycleControlFlow}
                onPdfFieldKeyDown={handlePdfFieldKeyDown}
                onMusicTranslationPaste={handleMusicTranslationPaste}
                focusNextSegment={focusNextPdfSegment}
                pdfMinFontPx={pdfMinFontPx}
                pdfMaxFontPx={pdfMaxFontPx}
                flashKeys={flashKeys}
                rimaById={rimaById}
                repeticionById={repeticionById}
                onSegmentContextMenu={openSegmentPoeticsMenu}
                onSpanishSegmentFocus={onSpanishSegmentFocus}
              />
            ))}
          </div>
        </div>
      )}

      <MusicTranslationSegmentContextMenu
        open={Boolean(poeticsMenu)}
        x={poeticsMenu?.x ?? 0}
        y={poeticsMenu?.y ?? 0}
        segmentName={
          poeticsMenu
            ? segmentsOrdered.find((s) => s.id === poeticsMenu.segmentId)
                ?.segment_name
            : ""
        }
        rimaCurrent={poeticsMenu ? rimaById[poeticsMenu.segmentId] : null}
        repeticionCurrent={
          poeticsMenu ? repeticionById[poeticsMenu.segmentId] : null
        }
        onClose={closePoeticsMenu}
        onSetRima={(v) => {
          if (poeticsMenu) void handleSaveRima(poeticsMenu.segmentId, v);
        }}
        onSetRepeticion={(v) => {
          if (poeticsMenu) void handleSaveRepeticion(poeticsMenu.segmentId, v);
        }}
      />
    </div>
  );
}
