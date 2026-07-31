import React, { useEffect, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import PizZip from "pizzip";
import { mergeSequential } from "../../utils/docMerger";
import { buildMusicianCoverPdf } from "../../utils/particellaMusicianCover";
import {
  buildMembershipIndex,
  buildMusicianParticellaBundles,
  safeFileToken,
} from "../../utils/buildMusicianParticellaBundles";
import {
  IconDownload,
  IconFolder,
  IconLoader,
  IconPrinter,
} from "../ui/Icons";
import { PARTICELLA_SETS_ROOT_ID } from "../../utils/driveFolders";

function stripHtml(html) {
  if (typeof html !== "string") return html || "";
  return html
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]*>?/gm, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function getDriveFileLabel(_url, fallbackIndex) {
  if (fallbackIndex === 0) return "Principal";
  return `Versión ${fallbackIndex + 1}`;
}

/**
 * Modal body + footer for «Toda la gira por músico».
 */
export default function ParticellaByMusicianExport({
  supabase,
  program,
  obras = [],
  assignments = {},
  musicianAssignments = {},
  containers = [],
  particellas = [],
  filteredRoster = [],
  onBusyChange,
  onProgressChange,
}) {
  const [selectedObraIds, setSelectedObraIds] = useState(() =>
    new Set((obras || []).map((o) => String(o.obra_id))),
  );
  const [selectedMusicianIds, setSelectedMusicianIds] = useState(null);
  const [sortMode, setSortMode] = useState("alpha");
  const [outputMode, setOutputMode] = useState("single"); // single | per_musician
  const [dobleFaz, setDobleFaz] = useState(true);
  const [linkIndexByPart, setLinkIndexByPart] = useState({});
  const [membershipByMusician, setMembershipByMusician] = useState(() => new Map());
  const [loadingMemberships, setLoadingMemberships] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runningMode, setRunningMode] = useState(null);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: "" });
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [googleAccessToken, setGoogleAccessToken] = useState(null);

  useEffect(() => {
    onBusyChange?.(isRunning);
  }, [isRunning, onBusyChange]);

  useEffect(() => {
    onProgressChange?.(progress);
  }, [progress, onProgressChange]);

  const prevObraIdSetRef = useRef(null);

  // Sync obras: solo si cambian los IDs reales (no al recrearse el array `obras`).
  // Respeta destildes manuales; auto-tilda obras nuevas del programa.
  useEffect(() => {
    const ids = (obras || []).map((o) => String(o.obra_id));
    const nextSet = new Set(ids);
    const prevSet = prevObraIdSetRef.current;

    if (
      prevSet &&
      prevSet.size === nextSet.size &&
      ids.every((id) => prevSet.has(id))
    ) {
      return;
    }

    prevObraIdSetRef.current = nextSet;

    setSelectedObraIds((prev) => {
      if (prevSet == null) return nextSet;
      const merged = new Set();
      for (const id of prev) {
        if (nextSet.has(id)) merged.add(id);
      }
      for (const id of ids) {
        if (!prevSet.has(id)) merged.add(id);
      }
      return merged;
    });
  }, [obras]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const ids = (filteredRoster || []).map((m) => m.id).filter(Boolean);
      if (!ids.length) {
        setMembershipByMusician(new Map());
        return;
      }
      setLoadingMemberships(true);
      try {
        const { data, error: qErr } = await supabase
          .from("integrantes_ensambles")
          .select(
            "id_integrante, id_ensamble, fecha_desde, fecha_hasta, ensambles(id, ensamble)",
          )
          .in("id_integrante", ids);
        if (qErr) throw qErr;
        if (cancelled) return;
        const refDate =
          program?.fecha_desde || program?.fecha || new Date().toISOString();
        setMembershipByMusician(buildMembershipIndex(data || [], refDate));
      } catch (e) {
        console.error("[ParticellaByMusician] membresías", e);
        if (!cancelled) setMembershipByMusician(new Map());
      } finally {
        if (!cancelled) setLoadingMemberships(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [supabase, filteredRoster, program?.fecha_desde, program?.fecha]);

  const allBundles = useMemo(
    () =>
      buildMusicianParticellaBundles({
        roster: filteredRoster,
        obras,
        selectedObraIds,
        assignments,
        musicianAssignments,
        containers,
        particellas,
        membershipByMusician,
        sortMode,
      }),
    [
      filteredRoster,
      obras,
      selectedObraIds,
      assignments,
      musicianAssignments,
      containers,
      particellas,
      membershipByMusician,
      sortMode,
    ],
  );

  const prevEligibleMusicianIdsRef = useRef(null);

  // Sync selección: al montar / al aparecer músicos nuevos por obras.
  // No re-tilda a quien el usuario destildó a mano.
  useEffect(() => {
    const eligible = allBundles.map((b) => String(b.musicianId));
    const eligibleSet = new Set(eligible);
    const prevEligible = prevEligibleMusicianIdsRef.current;
    prevEligibleMusicianIdsRef.current = eligibleSet;

    setSelectedMusicianIds((prev) => {
      if (prev == null || prevEligible == null) {
        return new Set(eligible);
      }
      const next = new Set();
      for (const id of prev) {
        if (eligibleSet.has(id)) next.add(id);
      }
      for (const id of eligible) {
        if (!prevEligible.has(id)) next.add(id);
      }
      return next;
    });
  }, [allBundles]);

  const selectedBundles = useMemo(() => {
    const sel = selectedMusicianIds || new Set();
    return allBundles.filter((b) => sel.has(String(b.musicianId)));
  }, [allBundles, selectedMusicianIds]);

  /** Grupos con separador cuando orden = instrumento | ensamble */
  const musicianGroups = useMemo(() => {
    if (sortMode !== "instrument" && sortMode !== "ensamble") {
      return [{ key: "_all", label: null, bundles: allBundles }];
    }
    const groups = [];
    const indexByKey = new Map();
    for (const b of allBundles) {
      let key;
      let label;
      if (sortMode === "instrument") {
        key = b.idInstr || "_sin_instr";
        label =
          b.instrumentoLabel ||
          (b.idInstr ? `Instrumento ${b.idInstr}` : "Sin instrumento");
      } else {
        key = b.regionalKey || "_sin_ensamble";
        label = b.regionalKey || "Sin ensamble regional";
      }
      if (!indexByKey.has(key)) {
        indexByKey.set(key, groups.length);
        groups.push({ key, label, bundles: [] });
      }
      groups[indexByKey.get(key)].bundles.push(b);
    }
    return groups;
  }, [allBundles, sortMode]);

  const toggleObra = (obraId) => {
    const key = String(obraId);
    setSelectedObraIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleMusician = (musicianId) => {
    const key = String(musicianId);
    setSelectedMusicianIds((prev) => {
      const next = new Set(prev || []);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleMusicianGroup = (bundles) => {
    const ids = bundles.map((b) => String(b.musicianId));
    setSelectedMusicianIds((prev) => {
      const next = new Set(prev || []);
      const allOn = ids.length > 0 && ids.every((id) => next.has(id));
      if (allOn) {
        ids.forEach((id) => next.delete(id));
      } else {
        ids.forEach((id) => next.add(id));
      }
      return next;
    });
  };

  const selectAllObras = () =>
    setSelectedObraIds(new Set((obras || []).map((o) => String(o.obra_id))));
  const clearObras = () => setSelectedObraIds(new Set());
  const selectAllMusicians = () =>
    setSelectedMusicianIds(new Set(allBundles.map((b) => String(b.musicianId))));
  const clearMusicians = () => setSelectedMusicianIds(new Set());

  const ensureGoogleAccessToken = async () => {
    if (googleAccessToken) return googleAccessToken;
    const { data, error: tokenError } = await supabase.functions.invoke(
      "manage-drive",
      { body: { action: "get_temp_token" } },
    );
    if (tokenError || !data?.accessToken) {
      throw new Error(
        tokenError?.message || "No se pudo obtener token de Drive",
      );
    }
    setGoogleAccessToken(data.accessToken);
    return data.accessToken;
  };

  const extractFileIdFromUrl = (url) => {
    if (!url || typeof url !== "string") return null;
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  const fetchPartBuffer = async (url) => {
    if (!url) throw new Error("Sin URL");
    if (url.includes("drive.google.com")) {
      const fileId = extractFileIdFromUrl(url);
      if (!fileId) throw new Error("No se pudo extraer ID de Drive");
      const token = await ensureGoogleAccessToken();
      const res = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok) throw new Error("Error descargando desde Drive");
      return new Uint8Array(await res.arrayBuffer());
    }
    const res = await fetch(url);
    if (!res.ok) throw new Error("Error descargando archivo");
    return new Uint8Array(await res.arrayBuffer());
  };

  const uploadPdfToFolder = async (blob, fileName, parentFolderId, token) => {
    const metadata = { name: fileName, parents: [parentFolderId] };
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
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      },
    );
    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      throw new Error(`Error al subir: ${uploadRes.status} ${errText}`);
    }
    return uploadRes.json();
  };

  const buildMusicianPdfBuffers = async (bundle, stepRef) => {
    const coverBytes = await buildMusicianCoverPdf({
      musicianName: bundle.displayName,
      mesLetra: program?.mes_letra || "",
      nomenclador: program?.nomenclador || "",
      nombreGira: program?.nombre_gira || program?.nombre || "",
      ensambles: bundle.ensambles,
      instrumento: bundle.instrumentoLabel,
      padBlankBack: dobleFaz,
    });

    const items = [{ buffer: coverBytes }];

    for (const part of bundle.parts) {
      const idx =
        linkIndexByPart[part.partId] != null ? linkIndexByPart[part.partId] : 0;
      const link = part.links[idx] || part.links[0];
      if (!link?.url) {
        stepRef.current += 1;
        setProgress({
          current: stepRef.current,
          total: stepRef.total,
          label: `Sin URL: ${part.displayName}`,
        });
        continue;
      }
      try {
        let buffer = await fetchPartBuffer(link.url);
        if (dobleFaz) {
          buffer = new Uint8Array(
            await mergeSequential([{ buffer }], { padOddPages: true }),
          );
        }
        items.push({ buffer });
        stepRef.current += 1;
        setProgress({
          current: stepRef.current,
          total: stepRef.total,
          label: `${bundle.displayName}: ${part.displayName}`,
        });
      } catch (e) {
        console.error("[ParticellaByMusician] part fail", part, e);
        stepRef.current += 1;
        setProgress({
          current: stepRef.current,
          total: stepRef.total,
          label: `Error: ${part.displayName}`,
        });
      }
    }

    return new Uint8Array(
      await mergeSequential(items, { padOddPages: false }),
    );
  };

  const handleGenerate = async (destination) => {
    if (!selectedBundles.length) {
      setError("Seleccioná al menos un músico con particellas.");
      return;
    }
    if (!selectedObraIds.size) {
      setError("Seleccioná al menos una obra.");
      return;
    }

    setError(null);
    setIsRunning(true);
    setRunningMode(destination);
    setResults([]);

    const totalParts = selectedBundles.reduce(
      (acc, b) => acc + b.parts.length,
      0,
    );
    const totalSteps = totalParts + selectedBundles.length;
    const stepRef = { current: 0, total: totalSteps };
    setProgress({ current: 0, total: totalSteps, label: "Preparando..." });

    const globalResults = [];
    const nom = safeFileToken(program?.nomenclador || program?.id, "Prog");

    try {
      if (outputMode === "single") {
        const allItems = [];
        for (const bundle of selectedBundles) {
          stepRef.current += 1;
          setProgress({
            current: stepRef.current,
            total: totalSteps,
            label: `Portada: ${bundle.displayName}`,
          });
          const bytes = await buildMusicianPdfBuffers(bundle, stepRef);
          allItems.push({ buffer: bytes });
        }
        const merged = await mergeSequential(allItems, { padOddPages: false });
        const blob = new Blob([merged], { type: "application/pdf" });
        const fileName = `GiraPorMusico_${nom}.pdf`;

        if (destination === "local") {
          saveAs(blob, fileName);
          globalResults.push({ title: "PDF único", downloadedLocal: true });
        } else {
          const token = await ensureGoogleAccessToken();
          const up = await uploadPdfToFolder(
            blob,
            fileName,
            PARTICELLA_SETS_ROOT_ID,
            token,
          );
          globalResults.push({
            title: "PDF único",
            link: up.webViewLink || null,
          });
        }
      } else {
        // per musician
        const pdfs = [];
        for (const bundle of selectedBundles) {
          stepRef.current += 1;
          setProgress({
            current: stepRef.current,
            total: totalSteps,
            label: `Armando: ${bundle.displayName}`,
          });
          const bytes = await buildMusicianPdfBuffers(bundle, stepRef);
          const fileName = `${safeFileToken(bundle.sortName, "Musico")}_${nom}.pdf`;
          pdfs.push({
            fileName,
            bytes,
            title: bundle.displayName,
          });
        }

        if (destination === "local") {
          const zip = new PizZip();
          for (const f of pdfs) {
            zip.file(f.fileName, f.bytes);
          }
          const zipBlob = zip.generate({
            type: "blob",
            compression: "DEFLATE",
          });
          saveAs(zipBlob, `GiraPorMusico_${nom}.zip`);
          globalResults.push({
            title: `${pdfs.length} PDF(s) en ZIP`,
            downloadedLocal: true,
          });
        } else {
          const { data: folderData, error: folderErr } =
            await supabase.functions.invoke("manage-drive", {
              body: {
                action: "create_particella_musician_folder",
                folderName: `${nom}_PorMusico`,
              },
            });
          if (folderErr || !folderData?.folderId) {
            throw new Error(
              folderErr?.message ||
                folderData?.error ||
                "No se pudo crear la carpeta en Drive",
            );
          }
          const token = await ensureGoogleAccessToken();
          for (const f of pdfs) {
            const blob = new Blob([f.bytes], { type: "application/pdf" });
            const up = await uploadPdfToFolder(
              blob,
              f.fileName,
              folderData.folderId,
              token,
            );
            globalResults.push({
              title: f.title,
              link: up.webViewLink || null,
            });
          }
          globalResults.unshift({
            title: `Carpeta ${folderData.name || ""}`,
            link: folderData.webViewLink || null,
            isFolder: true,
          });
        }
      }

      setResults(globalResults);
      setProgress({
        current: totalSteps,
        total: totalSteps,
        label: "Completado",
      });
    } catch (e) {
      console.error("[ParticellaByMusician] generate", e);
      setError(e.message || "Error al generar");
    } finally {
      setIsRunning(false);
      setRunningMode(null);
    }
  };

  return (
    <>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-100 bg-white px-5 py-2.5">
        <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="font-bold text-slate-400 uppercase tracking-wide">
            Orden
          </span>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
            value={sortMode}
            disabled={isRunning}
            onChange={(e) => setSortMode(e.target.value)}
          >
            <option value="alpha">Alfabético</option>
            <option value="instrument">Instrumento</option>
            <option value="ensamble">Ensamble</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="font-bold text-slate-400 uppercase tracking-wide">
            Salida
          </span>
          <select
            className="rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium"
            value={outputMode}
            disabled={isRunning}
            onChange={(e) => setOutputMode(e.target.value)}
          >
            <option value="single">Un solo PDF</option>
            <option value="per_musician">Un PDF por músico</option>
          </select>
        </label>
        <label
          className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
            dobleFaz
              ? "border-indigo-200 bg-indigo-50 text-indigo-800"
              : "border-slate-200 bg-white text-slate-600"
          }`}
        >
          <input
            type="checkbox"
            className="rounded border-slate-300 text-indigo-600"
            checked={dobleFaz}
            disabled={isRunning}
            onChange={(e) => setDobleFaz(e.target.checked)}
          />
          <IconPrinter size={14} />
          <span className="font-semibold">Doble faz</span>
        </label>
        {loadingMemberships && (
          <span className="text-[11px] text-slate-400">Cargando ensambles…</span>
        )}
      </div>

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 py-4">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
        )}

        <section>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Obras ({selectedObraIds.size}/{obras.length})
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[10px] font-bold text-indigo-600 hover:underline"
                onClick={selectAllObras}
                disabled={isRunning}
              >
                Todas
              </button>
              <button
                type="button"
                className="text-[10px] font-bold text-slate-400 hover:underline"
                onClick={clearObras}
                disabled={isRunning}
              >
                Ninguna
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            {(obras || []).map((obra) => {
              const id = String(obra.obra_id);
              const on = selectedObraIds.has(id);
              return (
                <label
                  key={id}
                  className={`flex w-full cursor-pointer items-start gap-2 rounded-md border px-2.5 py-1.5 text-[11px] ${
                    on
                      ? "border-indigo-200 bg-indigo-50 text-indigo-900"
                      : "border-slate-200 bg-white text-slate-500"
                  }`}
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 shrink-0 rounded border-slate-300 text-indigo-600"
                    checked={on}
                    disabled={isRunning}
                    onChange={() => toggleObra(obra.obra_id)}
                  />
                  <span className="min-w-0 leading-snug">
                    {obra.composer ? (
                      <span className="font-medium text-slate-500">
                        {obra.composer} —{" "}
                      </span>
                    ) : null}
                    <span className="font-semibold">
                      {stripHtml(obra.title) || "Obra"}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <h3 className="text-[10px] font-black uppercase tracking-wide text-slate-400">
              Músicos ({selectedBundles.length}/{allBundles.length})
            </h3>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[10px] font-bold text-indigo-600 hover:underline"
                onClick={selectAllMusicians}
                disabled={isRunning}
              >
                Todos
              </button>
              <button
                type="button"
                className="text-[10px] font-bold text-slate-400 hover:underline"
                onClick={clearMusicians}
                disabled={isRunning}
              >
                Ninguno
              </button>
            </div>
          </div>
          {allBundles.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-xs text-slate-500">
              No hay músicos con particellas asignadas en las obras
              seleccionadas.
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-200">
              {musicianGroups.map((group) => {
                const sel = selectedMusicianIds || new Set();
                const groupIds = group.bundles.map((b) =>
                  String(b.musicianId),
                );
                const selectedInGroup = groupIds.filter((id) =>
                  sel.has(id),
                ).length;
                const allOn =
                  groupIds.length > 0 && selectedInGroup === groupIds.length;
                const someOn =
                  selectedInGroup > 0 && selectedInGroup < groupIds.length;
                const showHeader = !!group.label;

                return (
                  <div
                    key={group.key}
                    className={
                      showHeader ? "border-b border-slate-200 last:border-b-0" : ""
                    }
                  >
                    {showHeader && (
                      <label className="flex cursor-pointer items-center gap-2 bg-slate-100 px-3 py-2 border-b border-slate-200">
                        <input
                          type="checkbox"
                          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          checked={allOn}
                          ref={(el) => {
                            if (el) el.indeterminate = someOn;
                          }}
                          disabled={isRunning}
                          onChange={() => toggleMusicianGroup(group.bundles)}
                        />
                        <span className="min-w-0 flex-1 text-xs font-bold text-slate-800">
                          {group.label}
                        </span>
                        <span className="shrink-0 text-[10px] font-semibold tabular-nums text-slate-500">
                          {selectedInGroup}/{groupIds.length}
                        </span>
                      </label>
                    )}
                    <div className="divide-y divide-slate-100">
                      {group.bundles.map((bundle) => {
                        const mid = String(bundle.musicianId);
                        const on = sel.has(mid);
                        return (
                          <div
                            key={mid}
                            className={`px-3 py-2 ${on ? "bg-white" : "bg-slate-50/80 opacity-70"} ${showHeader ? "pl-5" : ""}`}
                          >
                            <label className="flex cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                className="mt-0.5 rounded border-slate-300 text-indigo-600"
                                checked={on}
                                disabled={isRunning}
                                onChange={() =>
                                  toggleMusician(bundle.musicianId)
                                }
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block text-xs font-bold text-slate-800">
                                  {bundle.displayName}
                                  {sortMode !== "instrument" &&
                                  bundle.instrumentoLabel ? (
                                    <span className="ml-1 font-normal text-slate-500">
                                      · {bundle.instrumentoLabel}
                                    </span>
                                  ) : null}
                                </span>
                                {sortMode !== "ensamble" &&
                                  bundle.ensambles.length > 0 && (
                                    <span className="block text-[10px] text-slate-500">
                                      {bundle.ensambles.join(", ")}
                                    </span>
                                  )}
                                <span className="mt-0.5 block text-[10px] text-slate-400">
                                  {bundle.parts.length} parte
                                  {bundle.parts.length !== 1 ? "s" : ""}
                                </span>
                              </span>
                            </label>
                            {on &&
                              bundle.parts.some((p) => p.hasMultipleLinks) && (
                                <div className="mt-1.5 space-y-1 pl-6">
                                  {bundle.parts
                                    .filter((p) => p.hasMultipleLinks)
                                    .map((p) => (
                                      <div
                                        key={p.partKey}
                                        className="flex flex-wrap items-center gap-2 text-[11px]"
                                      >
                                        <span className="text-slate-500">
                                          {stripHtml(p.obra?.title) || "Obra"} ·{" "}
                                          {p.displayName}:
                                        </span>
                                        <select
                                          className="rounded border border-slate-300 bg-white px-1.5 py-0.5"
                                          value={
                                            linkIndexByPart[p.partId] != null
                                              ? linkIndexByPart[p.partId]
                                              : 0
                                          }
                                          disabled={isRunning}
                                          onChange={(e) =>
                                            setLinkIndexByPart((prev) => ({
                                              ...prev,
                                              [p.partId]: Number(
                                                e.target.value,
                                              ),
                                            }))
                                          }
                                        >
                                          {p.links.map((link, idx) => (
                                            <option key={idx} value={idx}>
                                              {getDriveFileLabel(
                                                link.url,
                                                idx,
                                              )}
                                            </option>
                                          ))}
                                        </select>
                                      </div>
                                    ))}
                                </div>
                              )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {results.length > 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
            <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-400">
              Resultados
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700">
              {results.map((r, idx) => (
                <li key={idx} className="flex flex-wrap gap-x-2">
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
                      {r.isFolder ? "Abrir carpeta" : "Ver en Drive"}
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

      <div className="flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-md text-[11px] leading-relaxed text-slate-500">
          Portada por músico
          {dobleFaz ? " (anverso + reverso en blanco)" : ""}. Una particella por
          obra asignada; destildá músicos con tablet.
          {outputMode === "per_musician"
            ? " Salida: un PDF por músico (zip o carpeta Drive)."
            : " Salida: un solo PDF con todos."}
        </p>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleGenerate("local")}
            disabled={isRunning || selectedBundles.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            {isRunning && runningMode === "local" ? (
              <>
                <IconLoader className="animate-spin" size={14} />
                Generando…
              </>
            ) : (
              <>
                <IconDownload size={14} />
                {outputMode === "per_musician"
                  ? "Descargar ZIP"
                  : "Descargar PDF"}
              </>
            )}
          </button>
          <button
            type="button"
            onClick={() => handleGenerate("drive")}
            disabled={isRunning || selectedBundles.length === 0}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
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
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
