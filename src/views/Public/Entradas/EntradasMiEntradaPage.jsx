import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import "../../../styles/entradas-filarmonica.css";
import MisReservasQrPanel from "../../../components/entradas/MisReservasQrPanel";
import { entradasUi, useEntradasDarkMode } from "../../../hooks/useEntradasDarkMode";
import {
  descargarPdfDesdeReservaRow,
  fetchEntradaPdfSharePayload,
  getEntradasSessionProfile,
  lookupMiEntradaPdfByEmail,
} from "../../../services/entradaService";
import {
  fechaHoraDesdeConciertoEntrada,
  lugarNombreDesdeConciertoEntrada,
} from "../../../utils/entradasConciertoEvento";
import { formatEntradasConciertoFechaHora } from "../../../utils/entradasReservaCopy";

/**
 * /entradas/mi-entrada?concierto=<slug>
 * Del recordatorio BCC: mail → QR en pantalla (móvil) + PDF opcional, sin login.
 * Si ya hay sesión de Entradas, abre directo con el mail de la sesión.
 */
export default function EntradasMiEntradaPage() {
  const { isDark } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
  const [searchParams] = useSearchParams();
  const slug = String(searchParams.get("concierto") || searchParams.get("c") || "").trim();

  const [email, setEmail] = useState("");
  const [sessionBoot, setSessionBoot] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reserva, setReserva] = useState(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [autoError, setAutoError] = useState("");

  const abrirConMail = useCallback(
    async (mailRaw, { silent = false } = {}) => {
      const mail = String(mailRaw || "").trim().toLowerCase();
      if (!mail) {
        if (!silent) toast.error("Escribí el mail con el que sacaste la entrada.");
        return false;
      }

      setSubmitting(true);
      setAutoError("");
      try {
        const result = await lookupMiEntradaPdfByEmail({ email: mail, slug: slug || null });
        if (!result?.ok || !result?.token) {
          const msg = result?.error || "No encontramos tu entrada.";
          if (silent) setAutoError(msg);
          else toast.error(msg);
          return false;
        }
        const payload = await fetchEntradaPdfSharePayload(result.token);
        setReserva(payload);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return true;
      } catch (error) {
        const msg = error?.message || "No pudimos abrir tu entrada. Probá de nuevo.";
        if (silent) setAutoError(msg);
        else toast.error(msg);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [slug],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSessionBoot(true);
      try {
        const sessionPayload = await getEntradasSessionProfile().catch(() => ({
          session: null,
          profile: null,
        }));
        if (cancelled) return;
        const mailSesion =
          sessionPayload?.profile?.email || sessionPayload?.session?.user?.email || "";
        const mail = String(mailSesion || "").trim().toLowerCase();
        if (mail) {
          setEmail(mail);
          await abrirConMail(mail, { silent: true });
        }
      } catch {
        /* silencioso */
      } finally {
        if (!cancelled) setSessionBoot(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [abrirConMail]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    await abrirConMail(email, { silent: false });
  };

  const handleDescargarPdf = async () => {
    if (!reserva || pdfBusy) return;
    setPdfBusy(true);
    try {
      await descargarPdfDesdeReservaRow(reserva);
      toast.success("PDF descargado.");
    } catch (error) {
      toast.error(error?.message || "No se pudo descargar el PDF.");
    } finally {
      setPdfBusy(false);
    }
  };

  const concierto = reserva?.concierto;
  const fechaTexto = formatEntradasConciertoFechaHora(fechaHoraDesdeConciertoEntrada(concierto));
  const lugar = lugarNombreDesdeConciertoEntrada(concierto);
  const showingBoot = sessionBoot || (submitting && !reserva && !autoError);

  return (
    <div className={`${ui.page} min-h-screen`}>
      <header className={`${ui.header} px-4 py-3`}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <p className={`text-sm font-bold ${ui.textStrong}`}>Entradas · Mi entrada</p>
          <Link to="/entradas" className={`text-xs font-bold ${ui.accentEyebrow} hover:underline`}>
            Ir a entradas
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 pb-10">
        {reserva ? (
          <div className="space-y-5">
            <div className={`${ui.section} p-5 space-y-2 text-center`}>
              <p className={ui.accentEyebrow}>Tu entrada</p>
              <h1 className={`${ui.title} text-xl sm:text-2xl leading-tight`}>
                {concierto?.nombre || "Concierto"}
              </h1>
              <p className={`text-base font-semibold ${ui.textStrong}`}>{fechaTexto}</p>
              {lugar ? <p className={`text-sm ${ui.textMuted}`}>{lugar}</p> : null}
              <p className={`text-lg font-mono font-bold tracking-wide pt-1 ${ui.textStrong}`}>
                {reserva.codigo_reserva}
              </p>
              <p className={`text-xs ${ui.textMuted}`}>
                Mostrá el QR en puerta. Podés agrandar la pantalla o bajar el brillo si hace falta.
              </p>
            </div>

            <div
              className={`rounded-2xl border p-4 sm:p-5 ${
                isDark ? "border-slate-600 bg-white" : "border-slate-200 bg-white shadow-md"
              }`}
            >
              <MisReservasQrPanel reserva={reserva} isDark={false} variant="door" />
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => void handleDescargarPdf()}
                className={`${ui.btnPrimary} w-full text-base py-3`}
                disabled={pdfBusy}
              >
                {pdfBusy ? "Preparando PDF…" : "Descargar PDF"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setReserva(null);
                  setAutoError("");
                }}
                className={`${ui.btnGhost} w-full text-sm`}
              >
                Buscar con otro mail
              </button>
            </div>
          </div>
        ) : showingBoot ? (
          <div className={`${ui.section} p-6 space-y-3 text-center`}>
            <p className={`text-base ${ui.textBody}`}>Abriendo tu entrada…</p>
            <p className={`text-sm ${ui.textMuted}`}>Un momento.</p>
          </div>
        ) : (
          <div className={`${ui.section} p-6 space-y-5`}>
            <h1 className={`${ui.title} text-2xl sm:text-3xl leading-tight`}>
              Escribí el mail con el que sacaste la entrada
            </h1>
            <p className={`text-base leading-relaxed ${ui.textBody}`}>
              No hace falta contraseña. Te mostramos el QR en el celular y, si querés, el PDF.
            </p>
            {autoError ? (
              <p className={`text-sm ${isDark ? "text-rose-300" : "text-rose-700"}`}>{autoError}</p>
            ) : null}
            {!slug ? (
              <p className={`text-sm ${ui.textMuted}`}>
                Si tenés más de una entrada activa, usá el enlace del mail de recordatorio del
                concierto.
              </p>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <label className={`${ui.label} text-base`} htmlFor="mi-entrada-email">
                Tu mail
              </label>
              <input
                id="mi-entrada-email"
                type="email"
                autoComplete="email"
                inputMode="email"
                className={`${ui.input} text-lg py-3`}
                placeholder="nombre@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
                autoFocus
              />
              <button
                type="submit"
                className={`${ui.btnPrimary} w-full text-lg py-3`}
                disabled={submitting}
              >
                {submitting ? "Buscando…" : "Ver mi entrada"}
              </button>
            </form>

            <p className={`text-sm ${ui.textMuted}`}>
              ¿Preferís entrar con sesión?{" "}
              <Link to="/entradas?view=mis-reservas" className="font-bold entradas-accent-text">
                Mis entradas
              </Link>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
