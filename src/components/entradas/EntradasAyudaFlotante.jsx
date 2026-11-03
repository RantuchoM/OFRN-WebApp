import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MisReservasQrModal from "./MisReservasQrModal";
import { IconCheck, IconHelpCircle, IconMail, IconX } from "../ui/Icons";
import { entradasUi, useEntradasDarkMode } from "../../hooks/useEntradasDarkMode";
import {
  abrirEntradaAyudaPorEmail,
  buildPdfBlobDesdeReservaRow,
  cambiarFuncionReservaVerificada,
  cancelarReservaVerificada,
  checkEntradasAyudaReservas,
  descargarPdfDesdeReservaRow,
  enviarMailCancelacionReserva,
  listarMisReservasActivasParaAyuda,
  reenviarEntradasAyudaReserva,
  requestEntradasEmailCode,
  sendEntradasAyudaConsulta,
  sendEntradasAyudaPedido,
  verifyEntradasEmailCode,
} from "../../services/entradaService";
import { canShareFiles } from "../../utils/downloadBlob";
import { buildEntradasAyudaMailtoHref } from "../../utils/entradasAyudaMailto";
import {
  isValidEntradasAyudaEmail,
  listEntradasConciertosAbiertosPublicos,
} from "../../utils/entradasConciertosAbiertosPublicos";
import {
  buildEntradasPdfShareUrl,
  formatDiaHoraWhatsAppEntradas,
  normalizePhoneForWhatsApp,
} from "../../utils/entradasWhatsApp";
import {
  fechaHoraDesdeConciertoEntrada,
  lugarNombreDesdeConciertoEntrada,
} from "../../utils/entradasConciertoEvento";

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
 * El mail va primero. Mientras completa el resto, se busca una entrada vigente.
 * Si aparece: descarga y envío primero; cancelar o cambiar de función se hace
 * con un código al mail, o queda como pedido para que terceros lo acepte.
 */
export default function EntradasAyudaFlotante({
  sessionEmail = "",
  onGoGestionar = null,
  onSessionVerified = null,
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
  const [reservasEmail, setReservasEmail] = useState("");
  const [reservasChecking, setReservasChecking] = useState(false);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [gestion, setGestion] = useState(null);
  const [misReservasFull, setMisReservasFull] = useState([]);
  const [busyReservaId, setBusyReservaId] = useState(null);
  const [qrModalReserva, setQrModalReserva] = useState(null);
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

  const emailNorm = String(form.email || "").trim().toLowerCase();
  const reservasVigentes = reservasEmail === emailNorm ? reservasAyuda : [];
  const hasReservasVigentes = reservasVigentes.length > 0;
  const mailVerificadoAca = verifiedEmail !== "" && verifiedEmail === emailNorm;

  const selectedFuncion = useMemo(
    () => funciones.find((f) => String(f.id) === String(form.funcionId)) || null,
    [funciones, form.funcionId],
  );
  const funcionLlena = Boolean(selectedFuncion?.llena);

  const fabClass =
    "entradas-ayuda-fab fixed bottom-3 left-3 z-[90] inline-flex max-w-[calc(100vw-6rem)] items-center rounded-full border-2 border-[#0e7490] bg-[#1ebbf0] py-2.5 text-sm font-bold text-white shadow-lg hover:bg-[#0ea5d0] hover:border-[#0c4a6e]";
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
    setReservasEmail("");
    setGestion(null);
    setBusyReservaId(null);
    const prefill = sessionEmailNorm;
    setForm({
      ...emptyForm,
      email: prefill,
    });
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return undefined;
    const email = String(form.email || "").trim().toLowerCase();
    if (!isValidEntradasAyudaEmail(email)) {
      setReservasAyuda([]);
      setReservasEmail("");
      setReservasChecking(false);
      return undefined;
    }
    let cancelled = false;
    setReservasChecking(true);
    const timer = window.setTimeout(() => {
      checkEntradasAyudaReservas(email)
        .then(async (rows) => {
          if (cancelled) return;
          setReservasAyuda(Array.isArray(rows) ? rows : []);
          setReservasEmail(email);
          if (sessionEmailNorm && sessionEmailNorm === email) {
            try {
              const full = await listarMisReservasActivasParaAyuda();
              if (!cancelled) setMisReservasFull(Array.isArray(full) ? full : []);
            } catch {
              /* keep previous */
            }
          }
        })
        .catch(() => {
          if (cancelled) return;
          setReservasAyuda([]);
          setReservasEmail(email);
        })
        .finally(() => {
          if (!cancelled) setReservasChecking(false);
        });
    }, 450);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [open, form.email, sessionEmailNorm]);

  const onChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const runCheckReservas = async (emailValue) => {
    const email = String(emailValue || "").trim().toLowerCase();
    if (!isValidEntradasAyudaEmail(email)) {
      setReservasAyuda([]);
      setReservasEmail("");
      return;
    }
    setReservasChecking(true);
    try {
      const rows = await checkEntradasAyudaReservas(email);
      setReservasAyuda(Array.isArray(rows) ? rows : []);
      setReservasEmail(email);
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
      setReservasEmail(email);
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
    // Permite + y espacios al tipear; guardamos solo dígitos (máx. razonable).
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

  const resolveReservaPayload = async (reservaMeta) => {
    const full = misReservasFull.find((r) => Number(r.id) === Number(reservaMeta.id));
    if (full) return { reserva: full, token: null };
    const opened = await abrirEntradaAyudaPorEmail({
      email: form.email,
      reservaId: reservaMeta.id,
    });
    return { reserva: opened.reserva, token: opened.token };
  };

  const handleDescargar = async (reservaMeta) => {
    setBusyReservaId(reservaMeta.id);
    setError("");
    try {
      const { reserva } = await resolveReservaPayload(reservaMeta);
      await descargarPdfDesdeReservaRow(reserva);
    } catch (downloadError) {
      setError(downloadError?.message || "No se pudo descargar el PDF.");
    } finally {
      setBusyReservaId(null);
    }
  };

  const handleVerQr = async (reservaMeta) => {
    setBusyReservaId(reservaMeta.id);
    setError("");
    try {
      const { reserva } = await resolveReservaPayload(reservaMeta);
      setQrModalReserva(reserva);
    } catch (qrError) {
      setError(qrError?.message || "No se pudo abrir el QR.");
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

  /**
   * Backup personal: si el celular permite compartir archivos, abre la hoja nativa
   * (WhatsApp / contactos) con el PDF. Si no, abre WhatsApp con el link de descarga.
   * WhatsApp no permite adjuntar un archivo vía URL; solo link o Share API.
   */
  const handleCompartirWhatsApp = async (reservaMeta) => {
    setBusyReservaId(reservaMeta.id);
    setError("");
    try {
      const { reserva, token } = await resolveReservaPayload(reservaMeta);
      const { blob, filename } = await buildPdfBlobDesdeReservaRow(reserva);
      const file = new File([blob], filename || "entradas-OFRN.pdf", {
        type: blob.type || "application/pdf",
      });

      if (canShareFiles(file)) {
        try {
          await navigator.share({
            files: [file],
            title: filename || "Entradas OFRN",
            text: "Te paso el PDF de mis entradas OFRN.",
          });
          return;
        } catch (shareErr) {
          if (shareErr?.name === "AbortError") return;
          /* fallback a link */
        }
      }

      let pdfUrl = token ? buildEntradasPdfShareUrl(token) : null;
      if (!pdfUrl) {
        const opened = await abrirEntradaAyudaPorEmail({
          email: form.email,
          reservaId: reservaMeta.id,
        });
        pdfUrl = buildEntradasPdfShareUrl(opened.token);
      }
      if (!pdfUrl) {
        throw new Error("No se pudo armar el enlace del PDF para WhatsApp.");
      }

      const cuando = formatDiaHoraWhatsAppEntradas(
        reserva?.concierto?.fecha_hora || fechaHoraDesdeConciertoEntrada(reserva?.concierto),
      );
      const lugar = String(lugarNombreDesdeConciertoEntrada(reserva?.concierto) || "").trim();
      const detalles = [
        reserva?.concierto?.nombre || reservaMeta.label || "Entradas OFRN",
        cuando.dia && cuando.hora ? `${cuando.dia} · ${cuando.hora}` : (cuando.dia || ""),
        lugar,
        reservaMeta.codigo ? `Código ${reservaMeta.codigo}` : "",
      ].filter(Boolean);
      const text = [
        "Hola, te paso el PDF de mis entradas OFRN como respaldo.",
        "",
        ...detalles,
        "",
        "Descargá el PDF acá (no hace falta iniciar sesión):",
        pdfUrl,
      ].join("\n");

      const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
      window.open(waUrl, "_blank", "noopener,noreferrer");
    } catch (shareError) {
      setError(shareError?.message || "No se pudo preparar el PDF para WhatsApp.");
    } finally {
      setBusyReservaId(null);
    }
  };

  const funcionesParaCambio = (reserva) =>
    funciones.filter(
      (f) => !f.llena && Number(f.id) !== Number(reserva?.conciertoId),
    );

  const aplicarGestionVerificada = async (reserva, modo, destinoId) => {
    if (modo === "cancelar") {
      await cancelarReservaVerificada(reserva.id);
      try {
        await enviarMailCancelacionReserva({ reservaId: reserva.id });
      } catch {
        /* la cancelación ya quedó */
      }
      return "Listo: cancelamos tu entrada.";
    }
    await cambiarFuncionReservaVerificada(reserva.id, destinoId);
    try {
      await reenviarEntradasAyudaReserva({
        email: emailNorm,
        reservaId: reserva.id,
      });
    } catch {
      /* el cambio ya quedó */
    }
    return "Listo: cambiamos tu función y te reenviamos el mail con el PDF.";
  };

  const empezarVosMismo = async (reserva, modo, destinoId) => {
    setError("");
    if (modo === "cambiar" && !destinoId) {
      setGestion({
        reservaId: reserva.id,
        modo,
        paso: "elegir",
        destinoId: "",
        code: "",
        busy: false,
        error: "Elegí la función a la que querés pasar.",
        info: "",
      });
      return;
    }
    if (mailVerificadoAca) {
      setGestion({
        reservaId: reserva.id,
        modo,
        paso: "elegir",
        destinoId: destinoId || "",
        code: "",
        busy: true,
        error: "",
        info: "",
      });
      try {
        const info = await aplicarGestionVerificada(reserva, modo, destinoId);
        setGestion({
          reservaId: reserva.id,
          modo,
          paso: "hecho",
          destinoId: destinoId || "",
          code: "",
          busy: false,
          error: "",
          info,
        });
        void runCheckReservas(emailNorm);
      } catch (applyError) {
        setGestion((prev) => prev && ({
          ...prev,
          busy: false,
          error: applyError?.message || "No se pudo aplicar el cambio.",
        }));
      }
      return;
    }
    setGestion({
      reservaId: reserva.id,
      modo,
      paso: "codigo",
      destinoId: destinoId || "",
      code: "",
      busy: true,
      error: "",
      info: "",
    });
    try {
      await requestEntradasEmailCode(emailNorm);
      setGestion((prev) => prev && ({
        ...prev,
        busy: false,
        info: "Te mandamos un código de 8 dígitos a este mail. Revisá también Spam o Correo no deseado.",
      }));
    } catch (codeError) {
      setGestion((prev) => prev && ({
        ...prev,
        busy: false,
        error: codeError?.message || "No se pudo enviar el código.",
      }));
    }
  };

  const confirmarCodigoGestion = async (reserva) => {
    const code = String(gestion?.code || "").trim();
    if (!/^\d{8}$/.test(code)) {
      setGestion((prev) => prev && ({ ...prev, error: "El código tiene 8 dígitos." }));
      return;
    }
    setGestion((prev) => prev && ({ ...prev, busy: true, error: "" }));
    try {
      await verifyEntradasEmailCode({ email: emailNorm, code });
      setVerifiedEmail(emailNorm);
      onSessionVerified?.();
      const info = await aplicarGestionVerificada(reserva, gestion.modo, gestion.destinoId);
      setGestion((prev) => prev && ({ ...prev, busy: false, paso: "hecho", info }));
      void runCheckReservas(emailNorm);
    } catch (verifyError) {
      setGestion((prev) => prev && ({
        ...prev,
        busy: false,
        error: verifyError?.message || "No se pudo verificar el código.",
      }));
    }
  };

  const enviarPedidoGestion = async (reserva, modo, destinoId) => {
    if (modo === "cambiar" && !destinoId) {
      setGestion({
        reservaId: reserva.id,
        modo,
        paso: "elegir",
        destinoId: "",
        code: "",
        busy: false,
        error: "Elegí la función a la que querés pasar.",
        info: "",
      });
      return;
    }
    const destino = funciones.find((f) => String(f.id) === String(destinoId));
    setGestion({
      reservaId: reserva.id,
      modo,
      paso: "elegir",
      destinoId: destinoId || "",
      code: "",
      busy: true,
      error: "",
      info: "",
    });
    try {
      const telNorm =
        normalizePhoneForWhatsApp(form.telefono)
        || String(form.telefono || "").replace(/\D/g, "");
      await sendEntradasAyudaPedido({
        nombre: form.nombre,
        email: emailNorm,
        telefono: telNorm,
        cantidad: reserva.cantidad,
        funcion: modo === "cambiar" ? (destino?.label || "") : (reserva.label || ""),
        conciertoId: modo === "cambiar" ? destinoId : reserva.conciertoId,
        comentarios: form.comentarios,
        pedido: modo === "cancelar" ? "cancelar" : "cambiar_funcion",
        reservaPedidoId: reserva.id,
        conciertoDestinoId: modo === "cambiar" ? destinoId : null,
      });
      setGestion({
        reservaId: reserva.id,
        modo,
        paso: "hecho",
        destinoId: destinoId || "",
        code: "",
        busy: false,
        error: "",
        info: modo === "cancelar"
          ? "Enviamos la solicitud de cancelación. El equipo puede aceptarla."
          : "Enviamos la solicitud de cambio. El equipo puede aceptarla si hay lugar.",
      });
    } catch (pedidoError) {
      setGestion((prev) => prev && ({
        ...prev,
        busy: false,
        error: pedidoError?.message || "No se pudo enviar la solicitud.",
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    if (!isValidEntradasAyudaEmail(form.email)) {
      setEmailError("Ingresá un mail con formato válido.");
      return;
    }
    if (hasReservasVigentes && !String(form.comentarios || "").trim()) {
      setError("Contanos en comentarios en qué podemos ayudarte.");
      return;
    }
    setEmailError("");
    setSending(true);
    try {
      const skipEntradas = hasReservasVigentes;
      const telNorm =
        normalizePhoneForWhatsApp(form.telefono)
        || String(form.telefono || "").replace(/\D/g, "");
      await sendEntradasAyudaConsulta({
        nombre: form.nombre,
        email: form.email,
        telefono: telNorm,
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
        <span className="entradas-ayuda-fab-label">¿Necesitás ayuda?</span>
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
                      <label className={`${ui.label} text-sm`} htmlFor="ayuda-email">
                        Mail
                      </label>
                      <input
                        id="ayuda-email"
                        type="email"
                        required
                        autoFocus
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
                        <p className={`text-sm ${ui.textMuted}`}>Buscando si tenés una entrada vigente…</p>
                      )}

                      {hasReservasVigentes && (
                        <div
                          className={
                            isDark
                              ? "rounded-2xl border-4 border-emerald-400 bg-emerald-950 px-4 py-4 space-y-3 shadow-lg"
                              : "rounded-2xl border-4 border-emerald-500 bg-emerald-50 px-4 py-4 space-y-3 shadow-lg"
                          }
                          role="status"
                        >
                          <div className="flex items-start gap-2">
                            <IconCheck
                              size={28}
                              className={isDark ? "mt-0.5 shrink-0 text-emerald-300" : "mt-0.5 shrink-0 text-emerald-700"}
                            />
                            <p
                              className={`text-xl sm:text-2xl font-black leading-tight tracking-tight ${
                                isDark ? "text-emerald-50" : "text-emerald-950"
                              }`}
                            >
                              ¡Encontramos tus entradas!
                            </p>
                          </div>
                          <ul className="space-y-3 list-none p-0 m-0">
                            {reservasVigentes.map((r) => {
                              const busy = busyReservaId === r.id;
                              const otras = funcionesParaCambio(r);
                              const panel = gestion && Number(gestion.reservaId) === Number(r.id) ? gestion : null;
                              const btnCls = `${secondaryBtnClass} ${
                                isDark
                                  ? "border-slate-500 text-slate-200 hover:bg-slate-800"
                                  : "border-slate-300 text-slate-700 hover:bg-slate-50"
                              }`;
                              const primaryBtnCls = `${secondaryBtnClass} ${
                                isDark
                                  ? "border-sky-700 text-sky-200 hover:bg-sky-950"
                                  : "border-sky-300 text-sky-800 hover:bg-sky-50"
                              }`;
                              const waBtnCls = `${secondaryBtnClass} ${
                                isDark
                                  ? "border-emerald-700 text-emerald-200 hover:bg-emerald-950"
                                  : "border-emerald-400 text-emerald-800 hover:bg-emerald-50"
                              }`;
                              return (
                                <li
                                  key={r.id}
                                  className={
                                    isDark
                                      ? "rounded-md border border-slate-600 bg-slate-900/50 px-3 py-2 space-y-2"
                                      : "rounded-md border border-amber-100 bg-white px-3 py-2 space-y-2"
                                  }
                                >
                                  <p className={`text-base font-black leading-snug ${ui.textStrong}`}>
                                    ¿Qué querés hacer con esta entrada?
                                  </p>
                                  <p className={`text-sm font-semibold leading-snug ${ui.textStrong}`}>
                                    {r.label}
                                  </p>
                                  <p className={`text-xs ${ui.textMuted}`}>
                                    {r.cantidadLabel}
                                    {r.codigo ? ` · ${r.codigo}` : ""}
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    <button
                                      type="button"
                                      disabled={busy}
                                      className={`${primaryBtnCls} px-3 py-2 text-sm`}
                                      onClick={() => void handleDescargar(r)}
                                    >
                                      {busy ? "…" : "Descargar PDF"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      className={`${primaryBtnCls} px-3 py-2 text-sm`}
                                      onClick={() => void handleReenviar(r)}
                                    >
                                      {busy ? "…" : "Enviar al mail"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      className={btnCls}
                                      onClick={() => void handleVerQr(r)}
                                    >
                                      {busy ? "…" : "Ver QR"}
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      className={waBtnCls}
                                      title="Abrí WhatsApp para mandarle el PDF a un contacto tuyo (respaldo)."
                                      onClick={() => void handleCompartirWhatsApp(r)}
                                    >
                                      {busy ? "…" : "Compartir por WhatsApp"}
                                    </button>
                                  </div>
                                  <div className="flex flex-col gap-2 pt-1">
                                    <button
                                      type="button"
                                      className={`${secondaryBtnClass} ${
                                        isDark
                                          ? "border-rose-700 text-rose-200 hover:bg-rose-950"
                                          : "border-rose-300 text-rose-800 hover:bg-rose-50"
                                      }`}
                                      onClick={() => setGestion({
                                        reservaId: r.id,
                                        modo: "cancelar",
                                        paso: "elegir",
                                        destinoId: "",
                                        code: "",
                                        busy: false,
                                        error: "",
                                        info: "",
                                      })}
                                    >
                                      Cancelar
                                    </button>
                                    {otras.length > 0 ? (
                                      <button
                                        type="button"
                                        className={`${secondaryBtnClass} ${
                                          isDark
                                            ? "border-sky-700 text-sky-100 hover:bg-sky-950"
                                            : "border-sky-400 text-sky-900 hover:bg-sky-50"
                                        }`}
                                        onClick={() => setGestion({
                                          reservaId: r.id,
                                          modo: "cambiar",
                                          paso: "elegir",
                                          destinoId: String(otras[0].id),
                                          code: "",
                                          busy: false,
                                          error: "",
                                          info: "",
                                        })}
                                      >
                                        Cambiar de función
                                      </button>
                                    ) : (
                                      <p className={`text-sm ${isDark ? "text-emerald-100/80" : "text-emerald-900"}`}>
                                        (no hay disponibles en otra función)
                                      </p>
                                    )}
                                  </div>
                                  {panel && panel.paso !== "hecho" && (
                                    <div
                                      className={
                                        isDark
                                          ? "rounded-lg border border-emerald-700 bg-black/25 px-3 py-3 space-y-2"
                                          : "rounded-lg border border-emerald-200 bg-white px-3 py-3 space-y-2"
                                      }
                                    >
                                      {panel.modo === "cambiar" && (
                                        <label className="block space-y-1">
                                          <span className={`text-xs font-bold ${ui.textSoft}`}>Pasar a</span>
                                          <select
                                            className={selectClass}
                                            value={panel.destinoId}
                                            onChange={(event) => setGestion((prev) => prev && ({
                                              ...prev,
                                              destinoId: event.target.value,
                                              error: "",
                                            }))}
                                          >
                                            {otras.map((f) => (
                                              <option key={f.id} value={String(f.id)}>
                                                {f.label}
                                              </option>
                                            ))}
                                          </select>
                                        </label>
                                      )}
                                      {panel.paso === "elegir" && (
                                        <>
                                          <p className={`text-sm leading-relaxed ${ui.textBody}`}>
                                            Podés hacerlo vos mismo/a con un código que te mandamos a este mail,
                                            o enviarlo como solicitud para que el equipo lo acepte.
                                          </p>
                                          <div className="flex flex-col gap-2">
                                            <button
                                              type="button"
                                              disabled={panel.busy}
                                              className={`${primaryBtnCls} px-3 py-2 text-sm`}
                                              onClick={() => void empezarVosMismo(r, panel.modo, panel.destinoId)}
                                            >
                                              {panel.busy ? "…" : "Hacelo vos mismo/a"}
                                            </button>
                                            <button
                                              type="button"
                                              disabled={panel.busy}
                                              className={`${btnCls} px-3 py-2 text-sm`}
                                              onClick={() => void enviarPedidoGestion(r, panel.modo, panel.destinoId)}
                                            >
                                              {panel.busy ? "…" : "Enviar como solicitud"}
                                            </button>
                                          </div>
                                        </>
                                      )}
                                      {panel.paso === "codigo" && (
                                        <>
                                          <p className={`text-sm leading-relaxed ${ui.textBody}`}>
                                            {panel.info || "Ingresá el código de 8 dígitos."}
                                          </p>
                                          <input
                                            inputMode="numeric"
                                            autoComplete="one-time-code"
                                            maxLength={8}
                                            value={panel.code}
                                            onChange={(event) => {
                                              const code = event.target.value.replace(/\D/g, "").slice(0, 8);
                                              setGestion((prev) => prev && ({ ...prev, code, error: "" }));
                                            }}
                                            className={inputClass}
                                            placeholder="Código de 8 dígitos"
                                            aria-label="Código del mail"
                                          />
                                          <button
                                            type="button"
                                            disabled={panel.busy}
                                            className={`${primaryBtnCls} px-3 py-2 text-sm`}
                                            onClick={() => void confirmarCodigoGestion(r)}
                                          >
                                            {panel.busy
                                              ? "…"
                                              : panel.modo === "cancelar"
                                                ? "Confirmar y cancelar"
                                                : "Confirmar y cambiar"}
                                          </button>
                                        </>
                                      )}
                                      {panel.error ? (
                                        <p className={`text-sm ${isDark ? "text-rose-300" : "text-rose-700"}`} role="alert">
                                          {panel.error}
                                        </p>
                                      ) : null}
                                    </div>
                                  )}
                                  {panel?.paso === "hecho" && panel.info ? (
                                    <p className={`text-sm font-bold ${isDark ? "text-emerald-200" : "text-emerald-900"}`}>
                                      {panel.info}
                                    </p>
                                  ) : null}
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

                      <label className={`${ui.label} text-sm`} htmlFor="ayuda-telefono">
                        Teléfono / WhatsApp{" "}
                        <span className={`font-normal normal-case tracking-normal ${ui.textMuted}`}>
                          (opcional)
                        </span>
                      </label>
                      <input
                        id="ayuda-telefono"
                        type="tel"
                        autoComplete="tel"
                        inputMode="tel"
                        value={form.telefono}
                        onChange={onTelefonoChange}
                        className={inputClass}
                        placeholder="Ej. 2994123456 o 5492994123456"
                      />
                      <p className={`text-xs ${ui.textMuted}`}>
                        Sin código de país asumimos Argentina (+54). Sirve para contactarte por WhatsApp.
                      </p>

                      {!hasReservasVigentes && (
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
                        {hasReservasVigentes ? "¿En qué te ayudamos?" : "Otros comentarios"}
                      </label>
                      <textarea
                        id="ayuda-comentarios"
                        rows={3}
                        required={hasReservasVigentes}
                        value={form.comentarios}
                        onChange={onChange("comentarios")}
                        className={`${inputClass} resize-y min-h-[5rem]`}
                        placeholder={
                          hasReservasVigentes
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

      <MisReservasQrModal
        reserva={qrModalReserva}
        onClose={() => setQrModalReserva(null)}
        isDark={isDark}
        ui={ui}
      />
    </>
  );
}
