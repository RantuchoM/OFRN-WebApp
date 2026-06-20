import React, { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  asociarEmailTercero,
  actualizarReferenciaTercero,
  buscarBeneficiarioPorEmail,
  descargarPdfDesdeReservaRow,
} from "../../services/entradaService";
import { formatEntradasConciertoFechaHora as formatConciertoFechaHoraEs } from "../../utils/entradasReservaCopy";
import {
  entradasIngresadasCount,
  formatEntradasCountdown,
  isReservaActivaFutura,
  splitMisReservas,
} from "../../utils/entradasMisReservas";
import MisReservasQrPanel from "./MisReservasQrPanel";

function estadoBeneficiario(reserva) {
  if (reserva.email_beneficiario) {
    return { badge: "Pendiente de cuenta", detail: reserva.email_beneficiario };
  }
  if (reserva.titular?.email && reserva.usuario_id !== reserva.reservada_por) {
    const n = [reserva.titular.apellido, reserva.titular.nombre].filter(Boolean).join(", ");
    return { badge: "Vinculada", detail: n ? `${n} (${reserva.titular.email})` : reserva.titular.email };
  }
  if (reserva.beneficiario_referencia) {
    return { badge: "Sin mail", detail: reserva.beneficiario_referencia };
  }
  return { badge: "Sin mail", detail: null };
}

function TerceroReservaCard({
  reserva,
  ui,
  isDark,
  nowMs,
  downloadingPdfReservaId,
  onDownloadPdf,
  onCancel,
  onUpdated,
  qrExpandedId,
  onToggleQr,
}) {
  const ingresadas = entradasIngresadasCount(reserva);
  const muestraCountdown = isReservaActivaFutura(reserva, nowMs);
  const countdown = muestraCountdown
    ? formatEntradasCountdown(reserva.concierto?.fecha_hora, nowMs)
    : null;
  const estado = estadoBeneficiario(reserva);
  const qrOpen = qrExpandedId === reserva.id;
  const [editReferencia, setEditReferencia] = useState(false);
  const [referenciaDraft, setReferenciaDraft] = useState(reserva.beneficiario_referencia || "");
  const [editEmail, setEditEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(reserva.email_beneficiario || "");
  const [emailLookup, setEmailLookup] = useState(null);
  const [emailConfirmado, setEmailConfirmado] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [referenciaBusy, setReferenciaBusy] = useState(false);

  useEffect(() => {
    if (!editEmail) return undefined;
    const email = String(emailDraft || "").trim();
    if (!email || !email.includes("@")) {
      setEmailLookup(null);
      setEmailConfirmado(false);
      return undefined;
    }
    const t = window.setTimeout(async () => {
      setEmailBusy(true);
      try {
        const data = await buscarBeneficiarioPorEmail(email);
        setEmailLookup(data?.encontrado ? data : { encontrado: false, email });
        setEmailConfirmado(false);
      } catch (e) {
        toast.error(e?.message || "No se pudo buscar el mail.");
      } finally {
        setEmailBusy(false);
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [editEmail, emailDraft]);

  const puedeAsociarEmail =
    !editEmail ||
    !emailLookup?.encontrado ||
    emailConfirmado;

  const guardarEmail = async () => {
    const email = String(emailDraft || "").trim();
    if (!email) {
      toast.error("Ingresá un mail.");
      return;
    }
    if (emailLookup?.encontrado && !emailConfirmado) {
      toast.error("Confirmá que es la persona correcta.");
      return;
    }
    setEmailBusy(true);
    try {
      await asociarEmailTercero({ reservaId: reserva.id, email });
      toast.success(
        emailLookup?.encontrado
          ? "Entradas vinculadas al usuario existente."
          : "Mail asociado; se vincularán cuando esa persona se registre.",
      );
      setEditEmail(false);
      onUpdated?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo asociar el mail.");
    } finally {
      setEmailBusy(false);
    }
  };

  const guardarReferencia = async () => {
    setReferenciaBusy(true);
    try {
      await actualizarReferenciaTercero(reserva.id, referenciaDraft);
      toast.success("Referencia actualizada.");
      setEditReferencia(false);
      onUpdated?.();
    } catch (e) {
      toast.error(e?.message || "No se pudo guardar la referencia.");
    } finally {
      setReferenciaBusy(false);
    }
  };

  return (
    <article className={`${ui.card} p-3 space-y-2`}>
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
            isDark ? "bg-indigo-900/60 text-indigo-200" : "bg-indigo-100 text-indigo-800"
          }`}
        >
          {estado.badge}
        </span>
      </div>
      {estado.detail && <p className={`text-xs ${ui.textSoft}`}>{estado.detail}</p>}
      <p className={`text-xs ${ui.textSoft}`}>
        Entradas: {reserva.cantidad_solicitada} · Ingresadas: {ingresadas}
      </p>

      {editReferencia ? (
        <div className="space-y-2">
          <input
            type="text"
            className={ui.input}
            value={referenciaDraft}
            onChange={(e) => setReferenciaDraft(e.target.value)}
            placeholder="Referencia / nota (ej. María García — vecina)"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={referenciaBusy} onClick={guardarReferencia} className={ui.btnPrimary}>
              Guardar
            </button>
            <button type="button" onClick={() => setEditReferencia(false)} className={ui.btnSecondary}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setEditReferencia(true)} className={`text-xs font-bold underline ${ui.textSoft}`}>
          {reserva.beneficiario_referencia ? "Editar referencia" : "Añadir referencia"}
        </button>
      )}

      {editEmail ? (
        <div className={`space-y-2 rounded-lg p-3 ${ui.inset}`}>
          <label className={ui.label}>Mail del beneficiario</label>
          <input
            type="email"
            className={ui.input}
            value={emailDraft}
            onChange={(e) => setEmailDraft(e.target.value)}
            placeholder="correo@ejemplo.com"
          />
          {emailBusy && <p className={`text-xs ${ui.textMuted}`}>Buscando…</p>}
          {emailLookup?.encontrado && (
            <div className={`rounded-lg p-3 text-sm ${isDark ? "bg-emerald-950/40 border border-emerald-800" : "bg-emerald-50 border border-emerald-200"}`}>
              <p className="font-bold">
                {emailLookup.apellido}, {emailLookup.nombre}
              </p>
              <p className={`text-xs ${ui.textMuted}`}>{emailLookup.email}</p>
              <label className="mt-2 flex items-start gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailConfirmado}
                  onChange={(e) => setEmailConfirmado(e.target.checked)}
                  className="mt-0.5"
                />
                <span>Sí, es esa persona</span>
              </label>
            </div>
          )}
          {emailLookup && !emailLookup.encontrado && String(emailDraft).includes("@") && !emailBusy && (
            <p className={`text-xs ${ui.textMuted}`}>
              No hay cuenta con ese mail; quedará pendiente hasta que se registre.
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={emailBusy || !puedeAsociarEmail || !String(emailDraft).trim()}
              onClick={guardarEmail}
              className={ui.btnPrimary}
            >
              Asociar mail
            </button>
            <button type="button" onClick={() => setEditEmail(false)} className={ui.btnSecondary}>
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        !reserva.email_beneficiario &&
        reserva.usuario_id === reserva.reservada_por && (
          <button type="button" onClick={() => setEditEmail(true)} className={`text-xs font-bold underline ${ui.textSoft}`}>
            Asociar mail
          </button>
        )
      )}

      <div className="flex flex-col sm:flex-row flex-wrap gap-2">
        <button type="button" onClick={() => onToggleQr(reserva.id)} className={`w-full sm:w-auto rounded-lg px-3 py-2 text-xs font-bold ${ui.btnSecondary}`}>
          {qrOpen ? "Ocultar QRs" : "Ver QRs"}
        </button>
        <button
          type="button"
          disabled={downloadingPdfReservaId === reserva.id}
          onClick={() => onDownloadPdf(reserva)}
          className={`w-full sm:w-auto rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-60 ${ui.btnSecondary}`}
        >
          {downloadingPdfReservaId === reserva.id ? "Generando PDF…" : "Descargar PDF"}
        </button>
        <button type="button" onClick={() => onCancel(reserva)} className={`w-full sm:w-auto rounded-lg px-3 py-2 text-xs font-bold ${ui.btnDanger}`}>
          Cancelar
        </button>
      </div>
      {qrOpen && <MisReservasQrPanel reserva={reserva} isDark={isDark} />}
    </article>
  );
}

export default function EntradasTercerosSection({
  entradasTerceros,
  ui,
  isDark,
  downloadingPdfReservaId,
  setDownloadingPdfReservaId,
  onCancelReserva,
  onRefresh,
}) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [qrExpandedId, setQrExpandedId] = useState(null);

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const proximas = useMemo(() => {
    const { proximas: p } = splitMisReservas(entradasTerceros, nowMs);
    return p;
  }, [entradasTerceros, nowMs]);

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

  if (!proximas.length) {
    return (
      <p className={`text-sm ${ui.textMuted}`}>
        No tenés entradas reservadas para terceros en conciertos próximos.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {proximas.map((reserva) => (
        <TerceroReservaCard
          key={reserva.id}
          reserva={reserva}
          ui={ui}
          isDark={isDark}
          nowMs={nowMs}
          downloadingPdfReservaId={downloadingPdfReservaId}
          onDownloadPdf={handleDownloadPdf}
          onCancel={onCancelReserva}
          onUpdated={onRefresh}
          qrExpandedId={qrExpandedId}
          onToggleQr={(id) => setQrExpandedId((prev) => (prev === id ? null : id))}
        />
      ))}
    </div>
  );
}
