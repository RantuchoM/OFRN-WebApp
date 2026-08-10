/**
 * Cron diario: reporte de asistencia a ensayos de ensamble (día ART).
 * Destinatarios por defecto: filarmonica.scrn@gmail.com, ofrn.archivo@gmail.com
 *
 * Cuerpo HTML:
 *  1) Resumen: N ensayos
 *  2) Novedades: tarde >5 min, ausentes, sin salida, GPS >200 m
 *  3) Detalle por ensayo (lista de convocados con llegada/salida)
 *
 * Auth: x-ensayo-diario-cron-secret | x-ensayo-salida-cron-secret | x-db-backup-cron-secret
 * Body opcional JSON: { "fecha": "YYYY-MM-DD" } (default: hoy ART)
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import nodemailer from "npm:nodemailer@6.9.7";
import { jsPDF } from "npm:jspdf@2.5.2";
import autoTableImport from "npm:jspdf-autotable@3.8.4";

// ESM interop: default o named según empaquetado de Deno
const autoTable =
  typeof autoTableImport === "function"
    ? autoTableImport
    : // deno-lint-ignore no-explicit-any
      (autoTableImport as any)?.default ??
      // deno-lint-ignore no-explicit-any
      (autoTableImport as any)?.autoTable;

const GMAIL_USER = Deno.env.get("GMAIL_USER");
const GMAIL_PASS = Deno.env.get("GMAIL_PASS");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET =
  Deno.env.get("ENSAYO_DIARIO_CRON_SECRET") ??
  Deno.env.get("ENSAYO_SALIDA_CRON_SECRET") ??
  Deno.env.get("DB_BACKUP_CRON_SECRET") ??
  "";
const APP_BASE = (
  Deno.env.get("APP_BASE_URL") ||
  Deno.env.get("FRONTEND_URL") ||
  "https://ofrn-web-app.vercel.app"
).replace(/\/$/, "");

const DEFAULT_TO = (
  Deno.env.get("ENSAYO_DIARIO_TO") ||
  "filarmonica.scrn@gmail.com,ofrn.archivo@gmail.com"
)
  .split(/[,;]+/)
  .map((s) => s.trim())
  .filter(Boolean);

const TIPO_ENSAYO = 13;
/** Novedad: llegada más de este umbral (min) tras hora_inicio. */
const TARDE_MIN = 5;
/** Novedad: distancia GPS a sede mayor a este umbral (m). */
const GEO_LEJOS_M = 200;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-ensayo-diario-cron-secret, x-ensayo-salida-cron-secret, x-db-backup-cron-secret",
};

function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function todayArDateStr(now = new Date()): string {
  const t = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const d = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatFechaEs(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  if (!y || !m || !d) return yyyyMmDd;
  try {
    return new Intl.DateTimeFormat("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(new Date(Date.UTC(y, m - 1, d)));
  } catch {
    return `${d}/${m}/${y}`;
  }
}

function timeToMinutes(hora: string | null | undefined): number {
  if (!hora) return NaN;
  const p = String(hora).slice(0, 8).split(":");
  const hh = Number(p[0]);
  const mm = Number(p[1] || 0);
  if (Number.isNaN(hh) || Number.isNaN(mm)) return NaN;
  return hh * 60 + mm;
}

/** Cara UTC del timestamptz = hora de pared. */
function formatHoraPared(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = String(iso).match(/T(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}`;
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "—";
    return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
  } catch {
    return "—";
  }
}

function personName(p: {
  apellido?: string | null;
  nombre?: string | null;
}): string {
  const ap = String(p.apellido || "").trim();
  const nom = String(p.nombre || "").trim();
  if (ap && nom) return `${ap}, ${nom}`;
  return ap || nom || "—";
}

function membershipActiveOnDate(
  row: { fecha_desde?: string | null; fecha_hasta?: string | null },
  fecha: string,
): boolean {
  if (!fecha) return false;
  const desde = row.fecha_desde ? String(row.fecha_desde).slice(0, 10) : null;
  const hasta = row.fecha_hasta ? String(row.fecha_hasta).slice(0, 10) : null;
  if (!desde) return false;
  if (fecha < desde) return false;
  if (hasta && fecha > hasta) return false;
  return true;
}

function ensambleLabels(ev: {
  eventos_ensambles?: Array<{
    ensambles?: { ensamble?: string | null } | null;
  }>;
}): string {
  const names = (ev.eventos_ensambles || [])
    .map((ee) => ee.ensambles?.ensamble)
    .filter(Boolean);
  return [...new Set(names)].join(", ") || "—";
}

function eventoTitulo(ev: {
  descripcion?: string | null;
  hora_inicio?: string | null;
  hora_fin?: string | null;
}): string {
  const desc = String(ev.descripcion || "").trim();
  const hi = String(ev.hora_inicio || "").slice(0, 5);
  const hf = String(ev.hora_fin || "").slice(0, 5);
  const horario = hi && hf && hf !== hi ? `${hi}–${hf}` : hi || hf || "";
  if (desc && horario) return `${desc} · ${horario}`;
  if (desc) return desc;
  return horario ? `Ensayo ${horario}` : "Ensayo de ensamble";
}

function sedeNombre(ev: {
  locaciones?: {
    nombre?: string | null;
    localidades?: { localidad?: string | null } | null;
  } | null;
}): string {
  const nom = ev.locaciones?.nombre?.trim();
  const loc = ev.locaciones?.localidades?.localidad?.trim();
  if (nom && loc) return `${nom} (${loc})`;
  return nom || loc || "—";
}

function haversineMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function resolveDistanciaM(
  checkin: {
    latitud?: number | null;
    longitud?: number | null;
    distancia_sede_m?: number | null;
    salida_latitud?: number | null;
    salida_longitud?: number | null;
    salida_distancia_sede_m?: number | null;
  } | null,
  ev: {
    locaciones?: { latitud?: number | null; longitud?: number | null } | null;
  },
  kind: "llegada" | "salida" = "llegada",
): number | null {
  if (!checkin) return null;
  const stored =
    kind === "salida"
      ? checkin.salida_distancia_sede_m
      : checkin.distancia_sede_m;
  if (stored != null && Number.isFinite(Number(stored))) return Number(stored);
  const lat =
    kind === "salida" ? Number(checkin.salida_latitud) : Number(checkin.latitud);
  const lng =
    kind === "salida"
      ? Number(checkin.salida_longitud)
      : Number(checkin.longitud);
  const slat = Number(ev.locaciones?.latitud);
  const slng = Number(ev.locaciones?.longitud);
  if (![lat, lng, slat, slng].every(Number.isFinite)) return null;
  return haversineMeters({ lat, lng }, { lat: slat, lng: slng });
}

function formatDist(m: number | null): string {
  if (m == null || !Number.isFinite(m)) return "";
  const n = Math.round(m);
  if (n < 1000) return `${n} m`;
  return `${(n / 1000).toFixed(1)} km`;
}

type Person = {
  id: number;
  apellido: string | null;
  nombre: string | null;
  instrumento: string;
};

type Checkin = {
  id_evento: number;
  id_integrante: number;
  registrado_at: string | null;
  salida_at: string | null;
  latitud?: number | null;
  longitud?: number | null;
  distancia_sede_m?: number | null;
  justificado?: boolean | null;
  editado_por_admin?: boolean | null;
  modo?: string | null;
  salida_latitud?: number | null;
  salida_longitud?: number | null;
  salida_distancia_sede_m?: number | null;
};

type Ev = {
  id: number;
  fecha: string;
  hora_inicio: string | null;
  hora_fin: string | null;
  descripcion: string | null;
  id_locacion: number | null;
  id_tipo_evento: number;
  is_deleted: boolean | null;
  eventos_ensambles?: Array<{
    id_ensamble: number;
    ensambles?: { id?: number; ensamble?: string | null } | null;
  }>;
  locaciones?: {
    id?: number;
    nombre?: string | null;
    latitud?: number | null;
    longitud?: number | null;
    localidades?: { localidad?: string | null } | null;
  } | null;
};

type Row = {
  person: Person;
  checkin: Checkin | null;
  customTipo: string | null;
  expected: boolean;
  lateMin: number | null;
  distM: number | null;
  isLate: boolean;
  isAbsent: boolean;
  noSalida: boolean;
  geoLejos: boolean;
  justificado: boolean;
};

function ulList(items: string[], empty: string): string {
  if (!items.length) {
    return `<p style="margin:4px 0 12px;color:#64748b;font-size:13px;">${esc(empty)}</p>`;
  }
  return `<ul style="margin:4px 0 14px 18px;padding:0;font-size:13px;line-height:1.5;">${items
    .map((t) => `<li style="margin:2px 0;">${t}</li>`)
    .join("")}</ul>`;
}

type ReportTableRow = {
  name: string;
  instr: string;
  llegada: string;
  salida: string;
  modo: string;
  isLate: boolean;
  noSalida: boolean;
  isAbsent: boolean;
  justificado: boolean;
};

type ReportContent = {
  fecha: string;
  fechaLabel: string;
  n: number;
  sumExpected: number;
  sumPresent: number;
  lateItems: string[];
  absentItems: string[];
  noCheckoutItems: string[];
  geoItems: string[];
  tables: Array<{
    title: string;
    subtitle: string;
    rows: ReportTableRow[];
  }>;
};

function assembleReportContent(params: {
  fecha: string;
  eventos: Ev[];
  rowsByEvent: Map<number, Row[]>;
}): ReportContent {
  const { fecha, eventos, rowsByEvent } = params;
  const n = eventos.length;
  const fechaLabel = formatFechaEs(fecha);
  const lateItems: string[] = [];
  const absentItems: string[] = [];
  const noCheckoutItems: string[] = [];
  const geoItems: string[] = [];
  let sumExpected = 0;
  let sumPresent = 0;
  const tables: ReportContent["tables"] = [];

  for (const ev of eventos) {
    const title = eventoTitulo(ev);
    const ens = ensambleLabels(ev);
    const rowsExpected = (rowsByEvent.get(Number(ev.id)) || []).filter(
      (r) => r.expected,
    );
    for (const row of rowsExpected) {
      sumExpected += 1;
      const name = personName(row.person);
      const instr = row.person.instrumento
        ? ` · ${row.person.instrumento}`
        : "";
      const ctx = `(${title}${ens !== "—" ? ` · ${ens}` : ""})`;
      if (row.checkin?.registrado_at || row.justificado) sumPresent += 1;
      if (row.isLate && row.lateMin != null) {
        lateItems.push(
          `${name}${instr} · +${row.lateMin} min (${formatHoraPared(row.checkin?.registrado_at)}) ${ctx}`,
        );
      }
      if (row.isAbsent) absentItems.push(`${name}${instr} ${ctx}`);
      if (row.noSalida) {
        noCheckoutItems.push(
          `${name}${instr} · llegada ${formatHoraPared(row.checkin?.registrado_at)} ${ctx}`,
        );
      }
      if (row.geoLejos && row.distM != null) {
        geoItems.push(
          `${name}${instr} · ${formatDist(row.distM)} de la sede ${ctx}`,
        );
      }
    }
    const present = rowsExpected.filter(
      (r) => r.checkin?.registrado_at || r.justificado,
    ).length;
    tables.push({
      title,
      subtitle: `${ens} · ${sedeNombre(ev)} · presentes ${present}/${rowsExpected.length}`,
      rows: rowsExpected.map((r) => {
        let llegada = "—";
        if (r.justificado) llegada = "Justificado";
        else if (r.checkin?.registrado_at) {
          llegada = formatHoraPared(r.checkin.registrado_at);
          if (r.geoLejos && r.distM != null) {
            llegada += ` (${formatDist(r.distM)})`;
          }
          if (r.isLate && r.lateMin != null) llegada += ` +${r.lateMin}′`;
        } else if (r.isAbsent) llegada = "Ausente";
        const salida =
          r.justificado && !r.checkin?.salida_at
            ? "—"
            : r.checkin?.salida_at
              ? formatHoraPared(r.checkin.salida_at)
              : r.checkin?.registrado_at
                ? "Sin salida"
                : "—";
        return {
          name: personName(r.person),
          instr: r.person.instrumento || "—",
          llegada,
          salida,
          modo: r.checkin?.modo ? String(r.checkin.modo) : "—",
          isLate: r.isLate,
          noSalida: r.noSalida,
          isAbsent: r.isAbsent,
          justificado: r.justificado,
        };
      }),
    });
  }

  const sortEs = (a: string, b: string) =>
    a.localeCompare(b, "es", { sensitivity: "base" });
  lateItems.sort(sortEs);
  absentItems.sort(sortEs);
  noCheckoutItems.sort(sortEs);
  geoItems.sort(sortEs);

  return {
    fecha,
    fechaLabel,
    n,
    sumExpected,
    sumPresent,
    lateItems,
    absentItems,
    noCheckoutItems,
    geoItems,
    tables,
  };
}

function buildHtml(content: ReportContent): string {
  const {
    n,
    fechaLabel,
    sumExpected,
    sumPresent,
    lateItems,
    absentItems,
    noCheckoutItems,
    geoItems,
    tables,
  } = content;

  const detailBlocks = tables
    .map((t) => {
      const bodyRows =
        t.rows.length === 0
          ? `<tr><td colspan="5" style="padding:8px;color:#94a3b8;font-size:12px;">Sin convocados / sin roster</td></tr>`
          : t.rows
              .map((r) => {
                let bg = "#fff";
                if (r.justificado) bg = "#f5f3ff";
                else if (r.isLate) bg = "#fef2f2";
                else if (r.isAbsent) bg = "#f8fafc";
                else if (r.llegada !== "—") bg = "#ecfdf5";
                const salidaBg = r.noSalida
                  ? "#fff7ed"
                  : r.salida !== "—" && r.salida !== "Sin salida"
                    ? "#ecfdf5"
                    : "#fff";
                return `<tr>
                  <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;">${esc(r.name)}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#64748b;">${esc(r.instr)}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;background:${bg};">${esc(r.llegada)}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:12px;background:${salidaBg};">${esc(r.salida)}</td>
                  <td style="padding:6px 8px;border-bottom:1px solid #e2e8f0;font-size:11px;color:#64748b;">${esc(r.modo)}</td>
                </tr>`;
              })
              .join("");

      return `
      <div style="margin:0 0 22px;">
        <h3 style="margin:0 0 4px;font-size:15px;color:#0f172a;">${esc(t.title)}</h3>
        <p style="margin:0 0 8px;font-size:12px;color:#64748b;">${esc(t.subtitle)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
          <thead>
            <tr style="background:#f1f5f9;">
              <th align="left" style="padding:7px 8px;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.03em;">Integrante</th>
              <th align="left" style="padding:7px 8px;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.03em;">Instr.</th>
              <th align="left" style="padding:7px 8px;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.03em;">Llegada</th>
              <th align="left" style="padding:7px 8px;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.03em;">Salida</th>
              <th align="left" style="padding:7px 8px;font-size:11px;color:#475569;text-transform:uppercase;letter-spacing:.03em;">Modo</th>
            </tr>
          </thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
    })
    .join("");

  const emptyDay =
    n === 0
      ? `<p style="font-size:14px;color:#64748b;">No hubo ensayos de ensamble registrados para esta fecha.</p>`
      : "";

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:720px;margin:0 auto;padding:20px 16px 40px;">
    <p style="margin:0 0 4px;font-size:11px;font-weight:bold;letter-spacing:.08em;text-transform:uppercase;color:#b45309;">OFRN · Asistencia a ensayos</p>
    <h1 style="margin:0 0 8px;font-size:22px;line-height:1.25;">
      ${n === 0 ? "Sin ensayos" : n === 1 ? "1 ensayo" : `${n} ensayos`}
      <span style="font-weight:normal;color:#64748b;font-size:16px;"> · ${esc(fechaLabel)}</span>
    </h1>
    ${
      n > 0
        ? `<p style="margin:0 0 18px;font-size:13px;color:#475569;">
      Convocados esperados: <strong>${sumExpected}</strong> ·
      Con registro de llegada o justificados: <strong>${sumPresent}</strong>
    </p>`
        : ""
    }
    ${emptyDay}
    ${
      n > 0
        ? `
    <div style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:14px 16px;margin-bottom:22px;">
      <h2 style="margin:0 0 10px;font-size:16px;color:#9a3412;">Novedades</h2>
      <p style="margin:0 0 2px;font-size:13px;font-weight:bold;color:#b91c1c;">Llegaron +${TARDE_MIN} min tarde (${lateItems.length})</p>
      ${ulList(lateItems.map(esc), "Ninguno.")}
      <p style="margin:0 0 2px;font-size:13px;font-weight:bold;color:#334155;">Ausentes (sin ingreso ni justificación) (${absentItems.length})</p>
      ${ulList(absentItems.map(esc), "Ninguno.")}
      <p style="margin:0 0 2px;font-size:13px;font-weight:bold;color:#c2410c;">No registraron salida (${noCheckoutItems.length})</p>
      ${ulList(noCheckoutItems.map(esc), "Ninguno.")}
      <p style="margin:0 0 2px;font-size:13px;font-weight:bold;color:#b45309;">Ubicación GPS &gt; ${GEO_LEJOS_M} m de la sede (${geoItems.length})</p>
      ${ulList(geoItems.map(esc), "Ninguno.")}
    </div>
    <h2 style="margin:0 0 12px;font-size:16px;color:#0f172a;">Detalle por ensayo</h2>
    ${detailBlocks}
    `
        : ""
    }
    <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;line-height:1.4;">
      Reporte automático OFRN · Gestión → Asistencia a ensayos ·
      <a href="${esc(APP_BASE)}/" style="color:#64748b;">Abrir app</a>
    </p>
  </div>
</body>
</html>`;
}

/** PDF adjunto con el mismo contenido (resumen + tablas). */
function buildPdf(content: ReportContent): Uint8Array {
  if (typeof autoTable !== "function") {
    throw new Error("jspdf-autotable no cargó (autoTable no es función)");
  }
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  let y = 16;

  const ensureSpace = (need: number) => {
    const pageH = doc.internal.pageSize.getHeight();
    if (y + need > pageH - 14) {
      doc.addPage();
      y = 16;
    }
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(180, 83, 9);
  doc.text("OFRN · ASISTENCIA A ENSAYOS", margin, y);
  y += 7;

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  const h1 =
    content.n === 0
      ? "Sin ensayos"
      : content.n === 1
        ? "1 ensayo"
        : `${content.n} ensayos`;
  doc.text(`${h1} · ${content.fechaLabel}`, margin, y);
  y += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(71, 85, 105);
  if (content.n > 0) {
    doc.text(
      `Convocados: ${content.sumExpected} · Con llegada o justificados: ${content.sumPresent}`,
      margin,
      y,
    );
    y += 8;
  } else {
    doc.text(
      "No hubo ensayos de ensamble registrados para esta fecha.",
      margin,
      y,
    );
    y += 8;
  }

  const writeList = (title: string, items: string[], color: [number, number, number]) => {
    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...color);
    doc.text(`${title} (${items.length})`, margin, y);
    y += 5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(51, 65, 85);
    if (!items.length) {
      doc.text("Ninguno.", margin + 2, y);
      y += 5;
      return;
    }
    for (const line of items) {
      const lines = doc.splitTextToSize(`• ${line}`, pageW - margin * 2 - 2);
      ensureSpace(lines.length * 4 + 2);
      doc.text(lines, margin + 2, y);
      y += lines.length * 4 + 1;
    }
    y += 2;
  };

  if (content.n > 0) {
    ensureSpace(10);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(154, 52, 18);
    doc.text("Novedades", margin, y);
    y += 7;

    writeList(
      `Llegaron +${TARDE_MIN} min tarde`,
      content.lateItems,
      [185, 28, 28],
    );
    writeList(
      "Ausentes (sin ingreso ni justificación)",
      content.absentItems,
      [51, 65, 85],
    );
    writeList(
      "No registraron salida",
      content.noCheckoutItems,
      [194, 65, 12],
    );
    writeList(
      `Ubicación GPS > ${GEO_LEJOS_M} m de la sede`,
      content.geoItems,
      [180, 83, 9],
    );

    ensureSpace(12);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text("Detalle por ensayo", margin, y);
    y += 6;

    for (const t of content.tables) {
      ensureSpace(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      const titleLines = doc.splitTextToSize(t.title, pageW - margin * 2);
      doc.text(titleLines, margin, y);
      y += titleLines.length * 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      const subLines = doc.splitTextToSize(t.subtitle, pageW - margin * 2);
      doc.text(subLines, margin, y);
      y += subLines.length * 3.5 + 2;

      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head: [["Integrante", "Instr.", "Llegada", "Salida", "Modo"]],
        body: t.rows.length
          ? t.rows.map((r) => [r.name, r.instr, r.llegada, r.salida, r.modo])
          : [["Sin convocados", "", "", "", ""]],
        styles: {
          fontSize: 8,
          cellPadding: 1.5,
          overflow: "linebreak",
        },
        headStyles: {
          fillColor: [241, 245, 249],
          textColor: [71, 85, 105],
          fontStyle: "bold",
        },
        columnStyles: {
          0: { cellWidth: 48 },
          1: { cellWidth: 28 },
          2: { cellWidth: 32 },
          3: { cellWidth: 28 },
          4: { cellWidth: 22 },
        },
        didParseCell: (data) => {
          if (data.section !== "body" || !t.rows.length) return;
          const row = t.rows[data.row.index];
          if (!row) return;
          if (data.column.index === 2) {
            if (row.justificado) data.cell.styles.fillColor = [245, 243, 255];
            else if (row.isLate) data.cell.styles.fillColor = [254, 242, 242];
            else if (row.isAbsent) data.cell.styles.fillColor = [248, 250, 252];
            else if (row.llegada !== "—") {
              data.cell.styles.fillColor = [236, 253, 245];
            }
          }
          if (data.column.index === 3 && row.noSalida) {
            data.cell.styles.fillColor = [255, 247, 237];
          }
        },
      });
      // deno-lint-ignore no-explicit-any
      y = ((doc as any).lastAutoTable?.finalY ?? y) + 8;
    }
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `OFRN · reporte automático · ${content.fecha} · pág. ${i}/${pageCount}`,
      margin,
      doc.internal.pageSize.getHeight() - 8,
    );
  }

  const ab = doc.output("arraybuffer");
  return new Uint8Array(ab);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (CRON_SECRET) {
    const hdr =
      req.headers.get("x-ensayo-diario-cron-secret") ??
      req.headers.get("x-ensayo-salida-cron-secret") ??
      req.headers.get("x-db-backup-cron-secret") ??
      "";
    if (hdr !== CRON_SECRET) {
      return new Response(JSON.stringify({ error: "No autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return new Response(JSON.stringify({ error: "Config incompleta" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let bodyFecha: string | null = null;
  let bodyTo: string[] | null = null;
  try {
    if (req.method === "POST") {
      const j = await req.json().catch(() => ({}));
      if (j?.fecha && /^\d{4}-\d{2}-\d{2}$/.test(String(j.fecha))) {
        bodyFecha = String(j.fecha);
      }
      if (j?.to != null) {
        const list = Array.isArray(j.to)
          ? j.to.map(String)
          : String(j.to).split(/[,;]+/);
        bodyTo = list.map((s) => s.trim()).filter(Boolean);
      }
    }
  } catch {
    /* ignore */
  }

  const fecha = bodyFecha || todayArDateStr();
  const recipients =
    bodyTo && bodyTo.length ? bodyTo : DEFAULT_TO;
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  const out = {
    fecha,
    ensayos: 0,
    enviados: 0,
    destinatarios: recipients,
    novedades: {
      tarde: 0,
      ausentes: 0,
      sin_salida: 0,
      geo_lejos: 0,
    },
    errores: [] as string[],
  };

  const { data: eventosRaw, error: evErr } = await supabase
    .from("eventos")
    .select(
      `
      id, fecha, hora_inicio, hora_fin, descripcion, id_locacion, id_tipo_evento, is_deleted,
      eventos_ensambles ( id_ensamble, ensambles ( id, ensamble ) ),
      locaciones ( id, nombre, latitud, longitud, localidades ( localidad ) )
    `,
    )
    .eq("id_tipo_evento", TIPO_ENSAYO)
    .eq("fecha", fecha)
    .or("is_deleted.is.null,is_deleted.eq.false")
    .order("hora_inicio", { ascending: true });

  if (evErr) {
    return new Response(JSON.stringify({ error: evErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const eventos = ((eventosRaw || []) as Ev[]).filter((e) => !e.is_deleted);
  out.ensayos = eventos.length;

  const eventIds = eventos.map((e) => Number(e.id));
  const ensambleIds = [
    ...new Set(
      eventos.flatMap((e) =>
        (e.eventos_ensambles || []).map((ee) => Number(ee.id_ensamble)),
      ),
    ),
  ].filter((n) => !Number.isNaN(n));

  let checkins: Checkin[] = [];
  let memberships: Array<{
    id_integrante: number;
    id_ensamble: number;
    fecha_desde?: string | null;
    fecha_hasta?: string | null;
    integrantes?: {
      id: number;
      apellido: string | null;
      nombre: string | null;
      id_instr?: number | null;
      instrumentos?: { instrumento?: string | null } | null;
    } | null;
  }> = [];
  let customs: Array<{
    id_evento: number;
    id_integrante: number;
    tipo: string;
  }> = [];
  let extraPeople: Person[] = [];

  if (eventIds.length) {
    const [
      { data: chk, error: cErr },
      { data: mem, error: mErr },
      { data: cust, error: cuErr },
    ] = await Promise.all([
      supabase
        .from("eventos_checkin_ensayo")
        .select(
          "id_evento, id_integrante, registrado_at, salida_at, latitud, longitud, distancia_sede_m, justificado, editado_por_admin, modo, salida_latitud, salida_longitud, salida_distancia_sede_m",
        )
        .in("id_evento", eventIds),
      ensambleIds.length
        ? supabase
            .from("integrantes_ensambles")
            .select(
              "id_integrante, id_ensamble, fecha_desde, fecha_hasta, integrantes ( id, apellido, nombre, id_instr, instrumentos ( instrumento ) )",
            )
            .in("id_ensamble", ensambleIds)
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from("eventos_asistencia_custom")
        .select("id_evento, id_integrante, tipo")
        .in("id_evento", eventIds),
    ]);
    if (cErr) out.errores.push(`checkins: ${cErr.message}`);
    if (mErr) out.errores.push(`memberships: ${mErr.message}`);
    if (cuErr) out.errores.push(`customs: ${cuErr.message}`);
    checkins = (chk || []) as Checkin[];
    memberships = (mem || []) as typeof memberships;
    customs = (cust || []) as typeof customs;

    // Integrantes con check-in o custom fuera del roster de ensamble
    const known = new Set(
      memberships.map((m) => Number(m.integrantes?.id || m.id_integrante)),
    );
    const needIds = new Set<number>();
    for (const c of checkins) {
      if (!known.has(Number(c.id_integrante))) needIds.add(Number(c.id_integrante));
    }
    for (const c of customs) {
      if (!known.has(Number(c.id_integrante))) needIds.add(Number(c.id_integrante));
    }
    if (needIds.size) {
      const { data: extra, error: eErr } = await supabase
        .from("integrantes")
        .select("id, apellido, nombre, id_instr, instrumentos ( instrumento )")
        .in("id", [...needIds]);
      if (eErr) out.errores.push(`extra integrantes: ${eErr.message}`);
      extraPeople = (extra || []).map((i) => ({
        id: Number(i.id),
        apellido: i.apellido,
        nombre: i.nombre,
        instrumento:
          (i as { instrumentos?: { instrumento?: string } }).instrumentos
            ?.instrumento || "",
      }));
    }
  }

  const personById = new Map<number, Person>();
  for (const m of memberships) {
    const i = m.integrantes;
    if (!i?.id) continue;
    const id = Number(i.id);
    if (!personById.has(id)) {
      personById.set(id, {
        id,
        apellido: i.apellido,
        nombre: i.nombre,
        instrumento: i.instrumentos?.instrumento || "",
      });
    }
  }
  for (const p of extraPeople) personById.set(p.id, p);

  const checkinMap = new Map<string, Checkin>();
  for (const c of checkins) {
    checkinMap.set(`${Number(c.id_evento)}-${Number(c.id_integrante)}`, c);
  }

  const customMap = new Map<string, string>();
  for (const c of customs) {
    customMap.set(
      `${Number(c.id_evento)}-${Number(c.id_integrante)}`,
      String(c.tipo || ""),
    );
  }

  const ensamblesByEvent = new Map<number, number[]>();
  for (const ev of eventos) {
    ensamblesByEvent.set(
      Number(ev.id),
      (ev.eventos_ensambles || []).map((ee) => Number(ee.id_ensamble)),
    );
  }

  const membByIntegrante = new Map<
    number,
    Array<{
      id_ensamble: number;
      fecha_desde?: string | null;
      fecha_hasta?: string | null;
    }>
  >();
  for (const m of memberships) {
    const id = Number(m.id_integrante);
    if (!membByIntegrante.has(id)) membByIntegrante.set(id, []);
    membByIntegrante.get(id)!.push({
      id_ensamble: Number(m.id_ensamble),
      fecha_desde: m.fecha_desde,
      fecha_hasta: m.fecha_hasta,
    });
  }

  function isExpected(ev: Ev, idIntegrante: number): {
    expected: boolean;
    customTipo: string | null;
  } {
    const key = `${Number(ev.id)}-${idIntegrante}`;
    const custom = customMap.get(key) || null;
    if (custom === "ausente") return { expected: false, customTipo: custom };
    if (custom === "adicional" || custom === "invitado") {
      return { expected: true, customTipo: custom };
    }
    const ensIds = new Set(ensamblesByEvent.get(Number(ev.id)) || []);
    if (!ensIds.size) return { expected: false, customTipo: custom };
    const membs = membByIntegrante.get(idIntegrante) || [];
    const ok = membs.some(
      (m) =>
        ensIds.has(Number(m.id_ensamble)) &&
        membershipActiveOnDate(m, ev.fecha),
    );
    return { expected: ok, customTipo: custom };
  }

  const rowsByEvent = new Map<number, Row[]>();

  for (const ev of eventos) {
    const ids = new Set<number>();
    // todos con membresía a ensambles del evento
    for (const ensId of ensamblesByEvent.get(Number(ev.id)) || []) {
      for (const m of memberships) {
        if (Number(m.id_ensamble) === ensId) ids.add(Number(m.id_integrante));
      }
    }
    // customs y checkins del evento
    for (const c of customs) {
      if (Number(c.id_evento) === Number(ev.id)) ids.add(Number(c.id_integrante));
    }
    for (const c of checkins) {
      if (Number(c.id_evento) === Number(ev.id)) ids.add(Number(c.id_integrante));
    }

    const rows: Row[] = [];
    for (const idIntegrante of ids) {
      const person = personById.get(idIntegrante) || {
        id: idIntegrante,
        apellido: `#${idIntegrante}`,
        nombre: "",
        instrumento: "",
      };
      const { expected, customTipo } = isExpected(ev, idIntegrante);
      const checkin =
        checkinMap.get(`${Number(ev.id)}-${idIntegrante}`) || null;
      const justificado = !!checkin?.justificado;
      let lateMin: number | null = null;
      if (checkin?.registrado_at && !justificado) {
        const hi = timeToMinutes(ev.hora_inicio);
        const li = timeToMinutes(formatHoraPared(checkin.registrado_at));
        if (Number.isFinite(hi) && Number.isFinite(li)) lateMin = li - hi;
      }
      const distM = resolveDistanciaM(checkin, ev, "llegada");
      const isLate = lateMin != null && lateMin > TARDE_MIN;
      const isAbsent =
        expected && !justificado && !checkin?.registrado_at;
      const noSalida =
        expected &&
        !justificado &&
        !!checkin?.registrado_at &&
        !checkin?.salida_at;
      const geoLejos =
        !justificado && distM != null && distM > GEO_LEJOS_M;

      rows.push({
        person,
        checkin,
        customTipo,
        expected,
        lateMin,
        distM,
        isLate,
        isAbsent,
        noSalida,
        geoLejos,
        justificado,
      });
    }

    rows.sort((a, b) =>
      personName(a.person).localeCompare(personName(b.person), "es", {
        sensitivity: "base",
      }),
    );
    rowsByEvent.set(Number(ev.id), rows);

    for (const r of rows) {
      if (!r.expected) continue;
      if (r.isLate) out.novedades.tarde += 1;
      if (r.isAbsent) out.novedades.ausentes += 1;
      if (r.noSalida) out.novedades.sin_salida += 1;
      if (r.geoLejos) out.novedades.geo_lejos += 1;
    }
  }

  const report = assembleReportContent({ fecha, eventos, rowsByEvent });
  let html: string;
  let pdfBytes: Uint8Array;
  try {
    html = buildHtml(report);
    pdfBytes = buildPdf(report);
  } catch (e) {
    out.errores.push(`render: ${(e as Error).message}`);
    return new Response(JSON.stringify({ ...out, ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const subject =
    eventos.length === 0
      ? `Asistencia ensayos · ${fecha} · sin ensayos`
      : eventos.length === 1
        ? `Asistencia ensayos · ${fecha} · 1 ensayo`
        : `Asistencia ensayos · ${fecha} · ${eventos.length} ensayos`;

  if (!GMAIL_USER || !GMAIL_PASS) {
    out.errores.push("GMAIL_USER/GMAIL_PASS no configurados");
    return new Response(
      JSON.stringify({
        ...out,
        ok: false,
        html_len: html.length,
        pdf_bytes: pdfBytes.length,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  if (!recipients.length) {
    return new Response(JSON.stringify({ ...out, ok: false, error: "sin destinatarios" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
    await transporter.sendMail({
      from: `"Filarmónica SCRN · Reportes" <${GMAIL_USER}>`,
      replyTo: "filarmonica.scrn@gmail.com",
      to: recipients.join(", "),
      subject,
      html,
      attachments: [
        {
          filename: `${fecha}-asistencia-ensayos.pdf`,
          content: pdfBytes,
          contentType: "application/pdf",
        },
      ],
    });
    out.enviados = recipients.length;
    (out as { pdf_bytes?: number }).pdf_bytes = pdfBytes.length;
  } catch (e) {
    out.errores.push(`mail: ${(e as Error).message}`);
    return new Response(JSON.stringify({ ...out, ok: false }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ...out, ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
