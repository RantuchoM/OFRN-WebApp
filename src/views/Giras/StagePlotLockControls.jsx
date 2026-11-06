import React from "react";
import {
  IconEye,
  IconLock,
  IconLockOpen,
  IconUsers,
} from "../../components/ui/Icons";

function viewerSummary(viewers, selfId) {
  const others = (viewers || []).filter(
    (v) => selfId == null || Number(v.id) !== Number(selfId),
  );
  if (!others.length) return "";
  const names = others.map((v) => v.nombre).filter(Boolean);
  if (names.length <= 3) return `Viendo: ${names.join(", ")}`;
  return `Viendo: ${names.slice(0, 2).join(", ")} y ${names.length - 2} más`;
}

/**
 * Tomar / ceder el candado del lienzo y quién lo mira.
 */
export default function StagePlotLockControls({
  staffCanEdit,
  holdsLock,
  settling,
  busy,
  holderName,
  viewers,
  selfId,
  onTake,
  onRelease,
  compact = false,
}) {
  const watching = viewerSummary(viewers, selfId);
  const status = settling
    ? "Sincronizando el plano…"
    : holdsLock
      ? "Tenés el control"
      : holderName
        ? `Control: ${holderName}`
        : "Libre";

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${
        compact
          ? "border-b border-slate-200 bg-slate-50 px-3 py-1.5"
          : ""
      }`}
    >
      <span className="inline-flex max-w-full items-center gap-1 text-[11px] font-medium text-slate-600">
        {holdsLock && !settling ? (
          <IconLock size={14} className="shrink-0 text-indigo-600" />
        ) : (
          <IconEye size={14} className="shrink-0 text-slate-500" />
        )}
        <span className="truncate">{status}</span>
      </span>
      {watching ? (
        <span
          className="inline-flex max-w-[16rem] items-center gap-1 truncate text-[11px] text-slate-500"
          title={watching}
        >
          <IconUsers size={14} className="shrink-0" />
          <span className="truncate">{watching}</span>
        </span>
      ) : null}
      {staffCanEdit && holdsLock ? (
        <button
          type="button"
          onClick={onRelease}
          disabled={busy || settling}
          className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          title="Soltar el control y dejar el plano en solo lectura"
        >
          <IconLockOpen size={14} />
          Ceder control
        </button>
      ) : null}
      {staffCanEdit && !holdsLock ? (
        <button
          type="button"
          onClick={onTake}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded border border-indigo-200 bg-indigo-600 px-2 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
          title="Editar este lienzo. Si otra persona está editando, el control pasa sin que acepte."
        >
          <IconLock size={14} />
          Tomar control
        </button>
      ) : null}
    </div>
  );
}
