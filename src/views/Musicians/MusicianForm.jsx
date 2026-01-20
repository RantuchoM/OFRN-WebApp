import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  IconSave,
  IconX,
  IconLoader,
  IconLink,
  IconUser,
  IconId,
  IconFileText,
  IconMapPin,
  IconPlus,
  IconUpload,
  IconCheck,
  IconTrash,
  IconClipboard,
  IconLayoutGrid,
  IconFilePlus,
  IconExternalLink,
  IconEye,
} from "../../components/ui/Icons";
import SearchableSelect from "../../components/ui/SearchableSelect";
import DateInput from "../../components/ui/DateInput";

// --- UTILIDAD DE COMPRESIÓN ---
const compressImage = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 1200;
        const scaleSize = MAX_WIDTH / img.width;
        const width = scaleSize < 1 ? MAX_WIDTH : img.width;
        const height = scaleSize < 1 ? img.height * scaleSize : img.height;
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            const newFile = new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, ".jpg"),
              {
                type: "image/jpeg",
                lastModified: Date.now(),
              },
            );
            resolve(newFile);
          },
          "image/jpeg",
          0.7,
        );
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

// --- HOOK DE DEBOUNCE ---
function useDebouncedCallback(callback, delay) {
  const handler = useRef(null);
  return useCallback(
    (...args) => {
      if (handler.current) clearTimeout(handler.current);
      handler.current = setTimeout(() => callback(...args), delay);
    },
    [callback, delay],
  );
}

export default function MusicianForm({ supabase, musician, onSave, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [assemblingType, setAssemblingType] = useState(null); // 'full' | 'mosaic' | 'dj' | null
  const [uploadingField, setUploadingField] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldStatuses, setFieldStatuses] = useState({});

  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);
  const [locationsOptions, setLocationsOptions] = useState([]);

  // Estilos base
  const inputClass =
    "w-full border border-slate-300 p-2.5 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400";
  const labelClass =
    "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1";

  const [formData, setFormData] = useState({
    id: null,
    nombre: "",
    apellido: "",
    domicilio: "",
    id_instr: "",
    dni: "",
    cuil: "",
    mail: "",
    telefono: "",
    condicion: "Estable",
    genero: "Masculino",
    alimentacion: "",
    nacionalidad: "Argentina",
    fecha_nac: "",
    fecha_alta: "",
    fecha_baja: "",
    email_google: "",
    id_localidad: null,
    id_loc_viaticos: null,
    link_bio: "",
    link_foto_popup: "",
    documentacion: "",
    docred: "",
    firma: "",
    email_acceso: "",
    rol_sistema: "user",
    clave_acceso: "",
    es_simulacion: false,
    link_dni_img: "",
    link_cbu_img: "",
    link_declaracion: "",
    link_cuil: "",
    ...musician,
  });

  useEffect(() => {
    const fetchCatalogs = async () => {
      const { data: instrData } = await supabase
        .from("instrumentos")
        .select("id, instrumento")
        .order("instrumento");
      if (instrData) setCatalogoInstrumentos(instrData);
      const { data: locData } = await supabase
        .from("localidades")
        .select("id, localidad")
        .order("localidad");
      if (locData)
        setLocationsOptions(
          locData.map((l) => ({ id: l.id, label: l.localidad, value: l.id })),
        );
    };
    fetchCatalogs();
  }, [supabase]);

  // Solo resetear cuando el ID del músico cambia para evitar rebotes de input
  useEffect(() => {
    if (musician && musician.id !== formData.id) {
      setFormData((prev) => ({
        ...prev,
        ...musician,
        id_localidad: musician.id_localidad || null,
        id_loc_viaticos: musician.id_loc_viaticos || null,
        id_instr: musician.id_instr ? String(musician.id_instr) : "",
      }));
    }
  }, [musician?.id, formData.id]);

  const extractPathFromUrl = (url) => {
    if (!url) return null;
    if (url.includes("firmas/")) return url.split("firmas/")[1];
    if (url.includes("musician-docs/")) return url.split("musician-docs/")[1];
    return null;
  };

  const deleteOldFile = async (url, bucket = "musician-docs") => {
    const path = extractPathFromUrl(url);
    if (path) await supabase.storage.from(bucket).remove([path]);
  };

  const saveFieldToDb = async (field, value) => {
    if (!formData.id) return;
    setFieldStatuses((prev) => ({ ...prev, [field]: "saving" }));
    try {
      const sanitizeId = (val) => (!val ? null : parseInt(val, 10));
      let valToSave = value === "" ? null : value;
      if (field === "id_localidad" || field === "id_loc_viaticos")
        valToSave = sanitizeId(value);
      if (field === "es_simulacion") valToSave = !!value;

      const { error } = await supabase
        .from("integrantes")
        .update({ [field]: valToSave })
        .eq("id", formData.id);
      if (error) throw error;

      setFieldStatuses((prev) => ({ ...prev, [field]: "saved" }));
      setTimeout(
        () => setFieldStatuses((prev) => ({ ...prev, [field]: "idle" })),
        2000,
      );
      if (onSave)
        onSave({ ...formData, [field]: valToSave, id: formData.id }, false);
    } catch (e) {
      setFieldStatuses((prev) => ({ ...prev, [field]: "error" }));
    }
  };

  const debouncedSave = useDebouncedCallback(saveFieldToDb, 800);

  const updateField = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
    if (formData.id) debouncedSave(field, val);
  };

  const uploadToSupabase = async (file, field, oldUrl) => {
    setUploadingField(field);
    setFieldStatuses((prev) => ({ ...prev, [field]: "saving" }));
    const bucket = field === "firma" ? "firmas" : "musician-docs";

    try {
      if (oldUrl) await deleteOldFile(oldUrl, bucket);
      let fileToUpload = file;
      if (file.type.startsWith("image/") && field !== "firma")
        fileToUpload = await compressImage(file);

      const fileExt = fileToUpload.name.split(".").pop();
      const fileName =
        `${formData.apellido || "musician"}_${field}_${Date.now()}.${fileExt}`.toLowerCase();
      const filePath = field === "firma" ? fileName : `docs/${fileName}`;

      const { error } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload);
      if (error) throw error;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, [field]: publicUrl }));
      await saveFieldToDb(field, publicUrl);
    } catch (error) {
      setFieldStatuses((prev) => ({ ...prev, [field]: "error" }));
    } finally {
      setUploadingField(null);
    }
  };

  const handleClipboardClick = async (field, currentUrl) => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const file = new File([blob], `captured_${field}.png`, {
              type: "image/png",
            });
            uploadToSupabase(file, field, currentUrl);
            return;
          }
        }
      }
    } catch (err) {
      alert("Acceso al portapapeles denegado.");
    }
  };

  const handleAssemble = async (layout) => {
    if (!formData.id) return alert("Guarda la ficha primero.");
    const sources = [
      formData.link_dni_img,
      formData.link_cuil,
      formData.link_cbu_img,
      formData.link_declaracion,
    ].filter((l) => !!l);
    if (sources.length === 0) return alert("Carga archivos primero.");

    setAssemblingType(layout);
    const targetField = layout === "full" ? "documentacion" : "docred";
    setFieldStatuses((prev) => ({ ...prev, [targetField]: "saving" }));

    try {
      if (formData[targetField]) await deleteOldFile(formData[targetField]);
      const fileName = `${formData.apellido}_${formData.nombre}_${layout === "full" ? "DOC" : "MOS"}`;
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "assemble_docs_bucket", layout, sources, fileName },
      });
      if (error) throw error;
      setFormData((prev) => ({ ...prev, [targetField]: data.url }));
      await saveFieldToDb(targetField, data.url);
      window.open(data.url, "_blank");
    } catch (error) {
      setFieldStatuses((prev) => ({ ...prev, [targetField]: "error" }));
    } finally {
      setAssemblingType(null);
    }
  };

  const handleGenerateDJ = async () => {
    if (!formData.id) return alert("Guarda la ficha primero.");
    if (!formData.firma)
      return alert(
        "El músico debe tener una firma cargada para generar la DJ.",
      );

    setAssemblingType("dj");
    setFieldStatuses((prev) => ({ ...prev, link_declaracion: "saving" }));

    try {
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "generate_dj_bucket", musicianId: formData.id },
      });
      if (error) throw error;

      setFormData((prev) => ({ ...prev, link_declaracion: data.url }));
      setFieldStatuses((prev) => ({ ...prev, link_declaracion: "saved" }));
      setTimeout(
        () =>
          setFieldStatuses((prev) => ({ ...prev, link_declaracion: "idle" })),
        2000,
      );
      window.open(data.url, "_blank");
    } catch (e) {
      alert("Error: " + e.message);
      setFieldStatuses((prev) => ({ ...prev, link_declaracion: "error" }));
    } finally {
      setAssemblingType(null);
    }
  };

  const handleCreateInitial = async (e) => {
    e.preventDefault();
    if (!formData.apellido || !formData.nombre)
      return alert("Faltan datos obligatorios.");
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("integrantes")
        .insert([
          {
            nombre: formData.nombre,
            apellido: formData.apellido,
            domicilio: formData.domicilio,
          },
        ])
        .select()
        .single();
      if (error) throw error;
      setFormData((prev) => ({ ...prev, id: data.id }));
      if (onSave) onSave(data, false);
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getInputStatusClass = (fieldName) => {
    const status = fieldStatuses[fieldName];
    if (status === "saving")
      return (
        inputClass + " border-orange-500 ring-4 ring-orange-50 bg-orange-50/10"
      );
    if (status === "saved")
      return (
        inputClass +
        " border-emerald-500 ring-4 ring-emerald-50 bg-emerald-50/10"
      );
    return inputClass;
  };

  const FileUploader = ({ label, field, value }) => {
    const status = fieldStatuses[field];
    const isPdf = value && value.toLowerCase().endsWith(".pdf");
    const bucket = field === "firma" ? "firmas" : "musician-docs";

    return (
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-bold uppercase text-slate-400 ml-1">
          {label}
        </label>
        <div
          className={`relative h-48 rounded-3xl border-2 transition-all overflow-hidden group ${
            status === "saving"
              ? "border-orange-400 ring-4 ring-orange-50"
              : status === "saved"
                ? "border-emerald-400 ring-4 ring-emerald-50"
                : value
                  ? "border-emerald-100 bg-white"
                  : "border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300"
          }`}
        >
          {value ? (
            <>
              {isPdf ? (
                <div className="w-full h-full flex flex-col items-center justify-center bg-emerald-50/20">
                  <IconFileText size={48} className="text-emerald-400" />
                </div>
              ) : (
                <img
                  src={value}
                  className="w-full h-full object-contain p-2"
                  alt={label}
                />
              )}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3">
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-white rounded-xl text-indigo-600 shadow-xl hover:scale-110 transition-transform"
                >
                  <IconEye size={20} />
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    await deleteOldFile(value, bucket);
                    updateField(field, "");
                  }}
                  className="p-3 bg-white rounded-xl text-red-500 shadow-xl hover:scale-110 transition-transform"
                >
                  <IconTrash size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col p-4">
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                {uploadingField === field ? (
                  <IconLoader className="animate-spin" size={32} />
                ) : (
                  <IconUpload size={32} />
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleClipboardClick(field, value)}
                  className="bg-indigo-600 text-white py-2.5 rounded-xl text-[10px] font-black tracking-widest hover:bg-indigo-700 active:scale-95"
                >
                  <IconClipboard size={14} className="inline mr-1" /> PEGAR
                </button>
                <label className="bg-white border border-slate-200 text-slate-500 py-2.5 rounded-xl text-[10px] font-black text-center cursor-pointer uppercase tracking-tighter hover:bg-slate-50 active:scale-95">
                  Subir{" "}
                  <input
                    type="file"
                    className="hidden"
                    onChange={(e) =>
                      uploadToSupabase(e.target.files[0], field, value)
                    }
                  />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[60] p-4 backdrop-blur-md">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col animate-in zoom-in-95 duration-300 overflow-hidden border border-white/20">
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
            onClick={onCancel}
            className="bg-white p-2 rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-all focus:outline-none"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex border-b text-[10px] font-black uppercase tracking-[0.2em] bg-white overflow-x-auto">
          {[
            { id: "personal", label: "Personal", icon: <IconId size={16} /> },
            {
              id: "docs_upload",
              label: "Archivos",
              icon: <IconUpload size={16} />,
            },
            {
              id: "docs",
              label: "Links Sistema",
              icon: <IconLink size={16} />,
            },
            {
              id: "acceso",
              label: "Seguridad",
              icon: <IconFileText size={16} />,
            },
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

        <div className="flex-1 overflow-y-auto p-8 bg-white">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-8">
            {activeTab === "personal" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Apellido</label>
                    <input
                      type="text"
                      className={getInputStatusClass("apellido")}
                      value={formData.apellido || ""}
                      onChange={(e) => updateField("apellido", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Nombre</label>
                    <input
                      type="text"
                      className={getInputStatusClass("nombre")}
                      value={formData.nombre || ""}
                      onChange={(e) => updateField("nombre", e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Domicilio</label>
                  <input
                    type="text"
                    className={getInputStatusClass("domicilio")}
                    value={formData.domicilio || ""}
                    onChange={(e) => updateField("domicilio", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className={labelClass}>DNI</label>
                    <input
                      type="text"
                      className={getInputStatusClass("dni")}
                      value={formData.dni || ""}
                      onChange={(e) => updateField("dni", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>CUIL</label>
                    <input
                      type="text"
                      className={getInputStatusClass("cuil")}
                      value={formData.cuil || ""}
                      onChange={(e) => updateField("cuil", e.target.value)}
                    />
                  </div>
                  <div>
                    <DateInput
                      label="Nacimiento"
                      value={formData.fecha_nac || ""}
                      onChange={(val) => updateField("fecha_nac", val)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6 pt-6 border-t">
                  <div className="relative z-50">
                    <label className={labelClass}>Residencia</label>
                    <SearchableSelect
                      options={locationsOptions}
                      value={formData.id_localidad}
                      onChange={(val) => updateField("id_localidad", val)}
                    />
                  </div>
                  <div className="relative z-40">
                    <label className={labelClass}>Viáticos</label>
                    <SearchableSelect
                      options={locationsOptions}
                      value={formData.id_loc_viaticos}
                      onChange={(val) => updateField("id_loc_viaticos", val)}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "docs_upload" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  <FileUploader
                    label="DNI"
                    field="link_dni_img"
                    value={formData.link_dni_img}
                  />
                  <FileUploader
                    label="CUIL"
                    field="link_cuil"
                    value={formData.link_cuil}
                  />
                  <FileUploader
                    label="CBU"
                    field="link_cbu_img"
                    value={formData.link_cbu_img}
                  />
                  <FileUploader
                    label="Declaración"
                    field="link_declaracion"
                    value={formData.link_declaracion}
                  />
                  <FileUploader
                    label="Firma Digital (PNG)"
                    field="firma"
                    value={formData.firma}
                  />
                </div>
                <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col md:flex-row items-center gap-8 shadow-2xl border border-slate-800">
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">
                      Documentación Inteligente
                    </h4>
                    <div className="flex flex-wrap gap-4 mt-3">
                      {["documentacion", "docred", "link_declaracion"].map(
                        (field) =>
                          formData[field] && (
                            <div
                              key={field}
                              className={`text-[9px] font-bold px-2 py-1 rounded flex items-center gap-2 transition-all ${fieldStatuses[field] === "saving" ? "bg-orange-500 text-white animate-pulse" : fieldStatuses[field] === "saved" ? "bg-emerald-500 text-white" : "bg-slate-800 text-indigo-300"}`}
                            >
                              <IconCheck size={10} />{" "}
                              {field === "link_declaracion"
                                ? "DJ LISTA"
                                : field === "documentacion"
                                  ? "FULL LISTO"
                                  : "MOSAICO LISTO"}
                            </div>
                          ),
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 justify-center">
                    <button
                      type="button"
                      disabled={assemblingType !== null}
                      onClick={handleGenerateDJ}
                      className={`py-4 px-6 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-3 border-2 ${assemblingType === "dj" ? "bg-orange-500 border-orange-500 text-white animate-pulse" : "border-indigo-500 text-indigo-400 hover:bg-indigo-500 hover:text-white active:scale-95"}`}
                    >
                      {assemblingType === "dj" ? (
                        <IconLoader className="animate-spin" size={16} />
                      ) : (
                        <IconFileText size={18} />
                      )}{" "}
                      DJ FIRMADA
                    </button>
                    <button
                      type="button"
                      disabled={assemblingType !== null}
                      onClick={() => handleAssemble("full")}
                      className={`py-4 px-6 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-3 shadow-xl ${assemblingType === "full" ? "bg-orange-500 text-white animate-pulse" : "bg-white text-slate-900 hover:bg-indigo-500 hover:text-white active:scale-95"}`}
                    >
                      {assemblingType === "full" ? (
                        <IconLoader className="animate-spin" size={16} />
                      ) : (
                        <IconFilePlus size={18} />
                      )}{" "}
                      FULL
                    </button>
                    <button
                      type="button"
                      disabled={assemblingType !== null}
                      onClick={() => handleAssemble("mosaic")}
                      className={`py-4 px-6 rounded-2xl text-[11px] font-black transition-all flex items-center justify-center gap-3 border-2 ${assemblingType === "mosaic" ? "border-orange-500 text-orange-500 animate-pulse" : "border-slate-700 text-white hover:bg-slate-800 active:scale-95"}`}
                    >
                      {assemblingType === "mosaic" ? (
                        <IconLoader className="animate-spin" size={16} />
                      ) : (
                        <IconLayoutGrid size={18} />
                      )}{" "}
                      MOSAICO
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "docs" && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                  {["documentacion", "docred"].map((field) => (
                    <div key={field}>
                      <label
                        className={`${labelClass} ${field === "documentacion" ? "text-indigo-600" : "text-emerald-600"}`}
                      >
                        {field === "documentacion" ? "PDF FULL" : "PDF MOSAICO"}
                      </label>
                      <div className="flex gap-3">
                        <input
                          type="text"
                          readOnly
                          className={getInputStatusClass(field)}
                          value={formData[field] || ""}
                        />
                        {formData[field] && (
                          <a
                            href={formData[field]}
                            target="_blank"
                            rel="noreferrer"
                            className={`p-3 rounded-xl text-white shadow-lg ${field === "documentacion" ? "bg-indigo-600" : "bg-emerald-600"}`}
                          >
                            <IconEye size={20} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className={labelClass}>Bio (Drive/Web)</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={formData.link_bio || ""}
                      onChange={(e) => updateField("link_bio", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Foto Perfil (Popup)</label>
                    <input
                      type="text"
                      className={inputClass}
                      value={formData.link_foto_popup || ""}
                      onChange={(e) =>
                        updateField("link_foto_popup", e.target.value)
                      }
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "acceso" && (
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
            )}

            <div className="pt-8 border-t flex justify-end items-center gap-4 sticky bottom-0 bg-white pb-4">
              <button
                type="button"
                onClick={onCancel}
                className="text-slate-400 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-all"
              >
                Cerrar
              </button>
              {!formData.id && (
                <button
                  onClick={handleCreateInitial}
                  disabled={loading}
                  className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 flex items-center gap-3"
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
      </div>
    </div>
  );
}
