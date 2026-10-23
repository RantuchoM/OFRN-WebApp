import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { entradasUi, useEntradasDarkMode } from "../../../hooks/useEntradasDarkMode";
import {
  descargarPdfDesdeReservaRow,
  fetchEntradaPdfSharePayload,
} from "../../../services/entradaService";

/**
 * /entradas/pdf?t=<pdf_share_token>
 * Sin login: carga la reserva por token y descarga el mismo PDF que en la app.
 */
export default function EntradasPdfSharePage() {
  const { isDark } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
  const [searchParams] = useSearchParams();
  const token = String(searchParams.get("t") || searchParams.get("token") || "")
    .trim()
    .toLowerCase();
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const [message, setMessage] = useState("Preparando tu PDF…");
  const [codigo, setCodigo] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!/^[a-f0-9]{32,96}$/.test(token)) {
        setStatus("error");
        setMessage("El enlace no es válido o está incompleto.");
        return;
      }
      try {
        const reserva = await fetchEntradaPdfSharePayload(token);
        if (cancelled) return;
        setCodigo(String(reserva?.codigo_reserva || "").trim());
        setMessage("Descargando PDF…");
        await descargarPdfDesdeReservaRow(reserva);
        if (cancelled) return;
        setStatus("ok");
        setMessage("Listo: el PDF se descargó en tu dispositivo.");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setMessage(err?.message || "No se pudo generar el PDF.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className={`${ui.page} flex items-center justify-center p-4`}>
      <div
        className={`w-full max-w-md rounded-xl border p-6 space-y-4 shadow-lg ${
          isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"
        }`}
      >
        <h1 className={`text-xl font-bold ${ui.textStrong}`}>Entradas OFRN</h1>
        <p
          className={`text-base leading-relaxed ${
            status === "error"
              ? isDark
                ? "text-rose-300"
                : "text-rose-700"
              : ui.textBody
          }`}
          role="status"
        >
          {message}
        </p>
        {codigo ? (
          <p className={`text-sm ${ui.textMuted}`}>Código de reserva: {codigo}</p>
        ) : null}
        {status === "ok" ? (
          <p className={`text-sm ${ui.textMuted}`}>
            Si no ves la descarga, revisá la carpeta de descargas del navegador.
          </p>
        ) : null}
        <Link to="/entradas" className={`${ui.btnPrimary} inline-flex w-full justify-center`}>
          Ir a Entradas
        </Link>
      </div>
    </div>
  );
}
