import React, { useState, useRef } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  IconCalendar,
  IconMapPin,
  IconDrive,
  IconUtensils,
  IconMusic,
  IconUsers,
  IconChevronDown,
  IconList,
} from "../../components/ui/Icons";
import CommentButton from "../../components/comments/CommentButton";
import RepertoireManager from "../../components/repertoire/RepertoireManager";
import GiraActionMenu from "./GiraActionMenu";
import { getProgramStyle } from "../../utils/giraUtils";

// --- HELPERS ---
const formatDateRangeBig = (start, end) => {
  if (!start) return null;
  try {
    const d1 = parseISO(start);
    const d2 = end ? parseISO(end) : d1;
    return {
      d1: format(d1, "dd"),
      m1: format(d1, "MMM", { locale: es }).toUpperCase(),
      d2: format(d2, "dd"),
      m2: format(d2, "MMM", { locale: es }).toUpperCase(),
      year: format(d1, "yyyy"),
    };
  } catch (e) {
    return null;
  }
};

const formatDate = (dateString) => {
  if (!dateString) return "-";
  const [y, m, d] = dateString.split("-");
  return `${d}/${m}`;
};

export default function GiraCard({
  gira,
  updateView,
  isEditor,
  isPersonal,
  userRole,
  startEdit,
  setGlobalCommentsGiraId,
  setCommentsState,
  activeMenuId,
  setActiveMenuId,
  showRepertoireInCards,
  ensemblesList,
  supabase,
  onMove,
  onDuplicate,
  onDelete,
  isHighlighted,
}) {
  const isMenuOpen = activeMenuId === gira.id;
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef(null);

  // Determinar si mostramos la barra lateral (No editores)
  const showQuickAccessSidebar = !isEditor;

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const width = scrollRef.current.offsetWidth;
      const index = Math.round(scrollLeft / width);
      setCurrentSlide(index);
    }
  };

  // Función para mover el slider con las flechas
  const scrollSlide = (direction) => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollBy({
        left: width * direction,
        behavior: "smooth",
      });
    }
  };

  const baseStyle = getProgramStyle(gira.tipo);

  let cardClasses = baseStyle.color;
  if (gira.estado === "Pausada") {
    cardClasses = "bg-amber-50 border-amber-300 text-amber-900 opacity-75";
  } else if (gira.estado === "Borrador") {
    cardClasses = "bg-slate-50 border-slate-300 text-slate-600";
  }

  const titleColorClass =
    gira.estado === "Vigente"
      ? baseStyle.color.match(/text-[\w]+-\d+/)?.[0] || "text-slate-800"
      : "text-current";
  const dateInfo = formatDateRangeBig(gira.fecha_desde, gira.fecha_hasta);

  // --- CONTENIDO SLIDES ---
  const renderPersonnelCompact = () => {
    const roster = gira.giras_integrantes || [];
    const directors = roster.filter(
      (r) => r.rol === "director" && r.estado === "confirmado",
    );
    const soloists = roster.filter(
      (r) => r.rol === "solista" && r.estado === "confirmado",
    );
    const getName = (p) =>
      `${p.integrantes?.apellido} ${p.integrantes?.nombre?.[0] || ""}.`;

    const sources = gira.giras_fuentes || [];
    const safeEnsembles = Array.isArray(ensemblesList) ? ensemblesList : [];
    const ensembleMap = new Map(
      safeEnsembles.map((e) => [String(e.value), e.label]),
    );

    return (
      <div className="flex flex-col h-full justify-center space-y-3 text-xs">
        {directors.length > 0 && (
          <div className="flex gap-2 items-baseline">
            <span className="font-bold opacity-60 w-12 shrink-0 text-[10px] uppercase">
              Dir.
            </span>
            <span className="font-bold truncate">
              {directors.map(getName).join(", ")}
            </span>
          </div>
        )}
        {soloists.length > 0 && (
          <div className="flex gap-2 items-baseline">
            <span className="font-bold opacity-60 w-12 shrink-0 text-[10px] uppercase">
              Solista
            </span>
            <span className="font-medium truncate">
              {soloists.map(getName).join(", ")}
            </span>
          </div>
        )}
        {sources.length > 0 && (
          <div className="flex gap-2 items-start">
            <span className="font-bold opacity-60 w-12 shrink-0 text-[10px] uppercase pt-0.5">
              Org.
            </span>
            <div className="flex flex-wrap gap-1">
              {sources.map((s) => {
                let lbl =
                  s.tipo === "FAMILIA"
                    ? s.valor_texto
                    : ensembleMap.get(String(s.valor_id)) || "Ens.";
                return (
                  <span
                    key={s.id}
                    className={`text-[10px] px-1.5 rounded border bg-white/60 border-current opacity-80 ${s.tipo === "EXCL_ENSAMBLE" ? "line-through opacity-50" : ""}`}
                  >
                    {lbl}
                  </span>
                );
              })}
            </div>
          </div>
        )}
        {directors.length === 0 &&
          soloists.length === 0 &&
          sources.length === 0 && (
            <p className="opacity-50 italic text-center">Sin asignaciones</p>
          )}
      </div>
    );
  };

  const renderConcertsCompact = () => {
    const concerts = (gira.eventos || [])
      .filter(
        (e) =>
          e.tipos_evento?.nombre?.toLowerCase().includes("concierto") ||
          e.tipos_evento?.nombre?.toLowerCase().includes("función"),
      )
      .sort((a, b) =>
        (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
      );

    if (concerts.length === 0)
      return (
        <div className="text-center opacity-50 text-xs mt-4">
          Sin conciertos
        </div>
      );

    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {concerts.map((c, idx) => (
            <div
              key={idx}
              className="flex gap-3 items-center p-1.5 bg-white/60 rounded border border-black/5"
            >
              <div className="bg-white/80 px-1.5 py-0.5 rounded border border-black/10 text-center min-w-[36px]">
                <span className="block text-[9px] font-black opacity-50 uppercase">
                  {format(parseISO(c.fecha), "MMM", { locale: es })}
                </span>
                <span className="block text-xs font-bold">
                  {format(parseISO(c.fecha), "dd")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold truncate">
                  {c.locaciones?.nombre || "TBA"}
                </div>
                <div className="text-[10px] opacity-70 truncate">
                  {c.locaciones?.localidades?.localidad} •{" "}
                  {c.hora_inicio.slice(0, 5)}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div
          className="text-[10px] text-center opacity-60 mt-1 pt-1 border-t border-black/5 cursor-pointer"
          onClick={() => updateView("AGENDA", gira.id)}
        >
          Ver Agenda Completa
        </div>
      </div>
    );
  };

  // --- HELPERS DESKTOP (Sin cambios) ---
  const getPersonnelDisplayDesktop = () => {
    const roster = gira.giras_integrantes || [];
    const directors = roster.filter(
      (r) => r.rol === "director" && r.estado === "confirmado",
    );
    const soloists = roster.filter(
      (r) => r.rol === "solista" && r.estado === "confirmado",
    );
    const formatName = (p) =>
      `${p.integrantes?.apellido || ""}, ${p.integrantes?.nombre || ""}`;
    const cleanNames = (arr) =>
      arr.map(formatName).filter((n) => n.trim() !== ",");

    let output = [];
    if (cleanNames(directors).length > 0)
      output.push(
        <span key="dir" className="font-semibold text-fixed-indigo-700">
          Dir: {cleanNames(directors).join(" | ")}
        </span>,
      );
    if (cleanNames(soloists).length > 0)
      output.push(
        <span key="sol" className="font-semibold text-fuchsia-700">
          Solista/s: {cleanNames(soloists).join(" | ")}
        </span>,
      );
    return output.length > 0 ? output : null;
  };

  const getSourcesDisplayDesktop = () => {
    const sources = gira.giras_fuentes || [];
    const safeEnsemblesList = Array.isArray(ensemblesList) ? ensemblesList : [];
    const ensembleMap = new Map(
      safeEnsemblesList.map((e) => [String(e.value), e.label]),
    );
    const inclusions = [];
    const exclusions = [];

    sources.forEach((s) => {
      let label = "";
      if (s.tipo === "ENSAMBLE")
        label = ensembleMap.get(String(s.valor_id)) || `Ensamble ${s.valor_id}`;
      else if (s.tipo === "FAMILIA") label = s.valor_texto;

      const element = (
        <span
          key={s.id}
          className={
            s.tipo === "EXCL_ENSAMBLE"
              ? "text-gray-500 font-medium line-through"
              : "text-black-700 font-medium"
          }
        >
          {label}
        </span>
      );
      if (s.tipo === "EXCL_ENSAMBLE") {
        let exclLabel =
          ensembleMap.get(String(s.valor_id)) || `Ensamble ${s.valor_id}`;
        exclusions.push(
          <span key={s.id} className="text-gray-500 font-medium line-through">
            {exclLabel}
          </span>,
        );
      } else inclusions.push(element);
    });

    if (inclusions.length === 0 && exclusions.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ml-2 pl-2 border-l border-black/10 shrink-0">
        {inclusions.reduce(
          (acc, curr, idx) =>
            idx === 0
              ? [curr]
              : [
                  ...acc,
                  <span key={`s${idx}`} className="opacity-30">
                    |
                  </span>,
                  curr,
                ],
          [],
        )}
        {exclusions.length > 0 && (
          <>
            <span className="opacity-30">|</span>
            {exclusions}
          </>
        )}
      </div>
    );
  };

  const getConcertListDesktop = () => {
    const concerts = (gira.eventos || [])
      .filter(
        (e) =>
          e.tipos_evento?.nombre?.toLowerCase().includes("concierto") ||
          e.tipos_evento?.nombre?.toLowerCase().includes("función"),
      )
      .sort((a, b) =>
        (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio),
      );
    if (concerts.length === 0) return null;
    return (
      <div className="text-xs space-y-1 mt-2 border-t border-black/5 pt-2">
        <ul className="pl-1 space-y-0.5">
          {concerts.slice(0, 3).map((c, idx) => (
            <li
              key={idx}
              className="opacity-70 truncate max-w-full flex items-center gap-1"
            >
              <span className="font-mono text-[10px] mr-1 bg-white/60 px-1 rounded border border-black/10">
                {formatDate(c.fecha)} - {c.hora_inicio.slice(0, 5)}
              </span>
              {`${c.locaciones?.nombre || ""} | ${c.locaciones?.localidades?.localidad || ""}`}
            </li>
          ))}
          {concerts.length > 3 && (
            <li className="opacity-50 italic text-[10px] pt-1">
              y {concerts.length - 3} evento(s) más.
            </li>
          )}
        </ul>
      </div>
    );
  };

  const locs = gira.giras_localidades
    ?.map((l) => l.localidades?.localidad)
    .join(", ");

  return (
    <div
      id={`gira-card-${gira.id}`}
      className={`
        relative rounded-xl border p-0 overflow-visible 
        transition-all duration-700 ease-out
        ${isMenuOpen ? "z-50" : "z-0"} 
        ${cardClasses}
        ${isHighlighted ? "ring-4 ring-offset-2 ring-indigo-200 z-40" : "shadow-sm hover:shadow-md"}
      `}
    >
      {/* ============================================================ */}
      {/* VISTA MÓVIL (MD:HIDDEN)                                      */}
      {/* ============================================================ */}
      <div className="md:hidden">
        {/* --- SIDEBAR DE ACCESOS RÁPIDOS (DERECHA) --- */}
        {showQuickAccessSidebar ? (
          <div className="absolute right-0 top-0 h-40 w-11 bg-white/40 backdrop-blur-sm border-l border-black/5 flex flex-col items-center justify-evenly py-1 z-30 rounded-r-xl">
            {/* 1. AGENDA */}
            <button
              onClick={() => updateView("AGENDA", gira.id)}
              className="p-2 rounded-full text-slate-500 hover:bg-white hover:text-fixed-indigo-600 transition-colors"
              title="Agenda"
            >
              <IconCalendar size={18} />
            </button>

            {/* 2. REPERTORIO */}
            <button
              onClick={() => updateView("REPERTOIRE", gira.id,"my_parts")}
              className="p-2 rounded-full text-slate-500 hover:bg-white hover:text-fuchsia-600 transition-colors"
              title="Mis Partes"
            >
              <IconMusic size={18} />
            </button>

            {/* 3. DRIVE */}
            <button
              onClick={() =>
                gira.google_drive_folder_id
                  ? window.open(
                      `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
                      "_blank",
                    )
                  : null
              }
              className={`p-2 rounded-full transition-colors ${gira.google_drive_folder_id ? "text-slate-500 hover:bg-white hover:text-green-600" : "text-slate-300 cursor-not-allowed"}`}
              title="Drive"
            >
              <IconDrive size={18} />
            </button>

            {/* 4. COMIDAS */}
            <button
              onClick={() => updateView("MEALS_PERSONAL", gira.id)}
              className="p-2 rounded-full text-slate-500 hover:bg-white hover:text-amber-600 transition-colors"
              title="Comidas"
            >
              <IconUtensils size={18} />
            </button>
          </div>
        ) : (
          /* --- SI ES EDITOR: MENU FLOTANTE CLÁSICO --- */
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
            {gira.google_drive_folder_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
                    "_blank",
                  );
                }}
                className="p-1.5 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-green-600 shadow-sm border border-black/5"
              >
                <IconDrive size={14} />
              </button>
            )}
            <div className="relative">
              <GiraActionMenu
                gira={gira}
                onViewChange={(mode, tab) => updateView(mode, gira.id, tab)}
                isEditor={isEditor}
                isPersonal={isPersonal}
                userRole={userRole}
                onEdit={() => startEdit(gira)}
                onDelete={onDelete}
                onGlobalComments={() => setGlobalCommentsGiraId(gira.id)}
                isOpen={isMenuOpen}
                onToggle={() => setActiveMenuId(isMenuOpen ? null : gira.id)}
                onClose={() => setActiveMenuId(null)}
                onMove={() => onMove(gira)}
                onDuplicate={() => onDuplicate(gira)}
              />
            </div>
          </div>
        )}

        {/* --- CONTENEDOR PRINCIPAL CON FLECHAS Y SLIDER --- */}
        <div className="h-40 w-full overflow-hidden relative group">
          {/* FLECHA IZQUIERDA (Visible si no es el primer slide) */}
          {currentSlide > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                scrollSlide(-1);
              }}
              className="absolute left-1 top-1/2 -translate-y-1/2 z-20 text-black/20 hover:text-black/50 p-1"
            >
              <IconChevronDown size={20} className="rotate-90" />
            </button>
          )}

          {/* FLECHA DERECHA (Visible si no es el último slide) */}
          {currentSlide < 2 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                scrollSlide(1);
              }}
              className={`absolute top-1/2 -translate-y-1/2 z-20 text-black/20 hover:text-black/50 p-1 ${showQuickAccessSidebar ? "right-12" : "right-1"}`}
            >
              <IconChevronDown size={20} className="-rotate-90" />
            </button>
          )}

          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className={`flex w-full h-full overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth ${showQuickAccessSidebar ? "pr-11" : ""}`}
          >
            {/* === SLIDE 1: PORTADA === */}
            <div className="min-w-full w-full h-full snap-center p-3 flex flex-col justify-between relative">
              {/* Línea Superior: Tipo | Zona | Mes | Nomenclador */}
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide opacity-60 truncate pr-4">
                <span>{gira.tipo}</span>
                {gira.zona && (
                  <>
                    <span className="opacity-30">|</span>
                    <span>{gira.zona}</span>
                  </>
                )}
                <span className="opacity-30">|</span>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide opacity-60 truncate pr-4">
                <span className="truncate">{gira.nomenclador}</span>
                <span className="opacity-30">|</span>

                <span>{gira.mes_letra}</span>
              </div>
              {(gira.estado === "Borrador" || gira.estado === "Pausada") && (
                <div className="absolute top-8 left-3 z-10">
                  <span className="bg-white/80 border border-black/10 px-2 py-0.5 rounded text-[9px] font-bold uppercase">
                    {gira.estado}
                  </span>
                </div>
              )}

              {/* Centro: Fechas Gigantes */}
              <div className="flex flex-col items-center justify-center flex-1">
                {dateInfo ? (
                  <div className="flex items-baseline gap-2">
                    <div className="text-center">
                      <span
                        className={`text-3xl font-black leading-none ${titleColorClass}`}
                      >
                        {dateInfo.d1}
                      </span>
                      {dateInfo.m1 !== dateInfo.m2 && (
                        <span className="text-[13px] font-bold opacity-70 ml-1">
                          {dateInfo.m1}
                        </span>
                      )}
                    </div>
                    <div className="h-px w-4 bg-current opacity-30 self-center"></div>
                    <div className="text-center">
                      <span
                        className={`text-3xl font-black leading-none ${titleColorClass}`}
                      >
                        {dateInfo.d2}
                      </span>
                      <span className="text-[13px] font-bold opacity-70 ml-1">
                        {dateInfo.m2}
                      </span>
                    </div>
                  </div>
                ) : (
                  <span className="opacity-40 italic text-xs">Sin fecha</span>
                )}
              </div>
              <div className="flex items-center justify-center gap-1 text-s opacity-60 truncate max-w-full mt-1">
                <IconMapPin size={18} className="shrink-0" />
                <span className="truncate">{locs || "Sin localía"}</span>
              </div>
              {/* Abajo: Título */}
              <div className="text-center pb-1">
                <h3 className="text-sm font-bold text-slate-800 leading-tight line-clamp-2">
                  {gira.nombre_gira}
                </h3>
                {gira.subtitulo && (
                  <p className="text-[11px] opacity-60 truncate">
                    {gira.subtitulo}
                  </p>
                )}
              </div>
            </div>

            {/* === SLIDE 2: EQUIPO === */}
            <div className="min-w-full w-full h-full snap-center p-3 flex flex-col relative px-8">
              {" "}
              {/* px-8 para dejar espacio a flechas */}
              <div className="flex-1 overflow-hidden pt-2">
                {renderPersonnelCompact()}
              </div>
            </div>

            {/* === SLIDE 3: AGENDA === */}
            <div className="min-w-full w-full h-full snap-center p-3 flex flex-col relative px-8">
              <div className="flex-1 overflow-hidden pt-1">
                {renderConcertsCompact()}
              </div>
            </div>
          </div>

          {/* INDICADORES (DOTS) */}
          <div
            className={`absolute bottom-1 left-0 flex justify-center gap-1 ${showQuickAccessSidebar ? "right-11" : "right-0"}`}
          >
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className={`w-1 h-1 rounded-full transition-all ${currentSlide === i ? `bg-slate-600 w-3` : "bg-slate-300/50"}`}
              ></div>
            ))}
          </div>

          {/* Botón Comentarios Flotante (Solo si NO hay sidebar, para no tapar) */}
          {!showQuickAccessSidebar && (
            <div className="absolute bottom-2 right-2 z-30">
              <CommentButton
                supabase={supabase}
                entityType="GIRA"
                entityId={gira.id}
                onClick={() =>
                  setCommentsState({
                    type: "GIRA",
                    id: gira.id,
                    title: gira.nombre_gira,
                  })
                }
                className="bg-white/80 backdrop-blur shadow-sm border border-black/10 p-1.5 rounded-full text-slate-400 hover:text-fixed-indigo-600"
              />
            </div>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* VISTA ESCRITORIO: DISEÑO ORIGINAL (Solo visible en >= md)    */}
      {/* ============================================================ */}
      <div className="hidden md:block p-4">
        <div className="flex justify-between items-start gap-2">
          <div
            className="cursor-pointer flex-1 min-w-0"
            onClick={() => updateView("AGENDA", gira.id)}
          >
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex flex-wrap items-center gap-2 text-xs opacity-70">
                <span className="font-black uppercase tracking-wide">
                  {gira.tipo}
                </span>
                {gira.estado !== "Vigente" && (
                  <span className="border border-current px-1 rounded text-[10px] uppercase font-bold">
                    {gira.estado}
                  </span>
                )}
                {gira.zona && (
                  <span className="font-medium">({gira.zona})</span>
                )}
                <div className="flex items-center gap-1 whitespace-nowrap ml-auto pl-2 border-l border-black/10">
                  <IconCalendar size={12} /> {formatDate(gira.fecha_desde)}-
                  {formatDate(gira.fecha_hasta)}
                </div>
                <span className="font-bold bg-white/50 px-1.5 rounded whitespace-nowrap ml-1 border border-black/5">
                  {gira.mes_letra} | {gira.nomenclador}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-base font-bold text-slate-800 truncate max-w-full">
                  {gira.nombre_gira}
                </span>
                {gira.subtitulo && (
                  <span className="text-xs italic opacity-70 truncate max-w-full">
                    {gira.subtitulo}
                  </span>
                )}
                <div className="flex items-center gap-1 text-xs opacity-60 truncate max-w-full">
                  <IconMapPin size={12} className="shrink-0" />
                  <span className="truncate">{locs || "Sin localía"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs opacity-80 mt-1">
              {getPersonnelDisplayDesktop()}
            </div>
            <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap mt-1">
              {getSourcesDisplayDesktop()}
            </div>
          </div>
          {/* Espacio para los botones absolutos */}
          <div className="w-16"></div>
        </div>

        {/* Agenda Desktop */}
        {getConcertListDesktop()}

        {/* Botón Comentarios Desktop (Posición estática) */}
        <div className="absolute bottom-2 right-2">
          <CommentButton
            supabase={supabase}
            entityType="GIRA"
            entityId={gira.id}
            onClick={() =>
              setCommentsState({
                type: "GIRA",
                id: gira.id,
                title: gira.nombre_gira,
              })
            }
          />
        </div>

        {/* Menú Desktop */}
        <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
          {gira.google_drive_folder_id && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                window.open(
                  `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
                  "_blank",
                );
              }}
              className="p-1.5 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-green-600 shadow-sm border border-black/5"
            >
              <IconDrive size={16} />
            </button>
          )}
          <div className="hidden md:block">
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateView("MEALS_PERSONAL", gira.id);
              }}
              className="p-1.5 bg-white/80 backdrop-blur rounded-full text-slate-400 hover:text-amber-600 shadow-sm border border-black/5"
            >
              <IconUtensils size={16} />
            </button>
          </div>
          <div className="relative">
            <GiraActionMenu
              gira={gira}
              onViewChange={(mode, tab) => updateView(mode, gira.id, tab)}
              isEditor={isEditor}
              isPersonal={isPersonal}
              userRole={userRole}
              onEdit={() => startEdit(gira)}
              onDelete={onDelete}
              onGlobalComments={() => setGlobalCommentsGiraId(gira.id)}
              isOpen={isMenuOpen}
              onToggle={() => setActiveMenuId(isMenuOpen ? null : gira.id)}
              onClose={() => setActiveMenuId(null)}
              onMove={() => onMove(gira)}
              onDuplicate={() => onDuplicate(gira)}
            />
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* REPERTORIO COMPARTIDO (Siempre abajo)                        */}
      {/* ============================================================ */}
      {showRepertoireInCards && (
        <div className="border-t border-black/5 bg-white/40 p-2 relative z-20">
          <div className="animate-in slide-in-from-top-2">
            <RepertoireManager
              supabase={supabase}
              programId={gira.id}
              giraId={gira.id}
              isCompact={true}
              readOnly={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}
