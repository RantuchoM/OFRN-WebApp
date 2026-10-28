import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { IconX } from "../ui/Icons";
import { formatRolGiraLabel, DEFAULT_ROL_ID } from "../../utils/giraUtils";
import {
  canChooseFuncionGira,
  sanitizeFuncionPayload,
} from "../../utils/funcionGira";
import FuncionGiraChoices from "./FuncionGiraChoices";
import { seatingApellidoNombre } from "../../utils/integranteDisplayName";

export default function RosterRolModal({
  musician,
  rolesList,
  ausentes = [],
  onClose,
  onSave,
  saving = false,
}) {
  const [rol, setRol] = useState(musician?.rol_gira || DEFAULT_ROL_ID);
  const [funcion, setFuncion] = useState(musician?.funcion_gira || "");
  const [idCubreA, setIdCubreA] = useState(
    musician?.id_cubre_a != null ? String(musician.id_cubre_a) : "",
  );

  useEffect(() => {
    if (!musician) return;
    setRol(musician.rol_gira || DEFAULT_ROL_ID);
    setFuncion(musician.funcion_gira || "");
    setIdCubreA(
      musician.id_cubre_a != null ? String(musician.id_cubre_a) : "",
    );
  }, [musician]);

  const eligible = canChooseFuncionGira(musician, rol);
  const ausenteOptions = useMemo(
    () =>
      (ausentes || []).filter(
        (a) => String(a.id) !== String(musician?.id),
      ),
    [ausentes, musician?.id],
  );

  if (!musician) return null;

  const handleSave = () => {
    const payload = sanitizeFuncionPayload(musician, rol, funcion, idCubreA);
    if (payload.funcion === "reemplazo" && payload.id_cubre_a == null) return;
    onSave?.({
      rol,
      funcion: payload.funcion,
      id_cubre_a: payload.id_cubre_a,
    });
  };

  const reemplazoIncompleto =
    eligible && funcion === "reemplazo" && !idCubreA;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-slate-200">
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">Cambiar rol</h3>
            <p className="text-[11px] text-slate-500">
              {seatingApellidoNombre(musician)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-500"
            aria-label="Cerrar"
          >
            <IconX size={16} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <label className="block">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
              Rol en la gira
            </span>
            <select
              value={rol}
              onChange={(e) => setRol(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
            >
              {(rolesList?.length ? rolesList : [{ id: DEFAULT_ROL_ID }]).map(
                (r) => (
                  <option key={r.id} value={r.id}>
                    {formatRolGiraLabel(r.id)}
                  </option>
                ),
              )}
            </select>
          </label>
          {eligible && (
            <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Función
              </span>
              <FuncionGiraChoices
                value={funcion}
                onChange={(id) => {
                  setFuncion(id);
                  if (id !== "reemplazo") setIdCubreA("");
                }}
              />
              {funcion === "reemplazo" && (
                <label className="block">
                  <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">
                    Cubre a
                  </span>
                  <select
                    value={idCubreA}
                    onChange={(e) => setIdCubreA(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="">Elegir ausente…</option>
                    {ausenteOptions.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-slate-100 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving || reemplazoIncompleto}
            onClick={handleSave}
            className="px-3 py-1.5 text-xs font-bold text-white bg-fixed-indigo-600 rounded-lg hover:bg-fixed-indigo-700 disabled:opacity-40"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
