import React from "react";
import {
  IconAlertCircle,
  IconEdit,
  IconChevronDown,
  IconTrash,
  IconEyeOff,
  IconList,
} from "../ui/Icons";
import { getRepertorioRowDisplay } from "../../utils/repertorioRowDisplay";
import {
  effectiveRepertorioObraDurationSeconds,
} from "../../utils/instrumentation";
import { formatSecondsToTime } from "../../utils/time";

const ADEFINIR_BADGE = (
  <span className="inline-flex shrink-0 items-center text-[9px] bg-violet-100 text-violet-800 px-1.5 py-0.5 rounded border border-violet-200 font-semibold uppercase tracking-wide">
    A definir
  </span>
);

function formatPlaceholderDuration(item) {
  const sec = effectiveRepertorioObraDurationSeconds(item);
  if (!Number.isFinite(sec) || sec <= 0) return "—";
  return formatSecondsToTime(sec) || "—";
}

function PlaceholderDurationText({ item }) {
  return (
    <span className="font-mono tabular-nums text-[10px] text-slate-600">
      {formatPlaceholderDuration(item)}
    </span>
  );
}

function PlaceholderOpcionesBadge({ item, isEditor }) {
  if (!isEditor) return null;
  const count = item.repertorio_obras_placeholder_opciones?.length ?? 0;
  if (count <= 0) return null;
  return (
    <span className="inline-flex shrink-0 items-center text-[8px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded border border-indigo-200 font-semibold">
      {count} opc.
    </span>
  );
}

function PlaceholderNotasReadOnly({ notas }) {
  const text = String(notas || "").trim();
  if (!text) return null;
  return (
    <div className="text-[10px] text-slate-600 bg-yellow-50 border border-yellow-100 rounded px-2 py-1 leading-snug whitespace-pre-wrap">
      {text}
    </div>
  );
}

/** Tarjeta móvil para slot de planificación (solo lectura; lápiz abre modal). */
export function RepertorioPlaceholderMobileCard({
  item,
  idx,
  isEditor,
  isDefinitionMode,
  isWorkPendingCuraduria,
  getCuraduriaDisplayLabel,
  onEditPlaceholder,
  moveWork,
  repId,
  visibleCount,
  removePlaceholder,
}) {
  const display = getRepertorioRowDisplay(item);

  return (
    <div
      className={`rounded-lg border border-dashed shadow-sm p-2 relative overflow-hidden border-violet-300 bg-violet-50/40 ${
        item.excluir
          ? "opacity-[0.8] saturate-[0.68] grayscale-[0.18] ring-1 ring-inset ring-slate-400/60"
          : ""
      }`}
      title={item.excluir ? "Excluida de la programación" : undefined}
    >
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400" />

      <div className="flex gap-2 pl-2 pr-1">
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <div className="flex items-center gap-0.5 shrink-0">
                <span className="bg-violet-100 text-violet-600 text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {idx + 1}
                </span>
                {item.excluir && (
                  <>
                    <span className="rounded-full p-0.5 border border-red-100 bg-white">
                      <IconEyeOff size={8} className="text-red-500" />
                    </span>
                    <span className="text-[8px] bg-slate-200 text-slate-600 px-1 rounded border border-slate-300 font-semibold leading-none py-0.5">
                      Excl
                    </span>
                  </>
                )}
              </div>
            </div>
            <span className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-violet-100 shrink-0">
              <PlaceholderDurationText item={item} />
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 mb-1">
            {ADEFINIR_BADGE}
            <PlaceholderOpcionesBadge item={item} isEditor={isEditor} />
            {isDefinitionMode && isWorkPendingCuraduria(item) && (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[8px] bg-amber-100 text-amber-800 px-1 py-0.5 rounded border border-amber-200 font-semibold uppercase">
                <IconAlertCircle size={9} className="text-amber-600" />
                Def.
              </span>
            )}
          </div>

          <div className="mb-1">
            <span className="text-xs font-semibold text-slate-800">
              {display.titulo}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-slate-500 bg-white px-1 rounded border border-violet-100">
              {display.instrumentacion || "—"}
            </span>
          </div>

          <PlaceholderNotasReadOnly notas={item.notas_especificas} />

          {isDefinitionMode &&
            (item.estado_curaduria ||
              item.observacion_curaduria?.trim()) && (
              <div className="mb-2 mt-1 border-t border-amber-100 pt-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                  {getCuraduriaDisplayLabel(item.estado_curaduria, {
                    forMusician: !isEditor,
                  })}
                </span>
                {item.observacion_curaduria?.trim() && (
                  <p className="text-[10px] text-slate-500 mt-1">
                    {item.observacion_curaduria}
                  </p>
                )}
              </div>
            )}
        </div>

        {isEditor && (
          <div className="flex flex-col items-center justify-between py-1 shrink-0">
            <button
              type="button"
              onClick={() => moveWork?.(repId, item.id, -1)}
              disabled={idx === 0}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200 disabled:opacity-25"
              title="Mover arriba"
            >
              <IconChevronDown size={14} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => onEditPlaceholder?.(item, "datos")}
              className="w-7 h-7 mt-1 mb-1 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200"
              title="Editar slot a definir"
            >
              <IconEdit size={14} />
            </button>
            {isEditor && (
              <button
                type="button"
                onClick={() => onEditPlaceholder?.(item, "opciones")}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-indigo-50 text-indigo-700 shadow-sm hover:bg-indigo-100"
                title="Opciones de obra"
              >
                <IconList size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={() => moveWork?.(repId, item.id, 1)}
              disabled={idx === visibleCount - 1}
              className="w-7 h-7 flex items-center justify-center rounded-full bg-slate-100 text-slate-700 shadow-sm hover:bg-slate-200 disabled:opacity-25"
              title="Mover abajo"
            >
              <IconChevronDown size={14} />
            </button>
            <button
              type="button"
              onClick={() => removePlaceholder?.(item.id)}
              className="w-7 h-7 mt-1 flex items-center justify-center rounded-full bg-red-50 text-red-500 shadow-sm hover:bg-red-100"
              title="Eliminar"
            >
              <IconTrash size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/** Celdas de escritorio para slot a definir (solo lectura; lápiz en columna acciones). */
export function RepertorioPlaceholderDesktopCells({
  item,
  isEditor,
  isDefinitionMode,
  getCuraduriaDisplayLabel,
  onEditPlaceholder,
  removePlaceholder,
}) {
  const display = getRepertorioRowDisplay(item);

  return (
    <>
      <td className="px-0 py-1 text-center">
        <span className="text-slate-300 text-[10px]" title="Sin obra en catálogo">
          —
        </span>
      </td>
      <td className="p-1 min-w-0 align-middle text-slate-800">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-2">
          <div className="flex max-w-[42%] shrink-0 min-w-[7rem] flex-col items-center justify-center text-center text-slate-600 gap-1">
            {ADEFINIR_BADGE}
            <PlaceholderOpcionesBadge item={item} isEditor={isEditor} />
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="text-xs font-semibold text-slate-800">
              {display.titulo}
            </span>
            <PlaceholderNotasReadOnly notas={item.notas_especificas} />
          </div>
        </div>
      </td>
      {isDefinitionMode && (
        <td className="p-1 text-center align-middle">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
            {getCuraduriaDisplayLabel(item.estado_curaduria, {
              forMusician: !isEditor,
            })}
          </span>
          {item.observacion_curaduria?.trim() && (
            <p
              className="text-[9px] text-slate-500 mt-0.5 truncate max-w-full"
              title={item.observacion_curaduria}
            >
              {item.observacion_curaduria}
            </p>
          )}
        </td>
      )}
      <td className="p-1 text-center align-middle">
        <span className="text-[10px] font-mono text-slate-500">
          {display.instrumentacion || "—"}
        </span>
      </td>
      <td className="p-1 text-center align-middle">
        <PlaceholderDurationText item={item} />
      </td>
      <td className="p-1 text-center text-slate-300 text-[10px]">—</td>
      <td className="p-1 text-center text-slate-300 text-[10px]">—</td>
      <td className="p-0 border-l border-slate-100 align-middle min-w-0" />
      <td className="px-0 py-0.5 align-middle text-center">
        {isEditor ? (
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={() => onEditPlaceholder?.(item, "datos")}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-fixed-indigo-600"
              title="Editar slot a definir"
            >
              <IconEdit size={12} />
            </button>
            <button
              type="button"
              onClick={() => onEditPlaceholder?.(item, "opciones")}
              className="rounded p-0.5 text-indigo-400 hover:bg-indigo-50 hover:text-indigo-700"
              title="Opciones de obra"
            >
              <IconList size={12} />
            </button>
            <button
              type="button"
              onClick={() => removePlaceholder?.(item.id)}
              className="rounded p-0.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              title="Eliminar slot a definir"
            >
              <IconTrash size={12} />
            </button>
          </div>
        ) : (
          <span className="text-slate-200">—</span>
        )}
      </td>
      <td className="p-1 text-center align-middle">
        {item.excluir ? (
          <span className="text-red-600 font-bold text-[10px]">NO</span>
        ) : (
          <span className="text-slate-200">-</span>
        )}
      </td>
    </>
  );
}
