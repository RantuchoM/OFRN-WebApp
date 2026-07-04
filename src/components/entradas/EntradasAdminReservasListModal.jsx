import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconLoader, IconX } from "../ui/Icons";
import { getAdminReservasList } from "../../services/entradaService";

const BUCKET_META = {
  reservaron: { title: "Reservas activas", fechaLabel: "Fecha de reserva" },
  ingresaron: { title: "Reservas con ingreso", fechaLabel: "Fecha de reserva" },
  sinIngreso: { title: "Reservas sin ingreso", fechaLabel: "Fecha de reserva" },
  recordatorio: { title: "Recordatorios de apertura", fechaLabel: "Fecha de inscripción" },
};

function formatFechaAdquisicion(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

function normalizeSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");
}

export default function EntradasAdminReservasListModal({
  open,
  onClose,
  bucket,
  conciertoIds = [],
  subtitle = "",
  isDark = false,
  ui,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");

  const meta = BUCKET_META[bucket] || { title: "Listado", fechaLabel: "Fecha" };
  const multiConcierto = conciertoIds.length > 1;

  const idsKey = conciertoIds.join(",");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError("");
    setRows([]);
    let cancelled = false;
    setLoading(true);
    void getAdminReservasList(conciertoIds, bucket)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || "No se pudo cargar el listado.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, bucket, idsKey]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    if (!q) return rows;
    return rows.filter((row) => {
      const haystack = normalizeSearch(
        [
          row.usuarioLabel,
          row.email,
          row.codigoReserva,
          row.conciertoNombre,
          row.cantidad,
        ]
          .filter((v) => v != null && v !== "")
          .join(" "),
      );
      return haystack.includes(q);
    });
  }, [rows, query]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
    >
      <div
        className={`w-full max-w-2xl max-h-[min(90vh,40rem)] flex flex-col shadow-2xl ${ui.cardInner}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entradas-admin-reservas-list-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`flex items-start justify-between gap-2 p-4 sm:p-5 border-b ${
            isDark ? "border-slate-600" : "border-slate-200"
          }`}
        >
          <div className="min-w-0 pr-2">
            <h3 id="entradas-admin-reservas-list-titulo" className={`text-sm font-bold ${ui.textStrong}`}>
              {meta.title}
            </h3>
            {subtitle ? <p className={`text-xs mt-0.5 ${ui.textMuted}`}>{subtitle}</p> : null}
          </div>
          <button
            type="button"
            className={`shrink-0 rounded p-1 ${ui.btnIcon}`}
            aria-label="Cerrar"
            disabled={loading}
            onClick={onClose}
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="px-4 sm:px-5 pt-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, mail, código o concierto…"
            className={ui.input}
            autoFocus
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-5 py-3">
          {loading ? (
            <div className={`flex items-center justify-center gap-2 py-10 text-sm ${ui.textMuted}`}>
              <IconLoader size={18} className="animate-spin" />
              Cargando…
            </div>
          ) : error ? (
            <p className={`text-sm py-6 ${isDark ? "text-rose-300" : "text-rose-700"}`}>{error}</p>
          ) : filtered.length === 0 ? (
            <p className={`text-sm py-6 ${ui.textMuted}`}>
              {rows.length === 0 ? "No hay registros en esta categoría." : "Ningún resultado para la búsqueda."}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full min-w-[28rem] text-left text-xs border-collapse">
                <thead>
                  <tr className={`border-b ${isDark ? "border-slate-600 text-slate-400" : "border-slate-200 text-slate-500"}`}>
                    {multiConcierto ? <th className="py-2 pr-3 font-bold uppercase tracking-wide">Concierto</th> : null}
                    <th className="py-2 pr-3 font-bold uppercase tracking-wide">Usuario</th>
                    <th className="py-2 pr-3 font-bold uppercase tracking-wide w-16 text-center">Entradas</th>
                    <th className="py-2 font-bold uppercase tracking-wide">{meta.fechaLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-b last:border-b-0 ${
                        isDark ? "border-slate-700/80" : "border-slate-100"
                      }`}
                    >
                      {multiConcierto ? (
                        <td className={`py-2 pr-3 align-top ${ui.textSoft}`}>{row.conciertoNombre || "—"}</td>
                      ) : null}
                      <td className={`py-2 pr-3 align-top ${ui.textBody}`}>
                        <span className="font-semibold block leading-snug">{row.usuarioLabel}</span>
                        {row.codigoReserva ? (
                          <span className={`text-[10px] ${ui.textMuted}`}>Cód. {row.codigoReserva}</span>
                        ) : null}
                      </td>
                      <td className={`py-2 pr-3 align-top text-center tabular-nums font-semibold ${ui.textStrong}`}>
                        {row.cantidad == null ? "—" : row.cantidad}
                      </td>
                      <td className={`py-2 align-top tabular-nums ${ui.textMuted}`}>
                        {formatFechaAdquisicion(row.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div
          className={`px-4 sm:px-5 py-3 border-t text-[11px] flex items-center justify-between gap-2 ${
            isDark ? "border-slate-600 text-slate-400" : "border-slate-200 text-slate-500"
          }`}
        >
          <span>
            {filtered.length} de {rows.length} registro{rows.length === 1 ? "" : "s"}
          </span>
          <button type="button" onClick={onClose} className={ui.btnGhost}>
            Cerrar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
