import React, { lazy, Suspense, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "../../services/supabase";
import { IconLoader } from "./Icons";

const WorkForm = lazy(() => import("../../views/Repertoire/WorkForm"));
const MusicianForm = lazy(() => import("../../views/Musicians/MusicianForm"));

function FormFallback() {
  return (
    <div className="flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-10 text-sm font-medium text-slate-500 shadow-xl">
      <IconLoader size={18} className="text-indigo-500" />
      Cargando ficha…
    </div>
  );
}

function WorkFormPortal({ obraId, onClose }) {
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto overflow-x-hidden rounded-xl bg-white p-2 shadow-2xl animate-in zoom-in-95 sm:p-3">
        <Suspense fallback={<FormFallback />}>
          <WorkForm
            key={`palette-work-${obraId}`}
            supabase={supabase}
            formData={{ id: obraId }}
            onCancel={onClose}
            onSave={(_savedId, shouldClose) => {
              if (shouldClose !== false) onClose();
            }}
            catalogoInstrumentos={[]}
            context="archive"
          />
        </Suspense>
      </div>
    </div>,
    document.body,
  );
}

function MusicianFormPortal({ integranteId, onClose }) {
  const numericId = Number(integranteId);

  return createPortal(
    <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <Suspense fallback={<FormFallback />}>
        <MusicianForm
          key={`palette-person-${numericId}`}
          supabase={supabase}
          musician={{ id: numericId }}
          onSave={(_data, shouldClose = true) => {
            if (shouldClose) onClose();
          }}
          onCancel={onClose}
        />
      </Suspense>
    </div>,
    document.body,
  );
}

export default function CommandPaletteEntityOverlays({
  workId,
  musicianId,
  onCloseWork,
  onCloseMusician,
}) {
  return (
    <>
      {workId != null && (
        <WorkFormPortal obraId={workId} onClose={onCloseWork} />
      )}
      {musicianId != null && Number.isFinite(Number(musicianId)) && (
        <MusicianFormPortal
          integranteId={musicianId}
          onClose={onCloseMusician}
        />
      )}
    </>
  );
}
