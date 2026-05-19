import {
  endOfDay,
  endOfMonth,
  endOfWeek,
  isWithinInterval,
  parseISO,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

/** Texto plano sin etiquetas HTML (descripciones de RichTextEditor). */
export function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|h[1-6])>/gi, " ")
    .replace(/<[^>]*>?/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function hasHtmlMarkup(text) {
  if (!text) return false;
  return /<[a-z][\s\S]*>/i.test(text);
}

export function getLinkedPrograms(evt) {
  const programs = [];
  const seen = new Set();
  const add = (p) => {
    if (!p?.id || seen.has(p.id)) return;
    seen.add(p.id);
    programs.push(p);
  };
  if (evt.programas) add(evt.programas);
  evt.eventos_programas_asociados?.forEach((epa) => add(epa.programas));
  return programs;
}

export function isConciertoEvent(evt) {
  return String(evt?.tipos_evento?.nombre || "")
    .toLowerCase()
    .includes("concierto");
}

export function isEnsayoEnsambleEvent(evt) {
  const name = String(evt?.tipos_evento?.nombre || "").toLowerCase();
  return name.includes("ensayo") && name.includes("ensamble");
}

/** Título corto para celdas de calendario / listas compactas. */
export function getCalendarEventTitle(evt) {
  const typeName = evt?.tipos_evento?.nombre || "Evento";
  const plainDesc = stripHtml(evt?.descripcion);

  if (isConciertoEvent(evt)) {
    const nomencladores = [
      ...new Set(
        getLinkedPrograms(evt)
          .map((p) => p.nomenclador)
          .filter(Boolean),
      ),
    ];
    if (nomencladores.length > 0) {
      return nomencladores.join(" · ");
    }
  }

  return plainDesc || typeName;
}

export function getEventEnsambles(evt) {
  return (evt?.eventos_ensambles || [])
    .map((ee) => ee.ensambles)
    .filter(Boolean);
}

/** Alinea eventos de coordinación al formato de {@link exportAgendaToPDF}. */
export function mapCoordinatorEventsForAgendaPdf(events) {
  return (events || []).map((evt) => {
    const linked = getLinkedPrograms(evt);
    const programas = evt.programas ?? linked[0] ?? null;
    if (programas === evt.programas) return evt;
    return { ...evt, programas };
  });
}

/** Eventos visibles en la ventana del calendario (semana / mes / día). */
export function filterEventsForCalendarView(events, viewDate, currentView) {
  if (!viewDate || !events?.length) return [];

  let start;
  let end;
  if (currentView === "month") {
    start = startOfMonth(viewDate);
    end = endOfMonth(viewDate);
  } else if (currentView === "day") {
    start = startOfDay(viewDate);
    end = endOfDay(viewDate);
  } else {
    start = startOfWeek(viewDate, { weekStartsOn: 1 });
    end = endOfWeek(viewDate, { weekStartsOn: 1 });
  }

  return events.filter((evt) => {
    if (!evt?.fecha) return false;
    try {
      const day = parseISO(evt.fecha);
      return isWithinInterval(day, { start, end });
    } catch {
      return false;
    }
  });
}
