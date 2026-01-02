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
  // handleDelete, // <--- YA NO USAMOS ESTA
  setGlobalCommentsGiraId,
  setCommentsState,
  activeMenuId,
  setActiveMenuId,
  showRepertoireInCards,
  ensemblesList,
  supabase,
  onMove,
  onDuplicate,
  onDelete, // <--- PROPIEDAD IMPORTANTE
}) {
  const isMenuOpen = activeMenuId === gira.id;

  // --- Helpers de visualización ---
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    const [y, m, d] = dateString.split("-");
    return `${d}/${m}`;
  };

  // --- NUEVO: Helper para estilos de estado ---
  const getStatusBadge = (estado) => {
    // Si no tiene estado (legacy), asumimos Borrador o no mostramos nada
    const status = estado || "Borrador"; 
    
    let styles = "bg-slate-100 text-slate-600 border-slate-200"; // Default (Borrador)
    let label = "Borrador";

    if (status === "Vigente") {
        styles = "bg-green-100 text-green-700 border-green-200";
        label = "Vigente";
    } else if (status === "Pausada") {
        styles = "bg-amber-100 text-amber-700 border-amber-200";
        label = "Pausada";
    }

    return (
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ml-1 ${styles}`}>
            {label}
        </span>
    );
  };

  const getPersonnelDisplay = (gira) => {
    // ... (Mismo código que tenías) ...
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
    const directorNames = cleanNames(directors);
    const soloistNames = cleanNames(soloists);
    let output = [];
    if (directorNames.length > 0)
      output.push(
        <span key="dir" className="font-semibold text-indigo-700">
          Dir: {directorNames.join(" | ")}
        </span>
      );
    if (soloistNames.length > 0)
      output.push(
        <span key="sol" className="font-semibold text-fuchsia-700">
          Solista/s: {soloistNames.join(" | ")}
        </span>
      );
    return output.length > 0 ? output : null;
  };

  const getSourcesDisplay = (gira) => {
    // ... (Mismo código que tenías) ...
    const sources = gira.giras_fuentes || [];
    const ensembleMap = new Map(ensemblesList.map((e) => [e.value, e.label]));
    const inclusions = [];
    const exclusions = [];
    sources.forEach((s) => {
      let label = "";
      if (s.tipo === "ENSAMBLE") {
        label = ensembleMap.get(s.valor_id) || `Ensamble ID:${s.valor_id}`;
        inclusions.push(
          <span key={s.id} className="text-black-700 font-medium">
            {label}
          </span>
        );
      } else if (s.tipo === "FAMILIA") {
        label = s.valor_texto;
        inclusions.push(
          <span key={s.id} className="text-gray-700 font-medium">
            {label}
          </span>
        );
      } else if (s.tipo === "EXCL_ENSAMBLE") {
        label = ensembleMap.get(s.valor_id) || `Ensamble ID:${s.valor_id}`;
        exclusions.push(
          <span key={s.id} className="text-gray-700 font-medium line-through">
            {label}
          </span>
        );
      }
    });
    if (inclusions.length === 0 && exclusions.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs ml-2 pl-2 border-l border-slate-200 shrink-0">
        {inclusions.length > 0 && (
          <>
            {inclusions.map((item, index) => (
              <React.Fragment key={index}>
                {item}
                {index < inclusions.length - 1 && (
                  <span className="text-slate-300">|</span>
                )}
              </React.Fragment>
            ))}
          </>
        )}
        {exclusions.length > 0 && (
          <>
            {inclusions.length > 0 && <span className="text-slate-300">|</span>}
            <span className="font-bold text-red-600 shrink-0"></span>
            {exclusions.map((item, index) => (
              <React.Fragment key={index}>
                {item}
                {index < exclusions.length - 1 && (
                  <span className="text-slate-300">|</span>
                )}
              </React.Fragment>
            ))}
          </>
        )}
      </div>
    );
  };

  const getConcertList = (gira) => {
    // ... (Mismo código que tenías) ...
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

  // Definir color de borde lateral según estado
  const getBorderColor = (tipo, estado) => {
      // Si está pausada, gris/ambar sin importar el tipo
      if (estado === 'Pausada') return 'bg-amber-400';
      if (estado === 'Borrador') return 'bg-slate-300';

      // Si es vigente, usa el color del tipo
      if (tipo === "Sinfónico") return "bg-indigo-500";
      if (tipo === "Ensamble") return "bg-emerald-500";
      if (tipo === "Jazz Band") return "bg-amber-500";
      return "bg-fuchsia-500";
  };

  return (
    <div
      className={`bg-white rounded-xl border border-slate-200 shadow-sm p-3 md:p-4 relative border-l-0 overflow-visible transition-all ${
        isMenuOpen ? "z-50" : "z-0"
      } ${gira.estado === 'Pausada' ? 'opacity-75' : ''}`} // Opacidad si está pausada
    >
      <div
        className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-xl ${getBorderColor(gira.tipo, gira.estado)}`}
      ></div>
      <div className="pl-2 flex flex-col gap-2">
        <div className="flex justify-between items-start gap-2">
          {/* ÁREA CLICABLE: VA A LA AGENDA */}
          <div
            className="cursor-pointer flex-1 min-w-0"
            onClick={() => updateView("AGENDA", gira.id)}
          >
            <div className="flex flex-col gap-1 mb-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {/* TIPO */}
                <span className="font-black text-slate-800 uppercase tracking-wide">
                  {gira.tipo}
                </span>

                {/* --- AQUI INSERTAMOS EL ESTADO --- */}
                {getStatusBadge(gira.estado)}
                {/* -------------------------------- */}

                {/* ZONA */}
                {gira.zona && (
                  <span className="font-medium text-slate-600">
                    ({gira.zona})
                  </span>
                )}
                
                {/* FECHAS */}
                <div className="flex items-center gap-1 whitespace-nowrap ml-auto sm:ml-2 sm:pl-2 sm:border-l border-slate-200">
                  <IconCalendar size={12} />
                  {formatDate(gira.fecha_desde)}-{formatDate(gira.fecha_hasta)}
                </div>
                {/* MES | NOMENCLADOR */}
                <span className="font-bold text-slate-600 bg-slate-100 px-1.5 rounded whitespace-nowrap ml-1">
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
            {/* ... Resto del contenido ... */}
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

          {/* BOTONES DE ACCIÓN */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0 relative z-10">
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
                title="Abrir Drive"
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
              
              // CAMBIO: onDelete usa la prop recibida del padre (GirasView)
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

        {getConcertList(gira) && (
          <div className="mt-2 border-t border-slate-100 pt-2">
            {getConcertList(gira)}
          </div>
        )}
        {showRepertoireInCards && (
          <div className="mt-3 animate-in slide-in-from-top-2 border-t border-slate-100 pt-2">
            <RepertoireManager supabase={supabase} programId={gira.id} />
          </div>
        )}
      </div>
    </div>
  );
}