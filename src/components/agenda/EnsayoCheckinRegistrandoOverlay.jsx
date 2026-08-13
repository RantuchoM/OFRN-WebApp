import React from "react";
import { createPortal } from "react-dom";
import { IconLoader } from "../ui/Icons";
import { ENSAYO_CHECKIN_REGISTRANDO_MSG } from "../../services/ensayoCheckinService";

/** Pantalla de espera hasta feedback real de BD (entrada/salida ensayo). */
export default function EnsayoCheckinRegistrandoOverlay({ open }) {
  if (!open || typeof document === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 text-center space-y-3">
        <IconLoader size={28} className="animate-spin mx-auto text-indigo-600" />
        <p className="text-sm font-bold text-slate-800">
          {ENSAYO_CHECKIN_REGISTRANDO_MSG}
        </p>
      </div>
    </div>,
    document.body,
  );
}
