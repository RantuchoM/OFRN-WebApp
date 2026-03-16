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
  // Si no tenemos un nombre explícito en el JSON,
  // mostramos un label genérico legible, NO derivado del link
  if (fallbackIndex === 0) return "Principal";
  return `Versión ${fallbackIndex + 1}`;
}

const isStringInstrumentId = (id) =>
  ["01", "02", "03", "04"].includes(String(id || ""));

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
      initial[obra.obra_id] = { enabled: true, parts: {} };
    });
    return initial;
  });
  const [linkIndexByPart, setLinkIndexByPart] = useState({});
  const [remoteLinkNames, setRemoteLinkNames] = useState({});
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

      // Cuerdas: contenedores (1 copia por músico presente)
      containers.forEach((c) => {
        const assignedPartId = assignments[`C-${c.id}-${obraId}`];
        if (!assignedPartId) return;
        const musiciansCount = (c.items || []).length;
        if (!musiciansCount) return;
        const copies = musiciansCount;
        copiesByPartId[assignedPartId] =
          (copiesByPartId[assignedPartId] || 0) + copies;
      });

      // Vientos / percusión: 1 copia por músico presente
      presentRoster.forEach((m) => {
        if (isStringInstrumentId(m.id_instr)) return;
        const assignedPartId = assignments[`M-${m.id}-${obraId}`];
        if (!assignedPartId) return;
        copiesByPartId[assignedPartId] =
          (copiesByPartId[assignedPartId] || 0) + 1;
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
                  // Para múltiples versiones, ignoramos cualquier "name" embebido
                  // y siempre usaremos luego el nombre real de Drive (remoteLinkNames)
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

  const handleToggleWork = (obraId) => {
    setSelectedByObra((prev) => {
      const next = { ...prev };
      if (!next[obraId]) next[obraId] = { enabled: true, parts: {} };
      next[obraId] = {
        ...next[obraId],
        enabled: !next[obraId].enabled,
      };
      return next;
    });
  };

  const handleTogglePart = (obraId, partKey) => {
    setSelectedByObra((prev) => {
      const next = { ...prev };
      if (!next[obraId]) next[obraId] = { enabled: true, parts: {} };
      const current = !!next[obraId].parts[partKey];
      next[obraId] = {
        ...next[obraId],
        parts: {
          ...next[obraId].parts,
          [partKey]: !current,
        },
      };
      return next;
    });
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
      const conf = selectedByObra[obraId] || { enabled: true, parts: {} };
      if (!conf.enabled) return;
      const selectedRows = rows.filter((row) => {
        const flag = conf.parts[row.partKey];
        return flag === undefined ? true : flag;
      });
      if (!selectedRows.length) return;
      selection.push({ obraId, obra, rows: selectedRows });
    });
    return selection;
  };

  // Carga perezosa de nombres reales desde Drive solo para enlaces con múltiples versiones
  useEffect(() => {
    if (!isOpen) return;

    const pending = [];

    tree.forEach(({ rows }) => {
      rows.forEach((row) => {
        if (!row.hasMultipleLinks) return;
        row.links.forEach((link) => {
          if (!link.url) return;
          if (remoteLinkNames[link.url]) return;
          pending.push(link.url);
        });
      });
    });

    if (pending.length === 0) return;

    const loadNames = async () => {
      for (const url of pending) {
        try {
          // eslint-disable-next-line no-console
          console.log("[ParticellaDownloadModal] get_file_name for", url);
          const { data, error } = await supabase.functions.invoke(
            "manage-drive",
            {
              body: { action: "get_file_name", sourceUrl: url },
            },
          );
          if (error) {
            // eslint-disable-next-line no-console
            console.error(
              "[ParticellaDownloadModal] get_file_name error",
              url,
              error,
            );
            continue;
          }
          // eslint-disable-next-line no-console
          console.log(
            "[ParticellaDownloadModal] get_file_name OK",
            url,
            data,
          );
          if (data?.name) {
            setRemoteLinkNames((prev) =>
              prev[url]
                ? prev
                : {
                    ...prev,
                    [url]: data.name,
                  },
            );
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(
            "[ParticellaDownloadModal] get_file_name exception",
            url,
            e,
          );
        }
      }
    };

    loadNames();
  }, [isOpen, tree, supabase, remoteLinkNames]);

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

          let buffer;
          try {
            if (chosenLink.url.includes("drive.google.com")) {
              const { data, error } = await supabase.functions.invoke(
                "manage-drive",
                {
                  body: {
                    action: "get_file_content",
                    sourceUrl: chosenLink.url,
                  },
                },
              );
              if (error || !data?.fileBase64) {
                throw new Error(error?.message || "Error get_file_content");
              }
              buffer = bytesFromBase64(data.fileBase64);
            } else {
              const res = await fetch(chosenLink.url);
              if (!res.ok) throw new Error("Error descargando archivo");
              const arr = await res.arrayBuffer();
              buffer = new Uint8Array(arr);
            }
          } catch (e) {
            console.error("Error descargando particella", row.partId, e);
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

        const base64 = btoa(
          String.fromCharCode(...new Uint8Array(mergedBytes)),
        );
        const safeComposer = (obraSel.obra.composer || "Comp").replace(
          /[^a-zA-Z0-9-_]+/g,
          "_",
        );
        const safeTitle = (obraTitleClean || "Obra").replace(
          /[^a-zA-Z0-9-_]+/g,
          "_",
        );
        const fileName = `SetParticellas_${program?.nomenclador || program?.id || "Prog"}_${safeComposer}_${safeTitle}.pdf`;

        try {
          const { data, error } = await supabase.functions.invoke(
            "manage-drive",
            {
              body: {
                action: "upload_particella_set",
                fileBase64: base64,
                fileName,
                mimeType: "application/pdf",
                programId: program?.id,
                obraId: obraSel.obraId,
              },
            },
          );
          if (error) {
            throw new Error(error.message || "Error upload_particella_set");
          }
          globalResults.push({
            obraId: obraSel.obraId,
            title: obraTitleClean,
            link: data?.webViewLink || null,
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
                  <label className="flex items-center gap-2 text-xs font-semibold text-slate-800">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600"
                      checked={
                        (selectedByObra[obraId]?.enabled ?? true) && rows.length > 0
                      }
                      onChange={() => handleToggleWork(obraId)}
                    />
                    <span>
                      {obra.composer} —{" "}
                      <span
                        className="font-bold"
                        dangerouslySetInnerHTML={{ __html: obra.title }}
                      />
                    </span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {rows.length} particellas
                  </span>
                </div>
                {rows.length > 0 && (
                  <div className="divide-y divide-slate-100 bg-white">
                    {rows.map((row) => (
                        <div
                          key={row.partKey}
                          className="flex items-center justify-between px-3 py-1.5 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              className="rounded border-slate-300 text-indigo-600 mt-0.5"
                              checked={
                                selectedByObra[obraId]?.parts[row.partKey] ??
                                true
                              }
                              onChange={() =>
                                handleTogglePart(obraId, row.partKey)
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
                                  const remoteName = remoteLinkNames[link.url];
                                  const label =
                                    remoteName || getDriveFileLabel(link.url, idx);
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
                                  ? remoteLinkNames[row.links[0].url] ||
                                    getDriveFileLabel(row.links[0].url, 0)
                                  : "Particella"}
                              </span>
                            )}
                          </div>
                        </div>
                    ))}
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

