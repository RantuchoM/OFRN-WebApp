import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";
import { IconMail, IconLoader, IconClock, IconX, IconSend, IconTrash } from "../ui/Icons";

const FLUSH_DELAY_MS = 6000;

const VARIANT_LABELS = { ALTA: "Alta", BAJA: "Baja", AUSENTE: "Ausente" };

/**
 * Panel tipo "cola de carga" (estilo Google Drive): listado de tareas pendientes de notificación,
 * con opción de cancelar cada una o enviar ahora (omite la espera de 15s).
 * Expone sendAllNow() vía ref para que el padre pueda forzar el envío (ej. modal de salida).
 */
const NotificationQueuePanel = forwardRef(function NotificationQueuePanel(
  {
    pendingTasks,
    onFlush,
    onRemoveTask,
    onCancelAll,
    supabase,
    gira,
    linkRepertorio = "",
  },
  ref,
) {
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [sending, setSending] = useState(false);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);
  const pendingTasksRef = useRef(pendingTasks);
  const sendNowRef = useRef(null);
  const cancelAllRef = useRef(null);

  pendingTasksRef.current = pendingTasks;

  const runSend = async () => {
    const tasksToSend = pendingTasksRef.current || [];
    if (tasksToSend.length === 0) return;
    setSending(true);
    const nombreGira = gira?.nombre_gira || "";
    const nomenclador = gira?.nomenclador || nombreGira;
    const fechaDesde = gira?.fecha_desde || "";
    const fechaHasta = gira?.fecha_hasta || "";
    const zona = gira?.zona || "";

    for (const task of tasksToSend) {
      try {
        await supabase.functions.invoke("mails_produccion", {
          body: {
            action: "enviar_mail",
            templateId: "convocatoria_gira",
            bcc: task.emails?.length ? task.emails : undefined,
            email: task.emails?.length === 1 ? task.emails[0] : undefined,
            nombre: task.nombres?.[0] || "Participante",
            gira: nombreGira,
            detalle: {
              variant: task.variant,
              link_repertorio: linkRepertorio,
              nomenclador,
              fecha_desde: fechaDesde,
              fecha_hasta: fechaHasta,
              zona,
              reason: task.reason ?? undefined,
            },
          },
        });
      } catch (err) {
        console.error("Error enviando notificación convocatoria:", err);
      }
    }

    setSending(false);
    onFlush();
  };

  useEffect(() => {
    if (pendingTasks.length === 0) {
      setSecondsLeft(null);
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      return;
    }

    setSecondsLeft(Math.ceil(FLUSH_DELAY_MS / 1000));
    const countdownStart = Date.now();
    countdownRef.current = setInterval(() => {
      const elapsed = (Date.now() - countdownStart) / 1000;
      const left = Math.max(0, Math.ceil(FLUSH_DELAY_MS / 1000 - elapsed));
      setSecondsLeft(left);
      if (left <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }, 1000);

    timerRef.current = setTimeout(() => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      setSecondsLeft(0);
      runSend();
    }, FLUSH_DELAY_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [pendingTasks.length, onFlush, gira?.nombre_gira, gira?.nomenclador, linkRepertorio, supabase]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, []);

  const handleSendNow = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setSecondsLeft(0);
    runSend();
  };
  sendNowRef.current = handleSendNow;

  const handleCancelAll = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    setSecondsLeft(null);
    onCancelAll?.();
  };
  cancelAllRef.current = handleCancelAll;

  useImperativeHandle(ref, () => ({
    sendAllNow() {
      sendNowRef.current?.();
    },
    cancelAll() {
      cancelAllRef.current?.();
    },
  }), []);

  if (pendingTasks.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 w-full max-w-md z-[100] bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden"
      role="status"
      aria-live="polite"
    >
      <div className="bg-slate-800 text-white px-4 py-2.5 flex items-center justify-between">
        <span className="text-sm font-bold flex items-center gap-2">
          <IconMail size={18} />
          Notificaciones pendientes
        </span>
        {!sending && (
          <span className="text-xs text-slate-300 flex items-center gap-1">
            <IconClock size={12} />
            {secondsLeft != null ? `En ${secondsLeft}s` : "Enviando…"}
          </span>
        )}
      </div>

      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100">
        {pendingTasks.map((task) => {
          const recipientText =
            task.nombres?.length > 1
              ? `${task.nombres.length} músicos`
              : task.nombres?.[0] || "1 músico";
          const variantLabel = VARIANT_LABELS[task.variant] || task.variant;
          return (
            <div
              key={task.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50"
            >
              <div className="flex-1 min-w-0">
                <span className="text-xs font-bold uppercase text-indigo-600">
                  {variantLabel}
                </span>
                <p className="text-sm text-slate-700 truncate mt-0.5">
                  → {recipientText}
                </p>
              </div>
              {!sending && onRemoveTask && (
                <button
                  type="button"
                  onClick={() => onRemoveTask(task.id)}
                  className="p-1.5 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                  title="Cancelar envío"
                  aria-label="Cancelar"
                >
                  <IconX size={16} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-end gap-2">
        {sending ? (
          <span className="text-sm text-slate-500 flex items-center gap-2">
            <IconLoader size={16} className="animate-spin" />
            Enviando…
          </span>
        ) : (
          <>
            <button
              type="button"
              onClick={handleCancelAll}
              className="flex items-center gap-2 px-4 py-2 text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-sm font-bold rounded-lg transition-colors"
              title="Vaciar cola sin enviar"
            >
              <IconTrash size={16} />
              Cancelar todos
            </button>
            <button
              type="button"
              onClick={handleSendNow}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors"
              title="Enviar todas las notificaciones ahora"
            >
              <IconSend size={16} />
              Enviar todos ahora
            </button>
          </>
        )}
      </div>
    </div>
  );
});

export default NotificationQueuePanel;
