import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Stage,
  Layer,
  Group,
  Rect,
  Text,
  Line,
  Path,
  Circle,
  Transformer,
  Image as KonvaImage,
} from "react-konva";
import { toast } from "sonner";
import {
  IconLoader,
  IconLayout,
  IconTrash,
  IconPlus,
  IconFileText,
  IconPhoto,
  IconRefresh,
  IconCopy,
  IconChevronDown,
  IconLayers,
  IconMaximize,
  IconBold,
  IconItalic,
  IconAlignLeft,
  IconAlignCenter,
  IconAlignRight,
  IconUpload,
  IconLink,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import {
  getStagePlotCatalogItem,
  stagePlotCategories,
  stagePlotItemShowsChairSquare,
} from "../../utils/stagePlotCatalog";
import {
  STAGE_PLOT_SILHOUETTE_VIEWBOX,
  getStagePlotSilhouettePath,
  stagePlotSilhouetteSvgMarkup,
} from "../../utils/stagePlotSilhouettes";
import {
  getStagePlotImageNaturalSize,
  getStagePlotItemVisualBounds,
  formatStagePlotItemRealSize,
  loadStagePlotIconImage,
  stagePlotIconImgSrc,
} from "../../utils/stagePlotIconAssets";
import {
  STAGE_PLOT_DEFAULT_HEIGHT_CM,
  STAGE_PLOT_DEFAULT_WIDTH_CM,
  STAGE_PLOT_HEIGHT_CM_MAX,
  STAGE_PLOT_HEIGHT_CM_MIN,
  STAGE_PLOT_WIDTH_CM_MAX,
  STAGE_PLOT_WIDTH_CM_MIN,
  clampStagePlotHeightCm,
  clampStagePlotWidthCm,
  stagePlotCmToPx,
  stagePlotConductorFeetPosition,
  stagePlotConductorPosition,
  stagePlotConductorVisualHalfHeightPx,
  stagePlotGridMajorPx,
  stagePlotGridMinorPx,
  stagePlotChairSquareSide,
  STAGE_PLOT_CHAIR_SQUARE_FILL,
  STAGE_PLOT_CHAIR_SQUARE_STROKE,
  STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_FILL,
  STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_STROKE,
  STAGE_PLOT_ITEM_SCALE_MIN,
  STAGE_PLOT_ITEM_SCALE_MAX,
} from "../../utils/stagePlotConstants";
import {
  applyStagePlotStagePatch,
  cloneStagePlotPayload,
  createStagePlotItem,
  deriveStagePlotChannels,
  getStagePlotTextLayout,
  normalizeStagePlotPayload,
  normalizeStagePlotRadialLines,
  toggleStagePlotFontStyle,
  STAGE_PLOT_RADIAL_LINES_DEFAULT,
  STAGE_PLOT_RADIAL_LINES_MAX,
  STAGE_PLOT_RADIAL_LINES_MIN,
  STAGE_PLOT_TEXT_COLOR_PRESETS,
  STAGE_PLOT_TEXT_FONT_SIZE_PRESETS,
} from "../../utils/stagePlotPayload";
import {
  STAGE_PLOT_FORMATIONATION_LABELS,
  STAGE_PLOT_SLOT_SNAP_PX,
  FORMATION_MIN_RADIUS,
  FORMATION_MIN_WIDTH,
  FORMATION_MIN_DEPTH,
  FORMATION_MIN_LENGTH,
  clearFormationAnchors,
  cloneStagePlotFormation,
  computeFormationSlots,
  createStagePlotFormation,
  findNearestFreeSlot,
  formationGuideLinePoints,
  formationParamsFromHandlePosition,
  formationResizeHandlesWorld,
  formationSlotMarkerSize,
  isFormationCenteredOnConductor,
  parseSlotId,
  reanchorItemsToFormations,
  resolveFormationFacingPoint,
  snapFormationXToConductorCenter,
} from "../../utils/stagePlotFormations";
import {
  buildStagePlotOrganicoCompare,
  computeOrganicoInsertPositions,
  organicoRowIndex,
  organicoRowMissingCount,
  pickOrganicoRowCatalogType,
  summarizeStagePlotOrganico,
} from "../../utils/stagePlotOrganico";
import {
  alignLineGuidePoints,
  alignStagePlotItems,
  getGroupMemberIds,
  groupStagePlotItems,
  resolveSharedAlignGroup,
  setGroupAlignAngle,
  ungroupStagePlotItems,
} from "../../utils/stagePlotGroups";
import { useGiraRoster } from "../../hooks/useGiraRoster";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import {
  exportStagePlotJpg,
  exportStagePlotPdf,
} from "../../utils/stagePlotPdf";
import {
  createStagePlot,
  deleteStagePlot,
  listGiraStagePlotCandidateEvents,
  listStagePlotEventLinks,
  listStagePlotsByPrograma,
  setStagePlotEventos,
  upsertStagePlot,
} from "../../services/stagePlotService";
import {
  fetchGiraGrupos,
  integranteIdsForRepertorioGrupos,
  repertorioGrupoIdsFromBlock,
} from "../../services/giraGruposService";
import { isConfirmedConvocadoForSeatingReports } from "../../utils/seatingRosterGate";
import StagePlotImportModal from "./StagePlotImportModal";

const SAVE_DEBOUNCE_MS = 700;
const HISTORY_LIMIT = 80;
const VB = STAGE_PLOT_SILHOUETTE_VIEWBOX;
const ZOOM_MIN = 0.15;
const ZOOM_MAX = 4;
const ZOOM_FACTOR = 1.1;
const SCALE_MIN = STAGE_PLOT_ITEM_SCALE_MIN;
const SCALE_MAX = STAGE_PLOT_ITEM_SCALE_MAX;
const GRID_MINOR = stagePlotGridMinorPx();
const GRID_MAJOR = stagePlotGridMajorPx();
/** Cada 5 líneas menores (10 cm) → línea mayor (50 cm). */
const GRID_MAJOR_EVERY = GRID_MAJOR / GRID_MINOR;
/** Desplazamiento con flechas (↑↓←→) en coords de escenario (px). */
const KEYBOARD_MOVE_STEP = 12;
/** Desplazamiento fino con Ctrl/⌘ + flecha (px). */
const KEYBOARD_NUDGE_STEP = 4;
const STAGE_PLOT_FULLSCREEN_Z = 9999;
/** Portales (popover, menú, tooltip, drag) por encima del root inmersivo. */
const STAGE_PLOT_OVERLAY_Z = 10000;
const STAGE_PLOT_OVERLAY_TOOLTIP_Z = 10010;
const STAGE_PLOT_OVERLAY_DRAG_Z = 10020;
/** Tamaño objetivo de asas de resize en px de pantalla (Transformer + formaciones). */
const TRANSFORMER_HANDLE_SCREEN_PX = 7;
/**
 * Floating copy/delete toolbar (HTML overlay, screen px).
 * Prefer right of selection AABB so it never covers the centered Konva rotate handle
 * (~20–36 px above the box). Above fallback clears that rotate zone.
 */
const FLOATING_TOOLBAR_SIDE_GAP_PX = 8;
const FLOATING_TOOLBAR_EDGE_PAD_PX = 8;
/** Distancia mínima (screen) desde el top del AABB hasta el bottom del toolbar (modo arriba). */
const FLOATING_TOOLBAR_ABOVE_CLEARANCE_PX = 40;
const FLOATING_TOOLBAR_BTN_PX = 32;
const FLOATING_TOOLBAR_PAD_PX = 8; // p-1 × 2
const FLOATING_TOOLBAR_GAP_PX = 4; // gap-1

function averageAbsNodeScale(node) {
  return (Math.abs(node.scaleX()) + Math.abs(node.scaleY())) / 2;
}

function maxAbsScaleFromNodes(nodes) {
  if (!nodes?.length) return 1;
  return Math.max(1, ...nodes.map(averageAbsNodeScale));
}


/**
 * Encaja el lienzo anclando el director (o centro downstage) abajo-centro del viewport.
 */
function computeStagePlotViewportFit({
  boxW,
  boxH,
  stageWidth,
  stageHeight,
  items,
  zoomMin,
  zoomMax,
}) {
  const sw = stageWidth || 900;
  const sh = stageHeight || 560;
  if (boxW < 40 || boxH < 40) return null;

  const padSide = 16;
  const padTop = 16;
  const padBottom = 24;

  const conductor = (items || []).find((it) => it.type === "conductor");
  const anchor = conductor
    ? {
        x: conductor.x,
        y: conductor.y + stagePlotConductorVisualHalfHeightPx(conductor.scale),
      }
    : stagePlotConductorFeetPosition(sw, sh);

  const scaleW = (boxW - padSide * 2) / sw;
  const scaleH = (boxH - padTop - padBottom) / Math.max(anchor.y, 1);
  const scale = Math.min(scaleW, scaleH, zoomMax);
  const safe = Math.max(zoomMin, scale || 0.5);

  return {
    scale: safe,
    x: boxW / 2 - anchor.x * safe,
    y: boxH - padBottom - anchor.y * safe,
  };
}

const ARROW_KEY_DELTA = {
  ArrowUp: { dx: 0, dy: -1 },
  ArrowDown: { dx: 0, dy: 1 },
  ArrowLeft: { dx: -1, dy: 0 },
  ArrowRight: { dx: 1, dy: 0 },
};

/** Ángulos equiespaciados del abanico radial (−180°…0° inclusive). */
function radialGuideAngles(lineCount) {
  const n = normalizeStagePlotRadialLines(lineCount);
  if (n <= 1) return [-180];
  const step = 180 / (n - 1);
  return Array.from({ length: n }, (_, i) => -180 + i * step);
}

function rayEndpoint(ox, oy, angleDeg, width, height) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  let t = Infinity;
  if (dx > 1e-6) t = Math.min(t, (width - ox) / dx);
  if (dx < -1e-6) t = Math.min(t, -ox / dx);
  if (dy > 1e-6) t = Math.min(t, (height - oy) / dy);
  if (dy < -1e-6) t = Math.min(t, -oy / dy);
  if (!Number.isFinite(t) || t <= 0) {
    return { x: ox + dx * 120, y: oy + dy * 120 };
  }
  return { x: ox + t * dx, y: oy + t * dy };
}

function StageRadialGuide({ width, height, items, stage }) {
  const origin = useMemo(
    () => resolveFormationFacingPoint(items, stage),
    [items, stage],
  );

  const lines = useMemo(() => {
    const { x: ox, y: oy } = origin;
    const angles = radialGuideAngles(stage?.radialLines);
    return angles.map((deg, idx) => {
      const end = rayEndpoint(ox, oy, deg, width, height);
      return (
        <Line
          key={`rad-${idx}-${deg}`}
          points={[ox, oy, end.x, end.y]}
          stroke="#8b5cf6"
          strokeWidth={1.5}
          opacity={0.88}
          listening={false}
        />
      );
    });
  }, [origin, width, height, stage?.radialLines]);

  return <Group listening={false}>{lines}</Group>;
}


function StageLienzoDimensionInput({
  label,
  value,
  fallback,
  min,
  max,
  clampFn,
  disabled,
  onCommit,
  inputClassName,
  flushRegistry,
  /** e.g. "ancho" | "alto" — enables toast when clamp kicks in */
  limitNoun,
}) {
  const [draft, setDraft] = useState(() =>
    String(Math.round(value ?? fallback)),
  );
  const draftRef = useRef(draft);
  const focusedRef = useRef(false);
  const valueRef = useRef(value);
  const fallbackRef = useRef(fallback);
  const clampFnRef = useRef(clampFn);
  const onCommitRef = useRef(onCommit);
  const liveTimerRef = useRef(null);
  const lastLimitToastRef = useRef({ msg: "", at: 0 });

  valueRef.current = value;
  fallbackRef.current = fallback;
  clampFnRef.current = clampFn;
  onCommitRef.current = onCommit;

  const toastLimit = useCallback(
    (kind) => {
      if (!limitNoun) return;
      const msg =
        kind === "max"
          ? `Máximo ${max} cm de ${limitNoun}`
          : `Mínimo ${min} cm de ${limitNoun}`;
      const now = Date.now();
      const prev = lastLimitToastRef.current;
      if (prev.msg === msg && now - prev.at < 2200) return;
      lastLimitToastRef.current = { msg, at: now };
      toast.message(msg);
    },
    [limitNoun, min, max],
  );

  useEffect(() => {
    if (!focusedRef.current) {
      const next = String(Math.round(value ?? fallback));
      draftRef.current = next;
      setDraft(next);
    }
  }, [value, fallback]);

  useEffect(
    () => () => {
      if (liveTimerRef.current) {
        clearTimeout(liveTimerRef.current);
        liveTimerRef.current = null;
      }
    },
    [],
  );

  /** Apply only when draft is a complete number already inside min–max (no mid-keystroke clamp). */
  const applyLiveIfValid = useCallback(() => {
    const raw = draftRef.current;
    if (raw === "" || raw == null) return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    if (n > max) {
      toastLimit("max");
      return;
    }
    if (n < min) {
      toastLimit("min");
      return;
    }
    const rounded = Math.round(n);
    const fb = Math.round(valueRef.current ?? fallbackRef.current);
    if (rounded === fb) return;
    onCommitRef.current(rounded);
  }, [min, max, toastLimit]);

  /** Final commit: clamp empty/OOB drafts, sync display string. */
  const commit = useCallback(() => {
    if (liveTimerRef.current) {
      clearTimeout(liveTimerRef.current);
      liveTimerRef.current = null;
    }
    const fb = valueRef.current ?? fallbackRef.current;
    const raw = draftRef.current;
    if (raw !== "" && raw != null) {
      const rawNum = Number(raw);
      if (Number.isFinite(rawNum)) {
        if (rawNum > max) toastLimit("max");
        else if (rawNum < min) toastLimit("min");
      }
    }
    const next = clampFnRef.current(raw, fb);
    const rounded = Math.round(next);
    const asStr = String(rounded);
    draftRef.current = asStr;
    setDraft(asStr);
    focusedRef.current = false;
    if (rounded !== Math.round(fb)) {
      onCommitRef.current(rounded);
    }
  }, [min, max, toastLimit]);

  // Imperative flush: close/unmount often skips native blur → React onBlur.
  useEffect(() => {
    if (!flushRegistry) return undefined;
    flushRegistry.add(commit);
    return () => {
      flushRegistry.delete(commit);
    };
  }, [flushRegistry, commit]);

  return (
    <label className="flex flex-col gap-0.5 text-[10px] text-slate-600">
      {label}
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        autoComplete="off"
        min={min}
        max={max}
        disabled={disabled}
        value={draft}
        onFocus={(e) => {
          focusedRef.current = true;
          e.target.select();
        }}
        onChange={(e) => {
          const next = e.target.value.replace(/\D/g, "");
          draftRef.current = next;
          setDraft(next);
          // Debounce slightly so multi-digit typing (e.g. 40→400) doesn't flash intermediates.
          if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
          liveTimerRef.current = setTimeout(() => {
            liveTimerRef.current = null;
            applyLiveIfValid();
          }, 220);
        }}
        onBlur={() => {
          commit();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
            e.currentTarget.blur();
          }
        }}
        className={inputClassName}
      />
    </label>
  );
}

/** Compact switch: ON = that canvas layer is visible. */
function StageLienzoVisibilityToggle({ label, checked, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => {
        if (!disabled) onChange(!checked);
      }}
      className={`flex flex-col items-center gap-1 rounded px-0.5 py-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/60 ${
        disabled
          ? "cursor-not-allowed opacity-50"
          : "cursor-pointer hover:bg-slate-50"
      }`}
    >
      <span
        className={`relative h-4 w-7 shrink-0 rounded-full transition-colors ${
          checked ? "bg-indigo-600" : "bg-slate-300"
        }`}
        aria-hidden
      >
        <span
          className={`absolute top-0.5 left-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-3" : "translate-x-0"
          }`}
        />
      </span>
      <span className="text-center text-[9px] font-medium leading-tight text-slate-700">
        {label}
      </span>
    </button>
  );
}

function StageLienzoPopover({
  open,
  anchorRef,
  onClose,
  stage,
  canEdit,
  hasConductor,
  onPatchStage,
  onAddDirector,
  onClearAll,
  overlayZ = 100,
  flushRef,
}) {
  const popoverRef = useRef(null);
  const flushersRef = useRef(null);
  if (!flushersRef.current) flushersRef.current = new Set();
  const [pos, setPos] = useState({ left: 0, top: 0 });

  const flushAllDrafts = useCallback(() => {
    flushersRef.current.forEach((fn) => {
      try {
        fn();
      } catch {
        /* ignore flush errors */
      }
    });
  }, []);

  useEffect(() => {
    if (!flushRef) return undefined;
    flushRef.current = flushAllDrafts;
    return () => {
      if (flushRef.current === flushAllDrafts) flushRef.current = null;
    };
  }, [flushRef, flushAllDrafts]);

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 280)),
      top: rect.bottom + 6,
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;
    const closeAfterFlush = () => {
      // Commit drafts imperatively — do not rely on blur (often skipped on unmount).
      flushAllDrafts();
      onClose();
    };
    const onPointerDown = (e) => {
      if (
        popoverRef.current?.contains(e.target) ||
        anchorRef.current?.contains(e.target)
      ) {
        return;
      }
      closeAfterFlush();
    };
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      closeAfterFlush();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, anchorRef, flushAllDrafts]);

  if (!open) return null;

  const flushRegistry = flushersRef.current;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Ajustes del lienzo"
      className="fixed w-64 rounded-md border border-slate-200 bg-white p-3 shadow-lg"
      style={{ left: pos.left, top: pos.top, zIndex: overlayZ }}
    >
      <p className="mb-2 text-[11px] font-bold text-slate-700">Lienzo</p>
      <div className="mb-2 grid grid-cols-2 gap-2">
        <StageLienzoDimensionInput
          label="Ancho (cm)"
          value={stage.widthCm}
          fallback={STAGE_PLOT_DEFAULT_WIDTH_CM}
          min={STAGE_PLOT_WIDTH_CM_MIN}
          max={STAGE_PLOT_WIDTH_CM_MAX}
          clampFn={clampStagePlotWidthCm}
          disabled={!canEdit}
          flushRegistry={flushRegistry}
          limitNoun="ancho"
          onCommit={(widthCm) => onPatchStage({ widthCm })}
          inputClassName="rounded border border-slate-200 px-1.5 py-1 text-xs disabled:bg-slate-50"
        />
        <StageLienzoDimensionInput
          label="Alto (cm)"
          value={stage.heightCm}
          fallback={STAGE_PLOT_DEFAULT_HEIGHT_CM}
          min={STAGE_PLOT_HEIGHT_CM_MIN}
          max={STAGE_PLOT_HEIGHT_CM_MAX}
          clampFn={clampStagePlotHeightCm}
          disabled={!canEdit}
          flushRegistry={flushRegistry}
          limitNoun="alto"
          onCommit={(heightCm) => onPatchStage({ heightCm })}
          inputClassName="rounded border border-slate-200 px-1.5 py-1 text-xs disabled:bg-slate-50"
        />
      </div>
      <p className="mb-2 text-[9px] leading-snug text-slate-400">
        Máx. Ancho {STAGE_PLOT_WIDTH_CM_MAX} · Alto {STAGE_PLOT_HEIGHT_CM_MAX}{" "}
        cm
        <span className="text-slate-300">
          {" "}
          (mín. {STAGE_PLOT_WIDTH_CM_MIN}×{STAGE_PLOT_HEIGHT_CM_MIN})
        </span>
      </p>
      <div className="mb-2 border-t border-slate-100 pt-2">
        <div className="grid grid-cols-4 gap-0.5">
          <StageLienzoVisibilityToggle
            label="Cuadrícula"
            checked={stage.showGrid !== false}
            disabled={!canEdit}
            onChange={(showGrid) => onPatchStage({ showGrid })}
          />
          <StageLienzoVisibilityToggle
            label="Radial"
            checked={!!stage.showRadial}
            disabled={!canEdit}
            onChange={(showRadial) => onPatchStage({ showRadial })}
          />
          <StageLienzoVisibilityToggle
            label="Formaciones"
            checked={!stage.hideFormationGuides}
            disabled={!canEdit}
            onChange={(show) =>
              onPatchStage({ hideFormationGuides: !show })
            }
          />
          <StageLienzoVisibilityToggle
            label="Recuadros"
            checked={!stage.hideChairSquares}
            disabled={!canEdit}
            onChange={(show) => onPatchStage({ hideChairSquares: !show })}
          />
        </div>
        {stage.showRadial && (
          <div className="mt-2">
            <StageLienzoDimensionInput
              label="Líneas"
              value={stage.radialLines}
              fallback={STAGE_PLOT_RADIAL_LINES_DEFAULT}
              min={STAGE_PLOT_RADIAL_LINES_MIN}
              max={STAGE_PLOT_RADIAL_LINES_MAX}
              clampFn={(v, fb) => {
                const n = Number(v);
                if (!Number.isFinite(n)) return fb;
                return normalizeStagePlotRadialLines(n);
              }}
              disabled={!canEdit}
              flushRegistry={flushRegistry}
              onCommit={(radialLines) => onPatchStage({ radialLines })}
              inputClassName="rounded border border-slate-200 px-1.5 py-1 text-xs disabled:bg-slate-50"
            />
          </div>
        )}
      </div>
      {canEdit && (
        <>
          <button
            type="button"
            onClick={onAddDirector}
            className="inline-flex w-full items-center justify-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1.5 text-[11px] font-medium text-indigo-800 hover:bg-indigo-100"
            title={
              hasConductor
                ? "Seleccionar director existente"
                : "Colocar director en downstage central"
            }
          >
            <IconPlus size={12} />
            {hasConductor ? "Director" : "+ Director"}
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-[11px] font-medium text-rose-800 hover:bg-rose-100"
            title="Eliminar todos los instrumentos y formaciones del plano"
          >
            <IconTrash size={12} />
            Borrar todo
          </button>
        </>
      )}
    </div>,
    document.body,
  );
}

function isEditableKeyboardTarget(target) {
  if (!target || typeof target !== "object") return false;
  const el =
    typeof Element !== "undefined" && target instanceof Element
      ? target
      : null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  return !!el.closest?.('[contenteditable="true"]');
}

function useStagePlotIcon(type, color) {
  const [image, setImage] = useState(null);
  useEffect(() => {
    let cancelled = false;
    setImage(null);
    if (!type) return undefined;
    loadStagePlotIconImage(type, color).then((img) => {
      if (!cancelled) setImage(img);
    });
    return () => {
      cancelled = true;
    };
  }, [type, color]);
  return image;
}

/** @returns {{ interactive: boolean, isBackground: boolean }} */
function classifyStagePlotPointerTarget(node) {
  let cur = node;
  while (cur) {
    const cls =
      typeof cur.getClassName === "function" ? cur.getClassName() : "";
    const name = typeof cur.name === "function" ? cur.name() : "";
    if (cls === "Transformer") {
      return { interactive: true, isBackground: false };
    }
    if (typeof name === "string") {
      if (
        name.includes("stage-plot-item") ||
        name.includes("stage-plot-formation") ||
        name.includes("stage-plot-formation-handle")
      ) {
        return { interactive: true, isBackground: false };
      }
      if (name === "stage-plot-bg") {
        return { interactive: false, isBackground: true };
      }
    }
    cur = typeof cur.getParent === "function" ? cur.getParent() : null;
  }
  return { interactive: false, isBackground: false };
}

function StageCentimeterGrid({ width, height }) {
  const lines = useMemo(() => {
    const w = Math.round(width);
    const h = Math.round(height);
    const out = [];
    for (let i = 0, x = 0; x <= w; i += 1, x = i * GRID_MINOR) {
      const major = i % GRID_MAJOR_EVERY === 0;
      out.push(
        <Line
          key={`v-${x}`}
          points={[x, 0, x, h]}
          stroke={major ? "#64748b" : "#cbd5e1"}
          strokeWidth={major ? 1.25 : 1}
          opacity={major ? 0.9 : 0.55}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
          listening={false}
        />,
      );
    }
    for (let j = 0, y = 0; y <= h; j += 1, y = j * GRID_MINOR) {
      const major = j % GRID_MAJOR_EVERY === 0;
      out.push(
        <Line
          key={`h-${y}`}
          points={[0, y, w, y]}
          stroke={major ? "#64748b" : "#cbd5e1"}
          strokeWidth={major ? 1.25 : 1}
          opacity={major ? 0.9 : 0.55}
          strokeScaleEnabled={false}
          perfectDrawEnabled={false}
          listening={false}
        />,
      );
    }
    return out;
  }, [width, height]);

  return <Group listening={false}>{lines}</Group>;
}

function FormationResizeHandles({
  formation,
  handleSize,
  strokeWidth,
  onHandleDragMove,
  onHandleDragEnd,
}) {
  const handles = formationResizeHandlesWorld(formation);

  return (
    <Group listening name="stage-plot-formation-handles">
      {handles.map((h) => (
        <Circle
          key={`${formation.id}:${h.id}`}
          name="stage-plot-formation-handle"
          x={h.x}
          y={h.y}
          radius={handleSize / 2}
          fill="#fff"
          stroke="#4f46e5"
          strokeWidth={strokeWidth}
          draggable
          onMouseDown={(e) => {
            e.cancelBubble = true;
          }}
          onTap={(e) => {
            e.cancelBubble = true;
          }}
          onDragMove={(e) => {
            e.cancelBubble = true;
            const node = e.target;
            onHandleDragMove(formation.id, h.id, node.x(), node.y());
            node.position({ x: h.x, y: h.y });
          }}
          onDragEnd={(e) => {
            e.cancelBubble = true;
            const node = e.target;
            onHandleDragEnd(formation.id, h.id, node.x(), node.y());
            node.position({ x: h.x, y: h.y });
          }}
        />
      ))}
    </Group>
  );
}

function SnapMagnetGuide({ preview }) {
  if (!preview) return null;
  return (
    <Line
      points={[preview.itemX, preview.itemY, preview.slotX, preview.slotY]}
      stroke="#4f46e5"
      strokeWidth={1.5}
      dash={[6, 4]}
      opacity={0.65}
      listening={false}
    />
  );
}

/** Guía vertical del eje X del director al arrastrar formaciones cerca del centro. */
function FormationCenterAxisGuide({ x, height }) {
  if (x == null || !Number.isFinite(Number(x)) || !(height > 0)) return null;
  const cx = Number(x);
  return (
    <Line
      points={[cx, 0, cx, height]}
      stroke="#4f46e5"
      strokeWidth={1}
      dash={[4, 6]}
      opacity={0.4}
      listening={false}
      strokeScaleEnabled={false}
    />
  );
}

function AlignLineGuide({ group }) {
  if (
    !group?.alignAnchor ||
    group.alignAngle == null ||
    group.alignSpan == null
  ) {
    return null;
  }
  const pts = alignLineGuidePoints(
    group.alignAnchor,
    group.alignAngle,
    group.alignSpan,
  );
  return (
    <Line
      points={pts}
      stroke="#0ea5e9"
      strokeWidth={1.8}
      dash={[10, 6]}
      opacity={0.75}
      listening={false}
    />
  );
}

function buildStagePlotItemTooltipText(item, visual = null) {
  const cat = getStagePlotCatalogItem(item.type);
  const name = cat?.name || item.type;
  const label = item.label?.trim();
  const itemScale = item.scale > 0 ? item.scale : 1;
  const size =
    visual?.boundsW != null && visual?.boundsH != null
      ? formatStagePlotItemRealSize(visual.boundsW, visual.boundsH, itemScale)
      : null;
  return {
    primary: name,
    size,
    secondary: label && label !== name ? label : null,
  };
}

function StagePlotItemTooltip({ tooltip, overlayZ = 110 }) {
  if (!tooltip) return null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const left = clamp(tooltip.x + 12, 8, window.innerWidth - 200);
  const top = clamp(tooltip.y + 12, 8, window.innerHeight - 60);

  return createPortal(
    <div
      className="pointer-events-none fixed max-w-[min(16rem,calc(100vw-1rem))] rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-[10px] font-medium leading-snug text-white shadow-lg"
      style={{ left, top, zIndex: overlayZ }}
      role="tooltip"
    >
      {tooltip.primary}
      {tooltip.size ? (
        <span className="mt-0.5 block text-[9px] font-normal text-slate-300">
          {tooltip.size}
        </span>
      ) : null}
      {tooltip.secondary ? (
        <span className="mt-0.5 block text-[9px] font-normal text-slate-400">
          {tooltip.secondary}
        </span>
      ) : null}
    </div>,
    document.body,
  );
}

function StagePlotFormationContextMenu({
  menu,
  onClose,
  onCopyFormation,
  onCopyFormationWithInstruments,
  overlayZ = 100,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const onPointerDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      onClose();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const left = clamp(menu.x, 8, window.innerWidth - 260);
  const top = clamp(menu.y, 8, window.innerHeight - 120);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed min-w-[240px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
      style={{ left, top, zIndex: overlayZ }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
        onClick={onCopyFormation}
      >
        Copiar formación
      </button>
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
        onClick={onCopyFormationWithInstruments}
      >
        Copiar formación con instrumentos
      </button>
    </div>,
    document.body,
  );
}

function StagePlotItemContextMenu({
  menu,
  onClose,
  onSelectAllOfType,
  onSelectFormation,
  onUnifyScaleOfType,
  onGroup,
  onUngroup,
  onAlignInLine,
  overlayZ = 100,
}) {
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menu) return undefined;
    const onPointerDown = (e) => {
      if (menuRef.current?.contains(e.target)) return;
      onClose();
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const cat = getStagePlotCatalogItem(menu.type);
  const typeName = cat?.name || menu.type;
  const sameTypeCount = menu.sameTypeCount ?? 0;
  const canUnify = sameTypeCount > 1;
  const selectedCount = menu.selectedCount ?? 1;
  const canGroup = selectedCount >= 2;
  const canAlign = selectedCount >= 2;
  const canUngroup = !!menu.canUngroup;
  const formationId = menu.formationId || null;

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const left = clamp(menu.x, 8, window.innerWidth - 240);
  const top = clamp(menu.y, 8, window.innerHeight - 200);

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed min-w-[220px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
      style={{ left, top, zIndex: overlayZ }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {canGroup && (
        <button
          type="button"
          role="menuitem"
          className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
          onClick={onGroup}
        >
          Agrupar
        </button>
      )}
      {canUngroup && (
        <button
          type="button"
          role="menuitem"
          className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
          onClick={onUngroup}
        >
          Desagrupar
        </button>
      )}
      {canAlign && (
        <button
          type="button"
          role="menuitem"
          className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
          onClick={onAlignInLine}
        >
          Alinear en línea
        </button>
      )}
      {(canGroup || canUngroup || canAlign) && (
        <div className="my-1 border-t border-slate-100" role="separator" />
      )}
      {formationId && (
        <button
          type="button"
          role="menuitem"
          className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
          onClick={() => onSelectFormation?.(formationId)}
        >
          Seleccionar formación
        </button>
      )}
      <button
        type="button"
        role="menuitem"
        className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
        onClick={() => onSelectAllOfType(menu.type)}
      >
        Seleccionar todos los {typeName}
      </button>
      <button
        type="button"
        role="menuitem"
        disabled={!canUnify}
        title={
          canUnify
            ? `Igualar escala de todos los ${typeName} al del ítem clickeado`
            : "Solo hay un ítem de este tipo"
        }
        className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-800 disabled:cursor-not-allowed disabled:text-slate-400 disabled:hover:bg-transparent"
        onClick={() => onUnifyScaleOfType(menu.type, menu.referenceScale)}
      >
        Unificar tamaños de instrumento
      </button>
    </div>,
    document.body,
  );
}

function FormationShape({
  formation,
  items,
  stage,
  selected,
  draggable,
  highlightSlotId,
  onSelect,
  onContextMenu,
  onDragStart,
  onDragMove,
  onDragEnd,
}) {
  const facing = resolveFormationFacingPoint(items, stage, formation.facing);
  const slots = computeFormationSlots(formation, facing);
  const linePts = formationGuideLinePoints(formation);
  const marker = formationSlotMarkerSize();
  const stroke = selected ? "#4f46e5" : "#64748b";
  const occupied = new Set(
    (items || []).map((it) => it.slotId).filter(Boolean).map(String),
  );
  const centerSnapLatchedRef = useRef(false);

  return (
    <Group
      name="stage-plot-formation"
      id={`formation:${formation.id}`}
      draggable={draggable}
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onSelect(formation.id, e);
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(formation.id, e);
      }}
      onContextMenu={(e) => {
        e.cancelBubble = true;
        e.evt?.preventDefault?.();
        onContextMenu?.(formation.id, e);
      }}
      onDragStart={() => {
        const latched = isFormationCenteredOnConductor(
          formation,
          items,
          stage,
        );
        centerSnapLatchedRef.current = latched;
        onDragStart?.(formation.id, facing.x, latched);
      }}
      onDragMove={(e) => {
        const rawX = formation.x + e.target.x();
        const rawY = formation.y + e.target.y();
        const { x, snapped } = snapFormationXToConductorCenter(
          rawX,
          facing.x,
          centerSnapLatchedRef.current,
        );
        centerSnapLatchedRef.current = snapped;
        if (x !== rawX) {
          e.target.x(x - formation.x);
        }
        onDragMove?.(formation.id, x, rawY, snapped, facing.x);
      }}
      onDragEnd={(e) => {
        const dx = e.target.x();
        const dy = e.target.y();
        e.target.position({ x: 0, y: 0 });
        const rawX = formation.x + dx;
        const rawY = formation.y + dy;
        const { x } = snapFormationXToConductorCenter(
          rawX,
          facing.x,
          centerSnapLatchedRef.current,
        );
        centerSnapLatchedRef.current = false;
        onDragEnd(formation.id, x, rawY);
      }}
    >
      <Line
        points={linePts}
        stroke={stroke}
        strokeWidth={selected ? 2.5 : 2}
        strokeScaleEnabled={false}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
      {/* Hit area invisible around guide */}
      <Line
        points={linePts}
        stroke="transparent"
        strokeWidth={Math.max(40, marker * 0.35)}
        lineCap="round"
        lineJoin="round"
      />
      {slots.map((slot) => {
        const filled = occupied.has(slot.slotId);
        const isSnapTarget = highlightSlotId === slot.slotId;
        return (
          <Rect
            key={slot.slotId}
            x={slot.x}
            y={slot.y}
            width={marker}
            height={marker}
            offsetX={marker / 2}
            offsetY={marker / 2}
            rotation={slot.rotation}
            fill={
              isSnapTarget
                ? "rgba(79,70,229,0.4)"
                : filled
                  ? "rgba(79,70,229,0.28)"
                  : "rgba(255,255,255,0.92)"
            }
            stroke={
              isSnapTarget
                ? "#3730a3"
                : filled
                  ? "#4f46e5"
                  : selected
                    ? "#4f46e5"
                    : "#334155"
            }
            strokeWidth={isSnapTarget ? 2.25 : 2}
            strokeScaleEnabled={false}
            listening={false}
          />
        );
      })}
    </Group>
  );
}

const ItemShape = React.memo(function ItemShape({
  item,
  selected,
  magnetized,
  hideChairSquares,
  draggable,
  shapeRef,
  onSelect,
  onContextMenu,
  onDblClick,
  onMouseEnter,
  onMouseLeave,
  onMouseMove,
  onDragStart,
  onDragMove,
  onDragEnd,
  onTransformEnd,
}) {
  const cat = getStagePlotCatalogItem(item.type);
  const w = cat?.w || 40;
  const h = cat?.h || 40;
  const fill = cat?.color || "#64748b";
  const isText = item.type === "text";
  const pathD = isText ? null : getStagePlotSilhouettePath(item.type);
  const iconImage = useStagePlotIcon(isText ? null : item.type, fill);
  const stroke = selected ? "#f59e0b" : "#0f172a";
  const strokeW = selected ? 2.2 : 1.1;
  const silScale = Math.min(w / VB, h / VB);
  const iconNatural = useMemo(
    () => (iconImage ? getStagePlotImageNaturalSize(iconImage) : null),
    [iconImage],
  );
  const textLayout = useMemo(
    () => (isText ? getStagePlotTextLayout(item, cat) : null),
    [isText, item, cat],
  );
  const visualBounds = useMemo(() => {
    if (isText && textLayout) {
      return { drawW: textLayout.textW, drawH: textLayout.textH };
    }
    if (iconImage && iconNatural?.w && iconNatural?.h) {
      return getStagePlotItemVisualBounds(w, h, "icon", {
        contentW: iconNatural.w,
        contentH: iconNatural.h,
      });
    }
    if (pathD) {
      return getStagePlotItemVisualBounds(w, h, "silhouette");
    }
    return getStagePlotItemVisualBounds(w, h, "catalog");
  }, [isText, textLayout, iconImage, iconNatural, w, h, pathD]);
  const boundsW = visualBounds.drawW;
  const boundsH = visualBounds.drawH;
  const itemScale = item.scale > 0 ? item.scale : 1;
  const showChairSquare =
    !hideChairSquares && stagePlotItemShowsChairSquare(item.type);
  const chairSide = showChairSquare
    ? stagePlotChairSquareSide(boundsW, boundsH)
    : 0;
  const chairFill = magnetized
    ? STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_FILL
    : STAGE_PLOT_CHAIR_SQUARE_FILL;
  const chairStroke = magnetized
    ? STAGE_PLOT_CHAIR_SQUARE_MAGNETIZED_STROKE
    : STAGE_PLOT_CHAIR_SQUARE_STROKE;

  useLayoutEffect(() => {
    if (!selected) return;
    const node = shapeRef?.current;
    if (!node) return;
    const tr = node.getStage()?.findOne("Transformer");
    if (tr?.nodes()?.includes(node)) {
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    }
  }, [boundsW, boundsH, itemScale, selected, shapeRef, iconImage, textLayout]);

  return (
    <Group
      ref={shapeRef}
      id={String(item.id)}
      name="stage-plot-item"
      x={item.x}
      y={item.y}
      rotation={item.rotation || 0}
      scaleX={itemScale}
      scaleY={itemScale}
      draggable={draggable}
      onMouseDown={(e) => {
        e.cancelBubble = true;
        onSelect(item.id, e);
      }}
      onClick={(e) => {
        e.cancelBubble = true;
      }}
      onTap={(e) => {
        e.cancelBubble = true;
        onSelect(item.id, e);
      }}
      onDblClick={(e) => {
        e.cancelBubble = true;
        onDblClick?.(item.id, e);
      }}
      onDblTap={(e) => {
        e.cancelBubble = true;
        onDblClick?.(item.id, e);
      }}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        e.cancelBubble = true;
        onContextMenu?.(item.id, e);
      }}
      onMouseEnter={(e) => {
        onMouseEnter?.(item, e, {
          boundsW,
          boundsH,
          itemScale,
        });
      }}
      onMouseLeave={() => {
        onMouseLeave?.();
      }}
      onMouseMove={(e) => {
        onMouseMove?.(e);
      }}
      onDragStart={(e) => {
        onDragStart?.(item.id, e);
      }}
      onDragMove={(e) => {
        onDragMove?.(item.id, e);
      }}
      onDragEnd={(e) => {
        onDragEnd(item.id, e.target.x(), e.target.y());
      }}
      onTransformEnd={(e) => {
        const node = e.target;
        const absScale = Math.max(
          SCALE_MIN,
          Math.min(
            SCALE_MAX,
            (Math.abs(node.scaleX()) + Math.abs(node.scaleY())) / 2,
          ),
        );
        node.scaleX(1);
        node.scaleY(1);
        onTransformEnd(item.id, {
          x: node.x(),
          y: node.y(),
          rotation: node.rotation(),
          scale: absScale,
        });
      }}
    >
      {showChairSquare && (
        <Rect
          width={chairSide}
          height={chairSide}
          offsetX={chairSide / 2}
          offsetY={chairSide / 2}
          fill={chairFill}
          stroke={chairStroke}
          strokeWidth={magnetized ? 1.25 : 1}
          listening={false}
        />
      )}
      {/* Hit + selección + bounds del Transformer = caja del icono o del texto */}
      <Rect
        width={boundsW}
        height={boundsH}
        offsetX={boundsW / 2}
        offsetY={boundsH / 2}
        fill="rgba(0,0,0,0.001)"
        stroke={selected ? "#f59e0b" : undefined}
        strokeWidth={selected ? 1.5 : 0}
        dash={selected ? [4, 3] : undefined}
      />
      {isText && textLayout ? (
        <Text
          text={textLayout.label}
          fontSize={textLayout.fontSize}
          fontStyle={item.fontStyle || "normal"}
          fill={item.fill || "#0f172a"}
          align={item.align || "center"}
          verticalAlign="middle"
          width={boundsW}
          height={boundsH}
          offsetX={boundsW / 2}
          offsetY={boundsH / 2}
          listening={false}
          wrap="word"
        />
      ) : iconImage && iconNatural?.w && iconNatural?.h ? (
        <KonvaImage
          image={iconImage}
          offsetX={boundsW / 2}
          offsetY={boundsH / 2}
          width={boundsW}
          height={boundsH}
          listening={false}
        />
      ) : pathD ? (
        <Path
          data={pathD}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeW / silScale}
          scaleX={silScale}
          scaleY={silScale}
          offsetX={VB / 2}
          offsetY={VB / 2}
          lineJoin="round"
          lineCap="round"
          listening={false}
        />
      ) : (
        <Rect
          offsetX={w / 2}
          offsetY={h / 2}
          width={w}
          height={h}
          fill={fill}
          cornerRadius={3}
          listening={false}
        />
      )}
    </Group>
  );
}, (prev, next) =>
  prev.item === next.item &&
  prev.selected === next.selected &&
  prev.draggable === next.draggable &&
  prev.onSelect === next.onSelect &&
  prev.onContextMenu === next.onContextMenu &&
  prev.onDblClick === next.onDblClick &&
  prev.onMouseEnter === next.onMouseEnter &&
  prev.onMouseLeave === next.onMouseLeave &&
  prev.onMouseMove === next.onMouseMove &&
  prev.onDragStart === next.onDragStart &&
  prev.onDragMove === next.onDragMove &&
  prev.onDragEnd === next.onDragEnd &&
  prev.onTransformEnd === next.onTransformEnd);

function PaletteIcon({ type, color }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    // Texto: sin icono/silueta TT — el botón muestra solo el label "Texto".
    if (type === "text") {
      setSrc(null);
      return undefined;
    }
    let cancelled = false;
    const fileUrl = stagePlotIconImgSrc(type);
    if (fileUrl) {
      fetch(fileUrl)
        .then((r) => r.text())
        .then((svg) => {
          if (cancelled) return;
          const colored = svg.replace(/currentColor/gi, color || "#334155");
          setSrc(
            `data:image/svg+xml;charset=utf-8,${encodeURIComponent(colored)}`,
          );
        })
        .catch(() => {
          if (!cancelled) {
            const html = stagePlotSilhouetteSvgMarkup(type, color, 22);
            setSrc(
              html
                ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(html)}`
                : null,
            );
          }
        });
      return () => {
        cancelled = true;
      };
    }
    const html = stagePlotSilhouetteSvgMarkup(type, color, 22);
    if (html) {
      setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(html)}`);
    } else {
      setSrc(null);
    }
    return () => {
      cancelled = true;
    };
  }, [type, color]);

  if (type === "text") return null;

  if (!src) {
    return (
      <span
        className="inline-block h-3 w-3 rounded-sm"
        style={{ background: color }}
      />
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="h-[22px] w-[22px] shrink-0 object-contain"
    />
  );
}

/**
 * Escenario por programa (stage plot + channel list).
 */
export default function ProgramStagePlot({
  supabase,
  program,
  onBack,
  readOnly = false,
  embedded = false,
}) {
  const { isEditor, isManagement, isAdmin } = useAuth();
  const canEdit = !readOnly && (isEditor || isManagement || isAdmin);
  const { confirm, dialog } = useConfirmDialog();
  const { roster } = useGiraRoster(supabase, program);

  const [loading, setLoading] = useState(true);
  const [payload, setPayload] = useState(() => normalizeStagePlotPayload(null));
  const [nombre, setNombre] = useState("");
  const [plotsMeta, setPlotsMeta] = useState([]); // [{id,nombre,sort_order,bloque_ids,evento_ids}]
  const [activePlotId, setActivePlotId] = useState(null);
  const [bloqueIds, setBloqueIds] = useState([]);
  const [eventoIds, setEventoIds] = useState([]);
  const [repertorioBlocks, setRepertorioBlocks] = useState([]);
  const [giraGrupos, setGiraGrupos] = useState([]);
  const [giraEvents, setGiraEvents] = useState([]);
  const [assocOpen, setAssocOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedFormationId, setSelectedFormationId] = useState(null);
  const [rightPanel, setRightPanel] = useState("organico"); // channels | organico
  const [syncState, setSyncState] = useState("idle"); // idle|dirty|saving|saved|error
  const [paletteCat, setPaletteCat] = useState(null);
  const activePlotIdRef = useRef(null);
  const bloqueIdsRef = useRef([]);
  const eventoIdsRef = useRef([]);
  const dirtyEventosRef = useRef(false);
  const zCounterRef = useRef(1);
  const saveTimerRef = useRef(null);
  const skipSaveRef = useRef(true);
  const stageWrapRef = useRef(null);
  const labelEditorRef = useRef(null);
  const viewportRef = useRef({ scale: 1, x: 40, y: 40 });
  const [canvasSize, setCanvasSize] = useState({ w: 640, h: 420 });
  const [viewport, setViewport] = useState({ scale: 1, x: 40, y: 40 });
  const [paletteDrag, setPaletteDrag] = useState(null); // { type, name, color, x, y }
  /** Vista previa de params mientras se arrastra un asa de formación. */
  const [formationResizePreview, setFormationResizePreview] = useState(null);
  /** Eje X del director mientras se arrastra una formación cerca del centro. */
  const [formationCenterGuideX, setFormationCenterGuideX] = useState(null);
  const transformerRef = useRef(null);
  const konvaStageRef = useRef(null);
  const itemNodeRefs = useRef(new Map());
  const userZoomedRef = useRef(false);
  const panDragRef = useRef(null);
  const spaceHeldRef = useRef(false);
  const [isPanning, setIsPanning] = useState(false);
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [stageBgHover, setStageBgHover] = useState(false);
  const selectedIdsRef = useRef(selectedIds);
  const selectedFormationIdRef = useRef(selectedFormationId);
  const payloadRef = useRef(payload);
  const historyRef = useRef({ past: [], future: [] });
  const skipHistoryRef = useRef(false);
  /** Batches multi-node Transformer transformend into one history entry. */
  const pendingTransformRef = useRef(null);
  /** Orígenes de posición al iniciar arrastre grupal. */
  const dragGroupRef = useRef(null);
  /** Vista previa magnética durante arrastre (plaza objetivo). */
  const [itemSnapPreview, setItemSnapPreview] = useState(null);
  /** Menú contextual de ítem (clic derecho). */
  const [itemContextMenu, setItemContextMenu] = useState(null);
  /** Menú contextual de formación (clic derecho). */
  const [formationContextMenu, setFormationContextMenu] = useState(null);
  /** Dropdown Copiar… en la barra inferior (formación seleccionada). */
  const [formationCopyMenuOpen, setFormationCopyMenuOpen] = useState(false);
  const formationCopyMenuRef = useRef(null);
  /** Tooltip hover sobre ítem dibujado. */
  const [itemHoverTooltip, setItemHoverTooltip] = useState(null);
  const itemDraggingRef = useRef(false);
  const [lienzoOpen, setLienzoOpen] = useState(false);
  const lienzoBtnRef = useRef(null);
  /** Imperative flush of Lienzo Ancho/Alto/Líneas drafts (blur is unreliable on close). */
  const lienzoFlushRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);

  useEffect(() => {
    selectedFormationIdRef.current = selectedFormationId;
  }, [selectedFormationId]);

  useEffect(() => {
    payloadRef.current = payload;
  }, [payload]);

  useEffect(() => {
    activePlotIdRef.current = activePlotId;
  }, [activePlotId]);

  useEffect(() => {
    bloqueIdsRef.current = bloqueIds;
  }, [bloqueIds]);

  useEffect(() => {
    eventoIdsRef.current = eventoIds;
  }, [eventoIds]);

  const confirmedRoster = useMemo(
    () => (roster || []).filter(isConfirmedConvocadoForSeatingReports),
    [roster],
  );

  const organicoRoster = useMemo(() => {
    if (!bloqueIds?.length) return confirmedRoster;
    const memberIds = new Set();
    let anyGrupos = false;
    for (const bid of bloqueIds) {
      const block = repertorioBlocks.find((b) => Number(b.id) === Number(bid));
      if (!block) continue;
      const ids = integranteIdsForRepertorioGrupos(
        giraGrupos,
        repertorioGrupoIdsFromBlock(block),
      );
      if (!ids) {
        // Bloque sin grupos → aporta todo el roster confirmado
        confirmedRoster.forEach((m) => memberIds.add(String(m.id)));
        anyGrupos = true;
        continue;
      }
      anyGrupos = true;
      ids.forEach((id) => memberIds.add(String(id)));
    }
    if (!anyGrupos) return confirmedRoster;
    return confirmedRoster.filter((m) => memberIds.has(String(m.id)));
  }, [bloqueIds, repertorioBlocks, giraGrupos, confirmedRoster]);

  const syncZCounter = useCallback((items) => {
    zCounterRef.current =
      (items || []).reduce((m, it) => Math.max(m, Number(it.z) || 0), 0) + 1;
  }, []);

  const pruneSelectionToPayload = useCallback((nextPayload) => {
    const ids = new Set((nextPayload?.items || []).map((it) => it.id));
    setSelectedIds((prev) => prev.filter((id) => ids.has(id)));
    const formIds = new Set(
      (nextPayload?.formations || []).map((f) => f.id),
    );
    setSelectedFormationId((prev) =>
      prev && formIds.has(prev) ? prev : null,
    );
  }, []);

  /** Commit user edit: push prior snapshot to past, clear future. */
  const commitPayload = useCallback((updater) => {
    const prev = payloadRef.current;
    const nextRaw = typeof updater === "function" ? updater(prev) : updater;
    const next = normalizeStagePlotPayload(nextRaw);
    if (JSON.stringify(prev) === JSON.stringify(next)) return;
    if (!skipHistoryRef.current) {
      const hist = historyRef.current;
      hist.past.push(cloneStagePlotPayload(prev));
      while (hist.past.length > HISTORY_LIMIT) hist.past.shift();
      hist.future = [];
    }
    payloadRef.current = next;
    setPayload(next);
  }, []);

  /** Move formation to absolute x,y and reanchor slotted items (keep slotId). */
  const commitFormationPosition = useCallback(
    (formationId, x, y) => {
      const fid = String(formationId);
      commitPayload((prev) => {
        const formations = (prev.formations || []).map((f) =>
          String(f.id) === fid ? { ...f, x, y } : f,
        );
        const items = reanchorItemsToFormations(
          formations,
          prev.items,
          prev.stage,
          [fid],
        );
        return { ...prev, formations, items };
      });
    },
    [commitPayload],
  );

  const undo = useCallback(() => {
    const hist = historyRef.current;
    if (!hist.past.length) return;
    const current = cloneStagePlotPayload(payloadRef.current);
    const prev = hist.past.pop();
    hist.future.push(current);
    while (hist.future.length > HISTORY_LIMIT) hist.future.shift();
    skipHistoryRef.current = true;
    payloadRef.current = prev;
    setPayload(prev);
    syncZCounter(prev.items);
    pruneSelectionToPayload(prev);
    queueMicrotask(() => {
      skipHistoryRef.current = false;
    });
  }, [pruneSelectionToPayload, syncZCounter]);

  const redo = useCallback(() => {
    const hist = historyRef.current;
    if (!hist.future.length) return;
    const current = cloneStagePlotPayload(payloadRef.current);
    const next = hist.future.pop();
    hist.past.push(current);
    while (hist.past.length > HISTORY_LIMIT) hist.past.shift();
    skipHistoryRef.current = true;
    payloadRef.current = next;
    setPayload(next);
    syncZCounter(next.items);
    pruneSelectionToPayload(next);
    queueMicrotask(() => {
      skipHistoryRef.current = false;
    });
  }, [pruneSelectionToPayload, syncZCounter]);

  const deleteSelectedFormation = useCallback(() => {
    if (!canEdit) return false;
    const id = selectedFormationIdRef.current;
    if (!id) return false;
    commitPayload((prev) => ({
      ...prev,
      formations: (prev.formations || []).filter((f) => f.id !== id),
      items: clearFormationAnchors(prev.items, id),
    }));
    setSelectedFormationId(null);
    return true;
  }, [canEdit, commitPayload]);

  const deleteSelected = useCallback(() => {
    if (!canEdit) return false;
    const ids = selectedIdsRef.current;
    if (!ids.length) return false;
    const idSet = new Set(ids);
    commitPayload((prev) => ({
      ...prev,
      items: prev.items.filter((it) => !idSet.has(it.id)),
    }));
    setSelectedIds([]);
    return true;
  }, [canEdit, commitPayload]);

  const deleteKeyboardSelection = useCallback(() => {
    if (selectedFormationIdRef.current) return deleteSelectedFormation();
    if (selectedIdsRef.current.length) return deleteSelected();
    return false;
  }, [deleteSelected, deleteSelectedFormation]);

  const moveSelectedItemsByKeyboard = useCallback(
    (dx, dy) => {
      if (!canEdit || (dx === 0 && dy === 0)) return false;
      const ids = selectedIdsRef.current;
      if (!ids.length) return false;
      const idSet = new Set(ids);
      commitPayload((prev) => {
        const nextItems = prev.items.map((it) =>
          idSet.has(it.id)
            ? { ...it, x: it.x + dx, y: it.y + dy, slotId: null }
            : it,
        );
        const movedGroupIds = new Set(
          prev.items
            .filter((it) => idSet.has(it.id) && it.groupId)
            .map((it) => it.groupId),
        );
        const groups =
          movedGroupIds.size > 0
            ? (prev.groups || []).map((g) =>
                movedGroupIds.has(g.id) && g.alignAnchor
                  ? {
                      ...g,
                      alignAnchor: {
                        x: g.alignAnchor.x + dx,
                        y: g.alignAnchor.y + dy,
                      },
                    }
                  : g,
              )
            : prev.groups;
        return { ...prev, items: nextItems, groups };
      });
      return true;
    },
    [canEdit, commitPayload],
  );

  const moveSelectedFormationByKeyboard = useCallback(
    (dx, dy) => {
      if (!canEdit || (dx === 0 && dy === 0)) return false;
      const id = selectedFormationIdRef.current;
      if (!id) return false;
      const fid = String(id);
      const fm = (payloadRef.current.formations || []).find(
        (f) => String(f.id) === fid,
      );
      if (!fm) return false;
      // Same path as handleFormationDragEnd: absolute position + reanchor (keep slotId).
      commitFormationPosition(fid, fm.x + dx, fm.y + dy);
      return true;
    },
    [canEdit, commitFormationPosition],
  );

  const moveKeyboardSelection = useCallback(
    (dx, dy) => {
      if (selectedFormationIdRef.current) {
        return moveSelectedFormationByKeyboard(dx, dy);
      }
      if (selectedIdsRef.current.length) {
        return moveSelectedItemsByKeyboard(dx, dy);
      }
      return false;
    },
    [moveSelectedFormationByKeyboard, moveSelectedItemsByKeyboard],
  );

  useEffect(() => {
    if (!fullscreen) return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      if (isEditableKeyboardTarget(e.target)) return;
      if (lienzoOpen || itemContextMenu || formationContextMenu) return;
      e.preventDefault();
      setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen, lienzoOpen, itemContextMenu, formationContextMenu]);

  useEffect(() => {
    if (!canEdit) return undefined;
    const onKeyDown = (e) => {
      if (isEditableKeyboardTarget(e.target)) return;
      if (lienzoOpen || itemContextMenu || formationContextMenu) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key;
      if (mod) {
        const k = key?.toLowerCase?.() || "";
        if (k === "z" && !e.shiftKey) {
          e.preventDefault();
          undo();
          return;
        }
        if (k === "y" || (k === "z" && e.shiftKey)) {
          e.preventDefault();
          redo();
          return;
        }
      }
      const arrow = ARROW_KEY_DELTA[key];
      if (arrow) {
        const hasSelection =
          !!selectedFormationIdRef.current ||
          selectedIdsRef.current.length > 0;
        if (hasSelection) {
          const step = mod ? KEYBOARD_NUDGE_STEP : KEYBOARD_MOVE_STEP;
          if (moveKeyboardSelection(arrow.dx * step, arrow.dy * step)) {
            e.preventDefault();
          }
          return;
        }
      }
      if (key !== "Delete" && key !== "Backspace") return;
      const hasSelection =
        !!selectedFormationIdRef.current || selectedIdsRef.current.length > 0;
      if (!hasSelection) return;
      if (deleteKeyboardSelection()) {
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canEdit,
    lienzoOpen,
    itemContextMenu,
    formationContextMenu,
    undo,
    redo,
    deleteKeyboardSelection,
    moveKeyboardSelection,
  ]);

  useEffect(() => {
    if (!formationCopyMenuOpen) return undefined;
    const onPointerDown = (e) => {
      if (formationCopyMenuRef.current?.contains(e.target)) return;
      setFormationCopyMenuOpen(false);
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") setFormationCopyMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [formationCopyMenuOpen]);

  useEffect(() => {
    if (!selectedFormationId) setFormationCopyMenuOpen(false);
  }, [selectedFormationId]);

  const resolveItemNode = useCallback((id) => {
    let node = itemNodeRefs.current.get(id);
    if (!node && konvaStageRef.current) {
      const found = konvaStageRef.current.find(".stage-plot-item");
      const list =
        typeof found.toArray === "function" ? found.toArray() : [...found];
      node = list.find((n) => n.id() === String(id)) || null;
      if (node) itemNodeRefs.current.set(id, node);
    }
    return node || null;
  }, []);

  const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedItems = useMemo(
    () => payload.items.filter((i) => selectedIdSet.has(i.id)),
    [payload.items, selectedIdSet],
  );
  const selectedNodeScale = useMemo(() => {
    if (!selectedItems.length) return 1;
    return Math.max(
      1,
      ...selectedItems.map((item) => (item.scale > 0 ? item.scale : 1)),
    );
  }, [selectedItems]);
  const [transformerLiveNodeScale, setTransformerLiveNodeScale] = useState(1);

  useEffect(() => {
    setTransformerLiveNodeScale(selectedNodeScale);
  }, [selectedIds, selectedNodeScale]);

  const handleTransformerTransform = useCallback(() => {
    const tr = transformerRef.current;
    if (!tr) return;
    const nodes = tr.nodes();
    if (!nodes.length) return;
    const next = maxAbsScaleFromNodes(nodes);
    setTransformerLiveNodeScale((prev) =>
      Math.abs(prev - next) > 0.01 ? next : prev,
    );
  }, []);

  // Adjuntar Transformer a todos los nodos seleccionados (no formaciones).
  useLayoutEffect(() => {
    const tr = transformerRef.current;
    if (!tr) return;

    const attach = () => {
      if (!selectedIds.length || selectedFormationId) {
        tr.nodes([]);
        tr.getLayer()?.batchDraw();
        return;
      }
      const nodes = selectedIds
        .map((id) => resolveItemNode(id))
        .filter(Boolean);
      tr.nodes(nodes);
      if (nodes.length) {
        tr.moveToTop();
        tr.forceUpdate();
      }
      tr.getLayer()?.batchDraw();
    };

    attach();
    const t = requestAnimationFrame(attach);
    return () => cancelAnimationFrame(t);
  }, [selectedIds, selectedFormationId, payload.items, viewport.scale, selectedNodeScale, resolveItemNode]);

  const categories = useMemo(() => stagePlotCategories(), []);
  const channels = useMemo(() => deriveStagePlotChannels(payload), [payload]);
  const organicoRows = useMemo(
    () => buildStagePlotOrganicoCompare(payload.items, organicoRoster),
    [payload.items, organicoRoster],
  );
  const organicoSummary = useMemo(
    () => summarizeStagePlotOrganico(organicoRows),
    [organicoRows],
  );
  /** Un solo ítem: editores de etiqueta / canal; null si 0 o varios. */
  const selected =
    selectedItems.length === 1 ? selectedItems[0] : null;
  const multiSelected = selectedItems.length > 1;
  const selectedFormation = useMemo(
    () =>
      (payload.formations || []).find((f) => f.id === selectedFormationId) ||
      null,
    [payload.formations, selectedFormationId],
  );
  const selectedFormationCenteredOnConductor = useMemo(() => {
    if (
      !selectedFormation ||
      !["arc", "horseshoe", "rect", "line"].includes(selectedFormation.kind)
    ) {
      return false;
    }
    return isFormationCenteredOnConductor(
      selectedFormation,
      payload.items,
      payload.stage,
    );
  }, [selectedFormation, payload.items, payload.stage]);
  const sharedAlignGroup = useMemo(
    () => resolveSharedAlignGroup(payload, selectedIds),
    [payload, selectedIds],
  );
  const hasConductor = useMemo(
    () => payload.items.some((it) => it.type === "conductor"),
    [payload.items],
  );

  const patchStage = useCallback(
    (patch) => {
      if (!canEdit) return;
      const sizePatch =
        patch.widthCm != null ||
        patch.heightCm != null ||
        patch.width != null ||
        patch.height != null;
      if (sizePatch) {
        // Keep current zoom/pan so Ancho/Alto changes are visible on screen.
        userZoomedRef.current = true;
      }
      commitPayload((prev) => applyStagePlotStagePatch(prev, patch));
    },
    [canEdit, commitPayload],
  );

  const addOrFocusConductor = useCallback(() => {
    if (!canEdit) return;
    const prev = payloadRef.current;
    const existing = prev.items.find((it) => it.type === "conductor");
    if (existing) {
      setSelectedFormationId(null);
      setSelectedIds([existing.id]);
      setLienzoOpen(false);
      return;
    }
    const sw = prev.stage?.width || stagePlotCmToPx(STAGE_PLOT_DEFAULT_WIDTH_CM);
    const sh = prev.stage?.height || stagePlotCmToPx(STAGE_PLOT_DEFAULT_HEIGHT_CM);
    const { x, y } = stagePlotConductorPosition(sw, sh);
    const z = zCounterRef.current++;
    const item = createStagePlotItem("conductor", x, y, z);
    commitPayload((p) => ({ ...p, items: [...p.items, item] }));
    setSelectedFormationId(null);
    setSelectedIds([item.id]);
    setLienzoOpen(false);
  }, [canEdit, commitPayload]);

  const clearEntireStage = useCallback(async () => {
    if (!canEdit) return;
    const ok = await confirm({
      title: "Borrar todo",
      message:
        "¿Borrar todo el escenario? Se eliminarán todos los instrumentos y formaciones.",
      confirmText: "Borrar",
      cancelText: "Cancelar",
      destructive: true,
      overlayClassName: fullscreen ? "z-[10000]" : undefined,
    });
    if (!ok) return;
    commitPayload((prev) => ({
      ...prev,
      items: [],
      formations: [],
      groups: [],
    }));
    setSelectedIds([]);
    setSelectedFormationId(null);
    syncZCounter([]);
    setLienzoOpen(false);
  }, [canEdit, commitPayload, confirm, fullscreen, syncZCounter]);

  const renderFormations = useMemo(() => {
    const list = payload.formations || [];
    if (!formationResizePreview) return list;
    return list.map((f) =>
      f.id === formationResizePreview.formationId
        ? { ...f, params: formationResizePreview.params }
        : f,
    );
  }, [payload.formations, formationResizePreview]);

  const formationForHandles = useMemo(() => {
    if (!selectedFormationId) return null;
    return (
      renderFormations.find((f) => f.id === selectedFormationId) || null
    );
  }, [renderFormations, selectedFormationId]);

  /** Asas del Transformer: ~7px en pantalla; compensar zoom del Stage y escala del nodo. */
  const viewportScale = Math.max(viewport.scale, ZOOM_MIN);
  const transformerNodeScale = Math.max(transformerLiveNodeScale, 1);
  const transformerScreenDenom = viewportScale * transformerNodeScale;
  const transformerAnchorSize = TRANSFORMER_HANDLE_SCREEN_PX / transformerScreenDenom;
  const transformerBorderWidth = 1 / transformerScreenDenom;
  const transformerRotateOffset = 20 / transformerScreenDenom;
  const transformerAnchorCornerRadius = 1.5 / transformerScreenDenom;
  /** Asas de formación: solo compensan zoom (coords de capa, sin escala de ítem). */
  const formationHandleSize = TRANSFORMER_HANDLE_SCREEN_PX / viewportScale;
  const formationHandleStroke = 1.5 / viewportScale;

  // Asas de la formación seleccionada por encima de ítems (y del Transformer vacío).
  useLayoutEffect(() => {
    if (!formationForHandles || !canEdit) return undefined;
    const stage = konvaStageRef.current;
    if (!stage) return undefined;

    const bringHandlesToTop = () => {
      const handles = stage.findOne(".stage-plot-formation-handles");
      if (!handles) return;
      handles.moveToTop();
      handles.getLayer()?.batchDraw();
    };

    bringHandlesToTop();
    const t = requestAnimationFrame(bringHandlesToTop);
    return () => cancelAnimationFrame(t);
  }, [
    formationForHandles,
    canEdit,
    payload.items,
    viewport.scale,
    formationHandleSize,
  ]);

  const fitViewport = useCallback((boxW, boxH) => {
    const cur = payloadRef.current;
    const next = computeStagePlotViewportFit({
      boxW,
      boxH,
      stageWidth: cur.stage.width,
      stageHeight: cur.stage.height,
      items: cur.items,
      zoomMin: ZOOM_MIN,
      zoomMax: ZOOM_MAX,
    });
    if (next) setViewport(next);
  }, []);

  const applyPlotToEditor = useCallback(
    (plotRow, { resetHistory = true } = {}) => {
      const p = normalizeStagePlotPayload(plotRow?.payload);
      if (resetHistory) historyRef.current = { past: [], future: [] };
      payloadRef.current = p;
      setPayload(p);
      setNombre(plotRow?.nombre || "");
      setBloqueIds(plotRow?.bloque_ids || []);
      setEventoIds(plotRow?.evento_ids || []);
      dirtyEventosRef.current = false;
      setActivePlotId(plotRow?.id || null);
      activePlotIdRef.current = plotRow?.id || null;
      setSelectedIds([]);
      setSelectedFormationId(null);
      syncZCounter(p.items);
      userZoomedRef.current = false;
    },
    [syncZCounter],
  );

  const loadMeta = useCallback(async () => {
    if (!supabase || !program?.id) return { plots: [], error: null };
    const [{ data: plots, error }, blocksRes, gruposRes, eventsRes] =
      await Promise.all([
        listStagePlotsByPrograma(supabase, program.id),
        supabase
          .from("programas_repertorios")
          .select(
            "id, orden, nombre, programas_repertorios_grupos ( id_grupo, giras_grupos ( id, nombre, color ) )",
          )
          .eq("id_programa", program.id)
          .order("orden", { ascending: true }),
        fetchGiraGrupos(supabase, program.id),
        listGiraStagePlotCandidateEvents(supabase, program.id),
      ]);
    if (error) return { plots: [], error };
    const { data: linkMap } = await listStagePlotEventLinks(
      supabase,
      (plots || []).map((p) => p.id),
    );
    const withEvents = (plots || []).map((p) => ({
      ...p,
      evento_ids: linkMap?.get(p.id) || [],
    }));
    setPlotsMeta(withEvents);
    setRepertorioBlocks(blocksRes.data || []);
    setGiraGrupos(gruposRes.grupos || []);
    setGiraEvents(eventsRes.data || []);
    return { plots: withEvents, error: null };
  }, [supabase, program?.id]);

  const load = useCallback(async () => {
    if (!supabase || !program?.id) return;
    setLoading(true);
    skipSaveRef.current = true;
    skipHistoryRef.current = true;
    userZoomedRef.current = false;
    const { plots, error } = await loadMeta();
    if (error) {
      console.error(error);
      toast.error(error.message || "No se pudo cargar el plano");
      setLoading(false);
      skipHistoryRef.current = false;
      return;
    }
    let active = plots.find((p) => p.id === activePlotIdRef.current) || plots[0];
    if (!active) {
      const created = await createStagePlot(supabase, program.id, {
        nombre: "Lienzo 1",
        sort_order: 0,
      });
      if (created.error) {
        toast.error(created.error.message || "No se pudo crear el lienzo");
        setLoading(false);
        skipHistoryRef.current = false;
        return;
      }
      active = { ...created.data, evento_ids: [] };
      setPlotsMeta([active]);
    }
    applyPlotToEditor(active);
    setSyncState("idle");
    setLoading(false);
    requestAnimationFrame(() => {
      skipSaveRef.current = false;
      skipHistoryRef.current = false;
    });
  }, [supabase, program?.id, loadMeta, applyPlotToEditor]);

  useEffect(() => {
    load();
  }, [load]);

  const switchToPlot = useCallback(
    async (plotId) => {
      if (!plotId || plotId === activePlotIdRef.current) return;
      // Flush pending save of current plot before switching
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      if (canEdit && activePlotIdRef.current) {
        skipSaveRef.current = true;
        await upsertStagePlot(supabase, program.id, {
          id: activePlotIdRef.current,
          payload: payloadRef.current,
          nombre,
          bloque_ids: bloqueIdsRef.current,
        });
        if (dirtyEventosRef.current) {
          await setStagePlotEventos(
            supabase,
            activePlotIdRef.current,
            eventoIdsRef.current,
          );
          dirtyEventosRef.current = false;
        }
      }
      const meta = plotsMeta.find((p) => p.id === plotId);
      if (!meta) return;
      skipSaveRef.current = true;
      skipHistoryRef.current = true;
      applyPlotToEditor(meta);
      setSyncState("idle");
      requestAnimationFrame(() => {
        skipSaveRef.current = false;
        skipHistoryRef.current = false;
      });
    },
    [canEdit, supabase, program?.id, nombre, plotsMeta, applyPlotToEditor],
  );

  const handleCreatePlot = useCallback(async () => {
    if (!canEdit) return;
    const n = plotsMeta.length + 1;
    const { data, error } = await createStagePlot(supabase, program.id, {
      nombre: `Lienzo ${n}`,
    });
    if (error) {
      toast.error(error.message || "No se pudo crear el lienzo");
      return;
    }
    const row = { ...data, evento_ids: [] };
    setPlotsMeta((prev) => [...prev, row]);
    await switchToPlot(row.id);
    // switchToPlot may not find row yet in plotsMeta — apply directly
    skipSaveRef.current = true;
    skipHistoryRef.current = true;
    applyPlotToEditor(row);
    requestAnimationFrame(() => {
      skipSaveRef.current = false;
      skipHistoryRef.current = false;
    });
  }, [
    canEdit,
    supabase,
    program?.id,
    plotsMeta.length,
    switchToPlot,
    applyPlotToEditor,
  ]);

  const handleDeletePlot = useCallback(async () => {
    if (!canEdit || !activePlotId) return;
    if (plotsMeta.length <= 1) {
      toast.error("Debe quedar al menos un lienzo");
      return;
    }
    const ok = await confirm({
      title: "Eliminar lienzo",
      message: `¿Eliminar «${nombre || "este lienzo"}»? No se puede deshacer.`,
      confirmText: "Eliminar",
      destructive: true,
    });
    if (!ok) return;
    const { error } = await deleteStagePlot(supabase, activePlotId);
    if (error) {
      toast.error(error.message || "No se pudo eliminar");
      return;
    }
    const remaining = plotsMeta.filter((p) => p.id !== activePlotId);
    setPlotsMeta(remaining);
    skipSaveRef.current = true;
    skipHistoryRef.current = true;
    applyPlotToEditor(remaining[0]);
    requestAnimationFrame(() => {
      skipSaveRef.current = false;
      skipHistoryRef.current = false;
    });
  }, [
    canEdit,
    activePlotId,
    plotsMeta,
    nombre,
    confirm,
    supabase,
    applyPlotToEditor,
  ]);

  // Medir contenedor y encajar el plano completo (salvo zoom manual).
  useEffect(() => {
    if (loading) return undefined;
    const el = stageWrapRef.current;
    if (!el) return undefined;

    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 40 || h < 40) return;
      setCanvasSize({ w, h });
      if (!userZoomedRef.current) {
        fitViewport(w, h);
      }
    };

    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(el);
    const t = window.setTimeout(measure, 50);
    const t2 = window.setTimeout(measure, 200);
    return () => {
      ro.disconnect();
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [loading, fitViewport, activePlotId]);

  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    userZoomedRef.current = true;

    setViewport((prev) => {
      const oldScale = prev.scale;
      const direction = e.evt.deltaY > 0 ? -1 : 1;
      let newScale =
        direction > 0 ? oldScale * ZOOM_FACTOR : oldScale / ZOOM_FACTOR;
      newScale = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newScale));
      const mousePointTo = {
        x: (pointer.x - prev.x) / oldScale,
        y: (pointer.y - prev.y) / oldScale,
      };
      return {
        scale: newScale,
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      };
    });
  }, []);

  const resetZoom = useCallback(() => {
    userZoomedRef.current = false;
    const el = stageWrapRef.current;
    if (el) {
      fitViewport(el.clientWidth, el.clientHeight);
    } else {
      fitViewport(canvasSize.w, canvasSize.h);
    }
  }, [fitViewport, canvasSize.w, canvasSize.h]);

  useEffect(() => {
    const isTypingTarget = (el) => {
      if (!el || !(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        el.isContentEditable
      );
    };

    const onKeyDown = (e) => {
      if (e.code !== "Space" || e.repeat || isTypingTarget(e.target)) return;
      e.preventDefault();
      spaceHeldRef.current = true;
      setSpaceHeld(true);
    };
    const onKeyUp = (e) => {
      if (e.code === "Space") {
        spaceHeldRef.current = false;
        setSpaceHeld(false);
      }
    };
    const onBlur = () => {
      spaceHeldRef.current = false;
      setSpaceHeld(false);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, []);

  const endStagePan = useCallback(() => {
    panDragRef.current = null;
    setIsPanning(false);
  }, []);

  const startStagePan = useCallback(
    (clientX, clientY) => {
      const vp = viewportRef.current;
      panDragRef.current = {
        startClientX: clientX,
        startClientY: clientY,
        startVpX: vp.x,
        startVpY: vp.y,
      };
      setIsPanning(true);
      userZoomedRef.current = true;

      const move = (ev) => {
        const pan = panDragRef.current;
        if (!pan) return;
        setViewport({
          scale: viewportRef.current.scale,
          x: pan.startVpX + (ev.clientX - pan.startClientX),
          y: pan.startVpY + (ev.clientY - pan.startClientY),
        });
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
        document.removeEventListener("pointercancel", up);
        endStagePan();
      };

      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    },
    [endStagePan],
  );

  const persist = useCallback(
    async (nextPayload, nextNombre, nextBloqueIds, nextEventoIds) => {
      if (!canEdit || !supabase || !program?.id) return;
      const plotId = activePlotIdRef.current;
      setSyncState("saving");
      const { data, error } = await upsertStagePlot(supabase, program.id, {
        id: plotId,
        payload: nextPayload,
        nombre: nextNombre,
        bloque_ids: nextBloqueIds ?? bloqueIdsRef.current,
      });
      if (error) {
        console.error(error);
        setSyncState("error");
        toast.error(error.message || "Error al guardar el plano");
        return;
      }
      if (data?.id && data.id !== plotId) {
        activePlotIdRef.current = data.id;
        setActivePlotId(data.id);
      }
      const idForEvents = data?.id || plotId;
      if (idForEvents && dirtyEventosRef.current) {
        const { error: evErr } = await setStagePlotEventos(
          supabase,
          idForEvents,
          nextEventoIds ?? eventoIdsRef.current,
        );
        if (evErr) {
          console.error(evErr);
          toast.error(evErr.message || "Error al guardar eventos del lienzo");
          setSyncState("error");
          return;
        }
        dirtyEventosRef.current = false;
      }
      setPlotsMeta((prev) => {
        const row = {
          ...(data || {}),
          evento_ids: nextEventoIds ?? eventoIdsRef.current,
          bloque_ids: nextBloqueIds ?? bloqueIdsRef.current,
          nombre: nextNombre || "",
        };
        if (!data?.id) return prev;
        const idx = prev.findIndex((p) => p.id === data.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = { ...prev[idx], ...row };
          return copy;
        }
        return [...prev, row];
      });
      setSyncState("saved");
    },
    [canEdit, supabase, program?.id],
  );

  useEffect(() => {
    if (skipSaveRef.current || !canEdit) return;
    setSyncState("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist(payload, nombre, bloqueIds, eventoIds);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [payload, nombre, bloqueIds, eventoIds, canEdit, persist]);

  const toggleBloqueId = useCallback((id) => {
    const n = Number(id);
    if (!Number.isFinite(n)) return;
    setBloqueIds((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );
  }, []);

  const toggleEventoId = useCallback((id) => {
    const n = Number(id);
    if (!Number.isFinite(n)) return;
    dirtyEventosRef.current = true;
    setEventoIds((prev) =>
      prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n],
    );
  }, []);

  const patchItems = (updater) => {
    commitPayload((prev) => {
      const items = updater(prev.items);
      return { ...prev, items };
    });
  };

  const patchFormationsAndReanchor = (updater) => {
    commitPayload((prev) => {
      const prevFormations = prev.formations || [];
      const formations = updater(prevFormations);
      const prevById = new Map(prevFormations.map((f) => [f.id, f]));
      const redistributeSlotsForFormationIds = formations
        .filter((f) => {
          const old = prevById.get(f.id);
          return old && old.slots !== f.slots;
        })
        .map((f) => f.id);
      const items = reanchorItemsToFormations(
        formations,
        prev.items,
        prev.stage,
        null,
        redistributeSlotsForFormationIds,
      );
      return { ...prev, formations, items };
    });
  };

  const addFormation = (kind) => {
    if (!canEdit) return;
    const sw = payloadRef.current.stage?.width || 900;
    const sh = payloadRef.current.stage?.height || 560;
    // Centro un poco upstage del medio (director suele estar abajo)
    const fm = createStagePlotFormation(kind, sw / 2, sh * 0.42, 8);
    commitPayload((prev) => ({
      ...prev,
      formations: [...(prev.formations || []), fm],
    }));
    setSelectedIds([]);
    setSelectedFormationId(fm.id);
  };

  const updateSelectedFormation = (patch) => {
    if (!canEdit || !selectedFormationId) return;
    patchFormationsAndReanchor((formations) =>
      formations.map((f) => {
        if (f.id !== selectedFormationId) return f;
        if (patch.params) {
          return {
            ...f,
            ...patch,
            params: { ...f.params, ...patch.params },
          };
        }
        return { ...f, ...patch };
      }),
    );
  };

  const centerSelectedFormationOnConductor = () => {
    if (!canEdit || !selectedFormationId) return;
    const prev = payloadRef.current;
    const fm = (prev.formations || []).find((f) => f.id === selectedFormationId);
    if (!fm || !["arc", "horseshoe", "rect", "line"].includes(fm.kind)) return;
    if (isFormationCenteredOnConductor(fm, prev.items, prev.stage)) return;
    const facing = resolveFormationFacingPoint(
      prev.items,
      prev.stage,
      fm.facing,
    );
    updateSelectedFormation({ x: facing.x });
  };

  const handleSelectFormation = useCallback((id) => {
    setSelectedFormationId(id);
    selectedFormationIdRef.current = id;
    setSelectedIds([]);
    selectedIdsRef.current = [];
    setItemContextMenu(null);
    setFormationContextMenu(null);
    setFormationCopyMenuOpen(false);
  }, []);

  const duplicateSelectedFormation = useCallback(
    (withInstruments = false, formationIdOverride = null) => {
      if (!canEdit) return;
      const id = formationIdOverride || selectedFormationIdRef.current;
      if (!id) return;
      const prev = payloadRef.current;
      const src = (prev.formations || []).find((f) => f.id === id);
      if (!src) return;
      const { formation: clone, items: clonedItems } = cloneStagePlotFormation(
        src,
        prev.items || [],
        {
          withInstruments: !!withInstruments,
          allocateZ: () => zCounterRef.current++,
        },
      );
      if (!clone) return;
      commitPayload((p) => ({
        ...p,
        formations: [...(p.formations || []), clone],
        items: clonedItems.length
          ? [...(p.items || []), ...clonedItems]
          : p.items,
      }));
      setSelectedFormationId(clone.id);
      selectedFormationIdRef.current = clone.id;
      const clonedIds = clonedItems.map((it) => it.id);
      setSelectedIds(clonedIds);
      selectedIdsRef.current = clonedIds;
      setFormationCopyMenuOpen(false);
      setFormationContextMenu(null);
      setItemContextMenu(null);
    },
    [canEdit, commitPayload],
  );

  const handleFormationContextMenu = useCallback(
    (formationId, e) => {
      if (!canEdit) return;
      const nativeEvt = e?.evt;
      setSelectedFormationId(formationId);
      selectedFormationIdRef.current = formationId;
      setSelectedIds([]);
      selectedIdsRef.current = [];
      setItemContextMenu(null);
      setFormationCopyMenuOpen(false);
      setFormationContextMenu({
        formationId,
        x: nativeEvt?.clientX ?? 0,
        y: nativeEvt?.clientY ?? 0,
      });
    },
    [canEdit],
  );

  const addFromPaletteAt = useCallback(
    (type, x, y) => {
      if (!canEdit || !type) return;
      const stage = payloadRef.current.stage || {};
      const sw = stage.width || 900;
      const sh = stage.height || 560;
      const cx = Math.min(sw - 8, Math.max(8, Number(x) || sw / 2));
      const cy = Math.min(sh - 8, Math.max(8, Number(y) || sh / 2));
      const z = zCounterRef.current++;
      const item = createStagePlotItem(type, cx, cy, z);
      commitPayload((prev) => ({ ...prev, items: [...prev.items, item] }));
      setSelectedIds([item.id]);
      setSelectedFormationId(null);
    },
    [canEdit, commitPayload],
  );

  const addFromPalette = (type) => {
    const sw = payload.stage.width || 900;
    const sh = payload.stage.height || 560;
    addFromPaletteAt(
      type,
      sw / 2 + (Math.random() * 40 - 20),
      sh / 2 + (Math.random() * 40 - 20),
    );
  };

  const startPalettePointerDrag = (e, it) => {
    if (!canEdit || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const type = it.type;
    const startX = e.clientX;
    const startY = e.clientY;
    let moved = false;

    const move = (ev) => {
      if (
        !moved &&
        (Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4)
      ) {
        moved = true;
      }
      if (moved) {
        setPaletteDrag({
          type,
          name: it.name,
          color: it.color,
          x: ev.clientX,
          y: ev.clientY,
        });
      }
    };

    const up = (ev) => {
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      setPaletteDrag(null);
      if (!moved) {
        addFromPalette(type);
        return;
      }
      const el = stageWrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (
        ev.clientX < rect.left ||
        ev.clientX > rect.right ||
        ev.clientY < rect.top ||
        ev.clientY > rect.bottom
      ) {
        return;
      }
      const vp = viewportRef.current;
      const x = (ev.clientX - rect.left - vp.x) / vp.scale;
      const y = (ev.clientY - rect.top - vp.y) / vp.scale;
      addFromPaletteAt(type, x, y);
    };

    document.addEventListener("pointermove", move);
    document.addEventListener("pointerup", up);
  };

  const selectSingle = useCallback((id) => {
    setSelectedFormationId(null);
    selectedFormationIdRef.current = null;
    const next = id ? [id] : [];
    setSelectedIds(next);
    selectedIdsRef.current = next;
  }, []);

  const handleSelectItem = useCallback((id, e) => {
    const evt = e?.evt;
    const additive = !!(
      evt &&
      (evt.ctrlKey || evt.metaKey || evt.shiftKey)
    );
    setSelectedFormationId(null);
    selectedFormationIdRef.current = null;
    setSelectedIds((prev) => {
      let next;
      if (additive) {
        next = prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
      } else if (prev.includes(id) && prev.length > 1) {
        // Mantener multi si se hace mousedown en un miembro ya seleccionado (arrastre grupal).
        next = prev;
      } else {
        next = [id];
      }
      selectedIdsRef.current = next;
      return next;
    });
  }, []);

  const closeItemContextMenu = useCallback(() => {
    setItemContextMenu(null);
  }, []);

  const closeFormationContextMenu = useCallback(() => {
    setFormationContextMenu(null);
  }, []);

  const hideItemHoverTooltip = useCallback(() => {
    setItemHoverTooltip(null);
  }, []);

  const showItemHoverTooltip = useCallback((item, e, visual = null) => {
    if (itemDraggingRef.current) return;
    const nativeEvt = e?.evt;
    if (!nativeEvt) return;
    const { primary, size, secondary } = buildStagePlotItemTooltipText(item, visual);
    setItemHoverTooltip({
      x: nativeEvt.clientX,
      y: nativeEvt.clientY,
      primary,
      size,
      secondary,
    });
  }, []);

  const moveItemHoverTooltip = useCallback((e) => {
    if (itemDraggingRef.current) return;
    const nativeEvt = e?.evt;
    if (!nativeEvt) return;
    setItemHoverTooltip((prev) =>
      prev
        ? { ...prev, x: nativeEvt.clientX, y: nativeEvt.clientY }
        : prev,
    );
  }, []);

  useEffect(() => {
    if (!itemHoverTooltip) return undefined;
    const hide = () => setItemHoverTooltip(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [itemHoverTooltip]);

  const handleItemContextMenu = useCallback(
    (id, e) => {
      hideItemHoverTooltip();
      if (!canEdit) return;
      const item = payloadRef.current.items.find((i) => i.id === id);
      if (!item) return;
      const nativeEvt = e?.evt;
      setSelectedFormationId(null);
      setFormationContextMenu(null);
      setFormationCopyMenuOpen(false);
      const currentSel = selectedIdsRef.current;
      const nextSel =
        currentSel.includes(id) && currentSel.length > 1
          ? currentSel
          : [id];
      setSelectedIds(nextSel);
      selectedIdsRef.current = nextSel;
      const sameTypeCount = payloadRef.current.items.filter(
        (it) => it.type === item.type,
      ).length;
      const selItems = payloadRef.current.items.filter((it) =>
        nextSel.includes(it.id),
      );
      const canUngroup = selItems.some((it) => it.groupId);
      // Formación del ítem bajo el clic (no de toda la multi-selección).
      const slotParsed = parseSlotId(item.slotId);
      const formationExists =
        !!slotParsed &&
        (payloadRef.current.formations || []).some(
          (f) => String(f.id) === String(slotParsed.formationId),
        );
      setItemContextMenu({
        itemId: id,
        type: item.type,
        referenceScale: item.scale > 0 ? item.scale : 1,
        sameTypeCount,
        selectedCount: nextSel.length,
        selectedIds: nextSel,
        canUngroup,
        formationId: formationExists ? slotParsed.formationId : null,
        x: nativeEvt?.clientX ?? 0,
        y: nativeEvt?.clientY ?? 0,
      });
    },
    [canEdit, hideItemHoverTooltip],
  );

  /** Clic derecho en vacío: menú de la selección actual (no deselecciona). */
  const handleStageContextMenu = useCallback(
    (e) => {
      e.evt?.preventDefault?.();
      if (!canEdit) return;
      const { interactive } = classifyStagePlotPointerTarget(e.target);
      // Ítem/formación ya abrieron su menú (cancelBubble); no reabrir sobre vacío.
      if (interactive) return;

      const formationId = selectedFormationIdRef.current;
      if (formationId) {
        handleFormationContextMenu(formationId, e);
        return;
      }
      const ids = selectedIdsRef.current;
      if (ids.length) {
        handleItemContextMenu(ids[0], e);
      }
    },
    [canEdit, handleFormationContextMenu, handleItemContextMenu],
  );

  const selectAllOfType = useCallback(
    (type) => {
      const ids = payloadRef.current.items
        .filter((it) => it.type === type)
        .map((it) => it.id);
      setSelectedFormationId(null);
      setSelectedIds(ids);
      closeItemContextMenu();
    },
    [closeItemContextMenu],
  );

  const selectAllOfOrganicoRow = useCallback((types) => {
    const typeSet = new Set(types || []);
    const ids = payloadRef.current.items
      .filter((it) => typeSet.has(it.type))
      .map((it) => it.id);
    setSelectedFormationId(null);
    setSelectedIds(ids);
  }, []);

  const insertOrganicoRow = useCallback(
    (row) => {
      if (!canEdit) return;
      const missing = organicoRowMissingCount(row);
      if (missing <= 0) return;
      const type = pickOrganicoRowCatalogType(row);
      if (!type) return;
      const stage = payloadRef.current.stage || {};
      const positions = computeOrganicoInsertPositions(
        missing,
        stage,
        organicoRowIndex(row.key),
      );
      let z = zCounterRef.current;
      const newItems = positions.map((pos) => {
        const item = createStagePlotItem(type, pos.x, pos.y, z);
        z += 1;
        return item;
      });
      zCounterRef.current = z;
      commitPayload((prev) => ({
        ...prev,
        items: [...prev.items, ...newItems],
      }));
      setSelectedFormationId(null);
      setSelectedIds(newItems.map((it) => it.id));
    },
    [canEdit, commitPayload],
  );

  const unifyScaleOfType = useCallback(
    (type, referenceScale) => {
      const scale = Math.max(
        SCALE_MIN,
        Math.min(SCALE_MAX, referenceScale > 0 ? referenceScale : 1),
      );
      commitPayload((prev) => ({
        ...prev,
        items: prev.items.map((it) =>
          it.type === type ? { ...it, scale } : it,
        ),
      }));
      closeItemContextMenu();
    },
    [commitPayload, closeItemContextMenu],
  );

  const groupSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (ids.length < 2) return;
    commitPayload((prev) => groupStagePlotItems(prev, ids));
    closeItemContextMenu();
  }, [commitPayload, closeItemContextMenu]);

  const ungroupSelected = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (!ids.length) return;
    commitPayload((prev) => ungroupStagePlotItems(prev, ids));
    closeItemContextMenu();
  }, [commitPayload, closeItemContextMenu]);

  const alignSelectedInLine = useCallback(() => {
    const ids = selectedIdsRef.current;
    if (ids.length < 2) return;
    commitPayload((prev) => alignStagePlotItems(prev, ids));
    closeItemContextMenu();
  }, [commitPayload, closeItemContextMenu]);

  const updateSharedAlignAngle = useCallback(
    (angleDeg) => {
      if (!sharedAlignGroup) return;
      commitPayload((prev) =>
        setGroupAlignAngle(prev, sharedAlignGroup.id, angleDeg),
      );
    },
    [commitPayload, sharedAlignGroup],
  );

  const updateSelected = (patch) => {
    if (!selected || !canEdit) return;
    patchItems((items) =>
      items.map((it) => (it.id === selected.id ? { ...it, ...patch } : it)),
    );
  };

  const updateSelectedMany = (patchFn) => {
    if (!canEdit || !selectedIds.length) return;
    const ids = new Set(selectedIds);
    patchItems((items) =>
      items.map((it) => (ids.has(it.id) ? { ...it, ...patchFn(it) } : it)),
    );
  };

  const duplicateSelected = () => {
    if (!selectedItems.length || !canEdit) return;
    const offset = 28;
    const clones = selectedItems.map((src) => {
      const z = zCounterRef.current++;
      const base = createStagePlotItem(
        src.type,
        src.x + offset,
        src.y + offset,
        z,
      );
      return {
        ...base,
        label: src.label,
        notes: src.notes,
        rotation: src.rotation || 0,
        scale: src.scale > 0 ? src.scale : 1,
        includeInChannels: src.includeInChannels,
        slotId: null,
        ...(src.type === "text"
          ? {
              fontSize: src.fontSize,
              fontStyle: src.fontStyle,
              fill: src.fill,
              align: src.align,
            }
          : {}),
      };
    });
    commitPayload((prev) => ({
      ...prev,
      items: [...prev.items, ...clones],
    }));
    setSelectedIds(clones.map((c) => c.id));
    setSelectedFormationId(null);
  };

  const focusLabelEditor = useCallback((id) => {
    if (!canEdit || !id) return;
    setSelectedIds([id]);
    setSelectedFormationId(null);
    queueMicrotask(() => {
      const el = labelEditorRef.current;
      if (!el) return;
      el.focus();
      if (typeof el.select === "function") el.select();
    });
  }, [canEdit]);

  const rotateSelected = (delta) => {
    if (!selectedItems.length || !canEdit) return;
    updateSelectedMany((it) => ({
      rotation: ((it.rotation || 0) + delta) % 360,
    }));
  };

  const scaleSelected = (factor) => {
    if (!selectedItems.length || !canEdit) return;
    updateSelectedMany((it) => {
      const next = Math.round(((it.scale || 1) * factor) * 100) / 100;
      return {
        scale: Math.max(SCALE_MIN, Math.min(SCALE_MAX, next)),
      };
    });
  };

  const bringForward = () => {
    if (!selectedItems.length || !canEdit) return;
    updateSelectedMany(() => ({ z: zCounterRef.current++ }));
  };

  const handleItemDragStart = useCallback(
    (id) => {
      itemDraggingRef.current = true;
      hideItemHoverTooltip();
      setItemSnapPreview(null);

      const prev = payloadRef.current;
      const item = prev.items.find((i) => i.id === id);
      let dragIds = selectedIdsRef.current;
      if (item?.groupId) {
        const groupMembers = getGroupMemberIds(prev, item.groupId);
        dragIds = [...new Set([...dragIds, ...groupMembers])];
      }
      if (!dragIds.includes(id)) {
        dragGroupRef.current = null;
        return;
      }
      if (dragIds.length <= 1) {
        dragGroupRef.current = null;
        return;
      }
      const origins = new Map();
      for (const sid of dragIds) {
        const node = itemNodeRefs.current.get(sid);
        const it = prev.items.find((i) => i.id === sid);
        origins.set(sid, {
          x: node ? node.x() : it?.x ?? 0,
          y: node ? node.y() : it?.y ?? 0,
        });
      }
      dragGroupRef.current = { leaderId: id, origins };
    },
    [hideItemHoverTooltip],
  );

  const handleItemDragMove = useCallback((id, e) => {
    const g = dragGroupRef.current;
    if (g && g.leaderId === id) {
      setItemSnapPreview(null);
      const origin = g.origins.get(id);
      if (!origin) return;
      const dx = e.target.x() - origin.x;
      const dy = e.target.y() - origin.y;
      for (const [sid, o] of g.origins) {
        if (sid === id) continue;
        const node = itemNodeRefs.current.get(sid);
        if (node) {
          node.x(o.x + dx);
          node.y(o.y + dy);
        }
      }
      transformerRef.current?.forceUpdate();
      return;
    }

    const node = e.target;
    const rawX = node.x();
    const rawY = node.y();
    const prev = payloadRef.current;
    const slot = findNearestFreeSlot(
      rawX,
      rawY,
      prev.formations || [],
      prev.items,
      prev.stage || {},
      id,
      STAGE_PLOT_SLOT_SNAP_PX,
    );

    if (slot) {
      node.position({ x: slot.x, y: slot.y });
      setItemSnapPreview({
        slotId: slot.slotId,
        slotX: slot.x,
        slotY: slot.y,
        itemX: rawX,
        itemY: rawY,
        itemId: id,
      });
    } else {
      setItemSnapPreview(null);
    }

    transformerRef.current?.forceUpdate();
  }, []);

  const applySnapToMovedItems = useCallback((prev, movedPositions) => {
    const formations = prev.formations || [];
    const stage = prev.stage || {};
    const next = prev.items.map((it) => {
      if (!movedPositions.has(it.id)) return it;
      const p = movedPositions.get(it.id);
      return { ...it, x: p.x, y: p.y, slotId: null };
    });
    for (let i = 0; i < next.length; i++) {
      const it = next[i];
      if (!movedPositions.has(it.id)) continue;
      const slot = findNearestFreeSlot(
        it.x,
        it.y,
        formations,
        next,
        stage,
        it.id,
        STAGE_PLOT_SLOT_SNAP_PX,
      );
      if (slot) {
        next[i] = {
          ...it,
          x: slot.x,
          y: slot.y,
          slotId: slot.slotId,
        };
      }
    }
    return next;
  }, []);

  const handleItemDragEnd = useCallback(
    (id, x, y) => {
      itemDraggingRef.current = false;
      setItemSnapPreview(null);

      const g = dragGroupRef.current;
      if (g && g.leaderId === id && g.origins.size > 1) {
        const origin = g.origins.get(id);
        const dx = x - (origin?.x ?? x);
        const dy = y - (origin?.y ?? y);
        const movedIds = g.origins;
        const movedPositions = new Map();
        for (const [sid, o] of movedIds) {
          movedPositions.set(sid, { x: o.x + dx, y: o.y + dy });
        }
        commitPayload((prev) => {
          const leader = prev.items.find((it) => it.id === id);
          const nextItems = prev.items.map((it) => {
            if (!movedPositions.has(it.id)) return it;
            const p = movedPositions.get(it.id);
            return { ...it, x: p.x, y: p.y, slotId: null };
          });
          const groups =
            leader?.groupId && (dx !== 0 || dy !== 0)
              ? (prev.groups || []).map((g) =>
                  g.id === leader.groupId && g.alignAnchor
                    ? {
                        ...g,
                        alignAnchor: {
                          x: g.alignAnchor.x + dx,
                          y: g.alignAnchor.y + dy,
                        },
                      }
                    : g,
                )
              : prev.groups;
          return { ...prev, items: nextItems, groups };
        });
        dragGroupRef.current = null;
        return;
      }
      dragGroupRef.current = null;
      commitPayload((prev) => ({
        ...prev,
        items: applySnapToMovedItems(prev, new Map([[id, { x, y }]])),
      }));
      setSelectedIds((prev) => (prev.includes(id) ? prev : [id]));
    },
    [applySnapToMovedItems, commitPayload],
  );

  const handleFormationDragStart = useCallback(
    (_formationId, conductorX, latched) => {
      if (latched && Number.isFinite(Number(conductorX))) {
        setFormationCenterGuideX(Number(conductorX));
      } else {
        setFormationCenterGuideX(null);
      }
    },
    [],
  );

  const handleFormationDragMove = useCallback(
    (_formationId, _x, _y, snapped, conductorX) => {
      if (snapped && Number.isFinite(Number(conductorX))) {
        setFormationCenterGuideX(Number(conductorX));
      } else {
        setFormationCenterGuideX(null);
      }
    },
    [],
  );

  const handleFormationDragEnd = useCallback(
    (formationId, x, y) => {
      setFormationCenterGuideX(null);
      commitFormationPosition(formationId, x, y);
    },
    [commitFormationPosition],
  );

  const handleFormationHandleDragMove = useCallback(
    (formationId, handleId, worldX, worldY) => {
      const base = payloadRef.current.formations?.find(
        (f) => f.id === formationId,
      );
      if (!base) return;
      const params = formationParamsFromHandlePosition(
        base,
        handleId,
        worldX,
        worldY,
      );
      setFormationResizePreview({ formationId, params });
    },
    [],
  );

  const handleFormationHandleDragEnd = useCallback(
    (formationId, handleId, worldX, worldY) => {
      setFormationResizePreview(null);
      const base = payloadRef.current.formations?.find(
        (f) => f.id === formationId,
      );
      if (!base) return;
      const params = formationParamsFromHandlePosition(
        base,
        handleId,
        worldX,
        worldY,
      );
      patchFormationsAndReanchor((formations) =>
        formations.map((f) =>
          f.id === formationId ? { ...f, params } : f,
        ),
      );
    },
    [patchFormationsAndReanchor],
  );

  const handleItemTransformEnd = useCallback(
    (id, next) => {
      if (!pendingTransformRef.current) {
        pendingTransformRef.current = new Map();
        queueMicrotask(() => {
          const map = pendingTransformRef.current;
          pendingTransformRef.current = null;
          if (!map || map.size === 0) return;
          commitPayload((prev) => {
            let items = prev.items.map((it) =>
              map.has(it.id) ? { ...it, ...map.get(it.id) } : it,
            );
            const formationIds = new Set();
            for (const it of items) {
              if (!map.has(it.id) || !it.slotId) continue;
              const parsed = parseSlotId(it.slotId);
              if (parsed) formationIds.add(parsed.formationId);
            }
            if (formationIds.size > 0) {
              items = reanchorItemsToFormations(
                prev.formations || [],
                items,
                prev.stage || {},
                [...formationIds],
              );
            }
            return { ...prev, items };
          });
        });
      }
      pendingTransformRef.current.set(id, next);
    },
    [commitPayload],
  );

  const floatingToolbarPos = useMemo(() => {
    if (!selectedItems.length) return null;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let hasText = false;
    for (const it of selectedItems) {
      const cat = getStagePlotCatalogItem(it.type);
      const itemScale = it.scale > 0 ? it.scale : 1;
      let halfW = ((cat?.w || 40) * itemScale) / 2;
      let halfH = ((cat?.h || 40) * itemScale) / 2;
      if (it.type === "text") {
        hasText = true;
        const layout = getStagePlotTextLayout(it, cat);
        halfW = (layout.textW * itemScale) / 2;
        halfH = (layout.textH * itemScale) / 2;
      }
      minX = Math.min(minX, it.x - halfW);
      maxX = Math.max(maxX, it.x + halfW);
      minY = Math.min(minY, it.y - halfH);
    }
    // Copy + Delete; text selection also shows T / Bold / Italic.
    const btnCount = hasText ? 5 : 2;
    const toolbarW =
      btnCount * FLOATING_TOOLBAR_BTN_PX +
      (btnCount - 1) * FLOATING_TOOLBAR_GAP_PX +
      FLOATING_TOOLBAR_PAD_PX;
    const toolbarH = FLOATING_TOOLBAR_BTN_PX + FLOATING_TOOLBAR_PAD_PX;
    const scale = viewport.scale;
    const screenMinX = viewport.x + minX * scale;
    const screenMaxX = viewport.x + maxX * scale;
    const screenMinY = viewport.y + minY * scale;
    const pad = FLOATING_TOOLBAR_EDGE_PAD_PX;
    const gap = FLOATING_TOOLBAR_SIDE_GAP_PX;
    const maxLeft = Math.max(pad, canvasSize.w - toolbarW - pad);
    const maxTop = Math.max(pad, canvasSize.h - toolbarH - pad);

    const clampPos = (left, top) => ({
      left: Math.max(pad, Math.min(maxLeft, left)),
      top: Math.max(pad, Math.min(maxTop, top)),
    });

    // 1) Prefer right of AABB (clears centered rotate handle).
    const rightLeft = screenMaxX + gap;
    if (rightLeft + toolbarW <= canvasSize.w - pad) {
      return clampPos(rightLeft, screenMinY);
    }
    // 2) Else left of AABB.
    const leftLeft = screenMinX - gap - toolbarW;
    if (leftLeft >= pad) {
      return clampPos(leftLeft, screenMinY);
    }
    // 3) Fallback: top-right outside, fully above rotate-handle zone.
    return clampPos(
      screenMaxX - toolbarW,
      screenMinY - FLOATING_TOOLBAR_ABOVE_CLEARANCE_PX - toolbarH,
    );
  }, [selectedItems, viewport, canvasSize.w, canvasSize.h]);

  const handleExportPdf = async () => {
    try {
      await exportStagePlotPdf(program, payload, nombre || undefined);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF");
    }
  };

  const handleExportJpg = async () => {
    try {
      await exportStagePlotJpg(program, payload, nombre || undefined);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el JPG");
    }
  };

  const syncDot =
    syncState === "saving" || syncState === "dirty"
      ? "bg-amber-400"
      : syncState === "error"
        ? "bg-red-500"
        : syncState === "saved"
          ? "bg-emerald-500"
          : "bg-slate-300";

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-10">
        <IconLoader className="animate-spin text-indigo-500" />
      </div>
    );
  }

  const sw = payload.stage.width;
  const sh = payload.stage.height;
  const sortedItems = [...payload.items].sort(
    (a, b) => (a.z ?? 0) - (b.z ?? 0),
  );
  const formationIdSet = new Set(
    (payload.formations || []).map((f) => String(f.id)),
  );
  const portalMenuZ = fullscreen ? STAGE_PLOT_OVERLAY_Z : 110;
  const portalTooltipZ = fullscreen ? STAGE_PLOT_OVERLAY_TOOLTIP_Z : 110;
  const portalDragZ = fullscreen ? STAGE_PLOT_OVERLAY_DRAG_Z : 200;

  return (
    <div
      className={`flex min-h-0 w-full flex-col ${
        fullscreen
          ? `fixed inset-0 h-screen bg-white`
          : "h-full bg-slate-100"
      }`}
      style={fullscreen ? { zIndex: STAGE_PLOT_FULLSCREEN_Z } : undefined}
    >
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          {!fullscreen && !embedded && (
            <>
              <IconLayout size={18} className="shrink-0 text-indigo-600" />
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-slate-800">
                  Escenario
                </h3>
                <p className="truncate text-[11px] text-slate-500">
                  {program?.nombre_gira || "Gira"}
                </p>
              </div>
            </>
          )}
          <span
            className={`${fullscreen ? "" : "ml-1"} inline-block h-2.5 w-2.5 rounded-full ${syncDot}`}
            title={syncState}
          />
          {fullscreen && (
            <span className="text-xs font-medium text-slate-600">
              Escenario
            </span>
          )}
          <div className="flex max-w-full flex-wrap items-center gap-1">
            {plotsMeta.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={() => switchToPlot(p.id)}
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                  p.id === activePlotId
                    ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                {p.nombre?.trim() || `Lienzo ${idx + 1}`}
              </button>
            ))}
            {canEdit && (
              <button
                type="button"
                onClick={handleCreatePlot}
                className="inline-flex items-center gap-0.5 rounded-full border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-500 hover:border-indigo-300 hover:text-indigo-700"
                title="Nuevo lienzo"
              >
                <IconPlus size={12} /> Lienzo
              </button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del lienzo"
              className="w-40 rounded border border-slate-200 px-2 py-1 text-xs"
            />
          )}
          {canEdit && (
            <button
              type="button"
              onClick={() => setAssocOpen((o) => !o)}
              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium ${
                assocOpen
                  ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Bloques y eventos asociados"
            >
              <IconLink size={14} /> Asociar
              {(bloqueIds.length > 0 || eventoIds.length > 0) && (
                <span className="rounded-full bg-indigo-100 px-1.5 text-[10px] text-indigo-700">
                  {bloqueIds.length + eventoIds.length}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            title="Exportar / importar escenario"
          >
            <IconUpload size={14} /> Imp/Exp
          </button>
          <button
            ref={lienzoBtnRef}
            type="button"
            onMouseDown={() => {
              // Flush Ancho/Alto before toggle-close (anchor click skips popover outside-handler).
              if (!lienzoOpen) return;
              lienzoFlushRef.current?.();
            }}
            onClick={() => setLienzoOpen((o) => !o)}
            className={`rounded border px-2 py-1 text-xs font-medium ${
              lienzoOpen
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title="Tamaño del lienzo, guías y director"
          >
            Lienzo
          </button>
          <StageLienzoPopover
            open={lienzoOpen}
            anchorRef={lienzoBtnRef}
            onClose={() => setLienzoOpen(false)}
            stage={payload.stage}
            canEdit={canEdit}
            hasConductor={hasConductor}
            onPatchStage={patchStage}
            onAddDirector={addOrFocusConductor}
            onClearAll={clearEntireStage}
            overlayZ={portalMenuZ}
            flushRef={lienzoFlushRef}
          />
          <button
            type="button"
            onClick={resetZoom}
            className="rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            title="Ajustar zoom al lienzo"
          >
            Zoom {Math.round(viewport.scale * 100)}%
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((f) => !f)}
            className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium ${
              fullscreen
                ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
            title={
              fullscreen
                ? "Salir de pantalla completa (Esc)"
                : "Ocultar navegación y maximizar el editor"
            }
          >
            <IconMaximize size={14} />
            {fullscreen ? "Salir" : "Pantalla completa"}
          </button>
          <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <IconRefresh size={14} /> Recargar
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
          >
            <IconFileText size={14} /> PDF
          </button>
          <button
            type="button"
            onClick={handleExportJpg}
            className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
            title="Exportar plano (solo escenario, sin channel list)"
          >
            <IconPhoto size={14} /> JPG
          </button>
          {onBack && !embedded && (
            <button
              type="button"
              onClick={onBack}
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
            >
              Cerrar
            </button>
          )}
          {canEdit && plotsMeta.length > 1 && (
            <button
              type="button"
              onClick={handleDeletePlot}
              className="inline-flex items-center gap-1 rounded border border-rose-200 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
              title="Eliminar lienzo activo"
            >
              <IconTrash size={14} />
            </button>
          )}
        </div>
      </div>

      {assocOpen && canEdit && (
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-3 py-2">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Bloques (orgánico)
              </p>
              <p className="mb-1.5 text-[10px] text-slate-400">
                Vacío = roster confirmado de toda la gira. Con bloques = unión
                de grupos de esos bloques.
              </p>
              <div className="flex max-h-28 flex-wrap gap-1 overflow-y-auto">
                {repertorioBlocks.length === 0 ? (
                  <span className="text-[11px] text-slate-400">
                    Sin bloques de repertorio
                  </span>
                ) : (
                  repertorioBlocks.map((b) => {
                    const id = Number(b.id);
                    const on = bloqueIds.includes(id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBloqueId(id)}
                        className={`rounded border px-2 py-0.5 text-[11px] ${
                          on
                            ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {b.nombre || `Bloque ${b.orden ?? id}`}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            <div>
              <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Eventos (técnicos)
              </p>
              <p className="mb-1.5 text-[10px] text-slate-400">
                Conciertos/ensayos que abren este lienzo en «Ver escenario». Un
                evento solo puede tener un plot.
              </p>
              <div className="flex max-h-28 flex-col gap-0.5 overflow-y-auto">
                {giraEvents.length === 0 ? (
                  <span className="text-[11px] text-slate-400">
                    Sin ensayos/conciertos en la gira
                  </span>
                ) : (
                  giraEvents.map((ev) => {
                    const id = Number(ev.id);
                    const on = eventoIds.includes(id);
                    const label = [
                      ev.fecha,
                      ev.hora_inicio?.slice?.(0, 5),
                      ev.tipos_evento?.nombre,
                      (ev.descripcion || "")
                        .replace(/<[^>]+>/g, " ")
                        .trim()
                        .slice(0, 40),
                    ]
                      .filter(Boolean)
                      .join(" · ");
                    return (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => toggleEventoId(id)}
                        className={`rounded border px-2 py-0.5 text-left text-[11px] ${
                          on
                            ? "border-indigo-300 bg-indigo-50 text-indigo-800"
                            : "border-slate-200 bg-white text-slate-600"
                        }`}
                      >
                        {label || `Evento ${id}`}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <StagePlotImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        supabase={supabase}
        targetProgram={program}
        exportDoc={{
          payload,
          nombre,
          bloque_ids: bloqueIds,
          source: {
            id_programa: program?.id,
            plot_id: activePlotId,
            nombre_gira: program?.nombre_gira,
          },
        }}
        onImported={(row) => {
          if (!row) return;
          const withEv = { ...row, evento_ids: [] };
          setPlotsMeta((prev) => [...prev, withEv]);
          skipSaveRef.current = true;
          skipHistoryRef.current = true;
          applyPlotToEditor(withEv);
          requestAnimationFrame(() => {
            skipSaveRef.current = false;
            skipHistoryRef.current = false;
          });
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Palette */}
        <aside className="max-h-40 shrink-0 overflow-y-auto border-b border-slate-200 bg-white p-2 lg:max-h-none lg:w-52 lg:border-b-0 lg:border-r">
          <p className="mb-1 px-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Paleta
          </p>
          {canEdit && (
            <p className="mb-2 px-1 text-[10px] leading-snug text-slate-400">
              Arrastrá al escenario (o clic = centro)
            </p>
          )}
          {canEdit && (
            <div className="mb-3">
              <p className="mb-1 flex items-center gap-1 px-1 text-[11px] font-bold text-slate-600">
                <IconLayers size={12} /> Formaciones
              </p>
              <div className="flex flex-wrap gap-1">
                {(
                  [
                    ["arc", "Arco"],
                    ["horseshoe", "Herradura"],
                    ["rect", "Rectángulo"],
                    ["line", "Línea recta"],
                  ]
                ).map(([kind, label]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => addFormation(kind)}
                    title={`Agregar formación: ${label}`}
                    className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-1.5 py-1 text-[10px] font-medium text-indigo-800 hover:bg-indigo-100"
                  >
                    <IconPlus size={11} /> {label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {categories.map(({ category, items }) => (
            <div key={category} className="mb-2">
              <button
                type="button"
                onClick={() =>
                  setPaletteCat((c) => (c === category ? null : category))
                }
                className="mb-1 w-full px-1 text-left text-[11px] font-bold text-slate-600"
              >
                {category}
              </button>
              {(paletteCat === null || paletteCat === category) && (
                <div className="flex flex-wrap gap-1">
                  {items.map((it) => (
                    <button
                      key={it.type}
                      type="button"
                      disabled={!canEdit}
                      onPointerDown={(e) => startPalettePointerDrag(e, it)}
                      title={`${it.name} — arrastrar al escenario`}
                      className="inline-flex cursor-grab touch-none items-center gap-1.5 rounded border border-slate-200 bg-slate-50 px-1.5 py-1 text-[10px] font-medium text-slate-700 hover:border-indigo-300 hover:bg-indigo-50 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <PaletteIcon type={it.type} color={it.color} />
                      {it.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
          {!canEdit && (
            <p className="mt-2 px-1 text-[10px] text-slate-400">Solo lectura</p>
          )}
        </aside>

        {/* Canvas */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div
            ref={stageWrapRef}
            className={`relative min-h-[280px] flex-1 overflow-hidden bg-slate-200/60 ${
              paletteDrag ? "ring-2 ring-inset ring-indigo-400" : ""
            } ${
              isPanning
                ? "cursor-grabbing"
                : stageBgHover || spaceHeld
                  ? "cursor-grab"
                  : ""
            }`}
          >
            <p className="pointer-events-none absolute bottom-2 left-2 z-10 rounded bg-white/80 px-1.5 py-0.5 text-[10px] text-slate-500">
              {paletteDrag
                ? "Soltá para colocar"
                : "Arrastrar fondo / Espacio / rueda central = mover vista · Rueda = zoom · Supr/Del = borrar · Ctrl/⌘Z deshacer · Ctrl/⌘ clic = multi"}
            </p>

            {selectedItems.length > 0 && canEdit && floatingToolbarPos && (
              <div
                className="pointer-events-auto absolute z-[30] flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg"
                style={{
                  left: floatingToolbarPos.left,
                  top: floatingToolbarPos.top,
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
                {selected?.type === "text" && (
                  <>
                    <button
                      type="button"
                      title="Editar texto"
                      onClick={() => focusLabelEditor(selected.id)}
                      className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                    >
                      <span className="text-[11px] font-bold">T</span>
                    </button>
                    <button
                      type="button"
                      title="Negrita"
                      onClick={() =>
                        updateSelected({
                          fontStyle: toggleStagePlotFontStyle(
                            selected.fontStyle,
                            "bold",
                          ),
                        })
                      }
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        String(selected.fontStyle || "").includes("bold")
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      <IconBold size={16} />
                    </button>
                    <button
                      type="button"
                      title="Cursiva"
                      onClick={() =>
                        updateSelected({
                          fontStyle: toggleStagePlotFontStyle(
                            selected.fontStyle,
                            "italic",
                          ),
                        })
                      }
                      className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
                        String(selected.fontStyle || "").includes("italic")
                          ? "bg-indigo-50 text-indigo-700"
                          : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                      }`}
                    >
                      <IconItalic size={16} />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  title="Copiar"
                  onClick={duplicateSelected}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700"
                >
                  <IconCopy size={16} />
                </button>
                <button
                  type="button"
                  title="Eliminar"
                  onClick={deleteSelected}
                  className="flex h-8 w-8 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            )}

            <Stage
              ref={konvaStageRef}
              width={canvasSize.w}
              height={canvasSize.h}
              scaleX={viewport.scale}
              scaleY={viewport.scale}
              x={viewport.x}
              y={viewport.y}
              onWheel={handleWheel}
              onContextMenu={handleStageContextMenu}
              onMouseDown={(e) => {
                const nativeEvt = e.evt;
                const { interactive, isBackground } =
                  classifyStagePlotPointerTarget(e.target);
                const middlePan = nativeEvt.button === 1;
                const spacePan =
                  spaceHeldRef.current && nativeEvt.button === 0;
                const backgroundPan =
                  nativeEvt.button === 0 && isBackground && !interactive;
                const shouldPan = middlePan || spacePan || backgroundPan;

                if (shouldPan) {
                  if (middlePan) nativeEvt.preventDefault();
                  startStagePan(nativeEvt.clientX, nativeEvt.clientY);
                  return;
                }

                // Solo clic izquierdo en vacío deselecciona; el derecho abre menú de la selección.
                if (!interactive && nativeEvt.button === 0) {
                  setSelectedIds([]);
                  setSelectedFormationId(null);
                  closeItemContextMenu();
                  closeFormationContextMenu();
                  hideItemHoverTooltip();
                }
              }}
            >
              <Layer>
                <Rect
                  name="stage-plot-bg"
                  x={0}
                  y={0}
                  width={sw}
                  height={sh}
                  fill="#f8fafc"
                  stroke="#cbd5e1"
                  shadowColor="rgba(15,23,42,0.12)"
                  shadowBlur={12}
                  shadowOffsetY={2}
                  onMouseEnter={() => setStageBgHover(true)}
                  onMouseLeave={() => setStageBgHover(false)}
                />
                {payload.stage.showGrid !== false && (
                  <StageCentimeterGrid width={sw} height={sh} />
                )}
                {payload.stage.showRadial && (
                  <StageRadialGuide
                    width={sw}
                    height={sh}
                    items={payload.items}
                    stage={payload.stage}
                  />
                )}
                <Text
                  text="FONDO / UPSTAGE"
                  x={0}
                  y={8}
                  width={sw}
                  align="center"
                  fontSize={11}
                  fill="#94a3b8"
                />
                <Text
                  text={`${Math.round(payload.stage.widthCm)} × ${Math.round(payload.stage.heightCm)} cm`}
                  x={0}
                  y={22}
                  width={sw}
                  align="center"
                  fontSize={10}
                  fill="#64748b"
                  listening={false}
                />
                <Text
                  text="PÚBLICO / DOWNSTAGE"
                  x={0}
                  y={sh - 20}
                  width={sw}
                  align="center"
                  fontSize={11}
                  fill="#94a3b8"
                />
                <Line
                  points={[40, sh - 28, sw - 40, sh - 28]}
                  stroke="#e2e8f0"
                  strokeWidth={1}
                  dash={[6, 4]}
                />
                {!payload.stage.hideFormationGuides &&
                  renderFormations.map((fm) => (
                  <FormationShape
                    key={fm.id}
                    formation={fm}
                    items={payload.items}
                    stage={payload.stage}
                    selected={selectedFormationId === fm.id}
                    draggable={canEdit && !formationResizePreview}
                    highlightSlotId={itemSnapPreview?.slotId ?? null}
                    onSelect={handleSelectFormation}
                    onContextMenu={handleFormationContextMenu}
                    onDragStart={handleFormationDragStart}
                    onDragMove={handleFormationDragMove}
                    onDragEnd={handleFormationDragEnd}
                  />
                  ))}
                {!payload.stage.hideFormationGuides && (
                  <SnapMagnetGuide preview={itemSnapPreview} />
                )}
                {!payload.stage.hideFormationGuides && (
                  <FormationCenterAxisGuide
                    x={formationCenterGuideX}
                    height={sh}
                  />
                )}
                {sharedAlignGroup && (
                  <AlignLineGuide group={sharedAlignGroup} />
                )}
                {sortedItems.map((item) => {
                  const slotParsed = parseSlotId(item.slotId);
                  const magnetized = Boolean(
                    slotParsed && formationIdSet.has(slotParsed.formationId),
                  );
                  return (
                  <ItemShape
                    key={item.id}
                    item={item}
                    selected={selectedIdSet.has(item.id)}
                    magnetized={magnetized}
                    hideChairSquares={!!payload.stage.hideChairSquares}
                    draggable={canEdit && item.type !== "conductor"}
                    shapeRef={(node) => {
                      if (node) itemNodeRefs.current.set(item.id, node);
                      else itemNodeRefs.current.delete(item.id);
                    }}
                    onSelect={handleSelectItem}
                    onContextMenu={handleItemContextMenu}
                    onDblClick={focusLabelEditor}
                    onMouseEnter={showItemHoverTooltip}
                    onMouseLeave={hideItemHoverTooltip}
                    onMouseMove={moveItemHoverTooltip}
                    onDragStart={handleItemDragStart}
                    onDragMove={handleItemDragMove}
                    onDragEnd={handleItemDragEnd}
                    onTransformEnd={handleItemTransformEnd}
                  />
                  );
                })}
                {canEdit && (
                  <Transformer
                    ref={transformerRef}
                    rotateEnabled
                    keepRatio
                    onTransform={handleTransformerTransform}
                    anchorSize={transformerAnchorSize}
                    anchorCornerRadius={transformerAnchorCornerRadius}
                    anchorStrokeWidth={1.5 / transformerScreenDenom}
                    borderStrokeWidth={transformerBorderWidth}
                    rotateAnchorOffset={transformerRotateOffset}
                    padding={0}
                    anchorStroke="#4f46e5"
                    anchorFill="#fff"
                    borderStroke="#4f46e5"
                    enabledAnchors={[
                      "top-left",
                      "top-right",
                      "bottom-left",
                      "bottom-right",
                    ]}
                    boundBoxFunc={(oldBox, newBox) => {
                      if (newBox.width < 16 || newBox.height < 16) return oldBox;
                      return newBox;
                    }}
                  />
                )}
                {/* Selected formation handles above items so peak/side asas stay hittable. */}
                {canEdit &&
                  !payload.stage.hideFormationGuides &&
                  formationForHandles && (
                    <FormationResizeHandles
                      formation={formationForHandles}
                      handleSize={formationHandleSize}
                      strokeWidth={formationHandleStroke}
                      onHandleDragMove={handleFormationHandleDragMove}
                      onHandleDragEnd={handleFormationHandleDragEnd}
                    />
                  )}
              </Layer>
            </Stage>
          </div>

          {paletteDrag && (
            <div
              className="pointer-events-none fixed flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-2 py-1.5 text-[11px] font-medium text-slate-700 shadow-lg"
              style={{
                left: paletteDrag.x + 12,
                top: paletteDrag.y + 12,
                zIndex: portalDragZ,
              }}
            >
              <PaletteIcon type={paletteDrag.type} color={paletteDrag.color} />
              {paletteDrag.name}
            </div>
          )}

          <StagePlotItemTooltip
            tooltip={itemHoverTooltip}
            overlayZ={portalTooltipZ}
          />

          {canEdit && (
            <StagePlotItemContextMenu
              menu={itemContextMenu}
              onClose={closeItemContextMenu}
              onSelectAllOfType={selectAllOfType}
              onSelectFormation={handleSelectFormation}
              onUnifyScaleOfType={unifyScaleOfType}
              onGroup={groupSelected}
              onUngroup={ungroupSelected}
              onAlignInLine={alignSelectedInLine}
              overlayZ={portalMenuZ}
            />
          )}

          {canEdit && (
            <StagePlotFormationContextMenu
              menu={formationContextMenu}
              onClose={closeFormationContextMenu}
              onCopyFormation={() =>
                duplicateSelectedFormation(
                  false,
                  formationContextMenu?.formationId,
                )
              }
              onCopyFormationWithInstruments={() =>
                duplicateSelectedFormation(
                  true,
                  formationContextMenu?.formationId,
                )
              }
              overlayZ={portalMenuZ}
            />
          )}

          {/* Altura fija siempre: evita que el lienzo salte al seleccionar (ResizeObserver/fitViewport). */}
          <div
            className={`flex shrink-0 items-center gap-2 overflow-x-auto border-t border-slate-200 bg-white px-3 ${
              selected?.type === "text" ? "min-h-14 py-1.5" : "h-11"
            }`}
          >
            {selectedFormation && canEdit ? (
              <>
                <span className="shrink-0 text-[11px] font-bold text-indigo-700">
                  Formación ·{" "}
                  {STAGE_PLOT_FORMATIONATION_LABELS[selectedFormation.kind] ||
                    selectedFormation.kind}
                </span>
                <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                  Plazas
                  <input
                    type="number"
                    min={1}
                    max={64}
                    value={selectedFormation.slots}
                    onChange={(e) =>
                      updateSelectedFormation({
                        slots: Math.max(
                          1,
                          Math.min(64, Number(e.target.value) || 1),
                        ),
                      })
                    }
                    className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                  />
                </label>
                {selectedFormation.kind === "arc" ? (
                  <>
                    <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                      rx
                      <input
                        type="number"
                        min={FORMATION_MIN_RADIUS}
                        value={Math.round(selectedFormation.params.rx || 0)}
                        onChange={(e) =>
                          updateSelectedFormation({
                            params: { rx: Number(e.target.value) || FORMATION_MIN_RADIUS },
                          })
                        }
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                      />
                    </label>
                    <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                      ry
                      <input
                        type="number"
                        min={FORMATION_MIN_RADIUS}
                        value={Math.round(selectedFormation.params.ry || 0)}
                        onChange={(e) =>
                          updateSelectedFormation({
                            params: { ry: Number(e.target.value) || FORMATION_MIN_RADIUS },
                          })
                        }
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                      />
                    </label>
                    <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                      Inicio °
                      <input
                        type="number"
                        value={Math.round(
                          selectedFormation.params.startAngle ?? 180,
                        )}
                        onChange={(e) =>
                          updateSelectedFormation({
                            params: {
                              startAngle: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                      />
                    </label>
                    <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                      Fin °
                      <input
                        type="number"
                        value={Math.round(
                          selectedFormation.params.endAngle ?? 360,
                        )}
                        onChange={(e) =>
                          updateSelectedFormation({
                            params: {
                              endAngle: Number(e.target.value) || 0,
                            },
                          })
                        }
                        className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                      />
                    </label>
                  </>
                ) : selectedFormation.kind === "line" ? (
                  <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                    Longitud
                    <input
                      type="number"
                      min={FORMATION_MIN_LENGTH}
                      value={Math.round(selectedFormation.params.length || 0)}
                      onChange={(e) =>
                        updateSelectedFormation({
                          params: { length: Number(e.target.value) || FORMATION_MIN_LENGTH },
                        })
                      }
                      className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                    />
                  </label>
                ) : (
                  <>
                    <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                      Ancho
                      <input
                        type="number"
                        min={FORMATION_MIN_WIDTH}
                        value={Math.round(selectedFormation.params.width || 0)}
                        onChange={(e) =>
                          updateSelectedFormation({
                            params: { width: Number(e.target.value) || FORMATION_MIN_WIDTH },
                          })
                        }
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                      />
                    </label>
                    <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                      Prof.
                      <input
                        type="number"
                        min={FORMATION_MIN_DEPTH}
                        value={Math.round(selectedFormation.params.depth || 0)}
                        onChange={(e) =>
                          updateSelectedFormation({
                            params: { depth: Number(e.target.value) || FORMATION_MIN_DEPTH },
                          })
                        }
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                      />
                    </label>
                  </>
                )}
                <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                  Rot °
                  <input
                    type="number"
                    value={Math.round(selectedFormation.rotation || 0)}
                    onChange={(e) =>
                      updateSelectedFormation({
                        rotation: Number(e.target.value) || 0,
                      })
                    }
                    className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                  />
                </label>
                {["arc", "horseshoe", "rect", "line"].includes(
                  selectedFormation.kind,
                ) ? (
                  <button
                    type="button"
                    onClick={centerSelectedFormationOnConductor}
                    disabled={!canEdit || selectedFormationCenteredOnConductor}
                    className="inline-flex shrink-0 items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 disabled:hover:bg-slate-50"
                    title={
                      selectedFormationCenteredOnConductor
                        ? "La formación ya está centrada en el eje X del director"
                        : "Centrar la formación en el eje X del director"
                    }
                  >
                    Centrar
                  </button>
                ) : null}
                <div className="relative shrink-0" ref={formationCopyMenuRef}>
                  <button
                    type="button"
                    onClick={() => setFormationCopyMenuOpen((o) => !o)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                    title="Copiar formación"
                    aria-expanded={formationCopyMenuOpen}
                    aria-haspopup="menu"
                  >
                    <IconCopy size={12} /> Copiar…
                    <IconChevronDown size={12} />
                  </button>
                  {formationCopyMenuOpen ? (
                    <div
                      role="menu"
                      className="absolute bottom-full left-0 z-20 mb-1 min-w-[240px] rounded-md border border-slate-200 bg-white py-1 shadow-lg"
                    >
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
                        onClick={() => duplicateSelectedFormation(false)}
                      >
                        Copiar formación
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        className="block w-full px-3 py-2 text-left text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
                        onClick={() => duplicateSelectedFormation(true)}
                      >
                        Copiar formación con instrumentos
                      </button>
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={deleteSelectedFormation}
                  className="ml-auto inline-flex shrink-0 items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                >
                  <IconTrash size={12} /> Eliminar
                </button>
              </>
            ) : selectedItems.length > 0 && canEdit ? (
              <>
                <span className="shrink-0 text-[11px] font-bold text-slate-500">
                  {multiSelected
                    ? `${selectedItems.length} seleccionados`
                    : selected?.type === "text"
                      ? "Texto"
                      : "Selección"}
                </span>
                {selected && selected.type === "text" ? (
                  <>
                    <textarea
                      ref={labelEditorRef}
                      value={selected.label || ""}
                      onChange={(e) =>
                        updateSelected({ label: e.target.value })
                      }
                      rows={2}
                      className="h-9 w-44 shrink-0 resize-none rounded border border-slate-200 px-2 py-1 text-xs leading-tight"
                      placeholder="Texto (Enter = salto)"
                      title="Doble clic en el lienzo también edita aquí. Usá Enter para varias líneas."
                    />
                    <button
                      type="button"
                      title="Negrita"
                      onClick={() =>
                        updateSelected({
                          fontStyle: toggleStagePlotFontStyle(
                            selected.fontStyle,
                            "bold",
                          ),
                        })
                      }
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border ${
                        String(selected.fontStyle || "").includes("bold")
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <IconBold size={14} />
                    </button>
                    <button
                      type="button"
                      title="Cursiva"
                      onClick={() =>
                        updateSelected({
                          fontStyle: toggleStagePlotFontStyle(
                            selected.fontStyle,
                            "italic",
                          ),
                        })
                      }
                      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border ${
                        String(selected.fontStyle || "").includes("italic")
                          ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <IconItalic size={14} />
                    </button>
                    <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                      Tamaño
                      <select
                        value={selected.fontSize || 14}
                        onChange={(e) =>
                          updateSelected({
                            fontSize: Number(e.target.value) || 14,
                          })
                        }
                        className="rounded border border-slate-200 px-1 py-0.5 text-xs"
                      >
                        {STAGE_PLOT_TEXT_FONT_SIZE_PRESETS.map((sz) => (
                          <option key={sz} value={sz}>
                            {sz}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {STAGE_PLOT_TEXT_COLOR_PRESETS.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          title={c.label}
                          onClick={() => updateSelected({ fill: c.value })}
                          className={`h-5 w-5 rounded-full border ${
                            (selected.fill || "#0f172a").toLowerCase() ===
                            c.value
                              ? "border-indigo-500 ring-1 ring-indigo-300"
                              : "border-slate-300"
                          }`}
                          style={{ background: c.value }}
                        />
                      ))}
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5">
                      {(
                        [
                          ["left", IconAlignLeft, "Izquierda"],
                          ["center", IconAlignCenter, "Centro"],
                          ["right", IconAlignRight, "Derecha"],
                        ]
                      ).map(([align, Icon, title]) => (
                        <button
                          key={align}
                          type="button"
                          title={title}
                          onClick={() => updateSelected({ align })}
                          className={`inline-flex h-7 w-7 items-center justify-center rounded border ${
                            (selected.align || "center") === align
                              ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                              : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Icon size={14} />
                        </button>
                      ))}
                    </div>
                  </>
                ) : selected ? (
                  <input
                    ref={labelEditorRef}
                    value={selected.label || ""}
                    onChange={(e) => updateSelected({ label: e.target.value })}
                    className="w-36 shrink-0 rounded border border-slate-200 px-2 py-1 text-xs"
                    placeholder="Etiqueta"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => rotateSelected(-15)}
                  className="shrink-0 rounded border px-2 py-1 text-xs"
                >
                  −15°
                </button>
                <button
                  type="button"
                  onClick={() => rotateSelected(15)}
                  className="shrink-0 rounded border px-2 py-1 text-xs"
                >
                  +15°
                </button>
                <button
                  type="button"
                  onClick={() => scaleSelected(0.9)}
                  className="shrink-0 rounded border px-2 py-1 text-xs"
                >
                  −
                </button>
                <span className="shrink-0 text-[10px] text-slate-500">
                  {selected
                    ? `${Math.round((selected.scale || 1) * 100)}%`
                    : "escala"}
                </span>
                <button
                  type="button"
                  onClick={() => scaleSelected(1.1)}
                  className="shrink-0 rounded border px-2 py-1 text-xs"
                >
                  +
                </button>
                {sharedAlignGroup && (
                  <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                    Ángulo línea
                    <input
                      type="number"
                      step={1}
                      value={Math.round(sharedAlignGroup.alignAngle ?? 0)}
                      onChange={(e) =>
                        updateSharedAlignAngle(Number(e.target.value) || 0)
                      }
                      className="w-14 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                      title="Rotar la línea de alineación del grupo"
                    />
                    °
                  </label>
                )}
                <button
                  type="button"
                  onClick={bringForward}
                  className="shrink-0 rounded border px-2 py-1 text-xs"
                >
                  Traer adelante
                </button>
                <button
                  type="button"
                  onClick={duplicateSelected}
                  className="inline-flex shrink-0 items-center gap-1 rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                >
                  <IconCopy size={12} /> Copiar
                </button>
                {selected && selected.type !== "text" && (
                  <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={!!selected.includeInChannels}
                      onChange={(e) =>
                        updateSelected({ includeInChannels: e.target.checked })
                      }
                    />
                    En channel list
                  </label>
                )}
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="ml-auto inline-flex shrink-0 items-center gap-1 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs font-medium text-red-700"
                >
                  <IconTrash size={12} /> Eliminar
                </button>
              </>
            ) : (
              <span className="text-[11px] text-slate-400">
                {canEdit
                  ? "Seleccioná un ítem o formación para editar"
                  : "Solo lectura"}
              </span>
            )}
          </div>
        </div>

        {/* Channels / Orgánico */}
        <aside className="max-h-52 shrink-0 overflow-y-auto border-t border-slate-200 bg-white p-2 lg:max-h-none lg:w-64 lg:border-l lg:border-t-0">
          <div className="mb-2 flex rounded-md border border-slate-200 bg-slate-50 p-0.5">
            <button
              type="button"
              onClick={() => setRightPanel("channels")}
              className={`flex-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                rightPanel === "channels"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Channel list
            </button>
            <button
              type="button"
              onClick={() => setRightPanel("organico")}
              className={`flex-1 rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
                rightPanel === "organico"
                  ? "bg-white text-slate-800 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Orgánico
            </button>
          </div>

          {rightPanel === "channels" ? (
            <>
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Canales
                </p>
                <span className="text-[10px] text-slate-400">
                  {channels.length} ch
                </span>
              </div>
              {channels.length === 0 ? (
                <p className="px-1 text-[11px] text-slate-400">
                  Agregá piezas con canal (mic, instrumentos…) desde la paleta.
                </p>
              ) : (
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="py-1 pr-1 font-medium">Ch</th>
                      <th className="py-1 pr-1 font-medium">Label</th>
                      <th className="py-1 font-medium">Notas</th>
                    </tr>
                  </thead>
                  <tbody>
                    {channels.map((ch) => {
                      const item = payload.items.find((i) => i.id === ch.itemId);
                      return (
                        <tr
                          key={ch.itemId}
                          className={`border-t border-slate-100 ${
                            selectedIdSet.has(ch.itemId) ? "bg-indigo-50" : ""
                          }`}
                        >
                          <td className="py-1 pr-1 font-mono text-slate-500">
                            {ch.ch}
                          </td>
                          <td className="py-1 pr-1">
                            <button
                              type="button"
                              className="text-left font-medium text-slate-700 hover:text-indigo-600"
                              onClick={() => selectSingle(ch.itemId)}
                            >
                              {ch.label}
                            </button>
                          </td>
                          <td className="py-1">
                            {canEdit ? (
                              <input
                                value={item?.notes || ""}
                                onChange={(e) => {
                                  const notes = e.target.value;
                                  patchItems((items) =>
                                    items.map((it) =>
                                      it.id === ch.itemId
                                        ? { ...it, notes }
                                        : it,
                                    ),
                                  );
                                }}
                                className="w-full rounded border border-slate-100 px-1 py-0.5 text-[10px]"
                                placeholder="—"
                              />
                            ) : (
                              <span className="text-slate-500">
                                {ch.notes || "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => addFromPalette("mic")}
                  className="mt-3 inline-flex w-full items-center justify-center gap-1 rounded border border-dashed border-slate-300 py-1.5 text-[11px] text-slate-500 hover:border-indigo-300 hover:text-indigo-600"
                >
                  <IconPlus size={12} /> Micrófono
                </button>
              )}
            </>
          ) : (
            <>
              <div className="mb-2 flex items-center justify-between gap-2 px-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  Plano vs convocado
                </p>
                <span
                  className={`shrink-0 font-mono text-[10px] ${
                    organicoSummary.delta === 0
                      ? "text-emerald-600"
                      : organicoSummary.delta < 0
                        ? "text-amber-600"
                        : "text-sky-600"
                  }`}
                  title="Dibujados en el plano / orgánico convocado"
                >
                  {organicoSummary.drawn}/{organicoSummary.required}
                </span>
              </div>
              {organicoRows.length === 0 ? (
                <p className="px-1 text-[11px] text-slate-400">
                  Sin instrumentos en el plano ni músicos convocados en el
                  roster.
                </p>
              ) : (
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="text-slate-400">
                      <th className="py-1 pr-1 font-medium">Inst.</th>
                      <th className="py-1 pr-1 text-right font-medium">Plano</th>
                      <th className="py-1 pr-1 text-right font-medium">Org.</th>
                      <th className="py-1 pr-1 text-right font-medium">Δ</th>
                      {canEdit && (
                        <th className="py-1 text-right font-medium" aria-label="Acciones" />
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {organicoRows.map((row) => {
                      const missing = organicoRowMissingCount(row);
                      const drawnOfRow = row.drawn > 0;
                      const deltaLabel =
                        row.delta === 0
                          ? "="
                          : row.delta > 0
                            ? `+${row.delta}`
                            : String(row.delta);
                      const deltaClass =
                        row.status === "ok"
                          ? "text-emerald-600"
                          : row.status === "missing"
                            ? "text-amber-700"
                            : "text-sky-700";
                      const rowBg =
                        row.status === "ok"
                          ? ""
                          : row.status === "missing"
                            ? "bg-amber-50/80"
                            : "bg-sky-50/80";
                      return (
                        <tr
                          key={row.key}
                          className={`border-t border-slate-100 ${rowBg}`}
                          title={
                            row.status === "ok"
                              ? "Coincide con el orgánico"
                              : row.status === "missing"
                                ? `Faltan ${-row.delta} en el plano`
                                : `Sobran ${row.delta} en el plano`
                          }
                        >
                          <td className="py-1 pr-1">
                            <button
                              type="button"
                              className={`text-left font-medium ${
                                drawnOfRow
                                  ? "cursor-pointer text-slate-700 hover:text-indigo-600"
                                  : "cursor-default text-slate-700"
                              }`}
                              title={
                                drawnOfRow
                                  ? `Seleccionar todos los ${row.label} en el plano`
                                  : undefined
                              }
                              onClick={() =>
                                drawnOfRow && selectAllOfOrganicoRow(row.types)
                              }
                            >
                              {row.label}
                            </button>
                          </td>
                          <td className="py-1 pr-1 text-right font-mono text-slate-700">
                            {row.drawn}
                          </td>
                          <td className="py-1 pr-1 text-right font-mono text-slate-500">
                            {row.required}
                          </td>
                          <td
                            className={`py-1 pr-1 text-right font-mono font-semibold ${deltaClass}`}
                          >
                            {deltaLabel}
                          </td>
                          {canEdit && (
                            <td className="py-1 text-right">
                              <button
                                type="button"
                                disabled={missing <= 0}
                                title={
                                  missing > 0
                                    ? `Insertar ${missing} ${row.label} (esquina superior derecha)`
                                    : "Ya coincide con el orgánico"
                                }
                                onClick={() => insertOrganicoRow(row)}
                                className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent"
                              >
                                <IconPlus size={10} />
                                Insertar
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
              <p className="mt-2 px-1 text-[10px] leading-snug text-slate-400">
                Orgánico = roster convocado (sin ausentes). Ámbar: falta en el
                plano. Celeste: excede.
              </p>
            </>
          )}
        </aside>
      </div>
      {dialog}
    </div>
  );
}
