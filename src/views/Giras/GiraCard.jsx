import React, { useState, useRef } from "react";
import { format, parseISO, isToday, isTomorrow, isPast } from "date-fns";
import { es } from "date-fns/locale";
import { useAuth } from "../../context/AuthContext";
import {
  IconCalendar,
  IconMapPin,
  IconDrive,
  IconUtensils,
  IconMusic,
  IconChevronDown,
  IconHotel,
  IconX,
  IconUsers,
  IconClock,
} from "../../components/ui/Icons";
import CommentButton from "../../components/comments/CommentButton";
import RepertoireManager from "../../components/repertoire/RepertoireManager";
import GiraActionMenu from "./GiraActionMenu";
import { getProgramStyle, checkIsConvoked } from "../../utils/giraUtils";
import { getMyRoomingStatus } from "../../services/giraService";
import { createPortal } from "react-dom";
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
  const { user, isDifusion } = useAuth();
  const isMenuOpen = activeMenuId === gira.id;
  const [currentSlide, setCurrentSlide] = useState(0);
  const scrollRef = useRef(null);

  // --- ESTADOS PARA MI ROOMING ---
  const [myRooming, setMyRooming] = useState(null);
  const [showRoomingModal, setShowRoomingModal] = useState(false);
  const [loadingRooming, setLoadingRooming] = useState(false);

  // --- LÓGICA DE ROLES PARA UI ---
  const normalizedRole = userRole?.toLowerCase().trim();
  const isDifusionRole = normalizedRole === "difusion";
  const showQuickAccessSidebar = !isEditor && !isDifusionRole;

  const handleOpenMyRooming = async () => {
    // 1. Usamos el objeto 'user' que viene de useAuth()
    // Este objeto ya tiene el ID numérico de la tabla 'integrantes'
    if (!user?.id) {
      console.error("No hay un usuario identificado en el contexto");
      return;
    }

    setLoadingRooming(true);
    setShowRoomingModal(true);

    try {
      // 2. Pasamos user.id (el número) al servicio
      const data = await getMyRoomingStatus(supabase, gira.id, user.id);
      setMyRooming(data);
    } catch (error) {
      console.error("Error al obtener rooming:", error);
    } finally {
      setLoadingRooming(false);
    }
  };

  const handleViewChange = (mode, tab) => {
    setActiveMenuId(null);
    updateView(mode, gira.id, tab);
  };

  const handleScroll = () => {
    if (scrollRef.current) {
      const scrollLeft = scrollRef.current.scrollLeft;
      const width = scrollRef.current.offsetWidth;
      const index = Math.round(scrollLeft / width);
      setCurrentSlide(index);
    }
  };

  const scrollSlide = (direction) => {
    if (scrollRef.current) {
      const width = scrollRef.current.offsetWidth;
      scrollRef.current.scrollBy({
        left: width * direction,
        behavior: "smooth",
      });
    }
  };

  const getMealStatusConfig = () => {
    if (!gira.eventos || !user) {
      return { color: "text-slate-300", animate: false, title: "Sin datos" };
    }
    const memberRecord = gira.giras_integrantes?.find(
      (i) => String(i.id_integrante) === String(user.id),
    );
    const userData = memberRecord?.integrantes;
    let isLocal = false;
    if (userData?.id_localidad && gira.giras_localidades) {
      const tourLocIds = gira.giras_localidades.map((l) => l.id_localidad);
      isLocal = tourLocIds.includes(userData.id_localidad);
    } else if (memberRecord?.integrantes?.is_local !== undefined) {
      isLocal = memberRecord.integrantes.is_local;
    }
    const userProfile = {
      id: user.id,
      is_local: isLocal,
      id_localidad: userData?.id_localidad || null,
      instrumentos: userData?.instrumentos || { familia: "" },
      rol_gira: memberRecord?.rol || "musico",
    };
    const myMeals = gira.eventos.filter((e) => {
      const isMeal =
        e.tipos_evento?.id_categoria === 4 ||
        [7, 8, 9, 10].includes(e.id_tipo_evento) ||
        e.tipos_evento?.nombre?.toLowerCase().includes("comida") ||
        e.tipos_evento?.nombre?.toLowerCase().includes("almuerzo") ||
        e.tipos_evento?.nombre?.toLowerCase().includes("cena");

      if (!isMeal) return false;
      return checkIsConvoked(e.convocados, userProfile, userProfile.rol_gira);
    });

    if (myMeals.length === 0) {
      return { color: "text-slate-300", animate: false, title: "Sin comidas" };
    }
    let respondedCount = 0;
    myMeals.forEach((evt) => {
      const responses = evt.eventos_asistencia || [];
      const hasResponded = responses.some(
        (r) => String(r.id_integrante) === String(user.id),
      );
      if (hasResponded) respondedCount++;
    });
    const total = myMeals.length;
    if (respondedCount >= total) {
      return { color: "text-emerald-600", animate: false, title: "Completas" };
    }
    let isUrgent = false;
    const deadlineStr = gira.fecha_confirmacion_limite || gira.fecha_desde;
    if (deadlineStr) {
      const deadline = parseISO(deadlineStr);
      if (isPast(deadline) || isToday(deadline) || isTomorrow(deadline)) {
        isUrgent = true;
      }
    }
    if (isUrgent) {
      return {
        color:
          "bg-red-500 text-slate-200 border-red-600 hover:bg-red-600 hover:text-white",
        animate: true,
        title: "¡Urgente!",
      };
    }
    return { color: "text-amber-500", animate: false, title: "Pendientes" };
  };

  const mealConfig = getMealStatusConfig();
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
  const desktopBtnClass =
    "w-7 h-7 flex items-center justify-center bg-white/80 backdrop-blur rounded-full shadow-sm border border-black/5 transition-all hover:scale-105 active:scale-95 cursor-pointer";

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
    const ensembleMap = new Map(
      (Array.isArray(ensemblesList) ? ensemblesList : []).map((e) => [
        String(e.value),
        e.label,
      ]),
    );

    return (
      <div className="flex flex-col h-full justify-center space-y-3 text-xs">
        {directors.length > 0 && (
          <div className="flex gap-2 items-baseline">
            <span className="font-bold opacity-60 w-12 shrink-0 text-[10px] uppercase">
              Dir.
            </span>
            <span className="font-bold truncate text-[14px]">
              {directors.map(getName).join(", ")}
            </span>
          </div>
        )}
        {soloists.length > 0 && (
          <div className="flex gap-2 items-baseline">
            <span className="font-bold opacity-60 w-12 shrink-0 text-[10px] uppercase">
              Solista
            </span>
            <span className="font-medium truncate text-[14px]">
              {soloists.map(getName).join(", ")}
            </span>
          </div>
        )}
        {sources.length > 0 && (
          <div className="flex gap-2 items-start">
            <span className="font-bold opacity-60 w-12 shrink-0 text-[10px] uppercase pt-0.5">
              Org.
            </span>
            <div className="flex flex-wrap gap-1 text-[15px]">
              {sources.map((s) => {
                let lbl =
                  s.tipo === "FAMILIA"
                    ? s.valor_texto
                    : ensembleMap.get(String(s.valor_id)) || "Ens.";
                return (
                  <span
                    key={s.id}
                    className={`text-[14px] px-1.5 rounded border bg-white/60 border-current opacity-80 ${s.tipo === "EXCL_ENSAMBLE" ? "line-through opacity-50" : ""}`}
                  >
                    {lbl}
                  </span>
                );
              })}
            </div>
          </div>
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
                <span className="block text-[11px] font-black opacity-50 uppercase">
                  {format(parseISO(c.fecha), "MMM", { locale: es })}
                </span>
                <span className="block text-s font-bold">
                  {format(parseISO(c.fecha), "dd")}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-s font-bold truncate">
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
          onClick={() =>
            updateView(isDifusion ? "DIFUSION" : "AGENDA", gira.id)
          }
        >
          Ver Agenda Completa
        </div>
      </div>
    );
  };

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
    const ensembleMap = new Map(
      (Array.isArray(ensemblesList) ? ensemblesList : []).map((e) => [
        String(e.value),
        e.label,
      ]),
    );
    const inclusions = [];
    const exclusions = [];
    sources.forEach((s) => {
      let label =
        s.tipo === "ENSAMBLE"
          ? ensembleMap.get(String(s.valor_id)) || `Ensamble ${s.valor_id}`
          : s.valor_texto;
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
      if (s.tipo === "EXCL_ENSAMBLE") exclusions.push(element);
      else inclusions.push(element);
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
      className={`relative rounded-xl border p-0 overflow-visible transition-all duration-700 ease-out ${isMenuOpen ? "z-50" : "z-0"} ${cardClasses} ${isHighlighted ? "ring-4 ring-offset-2 ring-indigo-200 z-40" : "shadow-sm hover:shadow-md"}`}
    >
      {/* VISTA MÓVIL */}
      <div className="md:hidden">
        {showQuickAccessSidebar ? (
          <div className="absolute right-0 top-0 h-40 w-11 bg-white/40 backdrop-blur-sm border-l border-black/5 flex flex-col items-center justify-evenly py-1 z-30 rounded-r-xl">
            <button
              onClick={() => updateView("AGENDA", gira.id)}
              className="p-2 rounded-full text-slate-500 hover:bg-white hover:text-fixed-indigo-600 transition-colors"
            >
              <IconCalendar size={14} />
            </button>
            <button
              onClick={() => updateView("REPERTOIRE", gira.id, "my_parts")}
              className="p-2 rounded-full text-slate-500 hover:bg-white hover:text-fuchsia-600 transition-colors"
            >
              <IconMusic size={14} />
            </button>
            <button
              onClick={() =>
                gira.google_drive_folder_id &&
                window.open(
                  `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
                  "_blank",
                )
              }
              className={`p-2 rounded-full transition-colors ${gira.google_drive_folder_id ? "text-slate-500 hover:bg-white hover:text-green-600" : "text-slate-300 cursor-not-allowed"}`}
            >
              <IconDrive size={14} />
            </button>
            <button
              onClick={() => updateView("MEALS_PERSONAL", gira.id)}
              className={`p-2 rounded-full transition-colors hover:bg-white ${mealConfig.color} ${mealConfig.animate ? "animate-pulse" : ""}`}
            >
              <IconUtensils size={14} />
            </button>
            {/* NUEVO BOTÓN DE HOTEL EN MÓVIL */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleOpenMyRooming();
              }}
              className="p-2 rounded-full text-slate-500 hover:bg-white hover:text-indigo-600 transition-colors"
              title="Mi Rooming"
            >
              <IconHotel size={14} />
            </button>
          </div>
        ) : (
          <div className="absolute top-2 right-2 z-30 flex items-center gap-1">
            <div
              className="order-1 relative z-[100] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <GiraActionMenu
                gira={gira}
                onViewChange={handleViewChange}
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
                onMyRooming={handleOpenMyRooming}
              />
            </div>
          </div>
        )}
        <div className="h-40 w-full overflow-hidden relative group">
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
            <div className="min-w-full w-full h-full snap-center p-3 flex flex-col justify-between relative">
              <div className="flex items-center gap-2 text-[14px] font-bold uppercase tracking-wide opacity-60 truncate pr-4">
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
                      <span className="text-[23px] font-bold opacity-70 ml-1">
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
            <div className="min-w-full w-full h-full snap-center p-3 flex flex-col relative px-8">
              <div className="flex-1 overflow-hidden pt-2">
                {renderPersonnelCompact()}
              </div>
            </div>
            <div className="min-w-full w-full h-full snap-center p-3 flex flex-col relative px-8">
              <div className="flex-1 overflow-hidden pt-1">
                {renderConcertsCompact()}
              </div>
            </div>
          </div>
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

          {!showQuickAccessSidebar && !isDifusionRole && (
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
      {/* VISTA ESCRITORIO */}
      <div className="hidden md:block p-3 pl-4 relative">
        <div className="flex gap-4 items-start pr-10">
          <div className="flex flex-col items-center justify-center p-2 bg-white/60 rounded-lg border border-black/5 shrink-0 min-w-[60px] self-start">
            {dateInfo ? (
              <>
                <span
                  className={`text-2xl font-black leading-none ${titleColorClass}`}
                >
                  {dateInfo.d1}-{dateInfo.d2}
                </span>
                <span className="text-[10px] font-bold uppercase opacity-60 leading-tight">
                  {dateInfo.m1}
                  {dateInfo.m2 !== dateInfo.m1 ? ` - ${dateInfo.m2}` : ""}
                </span>
              </>
            ) : (
              <IconCalendar size={20} className="opacity-20" />
            )}
          </div>
          <div
            className="cursor-pointer flex-1 min-w-0 pt-0.5"
            onClick={() =>
              updateView(isDifusion ? "DIFUSION" : "AGENDA", gira.id)
            }
          >
            <div className="flex flex-wrap items-center gap-2 text-xs opacity-70 mb-1">
              <span className="font-black uppercase tracking-wide text-[10px]">
                {gira.tipo}
              </span>
              {gira.zona && (
                <>
                  <span className="opacity-30">|</span>
                  <span className="font-bold">{gira.zona}</span>
                </>
              )}
              <span className="opacity-30">|</span>
              <span className="font-medium bg-white/50 px-1.5 rounded border border-black/5 text-[10px]">
                {gira.mes_letra} {gira.nomenclador}
              </span>
              {gira.estado !== "Vigente" && (
                <span className="border border-current px-1 rounded text-[9px] uppercase font-bold ml-2">
                  {gira.estado}
                </span>
              )}
            </div>
            <div className="mb-1">
              <h3 className="text-base font-bold text-slate-800 truncate leading-tight">
                {gira.nombre_gira}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                {gira.subtitulo && (
                  <span className="text-xs italic opacity-70 truncate">
                    {gira.subtitulo}
                  </span>
                )}
                <div className="flex items-center gap-1 text-[11px] opacity-60 truncate">
                  <IconMapPin size={10} className="shrink-0" />
                  <span className="truncate max-w-[200px]">
                    {locs || "Sin localía"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs opacity-80">
              {getPersonnelDisplayDesktop()}
              {gira.giras_integrantes?.length > 0 && (
                <span className="opacity-20">|</span>
              )}
              {getSourcesDisplayDesktop()}
            </div>
          </div>
        </div>
        {getConcertListDesktop()}

        <div className="absolute top-2 right-2 z-30 grid grid-cols-2 gap-1 items-start justify-items-end">
          <div className="col-start-2 relative z-[100]">
            <GiraActionMenu
              gira={gira}
              onViewChange={handleViewChange}
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
              onMyRooming={handleOpenMyRooming}
            />
          </div>

          {!isDifusionRole && (
            <>
              {showQuickAccessSidebar ? (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateView("AGENDA", gira.id);
                    }}
                    className={`${desktopBtnClass} hover:text-fixed-indigo-600`}
                    title="Agenda"
                  >
                    <IconCalendar size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateView("REPERTOIRE", gira.id, "my_parts");
                    }}
                    className={`${desktopBtnClass} hover:text-fuchsia-600`}
                    title="Mis Partes"
                  >
                    <IconMusic size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (gira.google_drive_folder_id)
                        window.open(
                          `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
                          "_blank",
                        );
                    }}
                    className={`${desktopBtnClass} ${!gira.google_drive_folder_id ? "opacity-30 cursor-not-allowed" : "hover:text-green-600"}`}
                    title="Drive"
                  >
                    <IconDrive size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateView("MEALS_PERSONAL", gira.id);
                    }}
                    className={`${desktopBtnClass} ${mealConfig.color} ${mealConfig.animate ? "animate-pulse" : ""}`}
                    title={mealConfig.title}
                  >
                    <IconUtensils size={14} />
                  </button>
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
                    className={desktopBtnClass}
                    iconSize={14}
                  />
                </>
              ) : (
                <>
                  {gira.google_drive_folder_id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(
                          `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
                          "_blank",
                        );
                      }}
                      className={`${desktopBtnClass} hover:text-green-600`}
                    >
                      <IconDrive size={14} />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      updateView("MEALS_PERSONAL", gira.id);
                    }}
                    className={`${desktopBtnClass} hover:text-amber-600`}
                  >
                    <IconUtensils size={14} />
                  </button>
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
                    className={desktopBtnClass}
                    iconSize={14}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
      {/* MODAL MI ROOMING */}
      {showRoomingModal &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowRoomingModal(false)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-fixed-indigo-600 p-4 text-white flex justify-between items-center">
                <h3 className="font-bold flex items-center gap-2">
                  <IconHotel size={18} /> Mi Alojamiento
                </h3>
                <button
                  onClick={() => setShowRoomingModal(false)}
                  className="hover:rotate-90 transition-transform"
                >
                  <IconX size={20} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {loadingRooming ? (
                  <div className="py-10 text-center text-slate-400 animate-pulse">
                    Consultando asignación...
                  </div>
                ) : myRooming ? (
                  <>
                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                        Hotel
                      </label>
                      <div className="text-lg font-bold text-slate-800">
                        {myRooming.hotel}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-slate-100">
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                          <IconClock size={10} /> Check-In
                        </label>
                        <div className="font-semibold text-slate-700 font-mono">
                          14:00 hs
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1">
                          <IconClock size={10} /> Check-Out
                        </label>
                        <div className="font-semibold text-slate-700 font-mono">
                          10:00 hs
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-black text-slate-400 tracking-wider flex items-center gap-1 mb-2">
                        <IconUsers size={12} /> Compañeros/as en habitación
                      </label>
                      <div className="space-y-1.5">
                        {myRooming.mates.length > 0 ? (
                          myRooming.mates.map((m, i) => (
                            <div
                              key={i}
                              className="bg-slate-50 px-3 py-2.5 rounded-xl text-sm text-slate-700 border border-slate-100 flex items-center gap-2"
                            >
                              <div className="w-1.5 h-1.5 rounded-full bg-fixed-indigo-400"></div>
                              <span className="font-medium">{m.apellido}</span>,{" "}
                              {m.nombre}
                            </div>
                          ))
                        ) : (
                          <div className="text-sm italic text-slate-400 bg-slate-50 p-3 rounded-xl border border-dashed text-center">
                            Habitación individual
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-8 text-center px-4">
                    <div className="text-slate-300 mb-2">
                      <IconHotel size={40} className="mx-auto" />
                    </div>
                    <p className="text-slate-500 text-sm italic">
                      No tienes una habitación asignada en este programa
                      todavía.
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowRoomingModal(false)}
                className="w-full py-4 bg-slate-50 text-slate-500 font-bold text-sm hover:bg-slate-100 transition-colors border-t border-slate-100"
              >
                Entendido
              </button>
            </div>
          </div>,
          document.body,
        )}
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
