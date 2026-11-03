import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IconX } from "../ui/Icons";
import {
  requestEntradasVerifyEmail,
  verifyEntradasEmailCode,
} from "../../services/entradaService";

const LINK_RESEND_COOLDOWN_SECONDS = 60;

/**
 * Modal para verificar el mail con OTP (paso posterior a sacar entradas).
 * Destaca Spam / Correo no deseado.
 */
export default function EntradasVerifyEmailModal({
  isOpen,
  onClose,
  ui,
  isDark,
  email,
  onVerified,
}) {
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [nextCodeAllowedAt, setNextCodeAllowedAt] = useState(0);
  const [codeSent, setCodeSent] = useState(false);

  const normalizedEmail = String(email || "").trim().toLowerCase();
  const cooldownLeft = Math.max(0, Math.ceil((nextCodeAllowedAt - Date.now()) / 1000));

  useEffect(() => {
    if (!isOpen) return undefined;
    setOtpCode("");
    setError("");
    setMessage("");
    setCodeSent(false);
    setNextCodeAllowedAt(0);
    return undefined;
  }, [isOpen, normalizedEmail]);

  useEffect(() => {
    if (!cooldownLeft) return undefined;
    const id = window.setInterval(() => {
      setNextCodeAllowedAt((prev) => (prev <= Date.now() ? 0 : prev));
    }, 1000);
    return () => window.clearInterval(id);
  }, [cooldownLeft]);

  if (!isOpen) return null;

  const spamBox = isDark
    ? "rounded-lg border-2 border-amber-600 bg-amber-950/60 px-4 py-3 text-sm leading-relaxed text-amber-100"
    : "rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-950";
  const errorBox = isDark
    ? "rounded-md border border-rose-800 bg-rose-950/50 px-3 py-3 text-sm text-rose-200"
    : "rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700";
  const okBox = isDark
    ? "rounded-md border border-emerald-800 bg-emerald-950/50 px-3 py-3 text-sm text-emerald-200"
    : "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800";

  const sendCode = async () => {
    if (!normalizedEmail) {
      setError("No hay un mail para verificar.");
      return;
    }
    if (cooldownLeft > 0) {
      setError(`Esperá ${cooldownLeft}s antes de pedir otro código.`);
      return;
    }
    setError("");
    setSending(true);
    try {
      const result = await requestEntradasVerifyEmail(normalizedEmail);
      if (result.alreadyVerified) {
        toast.success("Tu mail ya estaba verificado.");
        onVerified?.();
        onClose?.();
        return;
      }
      setCodeSent(true);
      setNextCodeAllowedAt(Date.now() + (result.cooldownSeconds || LINK_RESEND_COOLDOWN_SECONDS) * 1000);
      setMessage("Te enviamos un código de 8 dígitos. Revisá el mail (incluida la carpeta de Spam).");
    } catch (sendError) {
      setError(sendError?.message || "No se pudo enviar el código.");
    } finally {
      setSending(false);
    }
  };

  const handleVerify = async (event) => {
    event.preventDefault();
    setError("");
    if (!/^\d{8}$/.test(otpCode.trim())) {
      setError("El código tiene 8 números.");
      return;
    }
    setVerifying(true);
    try {
      await verifyEntradasEmailCode({
        email: normalizedEmail,
        code: otpCode.trim(),
        app: "entradas",
      });
      toast.success("Mail verificado.");
      onVerified?.();
      onClose?.();
    } catch (verifyError) {
      setError(verifyError?.message || "No se pudo validar el código.");
    } finally {
      setVerifying(false);
    }
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`w-full max-w-md max-h-[min(90vh,40rem)] overflow-y-auto rounded-xl border p-5 sm:p-6 shadow-2xl space-y-4 ${
          isDark ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-white"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entradas-verify-email-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="entradas-verify-email-title"
            className={`text-sm font-bold uppercase tracking-wide ${ui.textStrong}`}
          >
            Verificar mail
          </h2>
          <button type="button" onClick={onClose} className={ui.btnIcon} aria-label="Cerrar">
            <IconX size={18} />
          </button>
        </div>

        <div className={ui.inset}>
          <p className={`text-xs font-bold uppercase tracking-wide ${ui.textSoft}`}>Mail</p>
          <p className={`break-all font-semibold ${ui.textStrong}`}>{normalizedEmail || "—"}</p>
        </div>

        <div className={spamBox} role="note">
          <p className="font-bold mb-1">Revisá Spam / Correo no deseado</p>
          <p>
            El código suele llegar en segundos. Si no lo ves en la bandeja de entrada, abrí{" "}
            <strong>Spam</strong>, <strong>Correo no deseado</strong> o <strong>Promociones</strong>.
            Marcá el mensaje como «No es spam» para que los próximos te lleguen bien.
          </p>
        </div>

        {!codeSent ? (
          <button
            type="button"
            disabled={sending || !normalizedEmail}
            onClick={() => void sendCode()}
            className={ui.btnPrimary}
          >
            {sending ? "Enviando…" : "Enviar código de verificación"}
          </button>
        ) : (
          <form className="space-y-3" onSubmit={handleVerify}>
            <label className={ui.label} htmlFor="entradas-verify-otp">
              Código de 8 dígitos
            </label>
            <input
              id="entradas-verify-otp"
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              value={otpCode}
              onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 8))}
              maxLength={8}
              className={`${ui.input} text-center tracking-[0.35em] font-semibold text-xl`}
              placeholder="••••••••"
            />
            <button
              type="submit"
              disabled={verifying || otpCode.trim().length !== 8}
              className={ui.btnPrimary}
            >
              {verifying ? "Validando…" : "Confirmar código"}
            </button>
            <button
              type="button"
              disabled={sending || cooldownLeft > 0}
              onClick={() => void sendCode()}
              className={`${ui.btnGhost} w-full`}
            >
              {sending
                ? "Enviando…"
                : cooldownLeft > 0
                  ? `Reenviar en ${cooldownLeft}s`
                  : "Reenviar código"}
            </button>
          </form>
        )}

        {error && <div className={errorBox} role="alert">{error}</div>}
        {message && <div className={okBox} role="status">{message}</div>}
      </div>
    </div>,
    document.body,
  );
}
