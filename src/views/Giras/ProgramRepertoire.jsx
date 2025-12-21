import React, { useState, useEffect } from "react";
import {
  IconLoader,
  IconMusic,
  IconUsers,
  IconFileText,
  IconArrowLeft,
} from "../../components/ui/Icons";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext"; // Importar useAuth
import RepertoireManager from "../../components/repertoire/RepertoireManager";
import ProgramSeating from "../Giras/ProgramSeating";
import InstrumentationManager from "../../components/roster/InstrumentationManager";
import MyPartsViewer from "./MyPartsViewer";

export default function ProgramRepertoire({ supabase, program, onBack }) {
  const { user, isEditor } = useAuth(); // Hook de auth
  const [searchParams, setSearchParams] = useSearchParams();

  // Leemos la sub-pestaña de la URL. Si no existe, por defecto es 'repertoire'
  const activeTab = searchParams.get("subTab") || "repertoire";

  const [repertorios, setRepertorios] = useState(
    program?.programas_repertorios || []
  );

  const [repertoireKey, setRepertoireKey] = useState(0);
  
  // --- NUEVO ESTADO: Saber si el usuario coordina ESTE programa ---
  const [canEdit, setCanEdit] = useState(false);

  // --- EFECTO: Determinar permisos de edición ---
  useEffect(() => {
    const checkPermissions = async () => {
      // 1. Si es editor global, tiene permiso siempre
      if (isEditor) {
        setCanEdit(true);
        return;
      }

      // 2. Si no es editor, chequeamos si coordina el ensamble de este programa
      // Solo aplica si el programa es de tipo 'Ensamble'
      if (program.tipo === 'Ensamble') {
        const fuentes = program.giras_fuentes || [];
        
        const { data: coordData, error } = await supabase
          .from("ensambles_coordinadores")
          .select("id_ensamble")
          .eq("id_integrante", user.id);

        if (!error && coordData) {
          const myCoordinatedEnsembles = new Set(coordData.map(c => c.id_ensamble));
          
          const isCoordinator = fuentes.some(f => 
            f.tipo === 'ENSAMBLE' && myCoordinatedEnsembles.has(f.valor_id)
          );
          
          if (isCoordinator) {
            setCanEdit(true);
          }
        }
      }
    };

    if (program && user) {
        checkPermissions();
    }
  }, [user, isEditor, program, supabase]);

  if (!program)
    return (
      <div className="p-10 text-center">
        <IconLoader className="animate-spin text-indigo-600" />
      </div>
    );

  const handleRepertoireUpdate = (newBlocks) => {
    setRepertorios(newBlocks);
    setRepertoireKey((prev) => prev + 1);
  };

  // Función auxiliar para cambiar solo la sub-pestaña sin perder los otros datos de la URL
  const handleTabChange = (newTab) => {
    setSearchParams((prev) => {
      const newParams = new URLSearchParams(prev);
      newParams.set("subTab", newTab);
      return newParams;
    });
  };

  // Botón "Atrás" inteligente
  const handleBack = () => {
    if (activeTab !== "repertoire") {
      // Si estamos en una sub-pestaña, volvemos a la principal (actualizando URL)
      handleTabChange("repertoire");
    } else {
      // Si estamos en la principal, ejecutamos la acción de salir (volver a lista)
      onBack();
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 animate-in fade-in">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4 shrink-0">
        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={handleBack}
            className="text-slate-400 hover:text-indigo-600 text-sm font-bold flex items-center gap-1 shrink-0"
          >
            <IconArrowLeft size={16} />
            {activeTab !== "repertoire"
              ? "Volver al Repertorio"
              : "Volver a Programas"}
          </button>

          <div className="flex flex-col">
            <h2 className="text-m font-bold text-slate-800">Repertorio</h2>
            {/* Solo mostramos el resumen de instrumentación en la pestaña principal */}
            {activeTab === "repertoire" && (
              <div className="hidden md:block pl-2 border-l border-slate-200 mt-1">
                <InstrumentationManager supabase={supabase} gira={program} />
              </div>
            )}
          </div>
        </div>

        {/* Selector de Vistas (Pestañas) - AHORA USAN handleTabChange */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-end md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => handleTabChange("repertoire")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "repertoire"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconMusic size={16} /> Repertorio
          </button>

          <button
            onClick={() => handleTabChange("seating")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "seating"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconUsers size={16} /> Seating
          </button>

          <button
            onClick={() => handleTabChange("my_parts")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "my_parts"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconFileText size={16} /> Mis Partes
          </button>
        </div>
      </div>

      {/* Contenido Dinámico */}
      <div className="flex-1 overflow-hidden relative">
        {activeTab === "repertoire" && (
          <div className="h-full overflow-y-auto p-4">
            <RepertoireManager
              supabase={supabase}
              programId={program.id}
              initialData={program.programas_repertorios}
              onUpdate={handleRepertoireUpdate}
              readOnly={!canEdit} // <--- AQUI PASAMOS EL PERMISO
            />
          </div>
        )}

        {activeTab === "seating" && (
          <div className="h-full overflow-y-auto">
            <ProgramSeating
              key={repertoireKey}
              supabase={supabase}
              program={program}
              repertoireBlocks={repertorios}
              onBack={() => handleTabChange("repertoire")} 
            />
          </div>
        )}

        {activeTab === "my_parts" && (
          <div className="h-full overflow-hidden">
            <MyPartsViewer
              supabase={supabase}
              gira={program}
              onOpenSeating={() => handleTabChange("seating")} 
            />
          </div>
        )}
      </div>
    </div>
  );
}