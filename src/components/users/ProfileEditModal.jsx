import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import imageCompression from "browser-image-compression";
import {
  IconX,
  IconUser,
  IconMail,
  IconPhone,
  IconMapPin,
  IconCamera,
  IconLoader,
  IconCheck,
  IconTrash,
  IconUpload,
  IconFileText,
  IconEye,
  IconClipboard,
  IconAlertTriangle,
  IconEdit, // Asegúrate de importar este ícono
  IconPalette // Agregamos ícono de paleta si lo tienes, si no usa IconEdit
} from "../ui/Icons";
import SearchableSelect from "../ui/SearchableSelect";

// --- CONSTANTES DE ESTILO ---
const labelClass =
  "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1";

// Paleta base (puedes dejarla como referencia rápida)
const AVATAR_COLORS = [
  "#64748b", // Slate
  "#ef4444", // Red
  "#f97316", // Orange
  "#eab308", // Yellow
  "#22c55e", // Green
  "#06b6d4", // Cyan
  "#3b82f6", // Blue
  "#6366f1", // Indigo (Default)
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f43f5e", // Rose
  "#14b8a6", // Teal
];

// --- UTILIDADES ---
const mergeDniImages = async (frontFile, backFile) => {
  const loadImg = (file) =>
    new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = typeof file === "string" ? file : URL.createObjectURL(file);
    });

  const front = await loadImg(frontFile);
  const back = await loadImg(backFile);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  const targetWidth = 1200;
  const targetHeight = targetWidth / 1.58;
  canvas.width = targetWidth;
  canvas.height = targetHeight * 2 + 40;

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(front, 0, 0, targetWidth, targetHeight);
  ctx.drawImage(back, 0, targetHeight + 40, targetWidth, targetHeight);

  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        resolve(
          new File([blob], `dni_full_${Date.now()}.jpg`, {
            type: "image/jpeg",
          }),
        );
      },
      "image/jpeg",
      0.85,
    );
  });
};

const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body,
  );
};

export default function ProfileEditModal({
  isOpen,
  onClose,
  user,
  supabase,
  onUpdate,
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingField, setUploadingField] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  // --- ESTADOS ESCÁNER NATIVO ---
  const [dniStep, setDniStep] = useState(0);
  const [tempFront, setTempFront] = useState(null);
  const [inputKey, setInputKey] = useState(Date.now());
  const dniInputRef = useRef(null);
  const fileInputRef = useRef(null);

  const [locationsOptions, setLocationsOptions] = useState([]);
  const [initialData, setInitialData] = useState(null);
  const [formData, setFormData] = useState({
    mail: "",
    telefono: "",
    domicilio: "",
    id_localidad: null,
    avatar_url: "",
    avatar_color: "#64748b",
    link_dni_img: "",
    link_cbu_img: "",
    link_cuil: "",
    last_verified_at: null,
  });

  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (isOpen && user?.id) {
      fetchInitialData();
      const savedFront = localStorage.getItem("dni_front_buffer");
      if (savedFront) {
        setTempFront(savedFront);
        setDniStep(2);
      }
    }
  }, [isOpen, user]);

  useEffect(() => {
    if (!initialData) return;
    const hasChanges = JSON.stringify(initialData) !== JSON.stringify(formData);
    setIsDirty(hasChanges);
  }, [formData, initialData]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const { data: locData } = await supabase
        .from("localidades")
        .select("id, localidad")
        .order("localidad");
      if (locData)
        setLocationsOptions(
          locData.map((l) => ({ id: l.id, label: l.localidad, value: l.id })),
        );

      const { data: userData, error } = await supabase
        .from("integrantes")
        .select("*")
        .eq("id", user.id)
        .single();
      if (error) throw error;

      const baseData = {
        mail: userData.mail || "",
        telefono: userData.telefono || "",
        domicilio: userData.domicilio || "",
        id_localidad: userData.id_localidad || null,
        avatar_url: userData.avatar_url || "",
        avatar_color: userData.avatar_color || "#64748b",
        link_dni_img: userData.link_dni_img || "",
        link_cbu_img: userData.link_cbu_img || "",
        link_cuil: userData.link_cuil || "",
        last_verified_at: userData.last_verified_at || null,
      };
      setFormData(baseData);
      setInitialData(baseData);
      setPreviewUrl(userData.avatar_url);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNativeScan = async (e) => {
    // ... (Tu código existente de escaneo) ...
    const file = e.target.files?.[0];
    if (!file) return;

    const isFront = !localStorage.getItem("dni_front_buffer");

    if (isFront) {
      setUploadingField("link_dni_img");
      try {
        const compressedFront = await imageCompression(file, {
          maxSizeMB: 0.4,
          maxWidthOrHeight: 1200,
        });
        const reader = new FileReader();
        reader.onload = (event) => {
          const base64 = event.target.result;
          localStorage.setItem("dni_front_buffer", base64);
          setTempFront(base64);
          setDniStep(2);
          setInputKey(Date.now());
          alert("✅ FRENTE CAPTURADO.\n\nAhora captura el DORSO.");
        };
        reader.readAsDataURL(compressedFront);
      } catch (err) {
        alert("Error procesando foto");
      } finally {
        setUploadingField(null);
      }
    } else {
      setSaving(true);
      setUploadingField("link_dni_img");
      try {
        const storedFront =
          tempFront || localStorage.getItem("dni_front_buffer");
        const res = await fetch(storedFront);
        const frontBlob = await res.blob();
        const merged = await mergeDniImages(frontBlob, file);
        await processAndUpload(merged, "link_dni_img");
        localStorage.removeItem("dni_front_buffer");
        setDniStep(0);
        setTempFront(null);
      } catch (err) {
        alert("Error al unir fotos");
      } finally {
        setUploadingField(null);
        setSaving(false);
        setInputKey(Date.now());
      }
    }
  };

  const processAndUpload = async (file, field) => {
    // ... (Tu código existente de subida) ...
    if (!file) return;
    const isAvatar = field === "avatar_url";
    const bucket = isAvatar ? "avatars" : "musician-docs";
    setUploadingField(field);
    if (isAvatar) setPreviewUrl(URL.createObjectURL(file));

    try {
      let fileToUpload = file;
      if (file.type.startsWith("image/")) {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: isAvatar ? 500 : 1200,
        });
      }
      const fileExt = fileToUpload.name?.split(".").pop() || "jpg";
      const fileName = `${field}_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = isAvatar ? fileName : `docs/${fileName}`;
      const { error: upError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload);
      if (upError) throw upError;
      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, [field]: data.publicUrl }));
    } catch (error) {
      alert("Error al subir");
    } finally {
      setUploadingField(null);
    }
  };

  const handlePaste = async (field) => {
    // ... (Tu código existente de paste) ...
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            processAndUpload(
              new File([blob], `pasted_${field}.png`, { type: "image/png" }),
              field,
            );
            return;
          }
        }
      }
    } catch (err) {
      alert("Permiso denegado");
    }
  };

  const handleSafeClose = () => {
    if (isDirty && !window.confirm("Cambios sin guardar. ¿Salir?")) return;
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const now = new Date().toISOString();
    try {
      // Al guardar, el ThemeController (que escucha la DB) actualizará el color automáticamente
      const { error } = await supabase
        .from("integrantes")
        .update({ ...formData, last_modified_at: now, last_verified_at: now })
        .eq("id", user.id);
      if (error) throw error;
      if (formData.avatar_color) {
        window.dispatchEvent(new CustomEvent('theme-changed', { detail: formData.avatar_color }));
      }
      setIsDirty(false);
      if (onUpdate) onUpdate();
      onClose();
      // No necesitamos location.reload(), el sistema es reactivo
      alert("✅ Verificado y Guardado");
    } catch (error) {
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const lastVerifiedYear = formData.last_verified_at
    ? new Date(formData.last_verified_at).getFullYear()
    : null;
  const needsVerification = lastVerifiedYear !== currentYear;

  // --- DOC UPLOADER (Tu código existente) ---
  const DocUploader = ({ label, field, value }) => {
    const [isOver, setIsOver] = useState(false);
    const isPdf = value?.toLowerCase().includes(".pdf");

    return (
      <div className="space-y-1">
        <label className={labelClass}>{label}</label>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsOver(true);
          }}
          onDragLeave={() => setIsOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsOver(false);
            if (e.dataTransfer.files[0])
              processAndUpload(e.dataTransfer.files[0], field);
          }}
          className={`relative h-28 rounded-2xl border-2 transition-all overflow-hidden flex flex-col group ${isOver ? "border-indigo-500 bg-indigo-50" : value ? "border-emerald-100 bg-white" : "border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300"}`}
        >
          {value ? (
            <>
              {isPdf ? (
                <div className="w-full h-full bg-slate-100 overflow-hidden relative">
                  <iframe
                    src={`${value}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="w-full h-full pointer-events-none scale-150 origin-top"
                    frameBorder="0"
                  />
                  <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[7px] px-1 rounded font-black z-10">
                    PDF
                  </div>
                </div>
              ) : (
                <img src={value} className="w-full h-full object-cover" />
              )}
              <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-2 z-20">
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 bg-white rounded-lg text-indigo-600 shadow-xl"
                >
                  <IconEye size={16} />
                </a>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, [field]: null })}
                  className="p-1.5 bg-white rounded-lg text-red-500 shadow-xl"
                >
                  <IconTrash size={16} />
                </button>
              </div>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-2">
              {uploadingField === field ? (
                <IconLoader
                  className="animate-spin text-indigo-500"
                  size={20}
                />
              ) : (
                <div className="grid grid-cols-2 gap-1 w-full px-1">
                  {field === "link_dni_img" ? (
                    <div className="contents">
                      <button
                        type="button"
                        onClick={() => {
                          if (!localStorage.getItem("dni_front_buffer"))
                            setDniStep(1);
                          dniInputRef.current?.click();
                        }}
                        className={`py-1 rounded-lg text-[7px] font-black uppercase flex items-center justify-center gap-1 transition-all ${dniStep === 2 ? "bg-amber-500 text-white animate-pulse" : "bg-orange-500 text-white"}`}
                      >
                        <IconCamera size={10} />{" "}
                        {dniStep === 2 ? "Falta Dorso" : "Escanear"}
                      </button>
                      <input
                        key={inputKey}
                        ref={dniInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={handleNativeScan}
                      />
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handlePaste(field)}
                      className="bg-white border border-slate-200 text-slate-600 py-1 rounded-lg text-[7px] font-black uppercase flex items-center justify-center gap-1"
                    >
                      <IconClipboard size={10} /> Pegar
                    </button>
                  )}
                  <label className="bg-indigo-600 text-white py-1 rounded-lg text-[7px] font-black uppercase text-center cursor-pointer hover:bg-indigo-700">
                    Subir{" "}
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*,application/pdf"
                      onChange={(e) =>
                        processAndUpload(e.target.files[0], field)
                      }
                    />
                  </label>
                  {field === "link_dni_img" && dniStep === 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("dni_front_buffer");
                        setDniStep(0);
                        setTempFront(null);
                        setInputKey(Date.now());
                      }}
                      className="col-span-2 text-[6px] text-red-500 font-bold uppercase underline mt-1 text-center"
                    >
                      Borrar Frente
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col animate-in zoom-in-95 max-h-[95vh] border border-slate-100">
        <div className="bg-slate-50/50 px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-6 rounded-full ${needsVerification ? "bg-orange-500 animate-pulse" : "bg-indigo-500"}`}
            ></div>
            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">
              Mi Perfil
            </h3>
          </div>
          <button
            onClick={handleSafeClose}
            className="bg-white p-1.5 rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-all"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {needsVerification && (
            <div className="mb-6 p-4 bg-orange-50 border border-orange-200 rounded-2xl flex items-start gap-3 animate-in slide-in-from-top-2">
              <IconAlertTriangle
                className="text-orange-500 shrink-0"
                size={20}
              />
              <div>
                <h4 className="text-xs font-black text-orange-800 uppercase tracking-tight">
                  Verificación Anual {currentYear}
                </h4>
                <p className="text-[10px] text-orange-700 leading-tight mt-1">
                  Confirma que tus datos sigan vigentes para este ciclo.
                </p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-20 flex justify-center text-indigo-600">
              <IconLoader className="animate-spin" size={40} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Avatar Section & Color Picker */}
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-indigo-50/30 p-4 rounded-[1.5rem] border border-indigo-50">
                <div className="relative shrink-0">
                  <div
                    className="w-24 h-24 rounded-full shadow-lg overflow-hidden flex items-center justify-center border-4 border-white transition-colors duration-300"
                    style={{
                      backgroundColor: previewUrl
                        ? "white"
                        : formData.avatar_color,
                    }}
                  >
                    {previewUrl ? (
                      <img
                        src={previewUrl}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <IconUser size={40} className="text-white/90" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white hover:scale-110 transition-transform"
                    title="Subir foto"
                  >
                    {uploadingField === "avatar_url" ? (
                      <IconLoader size={12} className="animate-spin" />
                    ) : (
                      <IconCamera size={14} />
                    )}
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) =>
                      processAndUpload(e.target.files[0], "avatar_url")
                    }
                  />
                </div>
                
                <div className="flex-1 w-full text-center sm:text-left">
                  <h2 className="font-black text-slate-800 text-lg uppercase tracking-tighter">
                    {user.nombre} {user.apellido}
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold mb-3 uppercase tracking-wide">
                    Personaliza tu color de tema
                  </p>
                  
                  {/* SELECTOR DE COLORES MEJORADO */}
                  <div className="flex flex-wrap gap-2 justify-center sm:justify-start items-center">
                    {/* Botón Arcoíris (Selector Infinito) */}
                    <label className="w-8 h-8 rounded-full cursor-pointer relative overflow-hidden ring-2 ring-slate-200 hover:scale-110 transition-transform bg-gradient-to-br from-red-500 via-green-500 to-blue-500 flex items-center justify-center shadow-sm" title="Elegir cualquier color">
                      <input
                        type="color"
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full p-0 border-0"
                        value={formData.avatar_color}
                        onChange={(e) =>
                          setFormData({ ...formData, avatar_color: e.target.value })
                        }
                      />
                      {/* Icono pequeño encima */}
                      <IconEdit size={12} className="text-white drop-shadow-md pointer-events-none" />
                    </label>

                    {/* Separador vertical */}
                    <div className="w-px h-6 bg-slate-300 mx-1"></div>

                    {/* Colores Predefinidos */}
                    {AVATAR_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          setFormData({ ...formData, avatar_color: c })
                        }
                        className={`w-6 h-6 rounded-full transition-all border border-white shadow-sm ${
                          formData.avatar_color === c
                            ? "ring-2 ring-offset-2 ring-indigo-500 scale-110"
                            : "hover:scale-110 hover:shadow-md"
                        }`}
                        style={{ backgroundColor: c }}
                        title={c}
                      />
                    ))}
                  </div>
                  
                  {/* Muestra el código HEX seleccionado */}
                  <div className="mt-2 text-[9px] font-mono text-slate-400 bg-white/50 inline-block px-2 py-0.5 rounded border border-slate-100">
                    {formData.avatar_color}
                  </div>
                </div>
              </div>

              {/* Resto de Inputs (Sin cambios mayores) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={labelClass}>
                    <IconMail size={12} /> Email de acceso
                  </label>
                  <input
                    type="email"
                    value={formData.mail}
                    onChange={(e) =>
                      setFormData({ ...formData, mail: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className={labelClass}>
                    <IconPhone size={12} /> Celular
                  </label>
                  <input
                    type="tel"
                    value={formData.telefono}
                    onChange={(e) =>
                      setFormData({ ...formData, telefono: e.target.value })
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-4 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
                <div className="flex items-center gap-2 text-slate-800">
                  <IconMapPin size={16} className="text-indigo-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest">
                    Domicilio Actual
                  </h4>
                </div>
                <div className="space-y-3">
                  <div className="relative z-50">
                    <SearchableSelect
                      options={locationsOptions}
                      value={formData.id_localidad}
                      onChange={(val) =>
                        setFormData({ ...formData, id_localidad: val })
                      }
                      placeholder="Localidad..."
                    />
                  </div>
                  <input
                    type="text"
                    value={formData.domicilio}
                    onChange={(e) =>
                      setFormData({ ...formData, domicilio: e.target.value })
                    }
                    placeholder="Calle, número, depto..."
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:ring-4 focus:ring-indigo-100 transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <IconFileText size={16} className="text-indigo-500" />
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800">
                    Expediente Digital
                  </h4>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <DocUploader
                    label="DNI"
                    field="link_dni_img"
                    value={formData.link_dni_img}
                  />
                  <DocUploader
                    label="CUIL"
                    field="link_cuil"
                    value={formData.link_cuil}
                  />
                  <DocUploader
                    label="CBU"
                    field="link_cbu_img"
                    value={formData.link_cbu_img}
                  />
                </div>
              </div>

              {/* Footer Button */}
              <div className="p-6 pt-0 border-t border-slate-50 bg-white z-30">
                <button
                  type="submit"
                  disabled={saving || (!isDirty && !needsVerification)}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
                    !isDirty && !needsVerification
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                  }`}
                  style={
                    // Aplicar el color elegido al botón de guardar para previsualizar el tema
                    isDirty && !saving ? { backgroundColor: formData.avatar_color, borderColor: formData.avatar_color } : {}
                  }
                >
                  {saving ? (
                    <>
                      <IconLoader className="animate-spin" /> GUARDANDO...
                    </>
                  ) : isDirty ? (
                    <>
                      <IconCheck /> GUARDAR CAMBIOS
                    </>
                  ) : (
                    <>
                      <IconCheck className="text-emerald-400" /> CONFIRMAR DATOS{" "}
                      {currentYear}
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}