import React, { useState, useMemo } from "react";
import {
  IconFileText,
  IconX,
  IconMapPin,
  IconArrowRight,
  IconDownload,
  IconAlertTriangle,
} from "../../components/ui/Icons";
import { collectViaticosLocalitiesWithoutDefinedStop } from "../../utils/roadmapExport";

const MAX_VIATICOS_PARADA_WARN = 12;

function formatParadaIssueLine(issue) {
  const parts = [];
  if (issue.missingSubida) parts.push("subida");
  if (issue.missingBajada) parts.push("bajada");
  const trayecto =
    parts.length === 2
      ? "subida y bajada"
      : parts[0] === "subida"
        ? "subida"
        : "bajada";

  const pax = issue.passengers || [];
  const paxText =
    pax.length <= MAX_VIATICOS_PARADA_WARN
      ? pax.join("; ")
      : `${pax.slice(0, MAX_VIATICOS_PARADA_WARN).join("; ")}; y ${pax.length - MAX_VIATICOS_PARADA_WARN} más`;

  return {
    localityName: issue.localityName,
    trayecto,
    paxText,
  };
}

export default function CnrtExportModal({
  transport,
  events,
  onClose,
  onExport,
  title = "Exportar Logística", // Prop por defecto por si no se envía
  showAlignViaticos = false,
  viaticosAlignPassengers = [],
  viaticosAlignRouteRules = [],
  transportId = null,
}) {
  // 1. Ordenamos eventos cronológicamente para los selectores
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = (a.fecha || "") + (a.hora_inicio || "");
      const dateB = (b.fecha || "") + (b.hora_inicio || "");
      return dateA.localeCompare(dateB);
    });
  }, [events]);

  // 2. Estados locales (Solo rango de fechas)
  const [startId, setStartId] = useState(String(sortedEvents[0]?.id || ""));
  const [endId, setEndId] = useState(
    String(sortedEvents[sortedEvents.length - 1]?.id || ""),
  );
  const [exportFormat, setExportFormat] = useState("pdf");
  const [alignViaticos, setAlignViaticos] = useState(false);
  const [recorridoParcial, setRecorridoParcial] = useState(false);

  const resolvedTransportId = transportId ?? transport?.id ?? null;

  const fullStartId = String(sortedEvents[0]?.id || "");
  const fullEndId = String(sortedEvents[sortedEvents.length - 1]?.id || "");
  const effectiveStartId = recorridoParcial ? startId : fullStartId;
  const effectiveEndId = recorridoParcial ? endId : fullEndId;

  const paradaIssues = useMemo(() => {
    if (!alignViaticos || !showAlignViaticos || !resolvedTransportId) return [];
    return collectViaticosLocalitiesWithoutDefinedStop({
      passengers: viaticosAlignPassengers,
      transportId: resolvedTransportId,
      routeRules: viaticosAlignRouteRules,
      events,
      startId: effectiveStartId,
      endId: effectiveEndId,
    });
  }, [
    alignViaticos,
    showAlignViaticos,
    resolvedTransportId,
    viaticosAlignPassengers,
    viaticosAlignRouteRules,
    events,
    effectiveStartId,
    effectiveEndId,
  ]);

  // 3. Formateador de etiquetas para los selectores
  const formatLabel = (evt) => {
    if (!evt) return "-";
    const hora = evt.hora_inicio?.slice(0, 5) || "--:--";
    const [y, m, d] = (evt.fecha || "2000-01-01").split("-");
    const fechaFormateada = `${d}/${m}`;

    const cleanText = (input) => {
      const raw = String(input || "").trim();
      if (!raw) return "";
      try {
        if (typeof window !== "undefined" && typeof DOMParser !== "undefined") {
          const doc = new DOMParser().parseFromString(raw, "text/html");
          return (doc.body?.textContent || "")
            .replace(/\u00a0/g, " ")
            .replace(/\s+/g, " ")
            .trim();
        }
      } catch {
        // fall back
      }
      return raw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
    };

    const nota = cleanText(evt.descripcion);
    const locacion = evt.locaciones?.nombre || "";

    if (nota) {
      const notaCorta =
        nota.length > 30 ? nota.substring(0, 27) + "..." : nota;
      return `${notaCorta} - ${fechaFormateada} ${hora}HS (${locacion})`;
    }
    return `${locacion || "PARADA"} - ${fechaFormateada} ${hora}HS`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        {/* Cabecera */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <IconFileText className="text-indigo-600" /> {title}
          </h3>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-full text-slate-400"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
          {/* Info del Transporte */}
          <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100 text-sm text-indigo-800">
            <p className="font-bold">
              {transport.transportes?.nombre || "Transporte"}
            </p>
            <p className="text-xs opacity-75">{transport.detalle || ""}</p>
          </div>

          <div className="space-y-4">
            {/* Formato de exportación */}
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
              <label className="block text-[10px] font-black text-slate-400 mb-2 uppercase tracking-wider">
                Formato
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setExportFormat("pdf")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    exportFormat === "pdf"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  PDF
                </button>
                <button
                  type="button"
                  onClick={() => setExportFormat("excel")}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${
                    exportFormat === "excel"
                      ? "bg-indigo-600 text-white border-indigo-600"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  Excel
                </button>
              </div>
              <p className="mt-2 text-[11px] text-slate-500">
                Por defecto: <b>PDF</b>
              </p>
            </div>

            {showAlignViaticos && (
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:border-slate-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={alignViaticos}
                    onChange={(e) => setAlignViaticos(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
                  />
                  <span className="text-xs">
                    <span className="font-semibold text-slate-800">
                      Alinear con viáticos
                    </span>
                    <span className="block mt-0.5 text-slate-600 leading-snug">
                      Subida y bajada según la localidad de viáticos (misma
                      lógica que el PDF de viático). Se incluyen todas las
                      paradas del rango seleccionado.
                    </span>
                  </span>
                </label>

                {alignViaticos && paradaIssues.length > 0 && (
                  <div
                    role="alert"
                    className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950"
                  >
                    <div className="flex items-start gap-2 font-semibold text-amber-900 mb-2">
                      <IconAlertTriangle
                        size={14}
                        className="shrink-0 mt-0.5 text-amber-600"
                      />
                      <span>
                        Faltan reglas de parada (alcance Localidad) en el tramo
                        seleccionado
                      </span>
                    </div>
                    <ul className="space-y-1.5 pl-0 list-none">
                      {paradaIssues.map((issue) => {
                        const { localityName, trayecto, paxText } =
                          formatParadaIssueLine(issue);
                        return (
                          <li
                            key={`${issue.localityId ?? localityName}-${trayecto}`}
                            className="text-amber-950/90 leading-snug"
                          >
                            <span className="font-medium">{localityName}</span>
                            {`: sin regla de ${trayecto}`}
                            {paxText ? (
                              <span className="text-amber-800/80">
                                {" "}
                                ({paxText})
                              </span>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-2 text-[11px] text-amber-800 leading-snug">
                      Creá una regla de ruta con alcance Localidad para cada
                      ciudad de viáticos (subida y/o bajada según corresponda).
                    </p>
                  </div>
                )}
              </div>
            )}

            <label className="flex items-start gap-2.5 p-3 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer hover:border-slate-300 transition-colors">
              <input
                type="checkbox"
                checked={recorridoParcial}
                onChange={(e) => setRecorridoParcial(e.target.checked)}
                className="mt-0.5 rounded border-slate-300 text-slate-700 focus:ring-slate-400"
              />
              <span className="text-xs">
                <span className="font-semibold text-slate-800">
                  Recorrido parcial
                </span>
                <span className="block mt-0.5 text-slate-600 leading-snug">
                  Por defecto se exporta el recorrido completo. Activá esta opción
                  para elegir parada de inicio y fin.
                </span>
              </span>
            </label>

            {recorridoParcial && (
              <>
                {/* SELECT DESDE */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">
                    Desde (Salida)
                  </label>
                  <div className="relative">
                    <select
                      className="w-full text-[12px] p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none pr-10 shadow-sm font-medium text-slate-700"
                      value={startId}
                      onChange={(e) => setStartId(e.target.value)}
                    >
                      {sortedEvents.map((evt) => (
                        <option key={evt.id} value={String(evt.id)}>
                          {formatLabel(evt)}
                        </option>
                      ))}
                    </select>
                    <IconMapPin
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                      size={16}
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="bg-slate-100 p-1 rounded-full text-slate-300">
                    <IconArrowRight className="rotate-90" size={16} />
                  </div>
                </div>

                {/* SELECT HASTA */}
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase tracking-wider">
                    Hasta (Llegada)
                  </label>
                  <div className="relative">
                    <select
                      className="w-full text-[12px] p-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none pr-10 shadow-sm font-medium text-slate-700"
                      value={endId}
                      onChange={(e) => setEndId(e.target.value)}
                    >
                      {sortedEvents.map((evt) => (
                        <option key={evt.id} value={String(evt.id)}>
                          {formatLabel(evt)}
                        </option>
                      ))}
                    </select>
                    <IconMapPin
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none"
                      size={16}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Acciones */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button
            // Ya no enviamos el tercer argumento, solo start y end
            onClick={() =>
              onExport(effectiveStartId, effectiveEndId, exportFormat, {
                alignViaticos,
              })
            }
            className="px-5 py-2 text-xs font-bold text-white rounded-lg shadow-lg transition-all flex items-center gap-2 active:scale-95 bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700"
          >
            <IconDownload size={14} />
            Descargar {exportFormat === "pdf" ? "PDF" : "Excel"}
          </button>
        </div>
      </div>
    </div>
  );
}