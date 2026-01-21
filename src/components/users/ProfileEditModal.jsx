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
  IconCalendar,
  IconTrash,
  IconUpload,
  IconFileText,
  IconEye,
  IconClipboard,
} from "../ui/Icons";
import SearchableSelect from "../ui/SearchableSelect";

const ModalPortal = ({ children }) => {
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {children}
    </div>,
    document.body,
  );
};

const AVATAR_COLORS = [
  "#64748b",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];
// Detectar si es móvil
const isMobile = () => /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Unir imágenes capturadas
const mergeDniImages = async (frontFile, backFile) => {
  const loadImg = (file) =>
    new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.src = URL.createObjectURL(file);
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
          new File([blob], `dni_scan_${Date.now()}.jpg`, {
            type: "image/jpeg",
          }),
        );
      },
      "image/jpeg",
      0.85,
    );
  });
};
const DniScanner = ({ onComplete, onCancel }) => {
  const videoRef = useRef(null);
  const [step, setStep] = useState(1); // 1: Frente, 2: Dorso
  const [captures, setCaptures] = useState({ front: null, back: null });

  useEffect(() => {
    let stream = null;
    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        });
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        alert("No se pudo acceder a la cámara");
        onCancel();
      }
    };
    startCamera();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, []);

  const capture = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    const data = canvas.toDataURL("image/jpeg", 0.9);

    if (step === 1) {
      setCaptures((p) => ({ ...p, front: data }));
      setStep(2);
    } else {
      onComplete(captures.front, data);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Guía de encuadre */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <div className="w-[85vw] aspect-[1.58/1] border-2 border-dashed border-white rounded-3xl relative shadow-[0_0_0_1000px_rgba(0,0,0,0.6)]">
          <div className="absolute -top-12 left-0 w-full text-center">
            <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest animate-pulse">
              {step === 1 ? "PASO 1: FRENTE DNI" : "PASO 2: DORSO DNI"}
            </span>
          </div>
        </div>
        <p className="text-white/60 text-[10px] mt-8 uppercase font-bold tracking-widest text-center px-10">
          Gira el teléfono de ser necesario para que el DNI entre en el cuadro.
        </p>
      </div>

      <div className="absolute bottom-10 flex items-center gap-12">
        <button
          onClick={onCancel}
          className="bg-white/10 p-4 rounded-full text-white backdrop-blur-md"
        >
          <IconX />
        </button>
        <button
          onClick={capture}
          className="w-20 h-20 bg-white rounded-full border-8 border-white/20 active:scale-90 transition-transform shadow-2xl flex items-center justify-center"
        >
          <div className="w-14 h-14 border-4 border-slate-900 rounded-full" />
        </button>
        <div className="w-12" />
      </div>
    </div>
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
  const fileInputRef = useRef(null);
  const dniInputRef = useRef(null);
  // Dentro de ProfileEditModal
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  // --- VARIABLES DE ESTILO ---
  const labelClass =
    "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1";

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
  });

  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    if (isOpen && user?.id) fetchInitialData();
  }, [isOpen, user]);
  useEffect(() => {
    const savedFront = localStorage.getItem("dni_front_buffer");
    if (savedFront) {
      setTempFront(savedFront);
      setDniStep(2); // Salta directamente al paso del dorso
    }
  }, []);
  // Dirty Check: Compara datos actuales contra los iniciales
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
      if (userData) {
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
        };
        setFormData(baseData);
        setInitialData(baseData);
        setPreviewUrl(userData.avatar_url);
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
    } finally {
      setLoading(false);
    }
  };
  // --- DENTRO DEL COMPONENTE ProfileEditModal ---
  const [dniStep, setDniStep] = useState(0); // 0: reposo, 1: frente, 2: dorso
  const [tempFront, setTempFront] = useState(null);
  const [inputKey, setInputKey] = useState(Date.now()); // Para forzar reset del input
  const handleNativeScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setInputKey(Date.now());
      return;
    }

    // PASO 1: Captura del Frente
    if (dniStep === 1) {
      // Convertimos el archivo a Base64 para guardarlo en el disco (localStorage)
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Front = event.target.result;
        localStorage.setItem("dni_front_buffer", base64Front); // Guardado seguro
        setTempFront(base64Front);
        setDniStep(2);
        setInputKey(Date.now());
        alert("✅ FRENTE GUARDADO.\n\nAhora captura el dorso (atrás).");
      };
      reader.readAsDataURL(file);
    }

    // PASO 2: Captura del Dorso y Unión
    else if (dniStep === 2) {
      setSaving(true);
      setUploadingField("link_dni_img");

      // Recuperamos el frente del disco por si se borró de la memoria RAM
      const storedFront = tempFront || localStorage.getItem("dni_front_buffer");

      if (!storedFront) {
        alert("Se perdió la imagen del frente. Por favor inicia de nuevo.");
        setDniStep(0);
        setSaving(false);
        return;
      }

      try {
        // Convertimos el base64 guardado de nuevo a un Blob/File para unirlo
        const response = await fetch(storedFront);
        const frontBlob = await response.blob();

        const merged = await mergeDniImages(frontBlob, file);
        await processAndUpload(merged, "link_dni_img");

        // Limpiamos todo al terminar con éxito
        localStorage.removeItem("dni_front_buffer");
        setDniStep(0);
        setTempFront(null);
      } catch (err) {
        alert("Error al procesar las imágenes.");
      } finally {
        setUploadingField(null);
        setSaving(false);
        setInputKey(Date.now());
      }
    }
  };
  // --- LÓGICA DE PROCESAMIENTO DE ARCHIVOS ---
  const processAndUpload = async (file, field) => {
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

      const fileExt = fileToUpload.name.split(".").pop();
      const fileName = `${field}_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = isAvatar ? fileName : `docs/${fileName}`;

      const { error: upError } = await supabase.storage
        .from(bucket)
        .upload(filePath, fileToUpload);
      if (upError) throw upError;

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
      setFormData((prev) => ({ ...prev, [field]: data.publicUrl }));
    } catch (error) {
      alert("Error al procesar el archivo");
      if (isAvatar) setPreviewUrl(formData.avatar_url);
    } finally {
      setUploadingField(null);
    }
  };

  const handlePaste = async (field) => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        for (const type of item.types) {
          if (type.startsWith("image/")) {
            const blob = await item.getType(type);
            const file = new File([blob], `pasted_${field}.png`, {
              type: "image/png",
            });
            processAndUpload(file, field);
            return;
          }
        }
      }
      alert("No hay imágenes en el portapapeles.");
    } catch (err) {
      alert("Permiso de portapapeles denegado.");
    }
  };

  const handleSafeClose = () => {
    if (isDirty) {
      if (
        !window.confirm(
          "Tienes cambios sin guardar. ¿Estás seguro de que deseas salir?",
        )
      )
        return;
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { error } = await supabase
        .from("integrantes")
        .update({ ...formData, last_modified_at: new Date().toISOString() })
        .eq("id", user.id);

      if (error) throw error;

      setIsDirty(false);
      if (onUpdate) onUpdate();
      onClose();
      alert(
        "¡Perfil actualizado! Tu documentación se procesará en segundo plano.",
      );
    } catch (error) {
      alert("Error al guardar: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  // --- SUB-COMPONENTE: CARGADOR ---
  const DocUploader = ({ label, field, value }) => {
    const [isOver, setIsOver] = useState(false);
    const isPdf = value?.toLowerCase().includes(".pdf");

    return (
      <div className="space-y-1">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-tighter">
          {label}
        </label>
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
          className={`relative h-28 rounded-2xl border-2 transition-all overflow-hidden flex flex-col group ${
            isOver
              ? "border-indigo-500 bg-indigo-50 scale-[1.02]"
              : value
                ? "border-emerald-100 bg-white"
                : "border-dashed border-slate-200 bg-slate-50 hover:border-indigo-300"
          }`}
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
                <img
                  src={value}
                  className="w-full h-full object-cover"
                  alt={label}
                />
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
            <div className="grid grid-cols-2 gap-1 w-full px-1">
              {field === "link_dni_img" ? (
                <div className="flex flex-col gap-1 w-full">
                  <button
                    type="button"
                    onClick={() => {
                      if (dniStep === 0) setDniStep(1);
                      dniInputRef.current?.click();
                    }}
                    className={`py-1 rounded-lg text-[7px] font-black uppercase flex items-center justify-center gap-1 transition-all ${
                      dniStep === 2
                        ? "bg-amber-500 text-white animate-pulse"
                        : "bg-orange-500 text-white"
                    }`}
                  >
                    <IconCamera size={10} />
                    {dniStep === 2 ? "Capturar Dorso" : "Escanear"}
                  </button>

                  {dniStep === 2 && (
                    <button
                      type="button"
                      onClick={() => {
                        localStorage.removeItem("dni_front_buffer");
                        setDniStep(0);
                        setTempFront(null);
                      }}
                      className="text-[6px] text-red-500 font-bold uppercase underline"
                    >
                      Reiniciar Escaneo
                    </button>
                  )}

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
                  className="bg-white border border-slate-200 text-slate-600 py-1 rounded-lg text-[7px] font-black uppercase hover:bg-slate-50 flex items-center justify-center gap-1"
                >
                  <IconClipboard size={10} /> Pegar
                </button>
              )}

              <label className="bg-indigo-600 text-white py-1 rounded-lg text-[7px] font-black uppercase text-center cursor-pointer hover:bg-indigo-700">
                Subir
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,application/pdf"
                  onChange={(e) => processAndUpload(e.target.files[0], field)}
                />
              </label>
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
              className={`w-2 h-6 rounded-full ${isDirty ? "bg-orange-500 animate-pulse" : "bg-indigo-500"}`}
            ></div>
            <h3 className="font-black text-slate-800 uppercase tracking-tighter text-lg">
              Mi Perfil
            </h3>
            {isDirty && (
              <span className="text-[10px] bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-black uppercase ml-2">
                Editando
              </span>
            )}
          </div>
          <button
            onClick={handleSafeClose}
            className="bg-white p-1.5 rounded-full text-slate-400 hover:text-red-500 shadow-sm transition-all"
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="py-20 flex justify-center text-indigo-600">
              <IconLoader className="animate-spin" size={40} />
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* --- HEADER: AVATAR --- */}
              <div className="flex items-center gap-6 bg-indigo-50/30 p-4 rounded-[1.5rem] border border-indigo-50">
                <div className="relative">
                  <div
                    className="w-20 h-20 rounded-full shadow-inner overflow-hidden flex items-center justify-center border-4 border-white"
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
                      <IconUser size={32} className="text-white/90" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 bg-indigo-600 text-white p-2 rounded-full shadow-lg border-2 border-white hover:scale-110 transition-transform"
                  >
                    {uploadingField === "avatar_url" ? (
                      <IconLoader size={12} className="animate-spin" />
                    ) : (
                      <IconCamera size={12} />
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
                <div className="flex-1">
                  <h2 className="font-black text-slate-800 text-lg leading-tight uppercase tracking-tighter">
                    {user.nombre} {user.apellido}
                  </h2>
                  <p className="text-[9px] text-indigo-600 bg-white border border-indigo-100 px-2.5 py-0.5 rounded-full inline-block mt-1 font-black uppercase tracking-widest">
                    {user.rol_sistema?.replace("_", " ")}
                  </p>
                  {!previewUrl && (
                    <div className="flex gap-1 mt-3">
                      {AVATAR_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() =>
                            setFormData({ ...formData, avatar_color: color })
                          }
                          className={`w-4 h-4 rounded-full transition-all ${formData.avatar_color === color ? "ring-2 ring-indigo-500 scale-110" : "hover:scale-110"}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* --- CONTACTO --- */}
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

              {/* --- RESIDENCIA --- */}
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

              {/* --- DOCUMENTACIÓN --- */}
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

              {/* FOOTER */}
              <div className="p-6 pt-0 border-t border-slate-50 bg-white z-30">
                <button
                  type="submit"
                  disabled={saving || !isDirty}
                  className={`w-full py-4 rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 ${
                    !isDirty
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100"
                  }`}
                >
                  {saving ? (
                    <>
                      <IconLoader className="animate-spin" /> GUARDANDO...
                    </>
                  ) : (
                    <>
                      <IconCheck /> GUARDAR CAMBIOS
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
      {isScannerOpen && (
        <DniScanner
          onCancel={() => setIsScannerOpen(false)}
          onComplete={async (front, back) => {
            setIsScannerOpen(false);
            setUploadingField("link_dni_img");
            try {
              const mergedFile = await mergeDniImages(front, back);
              await processAndUpload(mergedFile, "link_dni_img");
            } catch (err) {
              alert("Error al procesar escaneo");
            } finally {
              setUploadingField(null);
            }
          }}
        />
      )}
    </ModalPortal>
  );
}
