/**
 * Reportes FIMBA con paridad OFRN (hotelería, comidas, transporte).
 * Reutiliza builders/exportadores OFRN cuando el contrato de datos lo permite.
 */

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  computeSuggestedRooms,
  DEFAULT_BEDS_PER_ROOM,
  showSuggestedRooms,
  getSuggestedRoomsLabel,
} from "./roomingInitialOrder";
import {
  downloadStyledPassengers,
  generateStopsOnlyExcel,
  generateStopsOnlyPdf,
} from "./transportExport";
import {
  buildRoadmapExportData,
  generateRoadmapExcel,
  generateRoadmapPdf,
} from "./roadmapExport";
import {
  labelFimbaAlimentacion,
  labelFimbaHabitacionTipo,
  labelGiraTransporte,
} from "../services/fimbaService";
import {
  buildFimbaComidasExportData,
  writeFimbaWorkbook,
} from "./fimbaExport";
import { formatEventLocation } from "./fimbaTransportBoarding";
import {
  escapeFimbaHtmlText,
  isFimbaRiderEmpty,
  sanitizeFimbaRiderHtml,
} from "./fimbaRider";
import {
  buildFimbaMealsStayFromHoteleria,
  formatFechaMealDdMm,
} from "./fimbaMealsStay";

function formatFechaCorta(f) {
  if (!f) return "";
  const s = String(f).slice(0, 10);
  try {
    const d = parseISO(s);
    if (Number.isNaN(d.getTime())) return s;
    const weekday = format(d, "EEEE", { locale: es }).toLowerCase();
    return `${weekday}, ${d.getDate()}/${d.getMonth() + 1}`;
  } catch {
    return s;
  }
}

function formatFechaDDMM(f) {
  if (!f) return "—";
  const s = String(f).slice(0, 10);
  const [y, m, d] = s.split("-");
  if (!d) return s;
  return `${d}/${m}${y ? `/${y}` : ""}`;
}

function genderWord(gender, count) {
  if (gender === "F") return count === 1 ? "mujer" : "mujeres";
  return count === 1 ? "hombre" : "hombres";
}

/** Mapea genero FIMBA → F / M / null (otros). */
export function mapFimbaGeneroToSex(g) {
  const v = String(g || "").toLowerCase();
  if (v === "femenino" || v === "f") return "F";
  if (v === "masculino" || v === "m") return "M";
  return null;
}

function labelGeneroEs(g) {
  const v = String(g || "").toLowerCase();
  if (v === "femenino") return "Femenino";
  if (v === "masculino") return "Masculino";
  if (v === "otro") return "Otro";
  return "Sin especificar";
}

/**
 * Agrupa hotelería por hotel + rango check-in/out (análogo a tramos/fechas OFRN).
 * @param {Array} hoteleriaRows
 * @returns {Array<{
 *   key: string,
 *   title: string,
 *   hotel: string,
 *   checkin: string|null,
 *   checkout: string|null,
 *   early: boolean,
 *   late: boolean,
 *   countM: number,
 *   countF: number,
 *   countOther: number,
 *   sinNombre: number,
 *   totalPax: number,
 *   artistas: string[],
 *   passengers: Array,
 * }>}
 */
export function buildFimbaPedidoGroups(hoteleriaRows = []) {
  const map = new Map();

  for (const r of hoteleriaRows || []) {
    if (r.requiere_hotel === false || r.propuesta?.requiere_hotel === false) continue;
    const hotel = r.hotel?.nombre || "(sin hotel)";
    const checkin = r.checkin_at ? String(r.checkin_at).slice(0, 10) : null;
    const checkout = r.checkout_at ? String(r.checkout_at).slice(0, 10) : null;
    const early = r.checkin_early === true || r.checkin_early === "true";
    const late = r.checkout_late === true || r.checkout_late === "true";
    const key = `${hotel}|${checkin || ""}|${checkout || ""}|${early ? 1 : 0}|${late ? 1 : 0}`;

    if (!map.has(key)) {
      map.set(key, {
        key,
        title: hotel,
        hotel,
        checkin,
        checkout,
        early,
        late,
        countM: 0,
        countF: 0,
        countOther: 0,
        sinNombre: 0,
        totalPax: 0,
        artistas: [],
        passengers: [],
      });
    }
    const g = map.get(key);
    const artista = r.propuesta?.nombre || "Artista";
    if (!g.artistas.includes(artista)) g.artistas.push(artista);

    for (const p of r.personas || r.participantes || []) {
      if (p.activo === false) continue;
      const sex = mapFimbaGeneroToSex(p.genero);
      if (sex === "M") g.countM += 1;
      else if (sex === "F") g.countF += 1;
      else g.countOther += 1;
      g.totalPax += 1;
      g.passengers.push({
        apellido: p.apellido || "",
        nombre: p.nombre || "",
        documento: p.documento || "",
        genero: p.genero || "",
        sexo: sex,
        artista,
        hotel,
        checkin,
        checkout,
        alimentacion: labelFimbaAlimentacion(
          p.tipo_alimentacion,
          p.nota_alimentacion,
        ),
      });
    }

    const sin = Number(r.sin_nombre ?? r.por_confirmar ?? 0) || 0;
    g.sinNombre += sin;
    g.countOther += sin;
    g.totalPax += sin;
    for (let i = 0; i < sin; i += 1) {
      g.passengers.push({
        apellido: "(sin nombre)",
        nombre: `#${i + 1}`,
        documento: "",
        genero: "",
        sexo: null,
        artista,
        hotel,
        checkin,
        checkout,
        alimentacion: "",
      });
    }
  }

  return [...map.values()].sort((a, b) => {
    const ca = a.checkin || "9999";
    const cb = b.checkin || "9999";
    if (ca !== cb) return ca.localeCompare(cb);
    return String(a.hotel).localeCompare(String(b.hotel), "es");
  });
}

/**
 * Texto pedido hotel (estilo OFRN: «N hombres, M mujeres. Check-in: …»).
 */
export function buildFimbaPedidoText(
  hoteleriaRows = [],
  { bedsPerRoom = DEFAULT_BEDS_PER_ROOM, edicionNombre = "" } = {},
) {
  const groups = buildFimbaPedidoGroups(hoteleriaRows);
  const lines = [];
  if (edicionNombre) {
    lines.push(`Pedido de plazas — ${edicionNombre}`);
    lines.push("");
  }

  let totalM = 0;
  let totalF = 0;
  let totalOther = 0;
  let totalPax = 0;

  for (const g of groups) {
    if (g.totalPax <= 0) continue;
    const inL = formatFechaCorta(g.checkin);
    const outL = formatFechaCorta(g.checkout);
    const datePart =
      inL && outL
        ? `Check-in: ${inL}${g.early ? " (early)" : ""} - check-out: ${outL}${g.late ? " (late)" : ""}`
        : "";

    const parts = [];
    if (g.countM > 0) parts.push(`${g.countM} ${genderWord("M", g.countM)}`);
    if (g.countF > 0) parts.push(`${g.countF} ${genderWord("F", g.countF)}`);
    if (g.countOther > 0) {
      parts.push(
        `${g.countOther} ${g.countOther === 1 ? "persona" : "personas"} sin sexo / sin nombre`,
      );
    }

    if (groups.length > 1 || g.hotel) {
      lines.push(`${g.hotel}${g.artistas.length ? ` · ${g.artistas.join(", ")}` : ""}`);
    }
    if (parts.length && datePart) {
      lines.push(`${parts.join(", ")}. ${datePart}`);
    } else if (parts.length) {
      lines.push(parts.join(", "));
    }

    if (showSuggestedRooms(bedsPerRoom)) {
      const sug = computeSuggestedRooms(g.countF, g.countM, bedsPerRoom);
      if (sug > 0) {
        lines.push(
          `${getSuggestedRoomsLabel(bedsPerRoom) || "Habs sugeridas"}: ${sug}`,
        );
      }
    }
    lines.push("");

    totalM += g.countM;
    totalF += g.countF;
    totalOther += g.countOther;
    totalPax += g.totalPax;
  }

  if (totalPax > 0) {
    lines.push("Resumen general");
    lines.push(`Total pasajeros: ${totalPax}`);
    const sexParts = [];
    if (totalM > 0) sexParts.push(`${totalM} ${genderWord("M", totalM)}`);
    if (totalF > 0) sexParts.push(`${totalF} ${genderWord("F", totalF)}`);
    if (totalOther > 0) sexParts.push(`${totalOther} sin sexo / sin nombre`);
    if (sexParts.length) lines.push(`Sexo: ${sexParts.join(" · ")}`);
    if (showSuggestedRooms(bedsPerRoom)) {
      const sug = computeSuggestedRooms(totalF, totalM, bedsPerRoom);
      if (sug > 0) {
        lines.push(
          `${getSuggestedRoomsLabel(bedsPerRoom) || "Habs sugeridas"} (F/M): ${sug}`,
        );
      }
    }
  }

  return lines.join("\n").trim();
}

/** Detalle pasajeros ordenado por check-in (sin habitaciones). */
export function buildFimbaDetallePasajeros(hoteleriaRows = []) {
  const groups = buildFimbaPedidoGroups(hoteleriaRows);
  return groups.map((g) => ({
    ...g,
    passengers: [...g.passengers].sort((a, b) =>
      `${a.apellido} ${a.nombre}`.localeCompare(
        `${b.apellido} ${b.nombre}`,
        "es",
        { sensitivity: "base" },
      ),
    ),
  }));
}

/** Modelo para imprimir rooming por hotel/artista. */
export function buildFimbaRoomingPrintModel(hoteleriaRows = []) {
  return (hoteleriaRows || [])
    .filter((r) => r.requiere_hotel !== false && r.propuesta?.requiere_hotel !== false)
    .map((r) => {
    const habitaciones = (r.habitaciones || []).map((h) => {
      const tipo = labelFimbaHabitacionTipo(h);
      const occs = (h.ocupantes || [])
        .slice()
        .sort((a, b) => (a.orden || 0) - (b.orden || 0));
      return {
        id: h.id,
        label: [tipo, h.orden != null ? `#${h.orden}` : "", h.label || ""]
          .filter(Boolean)
          .join(" ")
          .trim(),
        tipo,
        matrimonial: !!h.matrimonial,
        capacidad: h.capacidad || 1,
        ocupantes: occs.map((o) => {
          const p = o.participante || {};
          return {
            apellido: p.apellido || "",
            nombre: p.nombre || "",
            documento: p.documento || "",
            genero: p.genero || "",
          };
        }),
      };
    });
    return {
      artista: r.propuesta?.nombre || "",
      hotel: r.hotel?.nombre || "(sin hotel)",
      checkin: r.checkin_at,
      checkout: r.checkout_at,
      early: !!r.checkin_early,
      late: !!r.checkout_late,
      noches: r.noches,
      observaciones: String(r.propuesta?.observaciones_logisticas || "").trim(),
      habitaciones,
      sinAsignar: (r.personas || r.participantes || [])
        .filter((p) => p.activo !== false)
        .filter((p) => {
          const assigned = new Set();
          for (const h of r.habitaciones || []) {
            for (const o of h.ocupantes || []) {
              if (o.id_participante != null) assigned.add(Number(o.id_participante));
            }
          }
          return !assigned.has(Number(p.id));
        })
        .map((p) => ({
          apellido: p.apellido || "",
          nombre: p.nombre || "",
          documento: p.documento || "",
        })),
    };
  });
}

/** Texto pedido comidas (regímenes + detalle + cubiertos por día). */
export function buildFimbaComidasPedidoText(
  hoteleriaRows = [],
  { edicionNombre = "" } = {},
) {
  const { resumen, detalle } = buildFimbaComidasExportData(hoteleriaRows);
  const stay = buildFimbaMealsStayFromHoteleria(hoteleriaRows);
  const lines = [];
  if (edicionNombre) {
    lines.push(`Pedido de alimentación — ${edicionNombre}`);
    lines.push("");
  }
  lines.push("Cubiertos por día (PAX planificada × check-in/out):");
  lines.push(
    `Pax-noche: ${stay.totals?.pax_noches || 0} · Desayunos: ${stay.totals?.desayuno || 0} · Almuerzos: ${stay.totals?.almuerzo || 0} · Cenas: ${stay.totals?.cena || 0}`,
  );
  for (const d of stay.days || []) {
    lines.push(
      `· ${formatFechaMealDdMm(d.fecha)}: ${d.desayuno || 0} des / ${d.almuerzo || 0} alm / ${d.cena || 0} cen`,
    );
  }
  lines.push("");
  lines.push("Por artista (totales):");
  for (const a of stay.artists || []) {
    if (!a.pax) continue;
    lines.push(
      `· ${a.artista}: ${a.noches ?? "—"} noches · ${a.totals?.desayuno || 0} des / ${a.totals?.almuerzo || 0} alm / ${a.totals?.cena || 0} cen (PAX ${a.pax})`,
    );
  }
  lines.push("");
  lines.push("Resumen por régimen (nominados):");
  for (const row of resumen) {
    if (!row.regimen) continue;
    lines.push(`· ${row.regimen}: ${row.cantidad}`);
  }
  lines.push("");
  lines.push("Excepciones (no regular):");
  if (!detalle.length) {
    lines.push("  (ninguna)");
  } else {
    const byArtista = new Map();
    for (const d of detalle) {
      const k = d.artista || "(sin artista)";
      if (!byArtista.has(k)) byArtista.set(k, []);
      byArtista.get(k).push(d);
    }
    for (const [artista, rows] of byArtista) {
      lines.push("");
      const sample = rows[0];
      const rango = sample?.desde_hasta || "—";
      lines.push(`${artista} · estadía ${rango}`);
      for (const d of rows) {
        const name = `${d.apellido || ""}, ${d.nombre || ""}`.replace(/^,\s*/, "");
        const nota = d.nota ? ` (${d.nota})` : "";
        const fechas = d.desde_hasta ? ` [${d.desde_hasta}]` : "";
        lines.push(`  - ${name}: ${d.regimen}${nota}${fechas}`);
      }
    }
  }
  return lines.join("\n").trim();
}

export function buildFimbaComidasPrintModel(hoteleriaRows = []) {
  return buildFimbaComidasExportData(hoteleriaRows);
}

/**
 * Excel del pedido inicial (plazas por sexo + detalle).
 */
export async function exportFimbaPedidoExcel(opts = {}) {
  const {
    edicionNombre = "Edicion",
    rows = [],
    bedsPerRoom = DEFAULT_BEDS_PER_ROOM,
    fileName,
  } = opts;
  const groups = buildFimbaPedidoGroups(rows);
  if (!groups.some((g) => g.totalPax > 0)) {
    alert("No hay datos de pedido hotel para exportar.");
    return false;
  }
  const resumenRows = groups.map((g) => ({
    hotel: g.hotel,
    artistas: g.artistas.join("; "),
    checkin: formatFechaDDMM(g.checkin),
    early: g.early ? "Sí" : "",
    checkout: formatFechaDDMM(g.checkout),
    late: g.late ? "Sí" : "",
    hombres: g.countM,
    mujeres: g.countF,
    otros: g.countOther,
    total: g.totalPax,
    habs_sugeridas: showSuggestedRooms(bedsPerRoom)
      ? computeSuggestedRooms(g.countF, g.countM, bedsPerRoom)
      : "",
  }));
  const detalle = [];
  for (const g of groups) {
    for (const p of g.passengers) {
      detalle.push({
        hotel: g.hotel,
        artista: p.artista,
        apellido: p.apellido,
        nombre: p.nombre,
        documento: p.documento,
        genero: labelGeneroEs(p.genero),
        checkin: formatFechaDDMM(g.checkin),
        checkout: formatFechaDDMM(g.checkout),
      });
    }
  }
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const name =
    fileName ||
    `FIMBA_Pedido_Hotel_${String(edicionNombre).replace(/\s+/g, "_")}_${stamp}`;
  await writeFimbaWorkbook(name, [
    {
      name: "Pedido plazas",
      columns: [
        { header: "Hotel", key: "hotel", width: 28 },
        { header: "Artistas", key: "artistas", width: 36 },
        { header: "Check-in", key: "checkin", width: 12 },
        { header: "Early", key: "early", width: 8 },
        { header: "Check-out", key: "checkout", width: 12 },
        { header: "Late", key: "late", width: 8 },
        { header: "Hombres", key: "hombres", width: 10 },
        { header: "Mujeres", key: "mujeres", width: 10 },
        { header: "Otros / s.n.", key: "otros", width: 12 },
        { header: "Total", key: "total", width: 10 },
        { header: "Habs sugeridas", key: "habs_sugeridas", width: 14 },
      ],
      rows: resumenRows,
    },
    {
      name: "Detalle pasajeros",
      columns: [
        { header: "Hotel", key: "hotel", width: 24 },
        { header: "Artista", key: "artista", width: 24 },
        { header: "Apellido", key: "apellido", width: 18 },
        { header: "Nombre", key: "nombre", width: 18 },
        { header: "Documento", key: "documento", width: 14 },
        { header: "Género", key: "genero", width: 14 },
        { header: "Check-in", key: "checkin", width: 12 },
        { header: "Check-out", key: "checkout", width: 12 },
      ],
      rows: detalle,
    },
  ]);
  return true;
}

/** Abre ventana de impresión con HTML + CSS (mismo patrón RoomingReport). */
export function openPrintWindow(title, bodyHtml, extraCss = "", { waitForImages = false } = {}) {
  const printWindow = window.open(
    "about:blank",
    `Print${Date.now()}`,
    "left=50000,top=50000,width=0,height=0",
  );
  if (!printWindow) {
    alert("Permití ventanas emergentes para imprimir / PDF.");
    return;
  }
  printWindow.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
<style>
body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 20px; font-size: 11px; color: #334155; }
h1 { font-size: 18px; color: #1e1b4b; border-bottom: 2px solid #1e1b4b; padding-bottom: 5px; margin-bottom: 15px; }
h2 { font-size: 14px; margin-top: 22px; color: #1e293b; background: #f1f5f9; padding: 8px; border-radius: 4px; border-left: 5px solid #6366f1; }
h3 { font-size: 12px; color: #64748b; margin: 12px 0 6px; text-transform: uppercase; letter-spacing: 0.4px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11px; }
th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; vertical-align: top; }
th { background: #e2e8f0; font-weight: 700; color: #334155; text-transform: uppercase; font-size: 10px; }
.muted { color: #94a3b8; font-size: 10px; }
.summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 14px; }
.gap-note { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; padding: 8px 10px; border-radius: 8px; font-size: 10px; margin-bottom: 12px; }
ul { margin: 4px 0 10px 20px; padding: 0; }
li { margin-bottom: 2px; }
@media print {
  @page { margin: 10mm; }
  body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  h2 { page-break-after: avoid; }
  tr, .no-break { page-break-inside: avoid; }
}
${extraCss}
</style></head><body>${bodyHtml}</body></html>`);
  printWindow.document.close();
  printWindow.focus();

  const triggerPrint = () => {
    try {
      printWindow.print();
    } finally {
      printWindow.close();
    }
  };

  if (!waitForImages) {
    setTimeout(triggerPrint, 400);
    return;
  }

  const waitThenPrint = () => {
    const imgs = Array.from(printWindow.document.images || []);
    if (!imgs.length) {
      setTimeout(triggerPrint, 200);
      return;
    }
    let left = imgs.length;
    let printed = false;
    const finish = () => {
      if (printed) return;
      printed = true;
      setTimeout(triggerPrint, 150);
    };
    const timer = printWindow.setTimeout(finish, 10000);
    const one = () => {
      left -= 1;
      if (left <= 0) {
        printWindow.clearTimeout(timer);
        finish();
      }
    };
    imgs.forEach((img) => {
      if (img.complete) one();
      else {
        img.addEventListener("load", one, { once: true });
        img.addEventListener("error", one, { once: true });
      }
    });
  };

  if (printWindow.document.readyState === "complete") waitThenPrint();
  else printWindow.addEventListener("load", waitThenPrint);
}

export function printFimbaPedido(hoteleriaRows, { edicionNombre = "", bedsPerRoom = DEFAULT_BEDS_PER_ROOM } = {}) {
  const groups = buildFimbaPedidoGroups(hoteleriaRows);
  const parts = [`<h1>Pedido de plazas</h1><h2 style="background:none;border:none;padding:0;margin-top:0">${edicionNombre || "FIMBA"}</h2>`];
  for (const g of groups) {
    if (!g.totalPax) continue;
    const sug = showSuggestedRooms(bedsPerRoom)
      ? computeSuggestedRooms(g.countF, g.countM, bedsPerRoom)
      : 0;
    parts.push(`<div class="no-break"><h2>${g.hotel}</h2>
      <p class="muted">${g.artistas.join(" · ")}</p>
      <div class="summary">
        <div><b>Check-in:</b> ${formatFechaDDMM(g.checkin)}${g.early ? " (early)" : ""} · <b>Check-out:</b> ${formatFechaDDMM(g.checkout)}${g.late ? " (late)" : ""}</div>
        <div style="margin-top:6px"><b>Hombres:</b> ${g.countM} · <b>Mujeres:</b> ${g.countF} · <b>Otros / s.n.:</b> ${g.countOther} · <b>Total:</b> ${g.totalPax}</div>
        ${sug > 0 ? `<div style="margin-top:4px"><b>${getSuggestedRoomsLabel(bedsPerRoom)}:</b> ${sug}</div>` : ""}
      </div></div>`);
  }
  openPrintWindow(`Pedido hotel — ${edicionNombre}`, parts.join(""));
}

export function printFimbaDetallePasajeros(hoteleriaRows, { edicionNombre = "" } = {}) {
  const groups = buildFimbaDetallePasajeros(hoteleriaRows);
  const parts = [`<h1>Detalle de pasajeros</h1><p class="muted">${edicionNombre}</p>
    <p class="gap-note">Listado por fecha de ingreso (sin habitaciones), análogo al «Detalle» OFRN.</p>`];
  for (const g of groups) {
    if (!g.passengers.length) continue;
    parts.push(`<h2>${g.hotel} · ${formatFechaDDMM(g.checkin)} → ${formatFechaDDMM(g.checkout)}</h2>
      <table><thead><tr><th>Artista</th><th>Apellido</th><th>Nombre</th><th>Documento</th><th>Género</th></tr></thead><tbody>
      ${g.passengers
        .map(
          (p) =>
            `<tr><td>${p.artista || ""}</td><td>${p.apellido || ""}</td><td>${p.nombre || ""}</td><td>${p.documento || ""}</td><td>${labelGeneroEs(p.genero)}</td></tr>`,
        )
        .join("")}
      </tbody></table>`);
  }
  openPrintWindow(`Detalle pasajeros — ${edicionNombre}`, parts.join(""));
}

export function printFimbaRooming(hoteleriaRows, { edicionNombre = "" } = {}) {
  const blocks = buildFimbaRoomingPrintModel(hoteleriaRows);
  const parts = [`<h1>Listado de distribución de habitaciones</h1><p class="muted">${edicionNombre}</p>`];
  for (const b of blocks) {
    parts.push(`<h2>${b.hotel} — ${b.artista}</h2>
      <p class="muted">In: ${formatFechaDDMM(b.checkin)}${b.early ? " early" : ""} · Out: ${formatFechaDDMM(b.checkout)}${b.late ? " late" : ""}${b.noches != null ? ` · ${b.noches} noches` : ""}</p>`);
    if (!b.habitaciones.length) {
      parts.push(`<p class="muted">Sin inventario de habitaciones.</p>`);
    }
    for (const h of b.habitaciones) {
      parts.push(`<h3>${h.label}${h.matrimonial ? " · Matrimonial" : ""}</h3><ul>`);
      if (!h.ocupantes.length) {
        parts.push(`<li class="muted">(vacante)</li>`);
      } else {
        for (const o of h.ocupantes) {
          parts.push(
            `<li>${o.apellido || ""}, ${o.nombre || ""}${o.documento ? ` — ${o.documento}` : ""}</li>`,
          );
        }
      }
      parts.push(`</ul>`);
    }
    if (b.sinAsignar.length) {
      parts.push(`<h3>Sin habitación asignada</h3><ul>`);
      for (const o of b.sinAsignar) {
        parts.push(`<li>${o.apellido || ""}, ${o.nombre || ""}</li>`);
      }
      parts.push(`</ul>`);
    }
  }
  openPrintWindow(`Rooming — ${edicionNombre}`, parts.join(""));
}

export function printFimbaComidas(hoteleriaRows, { edicionNombre = "" } = {}) {
  const { resumen, detalle } = buildFimbaComidasPrintModel(hoteleriaRows);
  const parts = [
    `<h1>Reporte de alimentación</h1><p class="muted">${edicionNombre}</p>
    <p class="gap-note">Cubiertos por estadía (check-in/out). El detalle lista solo excepciones (no regular) con fechas de estadía.</p>
    <h2>Resumen por régimen</h2>
    <table><thead><tr><th>Régimen</th><th>Cantidad</th></tr></thead><tbody>
    ${resumen.map((r) => `<tr><td>${r.regimen}</td><td>${r.cantidad}</td></tr>`).join("")}
    </tbody></table>
    <h2>Excepciones (no regular)</h2>
    <table><thead><tr><th>Artista</th><th>Apellido</th><th>Nombre</th><th>Documento</th><th>Desde</th><th>Hasta</th><th>Alimentación</th><th>Nota</th></tr></thead><tbody>
    ${
      detalle.length
        ? detalle
            .map(
              (d) =>
                `<tr><td>${d.artista}</td><td>${d.apellido}</td><td>${d.nombre}</td><td>${d.documento}</td><td>${d.checkin_label || ""}</td><td>${d.checkout_label || ""}</td><td>${d.regimen}</td><td>${d.nota || ""}</td></tr>`,
            )
            .join("")
        : `<tr><td colspan="8">(ninguna excepción)</td></tr>`
    }
    </tbody></table>`,
  ];
  openPrintWindow(`Comidas — ${edicionNombre}`, parts.join(""));
}

const RIDER_PRINT_CSS = `
h2 { border-left: 5px solid #d73289 !important; background: #fdf2f8 !important; }
.rider-html { font-size: 12px; line-height: 1.45; color: #1e293b; }
.rider-html p { margin: 0.4em 0; }
.rider-html ul, .rider-html ol { margin: 0.4em 0 0.7em 1.35em; padding: 0; }
.rider-html li { margin-bottom: 0.2em; }
.rider-html h1 { font-size: 16px; border: 0; margin: 0.6em 0 0.3em; padding: 0; color: #94216d; }
.rider-html h2 { font-size: 14px; background: none !important; border: 0 !important; padding: 0; margin: 0.55em 0 0.25em; color: #94216d; }
.rider-html h3 { font-size: 13px; text-transform: none; letter-spacing: 0; color: #334155; margin: 0.45em 0 0.2em; }
.rider-html a { color: #00b1eb; }
.rider-html blockquote { margin: 0.5em 0; padding: 0.35em 0.75em; border-left: 3px solid #d73289; color: #475569; background: #f8fafc; }
.rider-html img { max-width: 100%; height: auto; display: block; margin: 0.55em 0; page-break-inside: avoid; }
.rider-block { margin-bottom: 18px; page-break-inside: avoid; }
`;

/**
 * PDF/print de riders: solo artistas con texto visible o imágenes (ignora null / HTML vacío).
 * @param {Array<{ nombre?: string, rider?: string|null }>} propuestas
 * @param {{ edicionNombre?: string }} [opts]
 */
export function printFimbaRiders(propuestas = [], { edicionNombre = "" } = {}) {
  const withRider = (propuestas || []).filter((p) => !isFimbaRiderEmpty(p?.rider));
  const label = edicionNombre || "FIMBA";
  const title = `Riders — FIMBA ${label}`.trim();
  if (!withRider.length) {
    openPrintWindow(
      title,
      `<h1>Riders</h1><p class="muted">${escapeFimbaHtmlText(label)}</p>
       <p class="muted">Ningún artista tiene rider cargado.</p>`,
      RIDER_PRINT_CSS,
    );
    return;
  }
  const parts = [
    `<h1>Riders</h1><p class="muted">${escapeFimbaHtmlText(label)}</p>`,
  ];
  for (const p of withRider) {
    parts.push(
      `<div class="no-break rider-block"><h2>${escapeFimbaHtmlText(p.nombre || "Artista")}</h2>
       <div class="rider-html">${sanitizeFimbaRiderHtml(p.rider)}</div></div>`,
    );
  }
  openPrintWindow(title, parts.join(""), RIDER_PRINT_CSS, { waitForImages: true });
}

/**
 * Eventos de secuencia listos para generateStopsOnly* / CnrtExportModal.
 */
export function sequenceEventsForExport(sequence) {
  return (sequence?.sortedEvents || []).map((ev) => {
    const locName =
      ev.locaciones?.nombre ||
      ev.locacion_nombre ||
      formatEventLocation(ev) ||
      ev.actividad ||
      ev.destino ||
      "Parada";
    const locCity =
      ev.locaciones?.localidades?.localidad || ev.locacion_ciudad || "";
    const direccion = ev.locaciones?.direccion || "";
    return {
      ...ev,
      descripcion:
        ev.descripcion ||
        ev.actividad ||
        ev.tipo_nombre ||
        "",
      locaciones: ev.locaciones || {
        nombre: locName === "—" ? "Parada" : locName,
        direccion,
        localidades: locCity ? { localidad: locCity } : null,
      },
    };
  });
}

/**
 * Pasajeros CNRT / hoja de ruta a partir de la secuencia de boarding.
 * OFRN: nómina personal. FIMBA: intenta participantes de la propuesta (hasta plazas);
 * resto = filas sintéticas «plaza N».
 *
 * @returns {{ passengers: Array, gaps: string[] }}
 */
export function buildFimbaTransportPassengers(
  sequence,
  {
    transportId,
    ofrnPassengerById = null,
    participantesByPropuesta = null,
  } = {},
) {
  const gaps = [];
  const passengers = [];
  const tid = transportId != null ? Number(transportId) : null;

  for (const r of sequence?.ofrnRides || []) {
    const p =
      ofrnPassengerById?.get?.(String(r.id)) ||
      ofrnPassengerById?.get?.(Number(r.id)) ||
      null;
    const seats = Math.max(1, Number(r.seats) || 1);
    const base = {
      id: `ofrn-${r.id}`,
      apellido: (p?.apellido || r.apellido || "").toUpperCase(),
      nombre: p?.nombre || r.nombre || `Integrante ${r.id}`,
      dni: p?.dni || p?.documento || "",
      genero: p?.genero || "",
      fecha_nac: p?.fecha_nac || null,
      nacionalidad: p?.nacionalidad || "Argentina",
      logistics: {
        transports: [
          {
            id: tid,
            subidaId: r.subidaId,
            bajadaId: r.bajadaId,
          },
        ],
      },
    };
    passengers.push(base);
    // plaza_extra OFRN: asiento extra sin persona → fila sintética
    if (seats > 1) {
      for (let i = 1; i < seats; i += 1) {
        passengers.push({
          ...base,
          id: `ofrn-${r.id}-extra-${i}`,
          apellido: base.apellido,
          nombre: `${base.nombre} (plaza extra ${i})`,
          dni: "",
        });
      }
    }
  }

  for (const r of sequence?.fimbaRides || []) {
    const seats = Math.max(0, Number(r.seats) || 0);
    if (seats <= 0) continue;
    const propId = r.id_propuesta;
    const named =
      propId != null && participantesByPropuesta
        ? (participantesByPropuesta.get(String(propId)) ||
            participantesByPropuesta.get(Number(propId)) ||
            [])
            .filter((p) => p.activo !== false)
            .slice()
        : [];
    const artista =
      r.nombre ||
      (propId != null ? `Artista #${propId}` : "FIMBA");

    let used = 0;
    for (let i = 0; i < seats; i += 1) {
      const p = named[i] || null;
      if (p) {
        used += 1;
        passengers.push({
          id: `fimba-${propId || "x"}-${p.id}-${r.subidaId}-${i}`,
          apellido: String(p.apellido || "").toUpperCase(),
          nombre: p.nombre || "",
          dni: p.documento || "",
          genero:
            mapFimbaGeneroToSex(p.genero) === "F"
              ? "F"
              : mapFimbaGeneroToSex(p.genero) === "M"
                ? "M"
                : p.genero || "",
          fecha_nac: null,
          nacionalidad: "Argentina",
          logistics: {
            transports: [
              {
                id: tid,
                subidaId: r.subidaId,
                bajadaId: r.bajadaId,
              },
            ],
          },
        });
      } else {
        passengers.push({
          id: `fimba-syn-${propId || "x"}-${r.subidaId}-${i}`,
          apellido: String(artista).toUpperCase(),
          nombre: `Plaza ${i + 1} (sin nominar)`,
          dni: "",
          genero: "",
          fecha_nac: null,
          nacionalidad: "Argentina",
          logistics: {
            transports: [
              {
                id: tid,
                subidaId: r.subidaId,
                bajadaId: r.bajadaId,
              },
            ],
          },
        });
      }
    }
    if (seats > used) {
      gaps.push(
        `${artista}: ${seats - used} plaza(s) sin participante nominado en CNRT/hoja de ruta (abordaje FIMBA es por cantidad, no por persona).`,
      );
    } else if (named.length > seats) {
      gaps.push(
        `${artista}: hay más nominados (${named.length}) que plazas en bus (${seats}); CNRT usa solo las primeras ${seats} por apellido.`,
      );
    }
  }

  passengers.sort((a, b) =>
    `${a.apellido} ${a.nombre}`.localeCompare(
      `${b.apellido} ${b.nombre}`,
      "es",
      { sensitivity: "base" },
    ),
  );

  if (
    sequence?.fimbaRides?.length &&
    !gaps.some((g) => g.includes("abordaje FIMBA"))
  ) {
    // ensure at least one structural note when any fimba ride exists without full DNI coverage
    const missingDoc = passengers.filter(
      (p) => String(p.id).startsWith("fimba") && !p.dni,
    ).length;
    if (missingDoc > 0 && !gaps.length) {
      gaps.push(
        `${missingDoc} fila(s) FIMBA sin documento: el boarding es por plazas de artista.`,
      );
    }
  }

  return { passengers, gaps };
}

export async function exportFimbaCnrt(opts = {}) {
  const {
    vehiculo,
    sequence,
    startId,
    endId,
    exportFormat = "pdf",
    ofrnPassengerById = null,
    participantesByPropuesta = null,
  } = opts;
  const label = labelGiraTransporte(vehiculo) || `Vehiculo_${vehiculo?.id}`;
  const { passengers, gaps } = buildFimbaTransportPassengers(sequence, {
    transportId: vehiculo?.id,
    ofrnPassengerById,
    participantesByPropuesta,
  });
  if (!passengers.length) {
    alert(`No hay pasajeros para CNRT en ${label}.`);
    return { ok: false, gaps };
  }
  // Filtrar por rango de paradas: quien sube/baja en el tramo
  const events = sequenceEventsForExport(sequence);
  const sorted = [...events].sort((a, b) =>
    `${a.fecha}${a.hora_inicio}`.localeCompare(`${b.fecha}${b.hora_inicio}`),
  );
  const startIndex = sorted.findIndex((e) => String(e.id) === String(startId));
  const endIndex = sorted.findIndex((e) => String(e.id) === String(endId));
  let filtered = passengers;
  if (startIndex >= 0 && endIndex >= 0) {
    const rangeIds = new Set(
      sorted.slice(startIndex, endIndex + 1).map((e) => String(e.id)),
    );
    filtered = passengers.filter((p) => {
      const t = p.logistics?.transports?.[0];
      const up = t?.subidaId != null ? String(t.subidaId) : null;
      const down = t?.bajadaId != null ? String(t.bajadaId) : null;
      if (up && rangeIds.has(up)) return true;
      if (down && rangeIds.has(down)) return true;
      // a bordo durante el tramo
      if (up && down) {
        const upIdx = sorted.findIndex((e) => String(e.id) === up);
        const downIdx = sorted.findIndex((e) => String(e.id) === down);
        return upIdx <= endIndex && (downIdx < 0 || downIdx > startIndex);
      }
      return true;
    });
  }
  await downloadStyledPassengers(
    filtered,
    `CNRT_${label}`,
    exportFormat,
  );
  return { ok: true, gaps };
}

export async function exportFimbaParadas(opts = {}) {
  const { vehiculo, sequence, startId, endId, exportFormat = "pdf" } = opts;
  const label = labelGiraTransporte(vehiculo) || `Vehiculo_${vehiculo?.id}`;
  const events = sequenceEventsForExport(sequence);
  if (!events.length) {
    alert(`No hay paradas para exportar en ${label}.`);
    return false;
  }
  const sid = startId || events[0]?.id;
  const eid = endId || events[events.length - 1]?.id;
  if (exportFormat === "excel") {
    await generateStopsOnlyExcel(label, events, sid, eid);
  } else {
    await generateStopsOnlyPdf(label, events, sid, eid);
  }
  return true;
}

export async function exportFimbaHojaRuta(opts = {}) {
  const {
    vehiculo,
    sequence,
    startId,
    endId,
    exportFormat = "pdf",
    ofrnPassengerById = null,
    participantesByPropuesta = null,
  } = opts;
  const label = labelGiraTransporte(vehiculo) || `Vehiculo_${vehiculo?.id}`;
  const events = sequenceEventsForExport(sequence);
  const { passengers, gaps } = buildFimbaTransportPassengers(sequence, {
    transportId: vehiculo?.id,
    ofrnPassengerById,
    participantesByPropuesta,
  });
  const exportData = buildRoadmapExportData({
    events,
    passengers,
    startId,
    endId,
    alignViaticos: false,
    transportId: vehiculo?.id,
    routeRules: [],
  });
  if (exportFormat === "excel") {
    await generateRoadmapExcel(label, exportData, {});
  } else {
    await generateRoadmapPdf(label, exportData, {});
  }
  return { ok: true, gaps };
}

/** Índice id_propuesta → participantes activos (desde filas hotelería u otra fuente). */
export function indexParticipantesByPropuesta(hoteleriaRows = []) {
  const map = new Map();
  for (const r of hoteleriaRows || []) {
    const id = r.propuesta?.id ?? r.id_propuesta;
    if (id == null) continue;
    const list = (r.personas || r.participantes || []).filter(
      (p) => p.activo !== false,
    );
    map.set(String(id), list);
    map.set(Number(id), list);
  }
  return map;
}

export { DEFAULT_BEDS_PER_ROOM };
