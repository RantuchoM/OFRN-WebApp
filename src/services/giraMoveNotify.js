import { addDays, differenceInCalendarDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { fetchGiraRosterCached } from "../hooks/useGiraRosterQuery";

/**
 * Tras un moveGira exitoso, avisa por email a músicos no ausentes con mail.
 * `giraBefore` debe reflejar fechas/nombre/zona **antes** del traslado.
 *
 * @returns {{ sent: number }} cantidad de destinatarios BCC
 */
export async function notifyGiraMoveByEmail({
  supabase,
  queryClient,
  giraBefore,
  newStartDate,
}) {
  if (!supabase || !giraBefore?.id || !newStartDate) {
    return { sent: 0 };
  }

  const { roster } = await fetchGiraRosterCached(
    supabase,
    queryClient,
    giraBefore,
  );
  const conMail = (roster || []).filter(
    (m) => m.estado_gira !== "ausente" && m.mail,
  );
  const bcc = conMail.map((m) => m.mail);
  if (bcc.length === 0) return { sent: 0 };

  const fmtLargo = (s) =>
    s ? format(parseISO(s), "EEEE, dd/MM/yyyy", { locale: es }) : "";
  const fechasViejas =
    [giraBefore.fecha_desde, giraBefore.fecha_hasta]
      .filter(Boolean)
      .map(fmtLargo)
      .join(" – ") || "";
  const daysSpan =
    giraBefore.fecha_desde && giraBefore.fecha_hasta
      ? differenceInCalendarDays(
          parseISO(giraBefore.fecha_hasta),
          parseISO(giraBefore.fecha_desde),
        )
      : 0;
  const newEnd = addDays(parseISO(newStartDate), daysSpan);
  const fechasNuevas = [
    format(parseISO(newStartDate), "EEEE, dd/MM/yyyy", { locale: es }),
    format(newEnd, "EEEE, dd/MM/yyyy", { locale: es }),
  ].join(" – ");

  const { data: eventosGira } = await supabase
    .from("eventos")
    .select("fecha, hora_inicio, locaciones(nombre, localidades(localidad))")
    .eq("id_gira", giraBefore.id)
    .order("fecha", { ascending: true })
    .order("hora_inicio", { ascending: true });

  const fmtEvento = (e) => {
    const dia = e.fecha
      ? format(parseISO(e.fecha), "EEEE d 'de' MMMM", { locale: es })
      : "—";
    const hora = e.hora_inicio ? `${e.hora_inicio.slice(0, 5)} hs` : "—";
    const loc = e.locaciones?.nombre || "—";
    const ciudad = e.locaciones?.localidades?.localidad || "—";
    return `${dia}, ${hora}, ${loc}, ${ciudad}`;
  };
  const conciertos = (eventosGira || []).map(fmtEvento);
  const linkGira = `${window.location.origin}${window.location.pathname}?tab=giras&view=AGENDA&giraId=${giraBefore.id}`;

  const { error } = await supabase.functions.invoke("mails_produccion", {
    body: {
      action: "enviar_mail",
      templateId: "cambio_fechas_gira",
      bcc,
      nombre: "",
      gira: giraBefore.nombre_gira || "Gira OFRN",
      detalle: {
        fechas_viejas: fechasViejas,
        fechas_nuevas: fechasNuevas,
        zona: giraBefore.zona || "",
        conciertos,
        link_gira: linkGira,
      },
    },
  });
  if (error) throw error;
  return { sent: bcc.length };
}
