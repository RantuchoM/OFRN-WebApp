import React, { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import ConfirmModal from "../ui/ConfirmModal";
import { IconX } from "../ui/Icons";
import EntradasAyudaWhatsAppBtn from "./EntradasAyudaWhatsAppBtn";
import EntradasCambiarCantidadControls from "./EntradasCambiarCantidadControls";
import EntradasVerQrButton from "./EntradasVerQrButton";
import MisReservasQrModal from "./MisReservasQrModal";
import {
  buildEntradasReservaPdfConDataUrls,
  blobToPdfBase64ForMail,
  cambiarCantidadReserva,
  cambiarConciertoReservaStaff,
  cancelarReservaStaff,
  descargarPdfDesdeReservaRow,
  enviarMailReserva,
  listarReservasPersonaStaff,
  tokenToQrDataUrl,
} from "../../services/entradaService";
import { downloadEntradasReservaPdfBlob } from "../../utils/entradasReservaPdf";
import {
  entradasIngresadasCount,
  isReservaCancelada,
  isReservaHistorica,
  labelCantidadEntradas,
  maxCantidadEditable,
  puedeCambiarCantidadReserva,
} from "../../utils/entradasMisReservas";
import { listEntradasConciertosAbiertosPublicos } from "../../utils/entradasConciertosAbiertosPublicos";
import { fechaHoraDesdeConciertoEntrada } from "../../utils/entradasConciertoEvento";
import { formatEntradasConciertoFechaHora } from "../../utils/entradasReservaCopy";

function plazasLibresEstimadas(reserva, funcionesAbiertas) {
  const cid = Number(reserva?.concierto_id || reserva?.concierto?.id);
  const fn = (funcionesAbiertas || []).find((f) => Number(f.id) === cid);
  const cap = Number(reserva?.concierto?.capacidad_maxima);
  if (fn && fn.porcentaje != null && Number.isFinite(cap) && cap > 0) {
    return Math.max(0, Math.round((fn.porcentaje / 100) * cap));
  }
  if (fn?.llena) return 0;
  return null;
}

function puedeEditarNoUsada(reserva) {
  if (!reserva || isReservaCancelada(reserva) || isReservaHistorica(reserva)) return false;
  return puedeCambiarCantidadReserva(reserva, { concierto: reserva.concierto });
}

/**
 * Historial de reservas de una persona (staff) + editar activas no usadas.
 */
export default function EntradasPersonaHistorialPanel({
  email,
  nombre = "",
  telefono = null,
  ui,
  isDark = false,
  compact = false,
  onChanged = null,
}) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [funciones, setFunciones] = useState([]);
  const [busyId, setBusyId] = useState(null);
  const [qrReserva, setQrReserva] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cantidadTarget, setCantidadTarget] = useState(null);
  const [cantidadDraft, setCantidadDraft] = useState(1);
  const [funcionTarget, setFuncionTarget] = useState(null);
  const [funcionDestinoId, setFuncionDestinoId] = useState("");
  const [funcionForzarCupo, setFuncionForzarCupo] = useState(false);

  const emailNorm = String(email || "").trim().toLowerCase();

  const reload = useCallback(async () => {
    if (!emailNorm || !emailNorm.includes("@")) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [list, fns] = await Promise.all([
        listarReservasPersonaStaff(emailNorm),
        listEntradasConciertosAbiertosPublicos().catch(() => []),
      ]);
      setRows(Array.isArray(list) ? list : []);
      setFunciones(Array.isArray(fns) ? fns : []);
    } catch (e) {
      toast.error(e?.message || "No se pudo cargar el historial de entradas.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [emailNorm]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const { activas, otras } = useMemo(() => {
    const a = [];
    const o = [];
    for (const r of rows) {
      if (!isReservaCancelada(r) && !isReservaHistorica(r)) a.push(r);
      else o.push(r);
    }
    return { activas: a, otras: o };
  }, [rows]);

  const afterMutation = async () => {
    await reload();
    onChanged?.();
  };

  const handleDownloadPdf = async (reserva) => {
    setBusyId(reserva.id);
    try {
      await descargarPdfDesdeReservaRow(reserva);
      toast.success("PDF descargado.");
    } catch (e) {
      toast.error(e?.message || "No se pudo descargar el PDF.");
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmCancel = async () => {
    const r = cancelTarget;
    if (!r?.id) return;
    setBusyId(r.id);
    try {
      await cancelarReservaStaff(r.id);
      try {
        await enviarMailReserva({ reservaId: r.id, action: "cancelacion" });
      } catch {
        /* mail no crítico */
      }
      toast.success("Reserva cancelada.");
      setCancelTarget(null);
      await afterMutation();
    } catch (e) {
      toast.error(e?.message || "No se pudo cancelar.");
      throw e;
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmCantidad = async () => {
    const target = cantidadTarget;
    const next = Number(cantidadDraft);
    const actual = Number(target?.cantidad_solicitada) || 0;
    if (!target?.id || !Number.isFinite(next) || next === actual) return;
    setBusyId(target.id);
    try {
      const result = await cambiarCantidadReserva({ reservaId: target.id, cantidad: next });
      try {
        const reservaQr = await tokenToQrDataUrl(result.qr_reserva_token);
        const entriesQr = await Promise.all(
          (result.qr_entrada_tokens || []).map((token) => tokenToQrDataUrl(token)),
        );
        const { blob, filename } = await buildEntradasReservaPdfConDataUrls({
          concierto: target.concierto,
          reserva: { codigo_reserva: result.codigo_reserva, cantidad_solicitada: next },
          reservaQrDataUrl: reservaQr,
          entriesQrDataUrls: entriesQr,
        });
        downloadEntradasReservaPdfBlob(blob, filename);
        const pdfBase64 = await blobToPdfBase64ForMail(blob);
        await enviarMailReserva({
          reservaId: result.reserva_id,
          qrReservaToken: result.qr_reserva_token,
          qrEntradaTokens: result.qr_entrada_tokens || [],
          pdfBase64,
          action: "cambio_cantidad",
          cantidadAnterior: actual,
        });
      } catch {
        /* PDF/mail best-effort */
      }
      toast.success("Cantidad actualizada.");
      setCantidadTarget(null);
      await afterMutation();
    } catch (e) {
      toast.error(e?.message || "No se pudo cambiar la cantidad.");
      throw e;
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmFuncion = async () => {
    const target = funcionTarget;
    const destId = Number(funcionDestinoId);
    if (!target?.id || !Number.isFinite(destId) || destId <= 0) return;
    setBusyId(target.id);
    try {
      const result = await cambiarConciertoReservaStaff({
        reservaId: target.id,
        nuevoConciertoId: destId,
        forzarCupo: funcionForzarCupo,
      });
      try {
        const fn = funciones.find((f) => Number(f.id) === destId);
        const reservaQr = await tokenToQrDataUrl(result.qr_reserva_token);
        const entriesQr = await Promise.all(
          (result.qr_entrada_tokens || []).map((token) => tokenToQrDataUrl(token)),
        );
        const { blob, filename } = await buildEntradasReservaPdfConDataUrls({
          concierto: fn?.concierto || { nombre: fn?.nombre },
          reserva: {
            codigo_reserva: result.codigo_reserva,
            cantidad_solicitada: target.cantidad_solicitada,
          },
          reservaQrDataUrl: reservaQr,
          entriesQrDataUrls: entriesQr,
        });
        downloadEntradasReservaPdfBlob(blob, filename);
        const pdfBase64 = await blobToPdfBase64ForMail(blob);
        await enviarMailReserva({
          reservaId: result.reserva_id,
          qrReservaToken: result.qr_reserva_token,
          qrEntradaTokens: result.qr_entrada_tokens || [],
          pdfBase64,
          action: "confirmacion",
        });
      } catch {
        /* best-effort */
      }
      toast.success("Función actualizada.");
      setFuncionTarget(null);
      setFuncionDestinoId("");
      setFuncionForzarCupo(false);
      await afterMutation();
    } catch (e) {
      toast.error(e?.message || "No se pudo cambiar de función.");
      throw e;
    } finally {
      setBusyId(null);
    }
  };

  const renderCard = (reserva) => {
    const editable = puedeEditarNoUsada(reserva);
    const cancelada = isReservaCancelada(reserva);
    const historica = isReservaHistorica(reserva);
    const ingresadas = entradasIngresadasCount(reserva);
    const fecha = formatEntradasConciertoFechaHora(fechaHoraDesdeConciertoEntrada(reserva.concierto));
    const libres = plazasLibresEstimadas(reserva, funciones);
    const destinos = funciones.filter(
      (f) => Number(f.id) !== Number(reserva.concierto_id || reserva.concierto?.id),
    );

    return (
      <li
        key={reserva.id}
        className={`rounded-lg border p-3 space-y-2 ${
          isDark ? "border-slate-600 bg-slate-900/40" : "border-slate-200 bg-white"
        }`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`text-sm font-bold ${ui.textStrong}`}>
              {reserva.concierto?.nombre || "Concierto"}
            </p>
            <p className={`text-xs ${ui.textMuted}`}>{fecha}</p>
            <p className={`text-xs ${ui.textSoft}`}>
              {reserva.codigo_reserva || `Reserva #${reserva.id}`}
              {" · "}
              {labelCantidadEntradas(reserva.cantidad_solicitada)}
              {ingresadas > 0 ? ` · ${ingresadas} ingresada${ingresadas === 1 ? "" : "s"}` : ""}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase ${
              cancelada
                ? isDark
                  ? "bg-slate-700 text-slate-200"
                  : "bg-slate-200 text-slate-700"
                : historica
                  ? isDark
                    ? "bg-amber-900 text-amber-100"
                    : "bg-amber-100 text-amber-900"
                  : isDark
                    ? "bg-emerald-900 text-emerald-100"
                    : "bg-emerald-100 text-emerald-900"
            }`}
          >
            {cancelada ? "Cancelada" : historica ? "Pasada" : "Activa"}
          </span>
        </div>

        {!cancelada ? (
          <div className="flex flex-wrap gap-2">
            <EntradasVerQrButton
              reserva={reserva}
              isDark={isDark}
              size="xs"
              idleClassName={ui.btnSecondary}
              className="!w-auto"
              onClick={() => setQrReserva(reserva)}
            />
            <button
              type="button"
              disabled={busyId === reserva.id}
              className={`${ui.btnGhost} px-2 py-1.5 text-xs`}
              onClick={() => void handleDownloadPdf(reserva)}
            >
              Descargar PDF
            </button>
            {telefono ? (
              <EntradasAyudaWhatsAppBtn
                telefono={telefono}
                nombre={nombre}
                reservaId={reserva.id}
                concierto={reserva.concierto}
                cantidad={reserva.cantidad_solicitada}
                isDark={isDark}
                iconSize={14}
                className={
                  isDark
                    ? "inline-flex items-center gap-1 rounded-md border border-emerald-700 px-2 py-1.5 text-xs font-bold text-emerald-200"
                    : "inline-flex items-center gap-1 rounded-md border border-emerald-300 px-2 py-1.5 text-xs font-bold text-emerald-800"
                }
              />
            ) : null}
          </div>
        ) : null}

        {editable ? (
          <div className="flex flex-col gap-2 border-t border-dashed pt-2 border-slate-300/60">
            <EntradasCambiarCantidadControls
              reserva={reserva}
              concierto={reserva.concierto}
              ui={ui}
              plazasLibres={libres}
              compact
              showCount={false}
              disabled={busyId != null}
              onRequestChange={() => {
                setCantidadDraft(Number(reserva.cantidad_solicitada) || 1);
                setCantidadTarget(reserva);
              }}
            />
            {destinos.length > 0 ? (
              <button
                type="button"
                disabled={busyId != null}
                className={`${ui.btnSecondary || ui.btnGhost} px-3 py-2 text-xs font-bold`}
                onClick={() => {
                  setFuncionTarget(reserva);
                  setFuncionDestinoId(String(destinos[0]?.id || ""));
                  setFuncionForzarCupo(false);
                }}
              >
                Cambiar función
              </button>
            ) : null}
            <button
              type="button"
              disabled={busyId != null}
              className={`${ui.btnDanger || "rounded-lg bg-rose-600 text-white hover:bg-rose-700"} px-3 py-2 text-xs font-bold`}
              onClick={() => setCancelTarget(reserva)}
            >
              Cancelar reserva
            </button>
          </div>
        ) : null}
      </li>
    );
  };

  const maxCant = cantidadTarget
    ? maxCantidadEditable(cantidadTarget, plazasLibresEstimadas(cantidadTarget, funciones))
    : 4;
  const selectedDestino = funciones.find((f) => String(f.id) === String(funcionDestinoId));

  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {loading ? (
        <p className={`text-sm ${ui.textMuted}`}>Cargando historial…</p>
      ) : rows.length === 0 ? (
        <p className={`text-sm ${ui.textMuted}`}>No hay entradas registradas para este mail.</p>
      ) : (
        <>
          {activas.length > 0 ? (
            <div className="space-y-2">
              <h4 className={`text-xs font-bold uppercase tracking-wide ${ui.textMuted}`}>
                Activas / próximas
              </h4>
              <ul className="m-0 list-none space-y-2 p-0">{activas.map(renderCard)}</ul>
            </div>
          ) : null}
          {otras.length > 0 ? (
            <div className="space-y-2">
              <h4 className={`text-xs font-bold uppercase tracking-wide ${ui.textMuted}`}>
                Historial
              </h4>
              <ul className="m-0 list-none space-y-2 p-0">{otras.map(renderCard)}</ul>
            </div>
          ) : null}
        </>
      )}

      <MisReservasQrModal
        reserva={qrReserva}
        onClose={() => setQrReserva(null)}
        isDark={isDark}
        ui={ui}
      />

      <ConfirmModal
        isOpen={Boolean(cancelTarget)}
        onClose={() => busyId == null && setCancelTarget(null)}
        title="Cancelar reserva"
        message={
          cancelTarget
            ? `¿Cancelar ${cancelTarget.codigo_reserva || `#${cancelTarget.id}`}?\n\nLas plazas pendientes se anulan.`
            : ""
        }
        confirmText={busyId ? "Cancelando…" : "Sí, cancelar"}
        confirmLoading={busyId != null}
        confirmClassName="px-4 py-2.5 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
        onConfirm={handleConfirmCancel}
      />

      <ConfirmModal
        isOpen={Boolean(cantidadTarget)}
        onClose={() => busyId == null && setCantidadTarget(null)}
        title="Cambiar cantidad"
        message={
          cantidadTarget
            ? `Reserva ${cantidadTarget.codigo_reserva || `#${cantidadTarget.id}`}. Los QR anteriores dejarán de valer.`
            : ""
        }
        confirmText={busyId ? "Guardando…" : "Confirmar"}
        confirmLoading={busyId != null}
        confirmDisabled={Number(cantidadDraft) === Number(cantidadTarget?.cantidad_solicitada)}
        onConfirm={handleConfirmCantidad}
      >
        {cantidadTarget ? (
          <label className={`mt-3 block text-sm ${ui.textSoft}`}>
            Nueva cantidad
            <select
              className={`${ui.select} mt-1 w-full`}
              value={cantidadDraft}
              onChange={(e) => setCantidadDraft(Number(e.target.value))}
              disabled={busyId != null}
            >
              {Array.from({ length: Math.max(1, maxCant) }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </ConfirmModal>

      <ConfirmModal
        isOpen={Boolean(funcionTarget)}
        onClose={() => {
          if (busyId != null) return;
          setFuncionTarget(null);
          setFuncionForzarCupo(false);
        }}
        title="Cambiar función"
        message={
          funcionTarget
            ? `Mover ${funcionTarget.codigo_reserva || `#${funcionTarget.id}`} a otra función abierta. Se regeneran código y QR.`
            : ""
        }
        confirmText={busyId ? "Aplicando…" : "Cambiar función"}
        confirmLoading={busyId != null}
        confirmDisabled={!funcionDestinoId}
        onConfirm={handleConfirmFuncion}
      >
        {funcionTarget ? (
          <div className="mt-3 space-y-3">
            <label className={`block text-sm ${ui.textSoft}`}>
              Nueva función
              <select
                className={`${ui.select} mt-1 w-full`}
                value={funcionDestinoId}
                onChange={(e) => {
                  setFuncionDestinoId(e.target.value);
                  setFuncionForzarCupo(false);
                }}
                disabled={busyId != null}
              >
                {funciones
                  .filter(
                    (f) =>
                      Number(f.id) !== Number(funcionTarget.concierto_id || funcionTarget.concierto?.id),
                  )
                  .map((f) => (
                    <option key={f.id} value={String(f.id)}>
                      {f.label || f.nombre}
                    </option>
                  ))}
              </select>
            </label>
            {selectedDestino?.llena ? (
              <label className={`flex items-start gap-2 text-sm ${ui.textSoft}`}>
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={funcionForzarCupo}
                  onChange={(e) => setFuncionForzarCupo(e.target.checked)}
                  disabled={busyId != null}
                />
                <span>
                  Emitir igual como excepción de cupo (la función figura llena).
                </span>
              </label>
            ) : null}
          </div>
        ) : null}
      </ConfirmModal>
    </div>
  );
}

/** Modal portal para Usuarios / atajos. */
export function EntradasPersonaHistorialModal({
  open,
  onClose,
  email,
  nombre = "",
  telefono = null,
  ui,
  isDark = false,
  onChanged = null,
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`w-full max-w-lg max-h-[min(90vh,40rem)] overflow-y-auto rounded-xl border p-4 sm:p-5 shadow-2xl ${
          isDark ? "border-slate-600 bg-slate-800" : "border-slate-200 bg-white"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entradas-historial-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <h3 id="entradas-historial-titulo" className={`text-base font-bold ${ui.textStrong}`}>
              Historial de entradas
            </h3>
            <p className={`text-xs break-all ${ui.textMuted}`}>
              {nombre ? `${nombre} · ` : ""}
              {email}
            </p>
          </div>
          <button
            type="button"
            className={`shrink-0 rounded p-1 ${ui.btnIcon || "text-slate-500 hover:bg-slate-100"}`}
            aria-label="Cerrar"
            onClick={onClose}
          >
            <IconX size={20} />
          </button>
        </div>
        <EntradasPersonaHistorialPanel
          email={email}
          nombre={nombre}
          telefono={telefono}
          ui={ui}
          isDark={isDark}
          compact
          onChanged={onChanged}
        />
      </div>
    </div>,
    document.body,
  );
}
