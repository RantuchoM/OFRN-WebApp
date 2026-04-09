import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import ConciertosDifusionPanel from "../../components/difusion/ConciertosDifusionPanel";
import { IconMegaphone } from "../../components/ui/Icons";
import { getTodayDateStringLocal } from "../../utils/dates";

export default function DifusionGeneral({ supabase, onViewChange }) {
  const { user, roles, isAdmin, isDifusion } = useAuth();
  const canAccess =
    isAdmin ||
    (Array.isArray(roles) && roles.includes("editor")) ||
    isDifusion;
  const canEdit = canAccess;

  const [programTipoFilter, setProgramTipoFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(() => getTodayDateStringLocal());
  const [dateTo, setDateTo] = useState("");

  const PROGRAM_TYPES = [
    "Sinfónico",
    "Camerata Filarmónica",
    "Ensamble",
    "Jazz Band",
    "Comisión",
  ];

  if (!canAccess) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-slate-500">
        No tenés permiso para acceder a Difusión de conciertos.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200">
              <IconMegaphone size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                Difusión de conciertos
              </h1>
              <p className="text-sm text-slate-500">
                Seguimiento de estados por evento (conciertos).
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row flex-wrap gap-3 p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Tipo de programa
            </label>
            <select
              className="mt-1 w-full text-sm p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
              value={programTipoFilter}
              onChange={(e) => setProgramTipoFilter(e.target.value)}
            >
              <option value="">Todos</option>
              {PROGRAM_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Desde
            </label>
            <input
              type="date"
              className="mt-1 w-full text-sm p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Hasta
            </label>
            <input
              type="date"
              className="mt-1 w-full text-sm p-2 border border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
        </div>

        <ConciertosDifusionPanel
          supabase={supabase}
          user={user}
          canEdit={canEdit}
          programTipoFilter={programTipoFilter || null}
          dateFrom={dateFrom || null}
          dateTo={dateTo || null}
          showGiraShortcut
          onNavigateToGiraDifusion={(giraId) =>
            onViewChange("GIRAS", String(giraId), "DIFUSION")
          }
        />
      </div>
    </div>
  );
}
