import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { saveAs } from "file-saver";
import { mergeSequential } from "../../utils/docMerger";
import {
  IconChevronRight,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconFolder,
  IconLayers,
  IconLoader,
  IconPlus,
  IconPrinter,
  IconUsers,
  IconX,
} from "../ui/Icons";
import {
  PARTICELLA_SETS_ROOT_ID,
  PARTICELLA_SETS_ROOT_URL,
} from "../../utils/driveFolders";
import { isConfirmedConvocadoForSeatingReports } from "../../utils/seatingRosterGate";
import ParticellaByMusicianExport from "./ParticellaByMusicianExport";

function getDriveFileLabel(_url, fallbackIndex) {
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

function stripHtml(html) {
  if (typeof html !== "string") return html || "";
  return html.replace(/<[^>]*>?/gm, "");
}

function getMusicianPartIds(musicianAssignments, key) {
  const ids = musicianAssignments?.[key];
  if (!Array.isArray(ids)) return [];
  return ids.filter(
    (id, index) =>
      id &&
      ids.findIndex((candidate) => String(candidate) === String(id)) === index,
  );
}

function musicianDisplayName(m) {
  return (
    m.apellido_nombre ||
    m.nombre_completo ||
    [m.apellido, m.nombre].filter(Boolean).join(", ") ||
    [m.nombre, m.apellido].filter(Boolean).join(" ") ||
    m.display_name ||
    m.name ||
    `Músico ${m.id}`
  );
}

function copyOverrideKey(obraId, partKey) {
  return `${obraId}:${partKey}`;
}

/** Score / director / partitura general: no se tilda al seleccionar obra o «todo». */
function isScorePartRow(row) {
  const id = String(row?.idInstrumento || "");
  if (id === "50") return true;
  const blob = `${row?.displayName || ""} ${row?.instrumentoNombre || ""}`;
  return /\b(director|conductor|score|partitura)\b/i.test(blob);
}

function defaultSelectableRows(rows) {
  return (rows || []).filter((row) => !isScorePartRow(row));
}

export default function ParticellaDownloadModal({
  isOpen,
  onClose,
  supabase,
  program,
  obras,
  assignments,
  musicianAssignments = {},
  containers,
  particellas,
  filteredRoster,
  /** @deprecated usar filteredRoster; se mantiene por compat. */
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
  const [driveNamesByObra, setDriveNamesByObra] = useState({});
  const [hasLoadedDriveNames, setHasLoadedDriveNames] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  /** 'drive' | 'local' | 'copy' | null */
  const [runningMode, setRunningMode] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [dobleFaz, setDobleFaz] = useState(true);
  /** Cuerdas: ceil(n/2) por atril (default) vs 1 copia por músico. */
  const [copiasPorAtril, setCopiasPorAtril] = useState(true);
  /** Incluir particellas sin asignación de seating (1 copia). Off por defecto. */
  const [includeUnassigned, setIncludeUnassigned] = useState(false);
  /** Override de copias por fila: tope = sugerido; se puede bajar (tablets). */
  const [copyOverrides, setCopyOverrides] = useState({});
  /** 'obra' | 'musico' */
  const [exportMode, setExportMode] = useState("obra");
  const [musicianBusy, setMusicianBusy] = useState(false);

  const presentRoster = useMemo(() => {
    const source = filteredRoster != null ? filteredRoster : rawRoster || [];
    if (filteredRoster != null) return source;
    return (source || []).filter((m) => {
      if (isConfirmedConvocadoForSeatingReports(m)) return true;
      const role = (m.rol_gira || "").toLowerCase();
      return (
        m.estado_gira !== "ausente" &&
        (!role || ["musico", "director", "solista"].includes(role))
      );
    });
  }, [filteredRoster, rawRoster]);

  const individualMusicians = useMemo(() => {
    return presentRoster.filter((m) => {
      const idInstr = String(m.id_instr || "");
      const role = (m.rol_gira || "").toLowerCase();
      const esCuerda = isStringInstrumentId(idInstr);
      const esSolista = role.includes("solista");
      // Misma regla que ProgramSeating.otherMusicians
      if (esCuerda && esSolista) return true;
      return !esCuerda;
    });
  }, [presentRoster]);

  const tree = useMemo(() => {
    return obras.map((obra) => {
      const obraId = obra.obra_id;

      const copiesByPartId = {};
      const whoByPartId = {};

      const bump = (partId, copies, whoLabel) => {
        const key = String(partId);
        copiesByPartId[key] = (copiesByPartId[key] || 0) + copies;
        if (!whoByPartId[key]) whoByPartId[key] = [];
        if (whoLabel) whoByPartId[key].push(whoLabel);
      };

      // Cuerdas: contenedores
      containers.forEach((c) => {
        const assignedPartId = assignments[`C-${c.id}-${obraId}`];
        if (!assignedPartId) return;
        const musiciansCount = (c.items || []).length;
        if (!musiciansCount) return;
        const copies = copiasPorAtril
          ? Math.ceil(musiciansCount / 2)
          : musiciansCount;

        const containerLabel =
          c.nombre ||
          c.label ||
          c.name ||
          c.titulo ||
          c.title ||
          `Contenedor ${c.id}`;
        const whoDetail = copiasPorAtril
          ? `${containerLabel} (${musiciansCount} mús. → ${copies} atril${copies !== 1 ? "es" : ""})`
          : `${containerLabel} (${musiciansCount} músico${musiciansCount > 1 ? "s" : ""})`;
        bump(assignedPartId, copies, whoDetail);
      });

      // Vientos / percusión / director / solistas: musicianAssignments (arrays)
      individualMusicians.forEach((m) => {
        const key = `M-${m.id}-${obraId}`;
        const partIds = getMusicianPartIds(musicianAssignments, key);
        if (!partIds.length) return;

        const name = musicianDisplayName(m);
        const instrumentLabel = m.instrumento || m.instrument || m.id_instr;
        const role = (m.rol_gira || "").toLowerCase();
        const roleSuffix =
          role && role !== "musico" ? ` · ${role}` : "";
        const label = instrumentLabel
          ? `${name} (${instrumentLabel}${roleSuffix})`
          : `${name}${roleSuffix}`;

        partIds.forEach((partId) => {
          bump(partId, 1, label);
        });
      });

      const obraParts = particellas.filter(
        (p) => String(p.id_obra) === String(obraId),
      );

      const rows = obraParts
        .map((p) => {
          const seatedCopies = copiesByPartId[String(p.id)] || 0;
          const sinSeating = seatedCopies === 0;
          if (sinSeating && !includeUnassigned) return null;

          const maxCopies = sinSeating ? 1 : seatedCopies;
          let links = [];
          if (p.url_archivo) {
            try {
              const trimmed = String(p.url_archivo).trim();
              if (trimmed.startsWith("[")) {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) {
                  links = parsed.map((l) => ({
                    url: l.url,
                  }));
                }
              } else {
                links = [{ url: p.url_archivo }];
              }
            } catch (e) {
              links = [{ url: p.url_archivo }];
            }
          }

          const hasMultipleLinks = links.length > 1;
          const partKey = `P-${p.id}`;
          const displayName =
            p.nombre_archivo ||
            p.instrumentos?.instrumento ||
            `Particella ${p.id}`;
          const idInstrumento = p.id_instrumento ?? p.instrumentos?.id ?? "";
          const instrumentoNombre = p.instrumentos?.instrumento || "";

          return {
            partId: p.id,
            partKey,
            obra,
            maxCopies,
            sinSeating,
            links,
            hasMultipleLinks,
            who: sinSeating
              ? []
              : whoByPartId[String(p.id)] || [],
            idInstrumento,
            instrumentoNombre,
            displayName,
            isScore: false,
          };
        })
        .filter(Boolean)
        .map((row) => ({ ...row, isScore: isScorePartRow(row) }))
        .sort((a, b) => {
          // Asignadas primero; sin seating al final (mismo instrumento)
          if (!!a.sinSeating !== !!b.sinSeating) {
            return a.sinSeating ? 1 : -1;
          }
          const ia = String(a.idInstrumento || "");
          const ib = String(b.idInstrumento || "");
          if (ia !== ib) return ia.localeCompare(ib, undefined, { numeric: true });
          return String(a.displayName || "").localeCompare(
            String(b.displayName || ""),
            "es",
            { sensitivity: "base" },
          );
        });

      return {
        obra,
        obraId,
        rows,
      };
    });
  }, [
    assignments,
    musicianAssignments,
    containers,
    obras,
    particellas,
    individualMusicians,
    copiasPorAtril,
    includeUnassigned,
  ]);

  // Al apagar «sin seating», quitar de la selección partKeys que ya no están en el árbol
  useEffect(() => {
    if (includeUnassigned) return;
    setSelectedByObra((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const { obraId, rows } of tree) {
        const conf = next[obraId];
        if (!conf?.parts) continue;
        const keep = { ...conf.parts };
        let removed = false;
        const valid = new Set(rows.map((r) => r.partKey));
        Object.keys(keep).forEach((pk) => {
          if (!valid.has(pk)) {
            delete keep[pk];
            removed = true;
          }
        });
        if (removed) {
          changed = true;
          next[obraId] = {
            enabled: Object.keys(keep).length > 0,
            parts: keep,
          };
        }
      }
      return changed ? next : prev;
    });
  }, [includeUnassigned, tree]);

  const getEffectiveCopies = (obraId, row) => {
    const max = row.maxCopies || 0;
    const override = copyOverrides[copyOverrideKey(obraId, row.partKey)];
    if (override == null) return max;
    return Math.max(0, Math.min(max, Number(override) || 0));
  };

  const setCopiesForRow = (obraId, row, nextValue) => {
    const max = row.maxCopies || 0;
    const clamped = Math.max(0, Math.min(max, Number(nextValue) || 0));
    const key = copyOverrideKey(obraId, row.partKey);
    setCopyOverrides((prev) => {
      if (clamped === max) {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: clamped };
    });
  };

  const selectionStats = useMemo(() => {
    let obrasCount = 0;
    let partsCount = 0;
    let copiesCount = 0;
    tree.forEach(({ obraId, rows }) => {
      const conf = selectedByObra[obraId] || { enabled: false, parts: {} };
      if (!conf.enabled) return;
      const selected = rows.filter((row) => !!conf.parts[row.partKey]);
      if (!selected.length) return;
      const withCopies = selected.filter(
        (row) => getEffectiveCopies(obraId, row) > 0,
      );
      if (!withCopies.length) return;
      obrasCount += 1;
      partsCount += withCopies.length;
      copiesCount += withCopies.reduce(
        (acc, row) => acc + getEffectiveCopies(obraId, row),
        0,
      );
    });
    return { obrasCount, partsCount, copiesCount };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- getEffectiveCopies usa copyOverrides
  }, [tree, selectedByObra, copyOverrides]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape" && !isRunning && !musicianBusy) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, isRunning, musicianBusy, onClose]);

  useEffect(() => {
    if (!isOpen || hasLoadedDriveNames) return;

    setHasLoadedDriveNames(true);

    const obrasToLoad = (obras || []).filter((o) => o.link);
    if (!obrasToLoad.length) return;

    const loadAll = async () => {
      for (const obra of obrasToLoad) {
        const obraId = obra.obra_id;
        try {
          const { data, error: listError } = await supabase.functions.invoke(
            "manage-drive",
            {
              body: {
                action: "list_folder_files_subfolders",
                folderUrl: obra.link,
              },
            },
          );

          if (!listError && Array.isArray(data?.files)) {
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

  if (!isOpen) return null;

  const handleToggleWork = (obraId, rows) => {
    setSelectedByObra((prev) => {
      const next = { ...prev };
      const current = next[obraId] || { enabled: false, parts: {} };
      const defaultRows = defaultSelectableRows(rows);
      const allDefaultSelected =
        defaultRows.length > 0
          ? defaultRows.every((row) => !!current.parts[row.partKey])
          : false;

      // Si ya están todas las no-Score, deseleccionar todo (incl. Scores).
      // Si no, seleccionar solo las no-Score (Scores quedan destildados).
      const newParts = {};
      if (!allDefaultSelected && defaultRows.length > 0) {
        defaultRows.forEach((row) => {
          newParts[row.partKey] = true;
        });
      }

      next[obraId] = {
        enabled: Object.keys(newParts).length > 0,
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

  const handleSelectAll = () => {
    setSelectedByObra(() => {
      const next = {};
      tree.forEach(({ obraId, rows }) => {
        const parts = {};
        defaultSelectableRows(rows).forEach((row) => {
          parts[row.partKey] = true;
        });
        next[obraId] = {
          enabled: Object.keys(parts).length > 0,
          parts,
        };
      });
      return next;
    });
  };

  const handleClearAll = () => {
    setSelectedByObra(() => {
      const next = {};
      tree.forEach(({ obraId }) => {
        next[obraId] = { enabled: false, parts: {} };
      });
      return next;
    });
  };

  const computeSelection = () => {
    const selection = [];
    tree.forEach(({ obraId, obra, rows }) => {
      const conf = selectedByObra[obraId] || { enabled: false, parts: {} };
      if (!conf.enabled) return;
      const selectedRows = rows
        .filter((row) => !!conf.parts[row.partKey])
        .map((row) => ({
          ...row,
          copies: getEffectiveCopies(obraId, row),
        }))
        .filter((row) => row.copies > 0);
      if (!selectedRows.length) return;
      selection.push({ obraId, obra, rows: selectedRows });
    });
    return selection;
  };

  const ensureGoogleAccessToken = async () => {
    if (googleAccessToken) return googleAccessToken;
    try {
      const { data, error: tokenError } = await supabase.functions.invoke(
        "manage-drive",
        {
          body: { action: "get_temp_token" },
        },
      );
      if (tokenError || !data?.accessToken) {
        throw new Error(
          tokenError?.message || "No se pudo obtener token de Drive",
        );
      }
      setGoogleAccessToken(data.accessToken);
      return data.accessToken;
    } catch (e) {
      console.error("[DownloadFlow] Error obteniendo token de Drive", e);
      throw e;
    }
  };

  const extractFileIdFromUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  const buildSafeFileBase = (obraSel, row) => {
    const safeComposer = (obraSel.obra.composer || "Comp").replace(
      /[^a-zA-Z0-9-_]+/g,
      "_",
    );
    const obraTitleClean = stripHtml(obraSel.obra.title);
    const safeTitle = (obraTitleClean || "Obra").replace(
      /[^a-zA-Z0-9-_]+/g,
      "_",
    );
    const baseName =
      `${row.displayName || "Particella"}_${safeComposer}_${safeTitle}`.replace(
        /[^a-zA-Z0-9-_]+/g,
        "_",
      );
    return { baseName, obraTitleClean };
  };

  const fetchPartBuffer = async (chosenLink) => {
    if (!chosenLink?.url) throw new Error("Sin URL de particella");
    if (chosenLink.url.includes("drive.google.com")) {
      const fileId = extractFileIdFromUrl(chosenLink.url);
      if (!fileId) throw new Error("No se pudo extraer ID de Drive");
      const token = await ensureGoogleAccessToken();
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Error descargando desde Drive");
      return new Uint8Array(await res.arrayBuffer());
    }
    const res = await fetch(chosenLink.url);
    if (!res.ok) throw new Error("Error descargando archivo");
    return new Uint8Array(await res.arrayBuffer());
  };

  const getChosenLink = (row) => {
    if (!row?.links?.length) return null;
    const chosenLinkIdx =
      linkIndexByPart[row.partId] != null ? linkIndexByPart[row.partId] : 0;
    return row.links[chosenLinkIdx] || row.links[0];
  };

  /** Copia el PDF suelto a la carpeta de sets en Drive (no lo baja al PC). */
  const handleCopySinglePart = async (obraSel, row) => {
    const chosenLink = getChosenLink(row);
    if (!chosenLink?.url || !chosenLink.url.includes("drive.google.com")) {
      setError("Solo se pueden copiar particellas que estén en Google Drive.");
      return;
    }

    try {
      setIsRunning(true);
      setRunningMode("copy");
      setProgress((prev) => ({
        ...prev,
        label: `Copiando ${row.displayName} a Drive...`,
      }));

      const fileId = extractFileIdFromUrl(chosenLink.url);
      if (!fileId) throw new Error("No se pudo extraer el ID de Drive.");

      const { baseName, obraTitleClean } = buildSafeFileBase(obraSel, row);

      const { data, error: copyError } = await supabase.functions.invoke(
        "manage-drive",
        {
          body: {
            action: "copy_file",
            fileId,
            destinationFolderId: PARTICELLA_SETS_ROOT_ID,
            newName: `${baseName}.pdf`,
          },
        },
      );

      if (copyError || !data?.success) {
        throw new Error(
          copyError?.message || data?.error || "Error al copiar particella.",
        );
      }

      setResults((prev) => [
        ...prev,
        {
          obraId: obraSel.obraId,
          title: `${obraTitleClean} · ${row.displayName}`,
          link: data.file?.webViewLink || null,
          copiedSingle: true,
        },
      ]);
      setError(null);
    } catch (e) {
      console.error("[ParticellaDownloadModal] Error al copiar particella:", e);
      setError(e.message || "Error al copiar particella.");
    } finally {
      setIsRunning(false);
      setRunningMode(null);
      setProgress((prev) => ({ ...prev, label: "" }));
    }
  };

  /** Descarga el PDF suelto al navegador (1 archivo, sin unificar). */
  const handleDownloadSinglePart = async (obraSel, row) => {
    const chosenLink = getChosenLink(row);
    if (!chosenLink?.url) {
      setError("Esta particella no tiene archivo.");
      return;
    }

    try {
      setIsRunning(true);
      setRunningMode("local");
      setProgress((prev) => ({
        ...prev,
        label: `Descargando ${row.displayName}...`,
      }));

      const buffer = await fetchPartBuffer(chosenLink);
      const { baseName, obraTitleClean } = buildSafeFileBase(obraSel, row);
      saveAs(new Blob([buffer], { type: "application/pdf" }), `${baseName}.pdf`);

      setResults((prev) => [
        ...prev,
        {
          obraId: obraSel.obraId,
          title: `${obraTitleClean} · ${row.displayName}`,
          downloadedLocal: true,
        },
      ]);
      setError(null);
    } catch (e) {
      console.error(
        "[ParticellaDownloadModal] Error al descargar particella:",
        e,
      );
      setError(e.message || "Error al descargar particella.");
    } finally {
      setIsRunning(false);
      setRunningMode(null);
      setProgress((prev) => ({ ...prev, label: "" }));
    }
  };

  /**
   * Genera sets unificados.
   * @param {'drive' | 'local'} destination
   */
  const handleGenerateSets = async (destination) => {
    const selection = computeSelection();
    if (!selection.length) {
      setError("Seleccioná al menos una obra/instrumento.");
      return;
    }
    setError(null);
    setIsRunning(true);
    setRunningMode(destination);
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
        const obraTitleClean = stripHtml(obraSel.obra.title);

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

          const chosenLink = getChosenLink(row);

          if (!chosenLink || !chosenLink.url) {
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

          let buffer;
          try {
            buffer = await fetchPartBuffer(chosenLink);
          } catch (e) {
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
          mergedBytes = await mergeSequential(buffersForObra, {
            padOddPages: dobleFaz,
          });
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

        if (destination === "local") {
          currentStep += 1;
          setProgress({
            current: currentStep,
            total: totalSteps,
            label: `Descargando ${obraTitleClean}...`,
          });
          try {
            saveAs(blob, fileName);
            globalResults.push({
              obraId: obraSel.obraId,
              title: obraTitleClean,
              downloadedLocal: true,
            });
          } catch (e) {
            console.error("Error descargando set local", e);
            globalResults.push({
              obraId: obraSel.obraId,
              title: obraTitleClean,
              error: e.message || "Error al descargar",
            });
          }
          continue;
        }

        currentStep += 1;
        setProgress({
          current: currentStep,
          total: totalSteps,
          label: "Subiendo a Drive...",
        });

        try {
          const token = await ensureGoogleAccessToken();
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
      setRunningMode(null);
    }
  };

  const busy = isRunning || musicianBusy;

  const pct =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  const resolveLinkLabel = (obraId, link, idx) => {
    const key = getDriveKeyFromUrl(link.url);
    return driveNamesByObra[obraId]?.[key] || getDriveFileLabel(link.url, idx);
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-3 sm:p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="particella-download-title"
      onClick={() => {
        if (!busy) onClose();
      }}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
              <IconLayers size={18} />
            </div>
            <div className="min-w-0">
              <h2
                id="particella-download-title"
                className="text-base sm:text-lg font-bold text-slate-800"
              >
                Descargar particellas
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                {exportMode === "musico"
                  ? "Binder por músico: portada + todas sus obras del programa."
                  : "Sets por obra: unificá partes y subí a Drive o descargá."}
                {program?.nomenclador ||
                program?.nombre_gira ||
                program?.nombre ? (
                  <>
                    {" "}
                    <span className="font-semibold text-slate-600">
                      {program.nomenclador ||
                        program.nombre_gira ||
                        program.nombre}
                    </span>
                  </>
                ) : null}
              </p>
              <a
                href={PARTICELLA_SETS_ROOT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:underline"
              >
                <IconFolder size={12} />
                Abrir carpeta de sets en Drive
                <IconExternalLink size={11} />
              </a>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
            aria-label="Cerrar"
          >
            <IconX size={18} />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex shrink-0 gap-1 border-b border-slate-100 bg-white px-5 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => setExportMode("obra")}
            className={`rounded-t-lg px-3 py-2 text-xs font-bold transition-colors ${
              exportMode === "obra"
                ? "border border-b-white border-slate-200 bg-white text-indigo-700 -mb-px"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Por obra
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setExportMode("musico")}
            className={`rounded-t-lg px-3 py-2 text-xs font-bold transition-colors ${
              exportMode === "musico"
                ? "border border-b-white border-slate-200 bg-white text-indigo-700 -mb-px"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Toda la gira por músico
          </button>
        </div>

        {exportMode === "musico" ? (
          <ParticellaByMusicianExport
            supabase={supabase}
            program={program}
            obras={obras}
            assignments={assignments}
            musicianAssignments={musicianAssignments}
            containers={containers}
            particellas={particellas}
            filteredRoster={presentRoster}
            onBusyChange={setMusicianBusy}
          />
        ) : (
          <>
        {/* Toolbar */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white px-5 py-2.5">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAll}
              disabled={isRunning}
              className="text-[11px] font-bold text-indigo-600 hover:underline disabled:opacity-40"
            >
              Seleccionar todo
            </button>
            <button
              type="button"
              onClick={handleClearAll}
              disabled={isRunning}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 hover:underline disabled:opacity-40"
            >
              Limpiar
            </button>
            {selectionStats.partsCount > 0 && (
              <span className="hidden sm:inline text-[11px] text-slate-500">
                {selectionStats.obrasCount} obra
                {selectionStats.obrasCount !== 1 ? "s" : ""} ·{" "}
                {selectionStats.partsCount} particella
                {selectionStats.partsCount !== 1 ? "s" : ""} ·{" "}
                {selectionStats.copiesCount} copia
                {selectionStats.copiesCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                copiasPorAtril
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title={
                copiasPorAtril
                  ? "Cuerdas: 1 copia por atril (ceil de músicos / 2). Desactivá para 1 por músico."
                  : "Cuerdas: 1 copia por músico. Activá para 1 por atril."
              }
            >
              <input
                type="checkbox"
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                checked={copiasPorAtril}
                disabled={isRunning}
                onChange={(e) => setCopiasPorAtril(e.target.checked)}
              />
              <IconUsers size={14} className="shrink-0" />
              <span className="font-semibold">1 por atril</span>
              <span className="hidden sm:inline text-[10px] font-normal text-slate-500">
                cuerdas · ceil(n/2)
              </span>
            </label>

            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                includeUnassigned
                  ? "border-violet-200 bg-violet-50 text-violet-900"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Incluye particellas de la obra sin nadie asignado en seating (p. ej. arpa), con 1 copia."
            >
              <input
                type="checkbox"
                className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                checked={includeUnassigned}
                disabled={isRunning}
                onChange={(e) => setIncludeUnassigned(e.target.checked)}
              />
              <span className="font-semibold">Sin seating</span>
              <span className="hidden sm:inline text-[10px] font-normal text-slate-500">
                1 copia · off por defecto
              </span>
            </label>

            <label
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                dobleFaz
                  ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
              title="Si una particella tiene páginas impares, agrega una hoja en blanco para impresión a doble faz."
            >
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                checked={dobleFaz}
                disabled={isRunning}
                onChange={(e) => setDobleFaz(e.target.checked)}
              />
              <IconPrinter size={14} className="shrink-0" />
              <span className="font-semibold">Doble faz</span>
              <span className="hidden sm:inline text-[10px] font-normal text-slate-500">
                hoja en blanco si páginas impares
              </span>
            </label>
          </div>
        </div>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          {tree.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              No hay obras en este programa.
            </div>
          ) : (
            <div className="space-y-2">
              {tree.map(({ obra, obraId, rows }) => {
                const conf = selectedByObra[obraId] || {
                  enabled: false,
                  parts: {},
                };
                const defaultRows = defaultSelectableRows(rows);
                const selectedCount = rows.filter(
                  (row) => !!conf.parts[row.partKey],
                ).length;
                const defaultSelectedCount = defaultRows.filter(
                  (row) => !!conf.parts[row.partKey],
                ).length;
                const allSelected =
                  defaultRows.length > 0 &&
                  defaultSelectedCount === defaultRows.length;
                const someSelected =
                  selectedCount > 0 && !allSelected;
                const expanded = !!expandedByObra[obraId];
                const totalCopies = rows.reduce(
                  (acc, row) => acc + getEffectiveCopies(obraId, row),
                  0,
                );

                return (
                  <div
                    key={obraId}
                    className={`overflow-hidden rounded-lg border transition-colors ${
                      selectedCount > 0
                        ? "border-indigo-200 bg-indigo-50/30"
                        : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 bg-slate-50/80 px-3 py-2.5">
                      <button
                        type="button"
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-40"
                        onClick={() => handleToggleExpand(obraId)}
                        disabled={rows.length === 0}
                        aria-expanded={expanded}
                        aria-label={expanded ? "Colapsar" : "Expandir"}
                      >
                        <IconChevronRight
                          size={14}
                          className={`transition-transform ${expanded ? "rotate-90" : ""}`}
                        />
                      </button>
                      <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={allSelected}
                          ref={(el) => {
                            if (el) el.indeterminate = someSelected;
                          }}
                          disabled={rows.length === 0}
                          onChange={() => handleToggleWork(obraId, rows)}
                        />
                        <span className="min-w-0 truncate text-xs font-semibold text-slate-800">
                          <span className="text-slate-500 font-medium">
                            {obra.composer}
                          </span>
                          <span className="mx-1 text-slate-300">—</span>
                          <span
                            className="font-bold"
                            dangerouslySetInnerHTML={{ __html: obra.title }}
                          />
                        </span>
                      </label>
                      <div className="flex shrink-0 items-center gap-2">
                        {selectedCount > 0 && (
                          <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                            {selectedCount}/{rows.length}
                          </span>
                        )}
                        <span className="text-[11px] text-slate-500">
                          {rows.length === 0
                            ? "Sin asignaciones"
                            : `${rows.length} part. · ${totalCopies} cop.`}
                        </span>
                      </div>
                    </div>

                    {rows.length > 0 && expanded && (
                      <div className="divide-y divide-slate-100 border-t border-slate-100 bg-white">
                        {/* Column headers — desktop */}
                        <div className="hidden sm:grid grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)_5.5rem_minmax(0,0.9fr)_auto] gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400 bg-slate-50/50">
                          <span>Particella</span>
                          <span>Asignado a</span>
                          <span className="text-center">Copias</span>
                          <span>Archivo</span>
                          <span className="w-[8.5rem] text-right">Acciones</span>
                        </div>
                        {rows.map((row) => {
                          const isSelected = !!conf.parts[row.partKey];
                          const effective = getEffectiveCopies(obraId, row);
                          const reduced = effective < row.maxCopies;
                          return (
                            <div
                              key={row.partKey}
                              className={`grid grid-cols-1 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.1fr)_5.5rem_minmax(0,0.9fr)_auto] gap-2 sm:gap-2 items-center px-3 py-2 text-xs border-l-4 ${
                                row.sinSeating
                                  ? "border-l-violet-400 bg-violet-50/70"
                                  : isSelected
                                    ? "border-l-transparent bg-indigo-50/40"
                                    : "border-l-transparent"
                              }`}
                            >
                              <label className="flex min-w-0 cursor-pointer items-start gap-2">
                                <input
                                  type="checkbox"
                                  className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                  checked={isSelected}
                                  onChange={() =>
                                    handleTogglePart(obraId, row.partKey, rows)
                                  }
                                />
                                <span className="min-w-0">
                                  <span className="block font-semibold text-slate-800 truncate">
                                    {row.displayName}
                                    {row.sinSeating ? (
                                      <span className="ml-1.5 rounded bg-violet-200/80 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-900">
                                        Sin seating
                                      </span>
                                    ) : null}
                                    {row.isScore ? (
                                      <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide text-amber-700">
                                        Score
                                      </span>
                                    ) : null}
                                  </span>
                                  <span className="text-[11px] text-slate-500 sm:hidden">
                                    Tope {row.maxCopies}
                                    {reduced ? ` → ${effective}` : ""}
                                    {row.isScore
                                      ? " · Score off por defecto"
                                      : ""}
                                  </span>
                                </span>
                              </label>

                              <div className="min-w-0 pl-6 sm:pl-0">
                                {row.sinSeating ? (
                                  <span className="text-[11px] italic text-violet-700">
                                    Sin asignación en seating
                                  </span>
                                ) : row.who.length > 0 ? (
                                  <span
                                    className="block truncate text-[11px] text-emerald-700"
                                    title={row.who.join(", ")}
                                  >
                                    {row.who.join(", ")}
                                  </span>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">
                                    —
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-center gap-0.5 pl-6 sm:pl-0">
                                <button
                                  type="button"
                                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                                  disabled={isRunning || effective <= 0}
                                  onClick={() =>
                                    setCopiesForRow(obraId, row, effective - 1)
                                  }
                                  aria-label="Restar copia"
                                  title="Restar (músico con tablet)"
                                >
                                  −
                                </button>
                                <div
                                  className={`min-w-[2.25rem] text-center tabular-nums text-[11px] font-bold ${
                                    reduced
                                      ? "text-amber-700"
                                      : "text-slate-800"
                                  }`}
                                  title={
                                    reduced
                                      ? `Reducido de ${row.maxCopies} (tope seating)`
                                      : `Tope seating: ${row.maxCopies}`
                                  }
                                >
                                  {effective}
                                  <span className="font-normal text-slate-400">
                                    /{row.maxCopies}
                                  </span>
                                </div>
                                <button
                                  type="button"
                                  className="flex h-6 w-6 items-center justify-center rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-30"
                                  disabled={
                                    isRunning || effective >= row.maxCopies
                                  }
                                  onClick={() =>
                                    setCopiesForRow(obraId, row, effective + 1)
                                  }
                                  aria-label="Sumar copia"
                                >
                                  <IconPlus size={12} />
                                </button>
                              </div>

                              <div className="min-w-0 pl-6 sm:pl-0">
                                {row.hasMultipleLinks ? (
                                  <select
                                    className="w-full max-w-full truncate rounded border border-slate-300 bg-white px-1.5 py-1 text-[11px] focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
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
                                    {row.links.map((link, idx) => (
                                      <option key={idx} value={idx}>
                                        {resolveLinkLabel(obraId, link, idx)}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="block truncate text-[11px] text-slate-600">
                                    {row.links[0]?.url
                                      ? resolveLinkLabel(
                                          obraId,
                                          row.links[0],
                                          0,
                                        )
                                      : "Sin archivo"}
                                  </span>
                                )}
                              </div>

                              <div className="flex justify-end gap-1 pl-6 sm:pl-0">
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                  disabled={isRunning || !row.links[0]?.url}
                                  onClick={() =>
                                    handleDownloadSinglePart(
                                      { obraId, obra },
                                      row,
                                    )
                                  }
                                  title="Descargar este PDF al navegador (archivo suelto, sin unificar)"
                                >
                                  <IconDownload size={12} />
                                  Bajar
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                                  disabled={isRunning || !row.links[0]?.url}
                                  onClick={() =>
                                    handleCopySinglePart({ obraId, obra }, row)
                                  }
                                  title="Copia este PDF suelto a la carpeta de sets en Drive (no lo descarga al PC)"
                                >
                                  <IconCopy size={12} />
                                  A Drive
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {progress.total > 0 && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="mb-1.5 flex items-center justify-between text-[11px]">
                <span className="font-medium text-slate-600">
                  {progress.label || "Progreso"}
                </span>
                <span className="tabular-nums text-slate-500">{pct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          )}

          {results.length > 0 && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                Resultados
              </div>
              <ul className="space-y-1.5 text-xs text-slate-700">
                {results.map((r, idx) => (
                  <li
                    key={`${r.obraId}-${idx}`}
                    className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5"
                  >
                    <span className="font-semibold">{r.title}</span>
                    {r.error ? (
                      <span className="text-red-600">{r.error}</span>
                    ) : r.link ? (
                      <a
                        href={r.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {r.copiedSingle
                          ? "Archivo en Drive"
                          : "Ver set en Drive"}
                      </a>
                    ) : r.downloadedLocal ? (
                      <span className="text-emerald-700">Descargado</span>
                    ) : (
                      <span className="text-slate-500">OK</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] leading-relaxed text-slate-500 max-w-md">
            Vientos/perc./director: 1 por músico (asignación individual). Podés
            restar copias si alguien usa tablet.
            {copiasPorAtril ? (
              <>
                {" "}
                Cuerdas:{" "}
                <span className="font-medium text-emerald-700">
                  1 por atril (ceil n/2)
                </span>
                .
              </>
            ) : (
              <>
                {" "}
                Cuerdas:{" "}
                <span className="font-medium text-slate-600">
                  1 por músico
                </span>
                .
              </>
            )}
            {dobleFaz && (
              <>
                {" "}
                <span className="font-medium text-indigo-600">
                  Doble faz:
                </span>{" "}
                hoja en blanco si páginas impares.
              </>
            )}
          </p>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => handleGenerateSets("local")}
              disabled={isRunning || selectionStats.partsCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm transition-all hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning && runningMode === "local" ? (
                <>
                  <IconLoader className="animate-spin" size={14} />
                  Descargando…
                </>
              ) : (
                <>
                  <IconDownload size={14} />
                  Descargar PDF
                  {selectionStats.obrasCount > 0
                    ? ` (${selectionStats.obrasCount})`
                    : ""}
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => handleGenerateSets("drive")}
              disabled={isRunning || selectionStats.partsCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning && runningMode === "drive" ? (
                <>
                  <IconLoader className="animate-spin" size={14} />
                  Subiendo…
                </>
              ) : (
                <>
                  <IconFolder size={14} />
                  Subir a Drive
                  {selectionStats.obrasCount > 0
                    ? ` (${selectionStats.obrasCount})`
                    : ""}
                </>
              )}
            </button>
          </div>
        </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
