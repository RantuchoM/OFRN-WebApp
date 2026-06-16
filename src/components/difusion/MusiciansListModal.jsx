import React, { useEffect, useMemo, useState } from "react";
import { IconLoader, IconUsers, IconX } from "../ui/Icons";
import {
  buildDifusionMusiciansSections,
} from "../../utils/difusionMusiciansList";
import { dedupeSeatingStringItems } from "../../utils/seatingStringItemsDedupe";

export default function MusiciansListModal({
  isOpen,
  onClose,
  supabase,
  programId,
  roster,
}) {
  const [loading, setLoading] = useState(false);
  const [sections, setSections] = useState([]);
  const [omitHeaders, setOmitHeaders] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setOmitHeaders(false);
    setError(null);

    const load = async () => {
      setLoading(true);
      try {
        const [contsRes, itemsRes] = await Promise.all([
          supabase
            .from("seating_contenedores")
            .select("id, nombre, orden")
            .eq("id_programa", programId)
            .order("orden"),
          supabase
            .from("seating_contenedores_items")
            .select("id, id_contenedor, id_musico, atril_num, lado, orden"),
        ]);

        if (contsRes.error) throw contsRes.error;
        if (itemsRes.error) throw itemsRes.error;

        const contIds = (contsRes.data || []).map((c) => c.id);
        const items = (itemsRes.data || []).filter((it) =>
          contIds.includes(it.id_contenedor),
        );
        const dedupedItems = dedupeSeatingStringItems(items, contsRes.data || []);

        setSections(
          buildDifusionMusiciansSections(
            roster,
            contsRes.data,
            dedupedItems,
          ),
        );
      } catch (err) {
        setSections([]);
        setError(err?.message || "Error al cargar el listado");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [isOpen, programId, roster, supabase]);

  const totalCount = useMemo(
    () => sections.reduce((n, s) => n + s.musicians.length, 0),
    [sections],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-slate-100 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-start gap-3 bg-slate-50 shrink-0">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <IconUsers size={18} className="text-indigo-600" />
              Listado de músicos
            </h3>
            {!loading && !error && (
              <p className="text-xs text-slate-500 mt-0.5">
                {totalCount} instrumentista{totalCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 shrink-0"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-slate-100 bg-white shrink-0">
          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-indigo-600"
              checked={omitHeaders}
              onChange={(e) => setOmitHeaders(e.target.checked)}
            />
            <span>Omitir encabezados</span>
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && (
            <div className="flex justify-center py-10">
              <IconLoader className="animate-spin text-indigo-600" size={28} />
            </div>
          )}

          {!loading && error && (
            <p className="text-sm text-red-600 text-center py-6">{error}</p>
          )}

          {!loading && !error && sections.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-6 italic">
              No hay instrumentistas convocados en este programa.
            </p>
          )}

          {!loading && !error && sections.length > 0 && (
            <div className="space-y-4">
              {omitHeaders ? (
                <ul className="space-y-1">
                  {sections.flatMap((section) =>
                    section.musicians.map((m) => (
                      <li
                        key={m.id}
                        className="text-sm text-slate-700 py-0.5 border-b border-slate-50 last:border-0"
                      >
                        {m.apellido}, {m.nombre}
                      </li>
                    )),
                  )}
                </ul>
              ) : (
                sections.map((section) => (
                  <div key={section.header}>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded px-2 py-1 mb-1.5">
                      {section.header}
                    </div>
                    <ul className="space-y-0.5 pl-1">
                      {section.musicians.map((m) => (
                        <li
                          key={m.id}
                          className="text-sm text-slate-700 py-0.5"
                        >
                          {m.apellido}, {m.nombre}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
