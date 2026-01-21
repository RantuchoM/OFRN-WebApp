import React, { useState, useEffect, useRef, useCallback } from "react";
import ReactCrop from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import * as pdfjsLib from "pdfjs-dist";

// Configuración del worker de PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

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
  IconInfo,
  IconScissor,
} from "../../components/ui/Icons";
import SearchableSelect from "../../components/ui/SearchableSelect";
import DateInput from "../../components/ui/DateInput";

// --- UTILIDAD: SANEAR NOMBRES (Álvarez -> alvarez) ---
const sanitizeFilename = (str) => {
  if (!str) return "archivo";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ñ/g, "n")
    .replace(/Ñ/g, "N")
    .replace(/[^a-zA-Z0-9.-]/g, "_")
    .toLowerCase();
};

// --- UTILIDAD: PDF A IMAGEN ---
const convertPdfToImage = async (pdfUrl) => {
  try {
    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    await page.render({ canvasContext: context, viewport: viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.95);
  } catch (error) {
    throw error;
  }
};

// --- UTILIDAD: RECORTE ---
const getCroppedImg = async (image, crop, isPng = false) => {
  const canvas = document.createElement("canvas");
  const scaleX = image.naturalWidth / image.width;
  const scaleY = image.naturalHeight / image.height;
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext("2d");
  if (!isPng) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(
    image,
    crop.x * scaleX,
    crop.y * scaleY,
    crop.width * scaleX,
    crop.height * scaleY,
    0,
    0,
    crop.width,
    crop.height,
  );
  return new Promise((resolve) => {
    const type = isPng ? "image/png" : "image/jpeg";
    canvas.toBlob(
      (blob) => {
        resolve(
          new File([blob], `cropped_${Date.now()}.${isPng ? "png" : "jpg"}`, {
            type,
          }),
        );
      },
      type,
      0.95,
    );
  });
};

// --- UTILIDAD: COMPRESIÓN ---
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
            resolve(
              new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
                lastModified: Date.now(),
              }),
            );
          },
          "image/jpeg",
          0.7,
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

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
  const [assemblingType, setAssemblingType] = useState(null);
  const [uploadingField, setUploadingField] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldStatuses, setFieldStatuses] = useState({});

  const [cropModal, setCropModal] = useState({
    isOpen: false,
    field: null,
    image: null,
    isPng: false,
  });
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);

  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);
  const [locationsOptions, setLocationsOptions] = useState([]);

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

  useEffect(() => {
    if (musician && musician.id !== formData.id) {
      setFormData((prev) => ({
        ...prev,
        ...musician,
        fecha_alta: musician.fecha_alta || "", // <-- Agregar esto
        fecha_baja: musician.fecha_baja || "", // <-- Agregar esto
        id_localidad: musician.id_localidad || null,
        id_loc_viaticos: musician.id_loc_viaticos || null,
        id_instr: musician.id_instr ? String(musician.id_instr) : "",
      }));
    }
  }, [musician?.id, formData.id]);

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
      const { error } = await supabase
        .from("integrantes")
        .update({ [field]: value === "" ? null : value })
        .eq("id", formData.id);
      if (error) throw error;
      setFieldStatuses((prev) => ({ ...prev, [field]: "saved" }));
      setTimeout(
        () => setFieldStatuses((prev) => ({ ...prev, [field]: "idle" })),
        2000,
      );
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
    if (!file) return;
    setUploadingField(field);
    setFieldStatuses((prev) => ({ ...prev, [field]: "saving" }));
    const bucket = field === "firma" ? "firmas" : "musician-docs";

    try {
      if (oldUrl) await deleteOldFile(oldUrl, bucket);
      let fileToUpload = file;

      if (
        file.type.startsWith("image/") &&
        field !== "firma" &&
        !file.name.includes("cropped")
      ) {
        fileToUpload = await compressImage(file);
      }

      // --- CAMBIO CLAVE: SANEAMIENTO DE NOMBRE ---
      const fileExt = file.type === "image/png" ? "png" : "jpg";
      const cleanSurname = sanitizeFilename(formData.apellido || "musician");
      const fileName = `${cleanSurname}_${field}_${Date.now()}.${fileExt}`;
      const filePath = field === "firma" ? fileName : `docs/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      await supabase
        .from("integrantes")
        .update({
          [field]: publicUrl,
          last_modified_at: new Date().toISOString(),
        })
        .eq("id", formData.id);

      const updatedState = { ...formData, [field]: publicUrl };
      setFormData(updatedState);
      if (onSave) onSave(updatedState, false);

      setFieldStatuses((prev) => ({ ...prev, [field]: "saved" }));
      setTimeout(
        () => setFieldStatuses((prev) => ({ ...prev, [field]: "idle" })),
        2000,
      );
    } catch (error) {
      console.error("DEBUG - Upload Error:", error);
      setFieldStatuses((prev) => ({ ...prev, [field]: "error" }));
    } finally {
      setUploadingField(null);
    }
  };

  const handleStartCrop = async (field, url) => {
    setLoading(true);
    try {
      let imageUrl = url;
      const isPdf = url.toLowerCase().includes(".pdf");
      const isPng = url.toLowerCase().includes(".png") || field === "firma";
      if (isPdf) imageUrl = await convertPdfToImage(url);
      setCropModal({ isOpen: true, field, image: imageUrl, isPng });
    } catch (e) {
      alert("Error al cargar imagen");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCrop = async () => {
    if (!completedCrop || !imgRef.current) return;
    try {
      setLoading(true);
      const croppedFile = await getCroppedImg(
        imgRef.current,
        completedCrop,
        cropModal.isPng,
      );
      await uploadToSupabase(
        croppedFile,
        cropModal.field,
        formData[cropModal.field],
      );
      setCropModal({ isOpen: false, field: null, image: null, isPng: false });
      setCompletedCrop(null);
    } catch (e) {
      alert("Error al guardar recorte");
    } finally {
      setLoading(false);
    }
  };

  const handleClipboardClick = async (field, currentUrl) => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const file = new File([blob], `pasted_${field}.png`, {
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
    ].filter(Boolean);
    if (sources.length === 0) return alert("No hay archivos para unir.");

    setAssemblingType(layout);
    const targetField = layout === "full" ? "documentacion" : "docred";
    setFieldStatuses((p) => ({ ...p, [targetField]: "saving" }));

    try {
      const fileName = `${formData.apellido}_${formData.nombre}_${layout === "full" ? "DOC" : "MOS"}`;
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "assemble_docs_bucket", layout, sources, fileName },
      });
      if (error) throw error;
      const updated = { ...formData, [targetField]: data.url };
      setFormData(updated);
      if (onSave) onSave(updated, false);
      setFieldStatuses((p) => ({ ...p, [targetField]: "saved" }));
      setTimeout(
        () => setFieldStatuses((p) => ({ ...p, [targetField]: "idle" })),
        2000,
      );
      window.open(data.url, "_blank");
    } catch (e) {
      setFieldStatuses((p) => ({ ...p, [targetField]: "error" }));
    } finally {
      setAssemblingType(null);
    }
  };

  const handleGenerateDJ = async () => {
    if (!formData.id || !formData.firma) return alert("Faltan datos o firma.");
    setAssemblingType("dj");
    setFieldStatuses((p) => ({ ...p, link_declaracion: "saving" }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "generate_dj_bucket", musicianId: formData.id },
      });
      if (error) throw error;
      const updated = { ...formData, link_declaracion: data.url };
      setFormData(updated);
      if (onSave) onSave(updated, false);
      setFieldStatuses((p) => ({ ...p, link_declaracion: "saved" }));
      setTimeout(
        () => setFieldStatuses((p) => ({ ...p, link_declaracion: "idle" })),
        2000,
      );
      window.open(data.url, "_blank");
    } catch (e) {
      setFieldStatuses((p) => ({ ...p, link_declaracion: "error" }));
    } finally {
      setAssemblingType(null);
    }
  };

  const handleFullPack = async () => {
    if (!formData.id || !formData.firma) return alert("Faltan datos o firma.");
    setAssemblingType("all");
    setFieldStatuses((p) => ({
      ...p,
      link_declaracion: "saving",
      documentacion: "saving",
      docred: "saving",
    }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "assemble_full_pack", musicianId: formData.id },
      });
      if (error) throw error;
      const updated = {
        ...formData,
        link_declaracion: data.urls.dj,
        documentacion: data.urls.full,
        docred: data.urls.mosaic,
      };
      setFormData(updated);
      if (onSave) onSave(updated, false);
      setFieldStatuses((p) => ({
        ...p,
        link_declaracion: "saved",
        documentacion: "saved",
        docred: "saved",
      }));
      setTimeout(
        () =>
          setFieldStatuses((p) => ({
            ...p,
            link_declaracion: "idle",
            documentacion: "idle",
            docred: "idle",
          })),
        2000,
      );
    } catch (e) {
      setFieldStatuses((p) => ({
        ...p,
        link_declaracion: "error",
        documentacion: "error",
        docred: "error",
      }));
    } finally {
      setAssemblingType(null);
    }
  };

  const handleCreateInitial = async (e) => {
    e.preventDefault();
    if (!formData.apellido || !formData.nombre)
      return alert("Apellido y Nombre son obligatorios.");
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

  // --- COMPONENTE FILE UPLOADER (CON DRAG & DROP) ---
  const FileUploader = ({ label, field, value }) => {
    const [isDragging, setIsDragging] = useState(false);
    const status = fieldStatuses[field];
    const isPdf = value && value.toLowerCase().includes(".pdf");
    const bucket = field === "firma" ? "firmas" : "musician-docs";

    const handleDrag = (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
      else if (e.type === "dragleave") setIsDragging(false);
    };

    const handleDrop = (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        uploadToSupabase(e.dataTransfer.files[0], field, value);
      }
    };

    return (
      <div className="flex flex-col gap-2">
        <label className="text-[9px] font-black uppercase text-slate-400 ml-1 tracking-tighter">
          {label}
        </label>
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative h-40 rounded-3xl border-2 transition-all overflow-hidden group ${isDragging ? "border-indigo-500 bg-indigo-50/50 scale-[1.02] shadow-lg" : ""} ${status === "saving" ? "border-orange-400 ring-4 ring-orange-50" : status === "saved" ? "border-emerald-400 ring-4 ring-emerald-50" : value ? "border-emerald-100 bg-white" : "border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300"}`}
        >
          {value ? (
            <>
              {isPdf ? (
                <div className="w-full h-full bg-slate-100 overflow-hidden relative">
                  <iframe
                    src={`${value}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full pointer-events-none"
                    frameBorder="0"
                  />
                  <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded font-bold shadow-sm z-10">
                    PDF
                  </div>
                </div>
              ) : (
                <img
                  src={value}
                  className="w-full h-full object-contain p-2"
                  alt={label}
                />
              )}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-3 z-20">
                <button
                  type="button"
                  onClick={() => handleStartCrop(field, value)}
                  className="p-3 bg-white rounded-xl text-orange-500 shadow-xl hover:scale-110"
                  title="Recortar"
                >
                  <IconScissor size={20} />
                </button>
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="p-3 bg-white rounded-xl text-indigo-600 shadow-xl hover:scale-110"
                >
                  <IconEye size={20} />
                </a>
                <button
                  type="button"
                  onClick={async () => {
                    if (confirm("¿Eliminar?")) {
                      await deleteOldFile(value, bucket);
                      updateField(field, "");
                    }
                  }}
                  className="p-3 bg-white rounded-xl text-red-500 shadow-xl hover:scale-110"
                >
                  <IconTrash size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col p-4 justify-center">
              <div className="flex-1 flex flex-col items-center justify-center text-slate-300 mb-2 pointer-events-none">
                {uploadingField === field || loading ? (
                  <IconLoader className="animate-spin" size={24} />
                ) : (
                  <IconUpload
                    size={24}
                    className={
                      isDragging ? "text-indigo-500 animate-bounce" : ""
                    }
                  />
                )}
                {isDragging && (
                  <span className="text-[8px] font-black mt-2 text-indigo-500 uppercase">
                    Soltar Aquí
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => handleClipboardClick(field, value)}
                  className="bg-indigo-600 text-white py-2 rounded-xl text-[8px] font-black tracking-widest hover:bg-indigo-700 active:scale-95"
                >
                  <IconClipboard size={12} className="inline mr-1" /> PEGAR
                </button>
                <label className="bg-white border border-slate-200 text-slate-500 py-2 rounded-xl text-[8px] font-black text-center cursor-pointer uppercase hover:bg-slate-50 active:scale-95">
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
            onClick={onCancel}
            className="bg-white p-2 rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-all focus:outline-none"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b text-[10px] font-black uppercase tracking-[0.2em] bg-white overflow-x-auto shrink-0">
          {[
            { id: "personal", label: "Personal", icon: <IconId size={16} /> },
            {
              id: "docs_upload",
              label: "Documentación",
              icon: <IconUpload size={16} />,
            },
            { id: "docs", label: "Sistema", icon: <IconLink size={16} /> },
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

        <div className="flex-1 overflow-y-auto p-8 bg-white custom-scrollbar">
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
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <DateInput
                      label="Fecha Alta"
                      value={formData.fecha_alta || ""}
                      onChange={(val) => updateField("fecha_alta", val)}
                    />
                  </div>
                  <div>
                    <DateInput
                      label="Fecha Baja"
                      value={formData.fecha_baja || ""}
                      onChange={(val) => updateField("fecha_baja", val)}
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
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>{" "}
                    Documentación Base
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <FileUploader
                      label="DNI Frontal/Dorso"
                      field="link_dni_img"
                      value={formData.link_dni_img}
                    />
                    <FileUploader
                      label="Constancia CUIL"
                      field="link_cuil"
                      value={formData.link_cuil}
                    />
                    <FileUploader
                      label="Constancia CBU"
                      field="link_cbu_img"
                      value={formData.link_cbu_img}
                    />
                    <FileUploader
                      label="Firma Digital (PNG)"
                      field="firma"
                      value={formData.firma}
                    />
                  </div>
                </div>
                <div className="border-t border-slate-100 relative">
                  <div className="absolute inset-0 flex items-center justify-center -top-3">
                    <div className="bg-white px-4 py-1 border border-slate-100 rounded-full shadow-sm">
                      <IconLoader
                        className={
                          assemblingType
                            ? "animate-spin text-orange-500"
                            : "text-slate-200"
                        }
                        size={14}
                      />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>{" "}
                    Expediente Resultante
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FileUploader
                      label="Declaración Jurada"
                      field="link_declaracion"
                      value={formData.link_declaracion}
                    />
                    <FileUploader
                      label="PDF Unificado (Full)"
                      field="documentacion"
                      value={formData.documentacion}
                    />
                    <FileUploader
                      label="PDF Mosaico (Red)"
                      field="docred"
                      value={formData.docred}
                    />
                  </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex flex-col lg:flex-row items-center gap-6 shadow-2xl border border-slate-800">
                  <div className="flex-1">
                    <h4 className="text-sm font-black text-indigo-400 uppercase tracking-widest">
                      Motor de Expedientes
                    </h4>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold tracking-tighter">
                      Generación automática mediante last_modified_at.
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 w-full lg:w-auto">
                    <button
                      type="button"
                      disabled={assemblingType !== null}
                      onClick={handleFullPack}
                      className={`py-3.5 px-10 rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-3 shadow-2xl ${assemblingType === "all" ? "bg-orange-500 text-white animate-pulse" : "bg-indigo-600 text-white hover:bg-white hover:text-indigo-600 active:scale-95"}`}
                    >
                      {assemblingType === "all" ? (
                        <IconLoader className="animate-spin" size={18} />
                      ) : (
                        <IconCheck size={20} />
                      )}{" "}
                      GENERAR EXPEDIENTE COMPLETO
                    </button>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        disabled={assemblingType !== null}
                        onClick={handleGenerateDJ}
                        className={`py-2 px-3 rounded-xl text-[8px] font-black border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-1 uppercase`}
                      >
                        {assemblingType === "dj" ? (
                          <IconLoader className="animate-spin" size={10} />
                        ) : (
                          <IconFileText size={12} />
                        )}{" "}
                        SÓLO DJ
                      </button>
                      <button
                        type="button"
                        disabled={assemblingType !== null}
                        onClick={() => handleAssemble("full")}
                        className={`py-2 px-3 rounded-xl text-[8px] font-black border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-1 uppercase`}
                      >
                        {assemblingType === "full" ? (
                          <IconLoader className="animate-spin" size={10} />
                        ) : (
                          <IconFilePlus size={12} />
                        )}{" "}
                        SÓLO FULL
                      </button>
                      <button
                        type="button"
                        disabled={assemblingType !== null}
                        onClick={() => handleAssemble("mosaic")}
                        className={`py-2 px-3 rounded-xl text-[8px] font-black border border-slate-700 text-slate-300 hover:bg-slate-800 flex items-center justify-center gap-1 uppercase`}
                      >
                        {assemblingType === "mosaic" ? (
                          <IconLoader className="animate-spin" size={10} />
                        ) : (
                          <IconLayoutGrid size={12} />
                        )}{" "}
                        SÓLO MOS.
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "docs" && (
              <div className="space-y-6">
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

            <div className="pt-8 border-t flex justify-end items-center gap-4 sticky bottom-0 bg-white pb-4 z-10 shrink-0">
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
                  className="bg-indigo-600 text-white px-12 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3"
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
  );
}
