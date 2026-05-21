import React, { useEffect, useMemo, useState } from "react";
import {
  asegurarQrTokensReserva,
  entradasConTokensCompletos,
  mergeAsegurarQrEnReserva,
  tokenQrReservaGrupo,
  tokenToQrDataUrl,
} from "../../services/entradaService";
import { entradasTodasIngresadas } from "../../utils/entradasMisReservas";

export default function MisReservasQrPanel({ reserva, isDark = false }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reservaQr, setReservaQr] = useState(null);
  const [entradasQr, setEntradasQr] = useState([]);

  const sortedEntradas = useMemo(
    () => [...(reserva?.entradas || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0)),
    [reserva?.entradas],
  );

  const qrReservaUsado = entradasTodasIngresadas(reserva);

  useEffect(() => {
    let cancelled = false;

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
        const entradasRows = [...(row.entradas || [])].sort((a, b) => (a.orden || 0) - (b.orden || 0));
        const tokens = entradasRows.map((e) => e.qr_entrada_token).filter(Boolean);
        if (tokens.length !== Number(row.cantidad_solicitada) || !tokens.length) {
          throw new Error("Faltan datos de entradas individuales.");
        }
        const [grupo, ...individuales] = await Promise.all([
          tokenToQrDataUrl(grupoToken, { used: qrReservaUsado }),
          ...tokens.map((t, i) =>
            tokenToQrDataUrl(t, { used: entradasRows[i]?.estado_ingreso === "ingresada" }),
          ),
        ]);
        if (cancelled) return;
        setReservaQr(grupo);
        setEntradasQr(individuales);
      } catch (e) {
        if (!cancelled) setError(e?.message || "No se pudieron cargar los QR.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reserva, sortedEntradas, qrReservaUsado]);

  const panelClass = isDark
    ? "rounded-lg border border-slate-600 bg-slate-900/60 p-3 space-y-3"
    : "rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3";

  if (loading) {
    return <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>Cargando códigos QR…</p>;
  }
  if (error) {
    return <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>;
  }

  return (
    <div className={panelClass}>
      <div>
        <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
          QR reserva (grupo)
          {qrReservaUsado && (
            <span className="ml-2 normal-case font-semibold text-rose-600 dark:text-rose-400">
              · todas las plazas ingresadas
            </span>
          )}
        </p>
        {reservaQr && (
          <img
            src={reservaQr}
            alt="QR reserva general"
            className={`w-full aspect-square max-w-full object-contain rounded-lg border ${
              qrReservaUsado ? "border-rose-300 dark:border-rose-800" : isDark ? "border-slate-600" : "border-slate-200"
            }`}
          />
        )}
      </div>
      {entradasQr.length > 0 && (
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-wide mb-2 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            QR por entrada
          </p>
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
        </div>
      )}
    </div>
  );
}
