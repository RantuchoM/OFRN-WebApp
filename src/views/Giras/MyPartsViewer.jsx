// src/views/Giras/MyPartsViewer.jsx
import React, { useState, useEffect, useRef } from "react";
import {
  IconLoader,
  IconDownload,
  IconDrive,
  IconLayers,
  IconAlertCircle,
  IconFileText,
  IconChevronDown,
} from "../../components/ui/Icons";
import { useAuth } from "../../context/AuthContext";

// --- SUB-COMPONENTE: TARJETA MÓVIL COMPACTA ---
const MobilePartCard = ({ item }) => {
  const [showVersions, setShowVersions] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowVersions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasMultipleLinks = item.particella_links.length > 1;
  const mainLink = item.particella_links[0];

  // Colores de estado
  let borderClass = "bg-slate-200"; 
  if (item.particella_status === "PENDING") borderClass = "bg-amber-400";
  if (item.particella_status === "AVAILABLE") borderClass = "bg-emerald-500";

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-2.5 relative overflow-visible flex flex-col gap-1.5">
      {/* Borde lateral de estado */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-lg ${borderClass}`}></div>

      <div className="pl-2 flex justify-between items-start gap-2">
        <div className="min-w-0">
          <h3
            className="font-bold text-slate-900 text-sm leading-tight line-clamp-2"
            dangerouslySetInnerHTML={{ __html: item.titulo }}
          />
          <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">
            {item.compositor}
          </p>
        </div>
        
        {/* Badge de Estado Pequeño */}
        {item.particella_status === "PENDING" && (
           <span className="shrink-0 text-[9px] font-bold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded border border-amber-100 whitespace-nowrap">
             Pendiente
           </span>
        )}
      </div>

      {/* Info de la Parte */}
      <div className="pl-2">
         {item.particella_status !== "NO_ASSIGNED" ? (
            <div className="flex items-baseline gap-2">
               <span className="font-bold text-indigo-700 text-xs truncate max-w-[200px]">
                 {item.particella_nombre}
               </span>
               {item.nota_extra && (
                 <span className="text-[9px] text-slate-400 italic truncate max-w-[100px]">
                   ({item.nota_extra})
                 </span>
               )}
            </div>
         ) : (
            <span className="text-[10px] text-slate-400 italic">No asignado</span>
         )}
      </div>

      {/* Botones de Acción */}
      <div className="pl-2 flex items-center justify-between mt-1 pt-2 border-t border-slate-50">
        {/* Drive Link */}
        {item.link_drive_obra ? (
          <a
            href={item.link_drive_obra}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-indigo-600 transition-colors"
          >
            <IconDrive size={14} /> Carpeta Gral.
          </a>
        ) : (
          <span />
        )}

        {/* Botón Principal (PDF) */}
        {item.particella_status === "AVAILABLE" && (
          <div className="relative" ref={menuRef}>
            {hasMultipleLinks ? (
              // CASO MÚLTIPLES LINKS
              <>
                <button
                  onClick={() => setShowVersions(!showVersions)}
                  className="flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm active:scale-95 transition-all hover:bg-indigo-700"
                >
                  <IconLayers size={14} /> 
                  <span>{item.particella_links.length} Versiones</span>
                  <IconChevronDown size={12} />
                </button>

                {showVersions && (
                  <div className="absolute bottom-full right-0 mb-1 w-48 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden animate-in zoom-in-95 origin-bottom-right">
                    <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                      Selecciona Edición
                    </div>
                    {item.particella_links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block px-3 py-2 text-xs text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 border-b border-slate-50 last:border-0 truncate"
                      >
                        {link.name || `Versión ${idx + 1}`}
                      </a>
                    ))}
                  </div>
                )}
              </>
            ) : (
              // CASO UN SOLO LINK
              <a
                href={mainLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold shadow-sm active:scale-95 transition-all hover:bg-indigo-700"
              >
                <IconDownload size={14} /> Ver PDF
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
export default function MyPartsViewer({ supabase, gira, onOpenSeating }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [repertoire, setRepertoire] = useState([]);
  const [userInstrument, setUserInstrument] = useState(null);
  const [seatingInfo, setSeatingInfo] = useState(null);

  useEffect(() => {
    fetchData();
  }, [gira.id, user.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Obtener datos básicos
      const { data: userData } = await supabase
        .from("integrantes")
        .select("id, nombre, apellido, id_instr")
        .eq("id", user.id)
        .single();

      const myInstrumentId = userData?.id_instr;
      setUserInstrument(
        myInstrumentId
          ? `${myInstrumentId}`
          : "Sin instrumento asignado",
      );

      // 2. Obtener el Contenedor (Atril) CON DATOS EXTRA
      const { data: seatingJoin } = await supabase
        .from("seating_contenedores_items")
        .select(`
            id_contenedor, 
            orden,
            seating_contenedores!inner (id_programa, nombre)
        `)
        .eq("id_musico", user.id)
        .eq("seating_contenedores.id_programa", gira.id)
        .maybeSingle();

      const myContainerId = seatingJoin?.id_contenedor;

      // Calcular info de atril si existe
      if (seatingJoin) {
          const deskNumber = Math.floor(seatingJoin.orden) + 1;
          setSeatingInfo({
              container: seatingJoin.seating_contenedores.nombre,
              desk: deskNumber
          });
      } else {
          setSeatingInfo(null);
      }

      // 3. Obtener asignaciones
      const { data: asignsData } = await supabase
        .from("seating_asignaciones")
        .select("id_obra, id_particella, id_contenedor, id_musicos_asignados")
        .eq("id_programa", gira.id);

      const assignments = asignsData || [];

      // 4. Obtener Repertorio
      const { data: progRepData, error } = await supabase
        .from("programas_repertorios")
        .select(
          `
            id, orden,
            repertorio_obras (
                id, orden, excluir,
                obras (
                    id, titulo, link_drive,
                    obras_compositores (rol, compositores (nombre, apellido)),
                    compositores (nombre, apellido),
                    obras_particellas (
                        id, nombre_archivo, url_archivo, id_instrumento, nota_organico
                    )
                )
            )
        `,
        )
        .eq("id_programa", gira.id)
        .order("orden", { ascending: true });

      if (error) throw error;

      // 5. Procesamiento
      let processed = [];

      (progRepData || []).forEach((cat) => {
        if (!cat.repertorio_obras) return;
        const sortedWorks = cat.repertorio_obras.sort(
          (a, b) => a.orden - b.orden,
        );

        sortedWorks.forEach((item) => {
          if (item.excluir || !item.obras) return;
          const obra = item.obras;

          // Triangulación
          const workAsigns = assignments.filter(
            (a) => String(a.id_obra) === String(obra.id),
          );
          const specificAsign = workAsigns.find((a) =>
            a.id_musicos_asignados?.some(
              (mid) => String(mid) === String(user.id),
            ),
          );
          const groupAsign = workAsigns.find(
            (a) =>
              myContainerId &&
              String(a.id_contenedor) === String(myContainerId),
          );
          const finalAsign = specificAsign || groupAsign;

          const myPart = obra.obras_particellas?.find(
            (p) =>
              finalAsign &&
              String(p.id) === String(finalAsign.id_particella) &&
              String(p.id_instrumento) === String(myInstrumentId),
          );

          // Compositor
          let composerName = "Autor Desconocido";
          if (obra.obras_compositores?.length > 0) {
            const comps = obra.obras_compositores
              .filter((oc) => oc.rol === "compositor" && oc.compositores)
              .map(
                (oc) => `${oc.compositores.nombre} ${oc.compositores.apellido}`,
              );
            if (comps.length > 0) composerName = comps.join(" / ");
          } else if (obra.compositores) {
            composerName = `${obra.compositores.nombre} ${obra.compositores.apellido}`;
          }

          // PARSEO DE LINKS
          let links = [];
          if (myPart?.url_archivo) {
            try {
              if (myPart.url_archivo.trim().startsWith("[")) {
                const parsed = JSON.parse(myPart.url_archivo);
                if (Array.isArray(parsed)) {
                   links = parsed.map((l, i) => ({
                       url: l.url,
                       name: l.name || `Versión ${i + 1}`
                   }));
                }
              } else {
                links = [{ url: myPart.url_archivo, name: 'Principal' }];
              }
            } catch (e) {
              links = [{ url: myPart.url_archivo, name: 'Principal' }];
            }
          }

          let status = "NO_ASSIGNED";
          if (myPart) {
            status = links.length > 0 ? "AVAILABLE" : "PENDING";
          }

          processed.push({
            id: obra.id,
            uniqueId: item.id,
            orden: item.orden,
            compositor: composerName,
            titulo: obra.titulo,
            link_drive_obra: obra.link_drive,
            
            particella_status: status,
            particella_links: links,
            
            particella_nombre:
              myPart?.nombre_archivo ||
              (myPart ? "Parte sin nombre" : myInstrumentId),
            nota_extra: myPart?.nota_organico || null,
          });
        });
      });

      setRepertoire(processed);
    } catch (error) {
      console.error("Error fetching my parts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading)
    return (
      <div className="p-10 flex justify-center">
        <IconLoader className="animate-spin text-indigo-600" size={32} />
      </div>
    );

  return (
    <div className="flex flex-col h-full animate-in fade-in bg-slate-50">
      {/* HEADER DE ASIGNACIÓN */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm shrink-0">
        <div className="flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Tu Asignación
          </span>
          
          <div className="flex flex-col leading-tight">
            {seatingInfo ? (
                <>
                    <span className="text-sm font-bold text-indigo-700">
                        {seatingInfo.container} <span className="text-indigo-400">|</span> Atril {seatingInfo.desk}
                    </span>
                    
                </>
            ) : null}
          </div>
        </div>

        {onOpenSeating && (
          <button
            onClick={onOpenSeating}
            className="flex items-center gap-1.5 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full text-xs font-bold hover:bg-indigo-100 transition-colors"
          >
            <IconLayers size={14} /> <span className="hidden sm:inline">Ver</span> Seating
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 md:p-4">
        {repertoire.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <IconFileText size={48} className="opacity-20 mb-2" />
            <p className="text-sm italic">No tienes partes asignadas aún.</p>
          </div>
        ) : (
          <>
            {/* === VISTA MÓVIL (COMPACTA) === */}
            <div className="md:hidden space-y-2">
              {repertoire.map((row) => (
                <MobilePartCard key={row.uniqueId} item={row} />
              ))}
            </div>

            {/* === VISTA ESCRITORIO (TABLA) === */}
            <div className="hidden md:block bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
                    <tr>
                      <th className="px-4 py-3">Obra</th>
                      <th className="px-4 py-3 text-center">Carpeta</th>
                      <th className="px-4 py-3">Parte Asignada</th>
                      <th className="px-4 py-3 text-center">Descarga</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {repertoire.map((row) => (
                      <tr
                        key={row.uniqueId}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div
                            className="font-bold text-slate-900 whitespace-pre-wrap leading-tight"
                            dangerouslySetInnerHTML={{ __html: row.titulo }}
                          />
                          <div className="text-[11px] text-slate-500 mt-1">
                            {row.compositor}
                          </div>
                        </td>

                        <td className="px-4 py-3 text-center">
                          {row.link_drive_obra ? (
                            <a
                              href={row.link_drive_obra}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors"
                              title="Carpeta General de la Obra"
                            >
                              <IconDrive size={18} />
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-slate-600">
                          {row.particella_status !== "NO_ASSIGNED" ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-indigo-600 text-xs truncate max-w-[200px]">
                                {row.particella_nombre}
                              </span>
                              {row.nota_extra && (
                                <span className="text-[10px] text-slate-400 italic">
                                  {row.nota_extra}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">
                              No asignado
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-3 text-center">
                          {row.particella_status === "AVAILABLE" && (
                             row.particella_links.length > 1 ? (
                                <div className="group relative inline-block">
                                    <button className="inline-flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-700">
                                        <IconLayers size={14} /> {row.particella_links.length} Vers.
                                    </button>
                                    <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-md hidden group-hover:block z-50 text-left overflow-hidden">
                                        {row.particella_links.map((l, idx) => (
                                            <a key={idx} href={l.url} target="_blank" rel="noopener noreferrer" className="block px-3 py-2 hover:bg-slate-50 text-xs text-slate-700 border-b border-slate-50 last:border-0">
                                                {l.name}
                                            </a>
                                        ))}
                                    </div>
                                </div>
                             ) : (
                                <a
                                href={row.particella_links[0].url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 font-bold text-xs shadow-sm active:scale-95 transition-all"
                                >
                                <IconDownload size={14} /> PDF
                                </a>
                             )
                          )}
                          {row.particella_status === "PENDING" && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-100 text-[10px] font-bold">
                              <IconAlertCircle size={12} /> Pendiente
                            </span>
                          )}
                          {row.particella_status === "NO_ASSIGNED" && (
                            <span className="text-xs text-slate-300 italic">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}