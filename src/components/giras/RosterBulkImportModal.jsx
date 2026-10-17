import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import {
  IconCheck,
  IconDownload,
  IconExternalLink,
  IconLoader,
  IconUpload,
  IconX,
} from "../ui/Icons";
import { DIET_OPTIONS } from "../../utils/dietOptions";
import {
  DEFAULT_ROL_ID,
  inferDefaultTourRole,
} from "../../utils/giraUtils";
import { seatingApellidoNombre } from "../../utils/integranteDisplayName";
import { integranteIdForDb, integranteKey } from "../../utils/integranteIds";
import {
  applyExistingDniErrors,
  buildInstrumentLookup,
  buildRosterImportTemplate,
  foldDniKey,
  parseRosterImportFile,
  ROSTER_BULK_SHEETS_COPY_URL,
  toGoogleSheetsCopyUrl,
} from "../../utils/rosterBulkImport";

function isUniqueViolation(err) {
  return err?.code === "23505" || /duplicate|unique/i.test(err?.message || "");
}

function isForeignKeyViolation(err) {
  return err?.code === "23503" || /foreign key/i.test(err?.message || "");
}

export default function RosterBulkImportModal({
  isOpen,
  onClose,
  supabase,
  giraId,
  localNotificacionInicialEnviada = false,
  notificacionesHabilitadas = false,
  onEnqueueNotifications,
  onDone,
}) {
  const fileInputRef = useRef(null);
  const [instruments, setInstruments] = useState([]);
  const [loadingLists, setLoadingLists] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");

  const instrumentsByName = useMemo(
    () => buildInstrumentLookup(instruments),
    [instruments],
  );

  const instrumentNames = useMemo(
    () =>
      instruments
        .map((r) => String(r.instrumento || "").trim())
        .filter(Boolean),
    [instruments],
  );

  const validRows = useMemo(() => rows.filter((r) => r.ok), [rows]);
  const errorRows = useMemo(() => rows.filter((r) => !r.ok), [rows]);

  useEffect(() => {
    if (!isOpen || !supabase) return;
    let cancelled = false;
    setLoadingLists(true);
    setParseError(null);
    setRows([]);
    setFileName("");
    (async () => {
      const { data, error } = await supabase
        .from("instrumentos")
        .select("id, instrumento, rol_gira_default")
        .order("instrumento", { ascending: true });
      if (cancelled) return;
      if (error) {
        console.error(error);
        toast.error("No se pudieron cargar los instrumentos");
        setInstruments([]);
      } else {
        setInstruments(data || []);
      }
      setLoadingLists(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, supabase]);

  if (!isOpen) return null;

  const sheetsCopyUrl = toGoogleSheetsCopyUrl(ROSTER_BULK_SHEETS_COPY_URL);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await buildRosterImportTemplate({
        dietOptions: DIET_OPTIONS,
        instrumentNames,
      });
      toast.success("Plantilla descargada");
    } catch (err) {
      console.error(err);
      toast.error("No se pudo generar la plantilla: " + (err.message || err));
    } finally {
      setDownloading(false);
    }
  };

  const handleOpenSheetsTemplate = () => {
    if (!sheetsCopyUrl) {
      toast.error(
        "Falta configurar VITE_ROSTER_BULK_SHEETS_COPY_URL con el enlace de la plantilla.",
      );
      return;
    }
    window.open(sheetsCopyUrl, "_blank", "noopener,noreferrer");
  };

  const handleFile = async (file) => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    setFileName(file.name || "");
    try {
      const parsed = await parseRosterImportFile(file, {
        instrumentsByName,
        dietOptions: DIET_OPTIONS,
      });
      if (parsed.parseError) {
        setParseError(parsed.parseError);
        setRows([]);
        return;
      }

      let nextRows = parsed.rows;
      const dnis = nextRows
        .map((r) => r.dni)
        .filter(Boolean)
        .map((d) => String(d).trim());

      if (dnis.length > 0 && supabase) {
        const { data: existing, error } = await supabase
          .from("integrantes")
          .select("dni")
          .in("dni", dnis);
        if (error) {
          console.warn("Chequeo DNI:", error.message);
        } else {
          const existingSet = new Set(
            (existing || [])
              .map((r) => foldDniKey(r.dni))
              .filter(Boolean),
          );
          nextRows = applyExistingDniErrors(nextRows, existingSet);
        }
      }

      setRows(nextRows);
      if (nextRows.length === 0) {
        setParseError("No hay filas con datos para importar.");
      }
    } catch (err) {
      console.error(err);
      setParseError("No se pudo leer el Excel: " + (err.message || err));
      setRows([]);
    } finally {
      setParsing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleImport = async () => {
    const toImport = rows.filter((r) => r.ok);
    if (!toImport.length || !supabase || giraId == null) return;

    setImporting(true);
    let created = 0;
    let linked = 0;
    let alreadyInGira = 0;
    let failed = 0;
    const notificationBatch = [];

    try {
      for (const row of toImport) {
        try {
          const payload = {
            apellido: row.apellido,
            nombre: row.nombre,
            condicion: "Invitado",
            genero: row.genero || null,
            fecha_nac: row.fecha_nac || null,
            dni: row.dni || null,
            cuil: row.cuil || null,
            telefono: row.telefono || null,
            mail: row.mail || null,
            alimentacion: row.alimentacion || null,
            id_instr: row.id_instr || null,
          };

          const { data: createdPerson, error: insertErr } = await supabase
            .from("integrantes")
            .insert([payload])
            .select(
              "id, apellido, nombre, mail, id_instr, instrumentos(instrumento, familia, rol_gira_default)",
            )
            .single();

          if (insertErr) throw insertErr;
          created += 1;

          const idLink = integranteIdForDb(createdPerson.id);
          if (idLink == null) {
            failed += 1;
            continue;
          }

          const musicianData = {
            id: createdPerson.id,
            apellido: createdPerson.apellido,
            nombre: createdPerson.nombre,
            mail: createdPerson.mail,
            instrumentos:
              createdPerson.instrumentos ||
              (row.rol_gira_default
                ? { rol_gira_default: row.rol_gira_default }
                : null),
          };

          const rol = inferDefaultTourRole(musicianData) || DEFAULT_ROL_ID;

          const { error: linkErr } = await supabase
            .from("giras_integrantes")
            .insert({
              id_gira: giraId,
              id_integrante: idLink,
              estado: "confirmado",
              rol,
            });

          if (linkErr) {
            if (isUniqueViolation(linkErr)) {
              alreadyInGira += 1;
            } else if (isForeignKeyViolation(linkErr)) {
              failed += 1;
              console.error("FK al vincular", linkErr);
            } else {
              failed += 1;
              console.error(linkErr);
            }
          } else {
            linked += 1;
            if (
              localNotificacionInicialEnviada &&
              notificacionesHabilitadas &&
              musicianData.mail
            ) {
              notificationBatch.push({
                id: `alta-bulk-${integranteKey(idLink)}-${Date.now()}-${created}`,
                variant: "ALTA",
                emails: [musicianData.mail],
                nombres: [seatingApellidoNombre(musicianData)],
                reason: "Se te convoca individualmente",
              });
            }
          }
        } catch (rowErr) {
          failed += 1;
          console.error("Fila import:", rowErr);
        }
      }

      if (notificationBatch.length && onEnqueueNotifications) {
        onEnqueueNotifications(notificationBatch);
      }

      const parts = [];
      if (created) parts.push(`${created} creados`);
      if (linked) parts.push(`${linked} sumados a la gira`);
      if (alreadyInGira) parts.push(`${alreadyInGira} ya estaban en la gira`);
      if (failed) parts.push(`${failed} con error`);
      toast.success(
        parts.length ? parts.join(" · ") : "Importación finalizada",
      );

      await onDone?.();
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Error en la importación: " + (err.message || err));
    } finally {
      setImporting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-3">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95">
        <div className="px-4 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-sm font-bold text-slate-800">
              Carga masiva de personas
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Plantilla Excel → alta como Invitado y convocatoria a esta gira
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="text-slate-400 hover:text-slate-600 disabled:opacity-50"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              disabled={downloading || loadingLists}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {downloading ? (
                <IconLoader size={14} className="animate-spin" />
              ) : (
                <IconDownload size={14} />
              )}
              Descargar Excel
            </button>
            <button
              type="button"
              onClick={handleOpenSheetsTemplate}
              disabled={!sheetsCopyUrl}
              title={
                sheetsCopyUrl
                  ? "Abrir plantilla en Google Sheets (crear una copia)"
                  : "Configurá VITE_ROSTER_BULK_SHEETS_COPY_URL"
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconExternalLink size={14} />
              Plantilla Google Sheets
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={parsing || loadingLists || importing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-fixed-indigo-600 text-white hover:bg-fixed-indigo-700 disabled:opacity-50"
            >
              {parsing ? (
                <IconLoader size={14} className="animate-spin" />
              ) : (
                <IconUpload size={14} />
              )}
              Subir archivo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            {fileName && (
              <span className="text-[11px] text-slate-500 self-center truncate max-w-[14rem]">
                {fileName}
              </span>
            )}
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Columnas: Apellido, Nombre, Género (M/F/-), Fecha de nacimiento,
            DNI, CUIL, Teléfono, Mail, Alimentación (lista), Instrumento
            (lista). Apellido y Nombre son obligatorios. Con Google Sheets:
            hacé una copia → completá →{" "}
            <span className="font-semibold">Archivo → Descargar → .xlsx</span>{" "}
            → Subir archivo. Las filas válidas se crean como{" "}
            <span className="font-semibold">Invitado</span> y se suman a la
            gira como confirmados.
          </p>

          {parseError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {parseError}
            </div>
          )}

          {rows.length > 0 && (
            <>
              <div className="flex flex-wrap gap-3 text-xs font-semibold">
                <span className="text-emerald-700">
                  {validRows.length} válidas
                </span>
                <span className="text-red-600">
                  {errorRows.length} con error
                </span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 sticky top-0 text-slate-500 uppercase font-bold">
                    <tr>
                      <th className="px-2 py-1.5 w-10">Fila</th>
                      <th className="px-2 py-1.5">Persona</th>
                      <th className="px-2 py-1.5">Instr.</th>
                      <th className="px-2 py-1.5">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.excelRow}
                        className={`border-t border-slate-100 ${
                          r.ok ? "bg-white" : "bg-red-50/60"
                        }`}
                      >
                        <td className="px-2 py-1.5 tabular-nums text-slate-500">
                          {r.excelRow}
                        </td>
                        <td className="px-2 py-1.5 font-medium text-slate-800">
                          {r.apellido}, {r.nombre}
                          {r.dni ? (
                            <span className="block text-slate-400 font-normal">
                              DNI {r.dni}
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2 py-1.5 text-slate-600">
                          {r.instrumento || "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          {r.ok ? (
                            <span className="text-emerald-700 font-semibold">
                              OK
                            </span>
                          ) : (
                            <span className="text-red-700">
                              {(r.errors || []).join("; ")}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={importing || validRows.length === 0}
            className="px-4 py-1.5 text-xs font-bold rounded-lg bg-fixed-indigo-600 text-white flex items-center gap-1.5 hover:bg-fixed-indigo-700 disabled:opacity-50"
          >
            {importing ? (
              <IconLoader size={14} className="animate-spin" />
            ) : (
              <IconCheck size={14} />
            )}
            Importar {validRows.length > 0 ? `(${validRows.length})` : ""}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
