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

const TW_PROP_RE = /--tw-[a-z0-9-]+\s*:\s*[^;{}"']*;?/gi;

/** CSS residual si un tag `style` se partió o el regex cortó mal. */
function stripCssLeftovers(text) {
  return String(text || "")
    .replace(TW_PROP_RE, " ")
    .replace(
      /\b(?:font-weight|font-style|font-size|line-height|letter-spacing|vertical-align|border-spacing|contain(?:-layout|-paint|-style)?)\s*:\s*[^;]+;?/gi,
      " ",
    )
    .replace(/\bstyle\s*=\s*("[^"]*"|'[^']*')/gi, " ")
    .replace(/["']>/g, " ")
    .replace(/<\/?[a-z][\w:-]*[^>]*>/gi, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, " ")
    .replace(/&gt;/gi, " ")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      if (!Number.isFinite(code) || code === 60 || code === 62) return " ";
      return String.fromCharCode(code);
    })
    .replace(/\s+/g, " ")
    .trim();
}

/** Quita tags respetando `>` dentro de atributos entre comillas. */
function stripTagsQuoteAware(raw) {
  const s = String(raw);
  let out = "";
  let i = 0;
  while (i < s.length) {
    if (s[i] !== "<") {
      out += s[i];
      i += 1;
      continue;
    }
    let j = i + 1;
    let quote = null;
    while (j < s.length) {
      const c = s[j];
      if (quote) {
        if (c === quote) quote = null;
      } else if (c === '"' || c === "'") {
        quote = c;
      } else if (c === ">") {
        j += 1;
        break;
      }
      j += 1;
    }
    out += " ";
    i = j;
  }
  return out;
}

/**
 * Texto plano sin HTML (descripciones de RichTextEditor / agenda).
 * En browser usa DOMParser (como `htmlToPlainText` de transporte) y borra
 * style/script para no volcar CSS Tailwind (`--tw-*`) al PDF.
 */
export function stripHtml(html) {
  if (!html) return "";
  const raw = String(html);
  try {
    if (typeof DOMParser !== "undefined") {
      const doc = new DOMParser().parseFromString(raw, "text/html");
      doc
        .querySelectorAll("style, script, noscript, svg, link")
        .forEach((el) => el.remove());
      doc.querySelectorAll("br").forEach((br) => {
        br.replaceWith(doc.createTextNode(" "));
      });
      doc
        .querySelectorAll("p, div, li, h1, h2, h3, h4, tr, blockquote")
        .forEach((el) => {
          el.appendChild(doc.createTextNode(" "));
        });
      const text = (doc.body?.textContent || "").replace(/\u00a0/g, " ");
      return stripCssLeftovers(text);
    }
  } catch {
    /* fallback regex */
  }
  return stripCssLeftovers(
    stripTagsQuoteAware(
      raw
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<br\s*\/?>/gi, " "),
    ),
  );
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
