import React, { useEffect, useMemo, useState } from "react";
import { getConciertosFullData } from "../../services/giraService";
import { exportConciertosToExcel } from "../../utils/excelExporter";
import { exportConciertosToPDF } from "../../utils/agendaPdfExporter";
import { getTodayDateStringLocal, formatDisplayDate } from "../../utils/dates";
import { IconDownload, IconFileExcel } from "../../components/ui/Icons";

const normalize = (val) => String(val || "").trim().toLowerCase();

const formatHora = (raw) => (raw ? String(raw).slice(0, 5) : "-");

const formatRepertorioLine = (item) => {
  const composer = String(item?.compositor || "").trim();
  const titulo = (item?.titulo || "Obra sin título").trim();
  return composer ? `${composer} - ${titulo}` : titulo;
};

export default function ConciertosView({ supabase }) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [dateFrom, setDateFrom] = useState(getTodayDateStringLocal());
  const [dateTo, setDateTo] = useState("");
  const [selectedProgramTypes, setSelectedProgramTypes] = useState(new Set());
  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());
  const [selectedFamilies, setSelectedFamilies] = useState(new Set());

  const loadConciertos = async () => {
    setLoading(true);
    try {
      const data = await getConciertosFullData(supabase, {
        dateFrom: dateFrom || null,
        dateTo: dateTo || null,
      });
      setRows(data || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConciertos();
  }, [dateFrom, dateTo]);

  const programTypes = useMemo(() => {
    const types = new Set();
    rows.forEach((row) => {
      if (row.tipo_programa) types.add(row.tipo_programa);
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  useEffect(() => {
    setSelectedProgramTypes((prev) => {
      const hasPrev = prev.size > 0;
      const next = new Set();
      programTypes.forEach((type) => {
        if (hasPrev) {
          if (prev.has(type)) next.add(type);
        } else if (normalize(type) !== "comisión" && normalize(type) !== "comision") {
          next.add(type);
        }
      });
      return next;
    });
  }, [programTypes]);

  const ensembles = useMemo(() => {
    const map = new Map();
    rows.forEach((row) => {
      (row.ensambles || []).forEach((ens) => {
        if (ens?.id == null) return;
        if (!map.has(ens.id)) map.set(ens.id, ens.nombre || `Ensamble ${ens.id}`);
      });
    });
    return Array.from(map.entries())
      .map(([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [rows]);

  const families = useMemo(() => {
    const set = new Set();
    rows.forEach((row) => {
      (row.familias || []).forEach((fam) => {
        if (fam) set.add(fam);
      });
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  useEffect(() => {
    setSelectedEnsembles((prev) => {
      const available = new Set(ensembles.map((e) => String(e.id)));
      return new Set(Array.from(prev).filter((id) => available.has(String(id))));
    });
  }, [ensembles]);

  useEffect(() => {
    setSelectedFamilies((prev) => {
      const available = new Set(families.map((f) => normalize(f)));
      return new Set(Array.from(prev).filter((f) => available.has(normalize(f))));
    });
  }, [families]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (selectedProgramTypes.size > 0 && !selectedProgramTypes.has(row.tipo_programa)) {
        return false;
      }

      if (dateFrom && row.fecha && row.fecha < dateFrom) return false;
      if (dateTo && row.fecha && row.fecha > dateTo) return false;

      const participantFilterActive =
        selectedEnsembles.size > 0 || selectedFamilies.size > 0;
      if (!participantFilterActive) return true;

      const hasSelectedEnsamble = (row.ensambles || []).some((ens) =>
        selectedEnsembles.has(String(ens.id)),
      );
      const hasSelectedFamily = (row.familias || []).some((fam) =>
        selectedFamilies.has(normalize(fam)),
      );

      return hasSelectedEnsamble || hasSelectedFamily;
    });
  }, [rows, selectedProgramTypes, selectedEnsembles, selectedFamilies, dateFrom, dateTo]);

  const tableRows = useMemo(
    () =>
      filteredRows.map((row) => {
        const ensambleLines = (row.ensambles || [])
          .map((ens) => ens.nombre)
          .filter(Boolean);
        const familiaLines = (row.familias || [])
          .filter(Boolean);
        const participantesParts = [...ensambleLines, ...familiaLines];

        const primeraLineaPrograma = [row.nomenclador, row.mes_letra]
          .filter(Boolean)
          .join(" - ");
        const segundaLineaPrograma = row.nombre_gira || "";
        const programaLabel = [primeraLineaPrograma, segundaLineaPrograma]
          .filter(Boolean)
          .join("\n");

        const locacionLocalidad = [row.locacion || "-", row.localidad || "-"].join("\n");

        const repertorioLines = (row.repertorio || []).map(formatRepertorioLine);
        return {
          id: row.id,
          fecha: formatDisplayDate(row.fecha) || row.fecha || "-",
          hora: formatHora(row.hora_inicio),
          programa: programaLabel || "-",
          participantes: participantesParts.join("\n") || "-",
          participantesEnsamble: ensambleLines,
          participantesFamilia: familiaLines,
          locacionLocalidad,
          estadoVenue: row.venue_estado || "-",
          estadoVenueColor: row.venue_estado_color || "",
          repertorio: repertorioLines.join("\n") || "-",
          repertorioLines,
        };
      }),
    [filteredRows],
  );

  const handleToggleProgramType = (type) => {
    setSelectedProgramTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleToggleEnsamble = (id) => {
    const sid = String(id);
    setSelectedEnsembles((prev) => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid);
      else next.add(sid);
      return next;
    });
  };

  const handleToggleFamily = (family) => {
    const n = normalize(family);
    setSelectedFamilies((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const handleExportExcel = async () => {
    await exportConciertosToExcel(tableRows);
  };

  const handleExportPdf = () => {
    const subtitle = `${tableRows.length} concierto(s) filtrado(s)`;
    exportConciertosToPDF(tableRows, "Gestión de Conciertos", subtitle);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Rango de fechas
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
              <input
                type="date"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Tipo de programa
            </p>
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {programTypes.length === 0 && (
                <p className="text-xs text-slate-400">Sin tipos disponibles</p>
              )}
              {programTypes.map((type) => (
                <label
                  key={type}
                  className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={selectedProgramTypes.has(type)}
                    onChange={() => handleToggleProgramType(type)}
                  />
                  <span>{type}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-black uppercase tracking-wider text-slate-500">
              Ensambles y Familias
            </p>
            <div className="max-h-28 space-y-2 overflow-y-auto rounded-lg border border-slate-200 p-2">
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Ensambles</p>
                {ensembles.map((ens) => (
                  <label
                    key={ens.id}
                    className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEnsembles.has(String(ens.id))}
                      onChange={() => handleToggleEnsamble(ens.id)}
                    />
                    <span>{ens.nombre}</span>
                  </label>
                ))}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase text-slate-400">Familias</p>
                {families.map((fam) => (
                  <label
                    key={fam}
                    className="flex cursor-pointer items-center gap-2 text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={selectedFamilies.has(normalize(fam))}
                      onChange={() => handleToggleFamily(fam)}
                    />
                    <span>{fam}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={loadConciertos}
            className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
            disabled={loading}
          >
            {loading ? "Actualizando..." : "Actualizar"}
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
            disabled={tableRows.length === 0}
          >
            <IconFileExcel size={14} />
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={handleExportPdf}
            className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
            disabled={tableRows.length === 0}
          >
            <IconDownload size={14} />
            Exportar PDF
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full border-separate border-spacing-0 text-sm">
          <thead className="sticky top-0 z-10 bg-slate-100 text-xs uppercase tracking-wider text-slate-600">
            <tr>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Fecha</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Hora</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Programa</th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">
                Ensambles/Familias
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">
                Locación/Localidad
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">
                Estado del Venue
              </th>
              <th className="border-b border-slate-200 px-3 py-2 text-left">Repertorio</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                  Cargando conciertos...
                </td>
              </tr>
            )}
            {!loading && tableRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-sm text-slate-500">
                  No hay conciertos para los filtros seleccionados.
                </td>
              </tr>
            )}
            {!loading &&
              tableRows.map((row) => (
                <tr key={row.id} className="align-top text-slate-700 odd:bg-white even:bg-slate-50">
                  <td className="border-b border-slate-100 px-3 py-2">{row.fecha}</td>
                  <td className="border-b border-slate-100 px-3 py-2">{row.hora}</td>
                  <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2">
                    {row.programa}
                  </td>
                  <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2">
                    {row.participantesEnsamble.length === 0 &&
                    row.participantesFamilia.length === 0 ? (
                      "-"
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {row.participantesEnsamble.map((name) => (
                          <span
                            key={`ens-${row.id}-${name}`}
                            className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700"
                          >
                            {name}
                          </span>
                        ))}
                        {row.participantesFamilia.map((name) => (
                          <span
                            key={`fam-${row.id}-${name}`}
                            className="inline-flex items-center rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700"
                          >
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2">
                    {row.locacionLocalidad}
                  </td>
                  <td className="border-b border-slate-100 px-3 py-2">
                    {row.estadoVenue && row.estadoVenue !== "-" ? (
                      <span
                        className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-[11px] font-semibold"
                        style={{
                          backgroundColor: `${row.estadoVenueColor}20`,
                          color: "#0f172a",
                        }}
                      >
                        <span
                          className="inline-block h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: row.estadoVenueColor }}
                        />
                        <span>{row.estadoVenue}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-500">
                        Sin estado
                      </span>
                    )}
                  </td>
                  <td className="whitespace-pre-wrap border-b border-slate-100 px-3 py-2">
                    {row.repertorioLines.length > 0 ? (
                      <ul className="space-y-1">
                        {row.repertorioLines.map((line, idx) => (
                          <li key={`rep-${row.id}-${idx}`} className="leading-tight">
                            • {line}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
