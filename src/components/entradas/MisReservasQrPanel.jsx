import React, { useEffect, useMemo, useState } from "react";
import {
  asegurarQrTokensReserva,
  entradasConTokensCompletos,
  mergeAsegurarQrEnReserva,
  tokenQrReservaGrupo,
  tokenToQrDataUrl,
} from "../../services/entradaService";
import { entradasTodasIngresadas } from "../../utils/entradasMisReservas";

/**
 * @param {{ reserva: object, isDark?: boolean, variant?: "default" | "door" }} props
 * `door`: QR grande para mostrar en puerta (móvil / mi-entrada).
 */
export default function MisReservasQrPanel({ reserva, isDark = false, variant = "default" }) {
  const isDoor = variant === "door";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reservaQr, setReservaQr] = useState(null);
  const [entradasQr, setEntradasQr] = useState([]);
  const [showIndividuales, setShowIndividuales] = useState(false);
  const [loadingIndividuales, setLoadingIndividuales] = useState(false);
  const [errorIndividuales, setErrorIndividuales] = useState("");
  const [reservaRow, setReservaRow] = useState(null);

  const sortedEntradas = useMemo(
    () => [...(reserva?.entradas || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    [reserva?.entradas],
  );

  const cantidad = Number(reserva?.cantidad_solicitada) || sortedEntradas.length || 0;
  const qrReservaUsado = entradasTodasIngresadas(reserva);
  const qrPixelSize = isDoor ? 560 : 320;

  useEffect(() => {
    let cancelled = false;
    setShowIndividuales(false);
    setEntradasQr([]);
    setErrorIndividuales("");

    (async () => {
      setLoading(true);
      setError("");
      try {
        let row = reserva;
        if (!entradasConTokensCompletos(row)) {
          const payload = await asegurarQrTokensReserva(row.id);
          row = mergeAsegurarQrEnReserva(row, payload);
        }
        const grupoToken = tokenQrReservaGrupo(row);
        if (!grupoToken) {
          throw new Error("No hay código de reserva para mostrar el QR grupal.");
        }
        const grupo = await tokenToQrDataUrl(grupoToken, {
          used: qrReservaUsado,
          width: qrPixelSize,
        });
        if (cancelled) return;
        setReservaRow(row);
        setReservaQr(grupo);
      } catch (e) {
        if (!cancelled) setError(e?.message || "No se pudieron cargar los QR.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reserva, sortedEntradas, qrReservaUsado, qrPixelSize]);

  useEffect(() => {
    if (!showIndividuales || !reservaRow || entradasQr.length > 0) return;
    let cancelled = false;

    (async () => {
      setLoadingIndividuales(true);
      setErrorIndividuales("");
      try {
        const entradasRows = [...(reservaRow.entradas || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
        const tokens = entradasRows.map((e) => e.qr_entrada_token).filter(Boolean);
        if (tokens.length !== Number(reservaRow.cantidad_solicitada) || !tokens.length) {
          throw new Error("Faltan datos de entradas individuales.");
        }
        const individuales = await Promise.all(
          tokens.map((t, i) =>
            tokenToQrDataUrl(t, { used: entradasRows[i]?.estado_ingreso === "ingresada" }),
          ),
        );
        if (!cancelled) setEntradasQr(individuales);
      } catch (e) {
        if (!cancelled) setErrorIndividuales(e?.message || "No se pudieron cargar los QR individuales.");
      } finally {
        if (!cancelled) setLoadingIndividuales(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showIndividuales, reservaRow, entradasQr.length]);

  if (loading) {
    return (
      <p className={`${isDoor ? "text-sm text-center py-8" : "text-xs"} ${isDark ? "text-slate-400" : "text-slate-500"}`}>
        Cargando código QR…
      </p>
    );
  }
  if (error) {
    return <p className={`${isDoor ? "text-sm" : "text-xs"} text-rose-600 dark:text-rose-400`}>{error}</p>;
  }

  const grayBox = isDark
    ? "rounded-lg border border-slate-600 bg-slate-700/80 px-3 py-2.5"
    : "rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5";

  return (
    <div className="space-y-3">
      <div>
        <p
          className={`${isDoor ? "text-xs text-center" : "text-[10px]"} font-bold uppercase tracking-wide mb-1 ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          QR general
          {qrReservaUsado && (
            <span className="ml-2 normal-case font-semibold text-rose-600 dark:text-rose-400">
              · todas las plazas ingresadas
            </span>
          )}
        </p>
        {cantidad > 0 && (
          <p
            className={`${isDoor ? "text-base text-center" : "text-sm"} font-bold mb-2 ${
              isDark ? "text-slate-100" : "text-slate-800"
            }`}
          >
            {cantidad} entrada{cantidad === 1 ? "" : "s"}
          </p>
        )}
        {reservaQr && (
          <img
            src={reservaQr}
            alt="QR reserva general"
            className={`w-full aspect-square max-w-[min(100%,22rem)] mx-auto object-contain rounded-lg border bg-white ${
              qrReservaUsado
                ? "border-rose-300 dark:border-rose-800"
                : isDark
                  ? "border-slate-600"
                  : "border-slate-200"
            }`}
          />
        )}
        <p
          className={`mt-2 ${isDoor ? "text-sm text-center" : "text-[11px]"} ${
            isDark ? "text-slate-400" : "text-slate-500"
          }`}
        >
          Mostrá este código en puerta: vale por todas las entradas de la reserva.
        </p>
      </div>

      <div className={`flex items-center justify-between gap-3 ${grayBox}`}>
        <p className={`text-xs font-medium min-w-0 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
          Solo si entran por separado {"-->"}
        </p>
        <button
          type="button"
          onClick={() => setShowIndividuales((v) => !v)}
          className={`entradas-interactive shrink-0 text-xs font-bold underline-offset-2 hover:underline ${
            isDark ? "text-[#1ebbf0]" : "text-[#0e7490]"
          }`}
        >
          {showIndividuales ? "Ocultar QRs individuales" : "Ver QRs individuales"}
        </button>
      </div>

      {showIndividuales && (
        <div>
          {loadingIndividuales && (
            <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Cargando QRs individuales…</p>
          )}
          {errorIndividuales && (
            <p className="text-xs text-rose-600 dark:text-rose-400">{errorIndividuales}</p>
          )}
          {!loadingIndividuales && !errorIndividuales && entradasQr.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {entradasQr.map((src, idx) => {
                const row = sortedEntradas[idx];
                const usada = row?.estado_ingreso === "ingresada";
                return (
                  <div key={row?.id ?? idx} className="text-center space-y-1">
                    <img
                      src={src}
                      alt={`QR entrada ${row?.orden ?? idx + 1}`}
                      className={`w-full max-w-[8rem] mx-auto rounded-lg border ${usada ? "border-rose-300 dark:border-rose-800" : isDark ? "border-slate-600" : "border-slate-200"}`}
                    />
                    <p className={`text-[10px] font-semibold ${usada ? "text-rose-600 dark:text-rose-400" : isDark ? "text-slate-300" : "text-slate-600"}`}>
                      Entrada {row?.orden ?? idx + 1}
                      {usada ? " · usada" : ""}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
