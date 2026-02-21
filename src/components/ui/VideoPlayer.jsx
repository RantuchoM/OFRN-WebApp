import React, { useState } from "react";
import { IconDrive, IconExternalLink } from "./Icons";
import Loader from "./Loader";

/**
 * Componente VideoPlayer: Renderiza videos embebidos de Google Drive, YouTube y Vimeo
 * @param {string} url - URL del video (Google Drive, YouTube o Vimeo)
 */
export default function VideoPlayer({ url }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (!url || !url.trim()) return null;

  // Función para parsear URLs y devolver embed + URL para abrir en pestaña + si es Drive
  const parseVideoUrl = (rawUrl) => {
    if (!rawUrl) return { embedUrl: null, viewUrl: null, isGoogleDrive: false };

    const trimmed = rawUrl.trim();

    // --- GOOGLE DRIVE ---
    // Patrones: .../file/d/ID/view, .../file/d/ID/edit, .../open?id=ID
    const drivePatterns = [
      /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/,
      /drive\.google\.com\/file\/u\/\d+\/d\/([a-zA-Z0-9_-]+)/,
    ];

    for (const pattern of drivePatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const id = match[1];
        return {
          embedUrl: `https://drive.google.com/file/d/${id}/preview`,
          viewUrl: `https://drive.google.com/file/d/${id}/view`,
          isGoogleDrive: true,
        };
      }
    }

    // --- YOUTUBE ---
    // Patrones: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
    const youtubePatterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/.*[?&]v=([a-zA-Z0-9_-]{11})/,
    ];

    for (const pattern of youtubePatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const embed = `https://www.youtube.com/embed/${match[1]}`;
        return { embedUrl: embed, viewUrl: trimmed.startsWith("http") ? trimmed : embed, isGoogleDrive: false };
      }
    }

    // --- VIMEO ---
    // Patrones: vimeo.com/ID, vimeo.com/channels/.../ID, player.vimeo.com/video/ID
    const vimeoPatterns = [
      /vimeo\.com\/(\d+)/,
      /player\.vimeo\.com\/video\/(\d+)/,
    ];

    for (const pattern of vimeoPatterns) {
      const match = trimmed.match(pattern);
      if (match && match[1]) {
        const embed = `https://player.vimeo.com/video/${match[1]}`;
        return { embedUrl: embed, viewUrl: trimmed.startsWith("http") ? trimmed : embed, isGoogleDrive: false };
      }
    }

    // Si no coincide con ningún patrón, retornar la URL original
    return { embedUrl: trimmed, viewUrl: trimmed, isGoogleDrive: false };
  };

  const { embedUrl, viewUrl, isGoogleDrive } = parseVideoUrl(url);

  if (!embedUrl) {
    return (
      <div className="w-full aspect-video rounded-xl shadow-lg bg-slate-100 border border-slate-200 flex items-center justify-center p-4">
        <p className="text-sm text-slate-500 text-center">
          URL de video no válida. Formatos soportados: Google Drive, YouTube, Vimeo.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full aspect-video rounded-xl shadow-lg bg-black/5 border border-slate-200 overflow-hidden relative group">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
          <div className="flex flex-col items-center gap-3">
            <Loader size={32} className="text-indigo-600" />
            <span className="text-xs text-slate-500">Cargando video...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100 z-10">
          <div className="flex flex-col items-center gap-3 p-4 text-center">
            <p className="text-sm text-slate-600">
              No se pudo cargar el video.
            </p>
            <a
              href={viewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <IconExternalLink size={16} />
              Abrir en nueva pestaña
            </a>
          </div>
        </div>
      )}

      <iframe
        src={embedUrl}
        title="Video embebido"
        className="w-full h-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
      />

      {/* Ícono para abrir en nueva pestaña (Drive o enlace) */}
      <a
        href={viewUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 z-10 bg-black/60 hover:bg-black/80 text-white p-2 rounded-lg backdrop-blur-sm transition-opacity"
        title={isGoogleDrive ? "Ver en Google Drive" : "Abrir en nueva pestaña"}
      >
        {isGoogleDrive ? <IconDrive size={18} /> : <IconExternalLink size={18} />}
      </a>
    </div>
  );
}
