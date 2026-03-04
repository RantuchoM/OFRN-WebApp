import React, { useState } from "react";
import {
  IconSettingsWheel,
  IconHistory,
} from "../../components/ui/Icons";
import { VenuesManager } from "../../components/management/VenuesManager";
import SeatingReports from "./SeatingReports";

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
            Herramientas globales para administración de espacios y reportes de seating.
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
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === "venues" && <VenuesManager supabase={supabase} />}
        {activeTab === "seating" && <SeatingReports supabase={supabase} />}
      </div>
    </div>
  );
}

