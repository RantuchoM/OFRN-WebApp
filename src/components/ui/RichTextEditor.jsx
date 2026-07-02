import "./quillEntradasRegister";
import Quill from "quill";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import { driveImageDisplayUrl } from "../../utils/entradasDriveImage";
import { FULL_CROP, isFullCrop, parseCropAttr } from "../../utils/quillImageCrop";
import { CroppedImageBlot } from "./quillCroppedImageRegister";
import { QUILL_FONT_FAMILY_KEYS, QUILL_FONT_SIZES_PX } from "./quillEntradasRegister";
import {
  prepareEntradasQuillHtmlForDisplay,
  prepareEntradasQuillHtmlForStorage,
} from "./quillFontNormalize";
import RichTextImageUrlModal from "./RichTextImageUrlModal";

const DEFAULT_FORMATS = [
  "header",
  "font",
  "size",
  "bold",
  "italic",
  "underline",
  "strike",
  "color",
  "background",
  "script",
  "indent",
  "align",
  "list",
  "bullet",
  "blockquote",
  "link",
  "image",
];

const IMAGE_MODAL_CLOSED = {
  open: false,
  mode: "insert",
  initialUrl: "",
  initialCrop: FULL_CROP,
  initialCropEnabled: false,
  editIndex: null,
};

function resolveImageEmbedNode(target) {
  if (!target) return null;
  if (target.classList?.contains("ql-image-embed") || target.classList?.contains("ql-image-crop")) {
    return target;
  }
  if (target.tagName === "IMG") {
    return target.closest(".ql-image-embed, .ql-image-crop") || target;
  }
  return target.closest(".ql-image-embed, .ql-image-crop, img");
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = "",
  className = "",
  modules: modulesProp,
  formats: formatsProp,
  /** Si true, se abre ya en modo edición (barra visible). Útil en formularios inline (p. ej. Editar concierto). */
  defaultOpen = false,
}) {
  const quillRef = useRef(null);
  const imageInsertIndexRef = useRef(null);
  const [isEditing, setIsEditing] = useState(Boolean(defaultOpen));
  const [imageModal, setImageModal] = useState(IMAGE_MODAL_CLOSED);

  const normalizedValue = useMemo(() => prepareEntradasQuillHtmlForDisplay(value || ""), [value]);

  const handleChange = useCallback(
    (content, delta, source, editor) => {
      if (source === "api") return;
      onChange?.(prepareEntradasQuillHtmlForStorage(content), delta, source, editor);
    },
    [onChange],
  );

  useLayoutEffect(() => {
    const ed = quillRef.current?.getEditor?.();
    if (!ed?.root) return;
    ed.root.classList.add("entradas-richtext", "max-w-none", "text-sm", "text-slate-700");
  }, []);

  const imageHandler = useCallback(() => {
    const quill = quillRef.current?.getEditor?.();
    if (!quill) return;

    const range = quill.getSelection(true);
    imageInsertIndexRef.current = range?.index ?? quill.getLength();
    setImageModal({
      open: true,
      mode: "insert",
      initialUrl: "",
      initialCrop: FULL_CROP,
      initialCropEnabled: false,
      editIndex: null,
    });
  }, []);

  const handleImageInsert = useCallback(
    ({ displayUrl, crop, naturalAspect, cropEnabled, editIndex }) => {
      const quill = quillRef.current?.getEditor?.();
      if (!quill || !displayUrl) return;

      const valueToInsert =
        cropEnabled && crop && !isFullCrop(crop)
          ? { src: displayUrl, crop, naturalAspect }
          : displayUrl;

      if (editIndex != null) {
        quill.deleteText(editIndex, 1, "user");
        quill.insertEmbed(editIndex, "image", valueToInsert, "user");
        quill.setSelection(editIndex + 1);
        return;
      }

      const index = imageInsertIndexRef.current ?? quill.getLength();
      quill.insertEmbed(index, "image", valueToInsert, "user");
      quill.setSelection(index + 1);
    },
    [],
  );

  useEffect(() => {
    const editor = quillRef.current?.getEditor?.();
    const root = editor?.root;
    if (!root || !isEditing) return undefined;

    const onDoubleClick = (event) => {
      const node = resolveImageEmbedNode(event.target);
      if (!node || !root.contains(node)) return;

      event.preventDefault();
      event.stopPropagation();

      const blot = Quill.find(node);
      if (!blot) return;

      const index = editor.getIndex(blot);
      const embedValue = CroppedImageBlot.value(node);
      const src =
        typeof embedValue === "string" ? embedValue : embedValue?.src || node.querySelector?.("img")?.src || "";
      const crop =
        typeof embedValue === "object" && embedValue?.crop ? embedValue.crop : parseCropAttr(node.getAttribute("data-crop"));
      const cropEnabled = Boolean(crop && !isFullCrop(crop));

      setImageModal({
        open: true,
        mode: "edit",
        initialUrl: driveImageDisplayUrl(src) || src,
        initialCrop: crop || FULL_CROP,
        initialCropEnabled: cropEnabled,
        editIndex: index,
      });
    };

    root.addEventListener("dblclick", onDoubleClick);
    return () => root.removeEventListener("dblclick", onDoubleClick);
  }, [isEditing]);

  const memoModules = useMemo(() => {
    if (modulesProp) return modulesProp;
    return {
      toolbar: {
        container: [
          [{ header: [1, 2, 3, 4, false] }],
          [{ font: [false, ...QUILL_FONT_FAMILY_KEYS] }],
          [{ size: [false, ...QUILL_FONT_SIZES_PX] }],
          ["bold", "italic", "underline", "strike"],
          [{ color: [] }, { background: [] }],
          [{ script: "sub" }, { script: "super" }],
          [{ indent: "-1" }, { indent: "+1" }, { align: [] }],
          [{ list: "ordered" }, { list: "bullet" }],
          ["blockquote", "link", "image"],
          ["clean"],
        ],
        handlers: {
          image: imageHandler,
        },
      },
    };
  }, [modulesProp, imageHandler]);

  const memoFormats = useMemo(() => formatsProp || DEFAULT_FORMATS, [formatsProp]);

  useEffect(() => {
    if (!isEditing || !quillRef.current) return;
    const id = window.requestAnimationFrame(() => {
      try {
        const editor = quillRef.current?.getEditor?.();
        if (editor) editor.focus();
      } catch (e) {
        // noop
      }
    });
    return () => window.cancelAnimationFrame(id);
  }, [isEditing]);

  return (
    <>
      <div
        className={`rounded-lg bg-white shadow-sm rich-text-quill ${
          isEditing
            ? `border border-indigo-300 ${className}`
            : `border border-slate-200 cursor-text hover:border-indigo-300 transition-colors rich-text-quill--readonly ${className}`
        }`}
        onClick={!isEditing ? () => setIsEditing(true) : undefined}
        onKeyDown={
          !isEditing
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsEditing(true);
                }
              }
            : undefined
        }
        role={!isEditing ? "button" : undefined}
        tabIndex={!isEditing ? 0 : undefined}
      >
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={normalizedValue}
          onChange={handleChange}
          placeholder={placeholder}
          modules={memoModules}
          formats={memoFormats}
          readOnly={!isEditing}
          className="bg-white"
        />
        {isEditing ? (
          <p className="px-3 pb-2 text-[11px] text-slate-400">
            Doble clic en una imagen para editar URL o recorte.
          </p>
        ) : null}
      </div>

      <RichTextImageUrlModal
        isOpen={imageModal.open}
        mode={imageModal.mode}
        initialUrl={imageModal.initialUrl}
        initialCrop={imageModal.initialCrop}
        initialCropEnabled={imageModal.initialCropEnabled}
        editIndex={imageModal.editIndex}
        onClose={() => setImageModal(IMAGE_MODAL_CLOSED)}
        onInsert={handleImageInsert}
      />
    </>
  );
}
