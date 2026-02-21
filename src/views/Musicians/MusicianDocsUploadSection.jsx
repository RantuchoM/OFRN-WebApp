import React from "react";
import { IconLoader, IconCheck, IconFileText, IconFilePlus, IconLayoutGrid } from "../../components/ui/Icons";
import MusicianFileUploader from "./MusicianFileUploader";
import { useMusicianFormContext } from "./MusicianFormContext";

export default function MusicianDocsUploadSection() {
  const { formData, assemblingType, handleFullPack, handleGenerateDJ, handleAssemble } = useMusicianFormContext();
  const isAll = assemblingType === "all";
  const isDj = assemblingType === "dj";
  const isFull = assemblingType === "full";
  const isMosaic = assemblingType === "mosaic";

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
          Documentación Base
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MusicianFileUploader label="DNI Frontal/Dorso" field="link_dni_img" value={formData.link_dni_img} />
          <MusicianFileUploader label="Constancia CUIL" field="link_cuil" value={formData.link_cuil} />
          <MusicianFileUploader label="Constancia CBU" field="link_cbu_img" value={formData.link_cbu_img} />
          <MusicianFileUploader label="Firma Digital (PNG)" field="firma" value={formData.firma} />
        </div>
      </div>
      <div className="border-t border-slate-100 relative">
        <div className="absolute inset-0 flex items-center justify-center -top-3">
          <div className="bg-white px-4 py-1 border border-slate-100 rounded-full shadow-sm">
            <IconLoader className={assemblingType ? "animate-spin text-orange-500" : "text-slate-200"} size={14} />
          </div>
        </div>
      </div>
      <div>
        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
          Expediente Resultante
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <MusicianFileUploader label="Declaración Jurada" field="link_declaracion" value={formData.link_declaracion} />
          <MusicianFileUploader label="PDF Unificado (Full)" field="documentacion" value={formData.documentacion} />
          <MusicianFileUploader label="PDF Mosaico (Red)" field="docred" value={formData.docred} />
        </div>
      </div>
      <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex flex-col lg:flex-row items-center gap-6 shadow-2xl border border-slate-800">
        <div className="flex-1">
          <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">Motor de Expedientes</h4>
          <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">
            Generación automática mediante last_modified_at.
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full lg:w-auto">
          <button
            type="button"
            disabled={assemblingType !== null}
            onClick={handleFullPack}
            className={
              isAll
                ? "py-3.5 px-10 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-3 shadow-2xl bg-orange-500 text-white animate-pulse"
                : "py-3.5 px-10 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-3 shadow-2xl bg-indigo-600 text-white hover:bg-white hover:text-indigo-600 active:scale-95"
            }
          >
            {isAll ? <IconLoader className="animate-spin" size={18} /> : <IconCheck size={20} />}
            {" "}GENERAR EXPEDIENTE COMPLETO
          </button>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" disabled={assemblingType !== null} onClick={handleGenerateDJ} className="py-2 px-3 rounded-xl text-[8px] font-black border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-1 uppercase">
              {isDj ? <IconLoader className="animate-spin" size={10} /> : <IconFileText size={12} />}
              {" "}SÓLO DJ
            </button>
            <button type="button" disabled={assemblingType !== null} onClick={() => handleAssemble("full")} className="py-2 px-3 rounded-xl text-[8px] font-black border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-1 uppercase">
              {isFull ? <IconLoader className="animate-spin" size={10} /> : <IconFilePlus size={12} />}
              {" "}SÓLO FULL
            </button>
            <button type="button" disabled={assemblingType !== null} onClick={() => handleAssemble("mosaic")} className="py-2 px-3 rounded-xl text-[8px] font-black border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-1 uppercase">
              {isMosaic ? <IconLoader className="animate-spin" size={10} /> : <IconLayoutGrid size={12} />}
              {" "}SÓLO MOS.
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
