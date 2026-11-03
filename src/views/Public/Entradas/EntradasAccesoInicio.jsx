import React, { useState } from "react";
import { ENTRADAS_LOGO_URL, entradasUi, useEntradasDarkMode } from "../../../hooks/useEntradasDarkMode";
import { IconArrowLeft } from "../../../components/ui/Icons";
import EntradasLoginCatalogPreview from "../../../components/entradas/EntradasLoginCatalogPreview";
import { startEntradasTicketByEmail } from "../../../services/entradaService";

const REMEMBERED_EMAIL_KEY = "entradas_login_email";

function readRememberedEmail() {
  try {
    return String(localStorage.getItem(REMEMBERED_EMAIL_KEY) || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function rememberEmail(email) {
  try {
    const value = String(email || "").trim().toLowerCase();
    if (value) localStorage.setItem(REMEMBERED_EMAIL_KEY, value);
  } catch {
    /* ignore */
  }
}

/**
 * Puerta de /entradas sin sesión: sacar con mail (sin OTP), o ir al login de gestión.
 */
export default function EntradasAccesoInicio({ bootError = "", onManage, onEntered }) {
  const { isDark } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
  const [step, setStep] = useState("choice");
  const [email, setEmail] = useState(() => readRememberedEmail());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedEmail = email.trim().toLowerCase();
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);

  const inputA11y = `${ui.input} text-base sm:text-lg py-3`;
  const btnPrimaryA11y = `${ui.btnPrimary} text-base sm:text-lg py-3.5`;
  const btnGhostA11y = `${ui.btnGhost} w-full text-base sm:text-lg py-3.5`;
  const hintClass = `text-sm sm:text-base leading-relaxed ${ui.textMuted}`;
  const errorBox = isDark
    ? "rounded-md border border-rose-800 bg-rose-950/50 px-3 py-3 text-sm text-rose-200"
    : "rounded-md border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700";

  const continueWithEmail = async (event) => {
    event.preventDefault();
    setError("");
    if (!emailOk) {
      setError("Escribí un mail válido.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await startEntradasTicketByEmail(normalizedEmail);
      rememberEmail(result.email || normalizedEmail);
      setEmail(result.email || normalizedEmail);
      onEntered?.();
    } catch (submitError) {
      setError(submitError?.message || "No se pudo continuar con ese mail.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`${ui.page} flex flex-col items-center justify-start px-4 py-8 gap-8`}>
      <div className={`w-full max-w-md ${ui.section} p-6 sm:p-8 space-y-5 entradas-card-lift`}>
        {step !== "choice" && (
          <button
            type="button"
            onClick={() => {
              setError("");
              setStep("choice");
            }}
            className={`inline-flex items-center gap-1 text-sm font-semibold ${ui.textSoft}`}
          >
            <IconArrowLeft size={16} />
            Volver
          </button>
        )}

        <div className="text-center space-y-3">
          <h1 className={`${ui.title} text-2xl sm:text-3xl uppercase`}>Entradas</h1>
          <div className={`${ui.logoWrap} mx-auto w-fit`}>
            <img
              src={ENTRADAS_LOGO_URL}
              alt="Orquesta Filarmónica de Río Negro"
              className="h-16 w-auto max-w-[240px] object-contain"
            />
          </div>
          <p className={hintClass}>
            {step === "choice"
              ? "Para sacar una entrada alcanza con tu mail. Para ver o cambiar las que ya tenés, entrá a gestionar."
              : "Escribí el mail con el que querés la entrada. Podés verificarlo después."}
          </p>
        </div>

        {step === "choice" && (
          <div className="space-y-3">
            <button type="button" onClick={() => { setError(""); setStep("email"); }} className={btnPrimaryA11y}>
              Sacar entradas
            </button>
            <button type="button" onClick={onManage} className={btnGhostA11y}>
              Gestionar mis entradas
            </button>
          </div>
        )}

        {step === "email" && (
          <form className="space-y-4" onSubmit={continueWithEmail}>
            <label className={`${ui.label} text-sm`} htmlFor="entradas-sacar-email">
              Tu mail
            </label>
            <input
              id="entradas-sacar-email"
              type="email"
              required
              autoComplete="email"
              autoFocus
              inputMode="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={inputA11y}
              placeholder="tu.mail@dominio.com"
            />
            <button type="submit" disabled={submitting || !normalizedEmail} className={btnPrimaryA11y}>
              {submitting ? "Entrando…" : "Continuar"}
            </button>
          </form>
        )}

        {bootError && <div className={ui.warningBox}>{bootError}</div>}
        {error && <div className={errorBox} role="alert">{error}</div>}
      </div>

      <EntradasLoginCatalogPreview ui={ui} isDark={isDark} />
    </div>
  );
}
