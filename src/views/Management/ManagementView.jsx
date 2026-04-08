import React, { useState } from "react";
import {
  IconSettingsWheel,
  IconHistory,
  IconMusicNote,
  IconGrid,
} from "../../components/ui/Icons";
import { VenuesManager } from "../../components/management/VenuesManager";
import SeatingReports from "./SeatingReports";
import InstrumentationAudit from "./InstrumentationAudit";
import AsistenciaMatrixReport from "../Giras/AsistenciaMatrixReport";

export default function ManagementView({ supabase }) {
  const [activeTab, setActiveTab] = useState("venues");

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">
            Módulo de Gestión
          </h2>
          <p className="text-xs text-slate-500">
            Herramientas globales: espacios, seating, instrumentación y convocatorias por
            programa.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab("venues")}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
              activeTab === "venues"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconSettingsWheel size={14} />
            <span>Espacios</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("seating")}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
              activeTab === "seating"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconHistory size={14} />
            <span>Informes Seating</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("instrumentation")}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
              activeTab === "instrumentation"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconMusicNote size={14} />
            <span>Instrumentación</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("convocatorias")}
            className={`px-3 py-1.5 rounded-md flex items-center gap-1 transition-colors ${
              activeTab === "convocatorias"
                ? "bg-white text-indigo-700 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            <IconGrid size={14} />
            <span>Convocatorias</span>
          </button>
        </div>
      </div>

      <div
        className={
          activeTab === "convocatorias"
            ? "flex min-h-0 flex-1 flex-col overflow-hidden p-4"
            : "flex-1 overflow-y-auto p-4"
        }
      >
        {activeTab === "venues" && <VenuesManager supabase={supabase} />}
        {activeTab === "seating" && <SeatingReports supabase={supabase} />}
        {activeTab === "instrumentation" && (
          <InstrumentationAudit supabase={supabase} />
        )}
        {activeTab === "convocatorias" && (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-lg border border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-950">
            <AsistenciaMatrixReport supabase={supabase} />
          </div>
        )}
      </div>
    </div>
  );
}

