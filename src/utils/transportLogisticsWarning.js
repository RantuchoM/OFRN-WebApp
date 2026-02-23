const escapeHtml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Obtiene si un evento de transporte (id) está referenciado en reglas de logística
 * y un texto detallado: qué localidades, personas y regiones afecta.
 * Consulta ambas tablas: giras_logistica_reglas_transportes y giras_logistica_rutas.
 * @param {object} supabase - Cliente Supabase
 * @param {number|string} eventId - ID del evento
 * @returns {Promise<{ hasLinks: boolean, detail: string, detailHtml?: string }>}
 */
export async function getTransportEventAffectedSummary(supabase, eventId) {
  const idVal = Number.isNaN(Number(eventId)) ? eventId : Number(eventId);

  const fetchByEvent = (table) =>
    Promise.all([
      supabase.from(table).select("id, alcance, id_integrante, id_localidad, id_region").eq("id_evento_subida", idVal),
      supabase.from(table).select("id, alcance, id_integrante, id_localidad, id_region").eq("id_evento_bajada", idVal),
    ]).then(([r1, r2]) => [...(r1.data || []), ...(r2.data || [])]);

  const [reglasList, rutasList] = await Promise.all([
    fetchByEvent("giras_logistica_reglas_transportes"),
    fetchByEvent("giras_logistica_rutas"),
  ]);

  const rules = [...reglasList, ...rutasList];
  if (rules.length === 0) {
    return { hasLinks: false, detail: "" };
  }

  const alcancePersona = (a) => (a || "").toLowerCase() === "persona";
  const alcanceLocalidad = (a) => (a || "").toLowerCase() === "localidad";
  const alcanceRegion = (a) => (a || "").toLowerCase() === "region";
  const alcanceGeneral = (a) => (a || "").toLowerCase() === "general";

  const integranteIdsRaw = [
    ...new Set(
      rules
        .filter((r) => alcancePersona(r.alcance) && r.id_integrante != null && r.id_integrante !== "")
        .map((r) => r.id_integrante),
    ),
  ];
  const integranteIds = integranteIdsRaw
    .map((id) => (typeof id === "number" ? id : Number(id)))
    .filter((id) => !Number.isNaN(id));
  const integranteIdsStr = [...new Set(integranteIdsRaw.map((id) => String(id)))];
  const localidadIds = [...new Set(rules.filter((r) => alcanceLocalidad(r.alcance) && r.id_localidad != null).map((r) => r.id_localidad))];
  const regionIds = [...new Set(rules.filter((r) => alcanceRegion(r.alcance) && r.id_region != null).map((r) => r.id_region))];
  const hasGeneral = rules.some((r) => alcanceGeneral(r.alcance));

  const parts = [];
  const partsHtml = [];

  if (integranteIdsStr.length > 0) {
    const idsForQuery = integranteIds.length > 0 ? integranteIds : integranteIdsStr;
    const { data: integrantes, error: errInt } = await supabase
      .from("integrantes")
      .select("id, nombre, apellido")
      .in("id", idsForQuery);
    const byId = new Map(
      (integrantes || []).map((p) => [String(p.id), p]),
    );
    const names = integranteIdsStr.map((sid) => {
      const p = byId.get(sid);
      return p ? `${(p.nombre || "").trim()} ${(p.apellido || "").trim()}`.trim() || "Integrante" : null;
    }).filter(Boolean);
    if (names.length > 0) {
      const text = names.join(", ");
      parts.push("Personas: " + text);
      partsHtml.push("Personas: <strong>" + names.map(escapeHtml).join(", ") + "</strong>");
    } else {
      const fallback = integranteIdsStr.length + " integrante(s)" + (errInt ? " (error al cargar nombres)" : " (revisar en logística)");
      parts.push("Personas: " + fallback);
      partsHtml.push("Personas: " + escapeHtml(fallback));
    }
  }
  if (localidadIds.length > 0) {
    const { data: localidades } = await supabase
      .from("localidades")
      .select("id, localidad")
      .in("id", localidadIds);
    const names = (localidades || []).map((l) => l.localidad || "S/D");
    parts.push("Localidades: " + names.join(", "));
    partsHtml.push("Localidades: <strong>" + names.map(escapeHtml).join(", ") + "</strong>");
  }
  if (regionIds.length > 0) {
    const { data: regiones } = await supabase
      .from("regiones")
      .select("id, region")
      .in("id", regionIds);
    const names = (regiones || []).map((r) => r.region || "S/D");
    parts.push("Regiones: " + names.join(", "));
    partsHtml.push("Regiones: <strong>" + names.map(escapeHtml).join(", ") + "</strong>");
  }
  if (hasGeneral) {
    parts.push("Todos los integrantes (alcance General)");
    partsHtml.push("<strong>Todos los integrantes (alcance General)</strong>");
  }
  if (rules.some((r) => (r.alcance || "").toLowerCase() === "categoria")) {
    parts.push("Categorías (revisar en logística)");
    partsHtml.push("Categorías (revisar en logística)");
  }

  const detail = parts.length > 0 ? parts.join(". ") : "Reglas de logística vinculadas.";
  const detailHtml = partsHtml.length > 0 ? partsHtml.join(". ") : null;
  return { hasLinks: true, detail, detailHtml };
}
