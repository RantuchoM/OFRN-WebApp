import React, { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  IconX,
  IconFileText,
  IconClipboard,
  IconPrinter,
  IconFileExcel,
  IconLoader,
  IconCheck,
} from "../../components/ui/Icons";
import RoomingReportsHubModal from "../Giras/RoomingReportsHubModal";
import {
  buildFimbaPedidoText,
  buildFimbaDetallePasajeros,
  buildFimbaPedidoGroups,
  buildFimbaRoomingPrintModel,
  printFimbaPedido,
  printFimbaDetallePasajeros,
  printFimbaRooming,
  exportFimbaPedidoExcel,
  DEFAULT_BEDS_PER_ROOM,
} from "../../utils/fimbaReports";
import {
  INITIAL_ORDER_BEDS_PER_ROOM_OPTIONS,
} from "../../utils/roomingInitialOrder";

/**
 * Hub + vistas de reportes hotelería FIMBA (pedido / texto / detalle / rooming).
 * Labels alineados a RoomingReportsHubModal OFRN.
 */
export default function FimbaHoteleriaReports({
  hoteleriaRows = [],
  edicionNombre = "",
  open,
  onClose,
  /** Si se pasa, salta el hub y abre directo ese id. */
  initialReport = null,
}) {
  const [report, setReport] = useState(initialReport);
  const [bedsPerRoom, setBedsPerRoom] = useState(DEFAULT_BEDS_PER_ROOM);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  const textSummary = useMemo(
    () =>
      buildFimbaPedidoText(hoteleriaRows, {
        bedsPerRoom,
        edicionNombre,
      }),
    [hoteleriaRows, bedsPerRoom, edicionNombre],
  );

  const groups = useMemo(
    () => buildFimbaPedidoGroups(hoteleriaRows),
    [hoteleriaRows],
  );
  const detail = useMemo(
    () => buildFimbaDetallePasajeros(hoteleriaRows),
    [hoteleriaRows],
  );
  const rooming = useMemo(
    () => buildFimbaRoomingPrintModel(hoteleriaRows),
    [hoteleriaRows],
  );

  if (!open) return null;

  const handleHubSelect = (id) => {
    if (id === "texto") {
      setReport("texto");
      return;
    }
    setReport(id);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      alert("No se pudo copiar al portapapeles.");
    }
  };

  const handleCloseAll = () => {
    setReport(null);
    onClose?.();
  };

  if (!report) {
    return (
      <RoomingReportsHubModal
        onClose={handleCloseAll}
        onSelect={handleHubSelect}
      />
    );
  }

  const titleMap = {
    pedido: "Pedido Inicial",
    texto: "Texto pedido",
    detalle: "Detalle de pasajeros",
    rooming: "Reporte de habitaciones",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={handleCloseAll}
    >
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 text-base">
              {titleMap[report] || "Reporte"}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{edicionNombre}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(report === "pedido" || report === "texto") && (
              <label className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
                Habs
                <select
                  className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white"
                  value={bedsPerRoom}
                  onChange={(e) => setBedsPerRoom(Number(e.target.value))}
                >
                  {INITIAL_ORDER_BEDS_PER_ROOM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value} title={o.title}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {(report === "pedido" || report === "texto") && (
              <button
                type="button"
                onClick={handleCopy}
                disabled={!textSummary}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-emerald-700 flex items-center gap-1.5 disabled:opacity-50"
              >
                {copied ? <IconCheck size={16} /> : <IconClipboard size={16} />}
                {copied ? "Copiado" : "Texto pedido"}
              </button>
            )}
            {report === "pedido" && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await exportFimbaPedidoExcel({
                      edicionNombre,
                      rows: hoteleriaRows,
                      bedsPerRoom,
                    });
                  } finally {
                    setBusy(false);
                  }
                }}
                className="bg-emerald-800 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-emerald-900 flex items-center gap-1.5"
              >
                {busy ? (
                  <IconLoader size={16} className="animate-spin" />
                ) : (
                  <IconFileExcel size={16} />
                )}
                Excel
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (report === "pedido" || report === "texto") {
                  printFimbaPedido(hoteleriaRows, {
                    edicionNombre,
                    bedsPerRoom,
                  });
                } else if (report === "detalle") {
                  printFimbaDetallePasajeros(hoteleriaRows, { edicionNombre });
                } else if (report === "rooming") {
                  printFimbaRooming(hoteleriaRows, { edicionNombre });
                }
              }}
              className="bg-indigo-600 text-white px-3 py-1.5 rounded text-sm font-bold hover:bg-indigo-700 flex items-center gap-1.5"
            >
              <IconPrinter size={16} /> Imprimir / PDF
            </button>
            <button
              type="button"
              onClick={() => setReport(null)}
              className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2"
            >
              Volver
            </button>
            <button
              type="button"
              onClick={handleCloseAll}
              className="p-1 text-slate-400 hover:text-slate-700"
              title="Cerrar"
            >
              <IconX size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-5 bg-white text-sm text-slate-700">
          {(report === "pedido" || report === "texto") && (
            <>
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mb-4">
                Pedido por hotel y fechas de check-in/out del artista (FIMBA no
                usa tramos de gira OFRN). Sexo desde{" "}
                <code className="text-[10px]">fimba_participantes.genero</code>;
                plazas «sin nombre» entran como sin sexo.
              </p>
              {report === "texto" ? (
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-4">
                  {textSummary || "Sin datos."}
                </pre>
              ) : (
                <div className="space-y-4">
                  {groups.filter((g) => g.totalPax > 0).length === 0 && (
                    <p className="text-amber-700">Sin plazas para el pedido.</p>
                  )}
                  {groups
                    .filter((g) => g.totalPax > 0)
                    .map((g) => (
                      <div
                        key={g.key}
                        className="border border-slate-200 rounded-xl overflow-hidden"
                      >
                        <div className="bg-slate-50 px-3 py-2 font-bold text-slate-800 flex flex-wrap gap-2 justify-between">
                          <span>{g.hotel}</span>
                          <span className="text-xs font-medium text-slate-500">
                            {g.checkin || "—"} → {g.checkout || "—"}
                            {g.early ? " · early" : ""}
                            {g.late ? " · late" : ""}
                          </span>
                        </div>
                        <div className="px-3 py-2 text-xs text-slate-500">
                          {g.artistas.join(" · ")}
                        </div>
                        <div className="px-3 pb-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                          <Stat label="Hombres" value={g.countM} />
                          <Stat label="Mujeres" value={g.countF} />
                          <Stat label="Otros / s.n." value={g.countOther} />
                          <Stat label="Total" value={g.totalPax} />
                        </div>
                      </div>
                    ))}
                  <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed bg-emerald-50/50 border border-emerald-100 rounded-xl p-3 text-slate-600">
                    {textSummary}
                  </pre>
                </div>
              )}
            </>
          )}

          {report === "detalle" && (
            <div className="space-y-5">
              {detail.map((g) =>
                g.passengers.length === 0 ? null : (
                  <div key={g.key}>
                    <h4 className="font-bold text-indigo-900 border-b border-indigo-100 pb-1 mb-2">
                      {g.hotel} · ingreso {g.checkin || "—"}
                    </h4>
                    <table className="w-full text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-left">
                          <th className="p-2 border border-slate-200">Artista</th>
                          <th className="p-2 border border-slate-200">Apellido</th>
                          <th className="p-2 border border-slate-200">Nombre</th>
                          <th className="p-2 border border-slate-200">Doc.</th>
                          <th className="p-2 border border-slate-200">Género</th>
                        </tr>
                      </thead>
                      <tbody>
                        {g.passengers.map((p, i) => (
                          <tr key={`${g.key}-${i}`}>
                            <td className="p-2 border border-slate-200">
                              {p.artista}
                            </td>
                            <td className="p-2 border border-slate-200">
                              {p.apellido}
                            </td>
                            <td className="p-2 border border-slate-200">
                              {p.nombre}
                            </td>
                            <td className="p-2 border border-slate-200">
                              {p.documento}
                            </td>
                            <td className="p-2 border border-slate-200">
                              {p.genero || "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ),
              )}
            </div>
          )}

          {report === "rooming" && (
            <div className="space-y-5">
              {rooming.map((b, idx) => (
                <div key={`${b.artista}-${idx}`}>
                  <h4 className="font-bold text-indigo-900 border-b border-indigo-100 pb-1 mb-2">
                    {b.hotel} — {b.artista}
                  </h4>
                  <p className="text-xs text-slate-500 mb-2">
                    {b.checkin || "—"} → {b.checkout || "—"}
                    {b.noches != null ? ` · ${b.noches} noches` : ""}
                  </p>
                  {!b.habitaciones.length && (
                    <p className="text-xs text-slate-400 italic">
                      Sin inventario de habitaciones.
                    </p>
                  )}
                  {b.habitaciones.map((h) => (
                    <div key={h.id || h.label} className="mb-3">
                      <div className="text-xs font-bold text-slate-700">
                        {h.label}
                        {h.matrimonial ? " · Matrimonial" : ""}
                      </div>
                      <ul className="list-disc ml-5 text-xs text-slate-600">
                        {h.ocupantes.length === 0 ? (
                          <li className="text-slate-400">(vacante)</li>
                        ) : (
                          h.ocupantes.map((o, i) => (
                            <li key={i}>
                              {o.apellido}, {o.nombre}
                              {o.documento ? ` — ${o.documento}` : ""}
                            </li>
                          ))
                        )}
                      </ul>
                    </div>
                  ))}
                  {b.sinAsignar.length > 0 && (
                    <div className="mb-2">
                      <div className="text-xs font-bold text-amber-800">
                        Sin habitación
                      </div>
                      <ul className="list-disc ml-5 text-xs">
                        {b.sinAsignar.map((o, i) => (
                          <li key={i}>
                            {o.apellido}, {o.nombre}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Stat({ label, value }) {
  return (
    <div className="bg-white border border-slate-100 rounded-lg py-2">
      <div className="text-[10px] uppercase font-bold text-slate-400">
        {label}
      </div>
      <div className="text-lg font-black text-slate-800">{value}</div>
    </div>
  );
}

/** Botón que abre el hub de reportes (iconos OFRN). */
export function FimbaHoteleriaReportsButton({
  onClick,
  disabled,
  label = "Reportes",
}) {
  return (
    <button
      type="button"
      className="fimba-btn fimba-btn-ghost"
      disabled={disabled}
      onClick={onClick}
      title="Pedido inicial, texto, detalle y habitaciones (imprimir / PDF / Excel)"
    >
      <IconFileText size={14} /> {label}
    </button>
  );
}
