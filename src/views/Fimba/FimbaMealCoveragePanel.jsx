import React, { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconPlus,
  IconLoader,
} from "../../components/ui/Icons";
import { MEAL_COVERAGE_DEFAULT_HORA } from "../../utils/fimbaMealCoverageCreate";

function formatSlot(fecha, servicio) {
  let day = fecha;
  try {
    day = format(parseISO(fecha), "EEE dd/MM", { locale: es });
  } catch {
    /* keep raw */
  }
  const hora = MEAL_COVERAGE_DEFAULT_HORA[servicio];
  return hora ? `${day} · ${servicio} (${hora})` : `${day} · ${servicio}`;
}

function formatStayDay(iso) {
  if (!iso) return "—";
  try {
    return format(parseISO(String(iso).slice(0, 10)), "EEE dd/MM", {
      locale: es,
    });
  } catch {
    return String(iso).slice(0, 10);
  }
}

function windowLabel(g) {
  if (g.windowSource === "stay" && g.checkinAt && g.checkoutAt) {
    return `Estadía: ${formatStayDay(g.checkinAt)} → ${formatStayDay(g.checkoutAt)}`;
  }
  if (g.first && g.last) {
    const prefix =
      g.windowSource === "tagged" ? "Ventana (tags): " : "Ventana: ";
    return `${prefix}${formatSlot(g.first.fecha, g.first.servicio)} → ${formatSlot(g.last.fecha, g.last.servicio)}`;
  }
  return null;
}

/**
 * Panel de alertas de cobertura A/M/C por artista FIMBA.
 *
 * @param {{
 *   gaps: Array,
 *   onFilterArtista?: (id: string) => void,
 *   onCreateGap?: (gap: { artistaId, fecha, servicio }) => Promise<void>|void,
 *   onCreateAllGaps?: (gaps: Array) => Promise<void>|void,
 *   compact?: boolean,
 *   readOnly?: boolean,
 * }} props
 */
export default function FimbaMealCoveragePanel({
  gaps = [],
  onFilterArtista,
  onCreateGap,
  onCreateAllGaps,
  compact = false,
  readOnly = false,
}) {
  const [open, setOpen] = useState(true);
  const [busyKey, setBusyKey] = useState(null);

  const active = useMemo(
    () => (gaps || []).filter((g) => !g.skipped),
    [gaps],
  );
  const skipped = useMemo(
    () => (gaps || []).filter((g) => g.skipped),
    [gaps],
  );
  const broken = useMemo(
    () => active.filter((g) => !g.ok && g.missing?.length > 0),
    [active],
  );
  const okCount = active.length - broken.length;
  const allMissing = useMemo(() => {
    const list = [];
    for (const g of broken) {
      for (const m of g.missing) {
        list.push({
          artistaId: g.artistaId,
          artistaNombre: g.artistaNombre,
          fecha: m.fecha,
          servicio: m.servicio,
        });
      }
    }
    return list;
  }, [broken]);

  const canCreate = !readOnly && typeof onCreateGap === "function";
  const canCreateAll =
    !readOnly &&
    typeof onCreateAllGaps === "function" &&
    allMissing.length > 0;

  if (!gaps?.length) return null;

  if (broken.length === 0) {
    return (
      <div
        className="fimba-meal-coverage-ok"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: compact ? "6px 12px" : "8px 14px",
          borderRadius: 10,
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          color: "#166534",
          fontSize: "0.75rem",
          fontWeight: 600,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IconCheck size={14} />
          Cobertura de comidas OK · {okCount} artista
          {okCount === 1 ? "" : "s"} con Almuerzo/Merienda/Cena en su ventana
          (estadía o tags)
        </div>
        {skipped.length > 0 && (
          <div style={{ fontWeight: 500, color: "#4d7c0f", fontSize: "0.68rem" }}>
            {skipped.length} sin estadía ni tags (omitidos)
          </div>
        )}
      </div>
    );
  }

  const runCreate = async (key, fn) => {
    if (!fn || busyKey) return;
    setBusyKey(key);
    try {
      await fn();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div
      className="fimba-meal-coverage-alerts"
      style={{
        borderRadius: 10,
        border: "1px solid #fcd34d",
        background: "#fffbeb",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: compact ? "8px 12px" : "10px 14px",
          color: "#92400e",
          fontWeight: 700,
          fontSize: "0.8rem",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            textAlign: "left",
            color: "inherit",
            fontWeight: 700,
            fontSize: "inherit",
            padding: 0,
          }}
        >
          <IconAlertTriangle size={16} className="shrink-0" />
          <span style={{ flex: 1 }}>
            Cobertura incompleta · {broken.length} artista
            {broken.length === 1 ? "" : "s"} · {allMissing.length} pendiente
            {allMissing.length === 1 ? "" : "s"}
          </span>
          {open ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </button>
        {canCreateAll && (
          <button
            type="button"
            disabled={Boolean(busyKey)}
            onClick={() =>
              runCreate("all", () => onCreateAllGaps(allMissing))
            }
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              border: "1px solid #d73289",
              background: "#d73289",
              color: "#fff",
              borderRadius: 6,
              padding: "4px 10px",
              fontSize: "0.65rem",
              fontWeight: 700,
              cursor: busyKey ? "wait" : "pointer",
              flexShrink: 0,
            }}
            title="Crear todos los pendientes listados (A 12:30 · M 17:00 · C 21:30)"
          >
            {busyKey === "all" ? (
              <IconLoader size={12} className="animate-spin" />
            ) : (
              <IconPlus size={12} />
            )}
            Crear todas ({allMissing.length} evento
            {allMissing.length === 1 ? "" : "s"})
          </button>
        )}
      </div>
      {open && (
        <ul
          style={{
            listStyle: "none",
            margin: 0,
            padding: "0 12px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            maxHeight: compact ? 220 : 320,
            overflow: "auto",
          }}
        >
          {broken.map((g) => {
            const win = windowLabel(g);
            return (
              <li
                key={g.artistaId}
                style={{
                  background: "#fff",
                  border: "1px solid #fde68a",
                  borderRadius: 8,
                  padding: "8px 10px",
                  fontSize: "0.75rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <strong style={{ color: "#78350f", flex: 1 }}>
                    {g.artistaNombre}
                  </strong>
                  {typeof onFilterArtista === "function" && (
                    <button
                      type="button"
                      onClick={() => onFilterArtista(g.artistaId)}
                      style={{
                        border: "1px solid #d73289",
                        background: "#fff",
                        color: "#d73289",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: "0.65rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Filtrar
                    </button>
                  )}
                </div>
                {win && (
                  <div style={{ color: "#a16207", marginBottom: 4 }}>
                    {win}
                  </div>
                )}
                {g.note && (
                  <div
                    style={{
                      color: "#a16207",
                      marginBottom: 6,
                      fontWeight: 500,
                      fontSize: "0.68rem",
                    }}
                  >
                    {g.note}
                  </div>
                )}
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 4,
                  }}
                >
                  {g.missing.map((m) => {
                    const key = `${g.artistaId}|${m.fecha}|${m.servicio}`;
                    return (
                      <li
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          color: "#991b1b",
                          fontWeight: 600,
                        }}
                      >
                        <span style={{ flex: 1, minWidth: 0 }}>
                          Falta: {formatSlot(m.fecha, m.servicio)}
                        </span>
                        {canCreate && (
                          <button
                            type="button"
                            disabled={Boolean(busyKey)}
                            onClick={() =>
                              runCreate(key, () =>
                                onCreateGap({
                                  artistaId: g.artistaId,
                                  artistaNombre: g.artistaNombre,
                                  fecha: m.fecha,
                                  servicio: m.servicio,
                                }),
                              )
                            }
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 3,
                              border: "1px solid #d73289",
                              background: "#fff",
                              color: "#d73289",
                              borderRadius: 6,
                              padding: "2px 8px",
                              fontSize: "0.62rem",
                              fontWeight: 700,
                              cursor: busyKey ? "wait" : "pointer",
                              flexShrink: 0,
                            }}
                            title={`Crear ${m.servicio} a las ${MEAL_COVERAGE_DEFAULT_HORA[m.servicio] || "?"}`}
                          >
                            {busyKey === key ? (
                              <IconLoader size={11} className="animate-spin" />
                            ) : (
                              <IconPlus size={11} />
                            )}
                            Crear automáticamente
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
          {skipped.length > 0 && (
            <li
              style={{
                fontSize: "0.68rem",
                color: "#a16207",
                fontWeight: 500,
                padding: "4px 2px",
              }}
            >
              Omitidos ({skipped.length}):{" "}
              {skipped.map((g) => g.artistaNombre).join(", ")} — sin check-in/out
              ni comidas tagueadas
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
