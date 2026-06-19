import React from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { IconArrowLeft, IconBookOpen } from "../../components/ui/Icons";

export default function TutorialLayout() {
  const location = useLocation();
  const isIndex = location.pathname === "/tutorials" || location.pathname === "/tutorials/";

  return (
    <div className="min-h-full bg-slate-50 flex flex-col animate-in fade-in duration-300">
      <header className="bg-white border-b border-slate-200 px-4 py-3 shrink-0 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            to="/"
            className="text-slate-400 hover:text-indigo-600 text-sm font-bold flex items-center gap-1 shrink-0"
          >
            <IconArrowLeft size={16} />
            Inicio
          </Link>
          <span className="text-slate-300">|</span>
          <Link
            to="/tutorials"
            className="flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-indigo-600"
          >
            <IconBookOpen size={18} className="text-indigo-600" />
            Tutoriales
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto">
          {!isIndex && (
            <Link
              to="/tutorials"
              className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-4"
            >
              <IconArrowLeft size={14} />
              Todos los tutoriales
            </Link>
          )}
          <Outlet />
        </div>
      </main>
    </div>
  );
}
