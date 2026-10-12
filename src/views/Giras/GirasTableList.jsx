import React, { useEffect, useMemo, useState } from "react";
import { format, isPast, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  IconAlertTriangle,
  IconCalendar,
  IconEdit,
  IconMapPin,
  IconMusic,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";
import AppNavLink from "../../components/ui/AppNavLink";
import LocacionNombreSpan from "../../components/locations/LocacionNombreSpan";
import RepertoireManager from "../../components/repertoire/RepertoireManager";
import { getProgramStyle } from "../../utils/giraUtils";
import { enqueueOrganicoRefresh } from "../../services/organicoConvocadoService";
import GiraActionMenu from "./GiraActionMenu";
import StagePlotViewerModal from "./StagePlotViewerModal";

const GRID_COLS =
  "grid-cols-[5.25rem_6.75rem_7.25rem_minmax(7rem,11rem)_minmax(11rem,2fr)_minmax(7rem,0.7fr)_minmax(11rem,13rem)_7.5rem] items-start gap-x-3";

const iconBtnClass =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-black/5 bg-white/80 shadow-sm transition-colors";

const normalizeFamily = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const isProductionFamily = (value) => normalizeFamily(value) === "produccion";

const sliceTime = (value) => {
  if (value == null || value === "") return "";
  const s = String(value);
  return s.length >= 5 ? s.slice(0, 5) : s;
};

const formatDateRangeBig = (start, end) => {
  if (!start) return null;
  try {
    const d1 = parseISO(String(start).slice(0, 10));
    const d2 = end ? parseISO(String(end).slice(0, 10)) : d1;
    return {
      d1: format(d1, "dd"),
      m1: format(d1, "MMM", { locale: es }).toUpperCase(),
      d2: format(d2, "dd"),
      m2: format(d2, "MMM", { locale: es }).toUpperCase(),
    };
  } catch {
    return null;
  }
};

const isConcertPast = (fecha, horaInicio) => {
  if (!fecha) return false;
  try {
    const time = sliceTime(horaInicio) || "23:59";
    return isPast(parseISO(`${String(fecha).slice(0, 10)}T${time}`));
  } catch {
    try {
      return isPast(parseISO(String(fecha).slice(0, 10)));
    } catch {
      return false;
    }
  }
};

const styleToken = (color, regex, fallback) =>
  String(color || "").match(regex)?.[0] || fallback;

function programConcerts(gira) {
  return (gira.eventos || [])
    .filter(
      (e) =>
        !e.is_deleted &&
        (e.tipos_evento?.nombre?.toLowerCase().includes("concierto") ||
          e.tipos_evento?.nombre?.toLowerCase().includes("función")),
    )
    .sort((a, b) =>
      `${a.fecha || ""}${a.hora_inicio || ""}`.localeCompare(
        `${b.fecha || ""}${b.hora_inicio || ""}`,
      ),
    );
}

function personLabel(row) {
  const apellido = row.integrantes?.apellido || "";
  const inicial = row.integrantes?.nombre?.[0] || "";
  const label = `${apellido}${inicial ? ` ${inicial}.` : ""}`.trim();
  return label;
}

function confirmedByRole(gira, rol) {
  return (gira.giras_integrantes || [])
    .filter((r) => r.rol === rol && r.estado === "confirmado")
    .map(personLabel)
    .filter(Boolean);
}

function sourceEntries(gira, ensemblesList) {
  const ensembleMap = new Map(
    (Array.isArray(ensemblesList) ? ensemblesList : []).map((e) => [
      String(e.value),
      e.label,
    ]),
  );
  const entries = [];
  for (const source of gira.giras_fuentes || []) {
    if (source.tipo === "FAMILIA" && isProductionFamily(source.valor_texto)) {
      continue;
    }
    const isEnsemble =
      source.tipo === "ENSAMBLE" || source.tipo === "EXCL_ENSAMBLE";
    const label = isEnsemble
      ? ensembleMap.get(String(source.valor_id)) || `Ensamble ${source.valor_id ?? ""}`
      : source.valor_texto;
    if (label == null || String(label).trim() === "") continue;
    entries.push({
      id: source.id,
      label: String(label).trim(),
      excluded: source.tipo === "EXCL_ENSAMBLE",
    });
  }
  entries.sort((a, b) => Number(a.excluded) - Number(b.excluded));
  return entries;
}

function HeaderPair({ top, bottom }) {
  return (
    <div className="min-w-0 leading-tight">
      <div className="truncate text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {top}
      </div>
      <div className="truncate text-[10px] font-medium text-slate-400">
        {bottom}
      </div>
    </div>
  );
}

function Line({ children, title, className = "", placeholder = "—" }) {
  const tip = typeof children === "string" ? children : title;
  return (
    <div className={`truncate ${className}`} title={tip || undefined}>
      {children || placeholder || "\u00a0"}
    </div>
  );
}

function GiraTableRow({
  gira,
  updateView,
  isEditor,
  isPersonal,
  userRole,
  startEdit,
  setGlobalCommentsGiraId,
  activeMenuId,
  setActiveMenuId,
  ensemblesList,
  supabase,
  onMove,
  onDuplicate,
  onDelete,
  isHighlighted,
  showRepertoire = false,
  expandAllConcerts = false,
}) {
  const { isDifusion, isTechnician, isManagement, isAdmin } = useAuth();
  const [organicoText, setOrganicoText] = useState(
    gira.organico_convocado || "",
  );
  const [organicoPending, setOrganicoPending] = useState(
    !gira.organico_convocado_at,
  );
  const [repertoireLocal, setRepertoireLocal] = useState(null);
  const [concertsLocal, setConcertsLocal] = useState(null);
  const [showStagePlotViewer, setShowStagePlotViewer] = useState(false);
  const repertoireOpen = repertoireLocal ?? showRepertoire;
  const concertsOpen = concertsLocal ?? expandAllConcerts;

  useEffect(() => {
    setRepertoireLocal(null);
  }, [showRepertoire]);

  useEffect(() => {
    setConcertsLocal(null);
  }, [expandAllConcerts]);

  useEffect(() => {
    setOrganicoText(gira.organico_convocado || "");
    setOrganicoPending(!gira.organico_convocado_at);
  }, [gira.id, gira.organico_convocado, gira.organico_convocado_at]);

  useEffect(() => {
    if (gira.organico_convocado_at) return undefined;
    let cancelled = false;
    enqueueOrganicoRefresh(
      supabase,
      {
        id: gira.id,
        fecha_desde: gira.fecha_desde,
        fecha_hasta: gira.fecha_hasta,
      },
      (snap) => {
        if (cancelled || !snap) return;
        setOrganicoText(snap.text || "");
        setOrganicoPending(false);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [
    supabase,
    gira.id,
    gira.fecha_desde,
    gira.fecha_hasta,
    gira.organico_convocado_at,
  ]);
  const isMenuOpen = activeMenuId === gira.id;
  const isDifusionRole = userRole?.toLowerCase().trim() === "difusion";
  const canViewStagePlot = Boolean(
    (isEditor || isTechnician || isManagement || isAdmin) && !isDifusionRole,
  );

  const programStyle = getProgramStyle(gira.tipo);
  const borderColorClass = styleToken(
    programStyle.color,
    /border-[\w-]+-\d+/,
    "border-slate-300",
  );
  const typeColorClass = styleToken(
    programStyle.color,
    /text-[\w-]+-\d+/,
    "text-slate-700",
  );

  const rowTone =
    gira.estado === "Pausada"
      ? "bg-amber-50 text-amber-900 opacity-75"
      : gira.estado === "Borrador"
        ? `bg-slate-50 text-slate-600 ${borderColorClass}`
        : programStyle.color;
  const stickyBg =
    gira.estado === "Pausada"
      ? "bg-amber-50"
      : gira.estado === "Borrador"
        ? "bg-slate-50"
        : styleToken(programStyle.color, /bg-[\w-]+/, "bg-white");

  const concerts = useMemo(() => programConcerts(gira), [gira]);
  const directors = confirmedByRole(gira, "director").join(" · ");
  const soloists = confirmedByRole(gira, "solista").join(" · ");
  const sources = sourceEntries(gira, ensemblesList);
  const localities = (gira.giras_localidades || [])
    .map((row) => row.localidades?.localidad)
    .filter(Boolean)
    .join(", ");
  const nomen = [gira.mes_letra, gira.nomenclador].filter(Boolean).join(" ");
  const dateInfo = formatDateRangeBig(gira.fecha_desde, gira.fecha_hasta);
  const dateColorClass =
    gira.estado === "Pausada" ? "text-amber-900" : typeColorClass;
  const agendaView = isDifusion ? "DIFUSION" : "AGENDA";

  const handleViewChange = (mode, tab) => {
    setActiveMenuId(null);
    updateView(mode, gira.id, tab);
  };

  return (
    <div
      id={`gira-card-${gira.id}`}
      className={`border-b border-black/10 border-l-4 ${borderColorClass} ${rowTone} ${
        isMenuOpen ? "relative z-50" : "relative z-0"
      } ${isHighlighted ? "ring-2 ring-inset ring-indigo-400" : ""}`}
    >
      <div className={`flex items-start px-2 py-1.5 md:grid ${GRID_COLS}`}>
        <div className="min-w-0 flex-1 md:contents">
        <div className="grid grid-cols-4 items-start gap-x-1.5 md:contents">
        <div className="flex min-w-0 flex-col items-center justify-center rounded-lg border border-black/5 bg-white/60 px-0.5 py-1 md:min-w-[3.75rem] md:px-1">
          {dateInfo ? (
            <>
              <span
                className={`text-base font-black leading-none md:text-lg ${dateColorClass}`}
              >
                {dateInfo.d1 === dateInfo.d2
                  ? dateInfo.d1
                  : `${dateInfo.d1}-${dateInfo.d2}`}
              </span>
              <span className="text-[10px] font-bold uppercase leading-tight opacity-60">
                {dateInfo.m1}
                {dateInfo.m2 !== dateInfo.m1 ? ` - ${dateInfo.m2}` : ""}
              </span>
            </>
          ) : (
            <span className="text-[11px] text-slate-300">—</span>
          )}
        </div>

        <div className="min-w-0 leading-tight">
          <div className="flex min-w-0 items-center gap-1">
            <span
              className={`truncate text-xs font-bold uppercase tracking-wide ${typeColorClass}`}
              title={gira.tipo || ""}
            >
              {programStyle.label || gira.tipo || "—"}
            </span>
            {gira.estado && gira.estado !== "Vigente" && (
              <span className="shrink-0 rounded border border-current px-1 text-[8px] font-bold uppercase leading-tight text-slate-500">
                {gira.estado.slice(0, 3)}
              </span>
            )}
          </div>
          {nomen ? (
            <span
              className={`mt-0.5 inline-flex max-w-full truncate rounded border bg-white/60 px-1.5 text-[10px] font-medium ${borderColorClass} ${typeColorClass}`}
              title={nomen}
            >
              {nomen}
            </span>
          ) : (
            <span className="mt-0.5 text-[11px] text-slate-300">—</span>
          )}
        </div>

        <div className="min-w-0 leading-tight">
          <Line className="text-xs font-semibold text-slate-800">
            {gira.zona}
          </Line>
          <div
            className="mt-0.5 flex min-w-0 items-center gap-1 text-[11px] opacity-70"
            title={localities || "Sin localía"}
          >
            <IconMapPin size={10} className="shrink-0" />
            <span className="truncate">{localities || "Sin localía"}</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] leading-tight">
          {sources.length === 0 ? (
            <span className="text-slate-300">—</span>
          ) : (
            sources.map((source, index) => (
              <React.Fragment key={source.id ?? `${source.label}-${index}`}>
                {index > 0 && <span className="opacity-30">|</span>}
                <span
                  className={`font-medium ${
                    source.excluded ? "text-slate-400 line-through" : ""
                  }`}
                >
                  {source.label}
                </span>
              </React.Fragment>
            ))
          )}
        </div>
        </div>

        <div className="mt-1.5 flex w-full flex-col items-center text-center md:contents md:text-left">
        <AppNavLink
          giraId={gira.id}
          view={agendaView}
          className="w-full min-w-0 leading-tight text-center md:text-left"
        >
          <Line className="text-center text-sm font-bold text-slate-800 md:text-left">
            {gira.nombre_gira}
          </Line>
          <Line
            className={`mt-0.5 text-center text-[11px] italic text-slate-500 md:text-left ${
              gira.subtitulo ? "" : "hidden md:block"
            }`}
            placeholder=""
          >
            {gira.subtitulo}
          </Line>
        </AppNavLink>

        <div className="w-full min-w-0 leading-tight text-center md:text-left">
          <Line
            className={`text-center text-xs font-semibold md:text-left ${
              directors ? "text-indigo-700" : "hidden text-slate-300 md:block"
            }`}
          >
            {directors}
          </Line>
          <Line
            className={`mt-0.5 text-center text-[11px] md:text-left ${
              soloists ? "text-fuchsia-700" : "hidden text-slate-300 md:block"
            }`}
          >
            {soloists}
          </Line>
        </div>
        </div>

        <div className="hidden min-w-0 leading-tight md:block">
          <div
            className="truncate text-[11px] font-semibold text-slate-800"
            title={organicoText || undefined}
          >
            {organicoPending ? "…" : organicoText || "—"}
          </div>
        </div>
        </div>

        <div
          className={`flex shrink-0 flex-col items-center gap-0.5 pl-0.5 md:sticky md:right-0 md:z-10 md:flex-row md:items-start md:justify-end md:self-stretch md:pl-1 ${stickyBg}`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="order-1 md:order-3">
          <GiraActionMenu
            gira={gira}
            onViewChange={handleViewChange}
            isEditor={isEditor}
            isPersonal={isPersonal}
            isDifusion={isDifusion}
            userRole={userRole}
            onEdit={() => startEdit(gira)}
            onDelete={onDelete}
            onGlobalComments={() => setGlobalCommentsGiraId(gira.id)}
            isOpen={isMenuOpen}
            onToggle={() => setActiveMenuId(isMenuOpen ? null : gira.id)}
            onClose={() => setActiveMenuId(null)}
            onMove={() => onMove(gira)}
            onDuplicate={() => onDuplicate(gira)}
            onViewStagePlot={
              canViewStagePlot ? () => setShowStagePlotViewer(true) : undefined
            }
          />
          </div>
          <button
            type="button"
            onClick={() => setRepertoireLocal((open) => !(open ?? showRepertoire))}
            className={`${iconBtnClass} order-2 md:order-1 ${
              repertoireOpen
                ? "text-indigo-600"
                : "text-slate-500 hover:text-indigo-600"
            }`}
            title={repertoireOpen ? "Ocultar repertorio" : "Ver repertorio"}
            aria-pressed={repertoireOpen}
          >
            <IconMusic size={14} />
          </button>
          <button
            type="button"
            onClick={() =>
              setConcertsLocal((open) => !(open ?? expandAllConcerts))
            }
            className={`${iconBtnClass} order-3 md:order-2 ${
              concertsOpen
                ? "text-indigo-600"
                : "text-slate-500 hover:text-indigo-600"
            } ${concerts.length === 0 ? "opacity-40" : ""}`}
            title={
              concerts.length === 0
                ? "Sin conciertos"
                : concertsOpen
                  ? "Ocultar conciertos"
                  : "Ver conciertos"
            }
            aria-pressed={concertsOpen}
            disabled={concerts.length === 0}
          >
            <IconCalendar size={14} />
          </button>
        </div>
      </div>

      {concerts.length === 0 && gira.tipo === "Comisión" ? (
        <div className="border-t border-black/5 py-0.5 pl-14 pr-3 text-[11px] text-slate-400">
          Sin conciertos
        </div>
      ) : concerts.length === 0 ? (
        <div className="flex items-center gap-2 border-t border-black/5 py-1 pl-14 pr-3 text-[11px] font-semibold text-amber-800">
          <IconAlertTriangle size={12} className="shrink-0" />
          Sin conciertos
          {isEditor && (
            <button
              type="button"
              onClick={() => startEdit(gira, { focusSection: "conciertos" })}
              className="rounded p-0.5 hover:bg-amber-100"
              title="Cargar conciertos"
              aria-label="Cargar conciertos"
            >
              <IconEdit size={12} />
            </button>
          )}
        </div>
      ) : concertsOpen ? (
        <ul className="space-y-0.5 border-t border-black/5 py-1 pl-14 pr-3">
          {concerts.map((concert) => {
            const past = isConcertPast(concert.fecha, concert.hora_inicio);
            const time = sliceTime(concert.hora_inicio);
            let when = "—";
            try {
              when = format(parseISO(String(concert.fecha).slice(0, 10)), "dd/MM EEE", {
                locale: es,
              });
            } catch {
              when = concert.fecha || "—";
            }
            return (
              <li
                key={concert.id}
                className={`flex min-w-0 items-baseline gap-2 text-[11px] ${past ? "text-slate-400" : "text-slate-600"}`}
              >
                <span className="w-[7.75rem] shrink-0 font-mono text-[10px]">
                  {when}
                  {time ? ` ${time}` : ""}
                </span>
                <span className="min-w-0 truncate">
                  <LocacionNombreSpan
                    nombre={concert.locaciones?.nombre}
                    idLocacion={concert.id_locacion}
                    locacion={concert.locaciones}
                  />
                  {concert.locaciones?.localidades?.localidad
                    ? ` · ${concert.locaciones.localidades.localidad}`
                    : ""}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}

      {repertoireOpen && (
        <div className="relative z-20 min-w-0 border-t border-black/5 bg-white/50 p-2">
          <RepertoireManager
            supabase={supabase}
            programId={gira.id}
            giraId={gira.id}
            isCompact={false}
            readOnly={!isEditor}
          />
        </div>
      )}

      {showStagePlotViewer && (
        <StagePlotViewerModal
          open
          onClose={() => setShowStagePlotViewer(false)}
          supabase={supabase}
          gira={gira}
          evento={null}
        />
      )}
    </div>
  );
}

export default function GirasTableList({
  giras,
  rowProps,
  canEditGira,
  highlightedGiraId,
  onDeleteGira,
  showRepertoire = false,
  expandAllConcerts = false,
}) {
  return (
    <div className="w-full min-w-0 overflow-visible rounded-xl border border-slate-200 bg-white shadow-sm md:min-w-[920px]">
      <div
        className={`sticky top-0 z-20 hidden border-b border-l-4 border-slate-200 border-l-transparent bg-slate-50 px-2 py-1.5 md:grid ${GRID_COLS}`}
      >
        <HeaderPair top="Fecha desde" bottom="Fecha hasta" />
        <HeaderPair top="Tipo" bottom="Nomenclador" />
        <HeaderPair top="Zona" bottom="Localía/s" />
        <div className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400">
          Ensambles
          <span className="block font-medium normal-case tracking-normal">
            / Familia
          </span>
        </div>
        <HeaderPair top="Título" bottom="Subtítulo" />
        <HeaderPair top="Directores" bottom="Solistas" />
        <div className="text-[10px] font-bold uppercase leading-tight tracking-wide text-slate-400">
          Orgánico
        </div>
        <div className="sticky right-0 bg-slate-50" />
      </div>
      {giras.map((gira) => (
        <GiraTableRow
          key={gira.id}
          gira={gira}
          {...rowProps}
          isEditor={canEditGira(gira)}
          isHighlighted={
            highlightedGiraId && String(gira.id) === String(highlightedGiraId)
          }
          onDelete={() => onDeleteGira(gira)}
          showRepertoire={showRepertoire}
          expandAllConcerts={expandAllConcerts}
        />
      ))}
    </div>
  );
}
