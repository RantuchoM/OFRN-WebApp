import { useState, useEffect, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { musicianSchema } from "../schemas/musicianSchema";
import { sanitizeFilename } from "../utils/sanitize";
import {
  convertPdfToImage,
  getCroppedImg,
  compressImage,
} from "../utils/imageUtils";
import { useDebouncedCallback } from "./useDebouncedCallback";
import { toast } from "sonner";

function getDefaultValues(musician = {}) {
  return {
    id: undefined,
    nombre: "",
    apellido: "",
    domicilio: "",
    id_instr: "",
    dni: "",
    cuil: "",
    mail: "",
    telefono: "",
    condicion: "Estable",
    genero: "-",
    alimentacion: "",
    nacionalidad: "Argentina",
    fecha_nac: "",
    fecha_alta: "",
    fecha_baja: "",
    email_google: "",
    id_localidad: null,
    id_loc_viaticos: null,
    id_domicilio_laboral: null,
    link_bio: "",
    link_foto_popup: "",
    documentacion: "",
    docred: "",
    firma: "",
    email_acceso: "",
    rol_sistema: "user",
    clave_acceso: "",
    es_simulacion: false,
    link_dni_img: "",
    link_cbu_img: "",
    link_declaracion: "",
    link_cuil: "",
    nota_interna: "",
    avatar_url: "",
    avatar_color: "#4f46e5",
    cargo: "",
    jornada: "",
    motivo: "",
    ...musician,
    fecha_alta: musician?.fecha_alta || "",
    fecha_baja: musician?.fecha_baja || "",
    id_localidad: musician?.id_localidad ?? null,
    id_loc_viaticos: musician?.id_loc_viaticos ?? null,
    id_domicilio_laboral: musician?.id_domicilio_laboral ?? null,
    id_instr: musician?.id_instr ? String(musician.id_instr) : "",
  };
}

/**
 * Hook con estado del formulario de músico, guardado en BD, subida/crop y handlers.
 * @param {object} musician - Datos iniciales del músico (o vacío para crear)
 * @param {object} supabase - Cliente Supabase
 * @param {function} [onSave] - Callback (data, isNew?) tras guardar/crear
 * @returns {object} - Métodos de formulario, estado, y handlers para que el componente solo pinte
 */
export function useMusicianForm(musician, supabase, onSave) {
  const [loading, setLoading] = useState(false);
  const [assemblingType, setAssemblingType] = useState(null);
  const [uploadingField, setUploadingField] = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldStatuses, setFieldStatuses] = useState({});
  const [cropModal, setCropModal] = useState({
    isOpen: false,
    field: null,
    image: null,
    isPng: false,
  });
  const [crop, setCrop] = useState();
  const [completedCrop, setCompletedCrop] = useState(null);
  const imgRef = useRef(null);
  const [catalogoInstrumentos, setCatalogoInstrumentos] = useState([]);
  const [locationsOptions, setLocationsOptions] = useState([]);
  const [locacionesOptions, setLocacionesOptions] = useState([]);
  const [ensemblesOptions, setEnsemblesOptions] = useState([]);
  const [selectedEnsembles, setSelectedEnsembles] = useState(new Set());

  const inputClass =
    "w-full border border-slate-300 p-2.5 rounded-xl text-sm outline-none transition-all focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400";
  const labelClass =
    "text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block ml-1";

  const {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isValid },
  } = useForm({
    resolver: zodResolver(musicianSchema),
    mode: "onChange",
    defaultValues: getDefaultValues(musician),
  });

  const formData = watch();

  const musicianForGiras = {
    ...formData,
    instrumentos:
      catalogoInstrumentos.find(
        (i) => String(i.id) === String(formData.id_instr),
      ) || {},
    integrantes_ensambles: Array.from(selectedEnsembles).map((id) => ({
      id_ensamble: id,
    })),
  };

  useEffect(() => {
    const fetchCatalogs = async () => {
      if (!supabase) return;
      const { data: instrData } = await supabase
        .from("instrumentos")
        .select("id, instrumento")
        .order("instrumento");
      if (instrData) setCatalogoInstrumentos(instrData);

      const { data: locData } = await supabase
        .from("localidades")
        .select("id, localidad")
        .order("localidad");
      if (locData)
        setLocationsOptions(
          locData.map((l) => ({ id: l.id, label: l.localidad, value: l.id })),
        );

      const { data: locacionesData } = await supabase
        .from("locaciones")
        .select("id, nombre, direccion, localidades(localidad)")
        .order("nombre");
      if (locacionesData)
        setLocacionesOptions(
          locacionesData.map((l) => ({
            id: l.id,
            label: `${l.nombre}${l.localidades?.localidad ? ` (${l.localidades.localidad})` : ""}`,
            value: l.id,
          })),
        );

      const { data: ensData } = await supabase
        .from("ensambles")
        .select("id, ensamble")
        .order("ensamble");
      if (ensData)
        setEnsemblesOptions(
          ensData.map((e) => ({ value: e.id, label: e.ensamble })),
        );
    };
    fetchCatalogs();
  }, [supabase]);

  useEffect(() => {
    const fetchAssignedEnsembles = async () => {
      if (musician?.id && supabase) {
        const { data } = await supabase
          .from("integrantes_ensambles")
          .select("id_ensamble")
          .eq("id_integrante", musician.id);
        if (data) {
          setSelectedEnsembles(new Set(data.map((d) => d.id_ensamble)));
        }
      }
    };
    fetchAssignedEnsembles();
  }, [musician?.id, supabase]);

  useEffect(() => {
    if (musician?.id) {
      reset(getDefaultValues(musician));
    }
  }, [musician?.id, reset]);

  const getInputStatusClass = useCallback(
    (fieldName) => {
      const status = fieldStatuses[fieldName];
      if (status === "saving")
        return (
          inputClass + " border-orange-500 ring-4 ring-orange-50 bg-orange-50/10"
        );
      if (status === "saved")
        return (
          inputClass +
          " border-emerald-600 ring-4 ring-emerald-200 bg-emerald-100 text-emerald-800 font-medium"
        );
      return inputClass;
    },
    [fieldStatuses, inputClass],
  );

  const extractPathFromUrl = (url) => {
    if (!url) return null;
    if (url.includes("firmas/")) return url.split("firmas/")[1];
    if (url.includes("musician-docs/")) return url.split("musician-docs/")[1];
    return null;
  };

  const deleteOldFile = useCallback(
    async (url, bucket = "musician-docs") => {
      const path = extractPathFromUrl(url);
      if (path && supabase) await supabase.storage.from(bucket).remove([path]);
    },
    [supabase],
  );

  const saveFieldToDb = useCallback(
    async (field, value) => {
      const id = getValues("id");
      if (!id || !supabase) return;
      setFieldStatuses((prev) => ({ ...prev, [field]: "saving" }));
      try {
        const { error } = await supabase
          .from("integrantes")
          .update({ [field]: value === "" ? null : value })
          .eq("id", id);
        if (error) throw error;
        setFieldStatuses((prev) => ({ ...prev, [field]: "saved" }));
        setTimeout(
          () => setFieldStatuses((prev) => ({ ...prev, [field]: "idle" })),
          2000,
        );
        const camposCriticos = [
          "domicilio",
          "id_domicilio_laboral",
          "link_cbu_img",
          "link_dni_img",
          "link_cuil",
          "dni",
          "cuil",
        ];
        if (camposCriticos.includes(field)) {
          supabase.functions
            .invoke("manage-drive", {
              body: { action: "assemble_full_pack", musicianId: id },
            })
            .catch((err) => {
              console.warn(
                `[MusicianForm] Error al regenerar expediente para campo ${field}:`,
                err,
              );
            });
        }
      } catch (e) {
        setFieldStatuses((prev) => ({ ...prev, [field]: "error" }));
      }
    },
    [getValues, supabase],
  );

  const debouncedSave = useDebouncedCallback(saveFieldToDb, 800);

  const updateField = useCallback(
    (field, val) => {
      setValue(field, val, { shouldValidate: true });
      if (getValues("id")) debouncedSave(field, val);
    },
    [setValue, getValues, debouncedSave],
  );

  const handleEnsemblesChange = useCallback(
    async (newSet) => {
      setSelectedEnsembles(newSet);
      if (!getValues("id") || !supabase) return;
      const currentIds = Array.from(selectedEnsembles);
      const newIds = Array.from(newSet);
      const toAdd = newIds.filter((id) => !currentIds.includes(id));
      const toRemove = currentIds.filter((id) => !newIds.includes(id));
      const idIntegrante = getValues("id");
      if (toAdd.length > 0) {
        await supabase.from("integrantes_ensambles").insert(
          toAdd.map((idEns) => ({
            id_integrante: idIntegrante,
            id_ensamble: idEns,
          })),
        );
      }
      if (toRemove.length > 0) {
        await supabase
          .from("integrantes_ensambles")
          .delete()
          .eq("id_integrante", idIntegrante)
          .in("id_ensamble", toRemove);
      }
    },
    [getValues, selectedEnsembles, supabase],
  );

  const uploadToSupabase = useCallback(
    async (file, field, oldUrl) => {
      if (!file || !supabase) return;
      setUploadingField(field);
      setFieldStatuses((prev) => ({ ...prev, [field]: "saving" }));
      const bucket = field === "firma" ? "firmas" : "musician-docs";
      try {
        if (oldUrl) await deleteOldFile(oldUrl, bucket);
        let fileToUpload = file;
        if (
          file.type.startsWith("image/") &&
          field !== "firma" &&
          !file.name.includes("cropped")
        ) {
          fileToUpload = await compressImage(file);
        }
        const fileExt = file.type === "image/png" ? "png" : "jpg";
        const cleanSurname = sanitizeFilename(
          getValues("apellido") || "musician",
        );
        const fileName = `${cleanSurname}_${field}_${Date.now()}.${fileExt}`;
        const filePath = field === "firma" ? fileName : `docs/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, fileToUpload);
        if (uploadError) throw uploadError;
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(filePath);
        await supabase
          .from("integrantes")
          .update({
            [field]: publicUrl,
            last_modified_at: new Date().toISOString(),
          })
          .eq("id", getValues("id"));
        setValue(field, publicUrl);
        if (onSave) onSave({ ...getValues(), [field]: publicUrl }, false);
        setFieldStatuses((prev) => ({ ...prev, [field]: "saved" }));
        setTimeout(
          () => setFieldStatuses((prev) => ({ ...prev, [field]: "idle" })),
          2000,
        );
        const camposCriticosDocs = ["link_cbu_img", "link_dni_img", "link_cuil"];
        if (camposCriticosDocs.includes(field)) {
          const musicianId = getValues("id");
          if (musicianId) {
            supabase.functions
              .invoke("manage-drive", {
                body: { action: "assemble_full_pack", musicianId },
              })
              .catch((err) => {
                console.warn(
                  `[MusicianForm] Error al regenerar expediente tras subir ${field}:`,
                  err,
                );
              });
          }
        }
      } catch (error) {
        console.error("Upload Error:", error);
        setFieldStatuses((prev) => ({ ...prev, [field]: "error" }));
      } finally {
        setUploadingField(null);
      }
    },
    [
      supabase,
      deleteOldFile,
      getValues,
      setValue,
      onSave,
    ],
  );

  const handleStartCrop = useCallback(
    async (field, url) => {
      setLoading(true);
      try {
        let imageUrl = url;
        const isPdf = url.toLowerCase().includes(".pdf");
        const isPng =
          url.toLowerCase().includes(".png") || field === "firma";
        if (isPdf) imageUrl = await convertPdfToImage(url);
        setCropModal({ isOpen: true, field, image: imageUrl, isPng });
      } catch (e) {
        toast.error("Error al cargar imagen");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const handleConfirmCrop = useCallback(
    async () => {
      if (!completedCrop || !imgRef.current || !cropModal.field) return;
      try {
        setLoading(true);
        const croppedFile = await getCroppedImg(
          imgRef.current,
          completedCrop,
          cropModal.isPng,
        );
        await uploadToSupabase(
          croppedFile,
          cropModal.field,
          getValues()[cropModal.field],
        );
        setCropModal({ isOpen: false, field: null, image: null, isPng: false });
        setCompletedCrop(null);
      } catch (e) {
        toast.error("Error al guardar recorte");
      } finally {
        setLoading(false);
      }
    },
    [completedCrop, cropModal, uploadToSupabase, getValues],
  );

  const handleClipboardClick = useCallback(
    async (field, currentUrl) => {
      try {
        const clipboardItems = await navigator.clipboard.read();
        for (const item of clipboardItems) {
          for (const type of item.types) {
            if (type.startsWith("image/")) {
              const blob = await item.getType(type);
              const file = new File([blob], `pasted_${field}.png`, {
                type: "image/png",
              });
              uploadToSupabase(file, field, currentUrl);
              return;
            }
          }
        }
      } catch (err) {
        toast.error("Acceso al portapapeles denegado.");
      }
    },
    [uploadToSupabase],
  );

  const handleAssemble = useCallback(
    async (layout) => {
      const vals = getValues();
      if (!vals.id) { toast.error("Guarda la ficha primero."); return; }
      const sources = [
        vals.link_dni_img,
        vals.link_cuil,
        vals.link_cbu_img,
        vals.link_declaracion,
      ].filter(Boolean);
      if (sources.length === 0) { toast.error("No hay archivos para unir."); return; }
      setAssemblingType(layout);
      const targetField = layout === "full" ? "documentacion" : "docred";
      setFieldStatuses((p) => ({ ...p, [targetField]: "saving" }));
      try {
        const fileName = `${vals.apellido}_${vals.nombre}_${layout === "full" ? "DOC" : "MOS"}`;
        const { data, error } = await supabase.functions.invoke(
          "manage-drive",
          {
            body: { action: "assemble_docs_bucket", layout, sources, fileName },
          },
        );
        if (error) throw error;
        setValue(targetField, data.url);
        if (onSave) onSave({ ...getValues(), [targetField]: data.url }, false);
        setFieldStatuses((p) => ({ ...p, [targetField]: "saved" }));
        setTimeout(
          () => setFieldStatuses((p) => ({ ...p, [targetField]: "idle" })),
          2000,
        );
        window.open(data.url, "_blank");
      } catch (e) {
        setFieldStatuses((p) => ({ ...p, [targetField]: "error" }));
      } finally {
        setAssemblingType(null);
      }
    },
    [getValues, setValue, supabase, onSave],
  );

  const handleGenerateDJ = useCallback(async () => {
    const vals = getValues();
    if (!vals.id || !vals.firma) { toast.error("Faltan datos o firma."); return; }
    setAssemblingType("dj");
    setFieldStatuses((p) => ({ ...p, link_declaracion: "saving" }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "generate_dj_bucket", musicianId: vals.id },
      });
      if (error) throw error;
      setValue("link_declaracion", data.url);
      if (onSave) onSave({ ...getValues(), link_declaracion: data.url }, false);
      setFieldStatuses((p) => ({ ...p, link_declaracion: "saved" }));
      setTimeout(
        () => setFieldStatuses((p) => ({ ...p, link_declaracion: "idle" })),
        2000,
      );
      window.open(data.url, "_blank");
    } catch (e) {
      setFieldStatuses((p) => ({ ...p, link_declaracion: "error" }));
    } finally {
      setAssemblingType(null);
    }
  }, [getValues, setValue, supabase, onSave]);

  const handleFullPack = useCallback(async () => {
    const vals = getValues();
    if (!vals.id || !vals.firma) { toast.error("Faltan datos o firma."); return; }
    setAssemblingType("all");
    setFieldStatuses((p) => ({
      ...p,
      link_declaracion: "saving",
      documentacion: "saving",
      docred: "saving",
    }));
    try {
      const { data, error } = await supabase.functions.invoke("manage-drive", {
        body: { action: "assemble_full_pack", musicianId: vals.id },
      });
      if (error) throw error;
      setValue("link_declaracion", data.urls.dj);
      setValue("documentacion", data.urls.full);
      setValue("docred", data.urls.mosaic);
      if (onSave) onSave(getValues(), false);
      setFieldStatuses((p) => ({
        ...p,
        link_declaracion: "saved",
        documentacion: "saved",
        docred: "saved",
      }));
      setTimeout(
        () =>
          setFieldStatuses((p) => ({
            ...p,
            link_declaracion: "idle",
            documentacion: "idle",
            docred: "idle",
          })),
        2000,
      );
    } catch (e) {
      setFieldStatuses((p) => ({
        ...p,
        link_declaracion: "error",
        documentacion: "error",
        docred: "error",
      }));
    } finally {
      setAssemblingType(null);
    }
  }, [getValues, setValue, supabase, onSave]);

  const handleCreateInitial = useCallback(
    async (formValues) => {
      const nombre = (formValues.nombre || "").trim();
      const apellido = (formValues.apellido || "").trim();
      if (!nombre || !apellido) {
        toast.error("Nombre y Apellido son obligatorios.");
        return;
      }
      setLoading(true);
      try {
        const dniRaw = (formValues.dni || "").toString().replace(/\s/g, "").trim();
        const cuilRaw = (formValues.cuil || "").toString().replace(/\s/g, "").trim();
        const payload = {
          nombre,
          apellido,
          domicilio: (formValues.domicilio || "").trim() || null,
          condicion: formValues.condicion || "Invitado",
          genero: formValues.genero || "-",
          rol_sistema: "user",
          nacionalidad: formValues.nacionalidad || "Argentina",
          id_instr: formValues.id_instr || null,
          mail: (formValues.mail || "").trim() || null,
          telefono: (formValues.telefono || "").trim() || null,
          dni: dniRaw || null,
          cuil: cuilRaw || null,
          fecha_nac: formValues.fecha_nac || null,
          alimentacion: (formValues.alimentacion || "").trim() || null,
          id_localidad: formValues.id_localidad || null,
          id_loc_viaticos: formValues.id_loc_viaticos || null,
          id_domicilio_laboral: formValues.id_domicilio_laboral || null,
          fecha_alta: formValues.fecha_alta || null,
          fecha_baja: formValues.fecha_baja || null,
          email_acceso: (formValues.email_acceso || "").trim() || null,
          clave_acceso: formValues.clave_acceso || null,
          nota_interna: (formValues.nota_interna || "").trim() || null,
          avatar_color: formValues.avatar_color || "#4f46e5",
          cargo: (formValues.cargo || "").trim() || null,
          jornada: (formValues.jornada || "").trim() || null,
          motivo: (formValues.motivo || "").trim() || null,
        };
        if (process.env.NODE_ENV === "development") {
          if (process.env.NODE_ENV === "development") {
          if (process.env.NODE_ENV === "development") {
          console.log("Creando Músico - Payload:", payload);
        }
        }
        }
        const { data, error } = await supabase
          .from("integrantes")
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (selectedEnsembles.size > 0) {
          await supabase.from("integrantes_ensambles").insert(
            Array.from(selectedEnsembles).map((idEns) => ({
              id_integrante: data.id,
              id_ensamble: idEns,
            })),
          );
        }
        reset({ ...getValues(), id: data.id });
        if (onSave) onSave(data, false);
        toast.success("Ficha del músico creada correctamente.");
      } catch (error) {
        console.error("Error al crear músico:", error);
        toast.error("Error al crear: " + (error?.message || String(error)));
      } finally {
        setLoading(false);
      }
    },
    [supabase, selectedEnsembles, reset, getValues, onSave],
  );

  return {
    control,
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    reset,
    formState: { errors, isValid },
    formData,
    musicianForGiras,
    loading,
    assemblingType,
    uploadingField,
    activeTab,
    setActiveTab,
    showPassword,
    setShowPassword,
    fieldStatuses,
    cropModal,
    setCropModal,
    crop,
    setCrop,
    completedCrop,
    setCompletedCrop,
    imgRef,
    catalogoInstrumentos,
    locationsOptions,
    locacionesOptions,
    ensemblesOptions,
    selectedEnsembles,
    inputClass,
    labelClass,
    getInputStatusClass,
    updateField,
    handleEnsemblesChange,
    uploadToSupabase,
    deleteOldFile,
    handleStartCrop,
    handleConfirmCrop,
    handleClipboardClick,
    handleAssemble,
    handleGenerateDJ,
    handleFullPack,
    handleCreateInitial,
  };
}
