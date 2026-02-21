import React from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import MusicianTourManager from "./MusicianTourManager";
import { useMusicianForm } from "../../hooks/useMusicianForm";
import { MusicianFormContext } from "./MusicianFormContext";
import MusicianPersonalSection from "./MusicianPersonalSection";
import MusicianDocsUploadSection from "./MusicianDocsUploadSection";
import MusicianDocsSection from "./MusicianDocsSection";
import MusicianAccesoSection from "./MusicianAccesoSection";
import {
  IconSave,
  IconX,
  IconLoader,
  IconLink,
  IconUser,
  IconId,
  IconPlus,
  IconUpload,
  IconCheck,
  IconInfo,
  IconScissor,
  IconCalendar,
} from "../../components/ui/Icons";

export default function MusicianForm({ supabase, musician, onSave, onCancel }) {
  const ctx = useMusicianForm(musician, supabase, onSave);
  const {
    formData,
    musicianForGiras,
    loading,
    activeTab,
    setActiveTab,
    isValid,
    handleSubmit,
    handleCreateInitial,
    cropModal,
    setCropModal,
    crop,
    setCrop,
    setCompletedCrop,
    completedCrop,
    imgRef,
    handleConfirmCrop,
  } = ctx;

  return (
    <MusicianFormContext.Provider value={{ ...ctx, onCancel }}>
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden border border-white/20">
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black text-slate-800 flex items-center gap-3 text-xl uppercase tracking-tighter">
            {formData.id ? (
              <IconUser className="text-indigo-500" />
            ) : (
              <IconPlus className="text-indigo-600" />
            )}
            {formData.id
              ? `Ficha: ${formData.apellido || ""}`
              : "Nuevo Integrante"}
          </h3>
          <button
            onClick={() => onCancel(formData)} // CAMBIO 1: Pasar formData
            className="bg-white p-2 rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-all focus:outline-none"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b text-[13px] font-black uppercase tracking-[0.2em] bg-white overflow-x-auto shrink-0">
          {[
            { id: "personal", label: "Personal", icon: <IconId size={16} /> },
            {
              id: "docs_upload",
              label: "Documentación",
              icon: <IconUpload size={16} />,
            },
            { id: "docs", label: "Sistema", icon: <IconLink size={16} /> },

            { id: "giras", label: "Giras", icon: <IconCalendar size={16} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 p-5 flex items-center justify-center gap-2 border-b-4 transition-all ${activeTab === tab.id ? "border-indigo-600 text-indigo-600 bg-indigo-50/30" : "border-transparent text-slate-300 hover:bg-slate-50"}`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
            {activeTab === "personal" && <MusicianPersonalSection />}

            {activeTab === "docs_upload" && <MusicianDocsUploadSection />}

            {activeTab === "docs" && <MusicianDocsSection />}

            {activeTab === "acceso" && <MusicianAccesoSection />}
            {activeTab === "giras" && formData.id && (
              <div className="h-full overflow-hidden flex flex-col">
                <MusicianTourManager
                  supabase={supabase}
                  musician={musicianForGiras}
                />
              </div>
            )}
            {activeTab === "giras" && !formData.id && (
              <div className="text-center p-10 text-slate-400">
                Debes guardar la ficha del músico antes de gestionar sus giras.
              </div>
            )}

            <div className="pt-8 border-t flex justify-end items-center gap-4 sticky bottom-0 bg-white pb-4 z-10 shrink-0">
              <button
                type="button"
                onClick={() => onCancel(formData)} // CAMBIO 1 (Footer): Pasar formData
                className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-all"
              >
                Cerrar
              </button>
              {!formData.id && (
                <button
                  type="button"
                  onClick={handleSubmit(handleCreateInitial)}
                  disabled={loading || !isValid}
                  className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <IconLoader className="animate-spin" size={18} />
                  ) : (
                    <IconSave size={18} />
                  )}{" "}
                  CREAR FICHA
                </button>
              )}
              {formData.id && (
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>{" "}
                  Sincronizado
                </div>
              )}
            </div>
          </form>
        </div>

        {/* --- MODAL DE RECORTE (DIBUJADO LIBRE) --- */}
        {cropModal.isOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col animate-in fade-in duration-300">
            <div className="p-4 flex justify-between items-center bg-slate-900 text-white shadow-xl">
              <h4 className="font-black text-xs uppercase tracking-widest flex items-center gap-2 text-orange-400">
                <IconScissor size={16} /> Recorte Manual: Dibuja el cuadro
              </h4>
              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setCropModal({
                      isOpen: false,
                      field: null,
                      image: null,
                      isPng: false,
                    });
                    setCompletedCrop(null);
                  }}
                  className="text-xs font-bold uppercase opacity-50 hover:opacity-100 transition-opacity"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmCrop}
                  disabled={loading || !completedCrop}
                  className="bg-indigo-600 px-8 py-2.5 rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-500 disabled:bg-slate-700 flex items-center gap-2"
                >
                  {loading ? (
                    <IconLoader className="animate-spin" size={14} />
                  ) : (
                    <IconCheck size={16} />
                  )}{" "}
                  Guardar Recorte
                </button>
              </div>
            </div>
            <div className="flex-1 relative bg-black overflow-auto flex items-center justify-center p-10">
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={(c) => setCompletedCrop(c)}
              >
                <img
                  ref={imgRef}
                  src={cropModal.image}
                  alt="Recortar"
                  crossOrigin="anonymous"
                  style={{ maxHeight: "70vh" }}
                />
              </ReactCrop>
            </div>
            <div className="p-8 bg-slate-900 border-t border-slate-800 text-center">
              <p className="text-[10px] text-slate-400 italic">
                <IconInfo size={12} className="inline mr-1 text-indigo-400" />{" "}
                Haz clic y arrastra sobre la imagen para{" "}
                <strong>dibujar</strong> el área de recorte. Puedes ajustar los
                bordes después.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
    </MusicianFormContext.Provider>
  );
}
