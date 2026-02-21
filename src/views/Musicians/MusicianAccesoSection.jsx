import React from "react";
import { useMusicianFormContext } from "./MusicianFormContext";

/**
 * Pestaña "Acceso": email_acceso, clave_acceso (con toggle mostrar/ocultar).
 */
export default function MusicianAccesoSection() {
  const {
    formData,
    updateField,
    getInputStatusClass,
    labelClass,
    showPassword,
    setShowPassword,
  } = useMusicianFormContext();

  return (
    <div className="grid grid-cols-2 gap-8 animate-in fade-in">
      <div>
        <label className={labelClass}>Email Acceso</label>
        <input
          type="email"
          className={getInputStatusClass("email_acceso")}
          value={formData.email_acceso || ""}
          onChange={(e) =>
            updateField("email_acceso", e.target.value)
          }
        />
      </div>
      <div>
        <label className={labelClass}>Clave</label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            className={getInputStatusClass("clave_acceso")}
            value={formData.clave_acceso || ""}
            onChange={(e) =>
              updateField("clave_acceso", e.target.value)
            }
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-all"
          >
            {showPassword ? "🙈" : "👁️"}
          </button>
        </div>
      </div>
    </div>
  );
}
