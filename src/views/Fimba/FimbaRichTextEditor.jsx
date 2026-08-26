import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { IconLoader } from "../../components/ui/Icons";
import { uploadFimbaRiderImage } from "../../services/fimbaService";
import {
  isFimbaRiderEmpty,
  sanitizeFimbaRiderHtml,
} from "../../utils/fimbaRider";

const FORMATS = [
  "header",
  "bold",
  "italic",
  "underline",
  "strike",
  "list",
  "bullet",
  "indent",
  "align",
  "link",
  "image",
];

function insertImageAtCursor(quill, url) {
  if (!quill || !url) return;
  const range = quill.getSelection(true);
  const index = range?.index ?? quill.getLength();
  quill.insertEmbed(index, "image", url, "user");
  quill.setSelection(index + 1, 0, "user");
}

function imageFilesFromDataTransfer(dt) {
  if (!dt) return [];
  const out = [];
  if (dt.files?.length) {
    for (const f of dt.files) {
      if (f?.type?.startsWith("image/")) out.push(f);
    }
  }
  if (!out.length && dt.items?.length) {
    for (const item of dt.items) {
      if (item.kind === "file" && item.type?.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) out.push(f);
      }
    }
  }
  return out;
}

/**
 * Editor rich-text FIMBA (Quill / react-quill, ya en el proyecto).
 * Skin magenta en shell FIMBA; fuera usa `.rich-text-quill` OFRN.
 * Imágenes: toolbar / pegar / arrastrar.
 * Upload: `uploadFile` inyectado, o rider (`edicionId`+`propuestaId` → fimba-riders).
 */
export default function FimbaRichTextEditor({
  value = "",
  onChange,
  onBlur,
  readOnly = false,
  placeholder = "Información logística del rider…",
  edicionId,
  propuestaId,
  /** @type {null|((file: File) => Promise<{ url?: string|null, error?: Error|null }>)} */
  uploadFile = null,
  emptyLabel = "Sin rider",
  sanitizeHtml = sanitizeFimbaRiderHtml,
  isEmptyHtml = isFimbaRiderEmpty,
  className = "",
  helperText = "Imagen: botón de la barra, pegar (Ctrl+V) o arrastrar. JPG, PNG, GIF o WebP · máx. 8 MB.",
}) {
  const quillRef = useRef(null);
  const [editorTick, setEditorTick] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const uploadingRef = useRef(false);

  const riderUploadReady =
    edicionId != null &&
    edicionId !== "" &&
    propuestaId != null &&
    propuestaId !== "";

  const canUpload =
    !readOnly && (typeof uploadFile === "function" || riderUploadReady);

  const handleUploadFile = useCallback(
    async (file) => {
      if (!canUpload || !file) return;
      if (uploadingRef.current) {
        setUploadError("Esperá a que termine la subida anterior.");
        return;
      }
      uploadingRef.current = true;
      setUploading(true);
      setUploadError(null);
      try {
        let url = null;
        let error = null;
        if (typeof uploadFile === "function") {
          const res = await uploadFile(file);
          url = res?.url || null;
          error = res?.error || null;
        } else {
          const res = await uploadFimbaRiderImage({
            edicionId,
            propuestaId,
            file,
          });
          url = res?.url || null;
          error = res?.error || null;
        }
        if (error || !url) {
          throw error || new Error("No se pudo subir la imagen");
        }
        const quill = quillRef.current?.getEditor?.();
        insertImageAtCursor(quill, url);
      } catch (e) {
        setUploadError(e?.message || "No se pudo subir la imagen");
      } finally {
        uploadingRef.current = false;
        setUploading(false);
      }
    },
    [canUpload, uploadFile, edicionId, propuestaId],
  );

  const imageHandlerRef = useRef(() => {});
  imageHandlerRef.current = () => {
    if (!canUpload) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/gif,image/webp,image/*";
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) void handleUploadFile(file);
    };
    input.click();
  };

  const modules = useMemo(
    () => ({
      toolbar: readOnly
        ? false
        : {
            container: [
              [{ header: [1, 2, 3, false] }],
              ["bold", "italic", "underline", "strike"],
              [{ list: "ordered" }, { list: "bullet" }],
              [{ indent: "-1" }, { indent: "+1" }],
              [{ align: [] }],
              ["link", ...(canUpload ? ["image"] : [])],
              ["clean"],
            ],
            handlers: canUpload
              ? { image: () => imageHandlerRef.current?.() }
              : {},
          },
      clipboard: {
        matchVisual: false,
      },
    }),
    [readOnly, canUpload],
  );

  useEffect(() => {
    if (!canUpload) return undefined;
    const quill = quillRef.current?.getEditor?.();
    const root = quill?.root;
    if (!root) return undefined;

    const onPaste = (e) => {
      const files = imageFilesFromDataTransfer(e.clipboardData);
      if (!files.length) return;
      e.preventDefault();
      e.stopPropagation();
      void handleUploadFile(files[0]);
    };

    const onDrop = (e) => {
      const files = imageFilesFromDataTransfer(e.dataTransfer);
      if (!files.length) return;
      e.preventDefault();
      e.stopPropagation();
      void handleUploadFile(files[0]);
    };

    const onDragOver = (e) => {
      const types = e.dataTransfer?.types ? Array.from(e.dataTransfer.types) : [];
      if (types.includes("Files")) {
        e.preventDefault();
        if (e.dataTransfer) e.dataTransfer.dropEffect = "copy";
      }
    };

    root.addEventListener("paste", onPaste, true);
    root.addEventListener("drop", onDrop, true);
    root.addEventListener("dragover", onDragOver, true);
    return () => {
      root.removeEventListener("paste", onPaste, true);
      root.removeEventListener("drop", onDrop, true);
      root.removeEventListener("dragover", onDragOver, true);
    };
  }, [canUpload, handleUploadFile, editorTick]);

  if (readOnly) {
    if (isEmptyHtml(value)) {
      return (
        <p className="fimba-muted text-slate-400 text-sm" style={{ margin: 0 }}>
          {emptyLabel}
        </p>
      );
    }
    return (
      <div
        className="fimba-rider-html prose prose-sm max-w-none text-slate-700"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
      />
    );
  }

  return (
    <div
      className={`fimba-richtext rich-text-quill ${className}`.trim()}
      style={{ position: "relative" }}
    >
      <ReactQuill
        ref={(el) => {
          quillRef.current = el;
          if (el?.getEditor && editorTick === 0) {
            setEditorTick(1);
          }
        }}
        theme="snow"
        value={value || ""}
        onChange={(content, _delta, source) => {
          if (source === "user") onChange?.(content);
        }}
        onBlur={onBlur}
        placeholder={placeholder}
        modules={modules}
        formats={FORMATS}
      />
      {uploading && (
        <div
          className="fimba-muted text-slate-500"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0.45rem 0.75rem",
            borderTop: "1px solid var(--fimba-border, #e2e8f0)",
            fontSize: "0.8rem",
          }}
        >
          <IconLoader size={14} className="animate-spin" /> Subiendo imagen…
        </div>
      )}
      {uploadError && (
        <div
          className="fimba-error text-red-600 text-sm"
          style={{ margin: "0.45rem 0.75rem 0.6rem" }}
        >
          {uploadError}
        </div>
      )}
      {canUpload && !uploading && !uploadError && helperText && (
        <p
          className="fimba-muted text-slate-400"
          style={{ margin: "0.35rem 0.75rem 0.55rem", fontSize: "0.72rem" }}
        >
          {helperText}
        </p>
      )}
    </div>
  );
}
