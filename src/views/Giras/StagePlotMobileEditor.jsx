import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconPlus,
  IconX,
  IconMaximize,
  IconLayers,
  IconMusic,
  IconLayout,
} from "../../components/ui/Icons";
import {
  STAGE_PLOT_CATALOG,
  STAGE_PLOT_MUSICIAN_INSTRUMENT_CATEGORIES,
} from "../../utils/stagePlotCatalog";
import { STAGE_PLOT_FORMATIONATION_LABELS } from "../../utils/stagePlotFormations";

/** Viewport width under which Escenario prefers the mobile editor. */
export const STAGE_PLOT_MOBILE_BREAKPOINT_PX = 768;

/**
 * Common add targets for the mobile “+” sheet (short, touch-friendly).
 * Instruments: static catalog musician types only (no DB variants / Editor panel).
 */
export const STAGE_PLOT_MOBILE_ESCENARIO_TYPES = [
  "music_stand",
  "chair",
  "banqueta",
  "conductor",
  "tarima_rect",
  "tarima_oval",
];

export const STAGE_PLOT_MOBILE_AUDIO_TYPES = ["mic", "mic_stand"];

/**
 * @param {number} [breakpoint]
 * @returns {boolean}
 */
export function useStagePlotNarrowViewport(
  breakpoint = STAGE_PLOT_MOBILE_BREAKPOINT_PX,
) {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(`(max-width: ${breakpoint - 1}px)`).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [breakpoint]);

  return narrow;
}

function catalogItemsByTypes(types) {
  const set = new Set(types);
  return STAGE_PLOT_CATALOG.filter((it) => set.has(it.type));
}

function musicianCategoriesGrouped() {
  const order = [];
  const map = new Map();
  for (const item of STAGE_PLOT_CATALOG) {
    if (!STAGE_PLOT_MUSICIAN_INSTRUMENT_CATEGORIES.has(item.category)) continue;
    if (!map.has(item.category)) {
      map.set(item.category, []);
      order.push(item.category);
    }
    map.get(item.category).push(item);
  }
  return order.map((category) => ({ category, items: map.get(category) }));
}

/**
 * Compact top bar for the fullscreen mobile editor.
 */
export function StagePlotMobileTopBar({
  syncClassName,
  plotLabel,
  zoomPct,
  onZoomIn,
  onZoomOut,
  onFit,
  onClose,
}) {
  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3 py-2 safe-area-pt">
      <button
        type="button"
        onClick={onClose}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-600 active:bg-slate-100"
        title="Cerrar editor móvil"
        aria-label="Cerrar editor móvil"
      >
        <IconX size={20} />
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block h-2 w-2 shrink-0 rounded-full ${syncClassName}`}
            title="Estado de guardado"
          />
          <p className="truncate text-sm font-semibold text-slate-800">
            Escenario
          </p>
        </div>
        {plotLabel ? (
          <p className="truncate text-[11px] text-slate-500">{plotLabel}</p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onZoomOut}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-medium text-slate-700 active:bg-slate-100"
          title="Alejar"
          aria-label="Alejar"
        >
          −
        </button>
        <button
          type="button"
          onClick={onFit}
          className="inline-flex h-10 items-center gap-1 rounded-full border border-slate-200 px-2.5 text-[11px] font-medium text-slate-600 active:bg-slate-100"
          title="Ajustar vista"
        >
          <IconMaximize size={14} />
          {zoomPct}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          className="inline-flex h-10 min-w-10 items-center justify-center rounded-full border border-slate-200 text-lg font-medium text-slate-700 active:bg-slate-100"
          title="Acercar"
          aria-label="Acercar"
        >
          +
        </button>
      </div>
    </div>
  );
}

/**
 * Floating “+” to open the add sheet.
 */
export function StagePlotMobileAddFab({ onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="pointer-events-auto absolute bottom-4 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg active:bg-indigo-700 disabled:opacity-40"
      title="Agregar"
      aria-label="Agregar elemento"
    >
      <IconPlus size={28} />
    </button>
  );
}

function AddSheetSection({ title, icon: Icon, children }) {
  return (
    <section className="mb-4">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {Icon ? <Icon size={14} /> : null}
        {title}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{children}</div>
    </section>
  );
}

function AddSheetTile({ label, color, onClick, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-[48px] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-left text-sm font-medium text-slate-800 active:border-indigo-300 active:bg-indigo-50 disabled:opacity-40"
    >
      <span
        className="h-3 w-3 shrink-0 rounded-sm"
        style={{ background: color || "#64748b" }}
        aria-hidden
      />
      <span className="leading-tight">{label}</span>
    </button>
  );
}

/**
 * Bottom sheet to add common stage-plot pieces (touch-friendly).
 */
export function StagePlotMobileAddSheet({
  open,
  onClose,
  canEdit,
  onAddType,
  onAddFormation,
  onAddDirector,
  onAddTarima,
  overlayZ = 100,
}) {
  if (!open) return null;

  const escenario = catalogItemsByTypes(STAGE_PLOT_MOBILE_ESCENARIO_TYPES);
  const audio = catalogItemsByTypes(STAGE_PLOT_MOBILE_AUDIO_TYPES);
  const musicians = musicianCategoriesGrouped();

  const handleType = (type) => {
    if (!canEdit) return;
    if (type === "conductor") {
      onAddDirector?.();
    } else if (type === "tarima_rect" || type === "tarima_oval") {
      onAddTarima?.(type);
    } else {
      onAddType?.(type);
    }
    onClose?.();
  };

  return createPortal(
    <div
      className="fixed inset-0 flex flex-col justify-end"
      style={{ zIndex: overlayZ }}
      role="dialog"
      aria-modal="true"
      aria-label="Agregar al escenario"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative max-h-[78vh] overflow-y-auto rounded-t-2xl bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 shadow-xl">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div>
            <p className="text-base font-semibold text-slate-900">Agregar</p>
            <p className="text-[11px] text-slate-500">
              Toque para colocar cerca del centro
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        <AddSheetSection title="Escenario" icon={IconLayout}>
          {escenario.map((it) => (
            <AddSheetTile
              key={it.type}
              label={it.name}
              color={it.color}
              disabled={!canEdit}
              onClick={() => handleType(it.type)}
            />
          ))}
        </AddSheetSection>

        <AddSheetSection title="Formaciones" icon={IconLayers}>
          {Object.entries(STAGE_PLOT_FORMATIONATION_LABELS).map(
            ([kind, label]) => (
              <AddSheetTile
                key={kind}
                label={label}
                color="#4f46e5"
                disabled={!canEdit}
                onClick={() => {
                  if (!canEdit) return;
                  onAddFormation?.(kind);
                  onClose?.();
                }}
              />
            ),
          )}
        </AddSheetSection>

        {musicians.map(({ category, items }) => (
          <AddSheetSection key={category} title={category} icon={IconMusic}>
            {items.map((it) => (
              <AddSheetTile
                key={it.type}
                label={it.name}
                color={it.color}
                disabled={!canEdit}
                onClick={() => handleType(it.type)}
              />
            ))}
          </AddSheetSection>
        ))}

        <AddSheetSection title="Audio" icon={IconMusic}>
          {audio.map((it) => (
            <AddSheetTile
              key={it.type}
              label={it.name}
              color={it.color}
              disabled={!canEdit}
              onClick={() => handleType(it.type)}
            />
          ))}
        </AddSheetSection>
      </div>
    </div>,
    document.body,
  );
}

/**
 * Landing when Escenario is open on a narrow viewport but the mobile editor
 * is not active (user closed it, or chose desktop chrome).
 */
export function StagePlotMobileEntryCard({
  onOpenMobile,
  onUseDesktop,
  canEdit,
}) {
  return (
    <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 bg-slate-50 px-6 py-10 text-center">
      <IconLayout size={36} className="text-indigo-600" />
      <div className="max-w-sm space-y-1">
        <h3 className="text-lg font-semibold text-slate-900">
          Editor móvil de escenario
        </h3>
        <p className="text-sm text-slate-600">
          Pantalla completa para mover, copiar, eliminar y agregar piezas.
          Pensado para ajustes mínimos.
        </p>
      </div>
      {canEdit ? (
        <button
          type="button"
          onClick={onOpenMobile}
          className="inline-flex min-h-12 w-full max-w-xs items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white active:bg-indigo-700"
        >
          <IconMaximize size={18} />
          Abrir editor móvil
        </button>
      ) : (
        <p className="text-sm text-slate-500">Solo lectura en este dispositivo.</p>
      )}
      {onUseDesktop ? (
        <button
          type="button"
          onClick={onUseDesktop}
          className="text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
        >
          Usar vista de escritorio
        </button>
      ) : null}
    </div>
  );
}

/**
 * Optional portal shell. Prefer driving UI from ProgramStagePlotEditor via
 * `mobileUi` so payload/autosave stay on a single instance.
 */
export default function StagePlotMobileEditor({
  open,
  children,
  zIndex = 9999,
}) {
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 flex flex-col bg-white"
      style={{ zIndex }}
      data-stage-plot-mobile-editor
    >
      {children}
    </div>,
    document.body,
  );
}
