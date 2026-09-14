import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  IconLoader,
  IconUtensils,
  IconCalendar,
  IconUsers,
  IconPrinter,
} from "../../components/ui/Icons";
import { supabase } from "../../services/supabase";
import {
  getFimbaEdicionById,
  listFimbaGiraGrupos,
  listFimbaPropuestas,
} from "../../services/fimbaService";
import { useLogistics } from "../../hooks/useLogistics";
import { useFimbaAccess } from "../../hooks/useFimbaAccess";
import { createDefaultMealFilters, filterFimbaPropuestasForMeals } from "../../utils/mealLogistics";
import MealsManager from "../Giras/MealsManager";
import MealsAttendance from "../Giras/MealsAttendance";
import MealsReport from "../Giras/MealsReport";

const COMIDAS_TABS = [
  {
    id: "manager",
    label: "Gestor",
    Icon: IconCalendar,
  },
  {
    id: "attendance",
    label: "Asistencia",
    Icon: IconUsers,
  },
  {
    id: "report",
    label: "Reporte",
    Icon: IconPrinter,
  },
];

/**
 * Comidas FIMBA: misma matriz OFRN (eventos de la gira enlazada)
 * + tags de artistas (`eventos_fimba_propuestas`) + pax aditivo.
 * Pestañas paridad Logistics: Gestor | Asistencia | Reporte
 * (texto pedido + cuadro/tabla con dietas vía MealsReport).
 */
export default function FimbaComidasPage() {
  const { edicionId } = useParams();
  const { readOnly } = useFimbaAccess();
  const [edicion, setEdicion] = useState(null);
  const [gira, setGira] = useState(null);
  const [propuestas, setPropuestas] = useState([]);
  const [giraGrupos, setGiraGrupos] = useState([]);
  const [bootError, setBootError] = useState(null);
  const [booting, setBooting] = useState(true);
  const [comidasTab, setComidasTab] = useState("manager");
  /** Filtros compartidos Gestor ↔ Asistencia ↔ Reporte (exports usan el set filtrado). */
  const [mealFilters, setMealFilters] = useState(() =>
    createDefaultMealFilters(),
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBooting(true);
      setBootError(null);
      try {
        const { edicion: ed, error: eEd } = await getFimbaEdicionById(edicionId);
        if (eEd) throw eEd;
        if (!ed?.id_gira) {
          throw new Error("La edición no tiene gira OFRN enlazada");
        }
        const [{ data: programa, error: eProg }, propsPack, gruposPack] =
          await Promise.all([
            supabase
              .from("programas")
              .select(
                "id, nomenclador, nombre_gira, subtitulo, fecha_desde, fecha_hasta",
              )
              .eq("id", ed.id_gira)
              .maybeSingle(),
            listFimbaPropuestas(edicionId),
            listFimbaGiraGrupos(ed.id_gira),
          ]);
        if (eProg) throw eProg;
        if (propsPack.error) throw propsPack.error;
        if (gruposPack.error) throw gruposPack.error;
        if (cancelled) return;
        setEdicion(ed);
        setGira({
          ...(programa || {}),
          id: ed.id_gira,
          fecha_desde: programa?.fecha_desde || null,
          fecha_hasta: programa?.fecha_hasta || null,
        });
        setPropuestas(propsPack.propuestas || []);
        setGiraGrupos(gruposPack.grupos || []);
      } catch (err) {
        if (!cancelled) {
          setBootError(err?.message || String(err));
          setEdicion(null);
          setGira(null);
        }
      } finally {
        if (!cancelled) setBooting(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [edicionId]);

  const { summary, loading: logisticsLoading, refresh } = useLogistics(
    supabase,
    gira,
  );

  const roster = useMemo(
    () => (summary || []).filter((p) => p?.estado_gira !== "ausente"),
    [summary],
  );

  /** Sin comida (`requiere_comidas === false`) no aparecen en Gestor/picker. */
  const propuestasComidas = useMemo(
    () => filterFimbaPropuestasForMeals(propuestas),
    [propuestas],
  );

  if (booting || (gira?.id && logisticsLoading && !summary?.length)) {
    return (
      <div className="fimba-card" style={{ padding: 24, textAlign: "center" }}>
        <IconLoader className="animate-spin inline-block text-[var(--fimba-magenta)]" />
        <p className="fimba-muted" style={{ marginTop: 8 }}>
          Cargando comidas de la gira…
        </p>
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="fimba-card" style={{ padding: 16 }}>
        <p className="fimba-error" style={{ margin: 0 }}>
          {bootError}
        </p>
      </div>
    );
  }

  if (!gira?.id) {
    return (
      <div className="fimba-card" style={{ padding: 16 }}>
        <p className="fimba-muted" style={{ margin: 0 }}>
          No hay gira OFRN enlazada a esta edición.
        </p>
      </div>
    );
  }

  return (
    <div
      className="fimba-comidas-page"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 0,
        /* Constrain under sticky FIMBA header so MealsManager owns vertical scroll (sticky thead). */
        height: "calc(100dvh - 6.5rem)",
        maxHeight: "calc(100dvh - 6.5rem)",
      }}
    >
      <div
        className="fimba-card"
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <IconUtensils size={18} className="text-[var(--fimba-magenta)]" />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>Comidas</div>
          <div className="fimba-muted" style={{ fontSize: "0.75rem" }}>
            Datos OFRN de la gira enlazada
            {gira.nomenclador || gira.nombre_gira
              ? ` · ${gira.nomenclador || gira.nombre_gira}`
              : ""}
            . Tags de artistas suman pax; grupos OFRN tienen prioridad y se restan
            de comidas generales del mismo turno (fecha + servicio).
            {comidasTab === "report"
              ? " · Reporte: cuadro por dieta + Texto pedido + exportar por artista o locación (con especificaciones alimenticias)."
              : ""}
          </div>
        </div>
        <nav
          className="fimba-comidas-subtabs"
          aria-label="Vistas de comidas"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            padding: 3,
            borderRadius: 10,
            background: "var(--fimba-surface-2, #f3f0f4)",
            border: "1px solid var(--fimba-border, #e8e0ea)",
            flexShrink: 0,
          }}
        >
          {COMIDAS_TABS.map(({ id, label, Icon }) => {
            const active = comidasTab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setComidasTab(id)}
                className={`fimba-comidas-subtab${active ? " is-active" : ""}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  background: active
                    ? "var(--fimba-magenta, #c026a7)"
                    : "transparent",
                  color: active ? "#fff" : "var(--fimba-muted, #6b5f70)",
                  boxShadow: active
                    ? "0 1px 2px rgba(192, 38, 167, 0.25)"
                    : "none",
                }}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      <div
        className="fimba-card"
        style={{
          padding: 0,
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {comidasTab === "manager" && (
          <MealsManager
            supabase={supabase}
            gira={gira}
            roster={roster}
            giraGrupos={giraGrupos}
            fimbaMode
            propuestas={propuestasComidas}
            edicion={edicion}
            readOnly={readOnly}
            mealFilters={mealFilters}
            onMealFiltersChange={setMealFilters}
            onFimbaTagsSaved={() => refresh?.()}
          />
        )}
        {comidasTab === "attendance" && (
          <MealsAttendance
            supabase={supabase}
            gira={gira}
            roster={roster}
            giraGrupos={giraGrupos}
            mealFilters={mealFilters}
            onMealFiltersChange={setMealFilters}
            fimbaMode
          />
        )}
        {comidasTab === "report" && (
          <MealsReport
            supabase={supabase}
            gira={gira}
            roster={roster}
            giraGrupos={giraGrupos}
            mealFilters={mealFilters}
            onMealFiltersChange={setMealFilters}
            fimbaMode
            propuestas={propuestasComidas}
            readOnly={readOnly}
            onGoToGestor={() => setComidasTab("manager")}
          />
        )}
      </div>
    </div>
  );
}
