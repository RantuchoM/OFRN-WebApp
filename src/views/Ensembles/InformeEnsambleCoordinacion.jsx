import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { IconChevronDown, IconFileText, IconLoader } from "../../components/ui/Icons";
import { useClickOutside } from "../../hooks/useClickOutside";
import { fetchEnsambleServiciosBundle } from "../../services/serviciosCantidadService";
import { isEnsamblePruebaLabel } from "../../utils/convocatoriaEnsambleViews";
import {
  attachEnsambleCfIds,
  buildEnsambleServiciosReport,
  listEnsamblesForServiciosReport,
} from "../../utils/serviciosEnsambleReport";
import { buildEnsayosConflictoGroups } from "../../utils/serviciosEnsayosConflicto";
import EnsambleServiciosModal from "../Management/EnsambleServiciosModal";

/** Año fijo del informe de coordinación (ensayos en conflicto del ciclo). */
export const INFORME_ENSAMBLE_COORD_ANIO = 2026;

const FECHA_DESDE = `${INFORME_ENSAMBLE_COORD_ANIO}-01-01`;
const FECHA_HASTA = `${INFORME_ENSAMBLE_COORD_ANIO}-12-31`;

const ENSAMBLES_SELECT =
  "id, ensamble, id_localidad, id_familia, es_ensamble_local, localidades(id, localidad, id_region, regiones(id, region))";

/**
 * Botón + modal: informe de ensamble del año fijo, con acciones de conflicto.
 * Solo ensambles que gestiona el coordinador (o todos si es admin filtrado por `ensembles`).
 */
export default function InformeEnsambleCoordinacion({
  supabase,
  ensembles = [],
  onConflictoChanged,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportEnsambleId, setReportEnsambleId] = useState(null);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [reportTick, setReportTick] = useState(0);
  const [catalogEnsambles, setCatalogEnsambles] = useState([]);
  const [conflictoSessionByEventId, setConflictoSessionByEventId] = useState(
    {},
  );
  const menuRef = useRef(null);
  useClickOutside(menuRef, () => setMenuOpen(false));

  const selectable = useMemo(() => {
    const byId = new Map(
      (ensembles || [])
        .filter((e) => e?.id != null && !isEnsamblePruebaLabel(e.ensamble))
        .map((e) => [Number(e.id), e]),
    );
    // Preferir filas del catálogo completo (familia / localidad / CF) cuando ya cargaron.
    return listEnsamblesForServiciosReport(
      [...byId.keys()].map((id) => {
        const full = catalogEnsambles.find((en) => Number(en.id) === id);
        return full || byId.get(id);
      }),
    );
  }, [ensembles, catalogEnsambles]);

  const rememberConflictoResolved = useCallback((entry) => {
    if (!entry?.eventId || !entry?.kind) return;
    setConflictoSessionByEventId((prev) => ({
      ...prev,
      [String(entry.eventId)]: entry,
    }));
  }, []);

  const forgetConflictoResolved = useCallback((eventId) => {
    if (eventId == null) return;
    const key = String(eventId);
    setConflictoSessionByEventId((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }, []);

  const openForEnsamble = useCallback((id) => {
    const n = Number(id);
    if (!Number.isFinite(n)) return;
    setMenuOpen(false);
    setConflictoSessionByEventId({});
    setReportData(null);
    setReportError(null);
    setReportEnsambleId(n);
  }, []);

  const handleButtonClick = useCallback(() => {
    if (!selectable.length) {
      toast.error("No hay ensambles disponibles para el informe.");
      return;
    }
    if (selectable.length === 1) {
      openForEnsamble(selectable[0].id);
      return;
    }
    setMenuOpen((v) => !v);
  }, [selectable, openForEnsamble]);

  const closeModal = useCallback(() => {
    setReportEnsambleId(null);
    setReportData(null);
    setReportError(null);
    setConflictoSessionByEventId({});
  }, []);

  useEffect(() => {
    if (reportEnsambleId == null || !supabase) return undefined;
    let cancelled = false;
    (async () => {
      setReportLoading((prev) => prev || reportData == null);
      setReportError(null);
      try {
        const [ensRes, ensCfRes, intRes, bundle] = await Promise.all([
          supabase.from("ensambles").select(ENSAMBLES_SELECT).order("ensamble"),
          supabase.from("ensambles_cf").select("id_ensamble, id_ensamble_cf"),
          supabase
            .from("integrantes")
            .select("id, nombre, apellido")
            .order("apellido"),
          fetchEnsambleServiciosBundle(supabase, {
            fechaDesde: FECHA_DESDE,
            fechaHasta: FECHA_HASTA,
          }),
        ]);
        if (cancelled) return;
        if (ensRes.error) throw ensRes.error;
        if (ensCfRes.error) throw ensCfRes.error;
        if (intRes.error) throw intRes.error;
        if (bundle.error) throw bundle.error;

        const ensambles = attachEnsambleCfIds(
          ensRes.data || [],
          ensCfRes.data || [],
        );
        setCatalogEnsambles(ensambles);

        const ensamble = ensambles.find(
          (en) => Number(en.id) === Number(reportEnsambleId),
        );
        if (!ensamble) {
          throw new Error("Ensamble no encontrado");
        }

        const groups = buildEnsayosConflictoGroups({
          events: bundle.events,
          ensambles,
          integrantes: intRes.data || [],
          memberships: bundle.memberships,
          customRows: bundle.customRows,
          programas: bundle.programas,
          rosterByGiraId: bundle.rosterByGiraId,
        });

        const report = buildEnsambleServiciosReport({
          ensamble,
          programas: bundle.programas,
          events: bundle.events,
          conflictoGroups: groups,
          fechaDesde: FECHA_DESDE,
          fechaHasta: FECHA_HASTA,
          ensambles,
          memberships: bundle.memberships,
          fimba: bundle.fimba,
        });
        if (cancelled) return;
        setReportData(report);
      } catch (err) {
        if (cancelled) return;
        console.error("[InformeEnsambleCoordinacion]", err);
        setReportError(err);
        setReportData(null);
      } finally {
        if (!cancelled) setReportLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportEnsambleId, supabase, reportTick]);

  const handleChanged = useCallback(
    (kind) => {
      setReportTick((n) => n + 1);
      onConflictoChanged?.(kind);
    },
    [onConflictoChanged],
  );

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={handleButtonClick}
          disabled={!selectable.length && ensembles?.length === 0}
          className="flex items-center gap-1 md:gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-2 md:px-3 py-1 text-[11px] md:text-xs font-bold text-indigo-800 shadow-sm hover:bg-indigo-100 disabled:opacity-50"
          title={`Informe de ensamble ${INFORME_ENSAMBLE_COORD_ANIO} (giras, ensayos y conflictos)`}
        >
          {reportLoading && reportEnsambleId != null ? (
            <IconLoader size={14} className="animate-spin" />
          ) : (
            <IconFileText size={14} />
          )}
          <span className="hidden sm:inline">
            Informe {INFORME_ENSAMBLE_COORD_ANIO}
          </span>
          <span className="sm:hidden">Inf.</span>
          {selectable.length > 1 ? (
            <IconChevronDown
              size={12}
              className={`transition-transform ${menuOpen ? "rotate-180" : ""}`}
            />
          ) : null}
        </button>

        {menuOpen && selectable.length > 1 ? (
          <div className="absolute right-0 top-full z-50 mt-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-xl">
            <p className="border-b border-slate-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Elegí ensamble
            </p>
            {selectable.map((en) => (
              <button
                key={en.id}
                type="button"
                onClick={() => openForEnsamble(en.id)}
                className="block w-full px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-800"
              >
                {en.ensamble}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {reportEnsambleId != null ? (
        <EnsambleServiciosModal
          report={reportData}
          loading={reportLoading}
          error={reportError}
          fechaDesde={FECHA_DESDE}
          fechaHasta={FECHA_HASTA}
          supabase={supabase}
          ensambles={catalogEnsambles}
          sessionByEventId={conflictoSessionByEventId}
          onSessionResolved={rememberConflictoResolved}
          onSessionForgotten={forgetConflictoResolved}
          onChanged={handleChanged}
          onClose={closeModal}
        />
      ) : null}
    </>
  );
}
