import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconAlertTriangle,
  IconCopy,
  IconLoader,
  IconMail,
  IconSend,
  IconUsers,
  IconX,
} from "../ui/Icons";
import { useConfirmDialog } from "../../hooks/useConfirmDialog";
import { sendConvocatoriaNotificationTasks } from "../../utils/convocatoriaNotificationSend";
import {
  buildSeatingCambioMailTasks,
  musiciansWithMail,
  pendingLateAssignmentMusicians,
} from "../../utils/seatingLateAssignmentChanges";
import { registerSeatingLateMailLeaveGuard } from "../../utils/seatingLateMailLeaveGuard";

const BANNER_TEXT =
  "Tené en cuenta que a estos músicos se les agregaron obras a menos de dos semanas de la gira. Para notificarlos puedes copiar los mails";

async function copyText(text, { emptyMessage, successMessage }) {
  if (!text) {
    toast.error(emptyMessage);
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("No se pudo copiar al portapapeles");
  }
}

function repertorioLinkForProgram(program) {
  if (!program?.id || typeof window === "undefined") return "";
  return `${window.location.origin}${window.location.pathname}?tab=giras&view=REPERTOIRE&giraId=${program.id}`;
}

function giraMailContextFromProgram(program) {
  return {
    nombre_gira: program?.nombre_gira || "",
    nomenclador: program?.nomenclador || program?.nombre_gira || "",
    fecha_desde: program?.fecha_desde || "",
    fecha_hasta: program?.fecha_hasta || "",
    zona: program?.zona || "",
  };
}

async function sendSeatingCambioTasks(supabase, tasks, program) {
  return sendConvocatoriaNotificationTasks(supabase, tasks, {
    gira: giraMailContextFromProgram(program),
    linkRepertorio: repertorioLinkForProgram(program),
  });
}

function reportSendResult(sent, failed) {
  if (failed === 0) {
    toast.success(
      sent === 1 ? "Mail enviado" : `${sent} mails enviados`,
    );
    return;
  }
  if (sent === 0) {
    toast.error("No se pudieron enviar los mails");
    return;
  }
  toast.warning(`${sent} enviados, ${failed} con error`);
}

function LateAssignmentChangesModal({
  open,
  onClose,
  musicians,
  detalleText,
  sending,
  sentIds,
  onSendOne,
  onSendAll,
  sendableCount,
}) {
  useEffect(() => {
    if (!open || !onClose) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="late-assignment-title"
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-200 flex flex-col max-h-[80vh]"
      >
        <div className="px-4 py-3 border-b border-slate-200 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3
              id="late-assignment-title"
              className="text-sm font-bold text-slate-800 flex items-center gap-2"
            >
              <IconUsers size={16} className="text-amber-600 shrink-0" />
              Músicos y cambios ({musicians.length})
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Altas y cambios de particella de esta visita a Seating.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100 text-slate-500 shrink-0"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 min-h-[120px]">
          {musicians.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">
              No hay cambios en esta visita.
            </p>
          ) : (
            <ul className="space-y-3">
              {musicians.map((m) => {
                const hasMail = Boolean(m.mail);
                const alreadySent = sentIds.has(String(m.id));
                const rowBusy = sending === String(m.id) || sending === "all";
                return (
                  <li key={m.id} className="text-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-bold text-slate-800">
                          {m.displayName}
                        </p>
                        {hasMail ? (
                          <p className="text-[11px] text-slate-400 truncate">
                            {m.mail}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-400 italic">
                            Sin mail
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!hasMail || rowBusy}
                        onClick={() => onSendOne(m)}
                        className="inline-flex items-center gap-1 shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-[10px] font-bold text-indigo-800 hover:bg-indigo-100 disabled:opacity-40 disabled:pointer-events-none"
                        title={
                          hasMail
                            ? "Enviar mail con estas novedades"
                            : "Sin mail"
                        }
                      >
                        {sending === String(m.id) ? (
                          <IconLoader size={12} className="animate-spin" />
                        ) : (
                          <IconSend size={12} />
                        )}
                        {alreadySent ? "Reenviar" : "Enviar"}
                      </button>
                    </div>
                    <ul className="mt-1 space-y-0.5">
                      {m.changes.map((c) => (
                        <li
                          key={`${m.id}-${c.obraId}-${c.fromLabel}-${c.toLabel}`}
                          className="text-xs text-slate-600 pl-2"
                        >
                          <span className="font-medium text-slate-700">
                            {c.obraTitle}
                          </span>
                          {": "}
                          <span>{c.fromLabel}</span>
                          {" → "}
                          <span className="font-medium text-amber-800">
                            {c.toLabel}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-200 flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() =>
              copyText(detalleText, {
                emptyMessage: "No hay detalle para copiar",
                successMessage: "Detalle copiado",
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-950 hover:bg-amber-100"
          >
            <IconCopy size={14} />
            Copiar detalle
          </button>
          <button
            type="button"
            disabled={sendableCount === 0 || sending != null}
            onClick={onSendAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none"
          >
            {sending === "all" ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconSend size={14} />
            )}
            Enviar a todos
            {sendableCount > 0 ? ` (${sendableCount})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function LateAssignmentLeaveModal({
  open,
  pendingCount,
  sending,
  onStay,
  onSend,
  onDontSend,
}) {
  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="late-assignment-leave-title"
        className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-100 p-5 sm:p-6"
      >
        <div className="flex items-start gap-3 sm:gap-4">
          <div className="p-2.5 sm:p-3 bg-amber-100 text-amber-600 rounded-full shrink-0">
            <IconAlertTriangle size={24} />
          </div>
          <div className="flex-1 min-w-0">
            <h3
              id="late-assignment-leave-title"
              className="text-base sm:text-lg font-bold text-slate-800 pr-1"
            >
              Mails de seating pendientes
            </h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Hay {pendingCount} músico{pendingCount === 1 ? "" : "s"} con
              cambios de particella que todavía no notificaste. Elegí si enviar
              los mails o no enviarlos antes de salir de Seating.
            </p>
          </div>
          <button
            type="button"
            onClick={onStay}
            disabled={sending}
            className="text-slate-400 hover:text-slate-600 transition-colors shrink-0 disabled:opacity-40 disabled:pointer-events-none"
            aria-label="Permanecer en Seating"
          >
            <IconX size={20} />
          </button>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={onSend}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? (
              <IconLoader size={16} className="animate-spin shrink-0" />
            ) : (
              <IconSend size={18} />
            )}
            {sending ? "Enviando…" : "Enviar mails"}
          </button>
          <button
            type="button"
            onClick={onDontSend}
            disabled={sending}
            className="w-full px-4 py-3 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors disabled:opacity-50"
          >
            No enviar
          </button>
          <button
            type="button"
            onClick={onStay}
            disabled={sending}
            className="w-full px-4 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors disabled:opacity-50"
          >
            Permanecer aquí
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default function SeatingLateAssignmentBanner({
  musicians = [],
  detalleText = "",
  emails = [],
  supabase = null,
  program = null,
  onDismissSession = null,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [sending, setSending] = useState(null);
  const [sentIds, setSentIds] = useState(() => new Set());
  const { confirm, dialog } = useConfirmDialog();
  const count = musicians.length;
  const sendable = useMemo(() => musiciansWithMail(musicians), [musicians]);
  const sendableCount = sendable.length;
  const skippedCount = count - sendableCount;
  const pending = useMemo(
    () => pendingLateAssignmentMusicians(musicians, sentIds),
    [musicians, sentIds],
  );
  const pendingCount = pending.length;
  const canSend = Boolean(supabase && program?.id);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const proceedRef = useRef(null);
  const onDismissRef = useRef(onDismissSession);
  onDismissRef.current = onDismissSession;

  const markSent = (ids) => {
    setSentIds((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(String(id)));
      return next;
    });
  };

  const confirmAndSend = async (targets, { title, message }) => {
    if (!canSend) {
      toast.error("No se puede enviar el mail en este momento");
      return;
    }
    const withMail = musiciansWithMail(targets);
    if (withMail.length === 0) {
      toast.error("No hay músicos con mail para notificar");
      return;
    }
    const ok = await confirm({
      title,
      message,
      confirmText: withMail.length === 1 ? "Enviar mail" : "Enviar mails",
      overlayClassName: "z-[100]",
    });
    if (!ok) return;

    const tasks = buildSeatingCambioMailTasks(withMail);
    const sendKey =
      withMail.length === 1 ? String(withMail[0].id) : "all";
    setSending(sendKey);
    try {
      const { sent, failed } = await sendSeatingCambioTasks(
        supabase,
        tasks,
        program,
      );
      reportSendResult(sent, failed);
      if (failed === 0 && sent > 0) {
        markSent(withMail.map((m) => m.id));
      }
    } finally {
      setSending(null);
    }
  };

  const closeLeaveModal = () => {
    proceedRef.current = null;
    setLeaveOpen(false);
  };

  const finishLeave = () => {
    const go = proceedRef.current;
    proceedRef.current = null;
    setLeaveOpen(false);
    go?.();
  };

  const handleLeaveSend = async () => {
    const targets = pendingRef.current;
    if (targets.length === 0) {
      finishLeave();
      return;
    }
    if (!canSend) {
      toast.error("No se puede enviar el mail en este momento");
      return;
    }
    const tasks = buildSeatingCambioMailTasks(targets);
    setSending("leave");
    try {
      const { sent, failed } = await sendSeatingCambioTasks(
        supabase,
        tasks,
        program,
      );
      reportSendResult(sent, failed);
      if (failed === 0 && sent > 0) {
        markSent(targets.map((m) => m.id));
        finishLeave();
        return;
      }
      if (failed === 0 && sent === 0) {
        finishLeave();
      }
    } finally {
      setSending(null);
    }
  };

  const handleLeaveDontSend = () => {
    onDismissRef.current?.();
    finishLeave();
  };

  useEffect(() => {
    if (pendingCount === 0) {
      return undefined;
    }
    return registerSeatingLateMailLeaveGuard((proceed) => {
      if (pendingRef.current.length === 0) return true;
      proceedRef.current = proceed;
      setLeaveOpen(true);
      return false;
    });
  }, [pendingCount]);

  const handleSendOne = (musician) => {
    if (!musician?.mail) {
      toast.error("Este músico no tiene mail");
      return;
    }
    const lines = (musician.changes || [])
      .map((c) => `• ${c.obraTitle}: ${c.fromLabel} → ${c.toLabel}`)
      .join("\n");
    return confirmAndSend([musician], {
      title: "Enviar novedades de seating",
      message: `¿Enviar un mail a ${musician.displayName} (${musician.mail}) con sus asignaciones?\n\n${lines}`,
    });
  };

  const handleSendAll = () => {
    if (sendableCount === 0) {
      toast.error("No hay músicos con mail para notificar");
      return;
    }
    const skipNote =
      skippedCount > 0
        ? `\n\nSe omiten ${skippedCount} sin mail.`
        : "";
    return confirmAndSend(musicians, {
      title: "Enviar novedades de seating",
      message: `¿Enviar un mail a cada músico con las novedades que se le asignaron?\n\nSe enviará a ${sendableCount} músico${sendableCount === 1 ? "" : "s"}.${skipNote}`,
    });
  };

  if (count === 0) return null;

  return (
    <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-2 sm:px-4 py-2">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="flex min-w-0 flex-1 items-start gap-2">
          <IconAlertTriangle
            size={16}
            className="mt-0.5 shrink-0 text-amber-600"
          />
          <p className="text-xs text-amber-950 leading-snug">{BANNER_TEXT}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-950 hover:bg-amber-100"
          >
            <IconUsers size={14} />
            Ver músicos ({count}) y cambios
          </button>
          <button
            type="button"
            onClick={() =>
              copyText(emails.join(", "), {
                emptyMessage: "No hay mails para copiar",
                successMessage:
                  emails.length === 1
                    ? "1 mail copiado"
                    : `${emails.length} mails copiados`,
              })
            }
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-amber-950 hover:bg-amber-100"
          >
            <IconMail size={14} />
            Copiar mails
          </button>
          <button
            type="button"
            disabled={!canSend || sendableCount === 0 || sending != null}
            onClick={handleSendAll}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-600 px-2.5 py-1.5 text-[11px] font-bold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none"
          >
            {sending === "all" ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconSend size={14} />
            )}
            Notificar por mail
          </button>
        </div>
      </div>
      <LateAssignmentChangesModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        musicians={musicians}
        detalleText={detalleText}
        sending={sending}
        sentIds={sentIds}
        onSendOne={handleSendOne}
        onSendAll={handleSendAll}
        sendableCount={sendableCount}
      />
      <LateAssignmentLeaveModal
        open={leaveOpen}
        pendingCount={pendingCount}
        sending={sending === "leave"}
        onStay={closeLeaveModal}
        onSend={handleLeaveSend}
        onDontSend={handleLeaveDontSend}
      />
      {dialog}
    </div>
  );
}
