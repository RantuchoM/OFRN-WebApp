import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "entradas_theme_mode";

function readEntradasThemeIsDark() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light") return false;
  return true;
}

let entradasRouteRefCount = 0;

/** Desactiva la inversión global de OFRN mientras dura Entradas (tema propio). */
function useIsolateFromGlobalDarkMode() {
  useEffect(() => {
    entradasRouteRefCount += 1;
    document.documentElement.classList.add("entradas-route");
    return () => {
      entradasRouteRefCount -= 1;
      if (entradasRouteRefCount <= 0) {
        entradasRouteRefCount = 0;
        document.documentElement.classList.remove("entradas-route");
      }
    };
  }, []);
}

export const ENTRADAS_LOGO_URL =
  "https://filarmonica.rionegro.gov.ar/wp-content/uploads/2025/11/logo-filarmonica-2026-negativo.png";

export function useEntradasDarkMode() {
  useIsolateFromGlobalDarkMode();
  const [isDark, setIsDark] = useState(readEntradasThemeIsDark);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isDark ? "dark" : "light");
  }, [isDark]);

  const toggle = useCallback(() => setIsDark((v) => !v), []);

  return { isDark, toggle, setIsDark };
}

const SHELL = "entradas-app entradas-interactive";
const SHELL_DARK = "entradas-app entradas-app--dark";

/** Clases base reutilizables para modo claro/oscuro en Entradas (estilo Filarmónica RN). */
export function entradasUi(isDark) {
  const d = isDark;
  const ix = "entradas-interactive";
  const lift = "entradas-card-lift";
  return {
    shell: d ? `${SHELL_DARK} min-h-screen` : `${SHELL} min-h-screen`,
    page: d
      ? `${SHELL_DARK} min-h-screen bg-slate-900 text-slate-100`
      : `${SHELL} min-h-screen bg-[#f6f8fa] text-[#333333]`,
    header: d
      ? `bg-slate-800/95 border-b border-slate-700 backdrop-blur-sm ${ix}`
      : `bg-white/95 border-b border-[#e8eaed] backdrop-blur-sm shadow-sm ${ix}`,
    logoWrap: d ? "shrink-0" : "shrink-0 rounded-md bg-black px-2 py-1",
    title: `entradas-font-title text-xl font-bold ${d ? "text-slate-100" : "text-[#333333]"}`,
    subtitle: `entradas-font-detail text-sm ${d ? "text-slate-400" : "text-[#8b8d94]"}`,
    navTab: "entradas-nav-tab entradas-font-title",
    navIdle: `${ix} entradas-nav-tab entradas-font-title ${d ? "bg-slate-800 border border-slate-600 text-slate-200 hover:border-[#1ebbf0]/40" : "bg-white border border-[#e8eaed] text-[#333333] hover:border-[#1ebbf0]/50 hover:text-[#0e7490]"}`,
    navActive: `entradas-nav-active ${ix} entradas-nav-tab entradas-font-title`,
    section: `${lift} ${d ? "bg-slate-800 rounded-lg border border-slate-700 shadow-sm" : "bg-white rounded-lg border border-[#e8eaed] shadow-sm"}`,
    sectionTitle: `entradas-font-title text-sm font-black uppercase tracking-wide ${d ? "text-slate-400" : "text-slate-500"}`,
    programaLocalidad: `entradas-font-detail mb-0.5 text-[11px] leading-tight ${d ? "text-slate-500" : "text-slate-500"}`,
    programaTitle: `entradas-programa-title entradas-font-title text-lg font-bold tracking-wide leading-snug ${d ? "text-slate-100" : "text-slate-900"}`,
    card: `${lift} ${ix} ${d ? "rounded-lg border border-slate-600 bg-slate-800/80" : "rounded-lg border border-[#e8eaed] bg-white"}`,
    cardMuted: d
      ? "rounded-xl border border-slate-600 bg-slate-800/50"
      : "rounded-xl border border-slate-200 bg-slate-50/80",
    cardInner: d
      ? "entradas-programa-card border border-slate-600 bg-slate-800"
      : "entradas-programa-card border border-slate-200 bg-white",
    cardCancelada: d
      ? "rounded-xl border border-rose-900/60 bg-rose-950/50"
      : "rounded-xl border border-rose-200 bg-rose-50/90",
    textMuted: `entradas-font-detail ${d ? "text-slate-400" : "text-slate-500"}`,
    textBody: `entradas-font-detail ${d ? "text-slate-200" : "text-slate-800"}`,
    textSoft: `entradas-font-detail ${d ? "text-slate-300" : "text-slate-600"}`,
    textStrong: `entradas-font-title font-bold ${d ? "text-slate-100" : "text-slate-900"}`,
    label: `entradas-font-title text-xs font-bold uppercase tracking-wide ${d ? "text-slate-400" : "text-slate-500"}`,
    input:
      d
        ? "w-full rounded-lg border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 text-sm placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-900"
        : "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100",
    inputInline:
      d
        ? "rounded-lg border border-slate-600 bg-slate-900 text-slate-100 px-3 py-2 text-sm"
        : "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800",
    select: d
      ? "min-w-0 rounded-lg border border-slate-600 bg-slate-900 px-2 py-2.5 text-sm font-medium text-slate-100"
      : "min-w-0 rounded-lg border border-slate-300 bg-white px-2 py-2.5 text-sm font-medium text-slate-800",
    checkbox: d ? "rounded border-slate-500 bg-slate-900" : "rounded border-slate-300",
    inset: d
      ? "rounded-lg bg-slate-900/70 border border-slate-600 px-3 py-2 text-sm text-slate-200"
      : "rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-800",
    insetPanel: d
      ? "rounded-lg border border-slate-600 bg-slate-900/50 p-3 space-y-2"
      : "rounded-lg border border-slate-200 bg-slate-50/80 p-3 space-y-2",
    divider: d ? "border-slate-700" : "border-slate-200",
    dividerLight: d ? "border-slate-600" : "border-slate-100",
    linkBox: d
      ? "rounded-md bg-[#0c4a6e]/50 border border-[#1ebbf0]/35 px-3 py-2 text-xs text-sky-200 break-all"
      : "rounded-md bg-[#1ebbf0]/8 border border-[#1ebbf0]/25 px-3 py-2 text-xs text-[#0c4a6e] break-all",
    accentEyebrow: "entradas-font-title text-[10px] font-black uppercase tracking-wide entradas-accent-text",
    warningBox: d
      ? "text-sm text-amber-200 bg-amber-950/50 border border-amber-800 rounded-lg px-3 py-2"
      : "text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2",
    btnPrimary: `entradas-btn-primary entradas-interactive w-full rounded-md py-2.5 text-sm font-bold`,
    btnSolid: d
      ? "entradas-interactive w-full rounded-md border border-slate-600 bg-slate-800 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
      : "entradas-interactive w-full rounded-md border border-[#333333] bg-[#333333] py-2.5 text-sm font-semibold text-white hover:bg-[#111111] disabled:opacity-50",
    btnGhost: `entradas-btn-ghost ${ix} ${d ? "rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700" : "rounded-md border border-[#e8eaed] bg-white px-3 py-2 text-sm font-semibold text-[#333333] hover:bg-[#f6f8fa]"}`,
    btnIcon: d
      ? "p-2 rounded-lg border border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700"
      : "p-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100",
    btnIconDanger: d
      ? "p-2 rounded-lg border border-rose-800 bg-slate-800 text-rose-300 hover:bg-rose-950"
      : "p-2 rounded-lg border border-rose-200 bg-white text-rose-700 hover:bg-rose-50",
    btnSecondary: `entradas-btn-secondary entradas-interactive rounded-md px-3 py-2 text-xs font-bold`,
    btnDanger: d
      ? "border border-rose-800 bg-rose-950 text-rose-200 hover:bg-rose-900"
      : "border border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100",
    btnSuccess: `entradas-btn-primary entradas-interactive w-full rounded-md py-3 text-sm font-bold`,
    btnIndigoSmall: d
      ? "rounded-md border border-fixed-indigo-500 bg-fixed-indigo-950 px-2.5 py-1.5 text-xs font-bold text-fixed-indigo-50 hover:bg-fixed-indigo-900"
      : "rounded-md border border-indigo-300 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100",
    btnDashed: d
      ? "inline-flex items-center justify-center rounded-xl border-2 border-dashed border-fixed-indigo-500 bg-slate-800 px-4 py-2.5 text-sm font-bold text-fixed-indigo-200 shadow-sm hover:bg-fixed-indigo-950/60 transition-colors"
      : "inline-flex items-center justify-center rounded-xl border-2 border-dashed border-indigo-300 bg-white px-4 py-2.5 text-sm font-bold text-indigo-800 shadow-sm hover:bg-indigo-50/80 transition-colors",
    adminTabIdle: `${ix} entradas-nav-tab entradas-font-title ${d ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700"}`,
    adminTabActive: `entradas-nav-active ${ix} entradas-nav-tab entradas-font-title px-3 py-2`,
    tableWrap: d ? "overflow-x-auto rounded-xl border border-slate-700" : "overflow-x-auto rounded-xl border border-slate-200",
    tableHead: d
      ? "entradas-font-title bg-slate-900 text-left text-[10px] font-black uppercase tracking-wide text-slate-400 border-b border-slate-700"
      : "entradas-font-title bg-slate-50 text-left text-[10px] font-black uppercase tracking-wide text-slate-500 border-b border-slate-200",
    tableRow: d ? "border-b border-slate-700 last:border-0 align-top" : "border-b border-slate-100 last:border-0 align-top",
    catalogConciertoCardWrap: (selected) =>
      d
        ? `entradas-concierto-card overflow-hidden border-2 bg-slate-800 ${
            selected
              ? "border-[#1ebbf0] shadow-md ring-1 ring-[#1ebbf0]/30"
              : "border-slate-600 hover:border-[#1ebbf0]/60"
          }`
        : `entradas-concierto-card overflow-hidden border-2 bg-white ${
            selected
              ? "border-[#1ebbf0] shadow-md ring-1 ring-[#1ebbf0]/25"
              : "border-[#e8eaed] hover:border-[#1ebbf0]/50"
          }`,
    catalogConciertoCardBody: d
      ? "entradas-interactive w-full text-left border-0 bg-transparent px-3 py-2 hover:bg-slate-700/40"
      : "entradas-interactive w-full text-left border-0 bg-transparent px-3 py-2 hover:bg-slate-50",
    catalogConciertoBtn: (selected) =>
      d
        ? `entradas-concierto-card entradas-interactive w-full text-left border-2 px-3 py-2 bg-slate-800 ${
            selected ? "border-[#1ebbf0] shadow-md ring-1 ring-[#1ebbf0]/30" : "border-slate-600 hover:border-[#1ebbf0]/60"
          }`
        : `entradas-concierto-card entradas-interactive w-full text-left border-2 px-3 py-2 bg-white ${
            selected ? "border-[#1ebbf0] shadow-md ring-1 ring-[#1ebbf0]/25" : "border-[#e8eaed] hover:border-[#1ebbf0]/50"
          }`,
    badgeSelected: d
      ? "text-[10px] font-bold uppercase tracking-wide text-[#7dd3fc] border-2 border-[#1ebbf0] rounded px-1.5 py-0.5 bg-slate-800"
      : "text-[10px] font-bold uppercase tracking-wide text-[#0e7490] border-2 border-[#1ebbf0] rounded px-1.5 py-0.5 bg-white",
    badgeReserva: d
      ? "text-[10px] font-bold uppercase tracking-wide text-emerald-300 bg-emerald-950 border border-emerald-800 rounded px-1.5 py-0.5"
      : "text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5",
    /** Botón “ya tenés entrada” suelto (fuera de tarjeta de concierto). */
    reservaActivaBox: d
      ? "rounded-md border border-emerald-800/45 bg-emerald-950/30 px-2.5 py-2 w-full text-left cursor-pointer hover:bg-emerald-950/55"
      : "rounded-md border border-emerald-200/90 bg-emerald-50/70 px-2.5 py-2 w-full text-left cursor-pointer hover:bg-emerald-50",
    /** Franja superior dentro de la tarjeta del concierto (mismo borde exterior). */
    reservaActivaBoxEnTarjeta: d
      ? "border-0 border-b border-emerald-800/50 bg-emerald-950/35 px-3 py-2 w-full text-left cursor-pointer rounded-none hover:bg-emerald-950/55"
      : "border-0 border-b border-emerald-200/90 bg-emerald-50/80 px-3 py-2 w-full text-left cursor-pointer rounded-none hover:bg-emerald-100/80",
    badgeRecordatorio: d
      ? "text-[10px] font-bold uppercase tracking-wide text-sky-200 bg-sky-950/80 border border-[#1ebbf0]/50 rounded px-1.5 py-0.5"
      : "text-[10px] font-bold uppercase tracking-wide text-[#0e7490] bg-[#1ebbf0]/10 border border-[#1ebbf0]/40 rounded px-1.5 py-0.5",
    adminStatCard: (tone) => {
      const cards = {
        reservadas: d
          ? "border-sky-700 bg-sky-950/80 text-sky-100"
          : "border-indigo-200 bg-indigo-50 text-indigo-900",
        disponibles: d
          ? "border-emerald-800 bg-emerald-950/80 text-emerald-100"
          : "border-emerald-200 bg-emerald-50 text-emerald-900",
        ingresadas: d
          ? "border-amber-800 bg-amber-950/80 text-amber-100"
          : "border-amber-200 bg-amber-50 text-amber-900",
        noUtilizadas: d
          ? "border-slate-600 bg-slate-800/90 text-slate-200"
          : "border-slate-300 bg-slate-100 text-slate-700",
        recordatorio: d
          ? "border-violet-800 bg-violet-950/80 text-violet-100"
          : "border-violet-200 bg-violet-50 text-violet-900",
      };
      return cards[tone] || "";
    },
    adminStatLabel: (tone) => {
      const labels = {
        reservadas: d ? "font-bold text-sky-200" : "font-bold text-indigo-800",
        disponibles: d ? "font-bold text-emerald-200" : "font-bold text-emerald-800",
        ingresadas: d ? "font-bold text-amber-200" : "font-bold text-amber-800",
        noUtilizadas: "font-bold",
        recordatorio: d ? "font-bold text-violet-200" : "font-bold text-violet-800",
      };
      return labels[tone] || "font-bold";
    },
    adminMailBucketBtn: (tone) => {
      const base =
        "entradas-interactive rounded-md border px-2.5 py-1.5 text-[11px] font-bold disabled:opacity-50";
      const tones = {
        reservaron: d
          ? "border-sky-700 bg-sky-950 text-sky-100 hover:bg-sky-900"
          : "border-sky-200 bg-white text-sky-900 hover:bg-sky-50",
        ingresaron: d
          ? "border-emerald-800 bg-emerald-950 text-emerald-100 hover:bg-emerald-900"
          : "border-emerald-200 bg-white text-emerald-900 hover:bg-emerald-50/80",
        sinIngreso: d
          ? "border-amber-800 bg-amber-950 text-amber-100 hover:bg-amber-900"
          : "border-amber-200 bg-white text-amber-900 hover:bg-amber-50/80",
        recordatorio: d
          ? "border-violet-800 bg-violet-950 text-violet-100 hover:bg-violet-900"
          : "border-violet-200 bg-white text-violet-900 hover:bg-violet-50/80",
      };
      return `${base} ${tones[tone] || tones.reservaron}`;
    },
    recepcionCamera: d
      ? "flex w-[20%] min-w-0 max-w-[20%] shrink-0 items-center justify-center rounded-lg border border-slate-600 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-40"
      : "flex w-[20%] min-w-0 max-w-[20%] shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100 disabled:opacity-40",
    recepcionAmber: d
      ? "min-w-0 flex-1 rounded-xl border border-amber-800 bg-amber-950/50 px-3 py-3 shadow-sm"
      : "min-w-0 flex-1 rounded-xl border border-amber-200 bg-amber-50/90 px-3 py-3 shadow-sm",
    recepcionEmerald: d
      ? "flex shrink-0 flex-col justify-center rounded-xl border border-emerald-800 bg-emerald-950/50 px-4 py-3 shadow-sm sm:w-[42%] sm:max-w-[220px]"
      : "flex shrink-0 flex-col justify-center rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 shadow-sm sm:w-[42%] sm:max-w-[220px]",
    recepcionTotal: d
      ? "rounded-xl border border-slate-600 bg-slate-800/90 px-4 py-3 shadow-sm"
      : "rounded-xl border border-slate-300 bg-slate-100/95 px-4 py-3 shadow-sm",
    recepcionStatTitle: (tone) => {
      const tones = {
        amber: d ? "text-amber-200" : "text-amber-900",
        emerald: d ? "text-emerald-200" : "text-emerald-900",
      };
      return `entradas-font-title text-[10px] font-black uppercase tracking-wide ${tones[tone] || tones.amber}`;
    },
    recepcionStatHint: (tone) => {
      const tones = {
        emerald: d ? "text-emerald-300/90" : "text-emerald-900/80",
        slate: d ? "text-slate-400" : "text-slate-600",
      };
      return `entradas-font-detail text-[10px] text-center font-medium ${tones[tone] || tones.slate}`;
    },
    recepcionQrValue: d
      ? "text-3xl font-black tabular-nums text-emerald-100"
      : "text-3xl font-black tabular-nums text-emerald-950",
    recepcionQrSep: d
      ? "mx-0.5 text-2xl font-black text-emerald-400/80"
      : "mx-0.5 text-2xl font-black text-emerald-700/75",
    recepcionTotalValue: d
      ? "text-3xl font-black tabular-nums text-slate-100"
      : "text-3xl font-black tabular-nums text-slate-900",
    recepcionTotalSep: d
      ? "mx-0.5 text-2xl font-black text-slate-400"
      : "mx-0.5 text-2xl font-black text-slate-500",
    contextBox: d
      ? "rounded-lg border border-fixed-indigo-700 bg-fixed-indigo-950/40 px-3 py-2.5 space-y-2"
      : "rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-2.5 space-y-2",
    editorHighlight: d
      ? "rounded-xl border-2 border-fixed-indigo-500 bg-slate-800 p-4 space-y-3"
      : "rounded-xl border-2 border-indigo-300 bg-white p-4 space-y-3",
    filterScroll: d
      ? "rounded-lg border border-slate-600 bg-slate-900 p-2 max-h-44 overflow-y-auto space-y-1.5"
      : "rounded-lg border border-slate-200 bg-white p-2 max-h-44 overflow-y-auto space-y-1.5",
    filterLabel: d
      ? "flex items-start gap-2 cursor-pointer text-xs text-slate-300 hover:bg-slate-800 rounded px-1 py-0.5"
      : "flex items-start gap-2 cursor-pointer text-xs text-slate-700 hover:bg-slate-50 rounded px-1 py-0.5",
    countdown: d
      ? "rounded-md bg-[#0c4a6e]/60 border border-[#1ebbf0]/40 text-sky-100"
      : "rounded-md bg-[#1ebbf0]/10 border border-[#1ebbf0]/30 text-[#0c4a6e]",
    headerAction: `${ix} inline-flex h-9 shrink-0 items-center justify-center rounded-sm border transition-colors`,
    themeToggle: d
      ? "w-9 border-slate-600 bg-slate-700 text-fixed-indigo-300 hover:bg-slate-600"
      : "w-9 border-slate-300 bg-slate-100 text-orange-500 hover:bg-slate-200",
    logout: d
      ? "px-3 border-slate-600 text-slate-200 hover:bg-slate-700"
      : "px-3 border-slate-300 text-slate-700 hover:bg-slate-50",
    richtextBorder: d ? "mt-2 border-t border-slate-600 pt-2" : "mt-2 border-t border-slate-100 pt-2",
    imgBorder: d ? "border border-slate-600" : "border border-slate-200",
  };
}

export function entradaUsuarioRolRowClass(rol, isDark = false) {
  const r = String(rol || "personal").toLowerCase();
  if (r === "admin") {
    return isDark ? "bg-amber-950/40 border-l-4 border-l-amber-600" : "bg-amber-50/90 border-l-4 border-l-amber-500";
  }
  if (r === "recepcionista") {
    return isDark ? "bg-emerald-950/40 border-l-4 border-l-emerald-600" : "bg-emerald-50/90 border-l-4 border-l-emerald-500";
  }
  return isDark ? "bg-slate-800 border-l-4 border-l-slate-600" : "bg-white border-l-4 border-l-slate-200";
}

export function entradaUsuarioRolLabelClass(rol, isDark = false) {
  const r = String(rol || "personal").toLowerCase();
  if (r === "admin") {
    return isDark ? "bg-amber-950 text-amber-200 border-amber-800" : "bg-amber-100 text-amber-900 border-amber-200";
  }
  if (r === "recepcionista") {
    return isDark ? "bg-emerald-950 text-emerald-200 border-emerald-800" : "bg-emerald-100 text-emerald-900 border-emerald-200";
  }
  return isDark ? "bg-slate-700 text-slate-200 border-slate-600" : "bg-slate-100 text-slate-700 border-slate-200";
}

export function recepcionPanelClass(p, isDark = false) {
  if (!p) return isDark ? "bg-slate-800 border-slate-600" : "bg-slate-50 border-slate-200";
  if (!p.ok) {
    if (p.reason === "concierto_distinto") {
      return isDark ? "bg-orange-950/80 border-orange-700" : "bg-orange-50/95 border-orange-300";
    }
    return isDark ? "bg-rose-950/80 border-rose-800" : "bg-rose-50/95 border-rose-200";
  }
  if (p.tipo === "entrada") {
    if (p.reserva_estado && p.reserva_estado !== "activa") {
      return isDark ? "bg-orange-950/80 border-orange-700" : "bg-orange-100/95 border-orange-300";
    }
    if (p.estado_ingreso === "ingresada") {
      return isDark ? "bg-orange-950/80 border-orange-700" : "bg-orange-100/95 border-orange-300";
    }
    return isDark ? "bg-emerald-950/80 border-emerald-700" : "bg-emerald-100/95 border-emerald-300";
  }
  if (p.tipo === "reserva") {
    if (p.reserva_estado === "cancelada" || p.pendientes === 0) {
      return isDark ? "bg-orange-950/80 border-orange-700" : "bg-orange-100/95 border-orange-300";
    }
    if (p.ingresadas > 0 && p.pendientes > 0) {
      return isDark ? "bg-sky-950/80 border-sky-700" : "bg-sky-100/95 border-sky-400";
    }
    return isDark ? "bg-emerald-950/80 border-emerald-700" : "bg-emerald-100/95 border-emerald-300";
  }
  return isDark ? "bg-slate-800 border-slate-600" : "bg-slate-100 border-slate-200";
}
