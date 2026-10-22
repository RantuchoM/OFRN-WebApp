import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconHelpCircle, IconMail, IconX } from "../ui/Icons";
import { entradasUi, useEntradasDarkMode } from "../../hooks/useEntradasDarkMode";
import { sendEntradasAyudaConsulta } from "../../services/entradaService";
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
 * Botón flotante (arriba izquierda) + modal de ayuda.
 * Mailto arriba; formulario web (Edge Function + Reply-To) abajo.
 */
export default function EntradasAyudaFlotante() {
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
  const mailtoHref = buildEntradasAyudaMailtoHref();

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
  const inputClass = `${ui.input} text-base py-3`;
  const selectClass = `${ui.select} w-full text-base py-3`;
  const shellClass = isDark ? "entradas-app entradas-app--dark" : "entradas-app";

  const openModal = () => {
    setError("");
    setEmailError("");
    setSent(false);
    setOpen(true);
  };

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const onEmailBlur = () => {
    const value = form.email.trim();
    if (!value) {
      setEmailError("");
      return;
    }
    setEmailError(isValidEntradasAyudaEmail(value) ? "" : "Ingresá un mail con formato válido.");
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!isValidEntradasAyudaEmail(form.email)) {
      setEmailError("Ingresá un mail con formato válido.");
      return;
    }
    setEmailError("");
    setSending(true);
    try {
      await sendEntradasAyudaConsulta({
        nombre: form.nombre,
        email: form.email,
        telefono: form.telefono,
        cantidad: form.cantidad,
        funcion: form.funcion || selectedFuncion?.label || "",
        comentarios: form.comentarios,
      });
      setSent(true);
      setForm(emptyForm);
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
                      Te vamos a responder al mail que indicaste. No hace falta hacer nada más:
                      quedate tranquila/o, ya está en camino.
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

                      <label className={`${ui.label} text-sm`} htmlFor="ayuda-comentarios">
                        Otros comentarios
                      </label>
                      <textarea
                        id="ayuda-comentarios"
                        rows={3}
                        value={form.comentarios}
                        onChange={onChange("comentarios")}
                        className={`${inputClass} resize-y min-h-[5rem]`}
                        placeholder="Contanos qué te está pasando"
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
