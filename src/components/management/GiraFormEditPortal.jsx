import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { IconLoader } from "../ui/Icons";
import GiraForm from "../../views/Giras/GiraForm";
import { touchOrganicoConvocado } from "../../services/organicoConvocadoService";

/**
 * Portal z-[100] que carga una gira y monta GiraForm (misma UX que Giras).
 */
export default function GiraFormEditPortal({
  supabase,
  giraId,
  onClose,
  onSaved,
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState(null);
  const [locationsList, setLocationsList] = useState([]);
  const [ensemblesList, setEnsemblesList] = useState([]);
  const [allIntegrantes, setAllIntegrantes] = useState([]);
  const [selectedLocations, setSelectedLocations] = useState(() => new Set());
  const [selectedSources, setSelectedSources] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState([]);

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const onSavedRef = useRef(onSaved);
  onSavedRef.current = onSaved;

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!supabase || !giraId) return;
      if (!silent) setLoading(true);
      try {
        const [giraRes, locsRes, ensRes, intRes] = await Promise.all([
          supabase
            .from("programas")
            .select(
              `
            *,
            giras_fuentes ( id, tipo, valor_id, valor_texto ),
            giras_integrantes ( id_integrante, rol, integrantes ( id, nombre, apellido ) ),
            giras_localidades ( id_localidad )
          `,
            )
            .eq("id", giraId)
            .single(),
          supabase
            .from("localidades")
            .select("id, localidad")
            .order("localidad"),
          supabase.from("ensambles").select("id, ensamble"),
          supabase
            .from("integrantes")
            .select("id, nombre, apellido, id_localidad, instrumentos(familia)")
            .order("apellido"),
        ]);
        if (giraRes.error) throw giraRes.error;
        const gira = giraRes.data;
        const ensembles = (ensRes.data || []).map((e) => ({
          value: e.id,
          label: e.ensamble,
        }));
        setEnsemblesList(ensembles);
        setLocationsList(locsRes.data || []);
        setAllIntegrantes(
          (intRes.data || []).map((i) => ({
            value: i.id,
            label: `${i.apellido}, ${i.nombre}`,
          })),
        );

        const { data: difusionData } = await supabase
          .from("gira_difusion")
          .select("otros_comentarios")
          .eq("id_gira", gira.id)
          .maybeSingle();

        setFormData({
          nombre_gira: gira.nombre_gira,
          subtitulo: gira.subtitulo || "",
          fecha_desde: gira.fecha_desde || "",
          fecha_hasta: gira.fecha_hasta || "",
          hora_inicio_proyeccion: gira.hora_inicio_proyeccion
            ? String(gira.hora_inicio_proyeccion).slice(0, 5)
            : "",
          hora_fin_proyeccion: gira.hora_fin_proyeccion
            ? String(gira.hora_fin_proyeccion).slice(0, 5)
            : "",
          servicios_estimados:
            gira.servicios_estimados != null ? gira.servicios_estimados : null,
          tipo: gira.tipo || "Sinfónico",
          zona: gira.zona || "",
          token_publico: gira.token_publico || "",
          nomenclador: gira.nomenclador || "",
          estado: gira.estado || "Borrador",
          notificaciones_habilitadas: gira.notificaciones_habilitadas !== false,
          otros_comentarios: difusionData?.otros_comentarios || "",
        });
        setSelectedLocations(
          new Set(
            (gira.giras_localidades || [])
              .map((d) => d.id_localidad)
              .filter(Boolean),
          ),
        );
        setSelectedSources(
          (gira.giras_fuentes || []).map((f) => {
            let label = f.valor_texto;
            if (String(f.tipo || "").includes("ENSAMBLE")) {
              const found = ensembles.find((e) => e.value === f.valor_id);
              label = found ? found.label : `Ensamble ${f.valor_id}`;
            }
            return {
              tipo: f.tipo,
              valor_id: f.valor_id,
              valor_texto: f.valor_texto,
              label,
            };
          }),
        );
        setSelectedStaff(
          (gira.giras_integrantes || [])
            .filter((i) => ["director", "solista"].includes(i.rol))
            .map((i) => ({
              id_integrante: i.id_integrante,
              rol: i.rol,
              label: i.integrantes
                ? `${i.integrantes.apellido}, ${i.integrantes.nombre}`
                : "Desconocido",
            })),
        );
      } catch (err) {
        console.error(err);
        toast.error(err?.message || "No se pudo abrir la gira");
        onCloseRef.current?.();
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [supabase, giraId],
  );

  useEffect(() => {
    load({ silent: false });
  }, [load]);

  const softRefresh = useCallback(() => load({ silent: true }), [load]);

  const handleSave = async () => {
    if (!formData?.nombre_gira?.trim()) {
      toast.error("El nombre de la gira es obligatorio");
      return;
    }
    setSaving(true);
    const payload = {
      nombre_gira: formData.nombre_gira.trim(),
      subtitulo: formData.subtitulo?.trim() || null,
      fecha_desde: formData.fecha_desde || null,
      fecha_hasta: formData.fecha_hasta || null,
      hora_inicio_proyeccion: formData.hora_inicio_proyeccion
        ? String(formData.hora_inicio_proyeccion).slice(0, 5)
        : null,
      hora_fin_proyeccion: formData.hora_fin_proyeccion
        ? String(formData.hora_fin_proyeccion).slice(0, 5)
        : null,
      servicios_estimados:
        formData.servicios_estimados === "" ||
        formData.servicios_estimados == null
          ? null
          : Number(formData.servicios_estimados),
      tipo: formData.tipo || "Sinfónico",
      zona: formData.zona?.trim() || null,
      token_publico: formData.token_publico || null,
      estado: formData.estado || "Borrador",
      nomenclador: formData.nomenclador || null,
      notificaciones_habilitadas: formData.notificaciones_habilitadas !== false,
    };
    try {
      const { error: updateError } = await supabase
        .from("programas")
        .update(payload)
        .eq("id", giraId);
      if (updateError) throw updateError;

      await supabase.from("giras_localidades").delete().eq("id_gira", giraId);
      if (selectedLocations.size > 0) {
        await supabase.from("giras_localidades").insert(
          Array.from(selectedLocations).map((lid) => ({
            id_gira: giraId,
            id_localidad: lid,
          })),
        );
      }

      await supabase.from("giras_fuentes").delete().eq("id_gira", giraId);
      if (selectedSources.length > 0) {
        await supabase.from("giras_fuentes").insert(
          selectedSources.map((s) => ({
            id_gira: giraId,
            tipo: s.tipo,
            valor_id: s.valor_id || null,
            valor_texto: s.valor_texto || null,
          })),
        );
      }

      await supabase
        .from("giras_integrantes")
        .delete()
        .eq("id_gira", giraId)
        .in("rol", ["director", "solista"]);
      if (selectedStaff.length > 0) {
        await supabase.from("giras_integrantes").insert(
          selectedStaff.map((s) => ({
            id_gira: giraId,
            id_integrante: s.id_integrante,
            rol: s.rol,
            estado: "confirmado",
          })),
        );
      }

      touchOrganicoConvocado(supabase, giraId).catch(() => {});
      toast.success("Gira guardada");
      onSavedRef.current?.();
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  };

  if (!giraId) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-3 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Editar programa"
    >
      <div className="my-4 w-full max-w-6xl sm:my-8">
        {loading || !formData ? (
          <div className="flex items-center justify-center rounded-xl bg-white p-12 text-slate-400">
            <IconLoader className="mr-2 animate-spin" /> Cargando programa…
          </div>
        ) : (
          <GiraForm
            supabase={supabase}
            giraId={giraId}
            formData={formData}
            setFormData={setFormData}
            onCancel={onClose}
            onSave={handleSave}
            onRefresh={softRefresh}
            loading={saving}
            isNew={false}
            enableAutoSave={true}
            locationsList={locationsList}
            selectedLocations={selectedLocations}
            setSelectedLocations={setSelectedLocations}
            ensemblesList={ensemblesList}
            allIntegrantes={allIntegrantes}
            selectedSources={selectedSources}
            setSelectedSources={setSelectedSources}
            selectedStaff={selectedStaff}
            setSelectedStaff={setSelectedStaff}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
