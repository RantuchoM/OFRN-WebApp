import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconHelpCircle, IconMail, IconX } from "../ui/Icons";
import { entradasUi, useEntradasDarkMode } from "../../hooks/useEntradasDarkMode";
import {
  checkEntradasAyudaReservas,
  descargarPdfDesdeReservaRow,
  listarMisReservasActivasParaAyuda,
  reenviarEntradasAyudaReserva,
  sendEntradasAyudaConsulta,
} from "../../services/entradaService";
import { buildEntradasAyudaMailtoHref } from "../../utils/entradasAyudaMailto";
import {
  isValidEntradasAyudaEmail,
  listEntradasConciertosAbiertosPublicos,
} from "../../utils/entradasConciertosAbiertosPublicos";

const emptyForm = {
  nombre: "",
  email: "",
  telefono: "",
  cantidad: "",
  funcionId: "",
  funcion: "",
  comentarios: "",
};

const CANTIDAD_OPTIONS = ["1", "2", "3", "4"];

/**
 * Botón flotante (abajo izquierda) + modal de ayuda.
 * Si el mail ya tiene reservas en conciertos abiertos: aviso + descarga/reenvío;
 * la consulta sigue disponible sin elegir cantidad ni función.
 */
export default function EntradasAyudaFlotante({
  sessionEmail = "",
  onGoGestionar = null,
}) {
  const { isDark } = useEntradasDarkMode();
  const ui = entradasUi(isDark);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [sent, setSent] = useState(false);
  const [funciones, setFunciones] = useState([]);
  const [funcionesLoading, setFuncionesLoading] = useState(false);
  const [reservasAyuda, setReservasAyuda] = useState([]);
  const [reservasChecking, setReservasChecking] = useState(false);
  const [misReservasFull, setMisReservasFull] = useState([]);
  const [busyReservaId, setBusyReservaId] = useState(null);
  const mailtoHref = buildEntradasAyudaMailtoHref();

  const sessionEmailNorm = String(sessionEmail || "").trim().toLowerCase();

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    setFuncionesLoading(true);
    listEntradasConciertosAbiertosPublicos()
      .then((rows) => {
        if (!cancelled) setFunciones(rows);
      })
      .catch(() => {
        if (!cancelled) setFunciones([]);
      })
      .finally(() => {
        if (!cancelled) setFuncionesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !sessionEmailNorm) return undefined;
    let cancelled = false;
    listarMisReservasActivasParaAyuda()
      .then((rows) => {
        if (!cancelled) setMisReservasFull(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!cancelled) setMisReservasFull([]);
      });
    return () => {
      cancelled = true;
    };
  }, [open, sessionEmailNorm]);

  const openConcertIds = useMemo(
    () => new Set(funciones.map((f) => Number(f.id)).filter((n) => Number.isFinite(n) && n > 0)),
    [funciones],
  );

  const reservasEnAbiertos = useMemo(() => {
    if (!openConcertIds.size) return reservasAyuda;
    return reservasAyuda.filter((r) => openConcertIds.has(Number(r.conciertoId)));
  }, [reservasAyuda, openConcertIds]);

  const hasReservasAbiertas = reservasEnAbiertos.length > 0;

  const selectedFuncion = useMemo(
    () => funciones.find((f) => String(f.id) === String(form.funcionId)) || null,
    [funciones, form.funcionId],
  );
  const funcionLlena = Boolean(selectedFuncion?.llena);

  const fabClass =
    "fixed bottom-3 left-3 z-[90] inline-flex max-w-[calc(100vw-6rem)] items-center gap-2 rounded-full border-2 border-[#0e7490] bg-[#1ebbf0] px-3.5 py-2.5 text-sm font-bold text-white shadow-lg hover:bg-[#0ea5d0] hover:border-[#0c4a6e]";
  const mailtoBtnClass =
    "w-full inline-flex items-center justify-center gap-2 rounded-md bg-[#1ebbf0] px-4 py-3.5 text-base sm:text-lg font-bold text-white no-underline shadow-md hover:bg-[#0ea5d0]";
  const submitBtnClass =
    "w-full inline-flex items-center justify-center gap-2 rounded-md border-2 border-[#1ebbf0] bg-transparent px-4 py-3.5 text-base sm:text-lg font-bold text-[#1ebbf0] hover:bg-[#1ebbf0]/10 disabled:opacity-60";
  const secondaryBtnClass =
    "inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-bold disabled:opacity-60";
  const inputClass = `${ui.input} text-base py-3`;
  const selectClass = `${ui.select} w-full text-base py-3`;
  const shellClass = isDark ? "entradas-app entradas-app--dark" : "entradas-app";

  const openModal = () => {
    setError("");
    setEmailError("");
    setSent(false);
    setReservasAyuda([]);
    setBusyReservaId(null);
    const prefill = sessionEmailNorm;
    setForm({
      ...emptyForm,
      email: prefill,
    });
    setOpen(true);
    if (prefill && isValidEntradasAyudaEmail(prefill)) {
      void runCheckReservas(prefill);
    }
  };

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const runCheckReservas = async (emailValue) => {
    const email = String(emailValue || "").trim().toLowerCase();
    if (!isValidEntradasAyudaEmail(email)) {
      setReservasAyuda([]);
      return;
    }
    setReservasChecking(true);
    try {
      const rows = await checkEntradasAyudaReservas(email);
      setReservasAyuda(Array.isArray(rows) ? rows : []);
      if (sessionEmailNorm && sessionEmailNorm === email) {
        try {
          const full = await listarMisReservasActivasParaAyuda();
          setMisReservasFull(Array.isArray(full) ? full : []);
        } catch {
          /* keep previous */
        }
      }
    } catch {
      setReservasAyuda([]);
    } finally {
      setReservasChecking(false);
    }
  };

  const onEmailBlur = () => {
    const value = form.email.trim();
    if (!value) {
      setEmailError("");
      setReservasAyuda([]);
      return;
    }
    const ok = isValidEntradasAyudaEmail(value);
    setEmailError(ok ? "" : "Ingresá un mail con formato válido.");
    if (ok) void runCheckReservas(value);
  };

  const onTelefonoChange = (event) => {
    const digits = event.target.value.replace(/\D/g, "").slice(0, 15);
    setForm((prev) => ({ ...prev, telefono: digits }));
  };

  const onFuncionChange = (event) => {
    const id = event.target.value;
    const row = funciones.find((f) => String(f.id) === String(id));
    setForm((prev) => ({
      ...prev,
      funcionId: id,
      funcion: row?.label || "",
    }));
  };

  const canDownloadPdf = (reservaId) => {
    if (!sessionEmailNorm || sessionEmailNorm !== String(form.email || "").trim().toLowerCase()) {
      return false;
    }
    return misReservasFull.some((r) => Number(r.id) === Number(reservaId));
  };

  const handleDescargar = async (reservaMeta) => {
    setBusyReservaId(reservaMeta.id);
    setError("");
    try {
      const full = misReservasFull.find((r) => Number(r.id) === Number(reservaMeta.id));
      if (full) {
        await descargarPdfDesdeReservaRow(full);
        return;
      }
      await reenviarEntradasAyudaReserva({
        email: form.email,
        reservaId: reservaMeta.id,
      });
      setError("");
      // feedback soft
      window.alert("Te reenviamos las entradas a tu mail. Revisá también Spam / Correo no deseado.");
    } catch (downloadError) {
      setError(downloadError?.message || "No se pudo descargar ni reenviar las entradas.");
    } finally {
      setBusyReservaId(null);
    }
  };

  const handleReenviar = async (reservaMeta) => {
    setBusyReservaId(reservaMeta.id);
    setError("");
    try {
      await reenviarEntradasAyudaReserva({
        email: form.email,
        reservaId: reservaMeta.id,
      });
      window.alert("Te reenviamos las entradas a tu mail. Revisá también Spam / Correo no deseado.");
    } catch (resendError) {
      setError(resendError?.message || "No se pudo reenviar el mail.");
    } finally {
      setBusyReservaId(null);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!isValidEntradasAyudaEmail(form.email)) {
      setEmailError("Ingresá un mail con formato válido.");
      return;
    }
    if (hasReservasAbiertas && !String(form.comentarios || "").trim()) {
      setError("Contanos en comentarios en qué podemos ayudarte.");
      return;
    }
    setEmailError("");
    setSending(true);
    try {
      const skipEntradas = hasReservasAbiertas;
      await sendEntradasAyudaConsulta({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        cantidad: skipEntradas ? "" : form.cantidad,
        funcion: skipEntradas ? "" : form.funcion || selectedFuncion?.label || "",
        conciertoId: skipEntradas ? null : form.funcionId || selectedFuncion?.id || null,
        comentarios: form.comentarios,
      });
      setSent(true);
      setForm(emptyForm);
      setReservasAyuda([]);
    } catch (submitError) {
      setError(submitError?.message || "No se pudo enviar. Probá de nuevo o usá «Enviar correo directo» arriba.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className={`${fabClass} entradas-interactive`}
        onClick={openModal}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <IconHelpCircle size={20} className="shrink-0" />
        <span>¿Necesitás ayuda?</span>
      </button>

      {open
        && createPortal(
          <div
            className={`${shellClass} fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4`}
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
          >
            <div
              className={`w-full max-w-md max-h-[min(92vh,44rem)] overflow-y-auto rounded-xl border p-5 sm:p-6 shadow-2xl space-y-4 ${
                isDark ? "border-slate-700 bg-slate-800" : "border-slate-100 bg-white"
              }`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="entradas-ayuda-modal-title"
              onClick={(event) => event.stopPropagation()}
            >
              {sent ? (
                <div className="space-y-5 py-2" role="status">
                  <div className="flex items-start justify-between gap-3">
                    <h2
                      id="entradas-ayuda-modal-title"
                      className={`text-xl sm:text-2xl font-bold leading-snug ${ui.textStrong}`}
                    >
                      ¡Consulta enviada!
                    </h2>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className={ui.btnIcon}
                      aria-label="Cerrar"
                    >
                      <IconX size={18} />
                    </button>
                  </div>
                  <div
                    className={
                      isDark
                        ? "rounded-xl border-2 border-emerald-700 bg-emerald-950/60 px-5 py-6 space-y-3"
                        : "rounded-xl border-2 border-emerald-300 bg-emerald-50 px-5 py-6 space-y-3"
                    }
                  >
                    <p
                      className={`text-lg sm:text-xl font-bold leading-snug ${
                        isDark ? "text-emerald-100" : "text-emerald-900"
                      }`}
                    >
                      Listo: recibimos tu consulta.
                    </p>
                    <p
                      className={`text-base sm:text-lg leading-relaxed ${
                        isDark ? "text-emerald-200" : "text-emerald-800"
                      }`}
                    >
                      Te enviamos un mail de confirmación a la dirección que indicaste. El equipo
                      te va a responder por ese mismo correo.
                    </p>
                    <p
                      className={`text-sm sm:text-base leading-relaxed ${
                        isDark ? "text-amber-200" : "text-amber-900"
                      }`}
                    >
                      Si no lo ves en la bandeja de entrada, revisá{" "}
                      <strong>Spam</strong> o <strong>Correo no deseado</strong> y marcalo como
                      «No es spam» para que los próximos (códigos o entradas en PDF) te lleguen bien.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className={`${submitBtnClass} entradas-interactive`}
                  >
                    Cerrar
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <h2
                      id="entradas-ayuda-modal-title"
                      className={`text-base sm:text-lg font-bold leading-snug ${ui.textStrong}`}
                    >
                      ¿Necesitás ayuda?
                    </h2>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className={ui.btnIcon}
                      aria-label="Cerrar"
                    >
                      <IconX size={18} />
                    </button>
                  </div>

                  <p className={`text-base leading-relaxed ${ui.textBody}`}>
                    Si no estás pudiendo sacar las entradas, podés escribirnos con el botón de abajo o
                    completar el formulario.
                  </p>

                  <a
                    href={mailtoHref}
                    className={`${mailtoBtnClass} entradas-interactive`}
                  >
                    <IconMail size={20} className="shrink-0" />
                    Enviar correo directo
                  </a>

                  <div className={`border-t pt-4 space-y-3 ${ui.divider}`}>
                    <p className={`text-sm font-semibold ${ui.textSoft}`}>
                      O completá el formulario (te respondemos al mail):
                    </p>

                    <form className="space-y-3" onSubmit={handleSubmit}>
                      <label className={`${ui.label} text-sm`} htmlFor="ayuda-nombre">
                        Nombre completo
                      </label>
                      <input
                        id="ayuda-nombre"
                        required
                        autoComplete="name"
                        value={form.nombre}
                        onChange={onChange("nombre")}
                        className={inputClass}
                        placeholder="Tu nombre y apellido"
                      />

                      <label className={`${ui.label} text-sm`} htmlFor="ayuda-email">
                        Mail
                      </label>
                      <input
                        id="ayuda-email"
                        type="email"
                        required
                        autoComplete="email"
                        inputMode="email"
                        value={form.email}
                        onChange={(event) => {
                          setEmailError("");
                          onChange("email")(event);
                        }}
                        onBlur={onEmailBlur}
                        className={inputClass}
                        placeholder="tu.mail@dominio.com"
                        aria-invalid={Boolean(emailError)}
                      />
                      {emailError && (
                        <p className={`text-sm ${isDark ? "text-rose-300" : "text-rose-700"}`} role="alert">
                          {emailError}
                        </p>
                      )}
                      {reservasChecking && (
                        <p className={`text-sm ${ui.textMuted}`}>Buscando reservas con este mail…</p>
                      )}

                      {hasReservasAbiertas && (
                        <div
                          className={
                            isDark
                              ? "rounded-lg border border-amber-800 bg-amber-950/50 px-3 py-3 space-y-2"
                              : "rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 space-y-2"
                          }
                          role="status"
                        >
                          <p
                            className={`text-sm font-bold ${
                              isDark ? "text-amber-100" : "text-amber-950"
                            }`}
                          >
                            Ya tenés entradas reservadas para{" "}
                            {reservasEnAbiertos.length === 1
                              ? "un concierto abierto"
                              : `${reservasEnAbiertos.length} conciertos abiertos`}
                            .
                          </p>
                          <ul className="space-y-2 list-none p-0 m-0">
                            {reservasEnAbiertos.map((r) => {
                              const busy = busyReservaId === r.id;
                              const canPdf = canDownloadPdf(r.id);
                              return (
                                <li
                                  key={r.id}
                                  className={
                                    isDark
                                      ? "rounded-md border border-slate-600 bg-slate-900/50 px-3 py-2 space-y-2"
                                      : "rounded-md border border-amber-100 bg-white px-3 py-2 space-y-2"
                                  }
                                >
                                  <p className={`text-sm font-semibold leading-snug ${ui.textStrong}`}>
                                    {r.label}
                                  </p>
                                  <p className={`text-xs ${ui.textMuted}`}>
                                    {r.cantidadLabel}
                                    {r.codigo ? ` · ${r.codigo}` : ""}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {canPdf ? (
                                      <button
                                        type="button"
                                        disabled={busy}
                                        className={`${secondaryBtnClass} ${
                                          isDark
                                            ? "border-sky-700 text-sky-200 hover:bg-sky-950"
                                            : "border-sky-300 text-sky-800 hover:bg-sky-50"
                                        }`}
                                        onClick={() => void handleDescargar(r)}
                                      >
                                        {busy ? "…" : "Descargar PDF"}
                                      </button>
                                    ) : null}
                                    <button
                                      type="button"
                                      disabled={busy}
                                      className={`${secondaryBtnClass} ${
                                        isDark
                                          ? "border-slate-500 text-slate-200 hover:bg-slate-800"
                                          : "border-slate-300 text-slate-700 hover:bg-slate-50"
                                      }`}
                                      onClick={() => void handleReenviar(r)}
                                    >
                                      {busy ? "…" : "Reenviar al mail"}
                                    </button>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                          {typeof onGoGestionar === "function" ? (
                            <button
                              type="button"
                              className={`text-sm font-semibold underline ${
                                isDark ? "text-sky-300" : "text-sky-800"
                              }`}
                              onClick={() => {
                                setOpen(false);
                                onGoGestionar(String(form.email || "").trim());
                              }}
                            >
                              Ir a Gestionar mis entradas
                            </button>
                          ) : null}
                          <p className={`text-sm leading-relaxed ${isDark ? "text-amber-100" : "text-amber-900"}`}>
                            Si igual necesitás escribirnos, podés enviar la consulta abajo{" "}
                            <strong>sin pedir entradas nuevas</strong> (solo contanos qué te pasa).
                          </p>
                        </div>
                      )}

                      <label className={`${ui.label} text-sm`} htmlFor="ayuda-telefono">
                        Teléfono{" "}
                        <span className={`font-normal normal-case tracking-normal ${ui.textMuted}`}>
                          (opcional)
                        </span>
                      </label>
                      <input
                        id="ayuda-telefono"
                        type="tel"
                        autoComplete="tel"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={form.telefono}
                        onChange={onTelefonoChange}
                        className={inputClass}
                        placeholder="Solo números"
                      />

                      {!hasReservasAbiertas && (
                        <>
                          <label className={`${ui.label} text-sm`} htmlFor="ayuda-cantidad">
                            Cantidad de entradas
                          </label>
                          <select
                            id="ayuda-cantidad"
                            value={form.cantidad}
                            onChange={onChange("cantidad")}
                            className={selectClass}
                          >
                            <option value="">Elegí cantidad</option>
                            {CANTIDAD_OPTIONS.map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>

                          <label className={`${ui.label} text-sm`} htmlFor="ayuda-funcion">
                            Función
                          </label>
                          <select
                            id="ayuda-funcion"
                            value={form.funcionId}
                            onChange={onFuncionChange}
                            className={selectClass}
                            disabled={funcionesLoading}
                          >
                            <option value="">
                              {funcionesLoading ? "Cargando funciones…" : "Elegí una función"}
                            </option>
                            {funciones.map((f) => (
                              <option key={f.id} value={String(f.id)}>
                                {f.label}
                              </option>
                            ))}
                          </select>
                          {funcionLlena && (
                            <p
                              className={
                                isDark
                                  ? "rounded-md border border-amber-800 bg-amber-950/50 px-3 py-2 text-sm text-amber-200"
                                  : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800"
                              }
                              role="status"
                            >
                              Esta función ya está llena, pero igualmente responderemos tu consulta.
                            </p>
                          )}
                          {!funcionesLoading && funciones.length === 0 && (
                            <p className={`text-sm ${ui.textMuted}`}>
                              No hay funciones abiertas en este momento. Igual podés enviar la consulta.
                            </p>
                          )}
                        </>
                      )}

                      <label className={`${ui.label} text-sm`} htmlFor="ayuda-comentarios">
                        {hasReservasAbiertas ? "¿En qué te ayudamos?" : "Otros comentarios"}
                      </label>
                      <textarea
                        id="ayuda-comentarios"
                        rows={3}
                        required={hasReservasAbiertas}
                        value={form.comentarios}
                        onChange={onChange("comentarios")}
                        className={`${inputClass} resize-y min-h-[5rem]`}
                        placeholder={
                          hasReservasAbiertas
                            ? "Ej. no me llega el mail, necesito cambiar cantidad…"
                            : "Contanos qué te está pasando"
                        }
                      />

                      <input
                        type="text"
                        name="website"
                        tabIndex={-1}
                        autoComplete="off"
                        aria-hidden="true"
                        className="hidden"
                        value=""
                        readOnly
                      />

                      {error && (
                        <div
                          className={
                            isDark
                              ? "rounded-md border border-rose-800 bg-rose-950/50 px-3 py-2 text-sm text-rose-200"
                              : "rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
                          }
                          role="alert"
                        >
                          {error}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={sending || Boolean(emailError)}
                        className={`${submitBtnClass} entradas-interactive`}
                      >
                        {sending ? "Enviando…" : "Enviar consulta"}
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
