import React, { useEffect, useMemo, useState } from "react";
import {
  IconBed,
  IconCheck,
  IconLoader,
  IconAlertTriangle,
  IconUsers,
  IconFileExcel,
  IconPrinter,
} from "../../components/ui/Icons";
import {
  FIMBA_TIPOS_HABITACION,
  formatFimbaHabitacionesCounts,
  labelFimbaHabitacionTipo,
  listFimbaHabitaciones,
  setFimbaHabitacionOcupantes,
  summarizeFimbaHabitaciones,
  syncFimbaHabitacionesFromCounts,
  totalPlazasFromHabitacionCounts,
  updateFimbaHabitacion,
} from "../../services/fimbaService";
import { exportFimbaRoomingExcel } from "../../utils/fimbaExport";
import { printFimbaRooming } from "../../utils/fimbaReports";

/**
 * Hotelería / rooming por artista.
 *
 * mode: admin = cupos + acomodo; assign = solo acomodo (token edición); readonly = consulta.
 */
export default function FimbaRoomingPanel({
  propuestaId,
  participantes = [],
  readOnly = false,
  mode,
  onError,
  artistaNombre = "",
  hotelNombre = "",
  checkinAt = null,
  checkoutAt = null,
}) {
  const resolvedMode = mode || (readOnly ? "readonly" : "admin");
  const canAdmin = resolvedMode === "admin";
  const canAssign = resolvedMode === "admin" || resolvedMode === "assign";

  const [habitaciones, setHabitaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savingInv, setSavingInv] = useState(false);
  const [invWarn, setInvWarn] = useState(null);
  const [invStatus, setInvStatus] = useState("idle");
  const [counts, setCounts] = useState({ SGL: 0, DBL: 0, TPL: 0, QAD: 0 });
  const [savingRoom, setSavingRoom] = useState({});
  const [exporting, setExporting] = useState(false);

  const exportRooming = async () => {
    setExporting(true);
    try {
      await exportFimbaRoomingExcel({
        edicionNombre: artistaNombre || `Propuesta_${propuestaId}`,
        artistaNombre: artistaNombre || undefined,
        rows: [
          {
            propuesta: { nombre: artistaNombre || `Artista ${propuestaId}` },
            hotel: hotelNombre ? { nombre: hotelNombre } : null,
            checkin_at: checkinAt,
            checkout_at: checkoutAt,
            habitaciones,
          },
        ],
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || "No se pudo exportar rooming");
      onError?.(err?.message);
    } finally {
      setExporting(false);
    }
  };

  const printRoomingPdf = () => {
    printFimbaRooming(
      [
        {
          propuesta: { nombre: artistaNombre || `Artista ${propuestaId}` },
          hotel: hotelNombre ? { nombre: hotelNombre } : { nombre: "(sin hotel)" },
          checkin_at: checkinAt,
          checkout_at: checkoutAt,
          personas: participantes,
          participantes,
          habitaciones,
        },
      ],
      { edicionNombre: artistaNombre || `Propuesta ${propuestaId}` },
    );
  };

  const reload = async () => {
    setLoading(true);
    setError(null);
    const { habitaciones: list, error: err } = await listFimbaHabitaciones(propuestaId);
    if (err) {
      setError(err.message || "Error al cargar habitaciones");
      setHabitaciones([]);
    } else {
      setHabitaciones(list || []);
      const next = { SGL: 0, DBL: 0, TPL: 0, QAD: 0 };
      for (const h of list || []) {
        if (next[h.tipo] != null) next[h.tipo] += 1;
      }
      setCounts(next);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (propuestaId == null || propuestaId === "") return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propuestaId]);

  const summary = useMemo(() => summarizeFimbaHabitaciones(habitaciones), [habitaciones]);

  const activos = useMemo(
    () => (participantes || []).filter((p) => p.activo !== false),
    [participantes],
  );

  const assignedIds = useMemo(() => {
    const s = new Set();
    for (const h of habitaciones) {
      for (const o of h.ocupantes || []) {
        if (o.id_participante != null) s.add(Number(o.id_participante));
      }
    }
    return s;
  }, [habitaciones]);

  const sinHabitacion = useMemo(
    () => activos.filter((p) => !assignedIds.has(Number(p.id))),
    [activos, assignedIds],
  );

  /** Personas que necesitan plaza hotelera = roster activo (ocupadas + sin habitación). */
  const neededPlazas = activos.length;

  /** Borrador de inventario: plazas totales = SGL×1 + DBL×2 + TPL×3 + QAD×4. */
  const draftPlazas = useMemo(() => totalPlazasFromHabitacionCounts(counts), [counts]);

  const draftVsNeeded = useMemo(() => {
    const delta = draftPlazas - neededPlazas;
    if (neededPlazas === 0 && draftPlazas === 0) {
      return { tone: "neutral", label: "Sin personas ni cupos" };
    }
    if (delta < 0) {
      const faltan = -delta;
      return {
        tone: "short",
        label: `Faltan ${faltan} ${faltan === 1 ? "plaza" : "plazas"}`,
      };
    }
    if (delta === 0) {
      return { tone: "exact", label: "Cubre el total" };
    }
    return {
      tone: "excess",
      label: `Sobran ${delta} ${delta === 1 ? "plaza" : "plazas"}`,
    };
  }, [draftPlazas, neededPlazas]);

  const isDraftDirty = invStatus === "dirty";
  const headerByTipo = isDraftDirty ? counts : summary.byTipo;
  const headerSlots = isDraftDirty ? draftPlazas : summary.slots;

  const applyInventory = async () => {
    if (!canAdmin) return;
    setSavingInv(true);
    setInvWarn(null);
    setInvStatus("saving");
    const { habitaciones: list, warning, error: err } = await syncFimbaHabitacionesFromCounts(
      propuestaId,
      counts,
    );
    setSavingInv(false);
    if (err) {
      setInvStatus("error");
      setError(err.message || "No se pudo guardar el inventario");
      onError?.(err.message);
      return;
    }
    setHabitaciones(list || []);
    setInvWarn(warning || null);
    setInvStatus("saved");
    setTimeout(() => setInvStatus((s) => (s === "saved" ? "idle" : s)), 2200);
  };

  const toggleMatrimonial = async (hab) => {
    if (!canAdmin && !canAssign) return;
    if (hab.tipo === "SGL") return;
    setSavingRoom((prev) => ({ ...prev, [hab.id]: true }));
    const { error: err } = await updateFimbaHabitacion(hab.id, {
      matrimonial: !hab.matrimonial,
    });
    setSavingRoom((prev) => ({ ...prev, [hab.id]: false }));
    if (err) {
      setError(err.message || "No se pudo actualizar matrimonial");
      onError?.(err.message);
      return;
    }
    setHabitaciones((prev) =>
      prev.map((h) =>
        Number(h.id) === Number(hab.id) ? { ...h, matrimonial: !h.matrimonial } : h,
      ),
    );
  };

  const setSlotPerson = async (hab, slotIndex, participanteId) => {
    if (!canAssign) return;
    const current = (hab.ocupantes || [])
      .slice()
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const ids = [];
    for (let i = 0; i < hab.capacidad; i += 1) {
      const occ = current[i];
      ids.push(occ?.id_participante != null ? String(occ.id_participante) : "");
    }
    ids[slotIndex] = participanteId ? String(participanteId) : "";

    // Compact non-empty preserving order of filled slots
    const nextIds = ids.filter(Boolean);

    setSavingRoom((prev) => ({ ...prev, [hab.id]: true }));
    const { habitaciones: list, error: err } = await setFimbaHabitacionOcupantes(
      hab.id,
      nextIds,
    );
    setSavingRoom((prev) => ({ ...prev, [hab.id]: false }));
    if (err) {
      setError(err.message || "No se pudo asignar");
      onError?.(err.message);
      return;
    }
    if (list) setHabitaciones(list);
    else reload();
  };

  if (loading) {
    return (
      <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
        <div className="fimba-muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <IconLoader size={16} className="animate-spin" /> Cargando rooming…
        </div>
      </section>
    );
  }

  return (
    <section className="fimba-card" style={{ marginBottom: "1.25rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "1rem",
              color: "var(--fimba-deep)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <IconBed size={16} /> Hotelería / rooming
          </h2>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.82rem" }}>
            {formatFimbaHabitacionesCounts(headerByTipo)}
            {isDraftDirty && (
              <span style={{ fontStyle: "italic" }}> (borrador)</span>
            )}
            {" · "}
            {summary.ocupadas}/{headerSlots} plazas ocupadas
            {sinHabitacion.length > 0 && (
              <>
                {" · "}
                <span style={{ color: "var(--fimba-accent)" }}>
                  {sinHabitacion.length} sin habitación
                </span>
              </>
            )}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            disabled={habitaciones.length === 0}
            onClick={printRoomingPdf}
            title="Imprimir / PDF habitaciones"
          >
            <IconPrinter size={14} /> Rooming PDF
          </button>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            disabled={exporting || habitaciones.length === 0}
            onClick={exportRooming}
            title="Exportar lista de habitaciones (Excel)"
          >
            {exporting ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconFileExcel size={14} />
            )}{" "}
            Exportar rooming
          </button>
        </div>
      </div>

      {error && (
        <div className="fimba-error" style={{ marginBottom: 10 }}>
          {error}
        </div>
      )}
      {invWarn && (
        <div
          className="fimba-muted"
          style={{
            marginBottom: 10,
            padding: "0.5rem 0.65rem",
            background: "#fff7ed",
            borderRadius: 6,
            fontSize: "0.82rem",
            display: "flex",
            gap: 6,
            alignItems: "flex-start",
          }}
        >
          <IconAlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
          {invWarn}
        </div>
      )}

      {canAdmin && (
        <div
          style={{
            marginBottom: 14,
            padding: "0.75rem",
            background: "#f8fafc",
            borderRadius: 8,
            border: "1px solid var(--fimba-border, #e2e8f0)",
          }}
        >
          <div className="fimba-label" style={{ marginBottom: 8 }}>
            Cupos de habitaciones (inventario)
          </div>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem 1rem",
              alignItems: "flex-end",
            }}
          >
            {FIMBA_TIPOS_HABITACION.map((t) => (
              <div key={t.value} style={{ minWidth: 72 }}>
                <label className="fimba-label" style={{ fontSize: "0.72rem" }}>
                  {t.label}
                </label>
                <input
                  className="fimba-input"
                  type="number"
                  min={0}
                  max={200}
                  value={counts[t.value] ?? 0}
                  onChange={(e) => {
                    const v = Math.max(0, Math.min(200, Math.floor(Number(e.target.value) || 0)));
                    setCounts((prev) => ({ ...prev, [t.value]: v }));
                    setInvStatus("dirty");
                  }}
                  disabled={savingInv}
                  style={{ width: 72 }}
                />
              </div>
            ))}
            <button
              type="button"
              className="fimba-btn fimba-btn-primary"
              onClick={applyInventory}
              disabled={savingInv}
            >
              {savingInv ? (
                <>
                  <IconLoader size={14} className="animate-spin" /> Aplicando…
                </>
              ) : (
                "Aplicar cupos"
              )}
            </button>
            {invStatus === "saved" && (
              <span className="fimba-muted" style={{ fontSize: "0.8rem", display: "flex", gap: 4, alignItems: "center" }}>
                <IconCheck size={12} /> Inventario actualizado
              </span>
            )}
          </div>
          <p
            style={{
              margin: "0.55rem 0 0",
              fontSize: "0.82rem",
              fontWeight: 600,
              color:
                draftVsNeeded.tone === "short"
                  ? "var(--fimba-accent, #c2410c)"
                  : draftVsNeeded.tone === "exact"
                    ? "var(--fimba-deep, #1e293b)"
                    : draftVsNeeded.tone === "excess"
                      ? "#0f766e"
                      : "var(--fimba-muted)",
              display: "flex",
              flexWrap: "wrap",
              gap: "0.35rem 0.75rem",
              alignItems: "baseline",
            }}
          >
            <span>
              Borrador: {draftPlazas} {draftPlazas === 1 ? "plaza" : "plazas"}
              {neededPlazas > 0 || draftPlazas > 0
                ? ` · se necesitan ${neededPlazas}`
                : ""}
            </span>
            <span>
              · {draftVsNeeded.label}
              {draftVsNeeded.tone === "exact" && neededPlazas > 0 ? " (exacto)" : ""}
            </span>
          </p>
          <p className="fimba-muted" style={{ margin: "0.35rem 0 0", fontSize: "0.75rem" }}>
            Crea o quita slots vacíos. No borra habitaciones con personas asignadas.
          </p>
        </div>
      )}

      {habitaciones.length === 0 ? (
        <p className="fimba-muted" style={{ margin: 0, fontSize: "0.88rem" }}>
          {canAdmin
            ? "Definí la cantidad de Single / Doble / Triple / Cuádruple y aplicá cupos."
            : "Todavía no hay habitaciones configuradas para este artista."}
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {habitaciones.map((hab, idx) => (
            <RoomCard
              key={hab.id}
              hab={hab}
              index={idx + 1}
              activos={activos}
              assignedIds={assignedIds}
              canAssign={canAssign}
              canToggleMatri={canAdmin || canAssign}
              saving={!!savingRoom[hab.id]}
              onToggleMatri={() => toggleMatrimonial(hab)}
              onSetSlot={(slotIdx, partId) => setSlotPerson(hab, slotIdx, partId)}
            />
          ))}
        </div>
      )}

      {sinHabitacion.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div
            className="fimba-label"
            style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 6 }}
          >
            <IconUsers size={12} /> Sin habitación ({sinHabitacion.length})
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {sinHabitacion.map((p) => (
              <span key={p.id} className="fimba-badge" style={{ fontWeight: 500 }}>
                {p.apellido}, {p.nombre}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function RoomCard({
  hab,
  index,
  activos,
  assignedIds,
  canAssign,
  canToggleMatri,
  saving,
  onToggleMatri,
  onSetSlot,
}) {
  const cap = hab.capacidad || 1;
  const occs = (hab.ocupantes || [])
    .slice()
    .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  const slots = Array.from({ length: cap }, (_, i) => occs[i] || null);

  return (
    <div
      style={{
        border: "1px solid var(--fimba-border, #e2e8f0)",
        borderRadius: 8,
        padding: "0.75rem 0.85rem",
        opacity: saving ? 0.75 : 1,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div style={{ fontWeight: 700, color: "var(--fimba-deep)" }}>
          Hab. {index}
          {hab.label ? ` · ${hab.label}` : ""}
          <span className="fimba-muted" style={{ fontWeight: 500, marginLeft: 8, fontSize: "0.85rem" }}>
            {labelFimbaHabitacionTipo(hab)}
            {" · "}
            {hab.plazas_ocupadas}/{cap}
          </span>
        </div>
        {hab.tipo !== "SGL" && (
          <label
            className="fimba-flag-check"
            style={{
              margin: 0,
              fontSize: "0.82rem",
              opacity: canToggleMatri ? 1 : 0.85,
              cursor: canToggleMatri ? "pointer" : "default",
            }}
          >
            <input
              type="checkbox"
              checked={hab.matrimonial === true}
              onChange={onToggleMatri}
              disabled={!canToggleMatri || saving}
            />
            Matrimonial
            <span className="fimba-muted" style={{ marginLeft: 4, fontWeight: 400 }}>
              {!hab.matrimonial ? "(Twin)" : ""}
            </span>
          </label>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fill, minmax(${canAssign ? 180 : 140}px, 1fr))`,
          gap: 8,
        }}
      >
        {slots.map((occ, slotIdx) => {
          const partId = occ?.id_participante != null ? String(occ.id_participante) : "";
          const part =
            occ?.participante ||
            activos.find((p) => String(p.id) === partId) ||
            null;

          if (!canAssign) {
            return (
              <div
                key={slotIdx}
                style={{
                  padding: "0.4rem 0.55rem",
                  background: "#f8fafc",
                  borderRadius: 6,
                  fontSize: "0.85rem",
                  fontWeight: part ? 600 : 400,
                  color: part ? "inherit" : "var(--fimba-muted)",
                }}
              >
                <span className="fimba-muted" style={{ fontSize: "0.7rem", display: "block" }}>
                  Plaza {slotIdx + 1}
                </span>
                {part ? `${part.apellido}, ${part.nombre}` : "— libre —"}
              </div>
            );
          }

          return (
            <div key={slotIdx}>
              <label className="fimba-label" style={{ fontSize: "0.7rem" }}>
                Plaza {slotIdx + 1}
              </label>
              <select
                className="fimba-select"
                value={partId}
                disabled={saving}
                onChange={(e) => onSetSlot(slotIdx, e.target.value || null)}
              >
                <option value="">— libre —</option>
                {activos.map((p) => {
                  const taken =
                    assignedIds.has(Number(p.id)) && Number(p.id) !== Number(partId);
                  return (
                    <option key={p.id} value={p.id} disabled={taken}>
                      {p.apellido}, {p.nombre}
                      {taken ? " (otra hab.)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
