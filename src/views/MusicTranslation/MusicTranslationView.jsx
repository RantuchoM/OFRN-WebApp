import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Music,
  Plus,
  Download,
  Save,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { extractAcroformTextFields } from "../../utils/pdfFieldExtractor";
import { sortSegmentsByPdfVisualOrder } from "../../utils/segmentVisualOrder";
import {
  listPartituras,
  getPartitura,
  getSegmentsForPartitura,
  createPartituraWithSegments,
  uploadTranslationPdf,
  buildTranslatedPdfBytes,
} from "../../services/translationService";
import {
  controlFlujoBreaksLineAfter,
  controlFlujoInlineSuffix,
  controlFlujoIsParagraph,
  formatStanzaHeading,
  groupSegmentsByStanzaPrefix,
  segmentStanzaPrefix,
  normalizeControlFlujo,
} from "../../utils/musicTranslationFlow";
import LiveEditor from "./LiveEditor";

const HIGH_DASH_RE =
  /[-\u2010\u2011\u2013\u2014\u2015\u2212\u00AD]/u;
const LOW_DASH_CHAR = "_";
const DOT_CHAR = "·";
const NBSP_CHAR = "\u00A0";
const STAR_CHAR = "*";

function normalizeNbspForPdf(text) {
  return String(text ?? "").replaceAll(DOT_CHAR, NBSP_CHAR);
}

function buildPreviewTranslationBlocks(
  segmentsOrdered,
  mode,
  activeSpanishEditingSegmentId,
) {
  // Normalizamos NBSP real a su representación visual `·` para que
  // el editor/sidebar previsualicen siempre de forma consistente.
  const pickText = (seg) =>
    String(seg?.segment_spanish ?? "").replaceAll(NBSP_CHAR, DOT_CHAR);

  const transform = (text) => {
    if (mode === "with") return text;
    // “Texto sin guiones”: guion alto = nada; guion bajo = separador de palabras.
    return String(text)
      .replace(HIGH_DASH_RE, "")
      // El "*" que usamos como reemplazo del guion alto
      // se elimina (no se muestra) para unir el segmento previo con el siguiente.
      .replaceAll(STAR_CHAR, "")
      .replaceAll(LOW_DASH_CHAR, " ")
      // “sin guiones” también convierte el NBSP (representado como ·)
      // en un espacio común.
      .replaceAll(DOT_CHAR, " ");
  };

  const getSeparatorFromPrev = (prevRawText) => {
    const t = String(prevRawText ?? "").replace(/\s+$/u, "");
    if (!t) return "";
    const last = t[t.length - 1];
    // Si el segmento previo termina en una “espacio no rompible” representada,
    // no agregamos un espacio extra al concatenar.
    if (last === DOT_CHAR) return "";
    if (last === NBSP_CHAR) return "";
    if (last === STAR_CHAR) return "";
    if (HIGH_DASH_RE.test(last)) return "";
    if (last === LOW_DASH_CHAR) return "";
    return " ";
  };

  const buildForSegments = (segments) => {
    /** @type {{text: string; isActive: boolean; key: string}[]} */
    const lines = [];
    let lineAcc = "";
    let lineHasActive = false;

    const pushLine = () => {
      lines.push({
        text: lineAcc,
        isActive: lineHasActive,
        key: `l-${lines.length}`,
      });
      lineAcc = "";
      lineHasActive = false;
    };

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const flow = normalizeControlFlujo(seg?.control_flujo);
      const rawText = pickText(seg);
      const text = transform(rawText);

      if (i > 0) {
        const prevSeg = segments[i - 1];
        const prevFlow = normalizeControlFlujo(prevSeg?.control_flujo);
        // Si el segmento actual está vacío (sin traducir aún), evitamos
        // insertar separadores extra para que las líneas "en blanco" no queden
        // con basura (espacios).
        if (text && !controlFlujoBreaksLineAfter(prevFlow)) {
          lineAcc += getSeparatorFromPrev(pickText(prevSeg));
        }
      }

      // Si este segmento es el que estamos editando, la línea actual se marca.
      if (activeSpanishEditingSegmentId && seg?.id === activeSpanishEditingSegmentId) {
        lineHasActive = true;
      }

      lineAcc += text;

      // Si el segmento no tiene traducción (vacío), evitamos “ensuciar” el texto
      // con símbolos inline (semifrase/cesura) para mantener líneas en blanco.
      if (rawText) {
        const inlineSuffix = controlFlujoInlineSuffix(flow);
        if (inlineSuffix) lineAcc += inlineSuffix;
      }

      if (controlFlujoBreaksLineAfter(flow)) {
        pushLine();
        if (controlFlujoIsParagraph(flow)) {
          lines.push({
            text: "",
            isActive: false,
            key: `l-${lines.length}-blank`,
          });
        }
      }
    }

    // Empujar la última línea (aunque sea vacía, para conservar estructura).
    if (segments.length) {
      lines.push({
        text: lineAcc,
        isActive: lineHasActive,
        key: `l-${lines.length}-tail`,
      });
    }

    return lines;
  };

  const stanzaGroups = groupSegmentsByStanzaPrefix(segmentsOrdered);
  return stanzaGroups.map((group, idx) => ({
    key: `${group.prefix || "—"}-${idx}`,
    heading: formatStanzaHeading(group.prefix),
    prefix: group.prefix,
    lines: buildForSegments(group.segments),
  }));
}

function PdfPreviewModal({ open, onClose, blobUrl, busy }) {
  if (!open) return null;

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div
        className="flex h-[80vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Eye className="h-5 w-5 text-violet-400" />
            Partitura previsualización
          </h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-60"
            disabled={busy}
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-950">
          {busy && (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
            </div>
          )}
          {!busy && blobUrl && (
            <iframe
              title="PDF previsualización"
              src={blobUrl}
              className="h-full w-full"
            />
          )}
          {!busy && !blobUrl && (
            <div className="flex h-full items-center justify-center p-6 text-center text-slate-300">
              No se pudo generar el PDF.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function NewWorkModal({ open, onClose, userId, onCreated }) {
  const [tituloEn, setTituloEn] = useState("");
  const [tituloEs, setTituloEs] = useState("");
  const [fechaLimite, setFechaLimite] = useState("");
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setTituloEn("");
      setTituloEs("");
      setFechaLimite("");
      setFile(null);
      setBusy(false);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId) {
      toast.error("No hay usuario logueado.");
      return;
    }
    if (!tituloEn.trim()) {
      toast.error("El título (inglés) es obligatorio.");
      return;
    }
    if (!file) {
      toast.error("Seleccioná un PDF con AcroForm.");
      return;
    }

    setBusy(true);
    try {
      const buf = await file.arrayBuffer();
      const extracted = await extractAcroformTextFields(buf);
      if (!extracted.length) {
        toast.error(
          "No se detectaron campos de texto (PDFTextField). Verificá que el PDF use AcroForms.",
        );
        setBusy(false);
        return;
      }

      const { publicUrl } = await uploadTranslationPdf(userId, file);

      const segments = extracted.map((row) => ({
        ...row,
        segment_spanish: null,
      }));

      const id = await createPartituraWithSegments(
        {
          titulo_en: tituloEn.trim(),
          titulo_es: tituloEs.trim() || null,
          fecha_limite: fechaLimite || null,
          pdf_url: publicUrl,
          created_by: userId,
        },
        segments,
      );

      toast.success("Obra creada y campos indexados.");
      onCreated?.(id);
      onClose();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Error al crear la obra.");
    } finally {
      setBusy(false);
    }
  };

  const modal = (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-2xl border border-slate-700/80 bg-slate-900 text-slate-100 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mt-new-title"
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <h2
            id="mt-new-title"
            className="flex items-center gap-2 text-lg font-bold text-white"
          >
            <Music className="h-5 w-5 text-violet-400" />
            Cargar nueva obra
          </h2>
          <button
            type="button"
            onClick={() => !busy && onClose()}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Título (EN) *
            </label>
            <input
              value={tituloEn}
              onChange={(e) => setTituloEn(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Song title"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Título (ES)
            </label>
            <input
              value={tituloEs}
              onChange={(e) => setTituloEs(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder:text-slate-600 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              placeholder="Título en español"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              Fecha límite
            </label>
            <input
              type="date"
              value={fechaLimite}
              onChange={(e) => setFechaLimite(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-400">
              PDF (AcroForm) *
            </label>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="w-full text-sm text-slate-300 file:mr-3 file:rounded-lg file:border-0 file:bg-violet-600 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-white hover:file:bg-violet-500"
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
            <button
              type="button"
              disabled={busy}
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-400 hover:bg-slate-800 hover:text-white disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-bold text-white shadow-lg shadow-violet-900/40 hover:bg-violet-500 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Crear e indexar
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/** Vista principal del módulo (CRUD vía `translationService` + cliente en `supabase.js`). */
export default function MusicTranslationView() {
  const { userId } = useAuth();
  const [items, setItems] = useState([]);
  const [loadingList, setLoadingList] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [segments, setSegments] = useState([]);
  const [selectedRow, setSelectedRow] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [spanishDraftById, setSpanishDraftById] = useState({});
  const [activeSpanishEditingSegmentId, setActiveSpanishEditingSegmentId] = useState(
    null,
  );
  const [previewMenuOpen, setPreviewMenuOpen] = useState(false);
  const previewMenuRef = useRef(null);
  const [previewSidebarMode, setPreviewSidebarMode] = useState(null); // 'with' | 'without' | null
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [pdfPreviewBusy, setPdfPreviewBusy] = useState(false);
  const [pdfPreviewBlobUrl, setPdfPreviewBlobUrl] = useState(null);
  const [previewSidebarWidthPx, setPreviewSidebarWidthPx] = useState(() => {
    try {
      const saved = Number(
        localStorage.getItem("mt_preview_sidebar_width_px") || "",
      );
      if (Number.isFinite(saved) && saved >= 0) return saved;
    } catch {
      // ignore
    }
    if (typeof window !== "undefined" && window.innerWidth > 0) {
      return Math.round(window.innerWidth * 0.2);
    }
    return 420;
  });
  const previewResizeAreaRef = useRef(null);
  const previewResizingRef = useRef(false);
  const previewResizeStartXRef = useRef(0);
  const previewResizeStartWidthRef = useRef(820);
  const previewSidebarWidthPxLatestRef = useRef(previewSidebarWidthPx);

  const previewSidebarScrollRef = useRef(null);

  const handleSpanishSegmentFocus = useCallback((segmentId) => {
    setActiveSpanishEditingSegmentId(segmentId);
  }, []);

  const segmentsOrdered = useMemo(
    () => sortSegmentsByPdfVisualOrder(segments),
    [segments],
  );

  const segmentsOrderedForPreview = useMemo(() => {
    if (!segmentsOrdered.length) return segmentsOrdered;
    return segmentsOrdered.map((seg) => ({
      ...seg,
      // Override en vivo desde el editor (ES).
      segment_spanish:
        spanishDraftById[seg.id] ?? seg.segment_spanish ?? null,
    }));
  }, [segmentsOrdered, spanishDraftById]);

  const previewBlocksWith = useMemo(() => {
    return buildPreviewTranslationBlocks(
      segmentsOrderedForPreview,
      "with",
      activeSpanishEditingSegmentId,
    );
  }, [segmentsOrderedForPreview, activeSpanishEditingSegmentId]);

  const previewBlocksWithout = useMemo(() => {
    return buildPreviewTranslationBlocks(
      segmentsOrderedForPreview,
      "without",
      activeSpanishEditingSegmentId,
    );
  }, [segmentsOrderedForPreview, activeSpanishEditingSegmentId]);

  const activePreviewBlocks =
    previewSidebarMode === "with" ? previewBlocksWith : previewBlocksWithout;

  const activeSpanishEditingPrefix = useMemo(() => {
    if (!activeSpanishEditingSegmentId) return null;
    const seg = segmentsOrdered.find(
      (s) => s.id === activeSpanishEditingSegmentId,
    );
    if (!seg?.segment_name) return null;
    return segmentStanzaPrefix(seg.segment_name);
  }, [activeSpanishEditingSegmentId, segmentsOrdered]);

  const activePreviewBlockKey = useMemo(() => {
    if (!activeSpanishEditingPrefix) return null;
    const block = activePreviewBlocks.find(
      (b) => b.prefix === activeSpanishEditingPrefix,
    );
    return block?.key ?? null;
  }, [activePreviewBlocks, activeSpanishEditingPrefix]);

  useEffect(() => {
    if (!activePreviewBlockKey) return;
    const el = document.getElementById(`mt-preview-block-${activePreviewBlockKey}`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [activePreviewBlockKey]);

  useEffect(() => {
    if (!previewMenuOpen) return;
    const onDown = (e) => {
      if (previewMenuRef.current?.contains(e.target)) return;
      setPreviewMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [previewMenuOpen]);

  useEffect(() => {
    previewSidebarWidthPxLatestRef.current = previewSidebarWidthPx;
  }, [previewSidebarWidthPx]);

  useEffect(() => {
    // Reset al cambiar de obra para evitar que drafts anteriores “contaminen” el preview.
    setSpanishDraftById({});
  }, [selectedId]);

  const startPreviewSidebarResize = useCallback(
    (e) => {
      if (!previewSidebarMode) return;
      if (e.button !== 0) return;
      e.preventDefault();

      const startX = e.clientX;
      previewResizingRef.current = true;
      previewResizeStartXRef.current = startX;
      previewResizeStartWidthRef.current = previewSidebarWidthPx;

      document.body.style.cursor = "col-resize";

      const onMove = (ev) => {
        if (!previewResizingRef.current) return;
        const container = previewResizeAreaRef.current;
        const containerW = container
          ? container.getBoundingClientRect().width
          : window.innerWidth;

        // Aseguramos que el editor conserve un mínimo espacio, pero
        // dejamos el sidebar sin mínimo (podrá hacerse más chico).
        const editorMinWidthPx = 360;
        const maxSidebarWidthPx = Math.max(
          0,
          Math.min(1100, containerW - editorMinWidthPx),
        );

        const delta = ev.clientX - previewResizeStartXRef.current;
        // Invertimos el signo para que el gesto del mouse se sienta natural
        // (arrastrar hacia la derecha -> ampliar el sidebar).
        const nextW = previewResizeStartWidthRef.current - delta;
        const clamped = Math.min(maxSidebarWidthPx, Math.max(0, nextW));
        setPreviewSidebarWidthPx(clamped);
      };

      const onUp = () => {
        previewResizingRef.current = false;
        document.body.style.cursor = "";
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        try {
          localStorage.setItem(
            "mt_preview_sidebar_width_px",
            String(previewSidebarWidthPxLatestRef.current),
          );
        } catch {
          // ignore
        }
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [previewSidebarMode, previewSidebarWidthPx],
  );
  const [obraPanelCollapsed, setObraPanelCollapsed] = useState(
    () => localStorage.getItem("mt_obra_panel_collapsed") === "true",
  );

  useEffect(() => {
    localStorage.setItem(
      "mt_obra_panel_collapsed",
      obraPanelCollapsed ? "true" : "false",
    );
  }, [obraPanelCollapsed]);

  const refreshList = useCallback(async () => {
    setLoadingList(true);
    try {
      const rows = await listPartituras();
      setItems(rows);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Error al cargar obras.");
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (!selectedId) {
      setSelectedRow(null);
      setSegments([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [row, segs] = await Promise.all([
          getPartitura(selectedId),
          getSegmentsForPartitura(selectedId),
        ]);
        if (cancelled) return;
        setSelectedRow(row);
        setSegments(segs);
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          toast.error(e?.message || "Error al cargar la obra.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  const refreshSegments = useCallback(async () => {
    if (!selectedId) return;
    try {
      const segs = await getSegmentsForPartitura(selectedId);
      setSegments(segs);
    } catch (e) {
      console.error(e);
    }
  }, [selectedId]);

  const handleExport = async () => {
    if (!selectedRow?.pdf_url) {
      toast.error("No hay PDF asociado.");
      return;
    }
    setExporting(true);
    try {
      const segmentsForPdf = segments.map((seg) => ({
        ...seg,
        segment_spanish:
          // En la previsualización: si no hay ES traducido, dejamos en blanco.
          // Así evitamos que `buildTranslatedPdfBytes` caiga a `segment_english`.
          normalizeNbspForPdf(
            spanishDraftById[seg.id] ?? seg.segment_spanish ?? "",
          ),
      }));
      const bytes = await buildTranslatedPdfBytes(
        selectedRow.pdf_url,
        segmentsForPdf,
      );
      const blob = new Blob([bytes], { type: "application/pdf" });
      const name = (selectedRow.titulo_en || "traduccion").replace(
        /[^\w.\- ]/g,
        "_",
      );
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${name}_es.pdf`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("PDF exportado.");
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Error al exportar.");
    } finally {
      setExporting(false);
    }
  };

  const handleSpanishDraftChange = useCallback((id, text) => {
    setSpanishDraftById((prev) => ({ ...prev, [id]: text }));
  }, []);

  const handleOpenPreviewText = (mode) => {
    setPreviewSidebarMode(mode);
    setPreviewMenuOpen(false);
    setPdfPreviewOpen(false);
  };

  const handleOpenPdfPreview = async () => {
    if (!selectedRow?.pdf_url) return;
    setPreviewMenuOpen(false);
    setPreviewSidebarMode(null);
    setPdfPreviewOpen(true);
    setPdfPreviewBusy(true);
    setPdfPreviewBlobUrl(null);
    try {
      const segmentsForPdf = segments.map((seg) => ({
        ...seg,
        segment_spanish:
          // En previsualización: si no hay ES traducido, dejamos en blanco
          // (evita que `buildTranslatedPdfBytes` caiga a `segment_english`).
          normalizeNbspForPdf(
            spanishDraftById[seg.id] ?? seg.segment_spanish ?? "",
          ),
      }));
      const bytes = await buildTranslatedPdfBytes(
        selectedRow.pdf_url,
        segmentsForPdf,
      );
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfPreviewBlobUrl(url);
    } catch (e) {
      console.error(e);
      toast.error(e?.message || "Error al generar PDF previsualización.");
      setPdfPreviewBlobUrl(null);
    } finally {
      setPdfPreviewBusy(false);
    }
  };

  useEffect(() => {
    return () => {
      if (pdfPreviewBlobUrl) URL.revokeObjectURL(pdfPreviewBlobUrl);
    };
  }, [pdfPreviewBlobUrl]);

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 lg:flex-row">
      <aside
        className={`flex shrink-0 flex-col border-b border-slate-200 transition-[width] duration-200 ease-out dark:border-slate-800 lg:border-b-0 lg:border-r ${
          obraPanelCollapsed ? "w-full lg:w-12" : "w-full lg:w-80"
        }`}
      >
        <div
          id="mt-obra-panel"
          className={`flex min-h-0 flex-1 flex-col max-lg:flex ${
            obraPanelCollapsed ? "lg:hidden" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="flex min-w-0 flex-1 items-center gap-2 font-bold text-slate-800 dark:text-white">
              <button
                type="button"
                className="hidden shrink-0 rounded-lg p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 lg:inline-flex"
                title="Contraer lista de obras"
                aria-expanded
                aria-controls="mt-obra-panel"
                onClick={() => setObraPanelCollapsed(true)}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <Music className="h-5 w-5 shrink-0 text-violet-500" />
              <span className="truncate text-sm">Traducción musical</span>
            </div>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs font-bold text-white shadow hover:bg-violet-500"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Nueva obra</span>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-2">
            {loadingList ? (
              <div className="flex justify-center py-10 text-slate-500">
                <Loader2 className="h-7 w-7 animate-spin text-violet-500" />
              </div>
            ) : items.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                No hay obras cargadas. Subí un PDF con campos de formulario.
              </p>
            ) : (
              <ul className="space-y-1">
                {items.map((row) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        selectedId === row.id
                          ? "bg-violet-600 text-white shadow-md"
                          : "text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
                      }`}
                    >
                      <div className="font-semibold leading-tight">
                        {row.titulo_en}
                      </div>
                      {row.titulo_es && (
                        <div
                          className={`mt-0.5 text-xs ${
                            selectedId === row.id
                              ? "text-violet-100"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {row.titulo_es}
                        </div>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {obraPanelCollapsed && (
          <div className="hidden min-h-0 w-full flex-1 flex-col items-center gap-3 border-b border-slate-200 py-3 dark:border-slate-800 lg:flex">
            <button
              type="button"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800"
              title="Mostrar lista de obras"
              aria-expanded={false}
              aria-controls="mt-obra-panel"
              onClick={() => setObraPanelCollapsed(false)}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg p-2 text-violet-600 hover:bg-violet-100 dark:hover:bg-violet-950/50"
              title="Nueva obra"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}
      </aside>

      <section className="flex min-h-0 min-w-0 flex-1 flex-col">
        {selectedRow?.pdf_url ? (
          <>
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800 px-4 py-2">
              <div className="min-w-0">
                <h1 className="truncate text-base font-bold text-slate-900 dark:text-white">
                  {selectedRow.titulo_en}
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {segments.length} campo(s) · PDF / estructura · bilingüe opcional
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative" ref={previewMenuRef}>
                  <button
                    type="button"
                    onClick={() => setPreviewMenuOpen((v) => !v)}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                    aria-expanded={previewMenuOpen}
                  >
                    <Eye className="h-4 w-4 text-violet-500" />
                    Previsualizar
                  </button>
                  {previewMenuOpen && (
                    <div className="absolute right-0 top-full z-[50] mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
                      <button
                        type="button"
                        onClick={() => handleOpenPreviewText("with")}
                        className="block w-full px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        Texto con guiones
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenPreviewText("without")}
                        className="block w-full px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        Texto sin guiones
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenPdfPreview}
                        className="block w-full px-3 py-2 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800"
                      >
                        Partitura previsualización
                      </button>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-sm hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                >
                  {exporting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4 text-violet-500" />
                  )}
                  Exportar PDF (ES)
                </button>
              </div>
            </div>
            <div
              ref={previewResizeAreaRef}
              className="flex min-h-0 min-w-0 flex-1 overflow-hidden"
            >
              <div className="min-h-0 flex-1 overflow-hidden">
                <LiveEditor
                  pdfUrl={selectedRow.pdf_url}
                  segments={segments}
                  onSegmentsRefresh={refreshSegments}
                  onSpanishDraftChange={handleSpanishDraftChange}
                  onSpanishSegmentFocus={handleSpanishSegmentFocus}
                />
              </div>
              {previewSidebarMode && (
                <>
                  <div
                    className="w-2 cursor-col-resize bg-transparent hover:bg-slate-200/40 dark:hover:bg-slate-700/40"
                    role="separator"
                    aria-label="Redimensionar sidebar de previsualización"
                    onMouseDown={startPreviewSidebarResize}
                  />
                  <aside
                    className="flex-none border-l border-slate-200 bg-white/60 dark:border-slate-800 dark:bg-slate-950/60"
                    style={{ width: previewSidebarWidthPx }}
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-3 py-2 dark:border-slate-800">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-bold text-slate-900 dark:text-white">
                          {previewSidebarMode === "with"
                            ? "Texto con guiones"
                            : "Texto sin guiones"}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          Generado desde la traducción ES (respeta `control_flujo`)
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPreviewSidebarMode(null)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        aria-label="Cerrar sidebar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div
                      ref={previewSidebarScrollRef}
                      className="h-full max-h-[calc(100vh-140px)] overflow-y-auto p-3"
                    >
                      <div className="space-y-4">
                        {activePreviewBlocks.map((b) => (
                          <div
                            key={b.key}
                            id={`mt-preview-block-${b.key}`}
                            className={
                              b.key === activePreviewBlockKey
                                ? "rounded-xl border border-green-400/30 bg-green-500/10 p-3 shadow-sm ring-1 ring-green-400/30"
                                : "rounded-xl border border-slate-200 bg-white/70 p-3 shadow-sm dark:border-slate-700 dark:bg-slate-950/35"
                            }
                          >
                            <div className="mb-2 flex items-center gap-2">
                              <div className="h-2 w-2 rounded-full bg-violet-500" />
                              <div className="truncate text-sm font-bold text-violet-800 dark:text-violet-200">
                                {b.heading}
                              </div>
                            </div>
                            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed text-slate-900 dark:text-slate-100">
                              {b.lines.map((line, idx) => (
                                <React.Fragment key={line.key ?? idx}>
                                  {idx > 0 ? "\n" : ""}
                                  <span
                                    className={
                                      line.isActive
                                        ? "font-bold text-slate-900 dark:text-slate-100"
                                        : ""
                                    }
                                  >
                                    {line.text}
                                  </span>
                                </React.Fragment>
                              ))}
                            </pre>
                          </div>
                        ))}
                        {!activePreviewBlocks.length && (
                          <div className="min-h-[200px] rounded-xl border border-dashed border-slate-300 bg-white/40 p-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950/25 dark:text-slate-400">
                            No hay texto para previsualizar.
                          </div>
                        )}
                      </div>
                    </div>
                  </aside>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center text-slate-500 dark:text-slate-400">
            <Music className="h-12 w-12 text-slate-300 dark:text-slate-600" />
            <p className="max-w-sm text-sm">
              Elegí una obra en el panel izquierdo o creá una nueva para
              comenzar la traducción sobre el PDF.
            </p>
          </div>
        )}
      </section>

      <NewWorkModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        userId={userId}
        onCreated={(id) => {
          refreshList();
          setSelectedId(id);
        }}
      />

      <PdfPreviewModal
        open={pdfPreviewOpen}
        onClose={() => {
          setPdfPreviewOpen(false);
          setPdfPreviewBusy(false);
          if (pdfPreviewBlobUrl) {
            URL.revokeObjectURL(pdfPreviewBlobUrl);
            setPdfPreviewBlobUrl(null);
          }
        }}
        blobUrl={pdfPreviewBlobUrl}
        busy={pdfPreviewBusy}
      />
    </div>
  );
}
