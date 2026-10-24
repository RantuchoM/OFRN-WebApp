import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import ConfirmModal from "../ui/ConfirmModal";
import { IconBan, IconDownload, IconLoader, IconMail, IconX } from "../ui/Icons";
import {
  adminCancelarReserva,
  descargarPdfDesdeReservaId,
  enviarMailCancelacionReserva,
  getAdminReservasList,
  reenviarMailReservaDesdeId,
} from "../../services/entradaService";
import { matchesMultiTokenSearch } from "../../utils/sanitize";

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

export default function EntradasAdminReservasListModal({
  open,
  onClose,
  bucket,
  conciertoIds = [],
  subtitle = "",
  isDark = false,
  ui,
  onReservaCancelada,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState([]);
  const [query, setQuery] = useState("");
  const [busyReservaId, setBusyReservaId] = useState(null);
  const [busyAction, setBusyAction] = useState(""); // pdf | mail
  const [cancelTarget, setCancelTarget] = useState(null);
  const [canceling, setCanceling] = useState(false);

  const meta = BUCKET_META[bucket] || { title: "Listado", fechaLabel: "Fecha" };
  const multiConcierto = conciertoIds.length > 1;
  const canManageReserva = bucket === "reservaron" || bucket === "sinIngreso" || bucket === "ingresaron";
  const rowBusy = busyReservaId != null || canceling;

  const reload = async () => {
    const data = await getAdminReservasList(conciertoIds, bucket);
    setRows(data);
  };

  const handleDownloadPdf = async (row) => {
    const reservaId = Number(row?.id);
    if (!Number.isFinite(reservaId) || reservaId <= 0) {
      toast.error("Reserva inválida.");
      return;
    }
    setBusyReservaId(reservaId);
    setBusyAction("pdf");
    try {
      await descargarPdfDesdeReservaId(reservaId);
    } catch (e) {
      toast.error(e?.message || "No se pudo generar el PDF.");
    } finally {
      setBusyReservaId(null);
      setBusyAction("");
    }
  };

  const handleResendMail = async (row) => {
    const reservaId = Number(row?.id);
    if (!Number.isFinite(reservaId) || reservaId <= 0) {
      toast.error("Reserva inválida.");
      return;
    }
    setBusyReservaId(reservaId);
    setBusyAction("mail");
    try {
      await reenviarMailReservaDesdeId(reservaId);
      toast.success(
        `Mail de entrada reenviado${row.email ? ` a ${row.email}` : ""}. Revisá Spam si no aparece.`,
        { duration: 8000 },
      );
    } catch (e) {
      toast.error(e?.message || "No se pudo reenviar el mail.");
    } finally {
      setBusyReservaId(null);
      setBusyAction("");
    }
  };

  const handleConfirmCancel = async () => {
    const reservaId = Number(cancelTarget?.id);
    if (!Number.isFinite(reservaId) || reservaId <= 0) return;
    setCanceling(true);
    try {
      await adminCancelarReserva(reservaId);
      try {
        await enviarMailCancelacionReserva({ reservaId });
        toast.success("Reserva cancelada. Se envió confirmación por correo.");
      } catch {
        toast.message("Reserva cancelada. No pudimos enviar el mail de confirmación.");
      }
      setCancelTarget(null);
      await reload();
      onReservaCancelada?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo cancelar la reserva.");
      throw e;
    } finally {
      setCanceling(false);
    }
  };

  const idsKey = conciertoIds.join(",");

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setError("");
    setRows([]);
    setCancelTarget(null);
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
    if (!query.trim()) return rows;
    return rows.filter((row) =>
      matchesMultiTokenSearch(
        [
          row.usuarioLabel,
          row.email,
          row.codigoReserva,
          row.conciertoNombre,
          row.cantidad,
        ],
        query,
      ),
    );
  }, [rows, query]);

  if (!open) return null;

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-3 sm:p-4"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading && !rowBusy) onClose();
        }}
      >
        <div
          className={`w-full max-w-3xl max-h-[min(90vh,40rem)] flex flex-col shadow-2xl ${ui.cardInner}`}
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
              disabled={loading || rowBusy}
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
                      <th className="py-2 pr-3 font-bold uppercase tracking-wide">{meta.fechaLabel}</th>
                      {canManageReserva ? (
                        <th className="py-2 pl-2 font-bold uppercase tracking-wide text-right">Acciones</th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => {
                      const id = Number(row.id);
                      const isThisBusy = busyReservaId === id;
                      return (
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
                        <td className={`py-2 pr-3 align-top tabular-nums ${ui.textMuted}`}>
                          {formatFechaAdquisicion(row.createdAt)}
                        </td>
                        {canManageReserva ? (
                          <td className="py-2 pl-2 align-top">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <button
                                type="button"
                                disabled={rowBusy}
                                onClick={() => void handleDownloadPdf(row)}
                                className={`${ui.btnGhost} inline-flex items-center gap-1 px-2 py-1 text-[11px]`}
                                title="Descargar PDF de la reserva"
                                aria-label={`Descargar PDF de ${row.codigoReserva || row.usuarioLabel}`}
                              >
                                {isThisBusy && busyAction === "pdf" ? (
                                  <IconLoader size={14} className="animate-spin shrink-0" />
                                ) : (
                                  <IconDownload size={14} className="shrink-0" />
                                )}
                                PDF
                              </button>
                              <button
                                type="button"
                                disabled={rowBusy}
                                onClick={() => void handleResendMail(row)}
                                className={`${ui.btnGhost} inline-flex items-center gap-1 px-2 py-1 text-[11px]`}
                                title="Reenviar mail de entrada (mismo que al reservar)"
                                aria-label={`Reenviar mail de ${row.codigoReserva || row.usuarioLabel}`}
                              >
                                {isThisBusy && busyAction === "mail" ? (
                                  <IconLoader size={14} className="animate-spin shrink-0" />
                                ) : (
                                  <IconMail size={14} className="shrink-0" />
                                )}
                                Mail
                              </button>
                              <button
                                type="button"
                                disabled={rowBusy}
                                onClick={() => setCancelTarget(row)}
                                className={`${ui.btnGhost} inline-flex items-center gap-1 px-2 py-1 text-[11px] ${
                                  isDark ? "text-rose-300 hover:text-rose-200" : "text-rose-700 hover:text-rose-800"
                                }`}
                                title="Cancelar esta reserva"
                                aria-label={`Cancelar reserva ${row.codigoReserva || row.usuarioLabel}`}
                              >
                                <IconBan size={14} className="shrink-0" />
                                Cancelar
                              </button>
                            </div>
                          </td>
                        ) : null}
                      </tr>
                      );
                    })}
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
            <button type="button" onClick={onClose} className={ui.btnGhost} disabled={rowBusy}>
              Cerrar
            </button>
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => {
          if (!canceling) setCancelTarget(null);
        }}
        onConfirm={handleConfirmCancel}
        title="Cancelar reserva"
        message={
          cancelTarget
            ? `¿Seguro que querés cancelar la reserva ${cancelTarget.codigoReserva || ""} de ${cancelTarget.usuarioLabel}?\n\nLos códigos QR dejarán de valer y las plazas se liberarán.${
                Number(cancelTarget.ingresadas) > 0
                  ? "\n\nAtención: esta reserva ya tiene ingresos registrados; solo se anulan las plazas pendientes."
                  : ""
              }`
            : ""
        }
        confirmText="Sí, cancelar"
        cancelText="Volver"
        confirmLoading={canceling}
        confirmClassName="px-4 py-2.5 sm:py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md hover:shadow-lg transition-all active:scale-[0.98]"
        overlayClassName="z-[110]"
      />
    </>,
    document.body,
  );
}
