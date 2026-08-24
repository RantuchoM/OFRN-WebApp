import React, { useMemo, useState } from "react";
import {
  FIMBA_MEAL_SERVICES,
  formatFechaMealDdMm,
  buildFimbaMealsStayFromHoteleria,
} from "../../utils/fimbaMealsStay";
import { FIMBA_TIPOS_ALIMENTACION } from "../../services/fimbaService";

function labelRegimen(code) {
  if (code === "por_confirmar") return "Por confirmar";
  return FIMBA_TIPOS_ALIMENTACION.find((t) => t.value === code)?.label || code;
}

function MealMatrixTable({ days, showArtistaBreakdown = false }) {
  if (!days?.length) {
    return (
      <p className="fimba-muted" style={{ fontSize: "0.85rem", margin: 0 }}>
        Sin fechas de check-in/out para calcular comidas.
      </p>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="fimba-table" style={{ fontSize: "0.8rem", minWidth: 420 }}>
        <thead>
          <tr>
            <th>Día</th>
            {FIMBA_MEAL_SERVICES.map((s) => (
              <th key={s.key} style={{ textAlign: "right" }}>
                {s.label}
              </th>
            ))}
            <th style={{ textAlign: "right" }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => {
            const tot = (d.desayuno || 0) + (d.almuerzo || 0) + (d.cena || 0);
            return (
              <React.Fragment key={d.fecha}>
                <tr>
                  <td style={{ fontWeight: 600 }}>{formatFechaMealDdMm(d.fecha)}</td>
                  <td style={{ textAlign: "right" }}>{d.desayuno || 0}</td>
                  <td style={{ textAlign: "right" }}>{d.almuerzo || 0}</td>
                  <td style={{ textAlign: "right" }}>{d.cena || 0}</td>
                  <td style={{ textAlign: "right", fontWeight: 700 }}>{tot}</td>
                </tr>
                {showArtistaBreakdown &&
                  (d.byArtista || [])
                    .filter((a) => (a.desayuno || 0) + (a.almuerzo || 0) + (a.cena || 0) > 0)
                    .map((a) => (
                      <tr key={`${d.fecha}-${a.id_propuesta || a.artista}`} className="fimba-muted">
                        <td style={{ paddingLeft: 16, fontSize: "0.75rem" }}>
                          {a.artista}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "0.75rem" }}>
                          {a.desayuno || 0}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "0.75rem" }}>
                          {a.almuerzo || 0}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "0.75rem" }}>
                          {a.cena || 0}
                        </td>
                        <td style={{ textAlign: "right", fontSize: "0.75rem" }}>
                          {(a.desayuno || 0) + (a.almuerzo || 0) + (a.cena || 0)}
                        </td>
                      </tr>
                    ))}
              </React.Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ fontWeight: 700 }}>
            <td>Total</td>
            {FIMBA_MEAL_SERVICES.map((s) => {
              const sum = days.reduce((acc, d) => acc + (d[s.key] || 0), 0);
              return (
                <td key={s.key} style={{ textAlign: "right" }}>
                  {sum}
                </td>
              );
            })}
            <td style={{ textAlign: "right" }}>
              {days.reduce(
                (acc, d) =>
                  acc + (d.desayuno || 0) + (d.almuerzo || 0) + (d.cena || 0),
                0,
              )}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

/**
 * Bloque general (edición) o compacto (artista) de noches + comidas/día.
 */
export default function FimbaMealsStayPanel({
  hoteleriaRows = [],
  mode = "general", // general | artista
  compact = false,
}) {
  const [showByArtista, setShowByArtista] = useState(false);
  const [showRegimen, setShowRegimen] = useState(false);

  const plan = useMemo(
    () => buildFimbaMealsStayFromHoteleria(hoteleriaRows),
    [hoteleriaRows],
  );

  const t = plan.totals || {};
  const isArtista = mode === "artista";
  const artistPlan = isArtista ? plan.artists?.[0] : null;

  if (!hoteleriaRows?.length) return null;

  return (
    <section
      className={compact ? undefined : "fimba-card"}
      style={{
        marginBottom: compact ? 0 : "1.25rem",
        padding: compact ? "0.65rem 0.75rem" : undefined,
        border: compact ? "1px solid var(--fimba-border)" : undefined,
        borderRadius: compact ? 8 : undefined,
        background: compact ? "var(--fimba-surface, #fafafa)" : undefined,
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem 1.25rem",
          alignItems: "flex-start",
          marginBottom: "0.75rem",
        }}
      >
        <div style={{ flex: "1 1 200px" }}>
          <div className="fimba-label">
            {isArtista ? "Noches y comidas (este artista)" : "Noches y comidas (edición)"}
          </div>
          <p className="fimba-muted" style={{ fontSize: "0.72rem", margin: "4px 0 0" }}>
            Según check-in/out · Early = almuerzo llegada · Late = almuerzo salida · PAX =
            planificada
          </p>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <div className="fimba-label">Pax-noche</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{t.pax_noches || 0}</div>
          </div>
          <div>
            <div className="fimba-label">Desayunos</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{t.desayuno || 0}</div>
          </div>
          <div>
            <div className="fimba-label">Almuerzos</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{t.almuerzo || 0}</div>
          </div>
          <div>
            <div className="fimba-label">Cenas</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700 }}>{t.cena || 0}</div>
          </div>
          <div>
            <div className="fimba-label">Comidas Σ</div>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--fimba-deep)" }}>
              {t.comidas || 0}
            </div>
          </div>
        </div>
      </div>

      {!isArtista && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={() => setShowByArtista((v) => !v)}
          >
            {showByArtista ? "Ocultar desglose artista" : "Desglose por artista / día"}
          </button>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={() => setShowRegimen((v) => !v)}
          >
            {showRegimen ? "Ocultar por régimen" : "Por régimen / día"}
          </button>
        </div>
      )}

      <MealMatrixTable
        days={isArtista ? artistPlan?.days || [] : plan.days}
        showArtistaBreakdown={!isArtista && showByArtista}
      />

      {showRegimen && !isArtista && (
        <div style={{ marginTop: "1rem" }}>
          <div className="fimba-label" style={{ marginBottom: 6 }}>
            Cubiertos por régimen (nominados + por confirmar)
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="fimba-table" style={{ fontSize: "0.75rem", minWidth: 520 }}>
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Régimen</th>
                  <th style={{ textAlign: "right" }}>Des.</th>
                  <th style={{ textAlign: "right" }}>Alm.</th>
                  <th style={{ textAlign: "right" }}>Cena</th>
                </tr>
              </thead>
              <tbody>
                {(plan.days || []).flatMap((d) =>
                  Object.entries(d.byRegimen || {}).map(([reg, c]) => (
                    <tr key={`${d.fecha}-${reg}`}>
                      <td>{formatFechaMealDdMm(d.fecha)}</td>
                      <td>{labelRegimen(reg)}</td>
                      <td style={{ textAlign: "right" }}>{c.desayuno || 0}</td>
                      <td style={{ textAlign: "right" }}>{c.almuerzo || 0}</td>
                      <td style={{ textAlign: "right" }}>{c.cena || 0}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isArtista && artistPlan?.days?.length > 0 && (
        <details style={{ marginTop: "0.65rem" }}>
          <summary className="fimba-muted" style={{ cursor: "pointer", fontSize: "0.78rem" }}>
            Ver por régimen (este artista)
          </summary>
          <div style={{ overflowX: "auto", marginTop: 6 }}>
            <table className="fimba-table" style={{ fontSize: "0.75rem" }}>
              <thead>
                <tr>
                  <th>Día</th>
                  <th>Régimen</th>
                  <th style={{ textAlign: "right" }}>Des.</th>
                  <th style={{ textAlign: "right" }}>Alm.</th>
                  <th style={{ textAlign: "right" }}>Cena</th>
                </tr>
              </thead>
              <tbody>
                {artistPlan.days.flatMap((d) =>
                  Object.entries(d.byRegimen || {}).map(([reg, c]) => (
                    <tr key={`${d.fecha}-${reg}`}>
                      <td>{formatFechaMealDdMm(d.fecha)}</td>
                      <td>{labelRegimen(reg)}</td>
                      <td style={{ textAlign: "right" }}>{c.desayuno || 0}</td>
                      <td style={{ textAlign: "right" }}>{c.almuerzo || 0}</td>
                      <td style={{ textAlign: "right" }}>{c.cena || 0}</td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
