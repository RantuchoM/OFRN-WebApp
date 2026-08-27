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
  IconRefresh,
  IconCopy,
  IconLayers,
  IconMaximize,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import {
  getStagePlotCatalogItem,
  stagePlotCategories,
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
  STAGE_PLOT_ITEM_SCALE_MIN,
  STAGE_PLOT_ITEM_SCALE_MAX,
} from "../../utils/stagePlotConstants";
import {
  applyStagePlotStagePatch,
  cloneStagePlotPayload,
  createStagePlotItem,
  deriveStagePlotChannels,
  normalizeStagePlotPayload,
  normalizeStagePlotRadialLines,
  STAGE_PLOT_RADIAL_LINES_DEFAULT,
  STAGE_PLOT_RADIAL_LINES_MAX,
  STAGE_PLOT_RADIAL_LINES_MIN,
} from "../../utils/stagePlotPayload";
import {
  STAGE_PLOT_FORMATIONATION_LABELS,
  STAGE_PLOT_SLOT_SNAP_PX,
  clearFormationAnchors,
  computeFormationSlots,
  createStagePlotFormation,
  findNearestFreeSlot,
  formationGuideLinePoints,
  formationParamsFromHandlePosition,
  formationResizeHandlesWorld,
  formationSlotMarkerSize,
  parseSlotId,
  reanchorItemsToFormations,
  resolveFormationFacingPoint,
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
import { exportStagePlotPdf } from "../../utils/stagePlotPdf";
import {
  getStagePlotByPrograma,
  upsertStagePlot,
} from "../../services/stagePlotService";

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
}) {
  const [draft, setDraft] = useState(() =>
    String(Math.round(value ?? fallback)),
  );
  const draftRef = useRef(draft);
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      const next = String(Math.round(value ?? fallback));
      draftRef.current = next;
      setDraft(next);
    }
  }, [value, fallback]);

  const commit = () => {
    const raw = draftRef.current;
    const next = clampFn(raw, value ?? fallback);
    const rounded = Math.round(next);
    const asStr = String(rounded);
    draftRef.current = asStr;
    setDraft(asStr);
    if (rounded !== Math.round(value ?? fallback)) {
      onCommit(rounded);
    }
  };

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
        }}
        onBlur={() => {
          focusedRef.current = false;
          commit();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
        className={inputClassName}
      />
    </label>
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
}) {
  const popoverRef = useRef(null);
  const [pos, setPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 260)),
      top: rect.bottom + 6,
    });
  }, [open, anchorRef]);

  useEffect(() => {
    if (!open) return undefined;
    const flushActiveLienzoInput = () => {
      const active = document.activeElement;
      if (
        active instanceof HTMLElement &&
        popoverRef.current?.contains(active)
      ) {
        active.blur();
      }
    };
    const onPointerDown = (e) => {
      if (
        popoverRef.current?.contains(e.target) ||
        anchorRef.current?.contains(e.target)
      ) {
        return;
      }
      // Commit Ancho/Alto draft before unmount (blur may be skipped on close).
      flushActiveLienzoInput();
      onClose();
    };
    const onKeyDown = (e) => {
      if (e.key !== "Escape") return;
      flushActiveLienzoInput();
      onClose();
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Ajustes del lienzo"
      className="fixed w-56 rounded-md border border-slate-200 bg-white p-3 shadow-lg"
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
          onCommit={(heightCm) => onPatchStage({ heightCm })}
          inputClassName="rounded border border-slate-200 px-1.5 py-1 text-xs disabled:bg-slate-50"
        />
      </div>
      <div className="mb-2 space-y-1.5 border-t border-slate-100 pt-2">
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={stage.showGrid !== false}
            onChange={(e) => onPatchStage({ showGrid: e.target.checked })}
          />
          Cuadrícula
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-[11px] text-slate-700">
          <input
            type="checkbox"
            disabled={!canEdit}
            checked={!!stage.showRadial}
            onChange={(e) => onPatchStage({ showRadial: e.target.checked })}
          />
          Radial
        </label>
        {stage.showRadial && (
          <div className="ml-5">
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

function StagePlotItemContextMenu({
  menu,
  onClose,
  onSelectAllOfType,
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

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const left = clamp(menu.x, 8, window.innerWidth - 240);
  const top = clamp(menu.y, 8, window.innerHeight - 160);

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
      onDragEnd={(e) => {
        const dx = e.target.x();
        const dy = e.target.y();
        e.target.position({ x: 0, y: 0 });
        onDragEnd(formation.id, formation.x + dx, formation.y + dy);
      }}
    >
      <Line
        points={linePts}
        stroke={stroke}
        strokeWidth={selected ? 2.2 : 1.4}
        dash={[8, 5]}
        lineCap="round"
        lineJoin="round"
        listening={false}
      />
      {/* Hit area invisible around guide */}
      <Line
        points={linePts}
        stroke="transparent"
        strokeWidth={18}
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
                ? "rgba(79,70,229,0.3)"
                : filled
                  ? "rgba(79,70,229,0.2)"
                  : "rgba(255,255,255,0.85)"
            }
            stroke={isSnapTarget ? "#4f46e5" : filled ? "#4f46e5" : stroke}
            strokeWidth={isSnapTarget ? 2.5 : 1}
            dash={isSnapTarget ? undefined : filled ? undefined : [3, 2]}
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
  draggable,
  shapeRef,
  onSelect,
  onContextMenu,
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
  const pathD = getStagePlotSilhouettePath(item.type);
  const iconImage = useStagePlotIcon(item.type, fill);
  const stroke = selected ? "#f59e0b" : "#0f172a";
  const strokeW = selected ? 2.2 : 1.1;
  const silScale = Math.min(w / VB, h / VB);
  const iconNatural = useMemo(
    () => (iconImage ? getStagePlotImageNaturalSize(iconImage) : null),
    [iconImage],
  );
  const visualBounds = useMemo(() => {
    if (item.type === "text") {
      return getStagePlotItemVisualBounds(w, h, "catalog");
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
  }, [item.type, iconImage, iconNatural, w, h, pathD]);
  const boundsW = visualBounds.drawW;
  const boundsH = visualBounds.drawH;
  const itemScale = item.scale > 0 ? item.scale : 1;

  useLayoutEffect(() => {
    if (!selected) return;
    const node = shapeRef?.current;
    if (!node) return;
    const tr = node.getStage()?.findOne("Transformer");
    if (tr?.nodes()?.includes(node)) {
      tr.forceUpdate();
      tr.getLayer()?.batchDraw();
    }
  }, [boundsW, boundsH, itemScale, selected, shapeRef, iconImage]);

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
      {/* Hit + selección + bounds del Transformer = rectángulo visual del icono */}
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
      {iconImage && iconNatural?.w && iconNatural?.h ? (
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
      {item.type === "text" && (
        <Text
          text={item.label || "Texto"}
          fontSize={11}
          fontStyle="bold"
          fill="#0f172a"
          offsetX={w / 2}
          offsetY={-h / 2 - 14}
          width={Math.max(w, 56)}
          align="center"
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
    }
    return () => {
      cancelled = true;
    };
  }, [type, color]);

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
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedFormationId, setSelectedFormationId] = useState(null);
  const [rightPanel, setRightPanel] = useState("organico"); // channels | organico
  const [syncState, setSyncState] = useState("idle"); // idle|dirty|saving|saved|error
  const [paletteCat, setPaletteCat] = useState(null);
  const zCounterRef = useRef(1);
  const saveTimerRef = useRef(null);
  const skipSaveRef = useRef(true);
  const stageWrapRef = useRef(null);
  const viewportRef = useRef({ scale: 1, x: 40, y: 40 });
  const [canvasSize, setCanvasSize] = useState({ w: 640, h: 420 });
  const [viewport, setViewport] = useState({ scale: 1, x: 40, y: 40 });
  const [paletteDrag, setPaletteDrag] = useState(null); // { type, name, color, x, y }
  /** Vista previa de params mientras se arrastra un asa de formación. */
  const [formationResizePreview, setFormationResizePreview] = useState(null);
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
  /** Tooltip hover sobre ítem dibujado. */
  const [itemHoverTooltip, setItemHoverTooltip] = useState(null);
  const itemDraggingRef = useRef(false);
  const [lienzoOpen, setLienzoOpen] = useState(false);
  const lienzoBtnRef = useRef(null);
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
      commitPayload((prev) => {
        const formations = (prev.formations || []).map((f) =>
          f.id === id ? { ...f, x: f.x + dx, y: f.y + dy } : f,
        );
        const items = reanchorItemsToFormations(
          formations,
          prev.items,
          prev.stage,
          [id],
        );
        return { ...prev, formations, items };
      });
      return true;
    },
    [canEdit, commitPayload],
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
      if (lienzoOpen || itemContextMenu) return;
      e.preventDefault();
      setFullscreen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [fullscreen, lienzoOpen, itemContextMenu]);

  useEffect(() => {
    if (!canEdit) return undefined;
    const onKeyDown = (e) => {
      if (isEditableKeyboardTarget(e.target)) return;
      if (lienzoOpen || itemContextMenu) return;
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
    undo,
    redo,
    deleteKeyboardSelection,
    moveKeyboardSelection,
  ]);

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
    () => buildStagePlotOrganicoCompare(payload.items, roster),
    [payload.items, roster],
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

  const load = useCallback(async () => {
    if (!supabase || !program?.id) return;
    setLoading(true);
    skipSaveRef.current = true;
    skipHistoryRef.current = true;
    userZoomedRef.current = false;
    const { data, error } = await getStagePlotByPrograma(supabase, program.id);
    if (error) {
      console.error(error);
      toast.error(error.message || "No se pudo cargar el plano");
      setLoading(false);
      skipHistoryRef.current = false;
      return;
    }
    const p = normalizeStagePlotPayload(data.payload);
    historyRef.current = { past: [], future: [] };
    payloadRef.current = p;
    setPayload(p);
    setNombre(data.nombre || "");
    setSelectedIds([]);
    setSelectedFormationId(null);
    syncZCounter(p.items);
    setSyncState("idle");
    setLoading(false);
    requestAnimationFrame(() => {
      skipSaveRef.current = false;
      skipHistoryRef.current = false;
    });
  }, [supabase, program?.id, syncZCounter]);

  useEffect(() => {
    load();
  }, [load]);

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
  }, [loading, fitViewport]);

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
    async (nextPayload, nextNombre) => {
      if (!canEdit || !supabase || !program?.id) return;
      setSyncState("saving");
      const { error } = await upsertStagePlot(supabase, program.id, {
        payload: nextPayload,
        nombre: nextNombre,
      });
      if (error) {
        console.error(error);
        setSyncState("error");
        toast.error(error.message || "Error al guardar el plano");
        return;
      }
      setSyncState("saved");
    },
    [canEdit, supabase, program?.id],
  );

  useEffect(() => {
    if (skipSaveRef.current || !canEdit) return;
    setSyncState("dirty");
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      persist(payload, nombre);
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [payload, nombre, canEdit, persist]);

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
    const facing = resolveFormationFacingPoint(
      prev.items,
      prev.stage,
      fm.facing,
    );
    updateSelectedFormation({ x: facing.x });
  };

  const handleSelectFormation = useCallback((id) => {
    setSelectedFormationId(id);
    setSelectedIds([]);
  }, []);

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
    setSelectedIds(id ? [id] : []);
  }, []);

  const handleSelectItem = useCallback((id, e) => {
    const evt = e?.evt;
    const additive = !!(
      evt &&
      (evt.ctrlKey || evt.metaKey || evt.shiftKey)
    );
    setSelectedFormationId(null);
    setSelectedIds((prev) => {
      if (additive) {
        return prev.includes(id)
          ? prev.filter((x) => x !== id)
          : [...prev, id];
      }
      // Mantener multi si se hace mousedown en un miembro ya seleccionado (arrastre grupal).
      if (prev.includes(id) && prev.length > 1) return prev;
      return [id];
    });
  }, []);

  const closeItemContextMenu = useCallback(() => {
    setItemContextMenu(null);
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
      const canUngroup = selItems.some((it) => it.groupId);      setItemContextMenu({
        itemId: id,
        type: item.type,
        referenceScale: item.scale > 0 ? item.scale : 1,
        sameTypeCount,
        selectedCount: nextSel.length,
        selectedIds: nextSel,
        canUngroup,
        x: nativeEvt?.clientX ?? 0,
        y: nativeEvt?.clientY ?? 0,
      });
    },
    [canEdit, hideItemHoverTooltip],
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
      };
    });
    commitPayload((prev) => ({
      ...prev,
      items: [...prev.items, ...clones],
    }));
    setSelectedIds(clones.map((c) => c.id));
    setSelectedFormationId(null);
  };

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

  const handleFormationDragEnd = useCallback((formationId, x, y) => {
    commitPayload((prev) => {
      const formations = (prev.formations || []).map((f) =>
        f.id === formationId ? { ...f, x, y } : f,
      );
      const items = reanchorItemsToFormations(
        formations,
        prev.items,
        prev.stage,
        [formationId],
      );
      return { ...prev, formations, items };
    });
  }, [commitPayload]);

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
    for (const it of selectedItems) {
      const cat = getStagePlotCatalogItem(it.type);
      const itemScale = it.scale > 0 ? it.scale : 1;
      const halfW = ((cat?.w || 40) * itemScale) / 2;
      const halfH = ((cat?.h || 40) * itemScale) / 2;
      minX = Math.min(minX, it.x - halfW);
      maxX = Math.max(maxX, it.x + halfW);
      minY = Math.min(minY, it.y - halfH);
    }
    const cx = (minX + maxX) / 2;
    const sx = viewport.x + cx * viewport.scale;
    const sy = viewport.y + minY * viewport.scale - 44;
    return {
      left: Math.max(8, Math.min(canvasSize.w - 96, sx - 44)),
      top: Math.max(8, sy),
    };
  }, [selectedItems, viewport, canvasSize.w]);

  const handleExportPdf = async () => {
    try {
      await exportStagePlotPdf(program, payload, nombre || undefined);
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar el PDF");
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
        <div className="flex min-w-0 items-center gap-2">
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
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre del plano (opcional)"
              className="w-44 rounded border border-slate-200 px-2 py-1 text-xs"
            />
          )}
          <button
            ref={lienzoBtnRef}
            type="button"
            onMouseDown={() => {
              // Flush Ancho/Alto before toggle-close (anchor click skips popover outside-handler).
              if (!lienzoOpen) return;
              const active = document.activeElement;
              if (active instanceof HTMLElement) active.blur();
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
          {onBack && !embedded && (
            <button
              type="button"
              onClick={onBack}
              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-slate-50"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

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
                className="absolute z-[30] flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 shadow-lg"
                style={{
                  left: floatingToolbarPos.left,
                  top: floatingToolbarPos.top,
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              >
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

                if (!interactive) {
                  setSelectedIds([]);
                  setSelectedFormationId(null);
                  closeItemContextMenu();
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
                {renderFormations.map((fm) => (
                  <FormationShape
                    key={fm.id}
                    formation={fm}
                    items={payload.items}
                    stage={payload.stage}
                    selected={selectedFormationId === fm.id}
                    draggable={canEdit && !formationResizePreview}
                    highlightSlotId={itemSnapPreview?.slotId ?? null}
                    onSelect={handleSelectFormation}
                    onDragEnd={handleFormationDragEnd}
                  />
                ))}
                <SnapMagnetGuide preview={itemSnapPreview} />
                {sharedAlignGroup && (
                  <AlignLineGuide group={sharedAlignGroup} />
                )}
                {canEdit && formationForHandles && (
                  <FormationResizeHandles
                    formation={formationForHandles}
                    handleSize={formationHandleSize}
                    strokeWidth={formationHandleStroke}
                    onHandleDragMove={handleFormationHandleDragMove}
                    onHandleDragEnd={handleFormationHandleDragEnd}
                  />
                )}
                {sortedItems.map((item) => (
                  <ItemShape
                    key={item.id}
                    item={item}
                    selected={selectedIdSet.has(item.id)}
                    draggable={canEdit && item.type !== "conductor"}
                    shapeRef={(node) => {
                      if (node) itemNodeRefs.current.set(item.id, node);
                      else itemNodeRefs.current.delete(item.id);
                    }}
                    onSelect={handleSelectItem}
                    onContextMenu={handleItemContextMenu}
                    onMouseEnter={showItemHoverTooltip}
                    onMouseLeave={hideItemHoverTooltip}
                    onMouseMove={moveItemHoverTooltip}
                    onDragStart={handleItemDragStart}
                    onDragMove={handleItemDragMove}
                    onDragEnd={handleItemDragEnd}
                    onTransformEnd={handleItemTransformEnd}
                  />
                ))}
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
              onUnifyScaleOfType={unifyScaleOfType}
              onGroup={groupSelected}
              onUngroup={ungroupSelected}
              onAlignInLine={alignSelectedInLine}
              overlayZ={portalMenuZ}
            />
          )}

          {/* Altura fija siempre: evita que el lienzo salte al seleccionar (ResizeObserver/fitViewport). */}
          <div className="flex h-11 shrink-0 items-center gap-2 overflow-x-auto border-t border-slate-200 bg-white px-3">
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
                        min={20}
                        value={Math.round(selectedFormation.params.rx || 0)}
                        onChange={(e) =>
                          updateSelectedFormation({
                            params: { rx: Number(e.target.value) || 20 },
                          })
                        }
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                      />
                    </label>
                    <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                      ry
                      <input
                        type="number"
                        min={20}
                        value={Math.round(selectedFormation.params.ry || 0)}
                        onChange={(e) =>
                          updateSelectedFormation({
                            params: { ry: Number(e.target.value) || 20 },
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
                      min={40}
                      value={Math.round(selectedFormation.params.length || 0)}
                      onChange={(e) =>
                        updateSelectedFormation({
                          params: { length: Number(e.target.value) || 40 },
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
                        min={40}
                        value={Math.round(selectedFormation.params.width || 0)}
                        onChange={(e) =>
                          updateSelectedFormation({
                            params: { width: Number(e.target.value) || 40 },
                          })
                        }
                        className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs"
                      />
                    </label>
                    <label className="flex shrink-0 items-center gap-1 text-[11px] text-slate-600">
                      Prof.
                      <input
                        type="number"
                        min={40}
                        value={Math.round(selectedFormation.params.depth || 0)}
                        onChange={(e) =>
                          updateSelectedFormation({
                            params: { depth: Number(e.target.value) || 40 },
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
                    className="inline-flex shrink-0 items-center gap-1 rounded border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700 hover:bg-indigo-100"
                    title="Centrar la formación en el eje X del director"
                  >
                    Centrar
                  </button>
                ) : null}
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
                    : "Selección"}
                </span>
                {selected && (
                  <input
                    value={selected.label || ""}
                    onChange={(e) => updateSelected({ label: e.target.value })}
                    className="w-36 shrink-0 rounded border border-slate-200 px-2 py-1 text-xs"
                    placeholder="Etiqueta"
                  />
                )}
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
                {selected && (
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
