import React, { useState, useRef, useEffect } from "react";
import html2canvas from "html2canvas";
import imageCompression from "browser-image-compression";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

import {
  IconX,
  IconCamera,
  IconLoader,
  IconCheck,
  IconAlertCircle,
  IconSend,
  IconTrash,
  IconEdit,
  IconClip,
  IconBulb,
  IconArrowLeft,
  IconPlus,
} from "./Icons";

// --- COMPONENTE INTERNO: EDITOR AVANZADO LIGERO ---
const SmartCanvasEditor = ({ imageSrc, onSave, onClose }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [ctx, setCtx] = useState(null);

  // ESTADOS
  const [tool, setTool] = useState("pen"); // 'pen' | 'text'
  const [color, setColor] = useState("#ef4444");
  const [brushSize, setBrushSize] = useState(5);

  // HISTORIAL (UNDO)
  const historyRef = useRef([]); // Guarda ImageData

  // TEXTOS FLOTANTES
  const [textNodes, setTextNodes] = useState([]); // { id, x, y, text, color, fontSize }
  const [selectedTextId, setSelectedTextId] = useState(null);

  // --- INICIALIZACIÓN ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");

    // Mejorar nitidez en pantallas retina/móviles
    const dpr = window.devicePixelRatio || 1;

    const img = new Image();
    img.src = imageSrc;
    img.onload = () => {
      // Ajustar tamaño real del canvas
      canvas.width = img.width;
      canvas.height = img.height;

      // Dibujar imagen base
      context.drawImage(img, 0, 0);
      context.lineCap = "round";
      context.lineJoin = "round";

      setCtx(context);
      saveToHistory(context); // Guardar estado inicial
    };
  }, [imageSrc]);

  // Actualizar contexto
  useEffect(() => {
    if (!ctx) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
  }, [color, brushSize, ctx]);

  // --- LÓGICA DE HISTORIAL (UNDO) ---
  const saveToHistory = (context = ctx) => {
    if (!context || !canvasRef.current) return;
    const imageData = context.getImageData(
      0,
      0,
      canvasRef.current.width,
      canvasRef.current.height,
    );
    historyRef.current.push(imageData);
    // Limitamos historial a 20 pasos para no saturar memoria
    if (historyRef.current.length > 20) historyRef.current.shift();
  };

  const handleUndo = () => {
    if (historyRef.current.length <= 1 || !ctx) return; // Mínimo dejamos la imagen base

    // 1. Eliminar el estado actual
    historyRef.current.pop();
    // 2. Recuperar el anterior
    const previousState = historyRef.current[historyRef.current.length - 1];
    if (previousState) {
      ctx.putImageData(previousState, 0, 0);
    }
  };

  // --- LÓGICA DE DIBUJO (LÁPIZ) ---
  const isDrawing = useRef(false);

  const getCoords = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Factor de escala entre tamaño visual (CSS) y tamaño real (Pixel)
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    if (tool !== "pen" || !ctx) return;
    isDrawing.current = true;
    ctx.beginPath();
    const { x, y } = getCoords(e);
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing.current || tool !== "pen" || !ctx) return;
    e.preventDefault(); // Evitar scroll en touch
    const { x, y } = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (tool !== "pen" || !isDrawing.current) return;
    ctx.closePath();
    isDrawing.current = false;
    saveToHistory(); // Guardar paso
  };

  // --- LÓGICA DE TEXTO (FLOTANTE) ---
  const addTextNode = () => {
    const newId = Date.now();
    // Posición inicial centrada aproximada
    const startX = canvasRef.current ? canvasRef.current.clientWidth / 2 : 100;
    const startY = canvasRef.current ? canvasRef.current.clientHeight / 2 : 100;

    setTextNodes((prev) => [
      ...prev,
      {
        id: newId,
        x: startX, // Coordenadas visuales (CSS pixels)
        y: startY,
        text: "Texto",
        color: color,
        fontSize: 24,
      },
    ]);
    setSelectedTextId(newId);
    setTool("cursor"); // Cambiar a modo cursor para mover
  };

  const updateTextNode = (id, key, value) => {
    setTextNodes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, [key]: value } : n)),
    );
  };

  const deleteTextNode = (id) => {
    setTextNodes((prev) => prev.filter((n) => n.id !== id));
    if (selectedTextId === id) setSelectedTextId(null);
  };

  // Movimiento de texto
  const draggingText = useRef(null);
  const dragOffset = useRef({ x: 0, y: 0 });

  const handleTextMouseDown = (e, id) => {
    e.stopPropagation(); // Evitar que el canvas detecte el click
    draggingText.current = id;
    setSelectedTextId(id);

    // Calcular offset del mouse respecto al div del texto
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const target = e.target.getBoundingClientRect();
    const container = containerRef.current.getBoundingClientRect();

    // Guardamos la posición relativa dentro del contenedor
    dragOffset.current = {
      x: clientX - target.left,
      y: clientY - target.top,
    };
  };

  const handleGlobalMouseMove = (e) => {
    if (draggingText.current !== null) {
      e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const container = containerRef.current.getBoundingClientRect();

      const newX = clientX - container.left - dragOffset.current.x;
      const newY = clientY - container.top - dragOffset.current.y;

      updateTextNode(draggingText.current, "x", newX);
      updateTextNode(draggingText.current, "y", newY);
    }
  };

  const handleGlobalMouseUp = () => {
    draggingText.current = null;
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    window.addEventListener("touchmove", handleGlobalMouseMove, {
      passive: false,
    });
    window.addEventListener("touchend", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
      window.removeEventListener("touchmove", handleGlobalMouseMove);
      window.removeEventListener("touchend", handleGlobalMouseUp);
    };
  }, []);

  // --- GUARDADO FINAL ---
  const handleFinalSave = async () => {
    if (!ctx || !canvasRef.current) return;

    // 1. "Estampar" los textos flotantes en el canvas real
    const rect = containerRef.current.getBoundingClientRect();
    // Factor de escala real (canvas pixels) vs visual (CSS pixels)
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;

    textNodes.forEach((node) => {
      ctx.font = `bold ${node.fontSize * scaleX}px sans-serif`; // Escalar fuente
      ctx.fillStyle = node.color;
      ctx.textBaseline = "top";

      // Sombra para legibilidad
      ctx.shadowColor = "rgba(0,0,0,0.5)";
      ctx.shadowBlur = 4;

      // Coordenadas reales
      // NOTA: El texto en HTML se posiciona 'top-left'. En canvas fillText también usa x,y base.
      // Ajustamos un poco el padding si el input tiene padding.
      ctx.fillText(node.text, node.x * scaleX, node.y * scaleY);

      // Reset sombra
      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
    });

    // 2. Exportar
    canvasRef.current.toBlob((blob) => {
      onSave(blob);
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-[10000] bg-slate-900/95 flex flex-col h-screen w-screen animate-in fade-in">
      {/* HEADER DE HERRAMIENTAS (FLOTANTE ARRIBA) */}
      <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900 border-b border-slate-700 shrink-0 z-50">
        {/* GRUPO 1: HERRAMIENTAS PRINCIPALES */}
        <div className="flex gap-2 bg-slate-800 p-1 rounded-lg">
          <button
            onClick={() => {
              setTool("pen");
              setSelectedTextId(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${tool === "pen" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
          >
            <IconEdit size={18} />{" "}
            <span className="hidden sm:inline">Dibujar</span>
          </button>

          <button
            onClick={addTextNode}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${tool === "text" || selectedTextId ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-white"}`}
          >
            <span className="font-serif italic text-xl leading-none">T</span>{" "}
            <span className="hidden sm:inline">Texto +</span>
          </button>

          <button
            onClick={handleUndo}
            className="px-3 py-2 text-slate-400 hover:text-white transition-colors border-l border-slate-700 ml-1"
            title="Deshacer trazo (Ctrl+Z)"
          >
            <IconArrowLeft
              size={18}
              className="rotate-180 transform -scale-x-100"
            />{" "}
            Deshacer
          </button>
        </div>

        {/* GRUPO 2: PROPIEDADES (Si hay texto seleccionado o lápiz activo) */}
        <div className="flex items-center gap-3 bg-slate-800 p-2 rounded-lg overflow-x-auto max-w-full">
          {/* Color Picker */}
          <div className="flex gap-1.5 shrink-0">
            {[
              "#ef4444",
              "#facc15",
              "#22c55e",
              "#3b82f6",
              "#ffffff",
              "#000000",
            ].map((c) => (
              <button
                key={c}
                onClick={() => {
                  setColor(c);
                  if (selectedTextId)
                    updateTextNode(selectedTextId, "color", c);
                }}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c ? "border-white scale-110 ring-2 ring-indigo-500" : "border-transparent hover:scale-110"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          {/* Tamaño (Slider o Botones) */}
          <div className="h-6 w-px bg-slate-600 mx-1 shrink-0"></div>

          {selectedTextId ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  updateTextNode(
                    selectedTextId,
                    "fontSize",
                    Math.max(
                      12,
                      textNodes.find((n) => n.id === selectedTextId)?.fontSize -
                        4,
                    ),
                  )
                }
                className="text-white text-xs bg-slate-700 px-2 py-1 rounded hover:bg-slate-600"
              >
                A-
              </button>
              <button
                onClick={() =>
                  updateTextNode(
                    selectedTextId,
                    "fontSize",
                    Math.min(
                      72,
                      textNodes.find((n) => n.id === selectedTextId)?.fontSize +
                        4,
                    ),
                  )
                }
                className="text-white text-xs bg-slate-700 px-2 py-1 rounded hover:bg-slate-600"
              >
                A+
              </button>
              <button
                onClick={() => deleteTextNode(selectedTextId)}
                className="text-red-400 hover:text-red-300 ml-1"
              >
                <IconTrash size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 uppercase font-bold">
                Grosor
              </span>
              <input
                type="range"
                min="2"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(parseInt(e.target.value))}
                className="w-20 accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          )}
        </div>

        {/* GRUPO 3: ACCIONES FINALES */}
        <div className="flex gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm font-bold text-slate-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleFinalSave}
            className="px-5 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-bold text-white transition-colors flex items-center gap-2 shadow-lg hover:shadow-green-500/20"
          >
            <IconCheck size={18} /> Guardar
          </button>
        </div>
      </div>

      {/* ÁREA DE LIENZO */}
      <div className="flex-1 overflow-hidden relative flex items-center justify-center bg-slate-950 p-4 select-none touch-none">
        {/* Contenedor relativo para posicionar textos sobre canvas */}
        <div
          ref={containerRef}
          className="relative shadow-2xl border border-slate-800 inline-block max-w-full max-h-full"
        >
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className={`block max-w-full max-h-[80vh] w-auto h-auto object-contain ${tool === "pen" ? "cursor-crosshair" : "cursor-default"}`}
            style={{ touchAction: "none" }}
          />

          {/* CAPA DE TEXTOS FLOTANTES */}
          {textNodes.map((node) => (
            <div
              key={node.id}
              onMouseDown={(e) => handleTextMouseDown(e, node.id)}
              onTouchStart={(e) => handleTextMouseDown(e, node.id)}
              style={{
                position: "absolute",
                left: node.x,
                top: node.y,
                color: node.color,
                fontSize: `${node.fontSize}px`,
                fontFamily: "sans-serif",
                fontWeight: "bold",
                textShadow: "0 0 4px rgba(0,0,0,0.8)",
                cursor: "move",
                zIndex: 10,
                userSelect: "none",
                border:
                  selectedTextId === node.id
                    ? "1px dashed rgba(255,255,255,0.8)"
                    : "none",
                padding: "4px",
                borderRadius: "4px",
                backgroundColor:
                  selectedTextId === node.id
                    ? "rgba(0,0,0,0.2)"
                    : "transparent",
              }}
            >
              {selectedTextId === node.id ? (
                <input
                  autoFocus
                  value={node.text}
                  onChange={(e) =>
                    updateTextNode(node.id, "text", e.target.value)
                  }
                  className="bg-transparent outline-none border-none text-center min-w-[20px]"
                  style={{
                    color: node.color,
                    width: `${node.text.length + 1}ch`,
                  }}
                  onBlur={() => setSelectedTextId(null)}
                />
              ) : (
                <span
                  onClick={() => {
                    setSelectedTextId(node.id);
                    setTool("cursor");
                  }}
                >
                  {node.text}
                </span>
              )}

              {selectedTextId === node.id && (
                <div
                  className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1 cursor-pointer hover:bg-red-600 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteTextNode(node.id);
                  }}
                >
                  <IconX size={10} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL (FeedbackWidget) - SIN CAMBIOS DRÁSTICOS, SOLO INTEGRA EL NUEVO EDITOR ---
export default function FeedbackWidget({ supabase }) {
  const { user } = useAuth();
  const location = useLocation();

  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Estados de Imagen
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const [formData, setFormData] = useState({
    tipo: "Sugerencia",
    titulo: "",
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
    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: false,
    };
    try {
      return await imageCompression(imageFile, options);
    } catch (error) {
      console.error("Error comprimiendo:", error);
      return imageFile;
    }
  };

  // --- CAPTURAS Y SUBIDAS ---
  const handleTakeScreenshot = async () => {
    try {
      setStatus("capturing");
      if (widgetRef.current) widgetRef.current.style.opacity = "0";
      await new Promise((resolve) => setTimeout(resolve, 100));
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        scale: window.devicePixelRatio,
        ignoreElements: (el) => el.id === "feedback-widget-container",
      });
      if (widgetRef.current) widgetRef.current.style.opacity = "1";
      canvas.toBlob(async (blob) => {
        const compressed = await compressImage(blob);
        setScreenshot(compressed);
        setScreenshotPreview(URL.createObjectURL(compressed));
        setStatus("idle");
      }, "image/png");
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

  // --- GUARDADO DESDE EDITOR ---
  const handleEditorSave = async (blob) => {
    try {
      const compressed = await compressImage(blob);
      setScreenshot(compressed);
      setScreenshotPreview(URL.createObjectURL(compressed));
      setIsEditing(false);
    } catch (error) {
      console.error("Error guardando edición:", error);
      setIsEditing(false);
    }
  };

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

      let userInfo = "Anónimo";
      if (user) {
        const nombre = user.nombre || user.user_metadata?.nombre || "";
        const apellido = user.apellido || user.user_metadata?.apellido || "";
        const email = user.email || "";
        userInfo = `${nombre} ${apellido} (${email})`.trim();
      }

      const currentUrl = window.location.href;

      const finalTitle = formData.titulo.trim()
        ? formData.titulo
        : `${formData.tipo} - ${new Date().toLocaleDateString()}`;

      const { error: dbError } = await supabase.from("app_feedback").insert([
        {
          tipo: formData.tipo,
          titulo: finalTitle,
          mensaje: formData.mensaje,
          ruta_pantalla: currentUrl,
          screenshot_path: uploadedPath,
          user_email: userInfo,
          estado: "Pendiente",
        },
      ]);

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
      <div
        id="feedback-widget-container"
        className="fixed bottom-6 right-6 z-[9990] font-sans"
        ref={widgetRef}
      >
        {!isOpen && (
          <button
            onClick={() => setIsOpen(true)}
            // CAMBIOS:
            // 1. p-2 en móvil (antes p-3) -> p-3 solo en md (desktop)
            // 2. gap-0 en móvil -> gap-2 solo en md
            className="bg-indigo-600 hover:bg-indigo-700 text-white p-2 md:p-3 rounded-full shadow-lg transition-all transform hover:scale-110 flex items-center justify-center md:gap-2 group"
            title="Enviar sugerencia o reporte"
          >
            {/* VISTA MÓVIL: Icono muy pequeño (16px) */}
            <div className="md:hidden">
              <IconBulb size={16} />
            </div>

            {/* VISTA DESKTOP: Icono normal (24px) */}
            <div className="hidden md:block">
              <IconBulb size={24} />
            </div>

            {/* TEXTO: Oculto totalmente en móvil (hidden) para que sea solo un punto */}
            <span className="hidden md:block max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 ease-in-out whitespace-nowrap text-sm font-bold">
              Feedback
            </span>
          </button>
        )}
        {isOpen && (
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-80 sm:w-96 overflow-hidden animate-in slide-in-from-bottom-10 fade-in duration-200 flex flex-col">
            <div className="bg-indigo-600 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2">
                <IconBulb size={20} /> Feedback & Ayuda
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-indigo-500 p-1 rounded"
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="p-4 bg-slate-50">
              {status === "success" ? (
                <div className="flex flex-col items-center py-8 text-center animate-in zoom-in">
                  <IconCheck size={32} className="text-green-600 mb-2" />
                  <p className="font-bold text-slate-700">¡Recibido!</p>
                  <p className="text-xs text-slate-500">
                    Lo revisaremos pronto.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* TIPO */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Tipo
                    </label>
                    <div className="flex bg-white rounded border border-slate-200 p-1">
                      {["Sugerencia", "Error", "Ayuda"].map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFormData({ ...formData, tipo: t })}
                          className={`flex-1 text-xs py-1.5 rounded transition-colors ${formData.tipo === t ? "bg-indigo-100 text-indigo-700 font-bold" : "text-slate-500 hover:bg-slate-50"}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* TÍTULO */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Título (Opcional)
                    </label>
                    <input
                      type="text"
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                      placeholder={
                        formData.tipo === "Error"
                          ? "Ej: Error al cargar viáticos"
                          : "Ej: Agregar filtro por fecha"
                      }
                      value={formData.titulo}
                      onChange={(e) =>
                        setFormData({ ...formData, titulo: e.target.value })
                      }
                    />
                  </div>

                  {/* MENSAJE */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">
                      Detalle
                    </label>
                    <textarea
                      className="w-full border border-slate-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white placeholder:text-slate-400"
                      rows="3"
                      placeholder="Describe el detalle..."
                      value={formData.mensaje}
                      onChange={(e) =>
                        setFormData({ ...formData, mensaje: e.target.value })
                      }
                    />
                    <p className="text-[9px] text-slate-400 text-right mt-1">
                      * Puedes pegar imágenes (Ctrl+V)
                    </p>
                  </div>

                  {/* ZONA DE IMAGEN */}
                  <div>
                    {!screenshot ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleTakeScreenshot}
                          disabled={status !== "idle"}
                          className="flex-1 border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-indigo-600 text-xs font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
                        >
                          {status === "capturing" ? (
                            <IconLoader className="animate-spin" />
                          ) : (
                            <IconCamera size={16} />
                          )}{" "}
                          Capturar Pantalla
                        </button>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current.click()}
                          disabled={status !== "idle"}
                          className="px-4 border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center"
                          title="Adjuntar imagen"
                        >
                          {status === "compressing" ? (
                            <IconLoader className="animate-spin text-slate-400" />
                          ) : (
                            <IconClip size={18} />
                          )}
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </div>
                    ) : (
                      <div className="relative border border-slate-200 rounded-lg overflow-hidden group bg-slate-100">
                        {status === "compressing" && (
                          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center text-xs text-slate-500 font-bold">
                            <IconLoader className="animate-spin mr-1" />{" "}
                            Comprimiendo...
                          </div>
                        )}
                        <img
                          src={screenshotPreview}
                          alt="Screenshot"
                          className="w-full h-32 object-contain"
                        />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="text-white bg-indigo-600 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-indigo-700 shadow-sm"
                          >
                            <IconEdit size={14} /> Editar
                          </button>
                          <button
                            type="button"
                            onClick={handleRemoveScreenshot}
                            className="text-white bg-red-600 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 hover:bg-red-700 shadow-sm"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !formData.mensaje}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-lg shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                  >
                    {isLoading ? (
                      <IconLoader className="animate-spin" size={18} />
                    ) : (
                      <IconSend size={18} />
                    )}{" "}
                    Enviar
                  </button>
                  {status === "error" && (
                    <div className="text-xs text-red-500 flex items-center justify-center gap-1 mt-2">
                      <IconAlertCircle size={12} /> Error al enviar.
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        )}
      </div>

      {/* EDITOR FLOTANTE CUSTOM */}
      {isEditing && screenshotPreview && (
        <SmartCanvasEditor
          imageSrc={screenshotPreview}
          onSave={handleEditorSave}
          onClose={() => setIsEditing(false)}
        />
      )}
    </>
  );
}
