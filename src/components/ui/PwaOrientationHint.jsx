import React, { useEffect, useState } from "react";
import { IconX } from "./Icons";
import {
  dismissPwaOrientationHint,
  isOrientationLikelyLocked,
  shouldShowPwaOrientationHint,
} from "../../utils/pwaOrientationRecovery";

export default function PwaOrientationHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!shouldShowPwaOrientationHint()) return undefined;

    const evaluate = () => {
      setVisible(isOrientationLikelyLocked());
    };

    evaluate();
    window.addEventListener("orientationchange", evaluate);
    window.addEventListener("resize", evaluate);

    return () => {
      window.removeEventListener("orientationchange", evaluate);
      window.removeEventListener("resize", evaluate);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-3 left-3 right-3 z-[9998] mx-auto max-w-md rounded-xl border border-amber-200 bg-amber-50/95 p-3 shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-200"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <p className="flex-1 text-xs leading-snug text-amber-950">
          Si la pantalla no rota al girar la tablet, el acceso directo instalado puede
          estar desactualizado. Eliminá «OFRN» del inicio, abrí la web en Chrome y volvé
          a usar «Agregar a pantalla de inicio».
        </p>
        <button
          type="button"
          onClick={() => {
            dismissPwaOrientationHint();
            setVisible(false);
          }}
          className="shrink-0 rounded p-1 text-amber-700 hover:bg-amber-100"
          aria-label="Ocultar aviso"
        >
          <IconX size={14} />
        </button>
      </div>
    </div>
  );
}
