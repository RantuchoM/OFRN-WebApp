import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { descargarPdfDesdeReservaRow } from "../../services/entradaService";
import { formatEntradasConciertoFechaHora as formatConciertoFechaHoraEs } from "../../utils/entradasReservaCopy";
import {
  entradasIngresadasCount,
  formatEntradasCountdown,
  isReservaActivaFutura,
  isReservaCancelada,
  splitMisReservas,
} from "../../utils/entradasMisReservas";
import MisReservasQrPanel from "./MisReservasQrPanel";

function ReservaCard({
  reserva,
  ui,
  isDark,
  nowMs,
  esHistorica = false,
  downloadingPdfReservaId,
  onDownloadPdf,
  onCancel,
  qrExpandedId,
  onToggleQr,
}) {
  const cancelada = isReservaCancelada(reserva);
  const ingresadas = entradasIngresadasCount(reserva);
  const muestraCountdown = !esHistorica && isReservaActivaFutura(reserva, nowMs);
  const puedeVerQr = !cancelada;
  const puedeGestionar = !cancelada && !esHistorica;
  const countdown = muestraCountdown
    ? formatEntradasCountdown(reserva.concierto?.fecha_hora, nowMs)
    : null;
  const cardClass = cancelada ? ui.cardCancelada : ui.card;
  const qrOpen = qrExpandedId === reserva.id;

  return (
    <article className={`${cardClass} p-3 space-y-2`}>
      {muestraCountdown && countdown && (
        <p className={`rounded-lg px-3 py-2 text-xs font-bold text-center ${ui.countdown}`}>{countdown}</p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${ui.textStrong}`}>
            {reserva.concierto?.nombre} · {reserva.codigo_reserva}
          </p>
          <p className={`text-xs ${ui.textMuted}`}>{formatConciertoFechaHoraEs(reserva.concierto?.fecha_hora)}</p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
            cancelada
              ? isDark
                ? "bg-rose-900/80 text-rose-200"
                : "bg-rose-200 text-rose-900"
              : isDark
                ? "bg-emerald-900/60 text-emerald-200"
                : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {cancelada ? "Cancelada" : "Activa"}
        </span>
      </div>
      <p className={`text-xs ${ui.textSoft}`}>
        Entradas: {reserva.cantidad_solicitada} · Ingresadas: {ingresadas}
      </p>
      {puedeVerQr && (
        <>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onToggleQr(reserva.id)}
              className={`w-full sm:w-auto rounded-lg px-3 py-2 text-xs font-bold ${ui.btnSecondary}`}
            >
              {qrOpen ? "Ocultar QRs" : "Ver QRs"}
            </button>
            {puedeGestionar && (
              <>
                <button
                  type="button"
                  disabled={downloadingPdfReservaId === reserva.id}
                  onClick={() => onDownloadPdf(reserva)}
                  className={`w-full sm:w-auto rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60 ${ui.btnSecondary}`}
                >
                  {downloadingPdfReservaId === reserva.id ? "Generando PDF…" : "Descargar PDF"}
                </button>
                <button
                  type="button"
                  onClick={() => onCancel(reserva)}
                  className={`w-full sm:w-auto rounded-lg px-3 py-2 text-xs font-bold ${ui.btnDanger}`}
                >
                  Cancelar reserva
                </button>
              </>
            )}
          </div>
          {qrOpen && <MisReservasQrPanel reserva={reserva} isDark={isDark} />}
        </>
      )}
    </article>
  );
}

export default function EntradasMisReservasSection({
  misReservas,
  ui,
  isDark,
  downloadingPdfReservaId,
  setDownloadingPdfReservaId,
  onCancelReserva,
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [qrExpandedId, setQrExpandedId] = useState(null);
  const [historicasAbiertas, setHistoricasAbiertas] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const { proximas, historicas } = useMemo(
    () => splitMisReservas(misReservas, nowMs),
    [misReservas, nowMs],
  );

  const handleDownloadPdf = async (reserva) => {
    setDownloadingPdfReservaId(reserva.id);
    try {
      await descargarPdfDesdeReservaRow(reserva);
    } catch (e) {
      toast.error(e?.message || "No se pudo generar el PDF.");
    } finally {
      setDownloadingPdfReservaId(null);
    }
  };

  const toggleQr = (id) => {
    setQrExpandedId((prev) => (prev === id ? null : id));
  };

  if (!misReservas.length) {
    return <p className={`text-sm ${ui.textMuted}`}>Aún no tenés reservas.</p>;
  }

  return (
    <div className="space-y-4">
      {proximas.length > 0 && (
        <div className="space-y-2">
          <h3 className={ui.sectionTitle}>Próximas</h3>
          {proximas.map((reserva) => (
            <ReservaCard
              key={reserva.id}
              reserva={reserva}
              ui={ui}
              isDark={isDark}
              nowMs={nowMs}
              esHistorica={false}
              downloadingPdfReservaId={downloadingPdfReservaId}
              onDownloadPdf={handleDownloadPdf}
              onCancel={onCancelReserva}
              qrExpandedId={qrExpandedId}
              onToggleQr={toggleQr}
            />
          ))}
        </div>
      )}

      {historicas.length > 0 && (
        <div className={`space-y-2 border-t pt-4 ${isDark ? "border-slate-700" : "border-slate-200"}`}>
          <button
            type="button"
            onClick={() => setHistoricasAbiertas((v) => !v)}
            className={`w-full flex items-center justify-between text-left ${ui.sectionTitle}`}
          >
            Entradas históricas ({historicas.length})
            <span className="text-base leading-none">{historicasAbiertas ? "−" : "+"}</span>
          </button>
          {historicasAbiertas &&
            historicas.map((reserva) => (
              <ReservaCard
                key={reserva.id}
                reserva={reserva}
                ui={ui}
                isDark={isDark}
                nowMs={nowMs}
                esHistorica
                downloadingPdfReservaId={downloadingPdfReservaId}
                onDownloadPdf={handleDownloadPdf}
                onCancel={onCancelReserva}
                qrExpandedId={qrExpandedId}
                onToggleQr={toggleQr}
              />
            ))}
        </div>
      )}

      {proximas.length === 0 && historicas.length === 0 && (
        <p className={`text-sm ${ui.textMuted}`}>Aún no tenés reservas.</p>
      )}
    </div>
  );
}
