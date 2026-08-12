import React, { useEffect, useRef, useState } from "react";
import { saveAs } from "file-saver";
import {
  IconLoader,
  IconCopy,
  IconCheck,
  IconDrive,
  IconExternalLink,
  IconFolder,
  IconFileText,
  IconChevronRight,
  IconDownload,
  IconPlus,
  IconEdit,
  IconCloudUpload,
} from "../../components/ui/Icons";
import {
  FIMBA_DRIVE_UPLOAD_MAX_BYTES,
  buildDriveFolderOpenUrl,
  downloadFimbaDriveFile,
  extractDriveFolderId,
  listFimbaDriveFolderFiles,
  normalizeCarpetaDocumentacion,
  renameFimbaDriveFile,
  uploadFimbaDriveFile,
} from "../../services/fimbaService";

const DRIVE_FOLDER_MIME = "application/vnd.google-apps.folder";
/** Subidas en paralelo acotadas (edge manage-drive + tope ~4 MB). */
const DRIVE_UPLOAD_CONCURRENCY = 2;

function dataTransferHasFiles(dt) {
  if (!dt) return false;
  return Array.from(dt.types || []).includes("Files");
}

/**
 * Archivos del Explorador. Carpetas: el navegador suele entregar un
 * DirectoryEntry (webkitGetAsEntry) o un File vacío; no se recorre el árbol.
 */
function filesFromDataTransfer(dt) {
  const files = [];
  const skippedFolders = [];
  const items = dt?.items;
  if (items && items.length > 0) {
    for (let i = 0; i < items.length; i += 1) {
      const item = items[i];
      if (item.kind !== "file") continue;
      const entry =
        typeof item.webkitGetAsEntry === "function"
          ? item.webkitGetAsEntry()
          : null;
      if (entry?.isDirectory) {
        skippedFolders.push(entry.name || "carpeta");
        continue;
      }
      const file = item.getAsFile();
      if (file) files.push(file);
    }
  } else {
    for (const file of Array.from(dt?.files || [])) {
      files.push(file);
    }
  }
  return { files, skippedFolders };
}

async function mapPool(items, limit, worker) {
  if (!items.length) return [];
  const results = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const idx = next;
      next += 1;
      results[idx] = await worker(items[idx], idx);
    }
  };
  const n = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: n }, () => run()));
  return results;
}

/** Prefetch de subcarpetas tras listar el nivel actual (no bloquea first paint). */
export const FIMBA_DRIVE_PREFETCH = {
  /** Niveles anidados a precalentar (1 = solo hijas directas; 2 = también nietas). */
  maxDepth: 2,
  concurrency: 4,
  /** Tope de listados de carpetas en un warm (rate-limit / explosion). */
  maxFolders: 40,
};

function fileOpenHref(file) {
  if (file?.webViewLink) return file.webViewLink;
  if (!file?.id) return null;
  if (file.mimeType === DRIVE_FOLDER_MIME) {
    return `https://drive.google.com/drive/folders/${file.id}`;
  }
  return `https://drive.google.com/file/d/${file.id}/view`;
}

/** Clave estable para el mapa folderId → files[] (id Drive si existe). */
function driveFolderCacheKey(folderUrlOrId) {
  const id = extractDriveFolderId(folderUrlOrId);
  if (id) return id;
  return (
    normalizeCarpetaDocumentacion(folderUrlOrId) ||
    String(folderUrlOrId || "").trim()
  );
}

function collectChildFolderUrls(files) {
  const urls = [];
  for (const f of files || []) {
    if (f?.mimeType !== DRIVE_FOLDER_MIME) continue;
    const href = fileOpenHref(f);
    if (href) urls.push(href);
  }
  return urls;
}

/**
 * Precalienta listados de subcarpetas en `cache` (Map key → files[]).
 * BFS, profundidad + total acotados; errores de subcarpeta se omiten (sin entry).
 */
async function warmDriveFolderCache({
  seedFiles,
  cache,
  startDepth = 1,
  maxDepth = FIMBA_DRIVE_PREFETCH.maxDepth,
  concurrency = FIMBA_DRIVE_PREFETCH.concurrency,
  maxFolders = FIMBA_DRIVE_PREFETCH.maxFolders,
  isCancelled = () => false,
  onProgress = null,
}) {
  if (startDepth > maxDepth) return { completed: 0, scheduled: 0 };

  /** @type {{ url: string, depth: number }[]} */
  const queue = collectChildFolderUrls(seedFiles).map((url) => ({
    url,
    depth: startDepth,
  }));
  let completed = 0;
  let scheduled = 0;

  while (queue.length > 0 && scheduled < maxFolders && !isCancelled()) {
    const batch = [];
    while (
      batch.length < concurrency &&
      queue.length > 0 &&
      scheduled < maxFolders
    ) {
      const item = queue.shift();
      if (!item) break;
      const key = driveFolderCacheKey(item.url);
      if (!key) continue;
      if (cache.has(key)) {
        if (item.depth < maxDepth) {
          for (const url of collectChildFolderUrls(cache.get(key) || [])) {
            queue.push({ url, depth: item.depth + 1 });
          }
        }
        continue;
      }
      batch.push(item);
      scheduled += 1;
    }
    if (!batch.length) {
      if (queue.length === 0) break;
      continue;
    }
    onProgress?.({ completed, scheduled });
    await Promise.all(
      batch.map(async (item) => {
        if (isCancelled()) return;
        const { files: list, error: err } = await listFimbaDriveFolderFiles(
          item.url,
        );
        if (isCancelled()) return;
        completed += 1;
        onProgress?.({ completed, scheduled });
        // Error: dejar sin cachear (próximo acceso en vivo); no reintentar en este warm.
        if (err) return;
        const key = driveFolderCacheKey(item.url);
        if (!key) return;
        cache.set(key, list || []);
        if (item.depth < maxDepth) {
          for (const url of collectChildFolderUrls(list || [])) {
            queue.push({ url, depth: item.depth + 1 });
          }
        }
      }),
    );
  }
  return { completed, scheduled };
}

const DOCS_ACTION_BTN_STYLE = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: "0.8rem",
  textDecoration: "none",
  padding: "4px 10px",
  whiteSpace: "nowrap",
};

/**
 * Preview de contenido de carpeta Drive (nivel 1 + navegar subcarpetas).
 * Listado y prefetch de subcarpetas: por defecto solo tras «Explorar» (cero API al montar la ficha).
 * Con `autoExplore`: panel abierto al montar / al tener URL válida (modal Contrataciones).
 * Cache in-memory + prefetch anidado (depth ≤ 2) mientras el panel está/estuvo abierto en sesión.
 * `children` opcional: render prop `({ exploreButton, driveLink, panelOpen, rootUrl }) => node`.
 * Copy/descarga: quien ve el preview. Subida (+ / drag&drop del Explorador) y
 * renombrar: solo canUpload (canEditPropuestaMeta / editor contrataciones), y
 * solo con panel abierto (carpeta del breadcrumb). Viewers: sin zona de drop.
 */
export function DocumentacionDrivePreview({
  carpetaDocumentacion,
  canUpload = false,
  /** Si true, lista la carpeta al abrir (modal); ficha inline sigue lazy. */
  autoExplore = false,
  children = null,
}) {
  const rootUrl = buildDriveFolderOpenUrl(carpetaDocumentacion);
  /** Cerrado por defecto salvo autoExplore (modal dedicado). */
  const [panelOpen, setPanelOpen] = useState(
    () => Boolean(autoExplore && rootUrl),
  );
  const [stack, setStack] = useState(() =>
    rootUrl ? [{ label: "Documentación", folderUrl: rootUrl }] : [],
  );
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionMsg, setActionMsg] = useState(null); // { type: 'ok'|'err', text }
  const [copiedId, setCopiedId] = useState(null);
  const [busyId, setBusyId] = useState(null); // download file id
  const [uploading, setUploading] = useState(false);
  /** Overlay de drop desde el Explorador (solo canUpload + archivos OS). */
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  /** Prefetch de subcarpetas en background (no bloquea listado actual). */
  const [prefetching, setPrefetching] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const fileInputRef = useRef(null);
  const renameInputRef = useRef(null);
  const actionMsgTimer = useRef(null);
  /** Profundidad dragenter/leave para no parpadear al cruzar hijos. */
  const dragDepthRef = useRef(0);
  const folderUrlRef = useRef(null);
  /** Evita commit por blur tras Escape. */
  const renameCancelRef = useRef(false);
  /** Evita doble commit (Enter + blur). */
  const renameCommittingRef = useRef(false);
  /** Distingue click (entrar carpeta / abrir archivo) vs doble-click (renombrar). */
  const nameClickTimerRef = useRef(null);
  /** @type {React.MutableRefObject<Map<string, Array>>} folderKey → files[] */
  const folderCacheRef = useRef(new Map());
  /** Token de warm: cancelar al cambiar raíz o desmontar. */
  const warmTokenRef = useRef({ cancelled: false });
  const prefetchCountRef = useRef(0);
  /** Identidad de carpeta raíz ya aplicada (evita reset por keystroke del input). */
  const rootKeyRef = useRef(
    driveFolderCacheKey(buildDriveFolderOpenUrl(carpetaDocumentacion)) || "",
  );

  const current = stack[stack.length - 1] || null;
  const folderUrl = current?.folderUrl || null;
  folderUrlRef.current = folderUrl;
  const stackDepth = Math.max(0, stack.length - 1);

  const flashMsg = (type, text, ms = 3200) => {
    if (actionMsgTimer.current) clearTimeout(actionMsgTimer.current);
    setActionMsg({ type, text });
    actionMsgTimer.current = setTimeout(() => setActionMsg(null), ms);
  };

  const clearDragState = () => {
    dragDepthRef.current = 0;
    setIsDraggingFiles(false);
  };

  const invalidateFolderCache = (url) => {
    const key = driveFolderCacheKey(url);
    if (key) folderCacheRef.current.delete(key);
  };

  const startWarmFromFiles = (seedFiles, fromDepth) => {
    const remaining =
      FIMBA_DRIVE_PREFETCH.maxDepth - Math.max(0, fromDepth);
    if (remaining <= 0) return;
    if (!collectChildFolderUrls(seedFiles).length) return;
    const token = warmTokenRef.current;
    prefetchCountRef.current += 1;
    setPrefetching(true);
    warmDriveFolderCache({
      seedFiles,
      cache: folderCacheRef.current,
      startDepth: 1,
      maxDepth: remaining,
      isCancelled: () => token.cancelled,
    })
      .catch(() => {
        /* soft-fail: navegación en vivo sigue */
      })
      .finally(() => {
        prefetchCountRef.current = Math.max(0, prefetchCountRef.current - 1);
        if (!token.cancelled && prefetchCountRef.current === 0) {
          setPrefetching(false);
        }
      });
  };

  useEffect(() => {
    return () => {
      if (actionMsgTimer.current) clearTimeout(actionMsgTimer.current);
      if (nameClickTimerRef.current) clearTimeout(nameClickTimerRef.current);
      warmTokenRef.current.cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!renamingId || !renameInputRef.current) return;
    renameInputRef.current.focus();
    renameInputRef.current.select();
  }, [renamingId]);

  useEffect(() => {
    // Al cambiar de carpeta o cerrar panel, abortar edición inline y drop.
    setRenamingId(null);
    setRenameDraft("");
    renameCancelRef.current = true;
    clearDragState();
  }, [folderUrl, panelOpen]);

  useEffect(() => {
    const nextRoot = buildDriveFolderOpenUrl(carpetaDocumentacion);
    const nextKey = driveFolderCacheKey(nextRoot || carpetaDocumentacion) || "";
    // Solo reset al cambiar la carpeta (ID), no en cada tecla del input.
    if (nextKey === rootKeyRef.current) {
      if (!nextRoot) setPanelOpen(false);
      return;
    }
    rootKeyRef.current = nextKey;
    warmTokenRef.current.cancelled = true;
    warmTokenRef.current = { cancelled: false };
    folderCacheRef.current = new Map();
    prefetchCountRef.current = 0;
    setPrefetching(false);
    setFiles([]);
    setListError(null);
    // autoExplore: reabrir al cambiar carpeta válida; sin URL → cerrado.
    setPanelOpen(Boolean(autoExplore && nextRoot));
    setStack(nextRoot ? [{ label: "Documentación", folderUrl: nextRoot }] : []);
  }, [carpetaDocumentacion, autoExplore]);

  // Solo listar / prefetch con panel abierto (Explorar). Cerrado = cero llamadas manage-drive.
  useEffect(() => {
    if (!panelOpen || !folderUrl) {
      setLoading(false);
      if (!panelOpen) {
        // Pausar warm al colapsar; cache de sesión se conserva para reabrir sin re-list.
        warmTokenRef.current.cancelled = true;
        warmTokenRef.current = { cancelled: false };
        prefetchCountRef.current = 0;
        setPrefetching(false);
      }
      return undefined;
    }
    let cancelled = false;
    const key = driveFolderCacheKey(folderUrl);
    const cached = key ? folderCacheRef.current.get(key) : undefined;

    // Cache hit → pintar al instante; no re-warm (el warm se hizo al listar en vivo).
    if (cached) {
      setLoading(false);
      setListError(null);
      setFiles(cached);
      return undefined;
    }

    setLoading(true);
    setListError(null);
    listFimbaDriveFolderFiles(folderUrl).then(({ files: list, error: err }) => {
      if (cancelled) return;
      setLoading(false);
      if (err) {
        setFiles([]);
        setListError(
          err.message ||
            "No se pudo listar la carpeta. Compartila con la cuenta del Archivo OFRN o abrila en Drive.",
        );
        return;
      }
      const next = list || [];
      setListError(null);
      setFiles(next);
      if (key) folderCacheRef.current.set(key, next);
      // Prefetch solo tras explore exitoso: no bloquea first paint del nivel actual.
      startWarmFromFiles(next, stackDepth);
    });
    return () => {
      cancelled = true;
    };
  }, [panelOpen, folderUrl, refreshKey, stackDepth]);

  const enterFolder = (file) => {
    const nextUrl = fileOpenHref(file);
    if (!nextUrl) return;
    setStack((prev) => [
      ...prev,
      { label: file.name || "Carpeta", folderUrl: nextUrl },
    ]);
  };

  const goToCrumb = (index) => {
    setStack((prev) => prev.slice(0, index + 1));
  };

  const copyLink = async (file) => {
    const href = fileOpenHref(file);
    if (!href) {
      flashMsg("err", "No hay enlace para copiar");
      return;
    }
    try {
      await navigator.clipboard.writeText(href);
      setCopiedId(file.id || href);
      flashMsg("ok", "Enlace copiado");
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      flashMsg("err", "No se pudo copiar el enlace");
    }
  };

  const downloadFile = async (file) => {
    if (file.mimeType === DRIVE_FOLDER_MIME) return;
    const key = file.id || file.name;
    setBusyId(key);
    const { blob, fileName, error: err } = await downloadFimbaDriveFile(file);
    setBusyId(null);
    if (err || !blob) {
      flashMsg("err", err?.message || "No se pudo descargar");
      return;
    }
    try {
      saveAs(blob, fileName || file.name || "archivo");
      flashMsg("ok", "Descarga iniciada");
    } catch {
      flashMsg("err", "No se pudo guardar el archivo en el navegador");
    }
  };

  const onPickUpload = () => {
    if (!canUpload || uploading || !folderUrl || !panelOpen) return;
    fileInputRef.current?.click();
  };

  /**
   * Sube archivos a la carpeta del breadcrumb (mismo path que +).
   * `skippedFolders`: carpetas OS detectadas (no se recorre el árbol).
   */
  const uploadFilesToCurrentFolder = async (
    incoming,
    { skippedFolders = [] } = {},
  ) => {
    const destUrl = folderUrl;
    if (!canUpload || uploading || !destUrl || !panelOpen) return;

    const files = Array.from(incoming || []).filter(Boolean);
    const maxMb = (FIMBA_DRIVE_UPLOAD_MAX_BYTES / (1024 * 1024)).toFixed(0);
    const oversized = [];
    const eligible = [];
    for (const file of files) {
      if (file.size > FIMBA_DRIVE_UPLOAD_MAX_BYTES) oversized.push(file.name);
      else eligible.push(file);
    }

    if (!eligible.length) {
      if (skippedFolders.length && !files.length) {
        flashMsg(
          "err",
          "No se pueden subir carpetas desde el Explorador. Abrí la carpeta y arrastrá los archivos.",
          5000,
        );
        return;
      }
      if (oversized.length) {
        flashMsg(
          "err",
          oversized.length === 1
            ? `Máximo ${maxMb} MB por archivo desde FIMBA`
            : `${oversized.length} archivos superan ${maxMb} MB`,
          5000,
        );
        return;
      }
      if (skippedFolders.length) {
        flashMsg(
          "err",
          "No se pueden subir carpetas desde el Explorador. Arrastrá archivos sueltos.",
          5000,
        );
        return;
      }
      flashMsg("err", "No hay archivos para subir");
      return;
    }

    setUploading(true);
    let results = [];
    try {
      results = await mapPool(
        eligible,
        DRIVE_UPLOAD_CONCURRENCY,
        async (file) => {
          const { error: err } = await uploadFimbaDriveFile(destUrl, file);
          return { name: file.name, error: err };
        },
      );
    } catch (e) {
      setUploading(false);
      flashMsg(
        "err",
        e instanceof Error ? e.message : "Error al subir archivos",
      );
      return;
    }
    setUploading(false);

    const failed = results.filter((r) => r.error);
    const ok = results.length - failed.length;

    if (ok > 0) {
      invalidateFolderCache(destUrl);
      if (folderUrlRef.current === destUrl) {
        setRefreshKey((k) => k + 1);
      }
    }

    const parts = [];
    if (ok) {
      parts.push(ok === 1 ? "Archivo subido" : `${ok} archivos subidos`);
    }
    if (oversized.length) {
      const names = oversized.slice(0, 3).join(", ");
      parts.push(
        oversized.length === 1
          ? `${oversized[0]} supera ${maxMb} MB`
          : `${oversized.length} superan ${maxMb} MB (${names}${
              oversized.length > 3 ? "…" : ""
            })`,
      );
    }
    if (skippedFolders.length) {
      parts.push(
        skippedFolders.length === 1
          ? `Carpeta «${skippedFolders[0]}» omitida (arrastrá archivos, no carpetas)`
          : `${skippedFolders.length} carpetas omitidas (no se suben árboles del Explorador)`,
      );
    }
    if (failed.length) {
      parts.push(
        failed
          .slice(0, 3)
          .map((r) => `${r.name}: ${r.error?.message || "Error al subir"}`)
          .join(" · ") + (failed.length > 3 ? "…" : ""),
      );
    }

    const hasWarn = failed.length > 0 || oversized.length > 0 || skippedFolders.length > 0;
    flashMsg(hasWarn ? "err" : "ok", parts.join(" · "), hasWarn ? 6000 : 3200);
  };

  const onUploadChange = async (e) => {
    const picked = e.target.files;
    e.target.value = "";
    if (!picked?.length) return;
    await uploadFilesToCurrentFolder(picked);
  };

  const onPanelDragEnter = (e) => {
    if (!dataTransferHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!canUpload || !panelOpen || !folderUrl) return;
    dragDepthRef.current += 1;
    if (!renamingId) setIsDraggingFiles(true);
  };

  const onPanelDragOver = (e) => {
    if (!dataTransferHasFiles(e.dataTransfer)) return;
    e.preventDefault();
    e.stopPropagation();
    if (!canUpload || renamingId || uploading || !folderUrl) {
      e.dataTransfer.dropEffect = "none";
      return;
    }
    e.dataTransfer.dropEffect = "copy";
  };

  const onPanelDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragDepthRef.current === 0) return;
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
    if (dragDepthRef.current === 0) setIsDraggingFiles(false);
  };

  const onPanelDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    clearDragState();
    if (!canUpload || renamingId || uploading || !folderUrl || !panelOpen) {
      return;
    }
    if (!dataTransferHasFiles(e.dataTransfer)) return;
    const { files, skippedFolders } = filesFromDataTransfer(e.dataTransfer);
    void uploadFilesToCurrentFolder(files, { skippedFolders });
  };

  const startRename = (file) => {
    if (!canUpload || !file?.id || renameBusy || uploading) return;
    if (nameClickTimerRef.current) {
      clearTimeout(nameClickTimerRef.current);
      nameClickTimerRef.current = null;
    }
    renameCancelRef.current = false;
    setRenamingId(file.id);
    setRenameDraft(file.name || "");
  };

  const cancelRename = () => {
    renameCancelRef.current = true;
    setRenamingId(null);
    setRenameDraft("");
  };

  const applyRenameLocal = (fileId, nextName) => {
    const patch = (list) =>
      (list || []).map((f) =>
        f.id === fileId ? { ...f, name: nextName } : f,
      );
    setFiles((prev) => patch(prev));
    const key = driveFolderCacheKey(folderUrl);
    if (key && folderCacheRef.current.has(key)) {
      folderCacheRef.current.set(key, patch(folderCacheRef.current.get(key)));
    }
  };

  const commitRename = async (file) => {
    if (renameCancelRef.current) return;
    if (renameBusy || renameCommittingRef.current) return;
    const next = String(renameDraft || "").trim();
    if (!next) {
      flashMsg("err", "El nombre no puede estar vacío");
      requestAnimationFrame(() => renameInputRef.current?.focus());
      return;
    }
    if (next === String(file.name || "").trim()) {
      renameCancelRef.current = true;
      setRenamingId(null);
      setRenameDraft("");
      return;
    }
    renameCommittingRef.current = true;
    setRenameBusy(true);
    const { name: savedName, error: err } = await renameFimbaDriveFile(
      file.id,
      next,
    );
    if (err) {
      setRenameBusy(false);
      renameCommittingRef.current = false;
      flashMsg("err", err.message || "No se pudo renombrar");
      requestAnimationFrame(() => renameInputRef.current?.focus());
      return;
    }
    applyRenameLocal(file.id, savedName || next);
    // Evitar re-commit por blur al desmontar el input.
    renameCancelRef.current = true;
    setRenamingId(null);
    setRenameDraft("");
    setRenameBusy(false);
    renameCommittingRef.current = false;
    flashMsg("ok", "Nombre actualizado");
  };

  const onFolderNameClick = (file) => {
    if (renamingId === file.id) return;
    if (nameClickTimerRef.current) {
      clearTimeout(nameClickTimerRef.current);
      nameClickTimerRef.current = null;
    }
    // Esperar por posible doble-click (renombrar) antes de navegar.
    nameClickTimerRef.current = setTimeout(() => {
      nameClickTimerRef.current = null;
      enterFolder(file);
    }, 280);
  };

  /** Archivos: con canUpload el click simple abre; doble clic renombra (sin <a> inmediato). */
  const onFileNameClick = (file) => {
    if (renamingId === file.id) return;
    const href = fileOpenHref(file);
    if (!href) return;
    if (!canUpload) {
      window.open(href, "_blank", "noopener,noreferrer");
      return;
    }
    if (nameClickTimerRef.current) {
      clearTimeout(nameClickTimerRef.current);
      nameClickTimerRef.current = null;
    }
    nameClickTimerRef.current = setTimeout(() => {
      nameClickTimerRef.current = null;
      window.open(href, "_blank", "noopener,noreferrer");
    }, 280);
  };

  const iconBtnStyle = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "var(--fimba-deep)",
    opacity: 0.7,
    borderRadius: 6,
    flexShrink: 0,
  };

  const exploreButton = rootUrl ? (
    <button
      type="button"
      className={`fimba-btn ${panelOpen ? "fimba-btn-ghost" : "fimba-btn-primary"}`}
      onClick={() => setPanelOpen((o) => !o)}
      aria-expanded={panelOpen}
      title={
        panelOpen
          ? "Cerrar listado de Drive"
          : "Listar archivos de la carpeta en FIMBA"
      }
      style={DOCS_ACTION_BTN_STYLE}
    >
      <IconFolder size={14} />
      {panelOpen ? "Cerrar" : "Explorar"}
    </button>
  ) : null;

  const driveLink = rootUrl ? (
    <a
      href={rootUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="fimba-btn fimba-btn-ghost"
      style={DOCS_ACTION_BTN_STYLE}
    >
      <IconExternalLink size={14} /> Abrir en Drive
    </a>
  ) : null;

  const listPanel =
    panelOpen && rootUrl ? (
      <div
        className="fimba-drive-docs"
        onDragEnter={canUpload ? onPanelDragEnter : undefined}
        onDragOver={canUpload ? onPanelDragOver : undefined}
        onDragLeave={canUpload ? onPanelDragLeave : undefined}
        onDrop={canUpload ? onPanelDrop : undefined}
        style={{
          marginTop: typeof children === "function" ? "0.65rem" : "0.5rem",
          border:
            "1px solid color-mix(in srgb, var(--fimba-cyan, #00b1eb) 35%, transparent)",
          borderRadius: 10,
          padding: "0.75rem 0.85rem",
          background: "color-mix(in srgb, var(--fimba-cyan, #00b1eb) 6%, #fff)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontWeight: 600,
              fontSize: "0.9rem",
              color: "var(--fimba-deep)",
            }}
          >
            <IconDrive size={16} /> Documentación (Drive)
            {canUpload && (
              <button
                type="button"
                className="fimba-btn fimba-btn-ghost"
                onClick={onPickUpload}
                disabled={uploading || loading || !folderUrl}
                title="Subir archivo a esta carpeta (o arrastrá desde el explorador)"
                aria-label="Subir archivo"
                style={{
                  padding: "2px 6px",
                  marginLeft: 2,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {uploading ? (
                  <IconLoader size={14} className="animate-spin" />
                ) : (
                  <IconPlus size={14} />
                )}
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: "none" }}
              onChange={onUploadChange}
              disabled={!canUpload || uploading}
            />
          </div>
          <button
            type="button"
            className="fimba-btn fimba-btn-ghost"
            onClick={() => setPanelOpen(false)}
            style={DOCS_ACTION_BTN_STYLE}
          >
            Cerrar
          </button>
        </div>

        {actionMsg && (
          <div
            role="status"
            style={{
              fontSize: "0.8rem",
              marginBottom: 8,
              padding: "4px 8px",
              borderRadius: 6,
              color: actionMsg.type === "err" ? "#9f1239" : "#0f766e",
              background:
                actionMsg.type === "err"
                  ? "rgba(244, 63, 94, 0.1)"
                  : "rgba(13, 148, 136, 0.12)",
            }}
          >
            {actionMsg.text}
          </div>
        )}

        {stack.length > 1 && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: 4,
              marginBottom: 8,
              fontSize: "0.78rem",
            }}
          >
            {stack.map((crumb, i) => (
              <React.Fragment key={`${crumb.folderUrl}-${i}`}>
                {i > 0 && <IconChevronRight size={12} style={{ opacity: 0.45 }} />}
                <button
                  type="button"
                  className="fimba-btn fimba-btn-ghost"
                  onClick={() => goToCrumb(i)}
                  disabled={i === stack.length - 1}
                  style={{
                    padding: "2px 6px",
                    fontSize: "0.78rem",
                    fontWeight: i === stack.length - 1 ? 700 : 500,
                  }}
                >
                  {crumb.label}
                </button>
              </React.Fragment>
            ))}
          </div>
        )}

        {!loading && prefetching && (
          <div
            className="fimba-muted"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: "0.75rem",
              marginBottom: 6,
              opacity: 0.85,
            }}
            aria-live="polite"
          >
            <IconLoader size={12} className="animate-spin" /> Cargando subcarpetas…
          </div>
        )}

        <div
          style={{
            position: "relative",
            minHeight: canUpload ? 96 : undefined,
          }}
        >
        {loading && (
          <div
            className="fimba-muted"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: "0.85rem",
            }}
          >
            <IconLoader size={14} className="animate-spin" /> Cargando contenido…
          </div>
        )}

        {!loading && listError && (
          <div className="fimba-error" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
            {listError}
            <div className="fimba-muted" style={{ marginTop: 6, fontSize: "0.78rem" }}>
              La previsualización usa la cuenta de Google del Archivo (OAuth en{" "}
              <code>manage-drive</code>). Compartí la carpeta con esa cuenta (lector; editor para
              subir o renombrar) o abrila en Drive.
            </div>
          </div>
        )}

        {!loading && !listError && files.length === 0 && (
          <div className="fimba-muted" style={{ fontSize: "0.85rem" }}>
            Carpeta vacía o sin elementos visibles.
            {canUpload
              ? " Usá + o arrastrá archivos del explorador para subirlos aquí. El lápiz o doble clic renombra."
              : null}
          </div>
        )}

        {!loading && !listError && files.length > 0 && (
          <ul
            style={{
              listStyle: "none",
              margin: 0,
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              maxHeight: 280,
              overflowY: "auto",
            }}
          >
            {[...files]
              .sort((a, b) => {
                const af = a.mimeType === DRIVE_FOLDER_MIME ? 0 : 1;
                const bf = b.mimeType === DRIVE_FOLDER_MIME ? 0 : 1;
                if (af !== bf) return af - bf;
                return String(a.name || "").localeCompare(String(b.name || ""), "es", {
                  sensitivity: "base",
                });
              })
              .map((file) => {
                const isFolder = file.mimeType === DRIVE_FOLDER_MIME;
                const href = fileOpenHref(file);
                const rowKey = file.id || file.name;
                const isBusy = busyId === rowKey;
                const isCopied = copiedId === (file.id || href);
                const isRenaming = canUpload && renamingId === file.id;
                const nameLabel = file.name || (isFolder ? "Carpeta" : "Archivo");
                return (
                  <li
                    key={rowKey}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "6px 8px",
                      borderRadius: 8,
                      background: "#fff",
                      border: "1px solid rgba(0,0,0,0.06)",
                    }}
                  >
                    {isFolder ? (
                      <IconFolder
                        size={15}
                        style={{ color: "var(--fimba-cyan, #00b1eb)", flexShrink: 0 }}
                      />
                    ) : (
                      <IconFileText
                        size={15}
                        style={{
                          color: "var(--fimba-deep)",
                          flexShrink: 0,
                          opacity: 0.7,
                        }}
                      />
                    )}
                    {isRenaming ? (
                      <input
                        ref={renameInputRef}
                        type="text"
                        value={renameDraft}
                        disabled={renameBusy}
                        aria-label={`Renombrar ${nameLabel}`}
                        onChange={(e) => setRenameDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            commitRename(file);
                          } else if (e.key === "Escape") {
                            e.preventDefault();
                            cancelRename();
                          }
                        }}
                        onBlur={() => {
                          if (renameCancelRef.current) return;
                          commitRename(file);
                        }}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          font: "inherit",
                          fontSize: "0.86rem",
                          fontWeight: isFolder ? 600 : 500,
                          color: "var(--fimba-deep)",
                          padding: "2px 6px",
                          borderRadius: 6,
                          border: "1px solid color-mix(in srgb, var(--fimba-cyan, #00b1eb) 55%, #999)",
                          outline: "none",
                          background: "#fff",
                        }}
                      />
                    ) : isFolder ? (
                      <button
                        type="button"
                        onClick={() => onFolderNameClick(file)}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          if (canUpload) startRename(file);
                        }}
                        title={
                          canUpload
                            ? "Clic para abrir · Doble clic para renombrar"
                            : "Abrir carpeta"
                        }
                        style={{
                          flex: 1,
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          font: "inherit",
                          fontWeight: 600,
                          fontSize: "0.86rem",
                          color: "var(--fimba-deep)",
                          padding: 0,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {nameLabel}
                      </button>
                    ) : href && canUpload ? (
                      <button
                        type="button"
                        onClick={() => onFileNameClick(file)}
                        onDoubleClick={(e) => {
                          e.preventDefault();
                          startRename(file);
                        }}
                        title="Clic para abrir · Doble clic para renombrar"
                        style={{
                          flex: 1,
                          textAlign: "left",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          font: "inherit",
                          fontSize: "0.86rem",
                          fontWeight: 500,
                          color: "#222",
                          padding: 0,
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {nameLabel}
                      </button>
                    ) : href ? (
                      <a
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          flex: 1,
                          fontSize: "0.86rem",
                          fontWeight: 500,
                          color: "#222",
                          textDecoration: "none",
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {nameLabel}
                      </a>
                    ) : (
                      <span
                        onDoubleClick={() => {
                          if (canUpload) startRename(file);
                        }}
                        style={{
                          flex: 1,
                          fontSize: "0.86rem",
                          minWidth: 0,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {nameLabel}
                      </span>
                    )}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        flexShrink: 0,
                      }}
                    >
                      {canUpload && !isRenaming && (
                        <button
                          type="button"
                          onClick={() => startRename(file)}
                          disabled={renameBusy || uploading || !file.id}
                          title="Renombrar"
                          aria-label={`Renombrar ${nameLabel}`}
                          style={{
                            ...iconBtnStyle,
                            opacity: renameBusy || uploading || !file.id ? 0.4 : 0.7,
                            cursor:
                              renameBusy || uploading || !file.id
                                ? "not-allowed"
                                : "pointer",
                          }}
                        >
                          <IconEdit size={14} />
                        </button>
                      )}
                      {isRenaming && renameBusy && (
                        <span
                          style={{ ...iconBtnStyle, cursor: "wait", opacity: 0.7 }}
                          aria-hidden
                        >
                          <IconLoader size={14} className="animate-spin" />
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => copyLink(file)}
                        title="Copiar enlace"
                        aria-label={`Copiar enlace de ${nameLabel}`}
                        style={iconBtnStyle}
                      >
                        {isCopied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                      </button>
                      {!isFolder && (
                        <button
                          type="button"
                          onClick={() => downloadFile(file)}
                          disabled={isBusy}
                          title="Descargar"
                          aria-label={`Descargar ${nameLabel}`}
                          style={{
                            ...iconBtnStyle,
                            opacity: isBusy ? 0.45 : 0.7,
                            cursor: isBusy ? "wait" : "pointer",
                          }}
                        >
                          {isBusy ? (
                            <IconLoader size={14} className="animate-spin" />
                          ) : (
                            <IconDownload size={14} />
                          )}
                        </button>
                      )}
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir en Drive"
                          aria-label={`Abrir ${nameLabel} en Drive`}
                          style={{ ...iconBtnStyle, textDecoration: "none" }}
                        >
                          <IconExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        )}

        {canUpload && isDraggingFiles && !renamingId && !uploading && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              inset: 0,
              zIndex: 2,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              pointerEvents: "none",
              borderRadius: 8,
              border: "2px dashed #d73289",
              background: "color-mix(in srgb, #d73289 14%, #fff)",
              color: "#94216D",
              fontWeight: 700,
              fontSize: "0.9rem",
              textAlign: "center",
              padding: 12,
            }}
          >
            <IconCloudUpload size={28} />
            Soltá para subir a esta carpeta
          </div>
        )}
        </div>
      </div>
    ) : null;

  if (typeof children === "function") {
    return (
      <>
        {children({
          exploreButton,
          driveLink,
          panelOpen,
          rootUrl,
          setPanelOpen,
        })}
        {listPanel}
      </>
    );
  }

  if (!rootUrl) return null;

  return (
    <div style={{ marginTop: "0.85rem" }}>
      <div className="fimba-label" style={{ marginBottom: 6 }}>
        Carpeta de documentación (Drive)
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {exploreButton}
        {driveLink}
      </div>
      {listPanel}
    </div>
  );
}
