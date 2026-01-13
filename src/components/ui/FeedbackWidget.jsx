import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import imageCompression from "browser-image-compression";
import FilerobotImageEditor, { TABS, TOOLS } from "react-filerobot-image-editor";
import { useLocation } from "react-router-dom"; // Para capturar la URL exacta
import { useAuth } from "../../context/AuthContext"; // Para capturar el usuario real

import { 
  IconMessageCircle, IconX, IconCamera, IconLoader, IconCheck, 
  IconAlertCircle, IconSend, IconTrash, IconEdit, IconClip, IconImage, IconBulb
} from "./Icons"; 

export default function FeedbackWidget({ supabase }) {
  const { user } = useAuth(); // Accedemos al usuario directo del contexto
  const location = useLocation(); // Hook para detectar cambios de ruta

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Estados de Imagen
  const [screenshot, setScreenshot] = useState(null); 
  const [screenshotPreview, setScreenshotPreview] = useState(null); 
  const [isEditing, setIsEditing] = useState(false); 

  const [formData, setFormData] = useState({
    tipo: "Sugerencia",
    titulo: "", // Nuevo campo
    mensaje: "",
  });
  const [status, setStatus] = useState("idle"); 

  const widgetRef = useRef(null);
  const fileInputRef = useRef(null); 

  // --- ESCUCHA DE PASTE ---
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!isOpen) return;
      const items = e.clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          setStatus("compressing");
          try {
            const compressed = await compressImage(blob);
            setScreenshot(compressed);
            setScreenshotPreview(URL.createObjectURL(compressed));
            setStatus("idle");
          } catch (err) {
            console.error(err);
            setStatus("idle");
          }
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [isOpen]);

  const compressImage = async (imageFile) => {
    const options = { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true };
    try { return await imageCompression(imageFile, options); } 
    catch (error) { return imageFile; }
  };

  // --- CAPTURAS Y SUBIDAS ---
  const handleTakeScreenshot = async () => {
    try {
      setStatus("capturing");
      if (widgetRef.current) widgetRef.current.style.opacity = "0";
      await new Promise(resolve => setTimeout(resolve, 100));
      const canvas = await html2canvas(document.body, { useCORS: true, scale: window.devicePixelRatio });
      if (widgetRef.current) widgetRef.current.style.opacity = "1";
      canvas.toBlob(async (blob) => {
        const compressed = await compressImage(blob);
        setScreenshot(compressed);
        setScreenshotPreview(URL.createObjectURL(compressed));
        setStatus("idle");
      }, 'image/png');
    } catch (error) {
      console.error(error);
      setStatus("idle");
      if (widgetRef.current) widgetRef.current.style.opacity = "1";
    }
  };

  const handleFileUpload = async (e) => {
    if (e.target.files && e.target.files[0]) {
      setStatus("compressing");
      const file = e.target.files[0];
      const compressed = await compressImage(file);
      setScreenshot(compressed);
      setScreenshotPreview(URL.createObjectURL(compressed));
      setStatus("idle");
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const dataURLtoBlob = (dataurl) => {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--) u8arr[n] = bstr.charCodeAt(n);
    return new Blob([u8arr], {type:mime});
  }

  // --- ENVIAR ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.mensaje) return alert("Por favor escribe un mensaje.");

    setIsLoading(true);
    setStatus("sending");

    try {
      let uploadedPath = null;

      if (screenshot) {
        const fileName = `feedback/snap_${Date.now()}.png`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("archivos_generales") 
          .upload(fileName, screenshot);
        if (uploadError) throw uploadError;
        uploadedPath = uploadData.path;
      }

      // 1. Resolver Usuario
      let userInfo = "Anónimo";
      if (user) {
        // Ajusta estos campos según tu tabla 'integrantes' o auth
        const nombre = user.nombre || user.user_metadata?.nombre || "";
        const apellido = user.apellido || user.user_metadata?.apellido || "";
        const email = user.email || "";
        userInfo = `${nombre} ${apellido} (${email})`.trim();
      }

      // 2. Resolver URL Completa (incluyendo query params ?tab=...)
      const currentUrl = window.location.href; 

      // 3. Resolver Título por defecto
      const finalTitle = formData.titulo.trim() 
        ? formData.titulo 
        : `${formData.tipo} - ${new Date().toLocaleDateString()}`;

      const { error: dbError } = await supabase
        .from("app_feedback")
        .insert([{
            tipo: formData.tipo,
            titulo: finalTitle,
            mensaje: formData.mensaje,
            ruta_pantalla: currentUrl, // Guardamos la URL completa
            screenshot_path: uploadedPath,
            user_email: userInfo, // Guardamos nombre + email
            estado: 'Pendiente'
          }]);

      if (dbError) throw dbError;

      setStatus("success");
      setTimeout(() => {
        setIsOpen(false);
        setStatus("idle");
        setFormData({ tipo: "Sugerencia", titulo: "", mensaje: "" });
        handleRemoveScreenshot();
      }, 2000);

    } catch (error) {
      console.error(error);
      setStatus("error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[9999] font-sans" ref={widgetRef}>
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-3 rounded-full shadow-lg transition-all transform hover:scale-110 flex items-center gap-2 group"
            title="Enviar sugerencia o reporte"
          >
            <IconBulb size={24} />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap text-sm font-bold">
              Feedback
            </span>
          </button>
        )}

        {isOpen && (
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-80 sm:w-96 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200 flex flex-col">
            
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><IconBulb size={20} /> Feedback & Ayuda</h3>
              <button onClick={() => setIsOpen(false)} className="hover:bg-indigo-500 p-1 rounded"><IconX size={20} /></button>
            </div>

            <div className="p-4 bg-slate-50">
              {status === "success" ? (
                <div className="flex flex-col items-center py-8 text-center animate-in zoom-in">
                    <IconCheck size={32} className="text-green-600 mb-2"/>
                    <p className="font-bold text-slate-700">¡Recibido!</p>
                    <p className="text-xs text-slate-500">Lo revisaremos pronto.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* TIPO */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Tipo</label>
                    <div className="flex bg-white rounded border border-slate-200 p-1">
                      {["Sugerencia", "Error", "Ayuda"].map((t) => (
                        <button key={t} type="button" onClick={() => setFormData({ ...formData, tipo: t })} className={`flex-1 text-xs py-1.5 rounded transition-colors ${formData.tipo === t ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-500 hover:bg-slate-50"}`}>{t}</button>
                      ))}
                    </div>
                  </div>

                  {/* TÍTULO (NUEVO) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Título (Opcional)</label>
                    <input 
                        type="text" 
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                        placeholder={formData.tipo === 'Error' ? "Ej: Error al cargar viáticos" : "Ej: Agregar filtro por fecha"}
                        value={formData.titulo}
                        onChange={(e) => setFormData({...formData, titulo: e.target.value})}
                    />
                  </div>
                  
                  {/* MENSAJE */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Detalle</label>
                    <textarea 
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white placeholder:text-slate-400" 
                        rows="3" 
                        placeholder="Describe el detalle..."
                        value={formData.mensaje} 
                        onChange={(e) => setFormData({ ...formData, mensaje: e.target.value })}
                    />
                    <p className="text-[9px] text-slate-400 text-right mt-1">* Puedes pegar imágenes (Ctrl+V)</p>
                  </div>

                  {/* ZONA DE IMAGEN */}
                  <div>
                    {!screenshot ? (
                      <div className="flex gap-2">
                        <button type="button" onClick={handleTakeScreenshot} disabled={status !== "idle"} className="flex-1 border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors">
                          {status === "capturing" ? <IconLoader className="animate-spin" /> : <IconCamera size={16} />} Capturar Pantalla
                        </button>
                        <button type="button" onClick={() => fileInputRef.current.click()} disabled={status !== "idle"} className="px-4 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center" title="Adjuntar imagen">
                            {status === "compressing" ? <IconLoader className="animate-spin text-slate-400"/> : <IconClip size={18}/>}
                        </button>
                        <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileUpload} />
                      </div>
                    ) : (
                      <div className="relative border border-slate-200 rounded-lg overflow-hidden group bg-slate-100">
                        {status === "compressing" && (<div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center text-xs text-slate-500 font-bold"><IconLoader className="animate-spin mr-1"/> Comprimiendo...</div>)}
                        <img src={screenshotPreview} alt="Screenshot" className="w-full h-32 object-contain" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                           <button type="button" onClick={() => setIsEditing(true)} className="text-white bg-indigo-600 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-indigo-700 shadow-sm"><IconEdit size={14} /> Editar</button>
                           <button type="button" onClick={handleRemoveScreenshot} className="text-white bg-red-600 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-red-700 shadow-sm"><IconTrash size={14} /></button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button type="submit" disabled={isLoading || !formData.mensaje} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all">
                    {isLoading ? <IconLoader className="animate-spin" size={18} /> : <IconSend size={18} />} Enviar
                  </button>
                  {status === 'error' && (<div className="text-xs text-red-500 flex items-center justify-center gap-1 mt-2"><IconAlertCircle size={12}/> Error al enviar.</div>)}
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {isEditing && screenshotPreview && (
        <div className="fixed inset-0 z-[10000] bg-black animate-in fade-in duration-200">
            <FilerobotImageEditor
                source={screenshotPreview}
                onSave={(editedImageObject, designState) => {
                    const blob = dataURLtoBlob(editedImageObject.imageBase64);
                    compressImage(blob).then(compressedBlob => {
                        setScreenshot(compressedBlob);
                        setScreenshotPreview(URL.createObjectURL(compressedBlob));
                        setIsEditing(false);
                    });
                }}
                onClose={() => setIsEditing(false)}
                annotationsCommon={{ fill: '#ff0000' }}
                Text={{ text: '...' }}
                tabsIds={[TABS.ANNOTATE, TABS.ADJUST, TABS.RESIZE]}
                defaultTabId={TABS.ANNOTATE}
                defaultToolId={TOOLS.ARROW}
            />
        </div>
      )}
    </>
  );
}