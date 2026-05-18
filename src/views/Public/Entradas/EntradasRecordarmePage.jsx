import React, { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import "../../../styles/entradas-filarmonica.css";
import { entradasUi, useEntradasDarkMode } from "../../../hooks/useEntradasDarkMode";
import {
  consultarRecordatorioApertura,
  getEntradasSessionProfile,
  getRecordatorioAperturaInfo,
  suscribirRecordatorioApertura,
} from "../../../services/entradaService";
import { formatEntradasConciertoFechaHora } from "../../../utils/entradasReservaCopy";

export default function EntradasRecordarmePage() {
  const { isDark } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
  const [searchParams] = useSearchParams();
  const slug = String(searchParams.get("concierto") || "").trim();

  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [suscrito, setSuscrito] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [yaEstaba, setYaEstaba] = useState(false);

  const refreshEstado = useCallback(
    async (mail) => {
      if (!slug || !mail?.trim()) return;
      try {
        const payload = await consultarRecordatorioApertura({ slug, email: mail });
        if (payload?.ok) setSuscrito(Boolean(payload.suscrito));
      } catch {
        /* silencioso al tipear */
      }
    },
    [slug],
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setLoadError("");
      setDone(false);
      setYaEstaba(false);

      if (!slug) {
        setLoadError("Falta el concierto en el enlace.");
        setLoading(false);
        return;
      }

      try {
        const [payload, sessionPayload] = await Promise.all([
          getRecordatorioAperturaInfo(slug),
          getEntradasSessionProfile().catch(() => ({ session: null, profile: null })),
        ]);
        if (cancelled) return;

        if (!payload?.ok) {
          setLoadError(payload?.error || "No encontramos ese concierto.");
          setInfo(null);
          return;
        }

        setInfo(payload);
        const mailSesion =
          sessionPayload?.profile?.email || sessionPayload?.session?.user?.email || "";
        const mail = String(mailSesion || "").trim().toLowerCase();
        if (mail) {
          setEmail(mail);
          const conMail = await consultarRecordatorioApertura({ slug, email: mail });
          if (!cancelled && conMail?.ok) setSuscrito(Boolean(conMail.suscrito));
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error?.message || "No pudimos cargar el concierto.");
          setInfo(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!slug || !email.trim() || loading || done) return;
    const t = window.setTimeout(() => refreshEstado(email), 400);
    return () => window.clearTimeout(t);
  }, [slug, email, loading, done, refreshEstado]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!slug || !info?.elegible) return;
    const mail = email.trim().toLowerCase();
    if (!mail) {
      toast.error("Poné tu mail para avisarte.");
      return;
    }

    setSubmitting(true);
    try {
      const result = await suscribirRecordatorioApertura({ slug, email: mail });
      setYaEstaba(Boolean(result?.ya_estaba));
      setSuscrito(true);
      setDone(true);
    } catch (error) {
      toast.error(error?.message || "No pudimos anotarte. Probá de nuevo.");
    } finally {
      setSubmitting(false);
    }
  };

  const concierto = info?.concierto;

  return (
    <div className={`${ui.page} min-h-screen`}>
      <header className={`${ui.header} px-4 py-3`}>
        <div className="max-w-lg mx-auto flex items-center justify-between gap-3">
          <p className={`text-sm font-bold ${ui.textStrong}`}>Entradas · Recordatorio</p>
          <Link to="/entradas" className={`text-xs font-bold ${ui.accentEyebrow} hover:underline`}>
            Ir a entradas
          </Link>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {loading && (
          <p className={`text-sm ${ui.textMuted}`}>Un segundito, estamos cargando…</p>
        )}

        {!loading && loadError && (
          <div className={`${ui.section} p-4 space-y-3`}>
            <p className={`text-sm ${ui.textBody}`}>{loadError}</p>
            <Link to="/entradas" className="inline-block text-sm font-bold entradas-accent-text">
              Volver al catálogo
            </Link>
          </div>
        )}

        {!loading && !loadError && info && !info.elegible && (
          <div className={`${ui.section} p-4 space-y-3`}>
            <h1 className={ui.title}>Ya podés sacar entradas</h1>
            <p className={`text-sm ${ui.textBody}`}>
              Para <strong className={ui.textStrong}>{concierto?.nombre}</strong> las reservas ya están
              habilitadas. No hace falta que te anotes al recordatorio.
            </p>
            <Link
              to={`/entradas?view=catalogo&concierto=${encodeURIComponent(slug)}`}
              className={`${ui.btnPrimary} inline-block text-center`}
            >
              Ver concierto y reservar
            </Link>
          </div>
        )}

        {!loading && !loadError && info?.elegible && done && (
          <div className={`${ui.section} p-5 space-y-4 text-center`}>
            <p className={ui.accentEyebrow}>¡Listo!</p>
            <h1 className={ui.title}>
              {yaEstaba ? "Ya estabas anotado/a" : "Te vamos a avisar"}
            </h1>
            <p className={`text-sm ${ui.textBody}`}>
              {yaEstaba ? (
                <>
                  Tu mail <strong>{email}</strong> ya estaba en la lista para{" "}
                  <strong className={ui.textStrong}>{concierto?.nombre}</strong>. Cuando abra la
                  reserva te escribimos por ahí.
                </>
              ) : (
                <>
                  Apenas se habiliten las entradas para{" "}
                  <strong className={ui.textStrong}>{concierto?.nombre}</strong>, te mandamos un mail a{" "}
                  <strong>{email}</strong>. No tenés que hacer nada más.
                </>
              )}
            </p>
            <p className={`text-xs ${ui.textMuted}`}>
              Si el mail no llega, revisá spam o promociones.
            </p>
            <Link to="/entradas" className={`${ui.btnGhost} inline-block`}>
              Volver a entradas
            </Link>
          </div>
        )}

        {!loading && !loadError && info?.elegible && !done && (
          <div className={`${ui.section} p-5 space-y-4`}>
            <p className={ui.accentEyebrow}>Todavía no abrió la reserva</p>
            <h1 className={ui.title}>Avisame cuando pueda sacar entrada</h1>
            <div className="space-y-1">
              <p className={`text-lg font-bold ${ui.textStrong}`}>{concierto?.nombre}</p>
              {info.programa_nombre && (
                <p className={`text-xs ${ui.textMuted}`}>{info.programa_nombre}</p>
              )}
              <p className={`text-sm ${ui.textSoft}`}>
                {formatEntradasConciertoFechaHora(concierto?.fecha_hora)}
              </p>
              {concierto?.lugar_nombre && (
                <p className={`text-xs ${ui.textMuted}`}>{concierto.lugar_nombre}</p>
              )}
            </div>
            <p className={`text-sm ${ui.textBody}`}>
              Dejá tu mail y te escribimos cuando se habiliten las entradas para este concierto.
            </p>

            {suscrito && (
              <p className={ui.warningBox}>
                Con este mail ya estás anotado/a.
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <label className={ui.label} htmlFor="recordarme-email">
                Tu mail
              </label>
              <input
                id="recordarme-email"
                type="email"
                autoComplete="email"
                className={ui.input}
                placeholder="nombre@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
              <button type="submit" className={ui.btnPrimary} disabled={submitting}>
                {submitting ? "Anotándote…" : "Recordarme"}
              </button>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
