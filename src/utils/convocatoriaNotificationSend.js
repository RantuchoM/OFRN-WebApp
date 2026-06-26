/**
 * Envía tareas de notificación de convocatoria vía Edge Function mails_produccion.
 * @returns {{ sent: number, failed: number }}
 */
export async function sendConvocatoriaNotificationTasks(
  supabase,
  tasks,
  { gira, linkRepertorio = "" } = {},
) {
  if (!tasks?.length) return { sent: 0, failed: 0 };

  const nombreGira = gira?.nombre_gira || "";
  const nomenclador = gira?.nomenclador || nombreGira;
  const fechaDesde = gira?.fecha_desde || "";
  const fechaHasta = gira?.fecha_hasta || "";
  const zona = gira?.zona || "";

  let sent = 0;
  let failed = 0;

  for (const task of tasks) {
    const g = task.giraContext || {};
    const taskNombreGira = g.nombre_gira ?? nombreGira;
    const taskNomenclador = g.nomenclador ?? nomenclador ?? taskNombreGira;
    const taskFechaDesde = g.fecha_desde ?? fechaDesde;
    const taskFechaHasta = g.fecha_hasta ?? fechaHasta;
    const taskZona = g.zona ?? zona;
    const taskLink = task.linkRepertorio ?? linkRepertorio;
    try {
      const { error } = await supabase.functions.invoke("mails_produccion", {
        body: {
          action: "enviar_mail",
          templateId: "convocatoria_gira",
          bcc: task.emails?.length ? task.emails : undefined,
          email: task.emails?.length === 1 ? task.emails[0] : undefined,
          nombre: task.nombres?.[0] || "Participante",
          gira: taskNombreGira,
          detalle: {
            variant: task.variant,
            link_repertorio: taskLink,
            nomenclador: taskNomenclador,
            fecha_desde: taskFechaDesde,
            fecha_hasta: taskFechaHasta,
            zona: taskZona,
            reason: task.reason ?? undefined,
            reason_footnote: task.reasonFootnote || undefined,
            motivo_baja_id: task.motivoBajaId || undefined,
          },
        },
      });
      if (error) {
        console.error("Error enviando notificación convocatoria:", error);
        failed += 1;
      } else {
        sent += 1;
      }
    } catch (err) {
      console.error("Error enviando notificación convocatoria:", err);
      failed += 1;
    }
  }

  return { sent, failed };
}
