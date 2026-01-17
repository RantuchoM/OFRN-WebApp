import React from "react";
import { IconCalendar, IconMapPin, IconDrive } from "../../components/ui/Icons";
import InstrumentationManager from "../../components/roster/InstrumentationManager";
import CommentButton from "../../components/comments/CommentButton";
import RepertoireManager from "../../components/repertoire/RepertoireManager";
import GiraActionMenu from "./GiraActionMenu";

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
  if (isHighlighted) {
    //console.log(`🔥 GiraCard ${gira.id} RECIBIÓ HIGHLIGHT TRUE`);
  }
  // --- 1. DEFINICIÓN DE COLORES POR TIPO ---
  // Centralizamos los colores para usarlos en Borde, Fondo y Ring
  const getTypeColors = (tipo, estado) => {
    if (estado === "Pausada") {
      return {
        border: "bg-amber-400",
        bg: "bg-amber-50",
        ring: "ring-amber-200",
      };
    }
    if (estado === "Borrador") {
      return {
        border: "bg-slate-300",
        bg: "bg-slate-50",
        ring: "ring-slate-200",
      };
    }

    switch (tipo) {
      case "Sinfónico":
        return {
          border: "bg-indigo-500",
          bg: "bg-indigo-50/50",
          ring: "ring-indigo-200",
        };
      case "Ensamble":
        return {
          border: "bg-emerald-500",
          bg: "bg-emerald-50/50",
          ring: "ring-emerald-200",
        };
      case "Jazz Band":
        return {
          border: "bg-amber-500",
          bg: "bg-amber-50/50",
          ring: "ring-amber-200",
        };
      default:
        return {
          border: "bg-fuchsia-500",
          bg: "bg-fuchsia-50/50",
          ring: "ring-fuchsia-200",
        };
    }
  };

  const colors = getTypeColors(gira.tipo, gira.estado);

  // --- Helpers de visualización (Sin cambios) ---
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const [y, m, d] = dateString.split("-");
    return `${d}/${m}`;
  };

  const getStatusBadge = (estado) => {
    const status = estado || "Borrador";

    // --- CAMBIO: Si es Vigente, no mostramos nada ---
    if (status === "Vigente") return null;
    // -----------------------------------------------

    let styles = "bg-slate-100 text-slate-600 border-slate-200";
    let label = "Borrador";

    if (status === "Pausada") {
      styles = "bg-amber-100 text-amber-700 border-amber-200";
      label = "Pausada";
    }

    return (
      <span
        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ml-1 ${styles}`}
      >
        {label}
      </span>
    );
  };
  // ... (getPersonnelDisplay, getSourcesDisplay, getConcertList siguen igual)
  const getPersonnelDisplay = (gira) => {
    const roster = gira.giras_integrantes || [];
    const directors = roster.filter(
      (r) => r.rol === "director" && r.estado === "confirmado"
    );
    const soloists = roster.filter(
      (r) => r.rol === "solista" && r.estado === "confirmado"
    );
    const formatName = (p) =>
      `${p.integrantes?.apellido || ""}, ${p.integrantes?.nombre || ""}`;
    const cleanNames = (arr) =>
      arr.map(formatName).filter((n) => n.trim() !== ",");

    let output = [];
    if (cleanNames(directors).length > 0)
      output.push(
        <span key="dir" className="font-semibold text-indigo-700">
          Dir: {cleanNames(directors).join(" | ")}
        </span>
      );
    if (cleanNames(soloists).length > 0)
      output.push(
        <span key="sol" className="font-semibold text-fuchsia-700">
          Solista/s: {cleanNames(soloists).join(" | ")}
        </span>
      );
    return output.length > 0 ? output : null;
  };
  const getSourcesDisplay = (gira) => {
    const sources = gira.giras_fuentes || [];

    // Aseguramos que ensemblesList sea un array antes de mapear
    const safeEnsemblesList = Array.isArray(ensemblesList) ? ensemblesList : [];

    // Creamos el mapa asegurando tipos (todo a string para evitar problemas de "1" vs 1)
    const ensembleMap = new Map(
      safeEnsemblesList.map((e) => [String(e.value), e.label])
    );

    const inclusions = [];
    const exclusions = [];

    sources.forEach((s) => {
      let label = "";

      if (s.tipo === "ENSAMBLE") {
        // Buscamos convirtiendo el ID a string
        const foundLabel = ensembleMap.get(String(s.valor_id));

        // Si encontramos el label, lo usamos. Si no, fallback.
        // Importante: Verificamos que foundLabel sea string, si es objeto lo stringificamos (debug)
        label = foundLabel
          ? typeof foundLabel === "object"
            ? JSON.stringify(foundLabel)
            : foundLabel
          : `Ensamble ${s.valor_id}`;
      } else if (s.tipo === "FAMILIA") {
        label = s.valor_texto;
      }

      // Si por alguna razón label sigue siendo un objeto (error de datos), forzamos string
      if (typeof label === "object") label = "Error de Datos";

      const element = (
        <span
          key={s.id || Math.random()} // Key única
          className={
            s.tipo === "EXCL_ENSAMBLE"
              ? "text-gray-700 font-medium line-through"
              : s.tipo === "ENSAMBLE"
              ? "text-black-700 font-medium"
              : "text-gray-700 font-medium"
          }
        >
          {label}
        </span>
      );

      if (s.tipo === "EXCL_ENSAMBLE") {
        // Para exclusiones también necesitamos buscar el nombre
        let exclLabel =
          ensembleMap.get(String(s.valor_id)) || `Ensamble ${s.valor_id}`;
        exclusions.push(
          <span key={s.id} className="text-gray-700 font-medium line-through">
            {exclLabel}
          </span>
        );
      } else {
        inclusions.push(element);
      }
    });

    if (inclusions.length === 0 && exclusions.length === 0) return null;

    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ml-2 pl-2 border-l border-slate-200 shrink-0">
        {/* Renderizamos con reduce para agregar separadores si es necesario */}
        {inclusions.reduce((acc, curr, idx) => {
          return idx === 0
            ? [curr]
            : [
                ...acc,
                <span key={`sep-${idx}`} className="text-slate-300">
                  |
                </span>,
                curr,
              ];
        }, [])}

        {exclusions.length > 0 && (
          <>
            {inclusions.length > 0 && <span className="text-slate-300">|</span>}
            {exclusions.reduce((acc, curr, idx) => {
              return idx === 0
                ? [curr]
                : [
                    ...acc,
                    <span key={`sep-ex-${idx}`} className="text-slate-300">
                      |
                    </span>,
                    curr,
                  ];
            }, [])}
          </>
        )}
      </div>
    );
  };
  const getConcertList = (gira) => {
    const concerts = (gira.eventos || [])
      .filter(
        (e) =>
          e.tipos_evento?.nombre?.toLowerCase().includes("concierto") ||
          e.tipos_evento?.nombre?.toLowerCase().includes("función")
      )
      .sort((a, b) =>
        (a.fecha + a.hora_inicio).localeCompare(b.fecha + b.hora_inicio)
      );

    if (concerts.length === 0) return null;
    return (
      <div className="text-xs space-y-1">
        <ul className="pl-1 space-y-0.5">
          {concerts.slice(0, 3).map((c, idx) => (
            <li
              key={idx}
              className="text-slate-500 truncate max-w-full flex items-center gap-1"
            >
              <span className="font-mono text-[10px] mr-1 bg-slate-100 px-1 rounded">
                {formatDate(c.fecha)} - {c.hora_inicio.slice(0, 5)}
              </span>
              {`${c.locaciones?.nombre || ""} | ${
                c.locaciones?.localidades?.localidad || ""
              }`}
            </li>
          ))}
          {concerts.length > 3 && (
            <li className="text-slate-400 italic text-[10px] pt-1">
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
        rounded-xl border p-3 md:p-4 relative overflow-visible 
        transition-all duration-700 ease-out
        ${isMenuOpen ? "z-50" : "z-0"} 
        ${gira.estado === "Pausada" ? "opacity-75" : ""} 
        
        /* FONDO: Usamos el color suave calculado */
        ${colors.bg}

        /* HIGHLIGHT VS NORMAL */
        ${
          isHighlighted
            ? `!border-transparent ring-4 ${colors.ring} shadow-xl z-40` // QUITAMOS 'scale-[1.01]'
            : "bg-white border-slate-200 shadow-sm hover:border-indigo-300 hover:shadow-md"
        }
      `}
    >
      {/* BARRA LATERAL DE COLOR 
          - Si highlight: pulsa y es más ancha (w-2.5)
          - Si normal: estática y delgada (w-1.5)
      */}
      <div
        className={`
            absolute left-0 top-0 bottom-0 rounded-l-xl z-20 
            transition-all duration-300 ease-in-out origin-left
            w-1.5  /* ANCHO BASE FIJO para no mover el contenido */
            ${colors.border}
            
            ${
              isHighlighted
                ? "scale-x-[2.5] shadow-[0_0_15px_rgba(0,0,0,0.3)] animate-pulse" // Crece visualmente con escala
                : "scale-x-100"
            }
        `}
      ></div>

      {/* CONTENIDO (Igual que antes) */}
      <div className="pl-3 flex flex-col gap-2 relative z-20">
        <div className="flex justify-between items-start gap-2">
          {/* ... */}
          <div
            className="cursor-pointer flex-1 min-w-0"
            onClick={() => updateView("AGENDA", gira.id)}
          >
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-black text-slate-800 uppercase tracking-wide">
                  {gira.tipo}
                </span>
                {getStatusBadge(gira.estado)}
                {gira.zona && (
                  <span className="font-medium text-slate-600">
                    ({gira.zona})
                  </span>
                )}
                <div className="flex items-center gap-1 whitespace-nowrap ml-auto sm:ml-2 sm:pl-2 sm:border-l border-slate-200">
                  <IconCalendar size={12} /> {formatDate(gira.fecha_desde)}-
                  {formatDate(gira.fecha_hasta)}
                </div>
                <span className="font-bold text-slate-600 bg-white/50 px-1.5 rounded whitespace-nowrap ml-1 border border-slate-100">
                  {gira.mes_letra} | {gira.nomenclador}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-base font-bold text-slate-800 truncate max-w-full">
                  {gira.nombre_gira}
                </span>
                {gira.subtitulo && (
                  <span className="text-xs italic text-slate-600 truncate max-w-full">
                    {gira.subtitulo}
                  </span>
                )}
                <div className="flex items-center gap-1 text-xs text-slate-500 truncate max-w-full">
                  <IconMapPin size={12} className="shrink-0" />
                  <span className="truncate">{locs || "Sin localía"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mt-1">
              {getPersonnelDisplay(gira)}
              <div className="w-full md:w-auto md:ml-2 md:pl-2 md:border-l border-slate-200 mt-1 md:mt-0">
                <InstrumentationManager supabase={supabase} gira={gira} />
              </div>
            </div>
            <div className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap">
              {getSourcesDisplay(gira)}
            </div>
          </div>

          <div className="flex items-center gap-1 md:gap-2 shrink-0 relative z-30">
            {gira.google_drive_folder_id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  window.open(
                    `https://drive.google.com/drive/folders/${gira.google_drive_folder_id}`,
                    "_blank"
                  );
                }}
                className="p-2 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors hidden sm:block"
              >
                <IconDrive size={20} />
              </button>
            )}
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

        {(getConcertList(gira) || showRepertoireInCards) && (
          <div className="mt-2 border-t border-slate-200/60 pt-2 relative z-20">
            {getConcertList(gira)}
            {showRepertoireInCards && (
              <div className="mt-3 animate-in slide-in-from-top-2">
                <RepertoireManager supabase={supabase} programId={gira.id} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
