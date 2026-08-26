import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  IconArrowLeft,
  IconEdit,
  IconLoader,
  IconHotel,
  IconBed,
  IconUsers,
  IconFileExcel,
  IconUtensils,
  IconFileText,
  IconPrinter,
} from "../../components/ui/Icons";
import {
  getFimbaEdicionById,
  getFimbaHoteleriaRow,
  listFimbaHoteleria,
  listFimbaPropuestas,
  syncFimbaHabitacionesFromCounts,
  FIMBA_TIPOS_HABITACION,
  formatFimbaHabitacionesCounts,
  labelFimbaHabitacionTipo,
  labelFimbaAlimentacion,
  filterHoteleriaRowsForHotel,
  filterHoteleriaRowsForComidas,
} from "../../services/fimbaService";
import { compareEsText } from "../../utils/fimbaAgendaSort";
import { matchesFimbaArtistaPersonSearch } from "../../utils/fimbaArtistaSearch";
import {
  exportFimbaComidasExcel,
  exportFimbaHoteleriaExcel,
  exportFimbaRoomingExcel,
} from "../../utils/fimbaExport";
import { printFimbaRooming } from "../../utils/fimbaReports";
import { useFimbaAccess } from "../../context/FimbaAccessContext";
import FimbaArtistaMetaSection from "./FimbaArtistaMetaSection";
import FimbaArtistaPersonSearchField from "./FimbaArtistaPersonSearchField";
import FimbaHoteleriaReports, {
  FimbaHoteleriaReportsButton,
} from "./FimbaHoteleriaReports";
import FimbaComidasReportModal from "./FimbaComidasReportModal";
import FimbaMealsStayPanel from "./FimbaMealsStayPanel";

function formatFecha(f) {
  if (!f) return "—";
  const [y, m, d] = String(f).split("-");
  if (!d) return f;
  return `${d}/${m}/${y}`;
}

function asBool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

/**
 * Hotelería FIMBA: pax = cantidad_planificada; check-in/out por artista;
 * nominados + «por confirmar»; hotel opcional del catálogo OFRN.
 */
export default function FimbaHoteleriaPage() {
  const { edicionId, artistaId } = useParams();
  const { canEditPropuestaMeta } = useFimbaAccess();
  const [searchParams] = useSearchParams();
  const filterFromQuery = searchParams.get("artista") || artistaId || null;

  const [edicion, setEdicion] = useState(null);
  const [rows, setRows] = useState([]);
  const [propuestas, setPropuestas] = useState([]);
  const [filtroArtista, setFiltroArtista] = useState(filterFromQuery || "");
  /** Debounced: nombre artista o participantes (AND con filtro Artista). */
  const [personSearchQuery, setPersonSearchQuery] = useState("");
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  /** null | { row } — modal datos generales (+ cupos habitación). */
  const [metaModal, setMetaModal] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [exporting, setExporting] = useState(null);
  /** null = cerrado; { rows, label } = hub pedido/texto/detalle/rooming (edición o 1 artista). */
  const [hotelReportsCtx, setHotelReportsCtx] = useState(null);
  const [comidasReportOpen, setComidasReportOpen] = useState(false);

  const edicionLabel = edicion?.nombre || `Edicion_${edicionId}`;

  const openEditionHotelReports = () => {
    setHotelReportsCtx({
      rows: filterHoteleriaRowsForHotel(rows),
      label: edicionLabel,
    });
  };

  const openArtistaHotelReports = (row) => {
    if (row?.requiere_hotel === false) {
      alert("Este artista no requiere hotelería (excluido de reportes).");
      return;
    }
    const nombre = row?.propuesta?.nombre || "Artista";
    setHotelReportsCtx({
      rows: [row],
      label: `${edicionLabel} · ${nombre}`,
    });
  };

  const runExport = async (kind, scopedRows = rows, label = edicionLabel) => {
    let data = scopedRows || [];
    if (kind === "comidas") {
      data = filterHoteleriaRowsForComidas(data);
    } else if (
      kind === "hoteleria" ||
      String(kind).startsWith("hoteleria:") ||
      String(kind).startsWith("rooming:")
    ) {
      data = filterHoteleriaRowsForHotel(data);
    }
    if (!data.length) {
      alert("No hay datos para exportar (revisá toggles de hotelería/comidas).");
      return;
    }
    setExporting(kind);
    try {
      if (kind === "hoteleria" || String(kind).startsWith("hoteleria:")) {
        await exportFimbaHoteleriaExcel({
          edicionNombre: label,
          rows: data,
          fileName:
            data.length === 1
              ? `FIMBA_Hoteleria_${data[0]?.propuesta?.nombre || "Artista"}`
              : undefined,
        });
      } else if (kind === "comidas") {
        await exportFimbaComidasExcel({
          edicionNombre: label,
          rows: data,
        });
      } else if (String(kind).startsWith("rooming:")) {
        const row = data[0];
        await exportFimbaRoomingExcel({
          edicionNombre: label,
          artistaNombre: row?.propuesta?.nombre,
          rows: data,
        });
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Error al exportar");
    } finally {
      setExporting(null);
    }
  };

  const printArtistaRooming = (row) => {
    if (row?.requiere_hotel === false) {
      alert("Este artista no requiere hotelería (excluido de rooming).");
      return;
    }
    const nombre = row?.propuesta?.nombre || "Artista";
    printFimbaRooming([row], {
      edicionNombre: `${edicionLabel} · ${nombre}`,
    });
  };

  const rowsHotel = useMemo(() => filterHoteleriaRowsForHotel(rows), [rows]);
  const rowsComidas = useMemo(() => filterHoteleriaRowsForComidas(rows), [rows]);

  const visibleRows = useMemo(() => {
    const q = String(personSearchQuery || "").trim();
    if (!q) return rows;
    return (rows || []).filter((r) =>
      matchesFimbaArtistaPersonSearch(
        r?.propuesta?.nombre,
        r?.personas || r?.participantes || [],
        q,
      ),
    );
  }, [rows, personSearchQuery]);

  const hasLoadedOnce = useRef(false);
  const loadedEdicionId = useRef(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (loadedEdicionId.current !== edicionId) {
        hasLoadedOnce.current = false;
        loadedEdicionId.current = edicionId;
      }
      const showFullSpinner = !silent && !hasLoadedOnce.current;
      if (showFullSpinner) setInitialLoading(true);
      else if (!silent) setRefreshing(true);
      setError(null);

      const [edRes, propsRes] = await Promise.all([
        getFimbaEdicionById(edicionId),
        listFimbaPropuestas(edicionId),
      ]);

      if (edRes.error || !edRes.edicion) {
        setError(edRes.error?.message || "Edición no encontrada");
        setEdicion(null);
        setInitialLoading(false);
        setRefreshing(false);
        return;
      }

      const hotRes = await listFimbaHoteleria(edicionId, {
        id_propuesta: filtroArtista || null,
        edicion: edRes.edicion,
        propuestas: propsRes.propuestas,
      });

      if (hotRes.error || propsRes.error) {
        setError(
          (hotRes.error || propsRes.error)?.message || "Error al cargar",
        );
      }

      setEdicion(edRes.edicion);
      setRows(hotRes.rows || []);
      setPropuestas(propsRes.propuestas || []);
      hasLoadedOnce.current = true;
      setInitialLoading(false);
      setRefreshing(false);
    },
    [edicionId, filtroArtista],
  );

  const refreshRow = useCallback(async (propuestaId) => {
    const { row, error: err } = await getFimbaHoteleriaRow(propuestaId);
    if (err) {
      setError(err.message || "Error al actualizar artista");
      return;
    }
    if (!row) return;
    setRows((prev) => {
      const idx = prev.findIndex((r) => Number(r.propuesta.id) === Number(propuestaId));
      if (idx < 0) return prev;
      const next = prev.slice();
      next[idx] = row;
      return next.sort((a, b) => {
        const byName = compareEsText(a?.propuesta?.nombre, b?.propuesta?.nombre);
        if (byName) return byName;
        return Number(a?.propuesta?.id) - Number(b?.propuesta?.id);
      });
    });
    setError(null);
  }, []);

  useEffect(() => {
    load({ silent: hasLoadedOnce.current });
  }, [load]);

  const totals = useMemo(() => {
    return (rowsHotel || []).reduce(
      (acc, r) => {
        acc.pax += r.pax_planificada || 0;
        acc.nominados += r.nominados || 0;
        acc.sin_nombre += r.sin_nombre ?? r.por_confirmar ?? 0;
        acc.camas_noche += r.camas_noche ?? (r.pax_planificada || 0) * (r.noches || 0);
        return acc;
      },
      { pax: 0, nominados: 0, sin_nombre: 0, camas_noche: 0 },
    );
  }, [rowsHotel]);

  const copyTableTsv = async () => {
    const header = [
      "Artista",
      "Hotel",
      "Check-in",
      "Early",
      "Check-out",
      "Late",
      "Noches",
      "PAX planif.",
      "Nominados",
      "Sin nombre",
      "Habitaciones",
      "Rooming ocupadas",
      "Observaciones logísticas",
      "Personas",
    ];
    const lines = [header.join("\t")];
    for (const r of rows) {
      const personas = (r.personas || [])
        .map((p) => `${p.apellido}, ${p.nombre}`)
        .join("; ");
      lines.push(
        [
          r.propuesta?.nombre || "",
          r.hotel?.nombre || "",
          r.checkin_at || "",
          asBool(r.checkin_early) ? "Sí" : "",
          r.checkout_at || "",
          asBool(r.checkout_late) ? "Sí" : "",
          r.noches != null ? r.noches : "",
          r.pax_planificada,
          r.nominados,
          r.sin_nombre ?? r.por_confirmar ?? 0,
          r.rooming_label || "",
          r.rooming?.slots
            ? `${r.rooming.ocupadas}/${r.rooming.slots}`
            : "",
          String(r.propuesta?.observaciones_logisticas || "")
            .replace(/\t/g, " ")
            .replace(/\r?\n/g, " / "),
          personas,
        ].join("\t"),
      );
    }
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setError(null);
      alert("Tabla copiada al portapapeles (TSV, pegable en Excel).");
    } catch {
      setError("No se pudo copiar al portapapeles.");
    }
  };

  const backHref = artistaId
    ? `/fimba/edicion/${edicionId}/artista/${artistaId}`
    : `/fimba/edicion/${edicionId}`;

  if (initialLoading) {
    return (
      <div className="fimba-card fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <IconLoader size={18} className="animate-spin" /> Cargando hotelería…
      </div>
    );
  }

  if (!edicion) {
    return (
      <div>
        <div className="fimba-error">{error || "Edición no encontrada."}</div>
        <Link to="/fimba" className="fimba-btn fimba-btn-ghost" style={{ marginTop: 12, textDecoration: "none" }}>
          <IconArrowLeft size={14} /> Volver
        </Link>
      </div>
    );
  }

  return (
    <div className="fimba-transport-wide">
      <Link
        to={backHref}
        className="fimba-btn fimba-btn-ghost"
        style={{ textDecoration: "none", marginBottom: 12 }}
      >
        <IconArrowLeft size={14} /> {artistaId ? "Artista" : edicion.nombre}
      </Link>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "flex-start",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", color: "var(--fimba-deep)" }}>
            Hotelería
          </h1>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0" }}>
            Cupos hotel = cantidad planificada (no incluye extra equip.)
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <FimbaHoteleriaReportsButton
            disabled={rows.length === 0}
            onClick={openEditionHotelReports}
            label="Reportes hotelería"
          />
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            disabled={rows.length === 0}
            onClick={() => setComidasReportOpen(true)}
            title="Regímenes: texto pedido, PDF e Excel"
          >
            <IconUtensils size={14} /> Reportes comidas
          </button>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            disabled={!!exporting || rows.length === 0}
            onClick={() => runExport("hoteleria")}
            title="Excel: resumen, personas y rooming"
          >
            {exporting === "hoteleria" ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconFileExcel size={14} />
            )}{" "}
            Exportar hotelería
          </button>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            disabled={!!exporting || rows.length === 0}
            onClick={() => runExport("comidas")}
            title="Excel: regímenes de alimentación + detalle"
          >
            {exporting === "comidas" ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconFileExcel size={14} />
            )}{" "}
            Exportar comidas
          </button>
          <button type="button" className="fimba-btn fimba-btn-ghost" onClick={copyTableTsv}>
            Copiar tabla (TSV)
          </button>
        </div>
      </div>

      {error && (
        <div className="fimba-error" style={{ marginBottom: "1rem" }}>
          {error}
        </div>
      )}

      {refreshing && (
        <div
          className="fimba-muted"
          style={{
            marginBottom: "1rem",
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontSize: "0.85rem",
          }}
        >
          <IconLoader size={14} className="animate-spin" /> Actualizando…
        </div>
      )}

      <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "center" }}>
          <div>
            <div className="fimba-label">PAX planificados</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--fimba-deep)" }}>
              {totals.pax}
            </div>
          </div>
          <div>
            <div className="fimba-label">Nominados</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{totals.nominados}</div>
          </div>
          <div>
            <div className="fimba-label">Sin nombre</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--fimba-accent)" }}>
              {totals.sin_nombre}
            </div>
          </div>
          <div>
            <div className="fimba-label">Camas-noche</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 700 }}>{totals.camas_noche}</div>
          </div>
          <div
            style={{
              marginLeft: "auto",
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              alignItems: "flex-end",
            }}
          >
            <div style={{ flex: "1 1 14rem", minWidth: "12rem" }}>
              <label className="fimba-label">Buscar</label>
              <FimbaArtistaPersonSearchField
                onQueryChange={setPersonSearchQuery}
              />
            </div>
            <div>
              <label className="fimba-label">Artista</label>
              <select
                className="fimba-select"
                style={{ width: "auto", minWidth: 180 }}
                value={filtroArtista || ""}
                onChange={(e) => setFiltroArtista(e.target.value)}
              >
                <option value="">Toda la edición</option>
                {propuestas.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </section>

      {rowsComidas.length > 0 && (
        <FimbaMealsStayPanel
          hoteleriaRows={
            filtroArtista
              ? rowsComidas
              : rowsComidas
          }
          mode={filtroArtista ? "artista" : "general"}
        />
      )}

      {rows.length === 0 ? (
        <div className="fimba-card fimba-muted">
          No hay artistas para reportar hotelería
          {filtroArtista ? " con este filtro" : ""}.
        </div>
      ) : visibleRows.length === 0 ? (
        <div className="fimba-card fimba-muted">
          Ningún artista coincide con «{String(personSearchQuery || "").trim()}».
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {visibleRows.map((r) => {
            const pid = r.propuesta.id;
            const open = expanded[pid] !== false; // abierto por defecto (listado pedido hotel)
            const sinNombre = r.sin_nombre ?? r.por_confirmar ?? 0;
            return (
              <section key={pid} className="fimba-card" style={{ padding: 0, overflow: "hidden" }}>
                <div
                  style={{
                    padding: "0.85rem 1rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                    borderBottom: "1px solid var(--fimba-border)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 700 }}>
                      <span
                        className="fimba-swatch"
                        style={{ background: r.propuesta.color || "var(--fimba-accent)" }}
                      />
                      {r.propuesta.nombre}
                    </div>
                    <div className="fimba-muted" style={{ marginTop: 4, fontSize: "0.85rem" }}>
                      <IconHotel size={12} style={{ display: "inline", verticalAlign: -1 }} />{" "}
                      {r.hotel?.nombre || "Sin hotel asignado"}
                      {" · "}
                      <span className="fimba-date-flag-read">
                        {formatFecha(r.checkin_at)}
                        {asBool(r.checkin_early) && (
                          <span className="fimba-badge fimba-badge-early">Early</span>
                        )}
                      </span>
                      {" → "}
                      <span className="fimba-date-flag-read">
                        {formatFecha(r.checkout_at)}
                        {asBool(r.checkout_late) && (
                          <span className="fimba-badge fimba-badge-late">Late</span>
                        )}
                      </span>
                      {" · "}
                      {r.noches != null ? `${r.noches} noche${r.noches === 1 ? "" : "s"}` : "noches —"}
                      {r.comidas_totales && (
                        <>
                          {" · "}
                          {r.comidas_totales.desayuno || 0} des /{" "}
                          {r.comidas_totales.almuerzo || 0} alm /{" "}
                          {r.comidas_totales.cena || 0} cen
                        </>
                      )}
                    </div>
                    {r.propuesta?.observaciones_logisticas ? (
                      <div
                        className="fimba-muted"
                        style={{
                          marginTop: 6,
                          fontSize: "0.82rem",
                          whiteSpace: "pre-wrap",
                          maxWidth: 520,
                        }}
                      >
                        <strong style={{ color: "var(--fimba-deep)" }}>Obs. log.:</strong>{" "}
                        {r.propuesta.observaciones_logisticas}
                      </div>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <span className="fimba-badge">
                      <IconBed size={12} /> PAX {r.pax_planificada}
                    </span>
                    <span className="fimba-badge" title="Inventario de habitaciones">
                      <IconBed size={12} /> {r.rooming_label || "Sin habs."}
                    </span>
                    {r.rooming?.slots > 0 && (
                      <span className="fimba-badge">
                        Rooming {r.rooming.ocupadas}/{r.rooming.slots}
                      </span>
                    )}
                    <span className="fimba-badge">
                      <IconUsers size={12} /> {r.nominados} nominados
                    </span>
                    {r.requiere_hotel === false && (
                      <span
                        className="fimba-badge"
                        style={{ background: "#f1f5f9", color: "#64748b" }}
                        title="Excluido de hotelería / exportaciones hotel"
                      >
                        Sin hotelería
                      </span>
                    )}
                    {r.requiere_comidas === false && (
                      <span
                        className="fimba-badge"
                        style={{ background: "#f1f5f9", color: "#64748b" }}
                        title="Excluido de comidas / exportaciones comida"
                      >
                        Sin comidas
                      </span>
                    )}
                    {sinNombre > 0 && (
                      <span
                        className="fimba-badge"
                        style={{ background: "#fce7f3", color: "var(--fimba-deep)" }}
                      >
                        Sin nombre ({sinNombre})
                      </span>
                    )}
                    {canEditPropuestaMeta && (
                      <button
                        type="button"
                        className="fimba-btn fimba-btn-ghost"
                        onClick={() => setMetaModal({ row: r })}
                        title="Editar datos generales del artista"
                      >
                        <IconEdit size={14} /> Editar datos
                      </button>
                    )}
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost"
                      onClick={() =>
                        setExpanded((prev) => ({
                          ...prev,
                          [pid]: prev[pid] === false ? true : false,
                        }))
                      }
                    >
                      {open ? "Ocultar personas" : "Ver personas"}
                    </button>
                  </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                      alignItems: "center",
                    }}
                  >
                    <span
                      className="fimba-muted"
                      style={{ fontSize: "0.72rem", fontWeight: 700, marginRight: 2 }}
                    >
                      Reportes de este artista
                    </span>
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost"
                      onClick={() => openArtistaHotelReports(r)}
                      title="Pedido inicial, texto, detalle y habitaciones (solo este artista)"
                    >
                      <IconFileText size={14} /> Pedido hotel
                    </button>
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost"
                      onClick={() => printArtistaRooming(r)}
                      title="Imprimir / PDF habitaciones de este artista"
                    >
                      <IconPrinter size={14} /> Rooming PDF
                    </button>
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost"
                      disabled={!!exporting}
                      onClick={() =>
                        runExport(
                          `rooming:${pid}`,
                          [r],
                          `${edicionLabel} · ${r.propuesta?.nombre || "Artista"}`,
                        )
                      }
                      title="Excel rooming (solo este artista)"
                    >
                      {exporting === `rooming:${pid}` ? (
                        <IconLoader size={14} className="animate-spin" />
                      ) : (
                        <IconFileExcel size={14} />
                      )}{" "}
                      Excel rooming
                    </button>
                    <button
                      type="button"
                      className="fimba-btn fimba-btn-ghost"
                      disabled={!!exporting}
                      onClick={() =>
                        runExport(
                          `hoteleria:${pid}`,
                          [r],
                          `${edicionLabel} · ${r.propuesta?.nombre || "Artista"}`,
                        )
                      }
                      title="Excel hotelería: resumen, personas y rooming (solo este artista)"
                    >
                      {exporting === `hoteleria:${pid}` ? (
                        <IconLoader size={14} className="animate-spin" />
                      ) : (
                        <IconFileExcel size={14} />
                      )}{" "}
                      Excel hotelería
                    </button>
                  </div>
                </div>
                {open && (
                  <div style={{ padding: "0.75rem 1rem 1rem" }}>
                    {!filtroArtista && r.requiere_comidas !== false && (
                      <div style={{ marginBottom: "0.85rem" }}>
                        <FimbaMealsStayPanel
                          hoteleriaRows={[r]}
                          mode="artista"
                          compact
                        />
                      </div>
                    )}
                    {(r.personas || []).length === 0 && sinNombre === 0 ? (
                      <p className="fimba-muted" style={{ margin: 0 }}>
                        Sin plazas planificadas.
                      </p>
                    ) : (
                      <table className="fimba-table">
                        <thead>
                          <tr>
                            <th style={{ paddingLeft: 0 }}>Participante</th>
                            <th>Documento</th>
                            <th>Habitación</th>
                            <th>Check-in</th>
                            <th>Check-out</th>
                            <th>Noches</th>
                            <th>Alimentación</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(r.personas || []).map((p) => {
                            const roomInfo = roomForParticipante(r.habitaciones, p.id);
                            return (
                              <tr key={p.id}>
                                <td style={{ paddingLeft: 0, fontWeight: 600 }}>
                                  {p.apellido}, {p.nombre}
                                </td>
                                <td className="fimba-muted">{p.documento || "—"}</td>
                                <td className="fimba-muted">{roomInfo || "—"}</td>
                                <td>
                                  <span className="fimba-date-flag-read">
                                    {formatFecha(r.checkin_at)}
                                    {asBool(r.checkin_early) && (
                                      <span className="fimba-badge fimba-badge-early">Early</span>
                                    )}
                                  </span>
                                </td>
                                <td>
                                  <span className="fimba-date-flag-read">
                                    {formatFecha(r.checkout_at)}
                                    {asBool(r.checkout_late) && (
                                      <span className="fimba-badge fimba-badge-late">Late</span>
                                    )}
                                  </span>
                                </td>
                                <td>{r.noches || "—"}</td>
                                <td className="fimba-muted">
                                  {labelFimbaAlimentacion(
                                    p.tipo_alimentacion,
                                    p.nota_alimentacion,
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {sinNombre > 0 && (
                            <tr style={{ background: "#f8fafc" }}>
                              <td
                                colSpan={1}
                                style={{
                                  paddingLeft: 0,
                                  fontWeight: 700,
                                  fontStyle: "italic",
                                  color: "var(--fimba-muted)",
                                }}
                              >
                                Sin nombre ({sinNombre})
                              </td>
                              <td className="fimba-muted">—</td>
                              <td className="fimba-muted">—</td>
                              <td>
                                <span className="fimba-date-flag-read">
                                  {formatFecha(r.checkin_at)}
                                  {asBool(r.checkin_early) && (
                                    <span className="fimba-badge fimba-badge-early">Early</span>
                                  )}
                                </span>
                              </td>
                              <td>
                                <span className="fimba-date-flag-read">
                                  {formatFecha(r.checkout_at)}
                                  {asBool(r.checkout_late) && (
                                    <span className="fimba-badge fimba-badge-late">Late</span>
                                  )}
                                </span>
                              </td>
                              <td>{r.noches || "—"}</td>
                              <td className="fimba-muted">cupos sin nominar</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    )}
                    {(r.habitaciones || []).length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div className="fimba-label" style={{ marginBottom: 6 }}>
                          Rooming
                        </div>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: "1.1rem",
                            fontSize: "0.85rem",
                            color: "var(--fimba-muted)",
                          }}
                        >
                          {(r.habitaciones || []).map((h, i) => (
                            <li key={h.id}>
                              Hab. {i + 1} · {labelFimbaHabitacionTipo(h)}:{" "}
                              {(h.ocupantes || []).length
                                ? (h.ocupantes || [])
                                    .map((o) => {
                                      const p = o.participante;
                                      return p
                                        ? `${p.apellido}, ${p.nombre}`
                                        : `#${o.id_participante}`;
                                    })
                                    .join(" · ")
                                : "vacía"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}

      {canEditPropuestaMeta && metaModal &&
        createPortal(
          <HotelMetaEditModal
            row={metaModal.row}
            onClose={() => setMetaModal(null)}
            onMetaSaved={(updated) => {
              const pid = updated?.id ?? metaModal.row?.propuesta?.id;
              if (pid != null) {
                refreshRow(pid);
                setPropuestas((prev) => {
                  const idx = prev.findIndex((p) => Number(p.id) === Number(pid));
                  if (idx < 0) return prev;
                  const next = prev.slice();
                  next[idx] = { ...next[idx], ...updated };
                  return next;
                });
              }
            }}
            onError={setError}
          />,
          document.body,
        )}

      <FimbaHoteleriaReports
        open={!!hotelReportsCtx}
        onClose={() => setHotelReportsCtx(null)}
        hoteleriaRows={hotelReportsCtx?.rows || []}
        edicionNombre={hotelReportsCtx?.label || edicionLabel}
      />
      <FimbaComidasReportModal
        open={comidasReportOpen}
        onClose={() => setComidasReportOpen(false)}
        hoteleriaRows={rowsComidas}
        edicionNombre={edicionLabel}
      />
    </div>
  );
}

function roomForParticipante(habitaciones, participanteId) {
  const pid = Number(participanteId);
  for (let i = 0; i < (habitaciones || []).length; i += 1) {
    const h = habitaciones[i];
    const hit = (h.ocupantes || []).some((o) => Number(o.id_participante) === pid);
    if (hit) {
      return `Hab. ${i + 1} · ${labelFimbaHabitacionTipo(h)}`;
    }
  }
  return null;
}

function HotelMetaEditModal({ row, onClose, onMetaSaved, onError }) {
  const prop = row.propuesta;
  const [habitCounts, setHabitCounts] = useState(() => {
    const base = { SGL: 0, DBL: 0, TPL: 0, QAD: 0 };
    const by = row.rooming?.byTipo || {};
    for (const k of Object.keys(base)) base[k] = Number(by[k]) || 0;
    return base;
  });
  const [savingInv, setSavingInv] = useState(false);
  const [invError, setInvError] = useState(null);
  const [invWarn, setInvWarn] = useState(null);
  const [invSaved, setInvSaved] = useState(false);

  const applyCupos = async () => {
    setSavingInv(true);
    setInvError(null);
    setInvWarn(null);
    setInvSaved(false);
    const { warning, error: eInv } = await syncFimbaHabitacionesFromCounts(
      prop.id,
      habitCounts,
    );
    setSavingInv(false);
    if (eInv) {
      setInvError(eInv.message || "No se pudo actualizar el inventario de habitaciones");
      return;
    }
    if (warning) setInvWarn(warning);
    setInvSaved(true);
    onMetaSaved?.({ id: prop.id });
  };

  return (
    <div className="fimba-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="fimba-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fimba-hoteleria-meta-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 560,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: "0.75rem",
          }}
        >
          <div>
            <h2 id="fimba-hoteleria-meta-title" style={{ margin: 0 }}>
              Datos generales
            </h2>
            <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
              {prop.nombre} · autosave como en la ficha del artista
            </p>
          </div>
          <button type="button" className="fimba-btn fimba-btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <FimbaArtistaMetaSection
          propuesta={prop}
          hotelNombre={row.hotel?.nombre || null}
          canEdit
          showRider={false}
          variant="plain"
          idPrefix={`fimba-hoteleria-meta-${prop.id}`}
          onSaved={(next) => onMetaSaved?.(next)}
          onError={onError}
        />

        <div
          style={{
            marginTop: "1.1rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--fimba-border)",
          }}
        >
          <h3
            style={{
              margin: "0 0 0.65rem",
              fontSize: "1rem",
              color: "var(--fimba-deep)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconBed size={16} /> Cupos de habitaciones
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem" }}>
            {FIMBA_TIPOS_HABITACION.map((t) => (
              <div key={t.value} style={{ minWidth: 70 }}>
                <label className="fimba-label" style={{ fontSize: "0.72rem" }}>
                  {t.label}
                </label>
                <input
                  className="fimba-input"
                  type="number"
                  min={0}
                  max={200}
                  value={habitCounts[t.value] ?? 0}
                  onChange={(e) => {
                    const v = Math.max(
                      0,
                      Math.min(200, Math.floor(Number(e.target.value) || 0)),
                    );
                    setHabitCounts((prev) => ({ ...prev, [t.value]: v }));
                    setInvSaved(false);
                  }}
                  style={{ width: 70 }}
                />
              </div>
            ))}
          </div>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0.75rem", fontSize: "0.75rem" }}>
            Inventario: {formatFimbaHabitacionesCounts(habitCounts)}. El acomodo de personas
            se hace al expandir el artista o en ficha / enlace de edición.
          </p>
          {invError && <div className="fimba-error" style={{ marginBottom: 12 }}>{invError}</div>}
          {invWarn && (
            <div className="fimba-muted" style={{ marginBottom: 12, fontSize: "0.82rem" }}>
              {invWarn}
            </div>
          )}
          {invSaved && !invError && (
            <div className="fimba-muted" style={{ marginBottom: 12, fontSize: "0.82rem" }}>
              Cupos actualizados.
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              disabled={savingInv}
              onClick={applyCupos}
            >
              {savingInv ? "Aplicando…" : "Aplicar cupos"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
