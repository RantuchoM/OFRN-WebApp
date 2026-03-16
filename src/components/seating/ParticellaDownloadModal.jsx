import React, { useEffect, useMemo, useState } from "react";
import { mergeSequential } from "../../utils/docMerger";
import { IconDownload, IconLayers, IconLoader } from "../ui/Icons";

function bytesFromBase64(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function getDriveFileLabel(_url, fallbackIndex) {
  // Fallback genérico mientras no tengamos nombre real
  if (fallbackIndex === 0) return "Principal";
  return `Versión ${fallbackIndex + 1}`;
}

function getDriveKeyFromUrl(url) {
  if (!url || typeof url !== "string") return "";
  const clean = url.split("?")[0];
  const match = clean.match(/[-\w]{25,}/);
  const id = match ? match[0] : null;
  return id ? `file:${id}` : clean;
}

function getDriveKeyFromId(id) {
  if (!id) return "";
  return `file:${id}`;
}

const isStringInstrumentId = (id) =>
  ["01", "02", "03", "04"].includes(String(id || ""));

// Carpeta raíz en Drive donde se almacenan los sets unificados de particellas.
// Coincide con PARTICELLA_SETS_ROOT_ID en la Edge Function `manage-drive`.
const PARTICELLA_SETS_ROOT_ID = "1BK8yhY1dvAZRrDwEDXg3VR3QlnmdOH4u";

export default function ParticellaDownloadModal({
  isOpen,
  onClose,
  supabase,
  program,
  obras,
  assignments,
  containers,
  particellas,
  rawRoster,
}) {
  const [selectedByObra, setSelectedByObra] = useState(() => {
    const initial = {};
    obras.forEach((obra) => {
      initial[obra.obra_id] = { enabled: false, parts: {} };
    });
    return initial;
  });
  const [expandedByObra, setExpandedByObra] = useState(() => {
    const initial = {};
    obras.forEach((obra) => {
      initial[obra.obra_id] = false;
    });
    return initial;
  });
  const [linkIndexByPart, setLinkIndexByPart] = useState({});
  const [driveNamesByObra, setDriveNamesByObra] = useState({}); // { [obraId]: { [key]: name } }
  const [hasLoadedDriveNames, setHasLoadedDriveNames] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);

  const presentRoster = useMemo(
    () =>
      (rawRoster || []).filter(
        (m) =>
          m.estado_gira !== "ausente" &&
          (!m.rol_gira || (m.rol_gira || "").toLowerCase() === "musico"),
      ),
    [rawRoster],
  );

  const tree = useMemo(() => {
    // Agrupación por particella (no por instrumento)
    return obras.map((obra) => {
      const obraId = obra.obra_id;

      // Copias por id_particella para esta obra
      const copiesByPartId = {};
      const whoByPartId = {};

      // Cuerdas: contenedores (1 copia por músico presente)
      containers.forEach((c) => {
        const assignedPartId = assignments[`C-${c.id}-${obraId}`];
        if (!assignedPartId) return;
        const musiciansCount = (c.items || []).length;
        if (!musiciansCount) return;
        const copies = musiciansCount;
        copiesByPartId[assignedPartId] =
          (copiesByPartId[assignedPartId] || 0) + copies;

        const containerLabel =
          c.nombre ||
          c.label ||
          c.name ||
          c.titulo ||
          c.title ||
          `Contenedor ${c.id}`;
        if (!whoByPartId[assignedPartId]) whoByPartId[assignedPartId] = [];
        whoByPartId[assignedPartId].push(
          `${containerLabel} (${musiciansCount} músico${musiciansCount > 1 ? "s" : ""})`,
        );
      });

      // Vientos / percusión: 1 copia por músico presente
      presentRoster.forEach((m) => {
        if (isStringInstrumentId(m.id_instr)) return;
        const assignedPartId = assignments[`M-${m.id}-${obraId}`];
        if (!assignedPartId) return;
        copiesByPartId[assignedPartId] =
          (copiesByPartId[assignedPartId] || 0) + 1;

        const musicianName =
          m.apellido_nombre ||
          m.nombre_completo ||
          [m.nombre, m.apellido].filter(Boolean).join(" ") ||
          m.display_name ||
          m.name ||
          `Músico ${m.id}`;
        const instrumentLabel = m.instrumento || m.instrument || m.id_instr;
        const label = instrumentLabel
          ? `${musicianName} (${instrumentLabel})`
          : musicianName;
        if (!whoByPartId[assignedPartId]) whoByPartId[assignedPartId] = [];
        whoByPartId[assignedPartId].push(label);
      });

      const obraParts = particellas.filter((p) => p.id_obra === obraId);

      const rows = obraParts
        .map((p) => {
          const copies = copiesByPartId[p.id] || 0;
          // Parseo de links múltiple (url_archivo puede ser string o JSON de array)
          let links = [];
          if (p.url_archivo) {
            try {
              const trimmed = String(p.url_archivo).trim();
              if (trimmed.startsWith("[")) {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                  // Para múltiples versiones solo guardamos la URL;
                  // el nombre real vendrá de la carpeta de la obra en Drive.
                  links = parsed.map((l) => ({
                    url: l.url,
                  }));
                }
              } else {
                const url = p.url_archivo;
                links = [{ url }];
              }
            } catch (e) {
              const url = p.url_archivo;
              links = [{ url }];
            }
          }

          const hasMultipleLinks = links.length > 1;
          const partKey = `P-${p.id}`;

          return {
            partId: p.id,
            partKey,
            obra,
            copies,
            links,
            hasMultipleLinks,
            who: whoByPartId[p.id] || [],
            displayName:
              p.nombre_archivo ||
              p.instrumentos?.instrumento ||
              `Particella ${p.id}`,
          };
        })
        .filter((row) => row.copies > 0);

      return {
        obra,
        obraId,
        rows,
      };
    });
  }, [assignments, containers, obras, particellas, presentRoster]);

  if (!isOpen) return null;

  const handleToggleWork = (obraId, rows) => {
    setSelectedByObra((prev) => {
      const next = { ...prev };
      const current = next[obraId] || { enabled: false, parts: {} };
      const allSelected =
        rows && rows.length
          ? rows.every((row) => !!current.parts[row.partKey])
          : false;

      const newEnabled = !allSelected && (rows || []).length > 0;
      const newParts = {};
      if (newEnabled) {
        (rows || []).forEach((row) => {
          newParts[row.partKey] = true;
        });
      }

      next[obraId] = {
        enabled: newEnabled,
        parts: newParts,
      };
      return next;
    });
  };

  const handleTogglePart = (obraId, partKey, rows) => {
    setSelectedByObra((prev) => {
      const current = prev[obraId] || { enabled: false, parts: {} };
      const isCurrentlySelected = !!current.parts[partKey];
      const newParts = { ...current.parts };
      if (isCurrentlySelected) {
        delete newParts[partKey];
      } else {
        newParts[partKey] = true;
      }

      const anySelected =
        rows && rows.length
          ? rows.some((row) => !!newParts[row.partKey])
          : Object.values(newParts).some(Boolean);

      return {
        ...prev,
        [obraId]: {
          enabled: anySelected,
          parts: newParts,
        },
      };
    });
  };

  const handleToggleExpand = (obraId) => {
    setExpandedByObra((prev) => ({
      ...prev,
      [obraId]: !prev[obraId],
    }));
  };

  const handleChangeLinkIndex = (partId, linkIdx) => {
    setLinkIndexByPart((prev) => ({
      ...prev,
      [partId]: linkIdx,
    }));
  };

  const computeSelection = () => {
    const selection = [];
    tree.forEach(({ obraId, obra, rows }) => {
      const conf = selectedByObra[obraId] || { enabled: false, parts: {} };
      if (!conf.enabled) return;
      const selectedRows = rows.filter((row) => {
        const flag = conf.parts[row.partKey];
        return !!flag;
      });
      if (!selectedRows.length) return;
      selection.push({ obraId, obra, rows: selectedRows });
    });
    return selection;
  };

  // Carga perezosa de nombres de Drive al abrir el modal (una sola vez) usando list_folder_files_subfolders
  useEffect(() => {
    if (!isOpen || hasLoadedDriveNames) return;

    // Marcamos inmediatamente como cargado para evitar dobles ejecuciones en modo estricto
    setHasLoadedDriveNames(true);

    const obrasToLoad = (obras || []).filter((o) => o.link);
    if (!obrasToLoad.length) return;

    const loadAll = async () => {
      for (const obra of obrasToLoad) {
        const obraId = obra.obra_id;
        try {
          const { data, error } = await supabase.functions.invoke(
            "manage-drive",
            {
              body: {
                action: "list_folder_files_subfolders",
                folderUrl: obra.link,
              },
            },
          );

          // eslint-disable-next-line no-console
          console.log(
            "[ParticellaDownloadModal] list_folder_files_subfolders respuesta",
            obraId,
            { data, error },
          );

          if (!error && Array.isArray(data?.files)) {
            const updates = {};
            data.files.forEach((file) => {
              const idKey = getDriveKeyFromId(file.id);
              const urlKey = file.webViewLink
                ? getDriveKeyFromUrl(file.webViewLink)
                : null;
              if (idKey) updates[idKey] = file.name;
              if (urlKey) updates[urlKey] = file.name;
            });

            setDriveNamesByObra((prev) => ({
              ...prev,
              [obraId]: {
                ...(prev[obraId] || {}),
                ...updates,
              },
            }));
          }
        } catch (e) {
          console.error(
            "[ParticellaDownloadModal] Error en list_folder_files_subfolders",
            obraId,
            e,
          );
        }
      }
    };

    loadAll();
  }, [isOpen, obras, supabase, hasLoadedDriveNames]);

  const ensureGoogleAccessToken = async () => {
    if (googleAccessToken) return googleAccessToken;
    try {
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "get_temp_token" },
      });
      if (error || !data?.accessToken) {
        throw new Error(error?.message || "No se pudo obtener token de Drive");
      }
      setGoogleAccessToken(data.accessToken);
      return data.accessToken;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[DownloadFlow] Error obteniendo token de Drive", e);
      throw e;
    }
  };

  const extractFileIdFromUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  const handleCopySinglePart = async (obraSel, row) => {
    if (!row?.links?.length) return;
    const chosenLinkIdx =
      linkIndexByPart[row.partId] != null ? linkIndexByPart[row.partId] : 0;
    const chosenLink = row.links[chosenLinkIdx] || row.links[0];
    if (!chosenLink?.url || !chosenLink.url.includes("drive.google.com")) {
      setError("Solo se pueden copiar particellas que estén en Google Drive.");
      return;
    }

    try {
      setIsRunning(true);
      setProgress((prev) => ({
        ...prev,
        label: `Copiando ${row.displayName}...`,
      }));

      const fileId = extractFileIdFromUrl(chosenLink.url);
      if (!fileId) {
        throw new Error("No se pudo extraer el ID de Drive.");
      }

      const safeComposer = (obraSel.obra.composer || "Comp").replace(
        /[^a-zA-Z0-9-_]+/g,
        "_",
      );
      const obraTitleClean =
        typeof obraSel.obra.title === "string"
          ? obraSel.obra.title.replace(/<[^>]*>?/gm, "")
          : obraSel.obra.title;
      const safeTitle = (obraTitleClean || "Obra").replace(
        /[^a-zA-Z0-9-_]+/g,
        "_",
      );
      const baseName = `${row.displayName || "Particella"}_${safeComposer}_${safeTitle}`.replace(
        /[^a-zA-Z0-9-_]+/g,
        "_",
      );

      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: {
          action: "copy_file",
          fileId,
          destinationFolderId: PARTICELLA_SETS_ROOT_ID,
          newName: `${baseName}.pdf`,
        },
      });

      if (error || !data?.success) {
        throw new Error(
          error?.message || data?.error || "Error al copiar particella.",
        );
      }

      setResults((prev) => [
        ...prev,
        {
          obraId: obraSel.obraId,
          title:
            typeof obraSel.obra.title === "string"
              ? obraSel.obra.title.replace(/<[^>]*>?/gm, "")
              : obraSel.obra.title,
          link: data.file?.webViewLink || null,
          copiedSingle: true,
        },
      ]);
      setError(null);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[ParticellaDownloadModal] Error al copiar particella:", e);
      setError(e.message || "Error al copiar particella.");
    } finally {
      setIsRunning(false);
      setProgress((prev) => ({ ...prev, label: "" }));
    }
  };

  const handleGenerateAndUpload = async () => {
    const selection = computeSelection();
    if (!selection.length) {
      setError("Seleccioná al menos una obra/instrumento.");
      return;
    }
    setError(null);
    setIsRunning(true);
    setResults([]);

    const totalParts = selection.reduce(
      (acc, obraSel) => acc + obraSel.rows.length,
      0,
    );
    const totalSteps = totalParts * 2 + selection.length;
    let currentStep = 0;
    setProgress({ current: 0, total: totalSteps, label: "Preparando..." });

    const globalResults = [];

    try {
      for (const obraSel of selection) {
        const buffersForObra = [];
        const obraTitleClean =
          typeof obraSel.obra.title === "string"
            ? obraSel.obra.title.replace(/<[^>]*>?/gm, "")
            : obraSel.obra.title;

        for (const row of obraSel.rows) {
          if (!row.links.length) {
            currentStep += 1;
            setProgress({
              current: currentStep,
              total: totalSteps,
              label: `Saltando ${row.displayName} (sin links)`,
            });
            continue;
          }

          const chosenLinkIdx =
            linkIndexByPart[row.partId] != null ? linkIndexByPart[row.partId] : 0;
          const chosenLink = row.links[chosenLinkIdx] || row.links[0];

          if (!chosenLink || !chosenLink.url) {
            // eslint-disable-next-line no-console
            console.warn(
              "[DownloadFlow] Fila sin URL, saltando:",
              row.displayName,
            );
            globalResults.push({
              obraId: obraSel.obraId,
              title: obraTitleClean,
              partId: row.partId,
              error: "Sin URL de particella configurada",
            });
            currentStep += 1;
            setProgress({
              current: currentStep,
              total: totalSteps,
              label: `Saltando ${row.displayName} (sin URL)`,
            });
            continue;
          }

          // eslint-disable-next-line no-console
          console.log(
            "[DownloadFlow] Iniciando descarga de:",
            row.displayName,
          );

          let buffer;
          try {
            if (chosenLink.url.includes("drive.google.com")) {
              const fileId = extractFileIdFromUrl(chosenLink.url);
              if (!fileId) {
                throw new Error("No se pudo extraer ID de Drive");
              }
              const token = await ensureGoogleAccessToken();
              const res = await fetch(
                `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                },
              );
              if (!res.ok) throw new Error("Error descargando desde Drive");
              const arr = await res.arrayBuffer();
              buffer = new Uint8Array(arr);
            } else {
              const res = await fetch(chosenLink.url);
              if (!res.ok) throw new Error("Error descargando archivo");
              const arr = await res.arrayBuffer();
              buffer = new Uint8Array(arr);
            }
          } catch (e) {
            // eslint-disable-next-line no-console
            console.error(
              "[DownloadFlow] Error descargando particella",
              {
                partId: row.partId,
                displayName: row.displayName,
                url: chosenLink?.url,
              },
              e,
            );
            currentStep += 1;
            setProgress({
              current: currentStep,
              total: totalSteps,
              label: `Error en ${row.displayName}`,
            });
            continue;
          }

          const copies = row.copies || 1;

          for (let i = 0; i < copies; i += 1) {
            buffersForObra.push({ buffer });
          }

          currentStep += 1;
          setProgress({
            current: currentStep,
            total: totalSteps,
            label: `Descargado ${row.displayName}`,
          });
        }

        if (!buffersForObra.length) {
          continue;
        }

        let mergedBytes;
        try {
          mergedBytes = await mergeSequential(buffersForObra);
        } catch (e) {
          console.error("Error unificando PDFs", e);
          currentStep += 1;
          setProgress({
            current: currentStep,
            total: totalSteps,
            label: "Error al unir PDFs",
          });
          continue;
        }

        currentStep += 1;
        setProgress({
          current: currentStep,
          total: totalSteps,
          label: "Subiendo a Drive...",
        });

        const token = await ensureGoogleAccessToken();
        const bytes = new Uint8Array(mergedBytes);
        const blob = new Blob([bytes], { type: "application/pdf" });

        const safeComposer = (obraSel.obra.composer || "Comp").replace(
          /[^a-zA-Z0-9-_]+/g,
          "_",
        );
        const safeTitle = (obraTitleClean || "Obra").replace(
          /[^a-zA-Z0-9-_]+/g,
          "_",
        );
        const fileName = `SetParticellas_${program?.nomenclador || program?.id || "Prog"}_${safeComposer}_${safeTitle}.pdf`;

        const metadata = {
          name: fileName,
          parents: [PARTICELLA_SETS_ROOT_ID],
        };

        const form = new FormData();
        form.append(
          "metadata",
          new Blob([JSON.stringify(metadata)], { type: "application/json" }),
        );
        form.append("file", blob);

        try {
          const uploadRes = await fetch(
            "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: form,
            },
          );

          if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            throw new Error(
              `Error al subir set de particellas: ${uploadRes.status} ${errText}`,
            );
          }

          const upData = await uploadRes.json();
          globalResults.push({
            obraId: obraSel.obraId,
            title: obraTitleClean,
            link: upData.webViewLink || null,
          });
        } catch (e) {
          console.error("Error subiendo set a Drive", e);
          globalResults.push({
            obraId: obraSel.obraId,
            title: obraTitleClean,
            error: e.message || "Error al subir a Drive",
          });
        }
      }

      setResults(globalResults);
      setProgress({
        current: totalSteps,
        total: totalSteps,
        label: "Completado",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const pct =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/60">
      <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <IconLayers className="text-indigo-600" />
            <div className="flex flex-col">
              <span className="text-sm font-bold text-slate-800">
                Gestor de Descargas de Particellas
              </span>
              <span className="text-[11px] text-slate-500">
                Seleccioná qué obras y particellas incluir y generá un set
                unificado por obra en Drive.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-500 hover:text-slate-800"
            disabled={isRunning}
          >
            Cerrar
          </button>
        </div>

        <div className="flex-1 overflow-auto px-4 py-3 space-y-3">
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1">
              {error}
            </div>
          )}

          <div className="space-y-2">
            {tree.map(({ obra, obraId, rows }) => (
              <div
                key={obraId}
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <div className="flex items-center justify-between bg-slate-100 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="text-xs text-slate-500 hover:text-slate-700 transition-transform"
                      onClick={() => handleToggleExpand(obraId)}
                    >
                      <span
                        className={`inline-block transform transition-transform ${
                          expandedByObra[obraId] ? "rotate-90" : ""
                        }`}
                      >
                        ▶
                      </span>
                    </button>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600"
                        checked={
                          !!selectedByObra[obraId]?.enabled && rows.length > 0
                        }
                        disabled={rows.length === 0}
                        onChange={() => handleToggleWork(obraId, rows)}
                      />
                      <span>
                        {obra.composer} —{" "}
                        <span
                          className="font-bold"
                          dangerouslySetInnerHTML={{ __html: obra.title }}
                        />
                      </span>
                    </label>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {rows.length} particellas
                  </span>
                </div>
                {rows.length > 0 && expandedByObra[obraId] && (
                  <div className="divide-y divide-slate-100 bg-white">
                    {rows.map((row) => {
                      return (
                        <div
                          key={row.partKey}
                          className="flex items-center justify-between px-3 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-indigo-600 mt-0.5"
                              checked={
                                !!selectedByObra[obraId]?.parts[row.partKey]
                              }
                              onChange={() =>
                                handleTogglePart(obraId, row.partKey, rows)
                              }
                            />
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">
                                {row.displayName}
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {row.copies} copias sugeridas
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-center gap-2 flex-1 text-center">
                            {row.who && row.who.length > 0 && (
                              <span className="text-[11px] text-emerald-600 truncate">
                                {row.who.join(", ")}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {row.hasMultipleLinks ? (
                              <select
                                className="text-[11px] border border-slate-300 rounded px-1.5 py-0.5 bg-white"
                                value={
                                  linkIndexByPart[row.partId] != null
                                    ? linkIndexByPart[row.partId]
                                    : 0
                                }
                                onChange={(e) =>
                                  handleChangeLinkIndex(
                                    row.partId,
                                    Number(e.target.value),
                                  )
                                }
                              >
                                {row.links.map((link, idx) => {
                                  const key = getDriveKeyFromUrl(link.url);
                                  const remoteName =
                                    driveNamesByObra[row.obra.obra_id]?.[key];
                                  const label =
                                    remoteName ||
                                    getDriveFileLabel(link.url, idx);
                                  return (
                                    <option key={idx} value={idx}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                            ) : (
                              <span className="text-[11px] text-slate-600">
                                {row.links[0]?.url
                                  ? driveNamesByObra[row.obra.obra_id]?.[
                                      getDriveKeyFromUrl(row.links[0].url)
                                    ] || getDriveFileLabel(row.links[0].url, 0)
                                  : "Particella"}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="text-[11px] px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                              disabled={isRunning || !row.links[0]?.url}
                              onClick={() =>
                                handleCopySinglePart(
                                  { obraId, obra },
                                  row,
                                )
                              }
                            >
                              Copiar archivo
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>

          {progress.total > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="text-slate-600">
                  {progress.label || "Progreso"}
                </span>
                <span className="text-slate-500">{pct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="mt-3 border border-slate-200 rounded-lg p-2 bg-slate-50">
              <div className="text-[11px] font-semibold text-slate-700 mb-1">
                Resultados
              </div>
              <ul className="space-y-0.5 text-[11px] text-slate-700">
                {results.map((r) => (
                  <li key={r.obraId}>
                    {r.title}:{" "}
                    {r.error ? (
                      <span className="text-red-600">{r.error}</span>
                    ) : r.link ? (
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 underline"
                      >
                        Ver en Drive
                      </a>
                    ) : (
                      <span className="text-slate-500">OK</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            Las copias se calculan automáticamente a partir del Seating
            (cuerdas por atril, vientos por músico presente).
          </div>
          <button
            type="button"
            onClick={handleGenerateAndUpload}
            disabled={isRunning}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-wait shadow-sm"
          >
            {isRunning ? (
              <>
                <IconLoader className="animate-spin" size={14} />
                Generando sets...
              </>
            ) : (
              <>
                <IconDownload size={14} />
                Generar y subir a Drive
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

