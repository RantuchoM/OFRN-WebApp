import React, { useState } from "react";
import { 
  IconLoader, 
  IconMusic, 
  IconUsers, 
  IconFileText, 
  IconArrowLeft 
} from "../../components/ui/Icons";
import RepertoireManager from "../../components/repertoire/RepertoireManager";
import ProgramSeating from "../Giras/ProgramSeating";
import InstrumentationManager from "../../components/roster/InstrumentationManager";
import MyPartsViewer from "./MyPartsViewer";

export default function ProgramRepertoire({ supabase, program, onBack, initialTab }) {
  // 1. Declaración del estado para las pestañas (IMPORTANTE)
  const [activeTab, setActiveTab] = useState(initialTab || "repertoire");
  
  const [repertorios, setRepertorios] = useState(
    program?.programas_repertorios || []
  );
  
  // Clave para forzar la recarga de componentes hijos si cambia el repertorio
  const [repertoireKey, setRepertoireKey] = useState(0);

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

  // Botón "Atrás" inteligente: Si estás en una sub-pestaña, vuelve a Repertorio. Si no, sale.
  const handleBack = () => {
    if (activeTab !== "repertoire") {
      setActiveTab("repertoire");
    } else {
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

        {/* Selector de Vistas (Pestañas) */}
        <div className="flex bg-slate-100 p-1 rounded-lg self-end md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("repertoire")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "repertoire"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconMusic size={16} /> Repertorio
          </button>

          <button
            onClick={() => setActiveTab("seating")}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
              activeTab === "seating"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconUsers size={16} /> Seating
          </button>

          <button
            onClick={() => setActiveTab("my_parts")}
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
              onBack={() => setActiveTab("repertoire")}
            />
          </div>
        )}

        {activeTab === "my_parts" && (
          <div className="h-full overflow-hidden">
            <MyPartsViewer
              supabase={supabase}
              gira={program}
              onOpenSeating={() => setActiveTab("seating")}
            />
          </div>
        )}
      </div>
    </div>
  );
}