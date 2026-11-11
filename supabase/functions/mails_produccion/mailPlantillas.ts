import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

export type MailPlantillaRow = {
  template_id: string;
  variant_key: string;
  titulo: string;
  asunto: string;
  slots: Record<string, string>;
};

export function interpolateMailText(
  template: string,
  vars: Record<string, string | number | null | undefined> = {},
): string {
  return String(template ?? "").replace(/\{([a-z0-9_]+)\}/gi, (_, key) => {
    const v = vars[key];
    return v == null || v === "" ? `{${key}}` : String(v);
  });
}

/** ISO `yyyy-mm-dd` → `dd/mm/yyyy` (es-AR). */
export function formatFechaMailIso(value: string | null | undefined): string {
  const s = String(value || "").trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : s;
}

/** Rango legible de fechas de gira para asunto y cuerpo. */
export function formatFechasGiraRango(
  desde: string | null | undefined,
  hasta: string | null | undefined,
): string {
  const a = formatFechaMailIso(desde);
  const b = formatFechaMailIso(hasta);
  if (a && b && a !== b) return `${a} – ${b}`;
  return a || b || "";
}

/** Limpia placeholders vacíos y separadores huérfanos en asuntos. */
export function cleanupMailSubject(subject: string): string {
  return String(subject || "")
    .replace(/\{[a-z0-9_]+\}/gi, "")
    .replace(/\s*\|\s*\|/g, " | ")
    .replace(/\s{2,}/g, " ")
    .replace(/\s*\|\s*$/g, "")
    .replace(/^\s*\|\s*/g, "")
    .trim();
}

export function resolveConvocatoriaPlantillaVariant(d: any): string {
  const explicit = String(d?.plantilla_variant || d?.plantillaVariant || "").trim();
  if (explicit) return explicit;
  const v = String(d?.variant || "INITIAL_BROADCAST").toUpperCase();
  if (v === "ALTA_ACCESO_PERSONAL") return "ALTA_ACCESO_PERSONAL";
  if (v === "INITIAL_BROADCAST") return "INITIAL_BROADCAST";
  if (v === "GIRA_ELIMINADA") return "GIRA_ELIMINADA";
  if (v === "SEATING_CAMBIO") return "SEATING_CAMBIO";
  if (v === "SEATING_CAMBIO_JEFE_RESUMEN") return "SEATING_CAMBIO_JEFE_RESUMEN";
  if (v === "SEATING_ATRIL_CAMBIO") return "SEATING_ATRIL_CAMBIO";
  if (v === "REPERTORIO_PARTES_LISTOS") return "REPERTORIO_PARTES_LISTOS";
  if (v === "AUSENTE") return "AUSENTE";
  const inclusionKind = String(d?.inclusion_kind || d?.inclusionKind || "").toLowerCase();
  const exclusionKind = String(d?.exclusion_kind || d?.exclusionKind || "").toLowerCase();
  if (v === "ALTA") {
    if (inclusionKind === "mixto") return "ALTA:inclusion_mixta";
    if (inclusionKind === "ensamble") return "ALTA:inclusion_ensamble";
    if (inclusionKind === "familia") return "ALTA:inclusion_familia";
    return "ALTA";
  }
  if (v === "BAJA") {
    if (exclusionKind === "ensamble") return "BAJA:exclusion_ensamble";
    if (exclusionKind === "familia") return "BAJA:exclusion_familia";
    const motivoId = String(d?.motivo_baja_id || "").trim().toLowerCase();
    if (motivoId === "balance_orquestal" || /balance\s*orquestal/i.test(String(d?.reason || ""))) {
      return "BAJA:balance";
    }
    return "BAJA";
  }
  return v;
}

export function resolvePlantillaVariantKey(templateId: string, d: any): string {
  if (templateId === "convocatoria_gira") return resolveConvocatoriaPlantillaVariant(d);
  if (templateId === "acceso_clave") {
    return String(d?.mode || "recuperada").toLowerCase() === "generada"
      ? "generada"
      : "recuperada";
  }
  return "";
}

export function buildMailVars(
  nombre: string,
  gira: string,
  d: any,
): Record<string, string> {
  const rawDesde = String(d?.fecha_desde || "").trim();
  const rawHasta = String(d?.fecha_hasta || "").trim();
  const fechas = formatFechasGiraRango(rawDesde, rawHasta);
  const vars: Record<string, string> = {
    nombre: String(nombre || "").trim(),
    gira: String(gira || d?.gira || "").trim(),
    nomenclador: String(d?.nomenclador || gira || "").trim(),
    motivo: String(d?.motivo || d?.motivo_text || d?.vars?.motivo || "").trim(),
    titular: String(d?.titular || d?.titular_label || d?.vars?.titular || "").trim(),
    quien_cubre: String(
      d?.quien_cubre || d?.cover_label || d?.vars?.quien_cubre || "",
    ).trim(),
    ensamble: String(d?.ensamble || d?.ensamble_label || d?.vars?.ensamble || "").trim(),
    familia: String(d?.familia || d?.familia_label || d?.vars?.familia || "").trim(),
    fecha_desde: formatFechaMailIso(rawDesde) || rawDesde,
    fecha_hasta: formatFechaMailIso(rawHasta) || rawHasta,
    fechas,
    zona: String(d?.zona || "").trim(),
    titulo: String(d?.titulo || "").trim(),
    fecha_limite: String(d?.fechaLimiteTexto || d?.fecha_limite || "").trim(),
    tipo_constancia: String(
      d?.tipo_constancia_label ||
        (d?.tipo_constancia === "participacion"
          ? "constancia de participación realizada"
          : "constancia de convocatoria"),
    ).trim(),
    tipo_label:
      d?.tipo === "NUEVO_ARREGLO" ? "Nuevo arreglo" : "Reemplazo",
    mail: String(d?.mail || "").trim(),
    link_app: String(d?.link_app || "").trim(),
    alimentacion_anterior: String(d?.alimentacion_anterior || "").trim(),
    alimentacion_nueva: String(d?.alimentacion_nueva || "").trim(),
    solicitante_nombre: String(d?.solicitante_nombre || "").trim(),
    fechas_viejas: String(d?.fechas_viejas || "").trim(),
    fechas_nuevas: String(d?.fechas_nuevas || "").trim(),
    actor_jefe: String(
      d?.actor_jefe || d?.actor_jefe_nombre || d?.vars?.actor_jefe || "",
    ).trim(),
    bloque: String(d?.bloque || d?.atrilDetalle?.bloque || d?.vars?.bloque || "").trim(),
    contenedor: String(
      d?.contenedor || d?.atrilDetalle?.contenedor || d?.vars?.contenedor || "",
    ).trim(),
    asiento: String(
      d?.asiento || d?.atrilDetalle?.asiento || d?.vars?.asiento || "",
    ).trim(),
    asiento_previo: String(
      d?.asiento_previo ||
        d?.atrilDetalle?.asiento_previo ||
        d?.vars?.asiento_previo ||
        "",
    ).trim(),
    atril: String(d?.atril || d?.atrilDetalle?.atril || d?.vars?.atril || "").trim(),
    silla: String(d?.silla || d?.atrilDetalle?.silla || d?.vars?.silla || "").trim(),
    cantidad: String(d?.cantidad || d?.vars?.cantidad || "").trim(),
  };
  const extra = d?.vars && typeof d.vars === "object" ? d.vars : {};
  for (const [k, v] of Object.entries(extra)) {
    if (v != null) vars[k] = String(v);
  }
  return vars;
}

export async function fetchMailPlantilla(
  templateId: string,
  variantKey: string,
): Promise<MailPlantillaRow | null> {
  const url = Deno.env.get("SUPABASE_URL");
  const key =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  try {
    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let { data, error } = await supabase
      .from("mail_plantillas")
      .select("template_id, variant_key, titulo, asunto, slots")
      .eq("template_id", templateId)
      .eq("variant_key", variantKey || "")
      .maybeSingle();
    if (error) {
      console.warn("[mails_produccion] mail_plantillas lookup:", error.message);
      return null;
    }
    if (!data && variantKey.includes(":")) {
      const base = variantKey.split(":")[0];
      const second = await supabase
        .from("mail_plantillas")
        .select("template_id, variant_key, titulo, asunto, slots")
        .eq("template_id", templateId)
        .eq("variant_key", base)
        .maybeSingle();
      data = second.data;
    }
    if (!data) return null;
    return {
      template_id: data.template_id,
      variant_key: data.variant_key,
      titulo: data.titulo,
      asunto: data.asunto || "",
      slots: (data.slots && typeof data.slots === "object" ? data.slots : {}) as Record<
        string,
        string
      >,
    };
  } catch (err) {
    console.warn("[mails_produccion] mail_plantillas fetch failed", err);
    return null;
  }
}

export function applyPlantillaToDetalle(
  plantilla: MailPlantillaRow | null,
  vars: Record<string, string>,
  det: any,
): any {
  if (!plantilla) return det;
  const slotsRaw = plantilla.slots || {};
  const slots: Record<string, string> = {};
  for (const [k, v] of Object.entries(slotsRaw)) {
    slots[k] = interpolateMailText(String(v ?? ""), vars);
  }
  const asunto = cleanupMailSubject(
    interpolateMailText(plantilla.asunto || "", vars),
  );
  const next = { ...det, _plantilla_slots: slots, _plantilla_asunto: asunto };

  const hasFineVariant = Boolean(String(det?.plantilla_variant || "").trim());
  // Con variante fina (roster/cobertura), la plantilla manda el motivo.
  // Sin ella, solo completa si el caller no mandó reason (p. ej. seating dinámico).
  if (slots.reason) {
    if (hasFineVariant || !String(det?.reason || "").trim()) {
      next.reason = slots.reason;
    }
  }
  if (slots.footnote && !String(det?.reason_footnote || "").trim()) {
    next.reason_footnote = slots.footnote;
  }
  if (slots.lead) {
    next.alta_lead = slots.lead;
  }
  if (asunto && (!String(det?.asunto || "").trim() || hasFineVariant)) {
    next.asunto = asunto;
  }
  return next;
}

export function slotOf(d: any, key: string, fallback = ""): string {
  const fromPlantilla = d?._plantilla_slots?.[key];
  if (fromPlantilla != null && String(fromPlantilla).trim() !== "") {
    return String(fromPlantilla);
  }
  return fallback;
}
