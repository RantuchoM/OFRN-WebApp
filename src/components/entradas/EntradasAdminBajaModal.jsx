import React from "react";
import { createPortal } from "react-dom";

/**
 * Modal unificado de baja: suspender, cancelar reservas (+ mail) o eliminar definitivamente.
 * @param {{ scope: 'programa'|'concierto', id: number, nombre: string, activo: boolean, bloqueoEliminar: string|null }} target
 * @param {{ reservas: number, plazas: number }|null} restaurables
 */
export default function EntradasAdminBajaModal({
  target,
  isDark,
  ui,
  busy,
  error,
  cancelarReservas,
  onCancelarReservasChange,
  enviarMail,
  onEnviarMailChange,
  restaurarReservas,
  onRestaurarReservasChange,
  restaurables,
  onClose,
  onSuspender,
  onEliminar,
  onReactivar,
}) {
  if (!target) return null;

  const esPrograma = target.scope === "programa";
  const tituloEntidad = esPrograma ? "programa" : "concierto";
  const nombre = target.nombre || "sin nombre";
  const inactivo = target.activo === false;
  const puedeEliminar = !target.bloqueoEliminar;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4">
      <div
        className={`w-full max-w-md max-h-[min(90vh,36rem)] overflow-y-auto rounded-xl border p-5 sm:p-6 shadow-2xl ${
          isDark ? "border-slate-600 bg-slate-900 text-slate-100" : "border-slate-100 bg-white text-slate-900"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entradas-baja-titulo"
      >
        <h3 id="entradas-baja-titulo" className={`text-base sm:text-lg font-bold ${ui.textStrong}`}>
          Dar de baja {tituloEntidad}
        </h3>
        <p className={`mt-2 text-sm leading-relaxed ${ui.textMuted}`}>
          «{nombre}»
        </p>

        {inactivo ? (
          <>
            <p className={`mt-3 text-sm ${ui.textBody}`}>
              Este {tituloEntidad} está <strong>inactivo</strong> (fuera del catálogo y sin venta). Podés reactivarlo o
              eliminarlo definitivamente si no quedan reservas activas ni ingresos.
            </p>
            {restaurables == null ? (
              <p className={`mt-3 text-xs ${ui.textMuted}`}>Comprobando reservas restaurables…</p>
            ) : restaurables.reservas > 0 ? (
              <label className={`mt-4 flex items-start gap-2 text-sm ${ui.textBody}`}>
                <input
                  type="checkbox"
                  checked={restaurarReservas}
                  onChange={(e) => onRestaurarReservasChange(e.target.checked)}
                  disabled={busy}
                  className={`mt-0.5 ${ui.checkbox}`}
                />
                <span>
                  <strong>Restaurar reservas canceladas por suspensión</strong> ({restaurables.reservas}{" "}
                  {restaurables.reservas === 1 ? "reserva" : "reservas"}, {restaurables.plazas}{" "}
                  {restaurables.plazas === 1 ? "plaza" : "plazas"}). No incluye entradas que el público canceló por su
                  cuenta.
                </span>
              </label>
            ) : (
              <p className={`mt-3 text-xs leading-snug ${ui.textMuted}`}>
                No hay reservas canceladas por suspensión admin pendientes de restaurar.
              </p>
            )}
          </>
        ) : (
          <>
            <p className={`mt-3 text-sm leading-relaxed ${ui.textBody}`}>
              <strong>Suspender</strong> oculta el {tituloEntidad} del catálogo, cierra la venta
              {esPrograma ? " en todos sus conciertos" : ""} y detiene mails automáticos.
            </p>
            <label className={`mt-4 flex items-start gap-2 text-sm ${ui.textBody}`}>
              <input
                type="checkbox"
                checked={cancelarReservas}
                onChange={(e) => onCancelarReservasChange(e.target.checked)}
                disabled={busy}
                className={`mt-0.5 ${ui.checkbox}`}
              />
              <span>
                <strong>Evento cancelado:</strong> cancelar las reservas activas
                {esPrograma ? " de todos los conciertos del programa" : ""} (los QR dejan de servir).
              </span>
            </label>
            <label
              className={`mt-3 flex items-start gap-2 text-sm ${
                cancelarReservas ? ui.textBody : ui.textMuted
              }`}
            >
              <input
                type="checkbox"
                checked={enviarMail}
                onChange={(e) => onEnviarMailChange(e.target.checked)}
                disabled={busy || !cancelarReservas}
                className={`mt-0.5 ${ui.checkbox}`}
              />
              <span>Enviar mail de aviso a quienes tenían reserva activa.</span>
            </label>
            {!cancelarReservas ? (
              <p className={`mt-3 text-xs leading-snug ${ui.textMuted}`}>
                Sin cancelar reservas: quien ya tiene entrada la conserva en Mis entradas y recepción puede escanearla.
              </p>
            ) : null}
          </>
        )}

        {target.bloqueoEliminar ? (
          <p className={`mt-3 text-xs leading-snug rounded-lg border px-3 py-2 ${
            isDark ? "border-amber-700/50 bg-amber-950/30 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-900"
          }`}>
            Eliminar definitivamente: {target.bloqueoEliminar}
          </p>
        ) : (
          <p className={`mt-3 text-xs leading-snug ${ui.textMuted}`}>
            Eliminar definitivamente borra el {tituloEntidad}
            {esPrograma ? " y sus conciertos de entradas" : ""} sin reservas activas ni ingresos registrados.
          </p>
        )}

        {error ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button type="button" onClick={onClose} disabled={busy} className={ui.btnGhost}>
            Cerrar
          </button>
          {inactivo ? (
            <button
              type="button"
              onClick={() => void onReactivar()}
              disabled={busy}
              className={`${ui.btnPrimary} !w-auto px-4`}
            >
              {busy ? "Aplicando…" : "Reactivar"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void onSuspender()}
              disabled={busy}
              className={`${ui.btnPrimary} !w-auto px-4`}
            >
              {busy ? "Aplicando…" : "Suspender"}
            </button>
          )}
          <button
            type="button"
            onClick={() => void onEliminar()}
            disabled={busy || !puedeEliminar}
            title={target.bloqueoEliminar || "Eliminar definitivamente"}
            className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {busy ? "Aplicando…" : "Eliminar definitivamente"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
